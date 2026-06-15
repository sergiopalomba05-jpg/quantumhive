"""
Agente Catalogador de Fábricas — QuantumHive
============================================

Busca fábricas en Argentina por rubro y produce un `.md` por fábrica con
contacto, catálogo y datos relevantes para evaluar si sirve como proveedor
mayorista de Directimport.

Uso:
    python catalogador.py --categoria textiles
    python catalogador.py --categoria tecnologia --max-fabricas 20
    python catalogador.py --categoria bicicletas --region "Córdoba"
    python catalogador.py --categoria zapatillas --region "CABA, GBA"

Variables de entorno requeridas (en .env junto al script):
    APIFY_API_TOKEN
    GEMINI_API_KEY

Salida:
    <repo>/agencia/clientes/mayorista/fabricas/<categoria>/<slug>.md
    (un archivo por fábrica, idempotente — salta las que ya existen)
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from apify_client import ApifyClient
from dotenv import load_dotenv
from google import genai

load_dotenv(Path(__file__).parent / ".env")

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not APIFY_API_TOKEN:
    sys.exit("ERROR: APIFY_API_TOKEN no está definido en .env")
if not GEMINI_API_KEY:
    sys.exit("ERROR: GEMINI_API_KEY no está definido en .env")

# Actor de Apify para Google Maps. Verificar vigencia antes de usar (regla #6).
# Búsqueda: https://apify.com/store?search=google%20maps%20scraper
# Alternativas: compass/google-maps-scraper, drobnikj/google-maps-scraper.
GMAPS_ACTOR = "compass/google-maps-scraper"
GEMINI_MODEL = "gemini-1.5-pro"

# Queries de búsqueda por rubro. Cada rubro tiene 4-5 variantes para
# maximizar la cobertura en Google Maps.
DEFAULT_QUERIES = {
    "textiles": [
        "fábrica textil",
        "fábrica de ropa",
        "manufactura textil",
        "taller de confección industrial",
        "fábrica de indumentaria",
    ],
    "tecnologia": [
        "fábrica de electrónica",
        "fabricante de tecnología",
        "manufactura electrónica",
        "fábrica de auriculares",
        "ensambladora de tecnología",
    ],
    "bicicletas": [
        "fábrica de bicicletas",
        "fabricante de bicicletas",
        "manufactura de bicicletas",
        "fábrica rodados",
    ],
    "zapatillas": [
        "fábrica de zapatillas",
        "fabricante de calzado deportivo",
        "manufactura de zapatillas",
        "fábrica de calzado deportivo",
        "calzado deportivo fábrica",
    ],
}


def slugify(text: str) -> str:
    """Convierte texto en slug seguro para nombre de archivo."""
    text = (text or "").lower().strip()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or "sin-nombre"


def run_apify_actor(client: ApifyClient, run_input: dict, label: str) -> list:
    """Ejecuta un actor de Apify y devuelve la lista de items."""
    print(f"      - {label}...")
    run = client.actor(GMAPS_ACTOR).call(run_input=run_input)
    if not run:
        return []
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"        OK ({len(items)} items)")
    return items


def search_factories(category: str, region: str, max_factories: int) -> list:
    """Busca fábricas del rubro en la región con Google Maps vía Apify."""
    print(f"[1/3] Buscando fábricas de '{category}' en '{region}'...")
    client = ApifyClient(APIFY_API_TOKEN)

    queries = DEFAULT_QUERIES.get(category, [f"fábrica de {category}"])

    all_places = []
    for query in queries:
        run_input = {
            "searchQuery": f"{query} en {region}",
            "maxCrawledPlaces": max_factories,
            "language": "es",
            "countryCode": "ar",
            "includeWebResults": False,
            "scrapePlaceDetailPage": True,
            "scrapeDirectories": False,
            "maxReviews": 0,
            "maxImages": 0,
        }
        try:
            items = run_apify_actor(client, run_input, f"Query: '{query}'")
            for item in items:
                item["_query"] = query
                all_places.append(item)
        except Exception as e:
            print(f"        (error en query '{query}': {e})")
            continue

    # Deduplicar por nombre+address.
    seen = set()
    unique = []
    for place in all_places:
        key = (place.get("title", "").lower(), (place.get("address") or "").lower())
        if key in seen or not place.get("title"):
            continue
        seen.add(key)
        unique.append(place)

    # Filtrar las que tienen website (para poder scrapeár el catálogo).
    with_website = [p for p in unique if p.get("website") or p.get("url")]

    print(f"      Total únicos: {len(unique)} | Con website: {len(with_website)}")
    return with_website[:max_factories]


def fetch_website(url: str, timeout: int = 15) -> str:
    """Trae el HTML del sitio web (cap a 50K chars). Devuelve "" si falla."""
    if not url:
        return ""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
        return response.text[:50000]
    except Exception as e:
        print(f"        (no se pudo fetchear {url}: {str(e)[:80]})")
        return ""


FACTORY_EXTRACTION_PROMPT = """Sos un analista B2B mayorista argentino. Recibiste datos crudos de un posible fabricante en Argentina (de Google Maps y de su sitio web).

Tu trabajo es extraer los datos relevantes para evaluar si sirve como PROVEEDOR MAYORISTA para una plataforma de venta al por mayor.

Devolvé SOLO un JSON estricto con esta estructura (sin markdown, sin backticks, sin texto adicional):

{{
  "nombre": null,
  "rubro": null,
  "sub_rubro": null,
  "ubicacion": {{
    "direccion": null,
    "ciudad": null,
    "provincia": null,
    "pais": "Argentina"
  }},
  "contacto": {{
    "telefono": null,
    "email": null,
    "web": null,
    "instagram": null,
    "facebook": null,
    "whatsapp": null
  }},
  "productos": [],
  "categorias_productos": [],
  "capacidad_estimada": null,
  "certificaciones": [],
  "ofrece_mayorista": null,
  "minimo_de_pedido": null,
  "condiciones_comerciales": null,
  "rating_google": null,
  "resenas_count": null,
  "notas": null,
  "es_relevante_para_revender": null,
  "razon_relevancia": null
}}

Reglas:
- NO inventes datos. Si no aparece, devolvé null o lista vacía.
- En "productos" listá productos concretos que detectes (ej: ["remeras básicas", "buzos", "camperas rompeviento"]).
- En "categorias_productos" las categorías generales (ej: ["indumentaria", "deportivo"]).
- En "ofrece_mayorista" respondé "si" / "no" / "no_detectado" según lo que se vea en la web.
- "es_relevante_para_revender" debe ser "si" o "no" según tu evaluación de si conviene sumarlo a una plataforma B2B.
- Sé conciso en los textos.

DATOS DE GOOGLE MAPS:
{place_json}

CONTENIDO DE SU SITIO WEB (extracto, puede estar vacío):
{website_excerpt}
"""


def analyze_factory_with_gemini(place: dict, website_html: str) -> dict:
    """Envía los datos de la fábrica a Gemini y devuelve JSON estructurado."""
    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = FACTORY_EXTRACTION_PROMPT.format(
        place_json=json.dumps(place, ensure_ascii=False, indent=2)[:8000],
        website_excerpt=(website_html or "(sin contenido de web)")[:20000],
    )
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application-json" if False else "application/json",
            "temperature": 0.2,
        },
    )
    text = response.text.strip()
    if text.startswith("```"):
        parts = text.split("```", 2)
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"        (WARN: Gemini no devolvió JSON limpio: {e})")
        return {"_raw": text[:2000], "_error": str(e)}


def render_factory_md(place: dict, analysis: dict) -> str:
    """Formatea los datos como Markdown legible."""
    nombre = analysis.get("nombre") or place.get("title", "Sin nombre")
    ubic = analysis.get("ubicacion") or {}
    cont = analysis.get("contacto") or {}
    productos = analysis.get("productos") or []
    cats = analysis.get("categorias_productos") or []
    certs = analysis.get("certificaciones") or []

    def lista(items, prefix="- "):
        if not items:
            return f"{prefix}(no detectado)\n"
        return "".join(f"{prefix}{i}\n" for i in items)

    md = f"""# {nombre}

> Generado el {datetime.now().strftime("%Y-%m-%d %H:%M")} por el Agente Catalogador de QuantumHive.
> Candidato a proveedor mayorista para el catálogo de Directimport.

## Datos básicos

- **Nombre:** {nombre}
- **Rubro:** {analysis.get("rubro") or "(no detectado)"}
- **Sub-rubro:** {analysis.get("sub_rubro") or "(no detectado)"}
- **Capacidad estimada:** {analysis.get("capacidad_estimada") or "(no detectada)"}
- **Rating Google:** {analysis.get("rating_google") or place.get("totalScore", "(no)")} ({analysis.get("resenas_count") or place.get("reviewsCount", 0)} reseñas)

## Ubicación

- **Dirección:** {ubic.get("direccion") or place.get("address", "(no detectada)")}
- **Ciudad:** {ubic.get("ciudad") or "(no detectada)"}
- **Provincia:** {ubic.get("provincia") or "(no detectada)"}
- **País:** {ubic.get("pais") or "Argentina"}

## Contacto

- **Web:** {cont.get("web") or place.get("website") or "(no detectada)"}
- **Teléfono:** {cont.get("telefono") or place.get("phone", "(no detectado)")}
- **Email:** {cont.get("email") or "(no detectado)"}
- **WhatsApp:** {cont.get("whatsapp") or "(no detectado)"}
- **Instagram:** {cont.get("instagram") or "(no detectado)"}
- **Facebook:** {cont.get("facebook") or "(no detectado)"}

## Productos

- **Categorías:** {", ".join(cats) if cats else "(no detectadas)"}
- **Productos detectados:**
{lista(productos, prefix="  - ")}

## Condiciones comerciales

- **¿Ofrece mayorista?:** {analysis.get("ofrece_mayorista") or "(no detectado)"}
- **Mínimo de pedido:** {analysis.get("minimo_de_pedido") or "(no detectado)"}
- **Condiciones comerciales:** {analysis.get("condiciones_comerciales") or "(no detectadas)"}

## Certificaciones

{lista(certs)}

## Evaluación

- **¿Es relevante para revender?:** {analysis.get("es_relevante_para_revender") or "(no evaluado)"}
- **Razón:** {analysis.get("razon_relevancia") or "(no indicada)"}

## Notas

{analysis.get("notas") or "(sin notas)"}

## Metadata

- **Query que la encontró:** {place.get("_query", "(desconocida)")}
- **Fuente Google Maps:** {place.get("url") or place.get("placeId") or "(no disponible)"}
- **Generado:** {datetime.now().isoformat()}
"""
    return md


def save_factory(category: str, name: str, content: str, output_dir: Path, skip_existing: bool = True):
    """Guarda la fábrica como .md. Devuelve la ruta o None si ya existía."""
    target = output_dir / category
    target.mkdir(parents=True, exist_ok=True)
    slug = slugify(name)[:80]
    filepath = target / f"{slug}.md"
    if skip_existing and filepath.exists():
        return None
    filepath.write_text(content, encoding="utf-8")
    return filepath


def main():
    parser = argparse.ArgumentParser(
        description="Agente Catalogador de Fábricas de QuantumHive. Busca fábricas en Argentina y produce .md por fábrica."
    )
    parser.add_argument(
        "--categoria",
        required=True,
        choices=list(DEFAULT_QUERIES.keys()),
        help="Rubro a investigar: textiles, tecnologia, bicicletas, zapatillas",
    )
    parser.add_argument(
        "--region",
        default="CABA, Gran Buenos Aires",
        help="Región de búsqueda (default: 'CABA, Gran Buenos Aires')",
    )
    parser.add_argument(
        "--max-fabricas",
        type=int,
        default=25,
        help="Máximo de fábricas a procesar (default: 25)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-procesar fábricas que ya tienen .md (default: skip)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent.parent / "clientes" / "mayorista" / "fabricas",
        help="Directorio base de salida",
    )
    args = parser.parse_args()

    places = search_factories(args.categoria, args.region, args.max_fabricas)
    if not places:
        print(f"No se encontraron fábricas de '{args.categoria}' en '{args.region}'.")
        return

    print(f"\n[2/3] Procesando {len(places)} fábricas (website + Gemini)...")
    saved = 0
    skipped = 0
    for i, place in enumerate(places, start=1):
        name = place.get("title", "")
        if not name:
            continue
        print(f"  [{i}/{len(places)}] {name}")

        # Check skip
        target_slug = slugify(name)[:80]
        target_path = args.output_dir / args.categoria / f"{target_slug}.md"
        if args.force or not target_path.exists():
            web_url = place.get("website") or place.get("url")
            html = fetch_website(web_url) if web_url else ""
            analysis = analyze_factory_with_gemini(place, html)
            if not analysis or "_error" in analysis:
                print(f"        (skipping — Gemini no devolvió datos)")
                skipped += 1
                continue
            md = render_factory_md(place, analysis)
            result = save_factory(args.categoria, name, md, args.output_dir, skip_existing=False)
            if result:
                print(f"        OK: {result.name}")
                saved += 1
            else:
                skipped += 1
        else:
            print(f"        skip: {target_path.name} ya existe")
            skipped += 1

        time.sleep(1)  # Rate limit gentil entre llamadas a Gemini

    print(f"\n[3/3] Listo. {saved} fábricas guardadas, {skipped} salteadas.")
    print(f"Output: {args.output_dir / args.categoria}/")


if __name__ == "__main__":
    main()
