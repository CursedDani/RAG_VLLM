import os
from langchain_community.document_loaders import Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
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

load_dotenv(override=True)
APP_DIR = os.path.dirname(__file__)
DOCX_DIR = os.path.join(APP_DIR, "..", "data", "docs")
DB_STRING = os.environ.get("DB_STRING")
EMBEDDINGS_URL = os.environ.get("VLLM_EMBED")


# 1. Load DOCX files
all_docs = []
for fname in os.listdir(DOCX_DIR):
    if fname.lower().endswith(".docx"):
        loader = Docx2txtLoader(os.path.join(DOCX_DIR, fname))
        docs = loader.load()
        all_docs.extend(docs)

print(f"Loaded {len(all_docs)} documents from DOCX files.")

# 2. Split into chunks
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=250)
docs_split = splitter.split_documents(all_docs)
print(f"Split into {len(docs_split)} chunks.")

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
print(f"Inserted {len(docs_split)} chunks into PGVector.")