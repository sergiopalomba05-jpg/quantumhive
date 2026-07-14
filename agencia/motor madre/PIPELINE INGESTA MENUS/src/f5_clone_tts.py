#!/usr/bin/env python3
"""F5-TTS voice clone wrapper.

The heavy F5-TTS environment lives on D: so the repo can stay on C:.
"""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path


F5_ROOT = Path("D:/ai-pipeline-ingesta-menus")
F5_PYTHON = F5_ROOT / "f5tts-venv" / "Scripts" / "python.exe"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate cloned voice WAV using F5-TTS.")
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--ref-audio", default="assets/voice/sol_ar_v1_ref.wav")
    parser.add_argument(
        "--ref-text",
        default="Hola, soy Sol. Te acompaño a recorrer la carta y elegir algo rico.",
    )
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--nfe-step", default="16")
    args = parser.parse_args()

    if not F5_PYTHON.exists():
        raise FileNotFoundError(f"Missing F5-TTS Python: {F5_PYTHON}")

    text = Path(args.text_file).read_text(encoding="utf-8").strip()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env["TEMP"] = str(F5_ROOT / "tmp")
    env["TMP"] = str(F5_ROOT / "tmp")
    env["HF_HOME"] = str(F5_ROOT / "hf-cache")
    env["HUGGINGFACE_HUB_CACHE"] = str(F5_ROOT / "hf-cache" / "hub")
    env["TRANSFORMERS_CACHE"] = str(F5_ROOT / "hf-cache" / "transformers")
    env["XDG_CACHE_HOME"] = str(F5_ROOT / "xdg-cache")
    env["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
    env["PATH"] = str(F5_ROOT / "bin") + os.pathsep + env.get("PATH", "")

    command = [
        str(F5_PYTHON),
        "-m",
        "f5_tts.infer.infer_cli",
        "-m",
        "F5TTS_v1_Base",
        "-r",
        args.ref_audio,
        "-s",
        args.ref_text,
        "-t",
        text,
        "-o",
        str(output.parent),
        "-w",
        output.name,
        "--device",
        args.device,
        "--nfe_step",
        args.nfe_step,
        "--remove_silence",
    ]
    result = subprocess.run(command, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"F5-TTS failed with exit code {result.returncode}")


if __name__ == "__main__":
    main()
