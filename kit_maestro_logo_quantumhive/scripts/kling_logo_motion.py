#!/usr/bin/env python3
"""Dry-run first pipeline for QuantumHive logo motion generation.

This script prepares a Kling-style multi-image-to-video request from the
organized logo motion kit. It does not call any API unless --run is passed and
the required endpoint configuration exists in environment variables.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
KIT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = KIT_DIR / "outputs" / "kling_generados"
PROMPT_PATH = KIT_DIR / "02_prompt_maestro_kling.md"
KEYFRAMES_DIR = KIT_DIR / "keyframes_motion"
ISOTIPO_DIR = KIT_DIR / "isotipo"
TYPO_DIR = KIT_DIR / "tipografia_transparente"

OUTPUT_MP4 = OUTPUT_DIR / "quantumhive_logo_motion_v01.mp4"
OUTPUT_METADATA = OUTPUT_DIR / "quantumhive_logo_motion_v01_metadata.json"
OUTPUT_PAYLOAD_DRY_RUN = OUTPUT_DIR / "quantumhive_logo_motion_v01_payload_dry_run.json"

KEYFRAME_FILES = [
    "frame_01_nucleo_cerrado_9x16.png",
    "frame_02_apertura_tecnologica_9x16.png",
    "frame_03_logo_hero_9x16.png",
    "frame_hero_extra_9x16.png",
]

REFERENCE_FILES = [
    ISOTIPO_DIR / "quantumhive_isotipo_v01_transparente.png",
    ISOTIPO_DIR / "quantumhive_isotipo_v01_transparente_recortado.png",
    TYPO_DIR / "01_quantum_hive_titulo_transparente.png",
    TYPO_DIR / "02_multi_agent_business_infrastructure_transparente.png",
    TYPO_DIR / "03_powered_by_artificial_intelligence_transparente.png",
    TYPO_DIR / "04_lockup_tipografico_completo_transparente.png",
]


@dataclass(frozen=True)
class KlingConfig:
    api_key: str | None
    api_secret: str | None
    base_url: str | None
    create_endpoint: str | None
    status_endpoint: str | None
    model: str
    auth_header_name: str


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def encode_asset(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Missing asset: {path}")

    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    raw = path.read_bytes()
    return {
        "name": path.name,
        "relative_path": path.relative_to(KIT_DIR).as_posix(),
        "mime_type": mime_type,
        "size_bytes": len(raw),
        "data_base64": base64.b64encode(raw).decode("ascii"),
    }


def load_config() -> KlingConfig:
    return KlingConfig(
        api_key=os.getenv("KLING_API_KEY"),
        api_secret=os.getenv("KLING_API_SECRET"),
        base_url=os.getenv("KLING_API_BASE_URL"),
        create_endpoint=os.getenv("KLING_CREATE_ENDPOINT"),
        status_endpoint=os.getenv("KLING_STATUS_ENDPOINT"),
        model=os.getenv("KLING_MODEL", "kling-video"),
        auth_header_name=os.getenv("KLING_AUTH_HEADER_NAME", "Authorization"),
    )


def build_payload(include_reference_assets: bool = True) -> dict[str, Any]:
    prompt = read_text(PROMPT_PATH)
    keyframes = [encode_asset(KEYFRAMES_DIR / name) for name in KEYFRAME_FILES]

    reference_assets: list[dict[str, Any]] = []
    if include_reference_assets:
        reference_assets = [encode_asset(path) for path in REFERENCE_FILES]

    return {
        "request_type": "multi_image_to_video",
        "project": "quantumhive_logo_motion_v01",
        "model": os.getenv("KLING_MODEL", "kling-video"),
        "aspect_ratio": "9:16",
        "target_resolution": "1080x1920",
        "output_format": "mp4",
        "prompt": prompt,
        "negative_prompt": (
            "fuego, humo, abeja, insectos, caricatura, deformar logo, "
            "deformar tipografia, texto falso, iconos cambiados, ruido excesivo"
        ),
        "keyframes": keyframes,
        "reference_assets": reference_assets,
        "notes": [
            "Dry-run payload. Confirm official Kling endpoint before --run.",
            "Do not deform the approved isotipo or typography overlays.",
            "Use environment variables for credentials only.",
        ],
    }


def join_url(base_url: str, endpoint: str) -> str:
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", endpoint.lstrip("/"))


def build_headers(config: KlingConfig) -> dict[str, str]:
    if not config.api_key:
        raise RuntimeError("Missing KLING_API_KEY for real API execution.")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    if config.auth_header_name.lower() == "authorization":
        headers["Authorization"] = f"Bearer {config.api_key}"
    else:
        headers[config.auth_header_name] = config.api_key

    if config.api_secret:
        headers["X-Kling-Api-Secret"] = config.api_secret

    return headers


def post_json(url: str, payload: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {body}") from exc


def get_json(url: str, headers: dict[str, str]) -> dict[str, Any]:
    request = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {body}") from exc


def find_first_mp4_url(value: Any) -> str | None:
    if isinstance(value, str):
        lower = value.lower()
        if lower.startswith(("http://", "https://")) and ".mp4" in lower:
            return value
        return None
    if isinstance(value, dict):
        for nested in value.values():
            found = find_first_mp4_url(nested)
            if found:
                return found
    if isinstance(value, list):
        for item in value:
            found = find_first_mp4_url(item)
            if found:
                return found
    return None


def find_task_id(value: dict[str, Any]) -> str | None:
    candidates = ["task_id", "taskId", "id", "generation_id", "generationId"]
    for key in candidates:
        candidate = value.get(key)
        if isinstance(candidate, str) and candidate.strip():
            return candidate
    for nested in value.values():
        if isinstance(nested, dict):
            found = find_task_id(nested)
            if found:
                return found
    return None


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as response:
        destination.write_bytes(response.read())


def save_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def require_run_config(config: KlingConfig) -> None:
    missing = []
    if not config.api_key:
        missing.append("KLING_API_KEY")
    if not config.base_url:
        missing.append("KLING_API_BASE_URL")
    if not config.create_endpoint:
        missing.append("KLING_CREATE_ENDPOINT")
    if missing:
        raise RuntimeError(
            "Missing required environment variables for --run: "
            + ", ".join(missing)
            + ". Endpoint names are not hardcoded because the official Kling API "
            + "reference must be confirmed before generation."
        )


def run_real_request(payload: dict[str, Any], config: KlingConfig, poll: bool) -> dict[str, Any]:
    require_run_config(config)
    assert config.base_url is not None
    assert config.create_endpoint is not None

    headers = build_headers(config)
    create_url = join_url(config.base_url, config.create_endpoint)
    create_response = post_json(create_url, payload, headers)

    metadata: dict[str, Any] = {
        "mode": "run",
        "create_url": create_url,
        "create_response": create_response,
        "status_responses": [],
        "downloaded_mp4": None,
    }

    mp4_url = find_first_mp4_url(create_response)
    task_id = find_task_id(create_response)

    if poll and not mp4_url and task_id and config.status_endpoint:
        status_template = config.status_endpoint
        for _ in range(60):
            status_endpoint = status_template.format(task_id=task_id, id=task_id)
            status_url = join_url(config.base_url, status_endpoint)
            status_response = get_json(status_url, headers)
            metadata["status_responses"].append(status_response)
            mp4_url = find_first_mp4_url(status_response)
            if mp4_url:
                break
            time.sleep(10)

    if mp4_url:
        download_file(mp4_url, OUTPUT_MP4)
        metadata["downloaded_mp4"] = OUTPUT_MP4.relative_to(KIT_DIR).as_posix()
        metadata["mp4_url"] = mp4_url

    return metadata


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="QuantumHive Kling logo motion pipeline")
    parser.add_argument(
        "--run",
        action="store_true",
        help="Call Kling using configured env vars. Default is dry-run.",
    )
    parser.add_argument(
        "--poll",
        action="store_true",
        help="Poll status endpoint after create response if configured.",
    )
    parser.add_argument(
        "--no-reference-assets",
        action="store_true",
        help="Exclude isotipo and typography reference assets from payload.",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    payload = build_payload(include_reference_assets=not args.no_reference_assets)
    config = load_config()

    if not args.run:
        save_json(OUTPUT_PAYLOAD_DRY_RUN, payload)
        metadata = {
            "mode": "dry_run",
            "payload_path": OUTPUT_PAYLOAD_DRY_RUN.relative_to(KIT_DIR).as_posix(),
            "output_mp4_target": OUTPUT_MP4.relative_to(KIT_DIR).as_posix(),
            "official_endpoint_confirmed": False,
            "message": "Dry-run only. No Kling request was executed.",
        }
        save_json(OUTPUT_METADATA, metadata)
        print(f"Dry-run payload saved: {OUTPUT_PAYLOAD_DRY_RUN}")
        print(f"Metadata saved: {OUTPUT_METADATA}")
        return 0

    metadata = run_real_request(payload, config, poll=args.poll)
    save_json(OUTPUT_METADATA, metadata)
    print(f"Metadata saved: {OUTPUT_METADATA}")
    if OUTPUT_MP4.exists():
        print(f"MP4 saved: {OUTPUT_MP4}")
    else:
        print("No MP4 URL found yet. Check metadata/status response.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

