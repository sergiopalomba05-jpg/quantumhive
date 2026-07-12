import asyncio
import time
from typing import Optional
from gemini_handler import GeminiLiveHandler
from lip_sync import LipSyncEngine
from ws_manager import manager
from config import get_settings

settings = get_settings()


class AvatarPipeline:
    """
    Orchestrates the avatar pipeline:
    User Audio → Gemini Live API → Lip Sync Engine → Avatar Frames
    """

    def __init__(self, session_id: str, system_prompt: str = ""):
        self.session_id = session_id
        self.gemini = GeminiLiveHandler(system_prompt=system_prompt)
        self.lip_sync = LipSyncEngine(settings.avatar_image_path)
        self.is_running = False
        self.start_time: Optional[float] = None

    async def start(self):
        """Start the avatar pipeline."""
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
        """
        Process incoming audio from user.
        
        Args:
            audio_data: Base64 encoded audio chunk
        """
        if not self.is_running:
            return

        try:
            # Send audio to Gemini
            await self.gemini.send_audio(audio_data)
        except Exception as e:
            print(f"[Pipeline] Error processing audio: {e}")

    async def run(self):
        """
        Main pipeline loop.
        Receives responses from Gemini and generates avatar frames.
        """
        if not self.is_running:
            return

        try:
            async for message in self.gemini.receive_messages():
                if not manager.is_connected(self.session_id):
                    break

                msg_type = message.get("type")
                msg_data = message.get("data")

                if msg_type == "audio":
                    # Send audio to client
                    await manager.send_json(self.session_id, {
                        "audio": msg_data
                    })
                    
                    # TODO: Generate avatar frame from audio
                    # For now, just send audio without video frames
                    # frame = await self.lip_sync.generate_frame(msg_data)
                    # await manager.send_json(self.session_id, {
                    #     "frame": frame
                    # })

                elif msg_type == "text":
                    # Send text transcript to client
                    await manager.send_json(self.session_id, {
                        "text": msg_data
                    })

                elif msg_type == "turn_complete":
                    # Signal turn complete
                    await manager.send_json(self.session_id, {
                        "turnComplete": True
                    })

        except Exception as e:
            print(f"[Pipeline] Error in run loop: {e}")
        finally:
            await self.stop()

    async def stop(self):
        """Stop the avatar pipeline."""
        self.is_running = False
        await self.gemini.close()
        
        duration = time.time() - self.start_time if self.start_time else 0
        print(f"[Pipeline] Session ended: {self.session_id} ({duration:.1f}s)")

    def get_duration(self) -> int:
        """Get session duration in seconds."""
        if self.start_time:
            return int(time.time() - self.start_time)
        return 0
