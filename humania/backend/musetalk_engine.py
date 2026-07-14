import asyncio
import base64
import io
import os
import sys
import time
from typing import AsyncGenerator, Optional

import numpy as np
import torch
from PIL import Image

MSETALK_PATH = os.environ.get("MSETALK_PATH", "D:\\MuseTalk")

if MSETALK_PATH not in sys.path:
    sys.path.insert(0, MSETALK_PATH)


class MuseTalkEngine:
    """
    MuseTalk 1.5 lip-sync engine for real-time streaming.
    Models are loaded ONCE at server startup, not per-connection.
    """

    def __init__(
        self,
        model_path: str = None,
        device: str = "cuda",
    ):
        self.model_path = model_path or os.path.join(MSETALK_PATH, "models")
        self.device = device
        self.ready = False

        self.unet = None
        self.vae = None
        self.pe = None
        self.audio_processor = None

        self._load_models()

    def _load_models(self):
        """Load all models into GPU memory once."""
        from musetalk.models.vae import VAE
        from musetalk.models.unet import UNet, PositionalEncoding
        from musetalk.utils.audio_processor import AudioProcessor

        print("[MuseTalk] Loading models...")

        models_base = os.path.join(MSETALK_PATH, "models")

        # Load VAE with absolute path
        vae_path = os.path.join(models_base, "sd-vae")
        print(f"[MuseTalk] Loading VAE from {vae_path}")
        self.vae = VAE(model_path=vae_path, use_float16=True)

        # Load UNet with absolute paths
        unet_model_path = os.path.join(models_base, "musetalkV15", "unet.pth")
        unet_config = os.path.join(models_base, "musetalkV15", "musetalk.json")
        print(f"[MuseTalk] Loading UNet from {unet_model_path}")
        self.unet = UNet(
            unet_config=unet_config,
            model_path=unet_model_path,
            device=self.device,
        )

        # Load PositionalEncoding
        self.pe = PositionalEncoding(d_model=384)

        # Load Audio Processor (Whisper)
        self.audio_processor = AudioProcessor(
            feature_extractor_path="openai/whisper-tiny",
        )

        self.ready = True
        alloc = torch.cuda.memory_allocated() / 1024**3
        print(f"[MuseTalk] All models loaded. GPU: {alloc:.1f}GB")

    def _encode_frame(self, frame_array: np.ndarray) -> str:
        """Encode numpy image (HWC uint8) to base64 JPEG."""
        img = Image.fromarray(frame_array)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def _prepare_reference(self, reference_image: np.ndarray) -> torch.Tensor:
        """Prepare reference image for MuseTalk."""
        import cv2

        # Resize to 256x256
        img = cv2.resize(reference_image, (256, 256))
        img = img.astype(np.float32) / 255.0
        img = torch.from_numpy(img).permute(2, 0, 1).unsqueeze(0)
        return img.to(self.device, dtype=torch.float16)

    async def generate_stream(
        self,
        reference_image: np.ndarray,
        audio_stream: AsyncGenerator[bytes, None],
    ) -> AsyncGenerator[str, None]:
        """Stream lip-synced frames from audio chunks."""
        import soundfile as sf
        from musetalk.utils.utils import datagen

        # Prepare reference
        ref_tensor = self._prepare_reference(reference_image)

        audio_buffer = bytearray()
        chunk_size = 1600 * 2 * 32  # 32 frames at 16kHz

        async for audio_chunk in audio_stream:
            audio_buffer.extend(audio_chunk)

            while len(audio_buffer) >= chunk_size:
                raw = bytes(audio_buffer[:chunk_size])
                audio_buffer = audio_buffer[chunk_size:]

                # Convert audio to features
                audio_np = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

                # Save temp wav for whisper
                tmp_wav = os.path.join(MSETALK_PATH, "tmp_chunk.wav")
                sf.write(tmp_wav, audio_np, 16000)

                # Extract audio features using MuseTalk's audio processor
                whisper_chunks = self.audio_processor.audio2chunk(
                    tmp_wav, "tiny", 32
                )

                # Generate using datagen
                if whisper_chunks is not None and len(whisper_chunks) > 0:
                    # Create a simple latents batch for reference
                    with torch.no_grad():
                        vae_latent = self.vae.encode(ref_tensor)

                    # Generate lip-synced frame
                    for whisper_chunk, latent in datagen(
                        whisper_chunks,
                        [vae_latent] * len(whisper_chunks),
                        batch_size=1,
                        device=self.device,
                    ):
                        with torch.no_grad():
                            # UNet inference
                            result = self.unet(
                                latent,
                                whisper_chunk,
                                self.pe,
                            )

                            # Decode
                            decoded = self.vae.decode(result)

                            # Convert to image
                            frame = decoded.squeeze(0).permute(1, 2, 0).cpu().float().numpy()
                            frame = (frame * 255).clip(0, 255).astype(np.uint8)

                            yield self._encode_frame(frame)
                            break  # Only take first frame per chunk

                try:
                    os.remove(tmp_wav)
                except OSError:
                    pass
