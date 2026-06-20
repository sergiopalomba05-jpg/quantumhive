FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema:
#   curl       → healthcheck manual
#   espeak-ng  → fonemización del español para el TTS (red de seguridad de Kokoro;
#                Piper bundlea el suyo)
#   ca-certificates → descargas https de los modelos de voz en el primer uso
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl espeak-ng ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HuggingFace Spaces escucha en 7860
EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
