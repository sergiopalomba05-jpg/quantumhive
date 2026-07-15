#!/usr/bin/env python3
"""Resolve render jobs against the avatar global cache.

Reads:
- output/jobs/render_jobs.jsonl
- cache/global_avatar_cache.json

Writes:
- output/cache/cache_hits.jsonl
- output/cache/render_missing_jobs.jsonl
- output/index/restaurant_video_index.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def load_cache(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"assets": []}
    return json.loads(path.read_text(encoding="utf-8"))


def global_asset_key(job: dict[str, Any]) -> str:
    payload = " | ".join(
        [
            job["avatar_id"],
            job["avatar_version"],
            job["voice_id"],
            job["render_profile"],
            job["language"],
            job["canonical_id"],
        ]
    )
    return hashlib.sha256(payload.lower().encode("utf-8")).hexdigest()


def index_assets(cache: dict[str, Any]) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for asset in cache.get("assets", []):
        indexed[asset["global_asset_key"]] = asset
    return indexed


def resolve(jobs: list[dict[str, Any]], cache: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    assets = index_assets(cache)
    hits: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    index_items: list[dict[str, Any]] = []

    restaurant_id = jobs[0]["restaurant_id"] if jobs else "unknown"

    for job in jobs:
        key = global_asset_key(job)
        enriched_job = {**job, "global_asset_key": key}
        asset = assets.get(key)

        if asset:
            hit = {
                "restaurant_id": job["restaurant_id"],
                "item_id": job["item_id"],
                "canonical_id": job["canonical_id"],
                "kind": job["kind"],
                "name": job["name"],
                "global_asset_key": key,
                "video_path": asset["video_path"],
                "cache_status": "hit",
            }
            hits.append(hit)
            index_items.append(hit)
            continue

        missing.append(enriched_job)
        index_items.append(
            {
                "restaurant_id": job["restaurant_id"],
                "item_id": job["item_id"],
                "canonical_id": job["canonical_id"],
                "kind": job["kind"],
                "name": job["name"],
                "global_asset_key": key,
                "video_path": None,
                "cache_status": "missing",
            }
        )

    restaurant_index = {
        "restaurant_id": restaurant_id,
        "total_items": len(index_items),
        "cache_hits": len(hits),
        "render_missing": len(missing),
        "status": "complete" if not missing else "pending_render",
        "items": index_items,
    }
    return hits, missing, restaurant_index


def main() -> None:
    parser = argparse.ArgumentParser(description="Resolve jobs against global avatar cache.")
    parser.add_argument("--jobs", default="output/jobs/render_jobs.jsonl")
    parser.add_argument("--cache", default="cache/global_avatar_cache.json")
    parser.add_argument("--output", default="output")
    args = parser.parse_args()

    jobs = read_jsonl(Path(args.jobs))
    cache = load_cache(Path(args.cache))
    hits, missing, restaurant_index = resolve(jobs, cache)

    output_dir = Path(args.output)
    write_jsonl(output_dir / "cache" / "cache_hits.jsonl", hits)
    write_jsonl(output_dir / "cache" / "render_missing_jobs.jsonl", missing)
    (output_dir / "index").mkdir(parents=True, exist_ok=True)
    (output_dir / "index" / "restaurant_video_index.json").write_text(
        json.dumps(restaurant_index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"OK: {len(hits)} cache hits, {len(missing)} missing renders")
    print(f"Wrote: {output_dir / 'cache' / 'cache_hits.jsonl'}")
    print(f"Wrote: {output_dir / 'cache' / 'render_missing_jobs.jsonl'}")
    print(f"Wrote: {output_dir / 'index' / 'restaurant_video_index.json'}")


if __name__ == "__main__":
    main()
