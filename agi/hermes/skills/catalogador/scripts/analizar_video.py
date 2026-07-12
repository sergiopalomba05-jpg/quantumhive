#!/usr/bin/env python3
"""Fallback: analiza un video corto con Gemini via Vertex AI (lo VE y lo ESCUCHA) y devuelve
JSON estructurado para catalogar. Usalo solo si Hermes no le pasa el video a su cerebro
de forma nativa.

Requiere en el entorno: VERTEX_PROJECT_ID, VERTEX_LOCATION (o GOOGLE_CLOUD_PROJECT).
Autenticación: ADC de la VM de GCP (Application Default Credentials).

Modelo: gemini-2.5-pro (configurable con GEMINI_INGESTA_MODEL).
Manda el video inline en base64 → sirve para reels < ~18 MB (el Bot API de Telegram ya
limita a 20 MB). Para videos más grandes habría que usar la Files API (no incluido acá).

Uso:  python analizar_video.py <ruta_video>
"""
import os, sys, json

PROJECT = os.environ.get("VERTEX_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT", "")
LOCATION = os.environ.get("VERTEX_LOCATION", "us-central1")
MODEL = os.environ.get("GEMINI_INGESTA_MODEL", "gemini-2.5-pro")

PROMPT = (
    "Sos el catalogador de QuantumHive. Mirá y escuchá este reel de una herramienta de IA "
    "y devolvé SOLO un objeto JSON (sin texto extra) con estas claves: "
    "nombre, repo_url (o web oficial; null si no estás seguro), para_que (1-2 frases), "
    "categoria, estado ('usar'|'alternativa'|'verificar'), tags (lista de strings). "
    "No inventes URLs ni datos."
)


def main():
    if not PROJECT:
        sys.exit("ERROR: falta VERTEX_PROJECT_ID / GOOGLE_CLOUD_PROJECT en el entorno.")
    if len(sys.argv) < 2:
        sys.exit("Uso: python analizar_video.py <ruta_video>")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        sys.exit("ERROR: falta google-genai. Instalá con: pip install google-genai")

    ruta = sys.argv[1]
    with open(ruta, "rb") as f:
        data = f.read()

    import mimetypes
    mime = mimetypes.guess_type(ruta)[0] or "video/mp4"

    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

    response = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_bytes(data=data, mime_type=mime),
            PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    print(response.text)


if __name__ == "__main__":
    main()
