#!/usr/bin/env python3
"""Build the Sol V2 expressive master from a LivePortrait render.

LivePortrait writes an H.264 preview, which is not a suitable production master:
green-screen pixels are compressed and the clip may be shorter than the canonical
idle loop. This script uses the previously validated Sol V2 mask to force the
background back to exact RGB(0,255,0), builds a smooth ping-pong loop, and writes
a lossless FFV1 MKV plus a review MP4.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

import cv2
import numpy as np


GREEN_BGR = np.array([0, 255, 0], dtype=np.uint8)
TARGET_WIDTH = 720
TARGET_HEIGHT = 1280
TARGET_FPS = 25


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_mask(path: Path) -> np.ndarray:
    mask = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise RuntimeError(f"Could not read mask: {path}")
    if mask.shape != (TARGET_HEIGHT, TARGET_WIDTH):
        raise RuntimeError(f"Mask must be {TARGET_WIDTH}x{TARGET_HEIGHT}, got {mask.shape[::-1]}")
    return mask


def read_video(path: Path) -> tuple[list[np.ndarray], float]:
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or TARGET_FPS
    frames: list[np.ndarray] = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame.shape[:2] != (TARGET_HEIGHT, TARGET_WIDTH):
            frame = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT), interpolation=cv2.INTER_LANCZOS4)
        frames.append(frame)
    cap.release()

    if not frames:
        raise RuntimeError(f"No frames found in video: {path}")
    return frames, fps


def clean_frame(frame: np.ndarray, mask: np.ndarray) -> np.ndarray:
    cleaned = frame.copy()
    cleaned[mask < 8] = GREEN_BGR
    return cleaned


def ping_pong(frames: list[np.ndarray], min_seconds: float) -> list[np.ndarray]:
    if len(frames) < 2:
        raise RuntimeError("At least two frames are required for a ping-pong master")

    cycle = frames + frames[-2:0:-1]
    required = int(np.ceil(min_seconds * TARGET_FPS))
    output: list[np.ndarray] = []
    while len(output) < required:
        output.extend(cycle)
    return output[: max(required, len(cycle))]


def run_ffmpeg(ffmpeg: str, args: list[str], stdin: bytes | None = None) -> None:
    subprocess.run([ffmpeg, *args], input=stdin, check=True)


def write_ffv1(ffmpeg: str, frames: list[np.ndarray], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [
            ffmpeg,
            "-y",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "-s:v",
            f"{TARGET_WIDTH}x{TARGET_HEIGHT}",
            "-r",
            str(TARGET_FPS),
            "-i",
            "-",
            "-an",
            "-c:v",
            "ffv1",
            "-level",
            "3",
            "-pix_fmt",
            "bgr0",
            str(output),
        ],
        stdin=subprocess.PIPE,
    )
    assert proc.stdin is not None
    for frame in frames:
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    return_code = proc.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg failed with exit code {return_code}")


def write_preview(ffmpeg: str, master: Path, preview: Path) -> None:
    preview.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(
        ffmpeg,
        [
            "-y",
            "-i",
            str(master),
            "-an",
            "-c:v",
            "libx264",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(preview),
        ],
    )


def background_metrics(frames: list[np.ndarray], mask: np.ndarray) -> dict[str, Any]:
    bg = mask < 8
    exact_percent = []
    max_delta = []
    for frame in frames:
        pixels = frame[bg]
        exact_percent.append(float(np.all(pixels == GREEN_BGR, axis=1).mean() * 100.0))
        max_delta.append(int(np.max(np.abs(pixels.astype(np.int16) - GREEN_BGR.astype(np.int16)))))
    return {
        "background_exact_green_percent_min": float(min(exact_percent)),
        "background_exact_green_percent_mean": float(np.mean(exact_percent)),
        "background_max_abs_delta_from_green_max": int(max(max_delta)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Sol V2 lossless expressive master from LivePortrait output.")
    parser.add_argument("--input", default="output/liveportrait_sol_v2/sol_v2_master_neutral--d0.mp4", type=Path)
    parser.add_argument("--mask", default="assets/avatar/sol/v2/sol_v2_master_mask.png", type=Path)
    parser.add_argument("--master", default="assets/avatar/sol/v2/masters/sol_v2_master_base.mkv", type=Path)
    parser.add_argument("--preview", default="assets/avatar/sol/v2/masters/sol_v2_master_idle.mp4", type=Path)
    parser.add_argument("--report", default="assets/avatar/sol/v2/masters/sol_v2_master_build_report.json", type=Path)
    parser.add_argument("--min-seconds", default=6.0, type=float)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    args = parser.parse_args()

    if not args.input.exists():
        raise FileNotFoundError(f"Missing LivePortrait input: {args.input}")
    if not args.mask.exists():
        raise FileNotFoundError(f"Missing mask: {args.mask}")

    mask = load_mask(args.mask)
    source_frames, source_fps = read_video(args.input)
    cleaned_source = [clean_frame(frame, mask) for frame in source_frames]
    master_frames = ping_pong(cleaned_source, args.min_seconds)

    write_ffv1(args.ffmpeg, master_frames, args.master)
    write_preview(args.ffmpeg, args.master, args.preview)

    report = {
        "input_path": str(args.input),
        "mask_path": str(args.mask),
        "master_path": str(args.master),
        "preview_path": str(args.preview),
        "source_fps": float(source_fps),
        "target_fps": TARGET_FPS,
        "source_frames": len(source_frames),
        "master_frames": len(master_frames),
        "master_duration_seconds": len(master_frames) / TARGET_FPS,
        "width": TARGET_WIDTH,
        "height": TARGET_HEIGHT,
        "background": background_metrics(master_frames, mask),
        "input_sha256": sha256_file(args.input),
        "mask_sha256": sha256_file(args.mask),
        "master_sha256": sha256_file(args.master),
        "preview_sha256": sha256_file(args.preview),
    }
    write_json(args.report, report)

    bg = report["background"]
    if bg["background_exact_green_percent_min"] != 100.0 or bg["background_max_abs_delta_from_green_max"] != 0:
        raise RuntimeError("Background validation failed after recomposition")


if __name__ == "__main__":
    main()
