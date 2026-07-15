#!/usr/bin/env python3
"""Convert Veo chroma masters into stable WebM VP9 alpha avatar clips."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def ffmpeg_binary(config: dict[str, Any] | None, override: str | None) -> str:
    binary = override or (config or {}).get("ffmpeg", {}).get("binary") or "ffmpeg"
    if binary == "imageio-ffmpeg":
        try:
            import imageio_ffmpeg
        except ImportError as exc:
            raise RuntimeError("Install imageio-ffmpeg or pass --ffmpeg with an ffmpeg.exe path.") from exc
        return imageio_ffmpeg.get_ffmpeg_exe()

    resolved = shutil.which(binary) or binary
    if not Path(resolved).exists() and shutil.which(binary) is None:
        raise FileNotFoundError(f"FFmpeg not found: {binary}")
    return resolved


def build_filter(args: argparse.Namespace) -> str:
    filters = [
        f"scale={args.width}:{args.height}:force_original_aspect_ratio=decrease:flags=lanczos",
        f"pad={args.width}:{args.height}:(ow-iw)/2:(oh-ih)/2:color={args.green_key}",
        "format=rgba",
    ]
    if args.key_black_edges:
        filters.append(f"colorkey={args.black_key}:{args.black_similarity}:{args.black_blend}")
    filters.extend(
        [
            f"chromakey={args.green_key}:{args.green_similarity}:{args.green_blend}",
            "despill=type=green:mix=0.85:expand=0.35",
            "format=yuva420p",
        ]
    )
    return ",".join(filters)


def convert(ffmpeg: str, args: argparse.Namespace) -> None:
    args.output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg,
        "-y",
        "-i",
        str(args.input),
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        build_filter(args),
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-auto-alt-ref",
        "0",
        "-b:v",
        "0",
        "-crf",
        str(args.crf),
        "-c:a",
        "libopus",
        "-b:a",
        args.audio_bitrate,
        "-shortest",
        str(args.output),
    ]
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Postprocess Veo MP4 chroma output to WebM alpha.")
    parser.add_argument("--input", required=True, type=Path, help="Veo MP4 master.")
    parser.add_argument("--output", required=True, type=Path, help="Final WebM VP9 alpha path.")
    parser.add_argument("--config", default="config/video_generation.json", type=Path)
    parser.add_argument("--ffmpeg", default=None, help="Override ffmpeg binary path.")
    parser.add_argument("--width", default=720, type=int)
    parser.add_argument("--height", default=1280, type=int)
    parser.add_argument("--green-key", default="0x00FF00")
    parser.add_argument("--green-similarity", default="0.28")
    parser.add_argument("--green-blend", default="0.08")
    parser.add_argument("--key-black-edges", action="store_true", help="Also remove nearly pure black borders/panels.")
    parser.add_argument("--black-key", default="0x000000")
    parser.add_argument("--black-similarity", default="0.035")
    parser.add_argument("--black-blend", default="0.015")
    parser.add_argument("--crf", default=28, type=int)
    parser.add_argument("--audio-bitrate", default="96k")
    args = parser.parse_args()

    if not args.input.exists():
        raise FileNotFoundError(f"Missing input video: {args.input}")

    config = read_json(args.config) if args.config.exists() else None
    convert(ffmpeg_binary(config, args.ffmpeg), args)


if __name__ == "__main__":
    main()
