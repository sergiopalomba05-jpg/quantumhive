"""Bot de Telegram "Cata" — demo de atención al cliente de Cata Home.

Arranque: cd agencia/productos/bot-telegram && .venv/Scripts/python.exe bot.py
(Requiere TELEGRAM_TOKEN y GEMINI_API_KEY en el .env del cliente, y ffmpeg en el PATH.)
"""
from __future__ import annotations
import time
from collections import defaultdict, deque

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (Application, CommandHandler, ContextTypes,
                          MessageHandler, filters)

from config import Config, validar
from cata_prompt import SYSTEM_PROMPT
import gemini

WELCOME = ("¡Hola! 🏠 Soy Cata, de Cata Home. Te puedo mostrar productos, "
           "contarte de envíos, pagos y promos, o pasarte con una persona. "
           "¿En qué te doy una mano? ✨")

# Memoria por usuario (en memoria; para el demo alcanza). chat_id -> ventana de turnos.
_memoria: dict[int, deque] = defaultdict(lambda: deque(maxlen=Config.MEMORY_WINDOW))


async def on_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(WELCOME)


async def _responder(update: Update, context: ContextTypes.DEFAULT_TYPE,
                     texto_usuario: str, con_voz: bool) -> None:
    chat_id = update.effective_chat.id
    historial = list(_memoria[chat_id])

    await context.bot.send_chat_action(chat_id, ChatAction.TYPING)
    msg = await update.message.reply_text("…")  # placeholder que vamos editando (streaming)

    acumulado = ""
    ultimo_edit = 0.0
    ultimo_len = 0
    async for chunk in gemini.responder_stream(historial, texto_usuario, SYSTEM_PROMPT):
        acumulado += chunk
        ahora = time.monotonic()
        # refrescamos el mensaje ~1/seg para que se vea "escribiéndose" sin chocar rate limits
        if len(acumulado) - ultimo_len >= 12 and ahora - ultimo_edit >= Config.STREAM_THROTTLE_SECS:
            try:
                await msg.edit_text(acumulado)
            except Exception:
                pass
            ultimo_edit, ultimo_len = ahora, len(acumulado)

    acumulado = acumulado.strip() or "Perdón, no te llegué a responder bien. ¿Me lo repetís? 🙏"

    if con_voz:
        await context.bot.send_chat_action(chat_id, ChatAction.RECORD_VOICE)
        try:
            ogg = await gemini.sintetizar_voz(acumulado)
            await update.message.reply_voice(ogg)
        except Exception:
            pass  # si falla la voz, dejamos igual el texto

    try:
        await msg.edit_text(acumulado)  # edición final con la respuesta completa
    except Exception:
        pass

    _memoria[chat_id].append(("user", texto_usuario))
    _memoria[chat_id].append(("model", acumulado))


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _responder(update, context, update.message.text, con_voz=False)


async def on_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    await context.bot.send_chat_action(chat_id, ChatAction.TYPING)
    archivo = await update.message.voice.get_file()
    audio = bytes(await archivo.download_as_bytearray())
    texto = await gemini.transcribir(audio, "audio/ogg")
    if not texto:
        await update.message.reply_text(
            "No te llegué a entender el audio 🙈 ¿Me lo escribís o me lo mandás de nuevo?"
        )
        return
    # espejamos la modalidad: si te mandan audio, respondemos con voz
    await _responder(update, context, texto, con_voz=Config.VOICE_REPLY_MIRROR)


def main() -> None:
    faltan = validar()
    if faltan:
        raise SystemExit(f"Faltan variables en el .env del cliente: {', '.join(faltan)}")
    app = Application.builder().token(Config.TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", on_start))
    app.add_handler(MessageHandler(filters.VOICE, on_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    print("Cata corriendo (polling). Ctrl+C para frenar.")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
