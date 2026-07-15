import asyncio
import base64
import time
from typing import AsyncGenerator, Optional

from gemini_handler import GeminiLiveHandler
from liveportrait_engine import LivePortraitEngine
from musetalk_engine import MuseTalkEngine
from procedural_idle import ProceduralIdleEngine
from ws_manager import manager


class AvatarPipeline:
    """
    Composited avatar pipeline:
    User Audio → Gemini Live API → [LivePortrait + MuseTalk + Procedural] → Avatar Frames + Audio

    - LivePortrait: Head pose, eye gaze, facial expressions
    - MuseTalk: Lip synchronization
    - Procedural: Idle animations (breathing, blinking, subtle movement)
    """

    def __init__(
        self,
        session_id: str,
        live_portrait: LivePortraitEngine,
        musetalk: MuseTalkEngine,
        system_prompt: str = "",
    ):
        self.session_id = session_id
        self.gemini = GeminiLiveHandler(system_prompt=system_prompt)
        self.live_portrait = live_portrait
        self.musetalk = musetalk
        self.idle_engine = ProceduralIdleEngine()
        self.is_running = False
        self.start_time: Optional[float] = None
        self.source_image = None
        self.source_motion = None

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

    async def set_source_image(self, image_data: str):
        """Set the source avatar image for animation."""
        import cv2
        import numpy as np
        from PIL import Image
        import io

        # Decode base64 image
        img_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_bytes))
        img_array = np.array(img)

        # Convert to BGR for OpenCV if needed
        if img_array.shape[2] == 4:  # RGBA
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
        elif img_array.shape[2] == 3:  # RGB
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        self.source_image = img_array

        # Extract source motion
        if self.live_portrait and self.live_portrait.ready:
            self.source_motion = self.live_portrait.extract_motion(img_array)

        print(f"[Pipeline] Source image set for session: {self.session_id}")

    async def process_audio(self, audio_data: str):
        if not self.is_running:
            return
        try:
            await self.gemini.send_audio(audio_data)
        except Exception as e:
            print(f"[Pipeline] Error processing audio: {e}")

    async def _generate_frames_from_audio(self, audio_b64: str):
        """Generate animated frames from audio using composited approach."""
        try:
            import base64
            audio_bytes = base64.b64decode(audio_b64)

            # Create audio stream
            async def audio_gen():
                yield audio_bytes

            # Generate lip-synced frames from MuseTalk
            if self.musetalk and self.musetalk.ready and self.source_image is not None:
                async for frame_b64 in self.musetalk.generate_stream(
                    self.source_image,
                    audio_gen()
                ):
                    if not manager.is_connected(self.session_id):
                        break
                    await manager.send_json(self.session_id, {"frame": frame_b64})

            # If MuseTalk not available, use idle animation
            elif self.source_image is not None:
                idle_params = self.idle_engine.generate_idle_frame(self.source_image)
                frame = self.idle_engine.apply_idle_to_frame(self.source_image, idle_params)
                frame_b64 = self._encode_frame(frame)
                await manager.send_json(self.session_id, {"frame": frame_b64})

        except Exception as e:
            print(f"[Pipeline] Frame generation error: {e}")

    def _encode_frame(self, frame_array):
        """Encode numpy frame to base64 JPEG."""
        import io
        from PIL import Image

        img = Image.fromarray(frame_array)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

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
                    # Send audio to client
                    await manager.send_json(self.session_id, {"audio": msg_data})

                    # Generate animated frames from audio
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
