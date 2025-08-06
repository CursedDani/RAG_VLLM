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

#### Opción A: Instalación Completa (Recomendado)
```bash
pip install -r requirements.txt
```

#### Opción B: Instalación Mínima (Sin Marker)
Si prefieres una instalación más ligera sin `marker-pdf`:
```bash
pip install -r requirements-minimal.txt
```

> **Nota**: Con la instalación mínima solo podrás usar `python-docx` para procesar documentos DOCX. Marker proporciona mejor calidad de extracción pero requiere más dependencias.

### 4. Configurar PostgreSQL con pgvector
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
mkdir -p data/docx
```

## 📚 Uso

### 1. Preparar Documentos
Coloca tus archivos DOCX en la carpeta `data/docx/`, añade el logo de tigo y el ícono del bot:
```
data/
├── Bot_icon.png
├── Tigo_logo.png
└── docx/
    ├── documento1.docx
    ├── documento2.docx
    └── ...
```

### 2. Procesar e Ingestar Documentos

#### Opción A: Con Marker (Recomendado)
```bash
python scripts/ingest_data_marker.py
```

#### Opción B: Con python-docx (Alternativa)
```bash
python scripts/ingest_data.py
```

**Salida esperada:**
```
Iniciando script de ingesta para archivos DOCX usando Marker...
Marker importado correctamente.
Conexión a PostgreSQL establecida.
Tabla 'documents_security' verificada/creada.

Procesando archivo: data/docx/politica_de_seguridad.docx...
  Intentando extracción con Marker...
  Total de 45 fragmentos generados para 'politica_de_seguridad.docx'.
  Archivo 'politica_de_seguridad.docx' procesado: 45 fragmentos insertados/actualizados.

Proceso de ingestión a PostgreSQL completado.
```

### 3. Ejecutar la Aplicación
```bash
streamlit run app/ui_main.py
```

### 4. Interactuar con el Sistema
1. Abre tu navegador en `http://localhost:8501`
2. Escribe tu pregunta sobre el contenido de los documentos
3. El sistema realizará búsqueda híbrida y generará una respuesta contextualizada

## 🔧 Configuración Avanzada

### Parámetros de Chunking
En `scripts/ingest_data_marker.py`:
```python
text_splitter = RecursiveCharacterTextSplitter.from_huggingface_tokenizer(
    tokenizer=tokenizer, 
    chunk_size=768,      # Tamaño del chunk
    chunk_overlap=75     # Solapamiento entre chunks
)
```

### Modelos de Embedding
Modelos compatibles:
- `sentence-transformers/all-MiniLM-L6-v2` (384 dim)
- `nomic-ai/nomic-embed-text-v1.5` (768 dim)
- Modelos personalizados vía vLLM

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
│   ├── ingest_data.py          # Ingesta con python-docx
│   └── ingest_data_marker.py   # Ingesta con Marker
├── data/
│   └── docx/                   # Documentos DOCX
│   └── Tigo_logo.png
│   └── Bot_icon.png
├── venv/                       # Entorno virtual
├── requirements.txt            # Dependencias completas
├── requirements-minimal.txt    # Dependencias sin marker-pdf
├── .env                        # Variables de entorno
├── .gitignore
└── README.md
```

### Documentación Empresarial
- Políticas de seguridad
- Procedimientos técnicos
- Manuales de configuración
- Guías de troubleshooting

### Caching
- Streamlit cachea automáticamente:
  - Documentos de la BD
  - Índices Lunr
  - Modelos CrossEncoder
  - Cliente vLLM

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

#### Marker Installation Issues
```python
# Si Marker falla, el sistema usa python-docx automáticamente
try:
    from marker import Marker
    marker_available = True
except ImportError:
    marker_available = False
    # Fallback a python-docx
```

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
