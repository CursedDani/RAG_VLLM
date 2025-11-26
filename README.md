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
│   ├── ui_main.py              # Interfaz Streamlit principal
│   ├── ui_main_copy.py         # Interfaz con integración de herramientas
│   ├── rag_logic.py            # Lógica RAG híbrida
│   ├── tools_interface.py      # Interface para herramientas de automatización
│   ├── chat_manager.py         # Gestor de conversaciones
│   └── prompts/
│       ├── system_prompt.txt           # Prompt del sistema base
│       ├── Security.txt                # Prompt para seguridad
│       ├── Security_with_tools.txt     # Prompt con function calling
│       └── Security_with_json_tools.txt # Prompt con JSON tool calling
├── scripts/
│   ├── ingest.py               # Ingesta con python-docx
│   ├── ingest_QA.py            # Ingesta de pares de preguntas-Respuestas
│   └── docx_cleanup.py         # Limpieza de documentos para la ingesta
├── automation/
│   ├── acc_status.py           # Extracción de tickets de Acceso
│   ├── pass_status.py          # Extracción de tickets de Contraseña
│   ├── full_status.py          # Extracción completa multi-tipo
│   └── pptr/                   # Automatización con Puppeteer
│       ├── final_automation.js     # Extracción de Change Orders
│       ├── inc_extraction.js       # Extracción de Incidents
│       ├── rq_extraction.js        # Extracción de Requests
│       ├── package.json            # Dependencias Node.js
│       └── *_gui.html              # Interfaces gráficas opcionales
├── output/                     # Archivos JSON generados por automatización
├── data/
│   ├── docx/                   # Documentos DOCX a insertar en la base de datos
│   ├── docs/                   # Documentos originales, antes de aplicar la limpieza
│   ├── qa_pairs/               # Documentos(s) con pares de pregunta-respuesta para ingestar
│   ├── Tigo_logo.png
│   └── Bot_icon.png
├── mcp-server/                 # Model Context Protocol server
│   └── server.py
├── venv/                       # Entorno virtual
├── requirements.txt            # Dependencias completas
├── requirements-docker.txt     # Dependencias para Docker
├── docker-compose.yml          # Configuración Docker con VPN
├── Dockerfile                  # Imagen Docker
├── api_server.py               # Servidor API REST
├── api_client.py               # Cliente API
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


## 🤖 Sistema de Automatización

El proyecto incluye dos sistemas de automatización complementarios para extraer información de CA Service Desk Manager:

### 1. Automatización Python (DirectAccess)

Scripts Python ubicados en `automation/` que utilizan la API interna de CA Service Desk:

#### Scripts Disponibles

- **`acc_status.py`**: Extrae estado de tickets de Acceso
- **`pass_status.py`**: Extrae estado de tickets de Contraseña  
- **`full_status.py`**: Extrae información completa de múltiples tipos de tickets

#### Uso Individual

```bash
# Ejecutar desde la raíz del proyecto
python automation/acc_status.py <TICKET_NUMBER>
python automation/pass_status.py <TICKET_NUMBER>
python automation/full_status.py <TICKET_NUMBER>
```

#### Características
- ✅ Acceso directo a la API interna de CA Service Desk
- ✅ Extracción rápida y estructurada
- ✅ Salida en formato JSON
- ⚠️ Requiere conectividad a la red interna (VPN)

### 2. Automatización Puppeteer (Web Scraping)

Scripts Node.js ubicados en `automation/pptr/` que automatizan la interfaz web:

#### Scripts Disponibles

- **`final_automation.js`**: Extrae órdenes de cambio (Change Orders)
- **`inc_extraction.js`**: Extrae incidentes
- **`rq_extraction.js`**: Extrae solicitudes (Requests)

#### Instalación de Dependencias

```bash
cd automation/pptr
npm install
```

#### Uso Individual

```bash
cd automation/pptr

# Extraer orden de cambio
node final_automation.js CHG0012345

# Extraer incidente
node inc_extraction.js INC0067890

# Extraer solicitud
node rq_extraction.js RQ0054321
```

#### Características
- ✅ Automatización completa de la interfaz web
- ✅ Extracción de datos detallados incluyendo Workflow Tasks
- ✅ Salida en JSON (consola + archivo)
- ✅ Modo headless (sin interfaz gráfica)
- ✅ Capturas de pantalla en caso de error
- ⚠️ Requiere conectividad a la red interna (VPN)

#### Salida de Datos

Cada script genera:
1. **Salida JSON en consola**: Una línea JSON para consumo por API
2. **Archivo JSON en `output/`**: Archivo timestamped para respaldo
   - Formato: `{tipo}_{numero}_{timestamp}.json`
   - Ejemplo: `change_order_CHG0012345_2025-11-20T19-15-08-604Z.json`

#### Estructura de Datos Extraídos

**Change Orders (`final_automation.js`):**
```json
{
  "changeOrderData": {
    "requester": "Usuario Solicitante",
    "affected_end_user": "Usuario Afectado",
    "category": "Categoría",
    "status": "Estado",
    "order_description": "Descripción"
  },
  "workflowTasks": [
    {
      "sequence": "1",
      "task": "Nombre de Tarea",
      "description": "Descripción",
      "assignee": "Asignado",
      "status": "Estado",
      "start_date": "Fecha Inicio",
      "completion_date": "Fecha Completado"
    }
  ]
}
```

**Incidents (`inc_extraction.js`):**
```json
{
  "incidentData": {
    "requester": "Solicitante",
    "affected_end_user": "Usuario Afectado",
    "category": "Categoría",
    "status": "Estado",
    "priority": "Prioridad",
    "severity": "Severidad",
    "summary": "Resumen",
    "incident_description": "Descripción"
  }
}
```

**Requests (`rq_extraction.js`):**
```json
{
  "requestData": {
    "requester": "Solicitante",
    "affected_end_user": "Usuario Afectado",
    "category": "Categoría",
    "status": "Estado",
    "priority": "Prioridad",
    "summary": "Resumen",
    "request_description": "Descripción"
  }
}
```

### 🐳 Uso con Docker + VPN

Para ejecutar las automatizaciones desde un contenedor Docker con acceso VPN:

#### 1. Configurar Docker Compose

El archivo `docker-compose.yml` ya está configurado para:
- Montar el directorio `automation/` como volumen
- Instalar Node.js y dependencias de Puppeteer
- Mantener conectividad VPN

#### 2. Ejecutar Automatización en el Contenedor

```bash
# Iniciar contenedor con VPN
docker-compose up -d

# Ejecutar script Python
docker exec rag-vllm-app python automation/acc_status.py <TICKET_NUMBER>

# Ejecutar script Puppeteer
docker exec rag-vllm-app node automation/pptr/final_automation.js CHG0012345

# Ver logs
docker-compose logs -f app
```

#### 3. Acceder a Archivos de Salida

Los archivos JSON generados están disponibles en:
```bash
# Desde el host
ls -l output/

# Desde el contenedor
docker exec rag-vllm-app ls -l /app/output/
```

### 🔧 Integración con el Chatbot

Las automatizaciones están integradas con el sistema RAG a través de `app/tools_interface.py`:

#### Herramientas Disponibles

```python
# En el chatbot, el LLM puede invocar:
{
  "tool": "extract_change_order",
  "args": {"change_order_number": "CHG0012345"}
}

{
  "tool": "extract_incident", 
  "args": {"incident_number": "INC0067890"}
}

{
  "tool": "extract_request",
  "args": {"request_number": "RQ0054321"}
}
```

El chatbot automáticamente:
1. Detecta cuándo se necesita información de tickets
2. Ejecuta el script de automatización correspondiente
3. Parsea el resultado JSON
4. Presenta la información al usuario de forma estructurada

### 📝 Notas Importantes

#### Requisitos de Red
- **Ambos sistemas** requieren acceso a la red interna de CA Service Desk
- Para uso fuera de la red corporativa, se necesita **conexión VPN activa**
- El contenedor Docker debe tener acceso a la VPN del host

#### Credenciales
Las credenciales están hardcodeadas en los scripts de Puppeteer:
- Usuario: `rinforma`
- Contraseña: `ChatBot2025/*-+`

⚠️ **Seguridad**: En producción, estas credenciales deberían estar en variables de entorno.

#### Autenticación Cross-Platform (Windows/Linux)

El servidor API (`api_server.py`) usa autenticación **híbrida** con fallback automático:

##### Método Principal: Kerberos (SASL)
- **Linux**: Usa `gssapi` con tickets Kerberos (`kinit`)
- **Windows**: Usa SSPI nativo de Windows
- **Ventaja**: No requiere credenciales en código (usa tickets del sistema)


##### Configuración Kerberos (Opcional)

**Linux**:
```bash
# Instalar dependencias del sistema
sudo dnf install krb5-workstation krb5-devel  # Fedora/RHEL
sudo apt-get install krb5-user libkrb5-dev    # Debian/Ubuntu

# Instalar paquete Python
pip install gssapi

# Obtener ticket Kerberos
kinit rinforma@EPMTELCO.COM.CO

# Verificar ticket
klist
```

**Windows**:
```powershell
# Kerberos SSPI está integrado en Windows
# No requiere instalación adicional

# El módulo ldap3 usa automáticamente SSPI
# Solo asegurar que el usuario tenga ticket Kerberos del dominio
```

##### Configuración Actual

El código detecta automáticamente el sistema operativo:

```python
def create_ldap_connection():
    # Intenta Kerberos primero
    try:
        if platform.system() == 'Windows':
            # Windows SSPI Kerberos
            conn = Connection(server, authentication=SASL, 
                            sasl_mechanism=KERBEROS, auto_bind=True)
        else:
            # Linux gssapi Kerberos
            conn = Connection(server, user=AD_USER, 
                            authentication=SASL, sasl_mechanism=KERBEROS, 
                            auto_bind=True)
        return conn
    except Exception:
        # Fallback a NTLM si Kerberos falla
        conn = Connection(server, user='EPMTELCO\\rinforma', 
                         password=AD_PASSWORD, authentication=NTLM, 
                         auto_bind=True)
        return conn
```

##### Estado de Implementación

- ✅ **Código configurado** para Kerberos con fallback NTLM
- ✅ **Detección automática** de Windows/Linux
- ⚠️ **Dependencia `gssapi`** no instalada en Linux (fallback activo)
- ✅ **NTLM funciona** como fallback en ambas plataformas

##### Próximos Pasos (Opcional)

Para habilitar autenticación Kerberos pura:
1. Instalar dependencias del sistema (`krb5-devel`)
2. Instalar `gssapi` con `pip install gssapi`
3. Configurar `/etc/krb5.conf` con realm `EPMTELCO.COM.CO`
4. Obtener ticket con `kinit rinforma@EPMTELCO.COM.CO`
5. Remover variables `AD_PASSWORD` del código

#### Limpieza de Logs
Los scripts de Puppeteer han sido optimizados para:
- ❌ Sin logs de debug en consola
- ❌ Sin capturas de pantalla automáticas
- ✅ Solo salida JSON estructurada
- ✅ Errores mínimos (solo críticos)

Esto mejora la legibilidad cuando se integran con el chatbot.

### 🐛 Troubleshooting de Automatización

#### Error: "ECONNREFUSED" (Puppeteer)
```
Error: connect ECONNREFUSED 10.100.85.31:80
```
**Solución**: Verificar conectividad VPN y acceso a CA Service Desk:
```bash
ping 10.100.85.31
curl http://10.100.85.31/CAisd/pdmweb1.exe
```

#### Error: "Ticket not found"
```
Error: No se encontró información del ticket
```
**Solución**: 
- Verificar que el número de ticket sea correcto
- Verificar que el tipo de ticket coincida con el script usado
- Verificar permisos del usuario `rinforma`

#### Error: Chromium no encontrado (Puppeteer)
```
Error: Could not find Chromium
```
**Solución**:
```bash
cd automation/pptr
npm install puppeteer
# O reinstalar todo
rm -rf node_modules package-lock.json
npm install
```

#### Timeout en Extracción
Si los scripts toman demasiado tiempo o fallan por timeout:
- Verificar la velocidad de la conexión VPN
- Aumentar timeouts en el código si es necesario
- Verificar que CA Service Desk esté respondiendo

## 👥 Autores

- Juan Esteban Pineda - *Desarrollo inicial Bot Wifi* - [Esteban527](https://github.com/Esteban527)
- Daniel Felipe Arango Guarín - *Desarrollo inicial, Adaptación a seguridad* - [CursedDani](https://github.com/CursedDani)
