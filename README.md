# 🤖 Sistema RAG Híbrido con vLLM

Un sistema avanzado de Retrieval-Augmented Generation (RAG) que combina búsqueda vectorial y textual para proporcionar respuestas precisas basadas en documentos. Especializado para consultas sobre políticas de seguridad de la información y protección de datos. puede ser usado para otros casos de uso entrenando un modelo y ingestando los documentos necesarios.

## 🚀 Características Principales

### ✨ RAG Híbrido Avanzado
- **Búsqueda Vectorial**: Usando PostgreSQL con pgvector para similitud semántica
- **Búsqueda Textual**: Índice Lunr para coincidencias exactas de términos
- **Fusión RRF**: Reciprocal Rank Fusion para combinar resultados optimalmente
- **Re-ranking**: CrossEncoder para mejorar la relevancia final

### 🔧 Tecnologías Core
- **vLLM**: Generación de texto y embeddings de alta performance
- **PostgreSQL + pgvector**: Base de datos vectorial escalable
- **Streamlit**: Interfaz web interactiva
- **Marker**: Procesamiento avanzado de documentos DOCX
- **Transformers**: Modelos de embedding y tokenización

### 📄 Procesamiento de Documentos
- Soporte nativo para archivos DOCX
- Extracción inteligente de texto y tablas
- Chunking adaptativo con solapamiento
- Preservación de estructura de documentos

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Documentos    │    │   Procesamiento │    │   Almacenamiento│
│     DOCX        │───▶│     Marker      │───▶│   PostgreSQL    │
└─────────────────┘    └─────────────────┘    │   + pgvector    │
                                              └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐           │
│   Interfaz      │    │   RAG Híbrido   │◀──────────┘
│   Streamlit     │◀───│   Orchestrator  │
└─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │      vLLM       │
                       │   Embeddings    │
                       │  + Generación   │
                       └─────────────────┘
```

### Flujo de Búsqueda Híbrida

1. **Query del Usuario** → Procesamiento en paralelo
2. **Búsqueda Vectorial** → Embeddings + Similitud coseno
3. **Búsqueda Textual** → Índice Lunr + TF-IDF
4. **Fusión RRF** → Combina rankings con pesos optimizados
5. **Re-ranking** → CrossEncoder para refinamiento final
6. **Generación** → vLLM produce respuesta contextualizada

## 📋 Prerrequisitos

- **Python 3.8+**
- **PostgreSQL 12+** con extensión pgvector
- **vLLM Server** configurado y ejecutándose
- **8GB+ RAM** recomendado para modelos de embedding

## 🛠️ Instalación

### 1. Clonar el Repositorio
```bash
git clone <tu-repositorio>
cd rag_vllm
```

### 2. Crear Entorno Virtual
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate
```

### 3. Instalar Dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar PostgreSQL con pgvector

```bash
#Windows
docker run -d   --name postgres   -e POSTGRES_USER=dani   -e POSTGRES_PASSWORD=dani   -e POSTGRES_DB=postgres   -p 5432:5432   ankane
/pgvector

docker exec -it postgres psql -U dani -d postgres

#Linux
sudo docker run -d   --name postgres   -e POSTGRES_USER=dani   -e POSTGRES_PASSWORD=dani   -e POSTGRES_DB=postgres   -p 5432:5432   ankane
/pgvector

sudo docker exec -it postgres psql -U dani -d postgres
```

```sql
-- Crear base de datos
CREATE DATABASE postgres;

-- Conectar a la base de datos
\c postgres;

-- Instalar extensión pgvector
CREATE EXTENSION vector;

-- Verificar instalación
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 5. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Configuración vLLM
VLLM_ENDPOINT=http://xxx.xxx.xxx.xxx:8002
#Asegurate que el puerto sea el 8002 pues se usará la estructura de OpenAI URL:PORT/v1/chat/completions
VLLM_EMBED=http://xxx.xxx.xxx.xxx:8003/embed
VLLM_MODEL_GENERATION=tu-modelo-generativo

# Base de datos
DB_CONNECTION_STRING="host=xxx.xxx.xxx.xxx dbname=postgres user=usuario_db password=contraseña_db"
```

### 6. Crear Estructura de Directorios
```bash
mkdir -p data data/docx data/docs data/qa_pairs
```

## 📚 Uso

### 1. Preparar Documentos
Coloca tus archivos DOCX en la carpeta `data/docs/`, añade el logo de tigo y el ícono del bot:
```
data/
├── Bot_icon.png
├── Tigo_logo.png
└── docs/
    ├── documento1.docx
    ├── documento2.docx
    └── ...
```

### 2. Aplicar la limpieza antes de la ingesta

Luego de tener todos los documentos en la ruta necesaria se corre el script de limpieza.

```bash
python scripts/docx_cleanup.py
```
### 3. Procesar e Ingestar Documentos

Tras tener los documentos limpios y verificar que existan en la carpeta data/docx se aplica la ingesta.
```bash
python scripts/ingest.py
```

### 4. (opcional) Ingestar pares pregunta-respuesta
si se cuenta con pares de pregunta-respuesta se deben subir en un documento docx en la carpeta data/qa_pairs/ con el formato:

"Pregunta: ¿Dónde está la política de seguridad de la información?
Respuesta: Puedes encontrar la política de seguridad de la información en el siguiente vinculo: https://millicom.sharepoint.com/sites/ep-tigoco/Corporativo/Documents/Forms/AllItems.aspx?id=%2Fsites%2Fep%2Dtigoco%2FCorporativo%2FDocuments%2FPol%C3%ADticas%2FOperaciones%2FMIC%2DPOL%2DIS%2DInformation%20Security%20Policy%2DESP%2Epdf&parent=%2Fsites%2Fep%2Dtigoco%2FCorporativo%2FDocuments%2FPol%C3%ADticas%2FOperaciones 
-------
Pregunta: ¿Dónde está la política de seguridad?
Respuesta: Puedes encontrar la política de seguridad de la información en el siguiente vinculo: https://millicom.sharepoint.com/sites/ep-tigoco/Corporativo/Documents/Forms/AllItems.aspx?id=%2Fsites%2Fep%2Dtigoco%2FCorporativo%2FDocuments%2FPol%C3%ADticas%2FOperaciones%2FMIC%2DPOL%2DIS%2DInformation%20Security%20Policy%2DESP%2Epdf&parent=%2Fsites%2Fep%2Dtigoco%2FCorporativo%2FDocuments%2FPol%C3%ADticas%2FOperaciones 
-------
"

Tras tener este documento con el formato de preguntas-respuestas se ejecuta

```bash
python scripts/ingest_QA.py
```

### 5. Ejecutar la Aplicación
```bash
streamlit run app/ui_main.py
```

### 6. Interactuar con el Sistema
1. Abre tu navegador en `http://localhost:8501`
2. Escribe tu pregunta sobre el contenido de los documentos
3. El sistema realizará búsqueda híbrida y generará una respuesta contextualizada

## 📁 Estructura del Proyecto

```
rag_vllm/
├── app/
│   ├── ui_main.py              # Interfaz Streamlit
│   ├── rag_logic.py            # Lógica RAG híbrida
│   └── prompts/
│       ├── system_prompt.txt   # Prompt del sistema
│       └── wifi_expert_prompt.txt # Prompt especializado
├── scripts/
│   ├── ingest.py               # Ingesta con python-docx
│   ├── ingest_QA.py            # Ingesta de pares de preguntas-Respuestas
│   └── docx_cleanup.py         # Limpieza de documentos para la ingesta
├── data/
│   ├── docx/                   # Documentos DOCX a insertar en la base de datos
│   ├── docs/                   # Documentos originales, antes de aplicar la limpieza
│   ├── qa_pairs/               # Documentos(s) con pares de pregunta-respuesta para ingestar
│   ├── Tigo_logo.png
│   └── Bot_icon.png
├── venv/                       # Entorno virtual
├── requirements.txt            # Dependencias completas
├── requirements-minimal.txt    # Dependencias sin marker-pdf
├── .env                        # Variables de entorno
├── .gitignore
└── README.md
```



## 🔍 Troubleshooting

### Error de Conexión vLLM
```
Error: No se pudieron cargar los recursos necesarios
```
**Solución**: Verificar que vLLM esté ejecutándose:
```bash
curl http://xxx.xxx.xxx.xxx:8002/v1/models
```

### Error PostgreSQL
```
Error conectando a PostgreSQL
```
**Solución**: 
1. Verificar que PostgreSQL esté corriendo
2. Instalar pgvector: `CREATE EXTENSION vector;`
3. Revisar string de conexión en `.env`

### Problemas de Instalación

#### Dependencias PyTorch/CUDA
Si tienes problemas con PyTorch en GPU:
```bash
# CPU only (más ligero)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# CUDA 11.8 (si tienes GPU NVIDIA)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

#### PostgreSQL psycopg2 Issues
En algunos sistemas, `psycopg2-binary` puede fallar:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-dev python3-dev

# Windows (usar conda)
conda install psycopg2

# macOS
brew install postgresql
```


## 👥 Autores

- Juan Esteban Pineda - *Desarrollo inicial Bot Wifi* - [Esteban527](https://github.com/Esteban527)
- Daniel Felipe Arango Guarín - *Desarrollo inicial, Adaptación a seguridad* - [CursedDani](https://github.com/CursedDani)
