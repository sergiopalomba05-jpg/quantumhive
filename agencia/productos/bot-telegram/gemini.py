"""Wrappers de Gemini para el demo: chat en streaming, transcripción (STT) y voz (TTS).

Una sola key hace las tres cosas. La voz va detrás de una conversión a OGG/Opus
(con ffmpeg) para mandarla como nota de voz nativa de Telegram.
"""
from __future__ import annotations
import asyncio
import subprocess
from typing import AsyncIterator, Iterable

from google import genai
from google.genai import types

from config import Config

_client = genai.Client(api_key=Config.GEMINI_API_KEY)


def _a_contents(historial: Iterable[tuple[str, str]], mensaje: str) -> list:
    contents = []
    for rol, texto in historial:
        contents.append(
            types.Content(role="user" if rol == "user" else "model",
                          parts=[types.Part(text=texto)])
        )
    contents.append(types.Content(role="user", parts=[types.Part(text=mensaje)]))
    return contents


async def responder_stream(historial: Iterable[tuple[str, str]], mensaje: str,
                           system_prompt: str) -> AsyncIterator[str]:
    """Genera la respuesta de Cata en streaming (va llegando por pedacitos)."""
    contents = _a_contents(historial, mensaje)
    cfg = types.GenerateContentConfig(system_instruction=system_prompt, temperature=0.7)
    stream = await _client.aio.models.generate_content_stream(
        model=Config.MODEL_CHAT, contents=contents, config=cfg
    )
    async for chunk in stream:
        if chunk.text:
            yield chunk.text


async def transcribir(audio_bytes: bytes, mime: str = "audio/ogg") -> str:
    """Transcribe una nota de voz del cliente usando Gemini (multimodal)."""
    resp = await _client.aio.models.generate_content(
        model=Config.MODEL_CHAT,
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime),
            types.Part(text="Transcribí este audio al español rioplatense. "
                            "Devolvé solo el texto, sin comillas ni comentarios."),
        ],
    )
    return (resp.text or "").strip()


def _pcm_a_ogg(pcm: bytes, sample_rate: int = 24000) -> bytes:
    """Convierte PCM s16le mono a OGG/Opus con ffmpeg (requiere ffmpeg en el PATH)."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error",
         "-f", "s16le", "-ar", str(sample_rate), "-ac", "1", "-i", "pipe:0",
         "-c:a", "libopus", "-b:a", "32k", "-f", "ogg", "pipe:1"],
        input=pcm, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
    )
    return proc.stdout


async def sintetizar_voz(texto: str) -> bytes:
    """Genera una nota de voz (OGG/Opus) con la voz de Cata."""
    resp = await _client.aio.models.generate_content(
        model=Config.MODEL_TTS,
        contents=f"Decí esto con voz cálida, cercana y natural, como alguien del equipo de Cata Home: {texto}",
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
    return await asyncio.to_thread(_pcm_a_ogg, pcm)
