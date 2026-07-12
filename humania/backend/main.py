import asyncio
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from ws_manager import manager
from avatar_pipeline import AvatarPipeline
from models import CompanionConfig

settings = get_settings()

app = FastAPI(title="Humania — Acompañante Virtual")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active pipelines per session
pipelines: dict[str, AvatarPipeline] = {}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "humania",
        "gpu": "cuda:0",
        "model": settings.gemini_model,
    }


@app.get("/api/config")
async def get_config():
    """Get companion configuration."""
    config = CompanionConfig()
    return config.dict()


@app.websocket("/ws/companion")
async def companion_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for the companion avatar.
    
    Protocol:
    - Client sends: {"audio": "base64..."} or {"text": "..."}
    - Server sends: {"audio": "...", "frame": "...", "text": "...", "turnComplete": true}
    """
    session_id = str(uuid.uuid4())
    pipeline = AvatarPipeline(session_id)

    try:
        await manager.connect(websocket, session_id)
        await pipeline.start()
        pipelines[session_id] = pipeline

        # Notify client connection is ready
        await manager.send_json(session_id, {
            "connected": True,
            "session_id": session_id
        })

        # Start pipeline run loop
        run_task = asyncio.create_task(pipeline.run())

        # Handle incoming messages from client
        while True:
            try:
                data = await websocket.receive_json()

                if "audio" in data:
                    await pipeline.process_audio(data["audio"])

                elif "text" in data:
                    # Convert text to audio via Gemini
                    await pipeline.gemini.send_text(data["text"])

                elif "ping" in data:
                    await manager.send_json(session_id, {"pong": True})

            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"[WS] Error receiving: {e}")
                break

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {session_id}")
    except Exception as e:
        print(f"[WS] Error: {e}")
    finally:
        await pipeline.stop()
        manager.disconnect(session_id)
        if session_id in pipelines:
            del pipelines[session_id]


@app.get("/api/sessions")
async def list_sessions():
    """List active sessions."""
    return {
        "active": len(pipelines),
        "sessions": list(pipelines.keys())
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
