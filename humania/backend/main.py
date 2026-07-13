import asyncio
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from ws_manager import manager
from avatar_pipeline import AvatarPipeline
from lip_sync import LatentSyncEngine
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

# Pre-loaded shared engine (loaded once at startup, shared across sessions)
lip_sync_engine: LatentSyncEngine = None

# Active pipelines per session
pipelines: dict[str, AvatarPipeline] = {}


@app.on_event("startup")
async def startup():
    global lip_sync_engine
    print("[Server] Loading LatentSync engine (this takes ~30s on first start)...")
    lip_sync_engine = LatentSyncEngine(settings.avatar_image_path)
    print("[Server] LatentSync ready. Server fully started.")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "humania",
        "gpu": "cuda:0",
        "model": settings.gemini_model,
        "latentsync": lip_sync_engine is not None and lip_sync_engine.ready,
    }


@app.get("/api/config")
async def get_config():
    config = CompanionConfig()
    return config.dict()


@app.websocket("/ws/companion")
async def companion_websocket(websocket: WebSocket):
    session_id = str(uuid.uuid4())
    pipeline = AvatarPipeline(session_id, lip_sync_engine)

    try:
        await manager.connect(websocket, session_id)
        await pipeline.start()
        pipelines[session_id] = pipeline

        await manager.send_json(session_id, {
            "connected": True,
            "session_id": session_id
        })

        run_task = asyncio.create_task(pipeline.run())

        while True:
            try:
                data = await websocket.receive_json()

                if "audio" in data:
                    await pipeline.process_audio(data["audio"])

                elif "text" in data:
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
    return {
        "active": len(pipelines),
        "sessions": list(pipelines.keys())
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
