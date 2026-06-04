FROM python:3.11-slim

# ffmpeg: convert Gemini TTS audio (WAV/PCM) → OGG/Opus for Telegram sendVoice
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY agencia/bots/yas-papeo/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the bot directory (not the whole monorepo)
COPY agencia/bots/yas-papeo/ .

# Cloud Run injects PORT=8080; honour it
ENV PORT=8080
EXPOSE 8080

CMD ["python", "app.py"]
