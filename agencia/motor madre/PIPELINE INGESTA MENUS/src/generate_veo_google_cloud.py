import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_PROJECT = "project-aa5fb956-b08a-4e13-869"
DEFAULT_LOCATION = "us-central1"

MODEL_CANDIDATES = [
    "veo-3.1-generate-001",
    "veo-3.1-fast-generate-001",
    "veo-3.1-generate-preview",
    "veo-3.0-generate-001",
    "veo-3.0-fast-generate-001",
    "veo-3.0-generate-preview",
    "veo-3.0-fast-generate-preview",
    "veo-2.0-generate-001",
]

CLIPS = [
    {
        "id": "connector_idle",
        "line": "",
    },
    {
        "id": "connector_welcome",
        "line": "Hola, bienvenidos a La Escaloneta. Soy tu mesera virtual.",
    },
    {
        "id": "connector_entradas",
        "line": "Excelente, te sugiero estas entradas.",
    },
]


def run_gcloud(args):
    gcloud = shutil.which("gcloud.cmd") or shutil.which("gcloud")
    if not gcloud and os.name == "nt":
        candidate = Path("C:/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd")
        if candidate.exists():
            gcloud = str(candidate)
    if not gcloud:
        raise FileNotFoundError("gcloud CLI not found. Install Google Cloud SDK or add gcloud.cmd to PATH.")

    result = subprocess.run(
        [gcloud, *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def get_access_token():
    return run_gcloud(["auth", "print-access-token"])


def http_json(method, url, token, body=None, timeout=120):
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(raw)
        except json.JSONDecodeError:
            detail = raw
        raise RuntimeError(json.dumps({"status": exc.code, "error": detail}, ensure_ascii=False, indent=2)) from exc
    except URLError as exc:
        raise RuntimeError(str(exc)) from exc


def encode_image(path):
    if not path:
        return None
    image_path = Path(path)
    suffix = image_path.suffix.lower()
    mime = "image/png" if suffix == ".png" else "image/jpeg"
    return {
        "bytesBase64Encoded": base64.b64encode(image_path.read_bytes()).decode("ascii"),
        "mimeType": mime,
    }


def build_prompt(line):
    speech = (
        "She says exactly in Argentine Spanish: "
        f'\"{line}\"'
        if line
        else "She does not speak. She breathes naturally, smiles softly, and waits attentively."
    )
    return (
        "Vertical premium restaurant virtual host avatar video. "
        "A friendly adult Argentine Spanish-speaking host named Sol faces camera, "
        "upper body framing, natural smile, professional hospitality tone, clean even lighting, "
        "subtle head movement, realistic lip sync. "
        "Use a solid bright chroma key green studio backdrop covering the entire frame edge to edge, "
        "uniform and untextured, for later compositing. No black bars, no letterbox, no borders, no dark panels. "
        "No subtitles, no captions, no text overlays, no logos, no props. "
        f"{speech}"
    )


def build_request(prompt, reference_image, output_gcs_uri=None):
    instance = {"prompt": prompt}
    if reference_image:
        # Vertex REST image-to-video field used by Veo predictLongRunning.
        instance["image"] = reference_image

    parameters = {
        "sampleCount": 1,
        "durationSeconds": 8,
        "aspectRatio": "9:16",
        "personGeneration": "allow_adult",
        "generateAudio": bool(prompt and "She says exactly" in prompt),
        "enhancePrompt": True,
        "includeRaiReason": True,
        "negativePrompt": "black bars, letterbox, border, dark panel, black background, room background, restaurant background, shadows, gradients, text, subtitles, logos, props",
    }
    if output_gcs_uri:
        parameters["storageUri"] = output_gcs_uri.rstrip("/") + "/"

    return {"instances": [instance], "parameters": parameters}


def submit(project, location, model, token, payload):
    url = (
        f"https://{location}-aiplatform.googleapis.com/v1/projects/{project}"
        f"/locations/{location}/publishers/google/models/{model}:predictLongRunning"
    )
    return http_json("POST", url, token, payload)


def poll(project, location, token, operation, timeout_seconds, poll_seconds):
    name = operation.get("name")
    if not name:
        return operation

    deadline = time.time() + timeout_seconds
    resource_name = name.split("/operations/")[0]
    url = f"https://{location}-aiplatform.googleapis.com/v1/{resource_name}:fetchPredictOperation"
    body = {"operationName": name}
    while time.time() < deadline:
        current = http_json("POST", url, token, body)
        if current.get("done"):
            return current
        print(f"[poll] {name} pending...", flush=True)
        time.sleep(poll_seconds)
    raise TimeoutError(f"Operation did not finish within {timeout_seconds}s: {name}")


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Generate avatar test clips with Google Cloud Vertex AI Veo.")
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--location", default=DEFAULT_LOCATION)
    parser.add_argument("--model", action="append", dest="models", help="Model id to try. Can be repeated.")
    parser.add_argument("--reference-image", default="assets/avatar/sol_v1_green.png")
    parser.add_argument("--output-gcs-uri", default=None, help="Optional gs:// bucket/prefix for generated videos.")
    parser.add_argument("--output-dir", default="output/veo_google_cloud")
    parser.add_argument("--submit-only", action="store_true")
    parser.add_argument("--resume-operation", default=None, help="Existing Vertex AI operation name to poll.")
    parser.add_argument("--resume-id", default="resumed", help="File prefix used with --resume-operation.")
    parser.add_argument("--timeout-seconds", type=int, default=1800)
    parser.add_argument("--poll-seconds", type=int, default=15)
    parser.add_argument("--clip-id", choices=[clip["id"] for clip in CLIPS], default=None)
    args = parser.parse_args()

    root = Path.cwd()
    out_dir = root / args.output_dir
    reference = encode_image(root / args.reference_image if args.reference_image else None)
    token = get_access_token()

    if args.resume_operation:
        result = poll(
            args.project,
            args.location,
            token,
            {"name": args.resume_operation},
            args.timeout_seconds,
            args.poll_seconds,
        )
        write_json(out_dir / f"{args.resume_id}.result.json", result)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    models = args.models or MODEL_CANDIDATES
    clips = [clip for clip in CLIPS if args.clip_id in (None, clip["id"])]

    summary = []
    for clip in clips:
        prompt = build_prompt(clip["line"])
        payload = build_request(prompt, reference, args.output_gcs_uri)
        write_json(out_dir / f"{clip['id']}.request.json", payload)

        last_error = None
        for model in models:
            print(f"[submit] clip={clip['id']} model={model} location={args.location}", flush=True)
            try:
                operation = submit(args.project, args.location, model, token, payload)
                write_json(out_dir / f"{clip['id']}.{model}.operation.json", operation)
                result = operation if args.submit_only else poll(
                    args.project,
                    args.location,
                    token,
                    operation,
                    args.timeout_seconds,
                    args.poll_seconds,
                )
                write_json(out_dir / f"{clip['id']}.{model}.result.json", result)
                summary.append({"clip_id": clip["id"], "model": model, "operation": operation.get("name"), "result": result})
                break
            except Exception as exc:
                last_error = str(exc)
                write_json(out_dir / f"{clip['id']}.{model}.error.json", {"error": last_error})
                print(f"[error] clip={clip['id']} model={model}: {last_error}", file=sys.stderr, flush=True)
        else:
            summary.append({"clip_id": clip["id"], "error": last_error})

    write_json(out_dir / "summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
