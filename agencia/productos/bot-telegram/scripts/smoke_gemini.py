"""Spike manual: valida la key de Gemini y la forma del SDK antes de construir.
Uso: cd agencia/productos/bot-telegram && .venv/Scripts/python.exe scripts/smoke_gemini.py
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google import genai
from google.genai import types
from config import Config


def main() -> None:
    if not Config.GEMINI_API_KEY:
        raise SystemExit("Falta GEMINI_API_KEY en el .env del cliente.")
    client = genai.Client(api_key=Config.GEMINI_API_KEY)

    print("== Modelos que soportan generateContent (chat) ==")
    for m in client.models.list():
        acts = getattr(m, "supported_actions", None) or []
        if "generateContent" in acts or not acts:
            print("  ", m.name, "|", acts)

    print("\n== Streaming de texto con MODEL_CHAT =", Config.MODEL_CHAT, "==")
    try:
        for chunk in client.models.generate_content_stream(
            model=Config.MODEL_CHAT,
            contents="Saludá en una sola línea, cálido y en voseo argentino, como Cata Home.",
        ):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        print("\n[OK texto]")
    except Exception as e:
        print("[FALLO texto]", type(e).__name__, e)

    print("\n== TTS con MODEL_TTS =", Config.MODEL_TTS, "voz =", Config.TTS_VOICE, "==")
    try:
        resp = client.models.generate_content(
            model=Config.MODEL_TTS,
            contents="Hola, soy Cata de Cata Home. ¿En qué te doy una mano?",
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=Config.TTS_VOICE)
                    )
                ),
            ),
        )
        pcm = resp.candidates[0].content.parts[0].inline_data.data
        Path("smoke_tts.pcm").write_bytes(pcm)
        print(f"[OK TTS] {len(pcm)} bytes PCM -> smoke_tts.pcm")
    except Exception as e:
        print("[FALLO TTS]", type(e).__name__, e)


if __name__ == "__main__":
    main()
