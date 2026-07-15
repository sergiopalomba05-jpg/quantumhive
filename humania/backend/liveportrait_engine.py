import asyncio
import base64
import io
import os
import sys
import time
from typing import AsyncGenerator, Optional

import cv2
import numpy as np
import torch
from PIL import Image

LIVEPORTRAIT_PATH = os.environ.get("LIVEPORTRAIT_PATH", "D:\\LivePortrait")

if LIVEPORTRAIT_PATH not in sys.path:
    sys.path.insert(0, LIVEPORTRAIT_PATH)


def headpose_pred_to_degree(pred):
    return pred * 180.0 / np.pi


class LivePortraitEngine:
    """
    LivePortrait engine for head pose and expression animation.
    Models are loaded ONCE at server startup, not per-connection.
    """

    def __init__(
        self,
        pretrained_weights_path: str = None,
        device: str = "cuda",
    ):
        self.pretrained_weights_path = pretrained_weights_path or os.path.join(
            LIVEPORTRAIT_PATH, "pretrained_weights"
        )
        self.device = device
        self.ready = False

        self.appearance_feature_extractor = None
        self.motion_extractor = None
        self.warping_module = None
        self.spade_generator = None
        self.stitching_retargeting_module = None

        self._load_models()

    def _load_models(self):
        import yaml
        from src.utils.helper import load_model

        print("[LivePortrait] Loading models...")

        config_path = os.path.join(LIVEPORTRAIT_PATH, "src", "config", "models.yaml")
        with open(config_path, 'r') as f:
            model_config = yaml.safe_load(f)

        self.appearance_feature_extractor = load_model(
            os.path.join(self.pretrained_weights_path, "liveportrait", "base_models", "appearance_feature_extractor.pth"),
            model_config, self.device, 'appearance_feature_extractor'
        )

        self.motion_extractor = load_model(
            os.path.join(self.pretrained_weights_path, "liveportrait", "base_models", "motion_extractor.pth"),
            model_config, self.device, 'motion_extractor'
        )

        self.warping_module = load_model(
            os.path.join(self.pretrained_weights_path, "liveportrait", "base_models", "warping_module.pth"),
            model_config, self.device, 'warping_module'
        )

        self.spade_generator = load_model(
            os.path.join(self.pretrained_weights_path, "liveportrait", "base_models", "spade_generator.pth"),
            model_config, self.device, 'spade_generator'
        )

        stitching_path = os.path.join(
            self.pretrained_weights_path, "liveportrait", "retargeting_models", "stitching_retargeting_module.pth"
        )
        if os.path.exists(stitching_path):
            self.stitching_retargeting_module = load_model(
                stitching_path, model_config, self.device, 'stitching_retargeting_module'
            )

        self.ready = True
        alloc = torch.cuda.memory_allocated() / 1024**3
        print(f"[LivePortrait] All models loaded. GPU: {alloc:.1f}GB")

    def _encode_frame(self, frame_array: np.ndarray) -> str:
        img = Image.fromarray(frame_array)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def _prepare_source(self, img: np.ndarray) -> torch.Tensor:
        h, w = img.shape[:2]
        if h != 256 or w != 256:
            x = cv2.resize(img, (256, 256))
        else:
            x = img.copy()

        x = x[np.newaxis].astype(np.float32) / 255.0
        x = np.clip(x, 0, 1)
        x = torch.from_numpy(x).permute(0, 3, 1, 2)
        x = x.to(self.device)
        return x

    def extract_motion(self, source_image: np.ndarray) -> dict:
        from src.utils.retargeting_utils import calc_eye_close_ratio, calc_lip_close_ratio

        source_tensor = self._prepare_source(source_image)

        with torch.no_grad():
            kp_info = self.motion_extractor(source_tensor)

            for k, v in kp_info.items():
                if isinstance(v, torch.Tensor):
                    kp_info[k] = v.float()

            bs = kp_info['kp'].shape[0]
            kp_info['pitch'] = headpose_pred_to_degree(kp_info['pitch'])[:, None]
            kp_info['yaw'] = headpose_pred_to_degree(kp_info['yaw'])[:, None]
            kp_info['roll'] = headpose_pred_to_degree(kp_info['roll'])[:, None]
            kp_info['kp'] = kp_info['kp'].reshape(bs, -1, 3)
            kp_info['exp'] = kp_info['exp'].reshape(bs, -1, 3)

            feature_3d = self.appearance_feature_extractor(source_tensor)

            c_eyes = calc_eye_close_ratio(kp_info['kp'])
            c_lip = calc_lip_close_ratio(kp_info['kp'])

        return {
            'kp_info': kp_info,
            'feature_3d': feature_3d,
            'c_eyes': c_eyes,
            'c_lip': c_lip,
        }

    def animate_frame(
        self,
        source_motion: dict,
        driving_pitch: float = 0.0,
        driving_yaw: float = 0.0,
        driving_roll: float = 0.0,
        eye_close_ratio: float = 0.0,
        lip_close_ratio: float = 0.0,
    ) -> np.ndarray:
        from src.utils.camera import get_rotation_matrix

        kp_info = source_motion['kp_info']
        feature_3d = source_motion['feature_3d']

        with torch.no_grad():
            driving_kp = {
                'pitch': torch.tensor([[driving_pitch]], device=self.device),
                'yaw': torch.tensor([[driving_yaw]], device=self.device),
                'roll': torch.tensor([[driving_roll]], device=self.device),
                't': kp_info['t'],
                'exp': kp_info['exp'],
                'scale': kp_info['scale'],
                'kp': kp_info['kp'],
            }

            R = get_rotation_matrix(
                driving_kp['pitch'],
                driving_kp['yaw'],
                driving_kp['roll']
            )

            kp_driving = self.warping_module(
                feature_3d,
                driving_kp['kp'],
                R,
                driving_kp['t'],
                driving_kp['scale'],
                driving_kp['exp']
            )

            generated = self.spade_generator(feature_3d, kp_driving)

            frame = generated.squeeze(0).permute(1, 2, 0).cpu().float().numpy()
            frame = (frame * 255).clip(0, 255).astype(np.uint8)

            return frame

    async def generate_stream(
        self,
        source_image: np.ndarray,
        motion_stream: AsyncGenerator[dict, None],
    ) -> AsyncGenerator[str, None]:
        source_motion = self.extract_motion(source_image)

        async for motion_params in motion_stream:
            frame = self.animate_frame(
                source_motion,
                driving_pitch=motion_params.get('pitch', 0.0),
                driving_yaw=motion_params.get('yaw', 0.0),
                driving_roll=motion_params.get('roll', 0.0),
                eye_close_ratio=motion_params.get('eye_close', 0.0),
                lip_close_ratio=motion_params.get('lip_close', 0.0),
            )

            yield self._encode_frame(frame)
