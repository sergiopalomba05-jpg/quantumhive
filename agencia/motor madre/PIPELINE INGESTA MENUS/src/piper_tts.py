#!/usr/bin/env python3
"""Local Piper TTS wrapper used by the video generation worker."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate WAV audio with Piper.")
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--speaker", default=None)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    piper = root / ".venv" / "Scripts" / "piper.exe"
    if not piper.exists():
        raise FileNotFoundError(f"Missing Piper executable: {piper}")

    text_file = Path(args.text_file)
    output = Path(args.output)
    model = Path(args.model)
    if not model.exists():
        raise FileNotFoundError(f"Missing Piper model: {model}")

    output.parent.mkdir(parents=True, exist_ok=True)
    command = [str(piper), "--model", str(model), "--input-file", str(text_file), "--output-file", str(output)]
    if args.speaker is not None:
        command.extend(["--speaker", args.speaker])

    result = subprocess.run(command)
    if result.returncode != 0:
        raise RuntimeError(f"Piper failed with exit code {result.returncode}")


if __name__ == "__main__":
    main()
