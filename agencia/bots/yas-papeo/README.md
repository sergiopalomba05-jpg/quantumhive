# Yas Papeo — Bot de atención Telegram

Bot de atención al cliente 24/7 para el salón de belleza Yas Papeo (Olivos).
Gemini chat + TTS · python-telegram-bot 22 · Google Cloud Run.

---

## Setup local (dev) — la vía rápida para la demo

### 1. Requisitos
- Python 3.11+
- `ffmpeg` instalado en el sistema (`winget install ffmpeg` en Windows, `brew install ffmpeg` en Mac)
- Token de Telegram (@BotFather)
- Gemini API key (https://aistudio.google.com/app/apikey)

### 2. Instalá dependencias

```bash
cd agencia/bots/yas-papeo
pip install -r requirements.txt
```

### 3. Configurá el .env

```bash
cp .env.ejemplo .env
# Editá .env y completá TELEGRAM_BOT_TOKEN y GEMINI_API_KEY
# Dejá TELEGRAM_USE_POLLING=true para dev local
```

### 4. Corré el bot en modo polling

```bash
cd agencia/bots/yas-papeo
python app.py
```

> **Polling es solo para desarrollo / demo.** En producción siempre usá webhook (`TELEGRAM_USE_POLLING=false`).
> En modo polling NO hace falta WEBHOOK_URL ni Cloud Run: abrís el bot en Telegram y ya responde.

---

## Deploy a Google Cloud Run

### Requisitos previos (hace Sergio, no el bot)
1. Proyecto GCP creado con facturación activa.
2. `gcloud` instalado y autenticado: `gcloud auth login`
3. Proyecto configurado: `gcloud config set project <PROJECT_ID>`

### 1. Habilitá las APIs necesarias

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 2. Generá el webhook secret

```bash
openssl rand -hex 32
# Guardá este valor como TELEGRAM_WEBHOOK_SECRET
```

### 3. Primer deploy (sin WEBHOOK_URL todavía — la URL la da el deploy)

```bash
# Desde la raíz del repo
gcloud run deploy yas-papeo-bot \
  --source . \
  --region southamerica-east1 \
  --min-instances 1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=TU_KEY,TELEGRAM_BOT_TOKEN=TU_TOKEN,TELEGRAM_WEBHOOK_SECRET=TU_SECRET,GEMINI_MODEL=gemini-3.1-flash-lite,GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview,TTS_VOICE=Kore,TELEGRAM_USE_POLLING=false"
```

> Mejor: pasá el token como Secret Manager en vez de env var plano:
> `--set-secrets "TELEGRAM_BOT_TOKEN=telegram-bot-token:latest"`

### 4. Tomá la URL del servicio

El deploy imprime algo como:
```
Service URL: https://yas-papeo-bot-xxxxxxxxxx-rj.a.run.app
```

### 5. Segundo deploy — agregá WEBHOOK_URL

```bash
gcloud run services update yas-papeo-bot \
  --region southamerica-east1 \
  --update-env-vars "WEBHOOK_URL=https://yas-papeo-bot-xxxxxxxxxx-rj.a.run.app"
```

Al arrancar, `app.py` llama automáticamente a `set_webhook()` con esa URL.

### 6. Verificá el webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Debe mostrar `"url": "https://yas-papeo-bot-xxx.run.app/telegram"` y `"pending_update_count": 0`.

### 7. Health check

```bash
curl https://yas-papeo-bot-xxxxxxxxxx-rj.a.run.app/health
# → ok
```

---

## Checklist de prueba (antes de mostrárselo a Jaz)

- [ ] Texto → texto, voseo cálido y en personaje
- [ ] Audio → audio (se entiende y suena natural, acento argentino)
- [ ] "¿cuánto sale X?" → NO da precio, deriva a diagnóstico
- [ ] "¿sos un bot?" → NO confirma ser IA, desvía con calidez
- [ ] "quiero un turno" → deriva al WhatsApp walink.co/6a58d1
- [ ] Diferencia entre servicios → responde general, sin inventar
- [ ] Gemini cae (cambiá la key por una inválida) → responde en personaje, NO un error técnico
- [ ] Reinicio del servicio → vuelve a responder sin intervención

---

## Variables de entorno

| Variable | Obligatoria | Default | Descripción |
|----------|-------------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | Token de @BotFather |
| `GEMINI_API_KEY` | ✅ | — | Key de Google AI Studio |
| `TELEGRAM_WEBHOOK_SECRET` | Recomendada | `""` | Valida que updates vienen de Telegram |
| `WEBHOOK_URL` | En producción | `""` | URL pública del servicio Cloud Run |
| `PORT` | No | `8080` | Puerto del servidor (Cloud Run lo inyecta) |
| `GEMINI_MODEL` | No | `gemini-3.1-flash-lite` | Modelo de chat |
| `GEMINI_TTS_MODEL` | No | `gemini-3.1-flash-tts-preview` | Modelo de TTS |
| `TTS_VOICE` | No | `Kore` | Voz de Gemini TTS |
| `TELEGRAM_USE_POLLING` | No | `false` | `true` solo para dev local |

---

## Arquitectura interna

```
Telegram → POST /telegram (aiohttp)
               │
               ├─ secret_token check
               │
               └─ ptb_app.update_queue.put(update)
                       │
                       ├─ /start       → cmd_start()
                       ├─ texto        → handle_text() → chat_text() → Gemini → reply_text()
                       └─ audio/voz    → handle_audio()
                                              │
                                              ├─ chat_audio()  → Gemini (multimodal) → text
                                              └─ tts_generate() → WAV → ffmpeg → OGG → sendVoice()
```
