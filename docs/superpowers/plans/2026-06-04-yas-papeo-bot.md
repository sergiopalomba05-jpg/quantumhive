# Yas Papeo Telegram Bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a 24/7 Telegram customer-service bot for Yas Papeo beauty salon — text and voice, Gemini-powered, on Google Cloud Run.

**Architecture:** A single `aiohttp` server handles the Telegram webhook POST at `/telegram` and a health check GET at `/health`. `python-telegram-bot` v22 processes updates via its `update_queue`. `gemini-3.1-flash-lite` handles multimodal chat (text + OGG audio in); `gemini-3.1-flash-tts-preview` synthesizes voice replies. `ffmpeg` converts TTS WAV output to OGG/Opus for `sendVoice`. Chat history lives in-memory per `chat_id`, structured for a future Firestore swap. A `@with_retries` decorator wraps every Gemini/TTS call; all failures respond in-character, never with a stack trace.

**Tech Stack:** Python 3.11, `google-genai ≥ 1.18`, `python-telegram-bot==22.7`, `aiohttp`, `python-dotenv`, `ffmpeg` (system package), Google Cloud Run (`min-instances=1`, webhook).

**TTS choice — Gemini TTS (`gemini-3.1-flash-tts-preview`):**
Chosen over Google Cloud TTS for zero-friction credentials (same `GEMINI_API_KEY`, same SDK). Argentine accent is guided via the TTS prompt prefix. Voice `Kore` (warm, feminine). Cloud TTS remains a drop-in upgrade path if better es-AR accent is needed later — only `tts_generate()` changes.

---

## File Map

| File | Responsibility |
|------|----------------|
| `agencia/bots/yas-papeo/system_prompt.md` | Persona, reglas, ejemplos — read once at startup |
| `agencia/bots/yas-papeo/app.py` | Webhook server + all handlers + Gemini chat + TTS + audio |
| `agencia/bots/yas-papeo/requirements.txt` | Python dependencies (pinned) |
| `agencia/bots/yas-papeo/Dockerfile` | Python 3.11-slim + ffmpeg |
| `agencia/bots/yas-papeo/.env.ejemplo` | All env-var names, empty values |
| `agencia/bots/yas-papeo/README.md` | Local dev + Cloud Run deploy guide |

---

## Task 1: Directory structure + system_prompt.md + .env.ejemplo + .gitignore patch

**Files:**
- Create: `agencia/bots/yas-papeo/system_prompt.md`
- Create: `agencia/bots/yas-papeo/.env.ejemplo`
- Modify: `.gitignore`

- [ ] **Step 1: Create `agencia/bots/yas-papeo/system_prompt.md`**

Exact content — do not add, remove, or reformat anything:

```markdown
Sos la voz que atiende los mensajes de Yas Papeo – Belleza Capilar, un salón de Olivos especializado en alisados y reconstrucción capilar. Atendés con calidez, asesorás sobre los tratamientos y acompañás a la clienta para que agende su ritual de amor propio.

## Personalidad y tono
- Hablás en voseo argentino (vos, escribinos, agendá, tenés). Nunca tú/usted.
- Sos cálida, empática, femenina y profesional: una amiga que sabe de cuidado capilar y te cuida.
- Emojis sutiles y estéticos (🌸 ✨ 🧴 💆‍♀️ 💕), no en cada frase.
- Usás "bella", "hermosa", "reina" de forma natural y variada, no en todos los mensajes.
- Mensajes cortos y humanos, como un chat real. Nada de párrafos largos ni lenguaje corporativo.
- Tus respuestas pueden leerse en voz alta (audio): mantenelas naturales y no muy largas, sin listas largas. Si tenés que pasar el link de WhatsApp, decílo de forma simple.

## Quién es Yas Papeo (contexto)
- Equipo liderado por mujeres jóvenes: Jasmín (Yas) —fundadora—, Cami, Valen y Abru. Mameluco rosa pastel de marca propia.
- Salón en Olivos, en un piso 8 luminoso con vista al río. Estética minimalista, sillas rosa pastel.
- Filosofía: no es "ir a la peluquería", es un ritual de amor propio. Slogan: "tu mejor cita sos vos".
- Servicios: Botox capilar, Alisado plex, Keratina plex, Brazilian plex, CPLEX, UVA complex y reconstrucción capilar.

## Argumentos de confianza (repetilos cuando vengan al caso)
- Libres de formol (sin olor fuerte ni ardor).
- Aprobados por ANMAT.
- Aptos para embarazadas y mamás lactantes.

## Cuidado en casa (podés asesorar sobre esto)
1. Shampoo libre de parabenos o lo más natural posible.
2. Protector térmico siempre antes de planchita o secador.
3. Máscara de hidratación semanal.
4. El pelo decolorado u opaco necesita reconstrucción profunda antes de un alisado fuerte.

## Reglas duras (no se rompen nunca)
- NO revelás que sos una IA o un bot. Sos quien atiende el chat del salón. Si te preguntan "¿sos un bot?", "¿sos real?", "¿con quién hablo?": respondé cálido sin confirmarlo ni negarlo de forma robótica, y desviá hacia ayudar. Ej: "Soy quien te atiende por acá, hermosa 🌸 contame en qué te puedo ayudar con tu pelo." Nunca digas que sos un programa, modelo, asistente virtual ni inteligencia artificial.
- NO das precios, ni estimados, ni rangos. Cada cabello necesita diagnóstico; el valor lo confirman las estilistas en el salón. Ej: "El valor te lo confirman las chicas en el salón después de ver tu pelo, porque cada cabello necesita algo distinto 💕".
- NO confirmás ni agendás turnos vos. Coordinás derivando al WhatsApp oficial → https://walink.co/6a58d1.
- NO inventás nada. Si no sabés un dato, un nombre de producto, un horario o un caso técnico complejo (daño, quemadura, color), no lo inventes: pedí una foto del pelo y derivá a Yas o Cami, que lo revisan manualmente.
- Solo hablás de Yas Papeo y cuidado capilar. Si te preguntan otra cosa, redirigí con cariño.
- No prometés resultados médicos ni das consejos de salud fuera del cuidado del cabello.

## Flujo
1. Saludá cálido y respondé la consulta.
2. Si muestra intención de reservar, explicá que los turnos se coordinan por el WhatsApp oficial y pasá el link: https://walink.co/6a58d1.
3. Si el caso necesita diagnóstico (precio, daño, color), pedí foto y derivá a las estilistas.

## Ejemplos
"¿Tienen alisados sin formol? Estoy embarazada."
→ ¡Hola, bella! 🌸 Sí, totalmente. Cuidamos tu salud tanto como tu pelo: todos nuestros alisados y reconstrucciones son libres de formol y aprobados por ANMAT, seguros para embarazadas y mamás lactantes. ¿Querés que te cuente cómo trabajamos? ✨

"¿Cuánto sale la keratina?"
→ Te entiendo, hermosa 🌸 El valor te lo confirman las chicas en el salón después de ver tu pelo, porque depende del largo y el estado. Si querés, mandales una foto por WhatsApp 👉 https://walink.co/6a58d1

"Quiero sacar un turno."
→ ¡Qué lindo que te quieras regalar ese momento, hermosa! 💆‍♀️ Para coordinar día y horario en el salón de Olivos, escribinos al WhatsApp acá 👉 https://walink.co/6a58d1 — las chicas te asesoran con todo el amor ✨
```

- [ ] **Step 2: Create `agencia/bots/yas-papeo/.env.ejemplo`**

```
# Yas Papeo bot — copiá a .env y completá. NUNCA commitear el .env real.

# Telegram — obtenelo con @BotFather
TELEGRAM_BOT_TOKEN=

# Secreto para validar que los updates vienen de Telegram (generá uno random, ej: openssl rand -hex 32)
TELEGRAM_WEBHOOK_SECRET=

# Gemini — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=

# Opcionales (estos son los defaults)
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
TTS_VOICE=Kore

# URL pública del servicio Cloud Run (se completa después del primer deploy)
WEBHOOK_URL=https://TU-SERVICIO.run.app

# Puerto (Cloud Run inyecta $PORT=8080 automáticamente)
PORT=8080

# SOLO para dev local. En producción: false
TELEGRAM_USE_POLLING=false
```

- [ ] **Step 3: Add bot env glob to `.gitignore`**

Open `.gitignore` and add this line in the "Env files" section, right after `agencia/agentes/**/.env`:

```
agencia/bots/**/.env
```

- [ ] **Step 4: Commit**

```bash
git add agencia/bots/yas-papeo/system_prompt.md agencia/bots/yas-papeo/.env.ejemplo .gitignore
git commit -m "feat(yas-papeo): scaffold — system_prompt, .env.ejemplo, .gitignore"
```

---

## Task 2: app.py — full implementation

**Files:**
- Create: `agencia/bots/yas-papeo/app.py`

- [ ] **Step 1: Create `agencia/bots/yas-papeo/app.py`** with this exact content:

```python
"""
Yas Papeo — bot de atención al cliente 24/7.

Stack: python-telegram-bot 22.x (webhook) + aiohttp + google-genai (Gemini chat + TTS) + ffmpeg.

Modos:
  TELEGRAM_USE_POLLING=true   → polling (solo dev local)
  TELEGRAM_USE_POLLING=false  → webhook aiohttp (producción Cloud Run)
"""
import asyncio
import logging
import os
import signal
import subprocess
import sys
from functools import wraps
from pathlib import Path

from aiohttp import web
from dotenv import load_dotenv
from google import genai
from google.genai import types
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("yas-papeo")

# ── Config ────────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_WEBHOOK_SECRET: str = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
GEMINI_API_KEY: str = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_TTS_MODEL: str = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
TTS_VOICE: str = os.environ.get("TTS_VOICE", "Kore")
WEBHOOK_URL: str = os.environ.get("WEBHOOK_URL", "")
PORT: int = int(os.environ.get("PORT", 8080))
USE_POLLING: bool = os.environ.get("TELEGRAM_USE_POLLING", "false").lower() == "true"

# system_prompt.md lives next to this file — works regardless of cwd
SYSTEM_PROMPT: str = (Path(__file__).parent / "system_prompt.md").read_text(encoding="utf-8")

genai_client = genai.Client(api_key=GEMINI_API_KEY)

# ── In-memory chat history ────────────────────────────────────────────────────
# {chat_id: list[types.Content]}
# Audio turns are stored as a "[nota de voz]" text placeholder to avoid memory bloat.
# TODO (future): swap this dict for Firestore — only _get_history / _save_history need to change.
chat_histories: dict[int, list] = {}
MAX_HISTORY = 20  # keep last N Content objects (user + model alternating)

IN_CHARACTER_ERROR = (
    "Perdón, hermosa 🌸 se me trabó la conexión un segundito. ¿Me lo repetís?"
)


def _get_history(chat_id: int) -> list:
    return chat_histories.get(chat_id, [])


def _save_history(chat_id: int, history: list) -> None:
    chat_histories[chat_id] = history[-MAX_HISTORY:]


# ── Retry decorator ───────────────────────────────────────────────────────────
def with_retries(max_attempts: int = 3, base_delay: float = 1.5):
    """Exponential backoff retry for async functions. Raises on final failure."""
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return await fn(*args, **kwargs)
                except Exception as exc:
                    if attempt == max_attempts - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        "%s attempt %d/%d failed: %s — retrying in %.1fs",
                        fn.__name__, attempt + 1, max_attempts, exc, delay,
                    )
                    await asyncio.sleep(delay)
        return wrapper
    return decorator


# ── Gemini chat ───────────────────────────────────────────────────────────────
async def _generate(history: list, user_content: types.Content) -> str:
    """Blocking Gemini call run in a thread pool so the event loop isn't blocked."""
    response = await asyncio.to_thread(
        genai_client.models.generate_content,
        model=GEMINI_MODEL,
        contents=history + [user_content],
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )
    return response.text


@with_retries()
async def chat_text(chat_id: int, text: str) -> str:
    history = _get_history(chat_id)
    user_content = types.Content(role="user", parts=[types.Part.from_text(text)])
    reply = await _generate(history, user_content)
    model_turn = types.Content(role="model", parts=[types.Part.from_text(reply)])
    _save_history(chat_id, history + [user_content, model_turn])
    return reply


@with_retries()
async def chat_audio(chat_id: int, audio_bytes: bytes) -> str:
    """Process OGG/Opus voice note. Stores a text placeholder in history (not raw bytes)."""
    history = _get_history(chat_id)
    user_content = types.Content(
        role="user",
        parts=[
            types.Part(
                inline_data=types.Blob(mime_type="audio/ogg", data=audio_bytes)
            )
        ],
    )
    reply = await _generate(history, user_content)
    # Store placeholder — audio bytes are never persisted to history
    placeholder = types.Content(
        role="user", parts=[types.Part.from_text("[nota de voz]")]
    )
    model_turn = types.Content(role="model", parts=[types.Part.from_text(reply)])
    _save_history(chat_id, history + [placeholder, model_turn])
    return reply


# ── Gemini TTS ────────────────────────────────────────────────────────────────
@with_retries()
async def tts_generate(text: str) -> tuple[bytes, str]:
    """
    Returns (audio_bytes, mime_type).
    Gemini TTS typically returns audio/wav or audio/pcm at 24kHz mono.
    """
    response = await asyncio.to_thread(
        genai_client.models.generate_content,
        model=GEMINI_TTS_MODEL,
        contents=(
            "Decí esto de forma cálida, en voseo argentino con acento rioplatense femenino: "
            + text
        ),
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=TTS_VOICE
                    )
                )
            ),
        ),
    )
    part = response.candidates[0].content.parts[0]
    return part.inline_data.data, part.inline_data.mime_type


def to_ogg_opus(audio_data: bytes, mime_type: str) -> bytes:
    """
    Convert Gemini TTS output to OGG/Opus so Telegram accepts it as a voice note.

    Gemini TTS returns either:
      - audio/wav   → ffmpeg auto-detects via container header
      - audio/pcm or audio/l16 → raw s16le PCM, 24kHz, mono — must specify format
    """
    if "pcm" in mime_type or "l16" in mime_type:
        input_flags = ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0"]
    else:
        # WAV (or other container): let ffmpeg read the header
        input_flags = ["-i", "pipe:0"]

    cmd = [
        "ffmpeg", *input_flags,
        "-c:a", "libopus",
        "-f", "ogg",
        "pipe:1",
        "-y",
        "-loglevel", "error",
    ]
    result = subprocess.run(cmd, input=audio_data, capture_output=True, check=True)
    return result.stdout


# ── Telegram handlers ─────────────────────────────────────────────────────────
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Reset history and greet in character."""
    chat_id = update.effective_chat.id
    chat_histories.pop(chat_id, None)
    await update.message.reply_text(
        "¡Hola, hermosa! 🌸 Soy quien te atiende por acá en Yas Papeo. "
        "¿En qué te puedo ayudar con tu pelo hoy? ✨"
    )


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    await context.bot.send_chat_action(chat_id=chat_id, action="typing")
    try:
        reply = await chat_text(chat_id, update.message.text)
    except Exception:
        logger.exception("chat_text failed for chat_id=%d", chat_id)
        reply = IN_CHARACTER_ERROR
    await update.message.reply_text(reply)


async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    voice = update.message.voice or update.message.audio
    if not voice:
        return

    await context.bot.send_chat_action(chat_id=chat_id, action="record_voice")

    # Download voice note bytes
    tg_file = await context.bot.get_file(voice.file_id)
    audio_bytes = bytes(await tg_file.download_as_bytearray())

    # Step 1: Gemini understands the audio and returns text
    try:
        reply_text = await chat_audio(chat_id, audio_bytes)
    except Exception:
        logger.exception("chat_audio failed for chat_id=%d", chat_id)
        await update.message.reply_text(IN_CHARACTER_ERROR)
        return

    # Step 2: TTS → OGG/Opus → sendVoice. If TTS/ffmpeg fails, fall back to text.
    try:
        audio_data, mime_type = await tts_generate(reply_text)
        ogg_bytes = to_ogg_opus(audio_data, mime_type)
        await update.message.reply_voice(voice=ogg_bytes)
    except Exception:
        logger.exception(
            "TTS/ffmpeg failed for chat_id=%d — falling back to text reply", chat_id
        )
        await update.message.reply_text(reply_text)


# ── aiohttp webhook server ────────────────────────────────────────────────────
def _build_web_app(ptb_app: Application) -> web.Application:
    async def telegram_webhook(request: web.Request) -> web.Response:
        # Validate Telegram's secret token header
        if TELEGRAM_WEBHOOK_SECRET:
            incoming = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
            if incoming != TELEGRAM_WEBHOOK_SECRET:
                logger.warning("Webhook rejected: bad secret token (IP: %s)", request.remote)
                return web.Response(status=403)
        data = await request.json()
        update = Update.de_json(data, ptb_app.bot)
        await ptb_app.update_queue.put(update)
        return web.Response(status=200)

    async def health(_request: web.Request) -> web.Response:
        return web.Response(text="ok")

    app = web.Application()
    app.router.add_post("/telegram", telegram_webhook)
    app.router.add_get("/health", health)
    return app


def _register_handlers(ptb_app: Application) -> None:
    ptb_app.add_handler(CommandHandler("start", cmd_start))
    ptb_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    ptb_app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_audio))


# ── Entrypoints ───────────────────────────────────────────────────────────────
async def run_webhook() -> None:
    ptb_app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    _register_handlers(ptb_app)
    await ptb_app.initialize()
    await ptb_app.start()

    web_app = _build_web_app(ptb_app)
    runner = web.AppRunner(web_app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()
    logger.info("Server listening on 0.0.0.0:%d", PORT)

    # Register webhook with Telegram if WEBHOOK_URL is set
    if WEBHOOK_URL:
        await ptb_app.bot.set_webhook(
            url=f"{WEBHOOK_URL}/telegram",
            secret_token=TELEGRAM_WEBHOOK_SECRET or None,
        )
        logger.info("Telegram webhook set → %s/telegram", WEBHOOK_URL)
    else:
        logger.warning("WEBHOOK_URL not set — Telegram won't deliver updates until you set it.")

    # Wait for SIGTERM / SIGINT (Cloud Run sends SIGTERM on scale-down)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except (NotImplementedError, AttributeError):
            pass  # Windows dev machine: KeyboardInterrupt propagates naturally

    logger.info("Bot running. Send SIGTERM or press Ctrl+C to stop.")
    await stop.wait()
    logger.info("Shutdown signal received — cleaning up...")

    await runner.cleanup()
    await ptb_app.stop()
    await ptb_app.shutdown()


def main() -> None:
    if USE_POLLING:
        logger.info("POLLING mode — dev only, DO NOT use in production")
        ptb_app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        _register_handlers(ptb_app)
        ptb_app.run_polling()
    else:
        asyncio.run(run_webhook())


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add agencia/bots/yas-papeo/app.py
git commit -m "feat(yas-papeo): app.py — webhook server, Gemini chat+TTS, audio, retries, fallback"
```

---

## Task 3: requirements.txt + Dockerfile

**Files:**
- Create: `agencia/bots/yas-papeo/requirements.txt`
- Create: `agencia/bots/yas-papeo/Dockerfile`

- [ ] **Step 1: Create `agencia/bots/yas-papeo/requirements.txt`**

```
google-genai>=1.18.0
python-telegram-bot==22.7
aiohttp>=3.9.0
python-dotenv>=1.0.0
```

> `aiohttp` is a transitive dep of PTB but pinned explicitly so the version is intentional.

- [ ] **Step 2: Create `agencia/bots/yas-papeo/Dockerfile`**

```dockerfile
FROM python:3.11-slim

# ffmpeg: convert Gemini TTS audio (WAV/PCM) → OGG/Opus for Telegram sendVoice
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the bot directory (not the whole monorepo)
COPY agencia/bots/yas-papeo/ .

# Cloud Run injects PORT=8080; honour it
ENV PORT=8080
EXPOSE 8080

CMD ["python", "app.py"]
```

> **Note:** The `gcloud run deploy --source .` command runs from the **repo root**. The Dockerfile copies `agencia/bots/yas-papeo/` into `/app`. If you deploy from inside the bot directory instead, change the COPY line to `COPY . .`.

- [ ] **Step 3: Commit**

```bash
git add agencia/bots/yas-papeo/requirements.txt agencia/bots/yas-papeo/Dockerfile
git commit -m "feat(yas-papeo): requirements.txt + Dockerfile (python 3.11-slim + ffmpeg)"
```

---

## Task 4: README.md

**Files:**
- Create: `agencia/bots/yas-papeo/README.md`

- [ ] **Step 1: Create `agencia/bots/yas-papeo/README.md`**

```markdown
# Yas Papeo — Bot de atención Telegram

Bot de atención al cliente 24/7 para el salón de belleza Yas Papeo (Olivos).  
Gemini chat + TTS · python-telegram-bot 22 · Google Cloud Run.

---

## Setup local (dev)

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

> **Polling es solo para desarrollo.** En producción siempre usá webhook (`TELEGRAM_USE_POLLING=false`).

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

### 3. Primer deploy (sin webhook_url todavía — la URL la da el deploy)

```bash
# Desde la raíz del repo
gcloud run deploy yas-papeo-bot \
  --source . \
  --region southamerica-east1 \
  --min-instances 1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=TU_KEY,TELEGRAM_WEBHOOK_SECRET=TU_SECRET,GEMINI_MODEL=gemini-3.1-flash-lite,GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview,TTS_VOICE=Kore"
```

> El token de Telegram conviene pasarlo como Secret Manager, no como env var plano:
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
```

- [ ] **Step 2: Commit**

```bash
git add agencia/bots/yas-papeo/README.md
git commit -m "docs(yas-papeo): README — local dev + Cloud Run deploy guide"
```

---

## Task 5: Local smoke test (polling mode)

> This task is **manual** — Claude Code documents the steps; Sergio or the engineer executes them. Bot token and API key required.

**Pre-condition:** Python 3.11+ and `ffmpeg` installed locally.

- [ ] **Step 1: Create local `.env`**

```bash
cd agencia/bots/yas-papeo
cp .env.ejemplo .env
```

Edit `.env`:
```
TELEGRAM_BOT_TOKEN=<token de BotFather>
GEMINI_API_KEY=<key de AI Studio>
TELEGRAM_USE_POLLING=true
```
Leave all other vars as-is.

- [ ] **Step 2: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 3: Run the bot**

```bash
python app.py
```

Expected output:
```
... INFO yas-papeo: POLLING mode — dev only, DO NOT use in production
... INFO apscheduler... (PTB internal scheduler)
```
No tracebacks.

- [ ] **Step 4: Run the checklist in Telegram**

Open the bot in Telegram and test each item. Expected results:

| Message sent | Expected bot response |
|---|---|
| `/start` | Saludo cálido en personaje, no menciona IA |
| `"hola, ¿qué alisados tienen?"` | Describe servicios, voseo, no da precios |
| `"¿cuánto sale la keratina?"` | No da precio, deriva a WhatsApp |
| `"¿sos un bot?"` | No confirma, desvía calurosamente |
| `"quiero sacar un turno"` | Da link walink.co/6a58d1 |
| Voice note: "hola, ¿tienen botox capilar?" | Responde con nota de voz, voseo, suena natural |
| Set `GEMINI_API_KEY=invalid` and restart, then send any text | Responds in-character ("se me trabó la conexión"), no stack trace |

- [ ] **Step 5: Confirm all checklist items pass, then commit checkpoint**

```bash
git add -p  # only if any fixes were made during testing
git commit -m "test(yas-papeo): local smoke test passed — all checklist items ✓"
```

---

## Task 6: Deploy to Cloud Run + webhook (requires Sergio's approval)

> **STOP — do not execute this task until Sergio gives explicit approval.**  
> Sergio must complete the GCP prerequisites listed in section 11 of the brief first.

- [ ] **Step 1: Confirm GCP prerequisites with Sergio**

Sergio confirms:
- [ ] GCP project created with billing active
- [ ] `gcloud` installed and authenticated (`gcloud auth login`)
- [ ] Project set: `gcloud config set project <PROJECT_ID>`

- [ ] **Step 2: Enable required APIs**

Run from any directory:
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Expected: each API prints `Operation "operations/..." finished successfully.`

- [ ] **Step 3: Store bot token in Secret Manager**

```bash
echo -n "<TELEGRAM_BOT_TOKEN>" | gcloud secrets create telegram-bot-token --data-file=-
```

Expected: `Created version [1] of the secret [telegram-bot-token].`

Grant Cloud Run access to the secret:
```bash
# Get the default Cloud Run service account
PROJECT_ID=$(gcloud config get-value project)
SA="$(gcloud iam service-accounts list --filter='displayName:Default compute' --format='value(email)')"
echo "SA: $SA"
gcloud secrets add-iam-policy-binding telegram-bot-token \
  --member="serviceAccount:$SA" \
  --role="roles/secretmanager.secretAccessor"
```

- [ ] **Step 4: Generate webhook secret**

```bash
openssl rand -hex 32
```

Copy the output — this is your `TELEGRAM_WEBHOOK_SECRET`. Keep it; you'll need it in the next step.

- [ ] **Step 5: First deploy (no WEBHOOK_URL yet)**

Run from the **repo root** (so the Dockerfile COPY path resolves correctly):

```bash
gcloud run deploy yas-papeo-bot \
  --source . \
  --region southamerica-east1 \
  --min-instances 1 \
  --allow-unauthenticated \
  --set-secrets "TELEGRAM_BOT_TOKEN=telegram-bot-token:latest" \
  --set-env-vars "GEMINI_API_KEY=<TU_KEY>,TELEGRAM_WEBHOOK_SECRET=<TU_SECRET>,GEMINI_MODEL=gemini-3.1-flash-lite,GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview,TTS_VOICE=Kore,TELEGRAM_USE_POLLING=false"
```

Expected: build takes ~2-3 min, ends with:
```
Service [yas-papeo-bot] revision [...] has been deployed and is serving 100 percent of traffic.
Service URL: https://yas-papeo-bot-XXXXXXXXXX-rj.a.run.app
```

- [ ] **Step 6: Set WEBHOOK_URL and redeploy**

Replace `<SERVICE_URL>` with the URL from the previous step:

```bash
gcloud run services update yas-papeo-bot \
  --region southamerica-east1 \
  --update-env-vars "WEBHOOK_URL=<SERVICE_URL>"
```

This triggers a new revision. `app.py` will call `set_webhook()` on startup.

- [ ] **Step 7: Verify webhook registration**

Replace `<TOKEN>` with the actual bot token:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Expected JSON contains:
```json
{
  "url": "https://yas-papeo-bot-XXXXXXXXXX-rj.a.run.app/telegram",
  "has_custom_certificate": false,
  "pending_update_count": 0
}
```

- [ ] **Step 8: Verify health endpoint**

```bash
curl https://yas-papeo-bot-XXXXXXXXXX-rj.a.run.app/health
```

Expected: `ok` with HTTP 200.

- [ ] **Step 9: Run the full checklist in production**

Repeat the same 7-item checklist from Task 5 Step 4 against the live bot.

- [ ] **Step 10: git push**

```bash
git push
```

> Per CLAUDE.md Rule #2: if it's not on GitHub, it doesn't exist. This closes the task.

---

## Self-review against spec

| Requirement | Covered in |
|---|---|
| CLAUDE.md read before starting | Pre-condition of this plan |
| Model verified: `gemini-3.1-flash-lite` (not `gemini-1.5-*`) | Tech Stack header |
| PTB version pinned: `22.7` | Task 3 requirements.txt |
| SDK: `google-genai` (not `google-generativeai`) | Task 2 app.py imports |
| TTS choice justified | Architecture header |
| `/start` handler | Task 2 `cmd_start()` |
| Text → Gemini → text | Task 2 `handle_text()` |
| Audio → Gemini → TTS → voice | Task 2 `handle_audio()` |
| TTS fails → text fallback | Task 2 `handle_audio()` except block |
| "Typing…" / "Recording…" indicators | Task 2 `send_chat_action` calls |
| In-memory history, Firestore-ready | Task 2 `_get_history`/`_save_history` |
| Retries with backoff | Task 2 `@with_retries` |
| In-character error fallback (never stack trace) | Task 2 `IN_CHARACTER_ERROR` |
| Logs to stdout → Cloud Logging | Task 2 `logging` config |
| Webhook with `secret_token` | Task 2 `_build_web_app` + Task 6 |
| Health endpoint → 200 | Task 2 `/health` route |
| `system_prompt.md` loaded at startup | Task 2 `Path(__file__).parent` |
| `system_prompt.md` exact content from brief §7 | Task 1 |
| `.env` never in repo + `.gitignore` updated | Task 1 |
| `ffmpeg` in Dockerfile | Task 3 |
| `min-instances=1` on Cloud Run | Task 6 |
| `git push` after each stable step | Every task's commit step |
| Sergio approves before deploy | Task 6 header |
| Full checklist tested locally before deploy | Task 5 |
