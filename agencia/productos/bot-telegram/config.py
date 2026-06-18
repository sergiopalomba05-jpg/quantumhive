from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

PRODUCT_DIR = Path(__file__).resolve().parent
DEFAULT_CLIENT_DIR = (PRODUCT_DIR / ".." / ".." / "clientes" / "cata-home").resolve()

CLIENT_DIR = Path(os.environ.get("CATAHOME_CLIENT_DIR", str(DEFAULT_CLIENT_DIR))).resolve()
DATOS_DIR = CLIENT_DIR / "datos"

# Carga el .env del cliente si existe (en prod las vars vienen del entorno)
load_dotenv(CLIENT_DIR / ".env", override=False)


class Config:
    TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
    TELEGRAM_ADMIN_ID = os.environ.get("TELEGRAM_ADMIN_ID", "")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    MODEL_CHAT = os.environ.get("MODEL_CHAT", "gemini-2.5-flash")
    MODEL_TTS = os.environ.get("MODEL_TTS", "gemini-3.1-flash-tts-preview")
    TTS_VOICE = os.environ.get("TTS_VOICE", "Aoede")
    MEMORY_DB = os.environ.get("MEMORY_DB", str(CLIENT_DIR / "cata.db"))
    MEMORY_WINDOW = int(os.environ.get("MEMORY_WINDOW", "12"))
    VOICE_REPLY_MIRROR = os.environ.get("VOICE_REPLY_MIRROR", "true").lower() == "true"
    STREAM_THROTTLE_SECS = float(os.environ.get("STREAM_THROTTLE_SECS", "1.1"))


def validar() -> list[str]:
    faltan = []
    if not Config.TELEGRAM_TOKEN:
        faltan.append("TELEGRAM_TOKEN")
    if not Config.GEMINI_API_KEY:
        faltan.append("GEMINI_API_KEY")
    return faltan
