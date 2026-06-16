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
import random
import re
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
from telegram.request import HTTPXRequest

# La consola de Windows (dev) suele ser cp1252 y rompe al loguear acentos/emojis.
# Forzamos UTF-8 con errors="replace": los logs nunca más tiran UnicodeEncodeError.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

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

# Los URLs leídos por TTS suenan horribles ("h-t-t-p-s dos puntos barra barra...").
# En audio los reemplazamos por una frase natural y mandamos el link como mensaje aparte.
URL_RE = re.compile(r"https?://\S+")
URL_AUDIO_PLACEHOLDER = "te paso el linkcito en un mensajito"

# Generar audio con TTS toma ~10s. Sin acuse, la clienta queda mirando "no me respondió".
# Mandamos un mensajito de texto inmediato (1s) para que sepa que el audio le llegó y
# la estamos por escuchar. Rotamos para no sonar robóticos si manda varios audios seguidos.
AUDIO_ACK_LINES = (
    "Ya te escucho, hermosa, dame un segundito 💕",
    "Te escucho un toque, bella 🌸",
    "Dejame escucharte, ya te respondo ✨",
    "Te leo el audio, hermosa, dame un toquecito 💕",
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
    user_content = types.Content(role="user", parts=[types.Part.from_text(text=text)])
    reply = await _generate(history, user_content)
    model_turn = types.Content(role="model", parts=[types.Part.from_text(text=reply)])
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
        role="user", parts=[types.Part.from_text(text="[nota de voz]")]
    )
    model_turn = types.Content(role="model", parts=[types.Part.from_text(text=reply)])
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

    # Acuse inmediato (1s): la clienta sabe que su audio llegó y la estamos por escuchar.
    # No bloqueamos si falla — el flujo principal sigue igual.
    try:
        await update.message.reply_text(random.choice(AUDIO_ACK_LINES))
    except Exception:
        logger.exception("ack message failed for chat_id=%d", chat_id)

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

    # Saco los URLs antes del TTS y los reservo para mandar como mensaje de texto aparte
    urls = URL_RE.findall(reply_text)
    audio_text = URL_RE.sub(URL_AUDIO_PLACEHOLDER, reply_text).strip()

    # Step 2: TTS → OGG/Opus → sendVoice. If TTS/ffmpeg fails, fall back to text.
    try:
        audio_data, mime_type = await tts_generate(audio_text)
        ogg_bytes = to_ogg_opus(audio_data, mime_type)
        await update.message.reply_voice(voice=ogg_bytes)
    except Exception:
        logger.exception(
            "TTS/ffmpeg failed for chat_id=%d — falling back to text reply", chat_id
        )
        await update.message.reply_text(reply_text)
        return

    # Si la respuesta tenía links (ej. WhatsApp), los mandamos como mensaje de texto
    # SEPARADO del audio — así la clienta los puede tocar/copiar y nadie los escucha leídos.
    if urls:
        await update.message.reply_text("\n".join(urls))


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


# ── Autodiagnóstico de arranque ───────────────────────────────────────────────
async def _self_test() -> None:
    """
    Ejercita el camino REAL de chat contra Gemini al arrancar (incluido
    Part.from_text). Si algo está roto, lo gritamos en el log ANTES de la demo:
    la clienta nunca tiene que ser quien descubra la falla. No tumba el bot si
    falla (un parpadeo de red al boot no debe dejarlo offline) — sólo avisa.
    """
    bar = "=" * 64
    try:
        probe = types.Content(role="user", parts=[types.Part.from_text(text="hola")])
        reply = await _generate([], probe)
        if reply and reply.strip():
            logger.info(bar)
            logger.info("[ OK ] AUTODIAGNOSTICO: el bot responde contra Gemini. LISTO PARA DEMO.")
            logger.info(bar)
        else:
            logger.error(bar)
            logger.error("[FALLO] AUTODIAGNOSTICO: Gemini respondio vacio. REVISAR antes de demo.")
            logger.error(bar)
    except Exception:
        logger.error(bar)
        logger.exception("[FALLO] AUTODIAGNOSTICO: NO MOSTRAR A LA CLIENTA. Revisar el bot.")
        logger.error(bar)


async def _post_init(_application: Application) -> None:
    """Hook que PTB ejecuta tras initialize() y antes de empezar a recibir updates."""
    await _self_test()


# ── Entrypoints ───────────────────────────────────────────────────────────────
def _resilient_request() -> HTTPXRequest:
    # Redes lentas (HF Spaces, Railway al boot) tumban el get_me() inicial con el
    # timeout default de 5s. 30s da margen y la app evita el "TimedOut" al arrancar.
    return HTTPXRequest(connect_timeout=30.0, read_timeout=30.0, write_timeout=30.0)


async def run_webhook() -> None:
    ptb_app = (
        Application.builder()
        .token(TELEGRAM_BOT_TOKEN)
        .request(_resilient_request())
        .get_updates_request(_resilient_request())
        .build()
    )
    _register_handlers(ptb_app)
    await ptb_app.initialize()
    await ptb_app.start()

    # Autodiagnóstico antes de exponer el webhook al público
    await _self_test()

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
        ptb_app = (
            Application.builder()
            .token(TELEGRAM_BOT_TOKEN)
            .request(_resilient_request())
            .get_updates_request(_resilient_request())
            .post_init(_post_init)
            .build()
        )
        _register_handlers(ptb_app)
        ptb_app.run_polling()
    else:
        asyncio.run(run_webhook())


if __name__ == "__main__":
    main()
