import asyncio
import base64
import io
import math
import time
from typing import AsyncGenerator

import numpy as np
from PIL import Image


class ProceduralIdleEngine:
    """
    Procedural idle animation engine.
    Generates natural breathing, blinking, and subtle head movements.
    """

    def __init__(self, fps: int = 25):
        self.fps = fps
        self.frame_duration = 1.0 / fps
        self.start_time = time.time()

    def _encode_frame(self, frame_array: np.ndarray) -> str:
        """Encode numpy image (HWC uint8) to base64 JPEG."""
        img = Image.fromarray(frame_array)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def _get_breathing_offset(self, t: float) -> float:
        """Generate subtle breathing motion (vertical oscillation)."""
        # Breathing cycle: ~4 seconds
        breath_cycle = 4.0
        breath_amount = 2.0  # pixels
        return breath_amount * math.sin(2 * math.pi * t / breath_cycle)

    def _get_blink_state(self, t: float) -> float:
        """Generate natural blinking pattern."""
        # Blink every 3-6 seconds (randomized)
        blink_interval = 4.0 + 1.0 * math.sin(t * 0.7)
        blink_phase = t % blink_interval

        # Blink duration: ~150ms
        blink_duration = 0.15

        if blink_phase < blink_duration:
            # Opening/closing animation
            progress = blink_phase / blink_duration
            if progress < 0.5:
                # Closing
                return progress * 2
            else:
                # Opening
                return (1 - progress) * 2
        return 0.0

    def _get_head_sway(self, t: float) -> dict:
        """Generate subtle natural head movements."""
        # Slow sway (different frequencies for each axis)
        sway_yaw = 1.5 * math.sin(2 * math.pi * t / 7.0)  # ~7s cycle
        sway_pitch = 0.8 * math.sin(2 * math.pi * t / 5.0 + 0.5)  # ~5s cycle
        sway_roll = 0.3 * math.sin(2 * math.pi * t / 9.0 + 1.0)  # ~9s cycle

        return {
            'yaw': sway_yaw,
            'pitch': sway_pitch,
            'roll': sway_roll,
        }

    def _get_eye_gaze(self, t: float) -> dict:
        """Generate subtle eye movement."""
        # Slow eye drift
        gaze_x = 0.5 * math.sin(2 * math.pi * t / 6.0)
        gaze_y = 0.3 * math.sin(2 * math.pi * t / 4.5 + 0.3)

        return {
            'x': gaze_x,
            'y': gaze_y,
        }

    def generate_idle_frame(self, source_image: np.ndarray) -> dict:
        """Generate idle animation parameters for current frame."""
        t = time.time() - self.start_time

        breathing = self._get_breathing_offset(t)
        blink = self._get_blink_state(t)
        head_sway = self._get_head_sway(t)
        eye_gaze = self._get_eye_gaze(t)

        return {
            'breathing_offset': breathing,
            'blink_ratio': blink,
            'head_yaw': head_sway['yaw'],
            'head_pitch': head_sway['pitch'],
            'head_roll': head_sway['roll'],
            'eye_gaze_x': eye_gaze['x'],
            'eye_gaze_y': eye_gaze['y'],
            'timestamp': t,
        }

    async def generate_stream(
        self,
        source_image: np.ndarray,
    ) -> AsyncGenerator[dict, None]:
        """Stream idle animation parameters."""
        while True:
            params = self.generate_idle_frame(source_image)
            yield params
            await asyncio.sleep(self.frame_duration)

    def apply_idle_to_frame(
        self,
        frame: np.ndarray,
        idle_params: dict,
    ) -> np.ndarray:
        """Apply idle animation parameters to a frame."""
        # This would apply the idle motion to the frame
        # For now, just return the original frame
        # In production, this would use the LivePortrait warping module
        return frame
