import asyncio
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from ws_manager import manager
from avatar_pipeline import AvatarPipeline
from liveportrait_engine import LivePortraitEngine
from musetalk_engine import MuseTalkEngine
from webrtc_manager import webrtc_manager
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

# Pre-loaded shared engines (loaded once at startup, shared across sessions)
live_portrait_engine: LivePortraitEngine = None
musetalk_engine: MuseTalkEngine = None

# Active pipelines per session
pipelines: dict[str, AvatarPipeline] = {}


@app.on_event("startup")
async def startup():
    global live_portrait_engine, musetalk_engine

    print("[Server] Loading avatar engines (this takes ~30s on first start)...")

    # Load LivePortrait (head/eye/expression animation)
    try:
        live_portrait_engine = LivePortraitEngine()
        print("[Server] LivePortrait loaded successfully.")
    except Exception as e:
        print(f"[Server] Warning: LivePortrait failed to load: {e}")

    # Load MuseTalk (lip-sync)
    try:
        musetalk_engine = MuseTalkEngine()
        print("[Server] MuseTalk loaded successfully.")
    except Exception as e:
        print(f"[Server] Warning: MuseTalk failed to load: {e}")

    print("[Server] Avatar engines ready. Server fully started.")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "humania",
        "gpu": "cuda:0",
        "model": settings.gemini_model,
        "live_portrait": live_portrait_engine is not None and live_portrait_engine.ready,
        "musetalk": musetalk_engine is not None and musetalk_engine.ready,
        "webrtc": True,
    }


@app.get("/api/config")
async def get_config():
    config = CompanionConfig()
    return config.dict()


# ============ WebRTC Endpoints ============

@app.post("/api/webrtc/offer")
async def webrtc_offer(offer_data: dict):
    """Handle WebRTC offer and return answer."""
    session_id = str(uuid.uuid4())

    try:
        answer = await webrtc_manager.handle_offer(session_id, offer_data)
        return {
            "session_id": session_id,
            "answer": answer,
        }
    except Exception as e:
        print(f"[WebRTC] Error handling offer: {e}")
        return {"error": str(e)}


@app.post("/api/webrtc/source-image/{session_id}")
async def set_source_image(session_id: str, image_data: dict):
    """Set the source avatar image for WebRTC streaming."""
    try:
        await webrtc_manager.set_source_image(session_id, image_data["image"])
        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}


@app.websocket("/ws/companion")
async def companion_websocket(websocket: WebSocket):
    session_id = str(uuid.uuid4())
    pipeline = AvatarPipeline(
        session_id,
        live_portrait_engine,
        musetalk_engine,
    )

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

                elif "setSourceImage" in data:
                    await pipeline.set_source_image(data["setSourceImage"])
                    # Also set for WebRTC if session exists
                    if session_id in webrtc_manager.video_tracks:
                        await webrtc_manager.set_source_image(session_id, data["setSourceImage"])

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
        webrtc_manager.cleanup(session_id)
        if session_id in pipelines:
            del pipelines[session_id]


@app.get("/api/sessions")
async def list_sessions():
    return {
        "active": len(pipelines),
        "sessions": list(pipelines.keys())
    }


@app.on_event("shutdown")
async def shutdown():
    await webrtc_manager.close_all()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
