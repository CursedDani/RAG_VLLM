import os
from langchain_community.document_loaders import Docx2txtLoader
from langchain_core.documents import Document
from langchain_postgres import PGVector
from langchain_core.embeddings import Embeddings
import requests
import os
from dotenv import load_dotenv

class CustomStaticEmbeddings(Embeddings):
    def __init__(self, endpoint_url: str):
        self.endpoint_url = endpoint_url

    def embed_documents(self, texts):
        # Return a list of embeddings, one for each text
        result = []
        for text in texts:
            response = requests.post(
                self.endpoint_url,
                json={"text": text}
            )
            response.raise_for_status()
            # Add this single embedding to our results
            result.append(response.json()["embedding"])
        return result

    def embed_query(self, text):
        # For a single query, just return one embedding
        response = requests.post(
            self.endpoint_url,
            json={"text": text}
        )
        response.raise_for_status()
        return response.json()["embedding"]

APP_DIR = os.path.dirname(__file__)
QA_DIR = os.path.join(APP_DIR, "..", "data", "qa_pairs")
DB_STRING = os.environ.get("DB_STRING")
EMBEDDINGS_URL = os.environ.get("VLLM_EMBED")

# 1. Load DOCX files as raw text and split by delimiter
all_docs = []
for fname in os.listdir(QA_DIR):
    if fname.lower().endswith(".docx"):
        loader = Docx2txtLoader(os.path.join(QA_DIR, fname))
        # loader.load() returns a list of Documents, but we want the raw text
        raw_text = loader.load()[0].page_content  # Assuming one doc per file
        qa_chunks = [chunk.strip() for chunk in raw_text.split("-------") if chunk.strip()]
        for chunk in qa_chunks:
            all_docs.append(
                Document(
                    page_content=chunk,
                    metadata={"source": fname}
                )
            )

print(f"Loaded {len(all_docs)} QA pairs from DOCX files.")

# 2. No splitting needed, each chunk is a QA pair
docs_split = all_docs

# 3. Embeddings
embeddings = CustomStaticEmbeddings(endpoint_url=EMBEDDINGS_URL)

# 4. PGVector store
vector_store = PGVector.from_existing_index(
    embedding=embeddings,
    collection_name="documents",
    connection=DB_STRING,
)

# 5. Add documents
ids = [f"{doc.metadata.get('source','docx')}-{i}" for i, doc in enumerate(docs_split)]
vector_store.add_documents(docs_split, ids=ids)
print(f"Inserted {len(docs_split)} QA pairs into PGVector.")