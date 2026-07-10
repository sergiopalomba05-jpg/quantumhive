# Proceso de armado: Avatar de voz con Gemini Live API (native audio) en PWA + Cloud Run

Método probado el 09-07-2026 en el proyecto `cataavatarhermes` (deployado como `motor-avatares` en Cloud Run).
Sirve para repetir el armado de un agente de voz en tiempo real (micrófono → Gemini → audio de vuelta) en una PWA.

---

## 1. Objetivo

Que un avatar en una PWA hable con voz natural (native audio de Gemini) y escuche al usuario por micrófono, en tiempo real, via WebSocket. El backend conecta la PWA con la **Gemini Live API** (`gemini-live-2.5-flash-native-audio`).

## 2. Stack y archivos clave

- **Backend:** `server.ts` (Express + `ws` WebSocketServer + SDK `@google/genai` Live API). Corre en Cloud Run.
- **Frontend:** `App.tsx` (React/Vite PWA). Captura micrófono, reproduce audio, silent buffer hack.
- **Carta del restaurante:** `src/menuData.ts` + `src/systemPrompt.ts` (`buildSystemPrompt()` convierte la carta en prompt).
- **Deploy:** `cloudbuild.yaml` (build + push a Artifact Registry) + `gcloud run deploy` directo.
- **Modelo de voz:** `gemini-live-2.5-flash-native-audio` (NO es "Gemini 3.1 Pro"; ese no existe para Live Audio).
- **Voz:** `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName = "Aoede"` (una de las 30 HD voices).

## 3. Pasos de armado

### 3.1 Backend (`server.ts`)

```ts
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ vertexai: true, project: projectId, location: "us-central1" });

const session = await ai.live.connect({
  model: "gemini-live-2.5-flash-native-audio",
  config: {
    responseModalities: ["AUDIO"],            // <-- SOLO AUDIO (ver Bug #1)
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
    },
    systemInstruction: { parts: [{ text: buildSystemPrompt() }] }, // ver pendiente "carta"
    outputAudioTranscription: {},             // subtítulos opcionales
  },
  callbacks: {
    onopen: () => console.log("[Live] onopen"),
    onmessage: (message) => {
      const parts = message.serverContent?.modelTurn?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          // audio PCM 24kHz en base64 -> reenviar al cliente WS
          clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
        }
        if (part.text) clientWs.send(JSON.stringify({ text: part.text }));
      }
      if (message.serverContent?.turnComplete) clientWs.send(JSON.stringify({ turnComplete: true }));
    },
    onerror: (e) => console.error("[Live] error", e),
    onclose: (e) => console.log("[Live] close", e),
  },
});

// Micrófono del cliente -> Gemini
clientWs.on("message", (data) => {
  const p = JSON.parse(data.toString());
  if (p.audio) session.sendRealtimeInput({ audio: { data: p.audio, mimeType: "audio/pcm;rate=16000" } });
  if (p.text)  session.sendRealtimeInput({ text: p.text });
});
```

### 3.2 Frontend (`App.tsx`)

- `AudioContext` global. Al click del usuario: crear contexto, reproducir 1 sample de silencio, `await audioContext.resume()` (ver Bug #2).
- Función `playLiveAudioChunk(base64Pcm)`:
  - Decodificar base64 -> Int16 -> Float32.
  - `buffer = outputCtx.createBuffer(1, pcm.length, 24000)` (Gemini manda 24kHz; el navegador resamplea al sampleRate nativo solo).
  - `buffer.copyToChannel(pcmFloat32, 0)`.
  - `source = outputCtx.createBufferSource(); source.buffer = buffer; source.connect(outputCtx.destination); source.start();`
- El cliente manda el saludo inicial como `{ text: "Hola, si te escucho" }` al recibir `connected: true` del server.

## 4. Errores conocidos y soluciones (CRÍTICOS)

### Bug #1 — `responseModalities: ["TEXT","AUDIO"]` en modelo native-audio → NO SUENA
**Síntoma:** conecta, el micrófono anda, pero el avatar nunca emite sonido (ni en Chrome ni en celular).
**Causa:** los modelos **native-audio** de Gemini (ej. `gemini-live-2.5-flash-native-audio`, `gemini-2.5-flash-native-audio-latest`) **NO soportan `responseModalities: [TEXT]`**. Si le pedís TEXT+AUDIO, el modelo no emite audio PCM.
**Fix:** `responseModalities: ["AUDIO"]` (solo audio). La transcripción va por `outputAudioTranscription: {}`, no por `responseModalities: TEXT`.
**Evidencia (GitHub oficial):**
- `kizuna-ai-lab/sokuji` #93 — *"Gemini native-audio models do not support responseModalities: [TEXT] when receiving audio input"*
- `googleapis/js-genai` #1212 — *"gemini-2.5-flash-native-audio Live API… does not support TEXT in the responseModalities field"*
- `livekit/agents` #4423 — *"For Vertex AI: text mode is no longer supported by native audio models"*

### Bug #2 — WebViews duras (Xiaomi/Huawei) bloquean el AudioContext
**Síntoma:** en esos navegadores el audio no arranca aunque el WebSocket llegue.
**Fix (silent buffer hack):** en el click del usuario, crear `AudioContext`, generar 1 sample de silencio (`createBuffer(1,1,22050)`), reproducirlo (`source.start(0)`) y luego `await audioContext.resume()`. Esto "destraba" el canal de audio físicamente antes del cartel de micrófono. La Web Audio API hace el resampleo 24kHz→native solo.

### Bug #3 — Deploy Cloud Run con `cloudbuild.yaml` da `PERMISSION_DENIED` en `iam.serviceaccounts.actAs`
**Síntoma:** el build (docker push a Artifact Registry) sale OK, pero el step de `gcloud run deploy` falla:
```
ERROR: (gcloud.run.deploy) PERMISSION_DENIED: Permission 'iam.serviceaccounts.actAs' denied on 557866434489-compute@developer.gserviceaccount.com
```
**Causa:** el build remoto se autentica como el Compute Engine default SA, que no tiene permiso para `actAs` sobre sí mismo al desplegar a Cloud Run. Quitar el `--service-account` del `cloudbuild.yaml` NO alcanza (Cloud Run igual usa el default SA y exige actAs).
**Workaround (el que funciona):** deploy directo desde la cuenta con permisos (`sergiopalomba05@gmail.com`):
```bash
gcloud run deploy motor-avatares \
  --image us-central1-docker.pkg.dev/project-aa5fb956-b08a-4e13-869/cloud-run-source-deploy/motor-avatares@sha256:<DIGEST> \
  --region us-central1 --project project-aa5fb956-b08a-4e13-869 --platform managed --allow-unauthenticated
```
**Alternativa permanente:** dar el rol `roles/iam.serviceAccountUser` al SA `557866434489-compute@developer.gserviceaccount.com` sobre sí mismo (requiere owner), y el `cloudbuild.yaml` deployaría solo.

### Bug #4 — El build remoto falla en el deploy pero la imagen queda en el registry
El `gcloud builds submit --config cloudbuild.yaml .` hace push de la imagen aunque el deploy remoto falle. Extraer el digest del log y hacer deploy directo:
```bash
gcloud builds submit --config cloudbuild.yaml . --project project-aa5fb956-b08a-4e13-869 2>&1 | tee /tmp/build.log
DIGEST=$(grep -oE 'sha256:[0-9a-f]+' /tmp/build.log | tail -1 | sed 's/sha256://')
gcloud run deploy motor-avatares --image "us-central1-docker.pkg.dev/project-aa5fb956-b08a-4e13-869/cloud-run-source-deploy/motor-avatares@sha256:$DIGEST" --region us-central1 --project project-aa5fb956-b08a-4e13-869 --platform managed --allow-unauthenticated
```

## 5. Comandos rápidos

```bash
# Build + push (el deploy remoto falla, pero la imagen queda en registry)
gcloud builds submit --config cloudbuild.yaml . --project project-aa5fb956-b08a-4e13-869

# Deploy directo (usar el digest del build anterior)
gcloud run deploy motor-avatares \
  --image us-central1-docker.pkg.dev/project-aa5fb956-b08a-4e13-869/cloud-run-source-deploy/motor-avatares@sha256:<DIGEST> \
  --region us-central1 --project project-aa5fb956-b08a-4e13-869 --platform managed --allow-unauthenticated
```

- **URL del servicio:** https://motor-avatares-557866434489.us-central1.run.app
- **Verificar que responde:** `curl -sS -o /dev/null -w "%{http_code}" https://motor-avatares-557866434489.us-central1.run.app/`

## 6. Pendiente: atar el avatar a la carta (como el chat)

El `/api/chat` usa `buildSystemPrompt() + cartNote` (toda la carta `menuData` + pedido actual). El `/api/live` tiene el `systemInstruction` hardcodeado y corto, sin carta → el avatar habla genérico.

Para atarlo:
1. **Server:** en `ai.live.connect`, cambiar `systemInstruction` por `buildSystemPrompt()` (+ `cartNote` del pedido actual).
2. **Cliente (`App.tsx`):** enviar el `cart` por el WebSocket al conectar, para que el avatar sepa el pedido y pueda modificarlo por voz (líneas `#PEDIDO#`/`#CHIPS#` que ya filtra el chat).
3. El cliente ya filtra las líneas técnicas para no sonarlas y actualizar la pantalla.

## 7. Reglas del repo (CLAUDE.md) aplicadas

- Push antes de terminar (#2).
- Preguntar antes de acción destructiva (#4).
- Nunca `--dangerously-skip-permissions` (#5).
- Siempre `main` (#12).
- No subir credenciales: la carpeta `VM/` está en `.gitignore` (repo público).
