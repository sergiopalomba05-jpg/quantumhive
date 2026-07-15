#!/usr/bin/env python3
"""Generate avatar videos from missing render jobs.

This worker is intentionally mechanical:
- reads output/cache/render_missing_jobs.jsonl
- generates audio through a configured local TTS command
- submits a ComfyUI workflow through the HTTP API
- converts the master MP4 with green background to WebM VP9 alpha + Opus
- records successful assets in the global avatar cache

Use --dry-run to validate the plan without running TTS/ComfyUI/FFmpeg.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import time
import urllib.parse
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from string import Template
from typing import Any


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not path.exists():
        return rows
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_cache(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "assets": []}
    return read_json(path)


def render_template(command_template: str, values: dict[str, str]) -> str:
    return Template(command_template).safe_substitute(values)


def run_command(command: str) -> None:
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {result.returncode}: {command}")


def ffmpeg_binary(config: dict[str, Any]) -> str:
    binary = config["ffmpeg"]["binary"]
    if binary == "imageio-ffmpeg":
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    return binary


def post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} from {url}: {body}") from error


def get_json(url: str) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as response:
        destination.write_bytes(response.read())


def copy_to_comfy_input(config: dict[str, Any], source: Path, name: str) -> str:
    input_dir = Path(config["comfyui"]["input_dir"])
    if not input_dir.exists():
        raise FileNotFoundError(f"Missing ComfyUI input directory: {input_dir}")
    suffix = source.suffix or Path(name).suffix
    target_name = f"pipeline_{uuid.uuid4().hex[:8]}_{Path(name).stem}{suffix}"
    shutil.copy2(source, input_dir / target_name)
    return target_name


def patch_workflow(workflow: dict[str, Any], config: dict[str, Any], job: dict[str, Any], audio_name: str, avatar_name: str, prefix: str) -> dict[str, Any]:
    if not workflow:
        raise ValueError("Missing ComfyUI workflow JSON. Set comfyui.workflow_path in config/video_generation.json")

    patched = json.loads(json.dumps(workflow))
    node_inputs = config["comfyui"]["node_inputs"]

    try:
        audio_node = patched[node_inputs["audio_node_id"]]["inputs"]
        image_node = patched[node_inputs["image_node_id"]]["inputs"]
        save_node = patched[node_inputs["save_node_id"]]["inputs"]
    except KeyError as error:
        raise ValueError(f"Workflow node mapping is invalid: {error}") from error

    audio_node[node_inputs["audio_input_name"]] = audio_name
    image_node[node_inputs["image_input_name"]] = avatar_name
    save_node[node_inputs["save_prefix_input_name"]] = prefix

    return patched


def submit_comfyui(config: dict[str, Any], workflow: dict[str, Any]) -> str:
    comfy = config["comfyui"]
    payload = {"prompt": workflow, "client_id": comfy["client_id"]}
    response = post_json(f"{comfy['base_url']}/prompt", payload)
    return response["prompt_id"]


def wait_for_comfyui(config: dict[str, Any], prompt_id: str) -> dict[str, Any]:
    comfy = config["comfyui"]
    started = time.time()
    while time.time() - started < comfy["timeout_seconds"]:
        history = get_json(f"{comfy['base_url']}/history/{prompt_id}")
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(comfy["poll_seconds"])
    raise TimeoutError(f"ComfyUI prompt timed out: {prompt_id}")


def find_video_output(history: dict[str, Any]) -> dict[str, str]:
    outputs = history.get("outputs", {})
    for output in outputs.values():
        for video in output.get("videos", []):
            return video
        for gif in output.get("gifs", []):
            return gif
        for image in output.get("images", []):
            if Path(image.get("filename", "")).suffix.lower() in {".mp4", ".webm", ".mov", ".mkv"}:
                return image
    raise FileNotFoundError("ComfyUI history did not include a video output")


def download_comfy_video(config: dict[str, Any], history: dict[str, Any], destination: Path) -> None:
    video = find_video_output(history)
    query = urllib.parse.urlencode(
        {
            "filename": video["filename"],
            "subfolder": video.get("subfolder", ""),
            "type": video.get("type", "output"),
        }
    )
    download_file(f"{config['comfyui']['base_url']}/view?{query}", destination)


def convert_green_to_webm(config: dict[str, Any], master_mp4: Path, final_webm: Path) -> None:
    ffmpeg = config["ffmpeg"]
    final_webm.parent.mkdir(parents=True, exist_ok=True)
    filter_value = f"chromakey={ffmpeg['green_key']}:{ffmpeg['similarity']}:{ffmpeg['blend']},despill=type=green:mix=0.75:expand=0.25,format=yuva420p"
    command = (
        f"\"{ffmpeg_binary(config)}\" -y -i \"{master_mp4}\" "
        f"-vf \"{filter_value}\" "
        f"-c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf {ffmpeg['crf']} "
        f"-c:a libopus -b:a {ffmpeg['audio_bitrate']} \"{final_webm}\""
    )
    run_command(command)


def make_audio(config: dict[str, Any], job: dict[str, Any], script_file: Path, audio_path: Path) -> None:
    mode = config["tts"].get("mode", "command")
    if mode == "reference_audio":
        source = Path(config["tts"]["reference_audio"])
        if not source.exists():
            raise FileNotFoundError(f"Missing reference audio: {source}")
        command = f"\"{ffmpeg_binary(config)}\" -y -i \"{source}\" -ar 24000 -ac 1 \"{audio_path}\""
        run_command(command)
        return

    tts_command = config["tts"].get("command_template", "").strip()
    if not tts_command:
        raise ValueError("Missing tts.command_template in config/video_generation.json")

    run_command(
        render_template(
            tts_command,
            {
                "script_file": str(script_file),
                "audio_path": str(audio_path),
                "text": job["script"],
            },
        )
    )


def append_asset(cache_path: Path, cache: dict[str, Any], job: dict[str, Any], final_webm: Path) -> None:
    assets = cache.setdefault("assets", [])
    if any(asset.get("global_asset_key") == job["global_asset_key"] for asset in assets):
        return
    assets.append(
        {
            "global_asset_key": job["global_asset_key"],
            "canonical_id": job["canonical_id"],
            "kind": job["kind"],
            "name": job["name"],
            "avatar_id": job["avatar_id"],
            "avatar_version": job["avatar_version"],
            "voice_id": job["voice_id"],
            "render_profile": job["render_profile"],
            "language": job["language"],
            "video_path": str(final_webm).replace("\\", "/"),
        }
    )
    write_json(cache_path, cache)


def expected_master_path(work_dir: Path, job: dict[str, Any]) -> Path:
    return work_dir / job["global_asset_key"] / "master.mp4"


def process_job(config: dict[str, Any], workflow: dict[str, Any], cache: dict[str, Any], cache_path: Path, job: dict[str, Any], dry_run: bool) -> dict[str, Any]:
    work_dir = Path(config["paths"]["work_dir"]) / job["global_asset_key"]
    work_dir.mkdir(parents=True, exist_ok=True)

    script_file = work_dir / "script.txt"
    audio_path = work_dir / "audio.wav"
    master_mp4 = work_dir / "master.mp4"
    final_webm = Path(config["paths"]["global_video_dir"]) / job["avatar_id"] / job["avatar_version"] / f"{job['canonical_id']}.webm"
    avatar_path = Path(config["assets"]["avatar_source"])
    script_file.write_text(job["script"] + "\n", encoding="utf-8")

    if dry_run:
        return {
            "item_id": job["item_id"],
            "canonical_id": job["canonical_id"],
            "status": "dry_run",
            "audio_path": str(audio_path),
            "master_mp4": str(master_mp4),
            "final_webm": str(final_webm),
        }

    if not avatar_path.exists():
        raise FileNotFoundError(f"Missing avatar source: {avatar_path}")

    make_audio(config, job, script_file, audio_path)

    audio_name = copy_to_comfy_input(config, audio_path, f"{job['canonical_id']}.wav")
    avatar_name = copy_to_comfy_input(config, avatar_path, Path(config["assets"]["avatar_source"]).name)

    prefix = f"pipeline_{job['canonical_id']}_{uuid.uuid4().hex[:8]}"
    patched_workflow = patch_workflow(workflow, config, job, audio_name, avatar_name, prefix)
    prompt_id = submit_comfyui(config, patched_workflow)
    history = wait_for_comfyui(config, prompt_id)
    download_comfy_video(config, history, master_mp4)

    convert_green_to_webm(config, master_mp4, final_webm)
    append_asset(cache_path, cache, job, final_webm)
    return {
        "item_id": job["item_id"],
        "canonical_id": job["canonical_id"],
        "status": "generated",
        "video_path": str(final_webm),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate avatar videos for missing jobs.")
    parser.add_argument("--config", default="config/video_generation.json")
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    config = read_json(Path(args.config))
    jobs = read_jsonl(Path(config["paths"]["missing_jobs"]))[: args.limit]
    cache_path = Path(config["paths"]["global_cache"])
    cache = load_cache(cache_path)

    workflow_path = Path(config["comfyui"]["workflow_path"])
    workflow = read_json(workflow_path) if workflow_path.exists() else {}

    results: list[dict[str, Any]] = []
    for job in jobs:
        try:
            results.append(process_job(config, workflow, cache, cache_path, job, args.dry_run))
        except (OSError, RuntimeError, ValueError, KeyError, urllib.error.URLError, TimeoutError) as error:
            results.append(
                {
                    "item_id": job.get("item_id"),
                    "canonical_id": job.get("canonical_id"),
                    "status": "failed",
                    "error": str(error),
                }
            )
            if not args.dry_run:
                break

    report_path = Path(config["paths"]["generation_report"])
    write_json(report_path, {"dry_run": args.dry_run, "results": results})
    print(f"OK: wrote generation report to {report_path}")
    for result in results:
        print(f"{result['status']}: {result.get('item_id')} -> {result.get('final_webm') or result.get('video_path') or result.get('error')}")


if __name__ == "__main__":
    main()
