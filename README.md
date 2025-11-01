# Data Privacy Vault

Sistema de protección de privacidad que permite interactuar con servicios de IA (como ChatGPT) sin exponer información personal sensible. El sistema anonimiza automáticamente nombres, correos electrónicos y números de teléfono antes de enviar los datos a servicios externos, y luego restaura la información original en las respuestas.

## 🎯 Características

- **Anonimización Automática**: Detecta y reemplaza automáticamente:
  - Nombres propios (2-3 palabras capitalizadas)
  - Direcciones de correo electrónico
  - Números de teléfono (7-15 dígitos)
  
- **Integración con OpenAI**: Endpoint seguro para interactuar con ChatGPT manteniendo la privacidad de los datos
  
- **Desanonimización Inteligente**: Restaura automáticamente la información original en las respuestas de la IA
  
- **Almacenamiento Persistente**: Utiliza MongoDB para almacenar el mapeo de tokens de forma segura

## 📋 Requisitos Previos

- Node.js >= 18
- MongoDB (local o MongoDB Atlas)
- Cuenta de OpenAI con API key

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/jmcabreraa1/Project-2.git
cd Project-2
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Puerto del servidor (opcional, por defecto: 3001)
PORT=3001

# Secreto para la anonimización (obligatorio)
VAULT_SECRET=tu_secreto_seguro_aqui

# MongoDB Connection String (opcional, tiene un valor por defecto)
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database
MONGODB_DB=projectIA

# OpenAI API Key (opcional si se envía por header)
OPENAI_API_KEY=sk-proj-tu-api-key-aqui
OPENAI_MODEL=gpt-4o-mini
```

**Nota**: El archivo `.env` está incluido en `.gitignore` para proteger tus credenciales.

### 4. Iniciar el servidor

```bash
npm run start
```

Para modo desarrollo:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001` (o el puerto que configuraste).

## 📡 Endpoints Disponibles

### `GET /health`

Verifica el estado del servidor.

**Ejemplo:**
```bash
curl http://localhost:3001/health
```

**Respuesta:**
```json
{
  "status": "ok"
}
```

### `POST /anonymize`

Anonimiza un mensaje reemplazando información privada con tokens.

**Request:**
```bash
curl -X POST http://localhost:3001/anonymize \
  -H "Content-Type: application/json" \
  -d '{"message": "Contacta a Juan Pérez en juan@example.com o llama al +1 (555) 123-4567"}'
```

**Respuesta:**
```json
{
  "anonymizedMessage": "Contacta a NAME_abc123 en EMAIL_def456 o llama al PHONE_ghi789"
}
```

### `POST /deanonymize`

Restaura la información original en un mensaje anonimizado.

**Request:**
```bash
curl -X POST http://localhost:3001/deanonymize \
  -H "Content-Type: application/json" \
  -d '{"anonymizedMessage": "Contacta a NAME_abc123 en EMAIL_def456"}'
```

**Respuesta:**
```json
{
  "message": "Contacta a Juan Pérez en juan@example.com"
}
```

### `POST /secureChatGPT`

Endpoint principal que anonimiza un prompt, lo envía a ChatGPT, y desanonimiza la respuesta.

**Request:**
```bash
curl -X POST http://localhost:3001/secureChatGPT \
  -H "Content-Type: application/json" \
  -H "X-OpenAI-API-Key: sk-proj-tu-api-key" \
  -d '{
    "prompt": "Crea un formato de correo e incluye a Juan Pérez en juan@example.com como remitente",
    "systemPrompt": "Eres un asistente útil.",
    "temperature": 0.7,
    "maxTokens": 300,
    "model": "gpt-4o-mini"
  }'
```

**Parámetros del body:**
- `prompt` (requerido): El mensaje que quieres enviar a ChatGPT (puede contener información privada)
- `systemPrompt` (opcional): Instrucciones del sistema para la IA
- `temperature` (opcional): Controla la creatividad de la respuesta (0.0-2.0, por defecto: 0.7)
- `maxTokens` (opcional): Número máximo de tokens en la respuesta (por defecto: 512)
- `model` (opcional): Modelo de OpenAI a usar (por defecto: "gpt-4o-mini")

**Headers:**
- `X-OpenAI-API-Key` (opcional): Tu API key de OpenAI. Si no se proporciona, se usará la variable de entorno `OPENAI_API_KEY`.

**Respuesta:**
```json
{
  "response": "Aquí está el formato de correo con Juan Pérez <juan@example.com> como remitente..."
}
```

## 🔒 Proceso de Seguridad

El endpoint `/secureChatGPT` ejecuta el siguiente flujo:

1. **Recepción**: Recibe el prompt con información privada
2. **Anonimización**: Reemplaza nombres, emails y teléfonos con tokens únicos
3. **Envío a OpenAI**: Envía el prompt anonimizado a ChatGPT
4. **Desanonimización**: Restaura la información original en la respuesta de la IA
5. **Retorno**: Devuelve la respuesta con los datos originales restaurados

**Importante**: La información privada nunca se envía a OpenAI. Solo se envían tokens anónimos que se mapean localmente en MongoDB.

## 🛠️ Estructura del Proyecto

```
Project-2/
├── src/
│   ├── server.js              # Servidor Express con los endpoints
│   ├── anonymizer.js          # Lógica de anonimización y desanonimización
│   ├── db.js                  # Conexión a MongoDB
│   ├── models/
│   │   └── TokenMap.js        # Modelo Mongoose para el mapeo de tokens
│   └── services/
│       └── OpenAIClient.js    # Cliente para interactuar con OpenAI
├── package.json
├── .gitignore
└── README.md
```

## 🔧 Tecnologías Utilizadas

- **Node.js**: Runtime de JavaScript
- **Express**: Framework web
- **MongoDB / Mongoose**: Base de datos para almacenar mapeo de tokens
- **OpenAI SDK**: Cliente oficial de OpenAI
- **dotenv**: Gestión de variables de entorno

## 📝 Ejemplos de Uso

### Ejemplo 1: Anonimizar un mensaje

```bash
curl -X POST http://localhost:3001/anonymize \
  -H "Content-Type: application/json" \
  -d '{
    "message": "María García (maria@empresa.com) debe llamar al +57 300 1234567 para coordinar con Juan Pérez"
  }'
```

### Ejemplo 2: Usar secureChatGPT con información privada

```bash
curl -X POST http://localhost:3001/secureChatGPT \
  -H "Content-Type: application/json" \
  -H "X-OpenAI-API-Key: sk-proj-..." \
  -d '{
    "prompt": "Escribe un mensaje mencionando que contactaremos a Ana Martínez en ana@example.com o al +34 612 345 678",
    "systemPrompt": "Eres un asistente profesional",
    "temperature": 0.7
  }'
```

## ⚠️ Consideraciones de Seguridad

- **VAULT_SECRET**: Usa un secreto fuerte y único para la anonimización
- **API Keys**: Nunca commits las API keys al repositorio
- **MongoDB**: Protege tu cadena de conexión de MongoDB
- **HTTPS**: En producción, siempre usa HTTPS para proteger las comunicaciones

## 🐛 Solución de Problemas

### Error: "MongoDB connection failed"
- Verifica que `MONGODB_URI` tenga el formato correcto
- Asegúrate de que MongoDB esté accesible desde tu red

### Error: "Failed to anonymize message"
- Verifica la conexión a MongoDB
- Revisa que el servidor tenga permisos de escritura en la base de datos

### Error: "Missing OpenAI API key"
- Proporciona la API key en el header `X-OpenAI-API-Key` o en la variable de entorno `OPENAI_API_KEY`

## 📄 Licencia

Este proyecto es privado y está destinado únicamente para fines educativos.

## 👤 Autor

José Cabrera

---

**Nota**: Este proyecto fue desarrollado como parte del curso "IA para Negocios Digitales" de la Universidad de los Andes.

