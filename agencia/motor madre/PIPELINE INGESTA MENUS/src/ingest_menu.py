#!/usr/bin/env python3
"""MVP 1 for menu ingestion.

Reads a restaurant menu from text or JSON and writes:
- output/normalized/menu.normalized.json
- output/jobs/render_jobs.jsonl

This script is intentionally dependency-free. Video generation is not part of
this node.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any


CONNECTORS = [
    ("connector_welcome", "welcome", "Bienvenida"),
    ("connector_entradas", "section", "Entradas"),
    ("connector_principales", "section", "Principales"),
    ("connector_bebidas", "section", "Bebidas"),
    ("connector_postres", "section", "Postres"),
    ("connector_add_to_order", "action", "Agregar al pedido"),
    ("connector_more_options", "action", "Mas opciones"),
    ("connector_checkout", "action", "Checkout"),
]

PRICE_RE = re.compile(r"(?:\$|ARS\s*)?([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]+)(?:\s*(?:ARS|pesos))?\s*$", re.IGNORECASE)


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_value = ascii_value.lower().strip()
    ascii_value = re.sub(r"[^a-z0-9]+", "-", ascii_value)
    return ascii_value.strip("-") or "item"


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_value = ascii_value.lower().strip()
    return re.sub(r"\s+", " ", ascii_value)


def parse_price(raw_line: str) -> tuple[str, int | None]:
    match = PRICE_RE.search(raw_line.strip())
    if not match:
        return raw_line.strip(), None

    amount = match.group(1).replace(".", "").replace(",", "")
    text_without_price = raw_line[: match.start()].strip(" -|:\t")
    return text_without_price.strip(), int(amount)


def looks_like_section(line: str, has_current_section: bool) -> bool:
    clean = line.strip().strip(":")
    if not clean:
        return False
    if line.startswith("#") or line.endswith(":"):
        return True
    if not has_current_section:
        return True
    words = clean.split()
    return len(words) <= 4 and clean.upper() == clean and any(char.isalpha() for char in clean)


def parse_text_menu(text: str, restaurant_id: str, currency: str) -> dict[str, Any]:
    sections: list[dict[str, Any]] = []
    current_section: dict[str, Any] | None = None

    def ensure_section(name: str) -> dict[str, Any]:
        section_id = slugify(name)
        for section in sections:
            if section["id"] == section_id:
                return section
        section = {"id": section_id, "name": name.strip().strip(":"), "items": []}
        sections.append(section)
        return section

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        line = re.sub(r"^[\-*•]\s*", "", line).strip()
        has_price = PRICE_RE.search(line) is not None

        if not has_price and looks_like_section(line, current_section is not None):
            current_section = ensure_section(line.lstrip("#").strip())
            continue

        if current_section is None:
            current_section = ensure_section("Menu")

        item_text, price = parse_price(line)
        name, description = split_name_description(item_text)
        if not name:
            continue

        current_section["items"].append(
            {
                "name": name,
                "description": description,
                "price": price,
                "currency": currency,
            }
        )

    return {
        "restaurant_id": restaurant_id,
        "source_type": "text",
        "sections": sections,
    }


def split_name_description(value: str) -> tuple[str, str]:
    for separator in [" - ", " | ", ": "]:
        if separator in value:
            name, description = value.split(separator, 1)
            return name.strip(), description.strip()
    return value.strip(), ""


def load_menu(input_path: Path, restaurant_id: str, currency: str) -> dict[str, Any]:
    content = input_path.read_text(encoding="utf-8-sig")
    if input_path.suffix.lower() == ".json":
        data = json.loads(content)
        data.setdefault("restaurant_id", restaurant_id)
        data.setdefault("source_type", "json")
        return data
    return parse_text_menu(content, restaurant_id, currency)


def dedupe_item_id(item_id: str, seen: dict[str, int]) -> str:
    count = seen.get(item_id, 0)
    seen[item_id] = count + 1
    if count == 0:
        return item_id
    return f"{item_id}-{count + 1}"


def normalize_menu(menu: dict[str, Any], currency: str) -> dict[str, Any]:
    seen_ids: dict[str, int] = {}
    normalized_sections: list[dict[str, Any]] = []

    for section in menu.get("sections", []):
        section_name = str(section.get("name") or "Menu").strip()
        section_id = slugify(str(section.get("id") or section_name))
        normalized_items: list[dict[str, Any]] = []

        for item in section.get("items", []):
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            description = str(item.get("description") or "").strip()
            normalized_name = normalize_text(name)
            base_item_id = f"dish_{slugify(name)}"
            item_id = dedupe_item_id(base_item_id, seen_ids)

            normalized_items.append(
                {
                    "item_id": item_id,
                    "kind": "dish",
                    "section_id": section_id,
                    "name": name,
                    "normalized_name": normalized_name,
                    "description": description,
                    "price": item.get("price"),
                    "currency": item.get("currency") or currency,
                }
            )

        normalized_sections.append(
            {
                "id": section_id,
                "name": section_name,
                "items": normalized_items,
            }
        )

    return {
        "restaurant_id": menu["restaurant_id"],
        "source_type": menu.get("source_type", "unknown"),
        "sections": normalized_sections,
    }


def connector_script(connector_id: str, label: str) -> str:
    scripts = {
        "connector_welcome": "Hola, soy Sol. Te acompano a recorrer la carta y elegir algo rico.",
        "connector_entradas": "Arranquemos por las entradas. Son opciones ideales para compartir y abrir el apetito.",
        "connector_principales": "Ahora vamos con los principales. Aca estan los platos fuertes de la carta.",
        "connector_bebidas": "Te muestro las bebidas para acompanar mejor tu pedido.",
        "connector_postres": "Si queres cerrar con algo dulce, estos son los postres disponibles.",
        "connector_add_to_order": "Perfecto, lo agrego a tu pedido para que sigas eligiendo tranquilo.",
        "connector_more_options": "Tambien podes ver mas opciones antes de decidir.",
        "connector_checkout": "Cuando estes listo, revisamos el pedido y avanzamos al cierre.",
    }
    return scripts.get(connector_id, f"Seguimos con {label}.")


def dish_script(item: dict[str, Any]) -> str:
    if item["description"]:
        return f"Te recomiendo {item['name']}. {item['description']}"
    return f"Te recomiendo {item['name']}. Es una opcion para tener en cuenta dentro de {item['section_id'].replace('-', ' ')}."


def cache_key(*parts: str) -> str:
    payload = " | ".join(normalize_text(part) for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def canonical_dish_id(name: str) -> str:
    return f"dish_{slugify(name)}"


def build_jobs(
    normalized_menu: dict[str, Any],
    avatar_id: str,
    avatar_version: str,
    voice_id: str,
    render_profile: str,
    language: str,
) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    restaurant_id = normalized_menu["restaurant_id"]

    for connector_id, connector_kind, label in CONNECTORS:
        script = connector_script(connector_id, label)
        canonical_id = connector_id
        key = cache_key(avatar_id, avatar_version, voice_id, render_profile, language, script)
        jobs.append(
            {
                "job_id": key,
                "restaurant_id": restaurant_id,
                "item_id": connector_id,
                "canonical_id": canonical_id,
                "kind": "connector",
                "connector_kind": connector_kind,
                "name": label,
                "script": script,
                "avatar_id": avatar_id,
                "avatar_version": avatar_version,
                "voice_id": voice_id,
                "render_profile": render_profile,
                "language": language,
                "cache_key": key,
                "output_path": f"output/videos/{restaurant_id}/{avatar_id}/{avatar_version}/{connector_id}.webm",
            }
        )

    for section in normalized_menu["sections"]:
        for item in section["items"]:
            script = dish_script(item)
            canonical_id = canonical_dish_id(item["name"])
            key = cache_key(avatar_id, avatar_version, voice_id, render_profile, language, script)
            jobs.append(
                {
                    "job_id": key,
                    "restaurant_id": restaurant_id,
                    "item_id": item["item_id"],
                    "canonical_id": canonical_id,
                    "kind": "dish",
                    "section_id": item["section_id"],
                    "name": item["name"],
                    "script": script,
                    "avatar_id": avatar_id,
                    "avatar_version": avatar_version,
                    "voice_id": voice_id,
                    "render_profile": render_profile,
                    "language": language,
                    "cache_key": key,
                    "output_path": f"output/videos/{restaurant_id}/{avatar_id}/{avatar_version}/{item['item_id']}.webm",
                }
            )

    return jobs


def write_outputs(normalized_menu: dict[str, Any], jobs: list[dict[str, Any]], output_dir: Path) -> None:
    normalized_dir = output_dir / "normalized"
    jobs_dir = output_dir / "jobs"
    normalized_dir.mkdir(parents=True, exist_ok=True)
    jobs_dir.mkdir(parents=True, exist_ok=True)

    (normalized_dir / "menu.normalized.json").write_text(
        json.dumps(normalized_menu, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    with (jobs_dir / "render_jobs.jsonl").open("w", encoding="utf-8") as handle:
        for job in jobs:
            handle.write(json.dumps(job, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest restaurant menu and create deterministic render jobs.")
    parser.add_argument("--input", required=True, help="Path to .txt or .json menu input")
    parser.add_argument("--restaurant-id", required=True)
    parser.add_argument("--avatar-id", default="sol")
    parser.add_argument("--avatar-version", default="v1")
    parser.add_argument("--voice-id", default="sol_ar_v1")
    parser.add_argument("--render-profile", default="webm-alpha-v1")
    parser.add_argument("--language", default="es-AR")
    parser.add_argument("--currency", default="ARS")
    parser.add_argument("--output", default="output")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output)

    raw_menu = load_menu(input_path, args.restaurant_id, args.currency)
    normalized_menu = normalize_menu(raw_menu, args.currency)
    jobs = build_jobs(
        normalized_menu=normalized_menu,
        avatar_id=args.avatar_id,
        avatar_version=args.avatar_version,
        voice_id=args.voice_id,
        render_profile=args.render_profile,
        language=args.language,
    )
    write_outputs(normalized_menu, jobs, output_dir)

    dish_count = sum(len(section["items"]) for section in normalized_menu["sections"])
    connector_count = len(CONNECTORS)
    print(f"OK: {dish_count} dishes + {connector_count} connectors = {len(jobs)} render jobs")
    print(f"Wrote: {output_dir / 'normalized' / 'menu.normalized.json'}")
    print(f"Wrote: {output_dir / 'jobs' / 'render_jobs.jsonl'}")


if __name__ == "__main__":
    main()
