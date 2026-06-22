#!/usr/bin/env python3
"""Fallback: analiza un video corto con Gemini (lo VE y lo ESCUCHA) y devuelve JSON
estructurado para catalogar. Usalo solo si Hermes no le pasa el video a su cerebro Gemini
de forma nativa. Solo stdlib.

Requiere en el entorno: GEMINI_API_KEY (o GOOGLE_API_KEY).
Modelo: gemini-2.5-pro (configurable con GEMINI_INGESTA_MODEL).
Manda el video inline en base64 → sirve para reels < ~18 MB (el Bot API de Telegram ya
limita a 20 MB). Para videos más grandes habría que usar la Files API (no incluido acá).

Uso:  python analizar_video.py <ruta_video>
"""
import os, sys, json, base64, mimetypes, urllib.request, urllib.error

KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
MODEL = os.environ.get("GEMINI_INGESTA_MODEL", "gemini-2.5-pro")
BASE = "https://generativelanguage.googleapis.com/v1beta"

PROMPT = (
    "Sos el catalogador de QuantumHive. Mirá y escuchá este reel de una herramienta de IA "
    "y devolvé SOLO un objeto JSON (sin texto extra) con estas claves: "
    "nombre, repo_url (o web oficial; null si no estás seguro), para_que (1-2 frases), "
    "categoria, estado ('usar'|'alternativa'|'verificar'), tags (lista de strings). "
    "No inventes URLs ni datos."
)


def main():
    if not KEY:
        sys.exit("ERROR: falta GEMINI_API_KEY / GOOGLE_API_KEY en el entorno.")
    if len(sys.argv) < 2:
        sys.exit("Uso: python analizar_video.py <ruta_video>")
    ruta = sys.argv[1]
    with open(ruta, "rb") as f:
        data = f.read()
    mime = mimetypes.guess_type(ruta)[0] or "video/mp4"
    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": mime, "data": base64.b64encode(data).decode("ascii")}},
                {"text": PROMPT},
            ]
        }],
        "generationConfig": {"response_mime_type": "application/json"},
    }
    url = f"{BASE}/models/{MODEL}:generateContent?key={KEY}"
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            resp = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR Gemini {e.code}: {e.read().decode('utf-8')}")
    try:
        text = resp["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        sys.exit("ERROR: respuesta inesperada de Gemini:\n" + json.dumps(resp, ensure_ascii=False))
    print(text)  # ya es JSON (response_mime_type=application/json)


if __name__ == "__main__":
    main()
