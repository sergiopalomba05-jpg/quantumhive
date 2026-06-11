"""
scrape_maps.py — Script 1 de la campana Mundial

Scrapea Google Maps via Apify y produce un CSV crudo con negocios B2B
candidatos para venta de remeras del Mundial.

Uso:
    # Smoke test (una sola query)
    python scrape_maps.py --query "distribuidora indumentaria San Martin" --max 10

    # Corrida completa (cartesiano TIPOS x LOCALIDADES)
    python scrape_maps.py --all --max 30

    # Agregar a un CSV existente
    python scrape_maps.py --query "mayorista ropa Quilmes" --append

Variables de entorno requeridas (en .env junto al script):
    APIFY_API_TOKEN

Salida:
    data/leads_crudo.csv
"""

import argparse
import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
APIFY_ACTOR = "compass/crawler-google-places"

TIPOS = (
    "distribuidora de indumentaria",
    "mayorista de ropa",
    "polirrubro mayorista",
    "local de ropa",
    "casa de deportes",
    "regaleria",
)

LOCALIDADES = (
    "San Martin Buenos Aires",
    "Moron Buenos Aires",
    "La Matanza Buenos Aires",
    "Lomas de Zamora Buenos Aires",
    "Quilmes Buenos Aires",
    "Avellaneda Buenos Aires",
    "Lanus Buenos Aires",
    "Tigre Buenos Aires",
    "San Miguel Buenos Aires",
    "Jose C. Paz Buenos Aires",
    "La Plata Buenos Aires",
    "Mar del Plata",
    "Bahia Blanca",
)

CSV_COLUMNAS = (
    "query",
    "title",
    "phone",
    "address",
    "category",
    "rating",
    "website",
    "place_id",
    "url",
    "scraped_at",
)


def run_query(client, query, max_places):
    """Ejecuta una query contra el actor de Apify y devuelve los items crudos."""
    print(f"      - '{query}' (max {max_places})...")
    run_input = {
        "searchStringsArray": [query],
        "maxCrawledPlacesPerSearch": max_places,
        "language": "es",
        "countryCode": "ar",
    }
    try:
        run = client.actor(APIFY_ACTOR).call(run_input=run_input)
    except Exception as e:
        print(f"        ! Apify fallo: {e}")
        return []
    if not run:
        return []
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"        OK ({len(items)} places)")
    return items


def normalizar_item(item, query):
    """Convierte un item de Apify a una fila plana del CSV."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "query": query,
        "title": item.get("title") or "",
        "phone": item.get("phone") or "",
        "address": item.get("address") or "",
        "category": item.get("categoryName") or "",
        "rating": item.get("totalScore") or "",
        "website": item.get("website") or "",
        "place_id": item.get("placeId") or "",
        "url": item.get("url") or "",
        "scraped_at": now,
    }


def escribir_csv(filas, path, append):
    """Vuelca filas al CSV. Si append=True, agrega; si no, sobreescribe."""
    if not filas:
        print("      ! No hay filas para escribir.")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    modo = "a" if (append and path.exists()) else "w"
    write_header = (modo == "w") or (not path.exists())
    with open(path, modo, encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNAS)
        if write_header:
            writer.writeheader()
        writer.writerows(filas)
    print(f"      - {len(filas)} filas -> {path} ({'append' if modo == 'a' else 'write'})")


def main():
    parser = argparse.ArgumentParser(description="Script 1 — scrapea Google Maps via Apify")
    grp = parser.add_mutually_exclusive_group(required=True)
    grp.add_argument("--query", help="Query unica (modo smoke test)")
    grp.add_argument("--all", action="store_true", help="Cartesiano TIPOS x LOCALIDADES")
    parser.add_argument("--max", type=int, default=50, help="Maximo de places por query")
    parser.add_argument("--output", default="data/leads_crudo.csv", help="Path del CSV")
    parser.add_argument("--append", action="store_true", help="Agregar al CSV existente")
    args = parser.parse_args()

    if not APIFY_API_TOKEN:
        sys.exit("ERROR: APIFY_API_TOKEN no definido en .env")

    output_path = Path(__file__).parent / args.output

    queries = (
        [args.query]
        if args.query
        else [f"{tipo} {loc}" for tipo in TIPOS for loc in LOCALIDADES]
    )

    print(f"[1/2] Ejecutando {len(queries)} query/s contra {APIFY_ACTOR}...")
    client = ApifyClient(APIFY_API_TOKEN)
    total_filas = []
    ok = 0
    fallidas = 0
    for query in queries:
        items = run_query(client, query, args.max)
        if not items:
            fallidas += 1
            continue
        ok += 1
        for item in items:
            total_filas.append(normalizar_item(item, query))

    print(f"[2/2] Escribiendo CSV. Queries OK: {ok}, vacias/fallidas: {fallidas}.")
    escribir_csv(total_filas, output_path, args.append)
    print(f"OK. Total filas: {len(total_filas)}.")


if __name__ == "__main__":
    main()
