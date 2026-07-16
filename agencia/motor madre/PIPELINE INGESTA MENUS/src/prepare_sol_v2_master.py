#!/usr/bin/env python3
"""Prepare Sol V2 canonical source image and deterministic master assets.

This script does not generate the expressive animation. It prepares the
approved source image into a mathematically clean 720x1280 green-background
asset plus mask/report, so downstream LivePortrait/MuseTalk work starts from a
single validated source.
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


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def make_initial_mask(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    b, g, r = cv2.split(image)
    green_dominant = (g.astype(np.int16) > 120) & ((g.astype(np.int16) - r.astype(np.int16)) > 45) & ((g.astype(np.int16) - b.astype(np.int16)) > 45)

    mask = np.full((h, w), cv2.GC_PR_FGD, dtype=np.uint8)
    mask[green_dominant] = cv2.GC_PR_BGD
    border = max(8, min(h, w) // 80)
    mask[:border, :] = cv2.GC_BGD
    mask[-border:, :] = cv2.GC_BGD
    mask[:, :border] = cv2.GC_BGD
    mask[:, -border:] = cv2.GC_BGD

    # The approved source is a centered bust. Mark the inner torso/face band as
    # foreground to keep black blazer and white shirt from being lost to green.
    x0, x1 = int(w * 0.28), int(w * 0.72)
    y0, y1 = int(h * 0.08), int(h * 0.96)
    mask[y0:y1, x0:x1] = np.where(green_dominant[y0:y1, x0:x1], cv2.GC_PR_BGD, cv2.GC_FGD)
    return mask


def segment_person(image: np.ndarray) -> np.ndarray:
    mask = make_initial_mask(image)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(image, mask, None, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_MASK)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise RuntimeError("Segmentation failed: no foreground contour found")
    largest = max(contours, key=cv2.contourArea)
    clean = np.zeros_like(binary)
    cv2.drawContours(clean, [largest], -1, 255, thickness=cv2.FILLED)
    clean = cv2.GaussianBlur(clean, (5, 5), 0)
    return clean


def foreground_bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask > 16)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError("Mask has no visible foreground")
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def compose_normalized(image: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    x0, y0, x1, y1 = foreground_bbox(mask)
    bbox_w = x1 - x0
    bbox_h = y1 - y0
    pad = 18
    crop_x0 = max(0, x0 - pad)
    crop_y0 = max(0, y0 - pad)
    crop_x1 = min(image.shape[1], x1 + pad)
    crop_y1 = min(image.shape[0], y1 + pad)

    crop_img = image[crop_y0:crop_y1, crop_x0:crop_x1]
    crop_mask = mask[crop_y0:crop_y1, crop_x0:crop_x1]
    crop_bbox_w = crop_x1 - crop_x0
    crop_bbox_h = crop_y1 - crop_y0

    scale = min(680 / crop_bbox_w, 1220 / crop_bbox_h)
    resized_w = max(1, int(round(crop_bbox_w * scale)))
    resized_h = max(1, int(round(crop_bbox_h * scale)))
    resized_img = cv2.resize(crop_img, (resized_w, resized_h), interpolation=cv2.INTER_LANCZOS4)
    resized_mask = cv2.resize(crop_mask, (resized_w, resized_h), interpolation=cv2.INTER_LINEAR)

    canvas = np.full((TARGET_HEIGHT, TARGET_WIDTH, 3), GREEN_BGR, dtype=np.uint8)
    mask_canvas = np.zeros((TARGET_HEIGHT, TARGET_WIDTH), dtype=np.uint8)
    x = (TARGET_WIDTH - resized_w) // 2
    y = TARGET_HEIGHT - resized_h
    y = max(0, y)

    alpha = (resized_mask.astype(np.float32) / 255.0)[:, :, None]
    region = canvas[y : y + resized_h, x : x + resized_w].astype(np.float32)
    composed = resized_img.astype(np.float32) * alpha + region * (1.0 - alpha)
    canvas[y : y + resized_h, x : x + resized_w] = np.clip(composed, 0, 255).astype(np.uint8)
    mask_canvas[y : y + resized_h, x : x + resized_w] = resized_mask
    canvas[mask_canvas < 8] = GREEN_BGR

    out_x0, out_y0, out_x1, out_y1 = foreground_bbox(mask_canvas)
    metrics = {
        "source_foreground_bbox": [x0, y0, x1, y1],
        "normalized_foreground_bbox": [out_x0, out_y0, out_x1, out_y1],
        "scale": scale,
        "paste_xy": [x, y],
        "foreground_area_pixels": int(np.sum(mask_canvas > 16)),
        "foreground_center": [float((out_x0 + out_x1) / 2), float((out_y0 + out_y1) / 2)],
    }
    return canvas, mask_canvas, metrics


def background_metrics(image: np.ndarray, mask: np.ndarray) -> dict[str, Any]:
    bg_pixels = image[mask < 8]
    green = np.array([0, 255, 0], dtype=np.uint8)
    if len(bg_pixels) == 0:
        raise RuntimeError("No background pixels available for validation")
    exact = np.all(bg_pixels == green, axis=1)
    return {
        "background_pixel_count": int(len(bg_pixels)),
        "background_exact_green_percent": float(exact.mean() * 100.0),
        "background_mean_rgb": [float(v) for v in bg_pixels[:, ::-1].mean(axis=0)],
        "background_std_rgb": [float(v) for v in bg_pixels[:, ::-1].std(axis=0)],
        "background_max_abs_delta_from_green": int(np.max(np.abs(bg_pixels.astype(np.int16) - green.astype(np.int16)))),
    }


def run_ffmpeg(ffmpeg: str, args: list[str]) -> None:
    subprocess.run([ffmpeg, *args], check=True)


def create_static_master(ffmpeg: str, image_path: Path, master_path: Path, preview_path: Path) -> None:
    master_path.parent.mkdir(parents=True, exist_ok=True)
    duration = "6"
    run_ffmpeg(
        ffmpeg,
        [
            "-y",
            "-loop",
            "1",
            "-framerate",
            "25",
            "-t",
            duration,
            "-i",
            str(image_path),
            "-an",
            "-c:v",
            "ffv1",
            "-level",
            "3",
            "-pix_fmt",
            "bgr0",
            str(master_path),
        ],
    )
    run_ffmpeg(
        ffmpeg,
        [
            "-y",
            "-i",
            str(master_path),
            "-an",
            "-c:v",
            "libx264",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(preview_path),
        ],
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Sol V2 canonical normalized image and static lossless master.")
    parser.add_argument("--source", default="assets/avatar/sol/v2/sol_v2_master_neutral_source.png", type=Path)
    parser.add_argument("--output", default="assets/avatar/sol/v2/sol_v2_master_neutral.png", type=Path)
    parser.add_argument("--mask", default="assets/avatar/sol/v2/sol_v2_master_mask.png", type=Path)
    parser.add_argument("--report", default="assets/avatar/sol/v2/sol_v2_master_report.json", type=Path)
    parser.add_argument("--master", default="assets/avatar/sol/v2/masters/sol_v2_master_base.mkv", type=Path)
    parser.add_argument("--preview", default="assets/avatar/sol/v2/masters/sol_v2_master_idle.mp4", type=Path)
    parser.add_argument("--ffmpeg", default=None)
    parser.add_argument("--create-static-master", action="store_true")
    args = parser.parse_args()

    if not args.source.exists():
        raise FileNotFoundError(f"Missing source image: {args.source}")

    image = cv2.imread(str(args.source), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Could not read image: {args.source}")

    mask = segment_person(image)
    normalized, normalized_mask, placement_metrics = compose_normalized(image, mask)
    bg = background_metrics(normalized, normalized_mask)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.mask.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(args.output), normalized)
    cv2.imwrite(str(args.mask), normalized_mask)

    report = {
        "source_path": str(args.source),
        "normalized_path": str(args.output),
        "mask_path": str(args.mask),
        "target_width": TARGET_WIDTH,
        "target_height": TARGET_HEIGHT,
        "source_width": int(image.shape[1]),
        "source_height": int(image.shape[0]),
        "source_sha256": sha256_file(args.source),
        "normalized_sha256": sha256_file(args.output),
        "mask_sha256": sha256_file(args.mask),
        "placement": placement_metrics,
        "background": bg,
        "validation": {
            "background_is_exact_green": bg["background_exact_green_percent"] == 100.0,
            "resolution_ok": list(normalized.shape[:2]) == [TARGET_HEIGHT, TARGET_WIDTH],
        },
    }
    write_json(args.report, report)

    if not report["validation"]["background_is_exact_green"]:
        raise RuntimeError("Background validation failed: non-green pixels found outside mask")

    if args.create_static_master:
        if not args.ffmpeg:
            raise ValueError("--ffmpeg is required with --create-static-master")
        create_static_master(args.ffmpeg, args.output, args.master, args.preview)
        report["master_base_path"] = str(args.master)
        report["master_preview_path"] = str(args.preview)
        report["master_base_sha256"] = sha256_file(args.master)
        report["master_preview_sha256"] = sha256_file(args.preview)
        write_json(args.report, report)

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
