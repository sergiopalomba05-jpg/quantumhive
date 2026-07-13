import asyncio
import time
from typing import Optional

from gemini_handler import GeminiLiveHandler
from lip_sync import LatentSyncEngine
from ws_manager import manager


class AvatarPipeline:
    """
    Orchestrates the avatar pipeline:
    User Audio → Gemini Live API → LatentSync → Avatar Frames + Audio

    The lip_sync engine is shared (pre-loaded at server startup).
    """

    def __init__(self, session_id: str, lip_sync: LatentSyncEngine, system_prompt: str = ""):
        self.session_id = session_id
        self.gemini = GeminiLiveHandler(system_prompt=system_prompt)
        self.lip_sync = lip_sync
        self.is_running = False
        self.start_time: Optional[float] = None

    async def start(self):
        print(f"[Pipeline] Starting session: {self.session_id}")
        self.start_time = time.time()

        try:
            await self.gemini.connect()
            self.is_running = True
            print(f"[Pipeline] Session started: {self.session_id}")
        except Exception as e:
            print(f"[Pipeline] Error starting: {e}")
            raise

    async def process_audio(self, audio_data: str):
        if not self.is_running:
            return
        try:
            await self.gemini.send_audio(audio_data)
        except Exception as e:
            print(f"[Pipeline] Error processing audio: {e}")

    async def _generate_frames_from_audio(self, audio_b64: str):
        try:
            import base64
            audio_bytes = base64.b64decode(audio_b64)

            async def audio_gen():
                yield audio_bytes

            async for frame_b64 in self.lip_sync.generate_stream(audio_gen()):
                if not manager.is_connected(self.session_id):
                    break
                await manager.send_json(self.session_id, {"frame": frame_b64})

        except Exception as e:
            print(f"[Pipeline] Lip sync error: {e}")

    async def run(self):
        if not self.is_running:
            return

        try:
            async for message in self.gemini.receive_messages():
                if not manager.is_connected(self.session_id):
                    break

                msg_type = message.get("type")
                msg_data = message.get("data")

                if msg_type == "audio":
                    await manager.send_json(self.session_id, {"audio": msg_data})
                    asyncio.create_task(self._generate_frames_from_audio(msg_data))

                elif msg_type == "text":
                    await manager.send_json(self.session_id, {"text": msg_data})

                elif msg_type == "turn_complete":
                    await manager.send_json(self.session_id, {"turnComplete": True})

        except Exception as e:
            print(f"[Pipeline] Error in run loop: {e}")
        finally:
            await self.stop()

    async def stop(self):
        self.is_running = False
        await self.gemini.close()

        duration = time.time() - self.start_time if self.start_time else 0
        print(f"[Pipeline] Session ended: {self.session_id} ({duration:.1f}s)")

    def get_duration(self) -> int:
        if self.start_time:
            return int(time.time() - self.start_time)
        return 0
