# Deploy de Motor de Avatares en Cloud Run con Vertex AI

> **Fecha:** 2026-07-09
> **Proyecto:** motor-avatares
> **Servicio:** motor-avatares en Cloud Run

---

## 1. Resumen

Deploy exitoso de la app de motor de avatares (carta con mesera virtual) en Cloud Run usando Vertex AI para Gemini. La app ahora responde correctamente con Gemini 2.5 Flash para chat y tiene WebSocket para voz en vivo.

---

## 2. Aprendizajes Clave

### 2.1. Modelos de Vertex AI

**Modelos disponibles (2026):**
- `gemini-2.5-flash` (GA) - Chat principal
- `gemini-2.5-flash-lite` (GA) - Modo bajo latencia
- `gemini-2.5-pro` (GA) - reasoning avanzado
- `gemini-3.1-flash-lite` (Preview) - Más eficiente
- `gemini-live-2.5-flash-native-audio` (GA) - WebSocket voz

**Modelos que NO existen en Vertex AI:**
- `gemini-2.0-flash` ❌ (no está disponible)
- `gemini-3.5-flash` ❌ (no existe aún)
- `gemini-3.1-flash-live-preview` ❌ (no existe)

**Error común:** Usar nombres de modelos de Google AI Studio que no están en Vertex AI.

### 2.2. SDK de Vertex AI

**Dos SDKs disponibles:**

1. **`@google-cloud/vertexai`** (oficial):
   - Para chat de texto
   - Soporta `systemInstruction` en `getGenerativeModel()`
   - NO soporta Live API aún

2. **`@google/genai`** (compatible):
   - Para Live API (WebSocket)
   - Usa `vertexai: true` en la config
   - Dinámico: `const { GoogleGenAI } = await import("@google/genai")`

**Código correcto para chat:**
```typescript
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({ 
  project: "project-aa5fb956-b08a-4e13-869", 
  location: "us-central1" 
});

const model = vertexAI.getGenerativeModel({
  model: "gemini-2.5-flash",  // ✅ Nombre correcto
  systemInstruction: "Tu system prompt aquí",  // ✅ Va aquí, NO en generationConfig
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 1024,
  },
});

const streamingResult = await model.generateContentStream({
  contents: contents,
});
```

**Código correcto para Live API:**
```typescript
const { GoogleGenAI, Modality } = await import("@google/genai");

const ai = new GoogleGenAI({
  vertexai: true,
  project: projectId,
  location: location,
});

const session = await ai.live.connect({
  model: "gemini-live-2.5-flash-native-audio",  // ✅ Nombre correcto
  config: {
    responseModalities: [Modality.TEXT, Modality.AUDIO],
    speechConfig: {
      voiceConfig: { 
        prebuiltVoiceConfig: { voiceName: "Aoede" } 
      },
    },
    systemInstruction: "Tu system prompt aquí",
  },
  callbacks: {
    onmessage: (message) => {
      // Manejar mensajes
    },
  },
});
```

### 2.3. Error Común: `systemInstruction` en lugar equivocado

**Error:**
```typescript
// ❌ MAL - systemInstruction no va en generationConfig
const model = vertexAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    systemInstruction: "Tu prompt",  // ❌ ESTO CAUSA 404
    temperature: 0.8,
  },
});
```

**Correcto:**
```typescript
// ✅ BIEN - systemInstruction va en getGenerativeModel()
const model = vertexAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: "Tu prompt",  // ✅ ESTO ES CORRECTO
  generationConfig: {
    temperature: 0.8,
  },
});
```

### 2.4. Cloud Build Trigger

**Configuración:**
- Nombre: `deploy-carta-viva`
- ID: `c5387e0c-e1e0-487d-9dac-19c9df65bbef`
- Repo: `sergiopalomba05-jpg/quantumhive`
- Branch: `main`
- Build config: `agencia/motor madre/motoragregarllm/cloudbuild.yaml`

**Automatización:**
1. Push a `main` → Cloud Build detecta el cambio
2. Build del Dockerfile
3. Deploy automático a Cloud Run
4. Health check automático

**Cloud Build SA:** `557866434489@cloudbuild.gserviceaccount.com`
**Roles asignados:**
- `roles/run.admin`
- `roles/artifactregistry.admin`
- `roles/iam.serviceAccountUser`

### 2.5. Cloud Run Deploy

**Comando:**
```bash
gcloud run deploy motor-avatares \
  --source="C:\Users\sergio\Desktop\boveda obsidian\agencia\motor madre\motoragregarllm" \
  --region=us-central1 \
  --project=project-aa5fb956-b08a-4e13-869 \
  --service-account=557866434489-compute@developer.gserviceaccount.com \
  --allow-unauthenticated
```

**Puerto:** 8080 (configurado en Dockerfile)
**Servidor:** Express escuchando en `0.0.0.0`

### 2.6. Variables de Entorno

```bash
GOOGLE_CLOUD_PROJECT=project-aa5fb956-b08a-4e13-869
GOOGLE_CLOUD_LOCATION=us-central1
PORT=8080
NODE_ENV=production
```

**ADC (Application Default Credentials):**
- Local: `C:\Users\sergio\AppData\Roaming\gcloud\application_default_credentials.json`
- Cloud Run: Service Account automática

---

## 3. Estructura del Proyecto

```
agencia/motor madre/motoragregarllm/
├── server.ts              # Servidor principal (Express + WebSocket)
├── package.json           # Dependencias
├── Dockerfile            # Container para Cloud Run
├── cloudbuild.yaml       # Config de Cloud Build
├── .gcloudignore         # Archivos ignorados por gcloud
├── src/
│   ├── systemPrompt.ts   # System prompt del chat
│   └── menuData.ts       # Datos del menú
└── dist/                 # Build output
    ├── index.html
    └── server.cjs
```

---

## 4. Servicios GCP Utilizados

| Servicio | Propósito | URL |
|----------|-----------|-----|
| Cloud Run | Host de la app | https://motor-avatares-557866434489.us-central1.run.app |
| Vertex AI | Gemini (chat + voz) | us-central1-aiplatform.googleapis.com |
| Cloud Build | CI/CD automático | console.cloud.google.com/cloud-build |
| Cloud Storage | Assets estáticos | storage.googleapis.com |

---

## 5. Troubleshooting

### Error 404: Model not found

**Causa:** Nombre de modelo incorrecto o no disponible en la región
**Solución:** Verificar modelos en https://cloud.google.com/vertex-ai/generative-ai/docs/models

### Error 403: Permission denied

**Causa:** Service Account sin permisos
**Solución:** Asignar roles `run.admin`, `artifactregistry.admin`, `iam.serviceAccountUser`

### Error: WebSocket no conecta

**Causa:** CORS o puerto incorrecto
**Solución:** Verificar CORS en Express y que el WebSocket usa `/api/live`

### Error: systemInstruction no funciona

**Causa:** Colocado en `generationConfig` en vez de `getGenerativeModel()`
**Solución:** Mover `systemInstruction` al nivel de `getGenerativeModel()`

---

## 6. Comandos Útiles

```bash
# Ver logs en tiempo real
gcloud run services logs read motor-avatares \
  --region=us-central1 \
  --project=project-aa5fb956-b08a-4e13-869 \
  --limit=50

# Ver estado del servicio
gcloud run services describe motor-avatares \
  --region=us-central1 \
  --project=project-aa5fb956-b08a-4e13-869

# Deploy manual
gcloud run deploy motor-avatares \
  --source="C:\Users\sergio\Desktop\boveda obsidian\agencia\motor madre\motoragregarllm" \
  --region=us-central1 \
  --project=project-aa5fb956-b08a-4e13-869

# Probar health endpoint
curl https://motor-avatares-557866434489.us-central1.run.app/api/health

# Probar chat
curl -X POST https://motor-avatares-557866434489.us-central1.run.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola","history":[],"cart":[],"lowLatency":false}'
```

---

## 7. Próximos Pasos

1. ✅ Chat funciona con Gemini 2.5 Flash
2. ✅ WebSocket configurado para voz (Live API)
3. ⏳ Probar WebSocket con cliente real
4. ⏳ Implementar streaming de audio real
5. ⏳ Integrar con frontend de la carta
6. ⏳ Agregar caché de respuestas (costo $0)

---

*Documento creado: 2026-07-09*
*Última actualización: 2026-07-09*
