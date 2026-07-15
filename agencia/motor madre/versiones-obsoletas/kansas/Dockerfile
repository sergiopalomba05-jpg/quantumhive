FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema:
#   curl            → healthcheck manual
#   ca-certificates → https a la API de MiniMax (voz) y Supabase (caché de voz)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HuggingFace Spaces escucha en 7860
EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
