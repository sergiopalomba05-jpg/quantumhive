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

LATENTSYNC_PATH = os.environ.get("LATENTSYNC_PATH", "D:\\humania-lip")

if LATENTSYNC_PATH not in sys.path:
    sys.path.insert(0, LATENTSYNC_PATH)


class LatentSyncEngine:
    """
    LatentSync 1.6 lip-sync engine for real-time streaming.
    Models are loaded ONCE at server startup, not per-connection.
    """

    def __init__(
        self,
        avatar_image_path: str,
        num_frames: int = 16,
        inference_steps: int = 10,
        guidance_scale: float = 1.5,
        device: str = "cuda",
    ):
        self.avatar_image_path = avatar_image_path
        self.num_frames = num_frames
        self.inference_steps = inference_steps
        self.guidance_scale = guidance_scale
        self.device = device
        self.ready = False

        self.audio_encoder = None
        self.vae = None
        self.unet = None
        self.scheduler = None
        self.image_processor = None
        self.mask_image = None

        self._load_models()

    def _load_models(self):
        """Load all models into GPU memory once."""
        from omegaconf import OmegaConf
        from diffusers import AutoencoderKL, DDIMScheduler
        from latentsync.models.unet import UNet3DConditionModel
        from latentsync.whisper.audio2feature import Audio2Feature
        from latentsync.utils.image_processor import ImageProcessor, load_fixed_mask

        config_path = os.path.join(LATENTSYNC_PATH, "configs", "unet", "stage2_512.yaml")
        config = OmegaConf.load(config_path)

        print("[LatentSync] Loading Whisper tiny...")
        self.audio_encoder = Audio2Feature(
            model_path=os.path.join(LATENTSYNC_PATH, "checkpoints", "whisper", "tiny.pt"),
            device=self.device,
            num_frames=config.data.num_frames,
            audio_feat_length=config.data.audio_feat_length,
        )

        print("[LatentSync] Loading VAE...")
        dtype = torch.float16 if torch.cuda.get_device_capability()[0] > 7 else torch.float32
        self.vae = AutoencoderKL.from_pretrained(
            "stabilityai/sd-vae-ft-mse", torch_dtype=dtype
        )
        self.vae.config.scaling_factor = 0.18215
        self.vae.config.shift_factor = 0
        self.vae = self.vae.to(self.device)

        print("[LatentSync] Loading UNet 1.3B...")
        self.unet, _ = UNet3DConditionModel.from_pretrained(
            OmegaConf.to_container(config.model),
            os.path.join(LATENTSYNC_PATH, "checkpoints", "latentsync_unet.pt"),
            device="cpu",
        )
        self.unet = self.unet.to(dtype=dtype).to(self.device)

        self.scheduler = DDIMScheduler.from_pretrained(
            os.path.join(LATENTSYNC_PATH, "configs")
        )

        self.height = config.data.resolution
        self.width = config.data.resolution
        mask_path = config.data.get("mask_image_path", "latentsync/utils/mask.png")
        self.mask_image = load_fixed_mask(self.height, os.path.join(LATENTSYNC_PATH, mask_path))

        self.weight_dtype = dtype
        self.image_processor = ImageProcessor(
            self.height, device=self.device, mask_image=self.mask_image
        )

        self.ready = True
        alloc = torch.cuda.memory_allocated() / 1024**3
        print(f"[LatentSync] All models loaded. GPU: {alloc:.1f}GB")

    def _encode_frame(self, frame_array: np.ndarray) -> str:
        """Encode numpy image (HWC uint8) to base64 JPEG."""
        img = Image.fromarray(frame_array)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def _generate_chunk(
        self,
        reference_face: torch.Tensor,
        audio_features: list,
    ) -> list:
        with torch.no_grad():
            self.unet.eval()

            self.scheduler.set_timesteps(self.inference_steps, device=self.device)
            timesteps = self.scheduler.timesteps

            audio_embeds = torch.stack(audio_features).to(
                self.device, dtype=self.weight_dtype
            )

            ref_pixel_values, masked_pixel_values, masks = (
                self.image_processor.prepare_masks_and_masked_images(
                    [reference_face] * len(audio_features),
                    affine_transform=False,
                )
            )

            mask_latents, masked_image_latents = self._prepare_mask_latents(
                masks, masked_pixel_values
            )
            ref_latents = self._prepare_image_latents(ref_pixel_values)

            num_channels = self.vae.config.latent_channels
            h = self.height // (2 ** (len(self.vae.config.block_out_channels) - 1))
            w = self.width // (2 ** (len(self.vae.config.block_out_channels) - 1))
            shape = (1, num_channels, 1, h, w)
            latents = torch.randn(shape, device=self.device, dtype=self.weight_dtype)
            latents = latents.repeat(1, 1, len(audio_features), 1, 1)
            latents = latents * self.scheduler.init_noise_sigma

            for t in timesteps:
                unet_input = torch.cat([latents] * 2)
                unet_input = self.scheduler.scale_model_input(unet_input, t)
                unet_input = torch.cat(
                    [unet_input, mask_latents, masked_image_latents, ref_latents], dim=1
                )

                audio_batch = torch.cat([torch.zeros_like(audio_embeds), audio_embeds])
                noise_pred = self.unet(
                    unet_input, t, encoder_hidden_states=audio_batch
                ).sample

                n, c = noise_pred.chunk(2)
                noise_pred = n + self.guidance_scale * (c - n)
                latents = self.scheduler.step(noise_pred, t, latents).prev_sample

            decoded = self.decode_latents(latents)
            decoded = self._paste_back(decoded, ref_pixel_values, masks)

            from einops import rearrange
            frames = rearrange(decoded, "f c h w -> f h w c")
            frames = (frames / 2 + 0.5).clamp(0, 1)
            frames = (frames * 255).to(torch.uint8).cpu().numpy()
            return [frames[i] for i in range(frames.shape[0])]

    def _prepare_mask_latents(self, masks, masked_pixel_values):
        from einops import rearrange

        h = self.height // (2 ** (len(self.vae.config.block_out_channels) - 1))
        w = self.width // (2 ** (len(self.vae.config.block_out_channels) - 1))

        masks_resized = torch.nn.functional.interpolate(
            masks, size=(h, w)
        ).to(device=self.device, dtype=self.weight_dtype)

        masked_pixel_values = masked_pixel_values.to(
            device=self.device, dtype=self.weight_dtype
        )
        masked_latents = self.vae.encode(masked_pixel_values).latent_dist.sample()
        masked_latents = (
            masked_latents - self.vae.config.shift_factor
        ) * self.vae.config.scaling_factor
        masked_latents = masked_latents.to(device=self.device, dtype=self.weight_dtype)

        masks_resized = rearrange(masks_resized, "f c h w -> 1 c f h w")
        masked_latents = rearrange(masked_latents, "f c h w -> 1 c f h w")

        masks_resized = torch.cat([masks_resized] * 2)
        masked_latents = torch.cat([masked_latents] * 2)

        return masks_resized, masked_latents

    def _prepare_image_latents(self, images):
        from einops import rearrange

        images = images.to(device=self.device, dtype=self.weight_dtype)
        latents = self.vae.encode(images).latent_dist.sample()
        latents = (latents - self.vae.config.shift_factor) * self.vae.config.scaling_factor
        latents = rearrange(latents, "f c h w -> 1 c f h w")
        latents = torch.cat([latents] * 2)
        return latents

    def decode_latents(self, latents):
        from einops import rearrange

        latents = latents / self.vae.config.scaling_factor + self.vae.config.shift_factor
        latents = rearrange(latents, "b c f h w -> (b f) c h w")
        decoded = self.vae.decode(latents).sample
        return decoded

    def _paste_back(self, decoded, ref_pixel_values, masks):
        ref_pixel_values = ref_pixel_values.to(
            device=self.device, dtype=self.weight_dtype
        )
        masks_inv = (1 - masks).to(device=self.device, dtype=self.weight_dtype)
        result = decoded * masks + ref_pixel_values * masks_inv
        return result

    async def generate_stream(
        self, audio_stream: AsyncGenerator[bytes, None]
    ) -> AsyncGenerator[str, None]:
        """Stream lip-synced frames from audio chunks."""
        import soundfile as sf

        reference_image = Image.open(self.avatar_image_path).resize(
            (self.width, self.height)
        )
        ref_tensor = torch.tensor(np.array(reference_image)).permute(2, 0, 1).float() / 127.5 - 1

        audio_buffer = bytearray()
        chunk_size = 1600 * 2 * self.num_frames

        async for audio_chunk in audio_stream:
            audio_buffer.extend(audio_chunk)

            while len(audio_buffer) >= chunk_size:
                raw = bytes(audio_buffer[:chunk_size])
                audio_buffer = audio_buffer[chunk_size:]

                audio_np = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

                tmp_wav = "D:\\humania-lip\\tmp_chunk.wav"
                sf.write(tmp_wav, audio_np, 16000)

                feature = self.audio_encoder.audio2feat(tmp_wav)
                chunks = self.audio_encoder.feature2chunks(
                    feature_array=feature, fps=25
                )

                if chunks:
                    frames = self._generate_chunk(ref_tensor, chunks)
                    for frame in frames:
                        yield self._encode_frame(frame)

                try:
                    os.remove(tmp_wav)
                except OSError:
                    pass
