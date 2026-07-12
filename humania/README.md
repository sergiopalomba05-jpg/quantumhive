# HUMANIA

**Acompañante Virtual con Avatar en Tiempo Real**

Un amigo virtual que te escucha, te aconseja y te acompaña. No es un bot — es un companion con personalidad, memoria, y lip-sync en tiempo real.

## Stack

- **Cerebro + Voz:** Gemini Live API (Vertex AI)
- **Lip-sync:** Lip Forcing 1.3B (open source)
- **Backend:** FastAPI + WebSocket (Python)
- **Frontend:** PWA React
- **Memoria:** Supabase
- **Infra:** Docker + Kubernetes (GCP)

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- NVIDIA GPU with CUDA 12.8+

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Create .env
echo GEMINI_API_KEY=tu_api_key > .env

# Run server
uvicorn main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker-compose up
```

## Architecture

```
Usuario → WebSocket → FastAPI → Gemini Live API
                               ↓
                         Lip Forcing → Frames
                               ↓
                         WebSocket → Canvas
```

## Project Structure

```
humania/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── config.py            # Settings
│   ├── gemini_handler.py    # Gemini Live API
│   ├── lip_sync.py          # Lip Forcing engine
│   ├── avatar_pipeline.py   # Orchestrator
│   └── ws_manager.py        # WebSocket manager
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── hooks/
├── config/
├── k8s/
└── Dockerfile
```

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_key
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_LOCATION=us-central1
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## License

Proprietary — All rights reserved.
