# Yas Papeo — Bot de atención Telegram

Bot de atención al cliente 24/7 para el salón de belleza Yas Papeo (Olivos).
Gemini chat + TTS · python-telegram-bot 22 · Railway.

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
> En modo polling NO hace falta WEBHOOK_URL: abrís el bot en Telegram y ya responde.

---

## Deploy a Railway (producción 24/7)

Desde la carpeta del bot:

```bash
cd agencia/bots/yas-papeo
railway login              # una sola vez, abre el navegador
railway init               # crea el proyecto
railway up                 # sube y buildea
railway domain             # genera dominio público
# Tomá la URL y agregala como WEBHOOK_URL en variables, redeploya
```

Variables que hay que setear en Railway (Variables tab o `railway variables --set`):
- `TELEGRAM_BOT_TOKEN`
- `GEMINI_API_KEY`
- `WEBHOOK_URL` (la del dominio Railway, sin slash final)
- `GEMINI_MODEL` (opcional, default `gemini-3.1-flash-lite`)
- `GEMINI_TTS_MODEL` (opcional, default `gemini-3.1-flash-tts-preview`)
- `TTS_VOICE` (opcional, default `Kore`)

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
| `WEBHOOK_URL` | En producción | `""` | URL pública del servicio Railway |
| `PORT` | No | `8080` | Puerto del servidor (Railway lo inyecta) |
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
