"""
Agente Investigador — QuantumHive
=================================

Scrapea una cuenta pública de Instagram y produce un `perfil.md` con los datos
del negocio y la esencia de marca. El output alimenta directamente el system
prompt del bot de atención al cliente.

Uso:
    python agente_investigador.py --handle yaspapeobeauty
    python agente_investigador.py --handle yaspapeobeauty --max-posts 100
    python agente_investigador.py --handle otrocliente --max-posts 30

Variables de entorno requeridas (en .env junto al script):
    APIFY_API_TOKEN
    GEMINI_API_KEY

Salida:
    <repo>/agencia/clientes/<handle>/perfil.md
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

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

APIFY_INSTAGRAM_ACTOR = "apify/instagram-scraper"
GEMINI_MODEL = "gemini-1.5-pro"


def run_apify_actor(client: ApifyClient, run_input: dict, label: str) -> list:
    """Ejecuta el actor de Apify y devuelve la lista de items. Loggea progreso."""
    print(f"      - {label}...")
    run = client.actor(APIFY_INSTAGRAM_ACTOR).call(run_input=run_input)
    if not run:
        return []
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"        OK ({len(items)} items)")
    return items


def scrape_instagram(handle: str, max_posts: int, include_stories: bool) -> dict:
    """Scrapea bio + posts + comments + stories + highlights del perfil."""
    print(f"[1/4] Scrapeando @{handle} con Apify...")
    client = ApifyClient(APIFY_API_TOKEN)
    clean_handle = handle.lstrip("@")
    profile_url = f"https://www.instagram.com/{clean_handle}/"

    # 1. Posts (incluye comments y datos del owner por addParentData).
    posts_input = {
        "directUrls": [profile_url],
        "resultsType": "posts",
        "resultsLimit": max_posts,
        "addParentData": True,
    }
    posts = run_apify_actor(client, posts_input, f"Posts (máx {max_posts}) + comments")

    # 2. Stories activas (24h). Pueden no existir.
    stories = []
    if include_stories:
        stories_input = {
            "directUrls": [profile_url],
            "resultsType": "stories",
        }
        try:
            stories = run_apify_actor(client, stories_input, "Stories activas (24h)")
        except Exception as e:
            print(f"        (sin stories o error: {e})")

    # 3. Highlights (stories guardadas).
    highlights_input = {
        "directUrls": [profile_url],
        "resultsType": "highlights",
    }
    try:
        highlights = run_apify_actor(client, highlights_input, "Highlights")
    except Exception as e:
        print(f"        (sin highlights o error: {e})")
        highlights = []

    return {
        "handle": clean_handle,
        "posts": posts,
        "stories": stories,
        "highlights": highlights,
    }


def extract_owner_profile(posts_items: list) -> dict:
    """Extrae los datos del perfil del primer item (que tiene addParentData)."""
    if not posts_items:
        return {}
    first = posts_items[0]
    return {
        "handle": first.get("ownerUsername", ""),
        "nombre_comercial": first.get("ownerFullName", ""),
        "bio": first.get("ownerBiography", ""),
        "followers": first.get("ownerFollowersCount"),
        "following": first.get("ownerFollowingCount"),
        "posts_count": first.get("ownerPostsCount"),
        "external_url": first.get("ownerExternalUrl", ""),
        "is_verified": first.get("ownerIsVerified", False),
    }


def extract_all_comments(post: dict) -> list:
    """Devuelve TODOS los comments de un post, no muestra."""
    comments = []
    # Apify devuelve los comments en varios campos según versión.
    for c in post.get("latestComments", []) or []:
        text = c.get("text") or c.get("caption") or ""
        if text:
            comments.append(text)
    # A veces vienen separados por tipo.
    for c in post.get("comments", []) or []:
        text = c.get("text") or c.get("caption") or ""
        if text and text not in comments:
            comments.append(text)
    return comments


def build_corpus(scraped: dict, profile: dict) -> str:
    """Arma el corpus completo: bio + posts + TODOS los comments + stories + highlights."""
    print("[2/4] Armando corpus para Gemini...")

    chunks = []

    # Sección 1: datos del perfil.
    chunks.append("=== DATOS DEL PERFIL ===")
    for k, v in profile.items():
        if v not in (None, "", 0):
            chunks.append(f"{k}: {v}")

    # Sección 2: posts con TODOS los comments.
    chunks.append("\n=== POSTS + TODOS LOS COMENTARIOS DE LA AUDIENCIA ===")
    for i, post in enumerate(scraped["posts"], start=1):
        post_type = post.get("type", "post")
        caption = post.get("caption", "") or ""
        likes = post.get("likesCount", 0)
        comments_count = post.get("commentsCount", 0)
        url = post.get("url", "")
        timestamp = post.get("timestamp", "")
        all_comments = extract_all_comments(post)

        chunks.append(f"\n--- Post {i} [{post_type}] | {timestamp} | likes: {likes} | comments totales: {comments_count} ---")
        chunks.append(f"URL: {url}")
        if caption:
            chunks.append(f"CAPTION: {caption}")
        if all_comments:
            chunks.append(f"TODOS LOS COMENTARIOS DE LA AUDIENCIA ({len(all_comments)}):")
            for c in all_comments:
                chunks.append(f"  - {c}")
        else:
            chunks.append("(sin comentarios)")

    # Sección 3: stories activas.
    if scraped.get("stories"):
        chunks.append("\n=== STORIES ACTIVAS (últimas 24h) ===")
        for i, story in enumerate(scraped["stories"], start=1):
            story_type = story.get("type", "story")
            text = story.get("text", "") or story.get("caption", "")
            if text:
                chunks.append(f"Story {i} [{story_type}]: {text}")

    # Sección 4: highlights (títulos).
    if scraped.get("highlights"):
        chunks.append("\n=== HIGHLIGHTS (stories guardadas) ===")
        seen_titles = set()
        for h in scraped["highlights"]:
            title = h.get("title", "")
            if title and title not in seen_titles:
                seen_titles.add(title)
                chunks.append(f"- {title}")

    corpus = "\n".join(chunks)
    print(f"      OK: corpus de {len(corpus)} caracteres ({len(scraped['posts'])} posts, {len(scraped.get('stories', []))} stories, {len(scraped.get('highlights', []))} highlights)")
    return corpus


EXTRACTION_PROMPT = """Sos un analista de marca y UX writer senior. Recibiste el contenido público completo de una cuenta de Instagram (bio, posts, todos los comentarios de la audiencia, stories activas e highlights).

Tu trabajo es extraer la información del negocio y la esencia de marca para alimentar el system prompt de un chatbot que va a atender a los clientes de este negocio en nombre de la marca.

NO inventes datos. Si un campo no aparece o no se puede inferir con confianza, devolvé null o "no detectado". Sé concreto: extraé frases textuales cuando las veas, no parafrasees. Capturá las preguntas reales de la audiencia (vienen de los comentarios) y los temas que la marca repite.

Devolvé un JSON estricto con esta estructura:

{{
  "datos_negocio": {{
    "nombre_comercial": null,
    "rubro": null,
    "ubicacion": null,
    "bio": null,
    "link_en_bio": null,
    "contacto_detectado": null,
    "servicios_detectados": [],
    "productos_detectados": [],
    "horarios_detectados": null
  }},
  "esencia_marca": {{
    "tono_de_voz": {{
      "personalidad_general": null,
      "vocabulario_tipico": [],
      "frases_propias_textuales": [],
      "tratamiento": null,
      "ejemplo_caption_real": null
    }},
    "valores_y_propuesta": {{
      "argumentos_de_confianza": [],
      "diferencial_detectado": null,
      "publico_objetivo_inferido": null
    }},
    "estetica": {{
      "paleta_de_colores_inferida": null,
      "tipo_de_contenido": [],
      "hashtags_propios": []
    }},
    "temas_recurrentes": [],
    "preguntas_frecuentes_de_la_audiencia": [],
    "objeciones_comunes": []
  }},
  "notas_para_system_prompt": {{
    "personalidad_resumida": null,
    "como_hablar": null,
    "que_no_inventar": [],
    "derivar_a_humano_si": []
  }}
}}

CORPUS COMPLETO:
{corpus}

Devolvé SOLO el JSON válido, sin texto adicional, sin markdown, sin explicaciones, sin backticks."""


def analyze_with_gemini(corpus: str) -> dict:
    """Envía el corpus a Gemini 1.5 Pro y devuelve el JSON estructurado."""
    print("[3/4] Analizando con Gemini 1.5 Pro...")
    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = EXTRACTION_PROMPT.format(corpus=corpus)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "temperature": 0.2,
        },
    )
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"      WARN: Gemini no devolvió JSON limpio. Guardando raw. Error: {e}")
        print(f"      Raw (primeros 500 chars): {text[:500]}")
        data = {"_raw_gemini_response": text, "_error": str(e)}
    print("      OK: análisis recibido.")
    return data


def render_perfil_md(handle: str, scraped: dict, profile: dict, analysis: dict) -> str:
    """Formatea el JSON de Gemini como Markdown legible (perfil.md)."""
    print("[4/4] Renderizando perfil.md...")

    datos = analysis.get("datos_negocio") or {}
    esencia = analysis.get("esencia_marca") or {}
    tono = esencia.get("tono_de_voz") or {}
    valores = esencia.get("valores_y_propuesta") or {}
    estetica = esencia.get("estetica") or {}
    notas = analysis.get("notas_para_system_prompt") or {}

    def lista(items, prefix="- "):
        if not items:
            return f"{prefix}(no detectado)\n"
        return "".join(f"{prefix}{i}\n" for i in items)

    # Conteos reales scrapeados (útil para el bot saber qué tan completa es la base).
    n_posts = len(scraped.get("posts", []))
    n_stories = len(scraped.get("stories", []))
    n_highlights = len(scraped.get("highlights", []))

    md = f"""# Perfil de @{handle}

> Generado el {datetime.now().strftime("%Y-%m-%d %H:%M")} por el Agente Investigador de QuantumHive.
> Insumo principal para el system prompt del bot. NO reemplaza la info que el cliente dé en persona.

## Datos scrapeados del perfil

- **Handle:** @{profile.get("handle", handle)}
- **Nombre comercial (IG):** {profile.get("nombre_comercial") or "(no detectado)"}
- **Bio:** {profile.get("bio") or "(no detectada)"}
- **Link en bio:** {profile.get("external_url") or "(no detectado)"}
- **Seguidores:** {profile.get("followers") or "(no detectado)"}
- **Posts publicados:** {profile.get("posts_count") or "(no detectado)"}
- **Verificado:** {"Sí" if profile.get("is_verified") else "No"}
- **Posts analizados en esta corrida:** {n_posts}
- **Stories activas scrapeadas:** {n_stories}
- **Highlights scrapeados:** {n_highlights}

## Datos del negocio (interpretados por Gemini)

- **Nombre comercial:** {datos.get("nombre_comercial") or "(no detectado)"}
- **Rubro:** {datos.get("rubro") or "(no detectado)"}
- **Ubicación:** {datos.get("ubicacion") or "(no detectada)"}
- **Link en bio (canal de venta):** {datos.get("link_en_bio") or "(no detectado)"}
- **Contacto detectado:** {datos.get("contacto_detectado") or "(no detectado)"}
- **Horarios detectados:** {datos.get("horarios_detectados") or "(no detectados)"}
- **Servicios detectados:** {", ".join(datos.get("servicios_detectados") or []) or "(ninguno)"}
- **Productos detectados:** {", ".join(datos.get("productos_detectados") or []) or "(ninguno)"}

## Esencia de marca

### Tono de voz
- **Personalidad general:** {tono.get("personalidad_general") or "(no detectada)"}
- **Tratamiento (tú/usted/vos):** {tono.get("tratamiento") or "(no detectado)"}
- **Ejemplo de caption real:** {tono.get("ejemplo_caption_real") or "(no detectado)"}
- **Vocabulario típico:**
{lista(tono.get("vocabulario_tipico"))}
- **Frases propias (textuales):**
{lista(tono.get("frases_propias_textuales"))}

### Valores y propuesta
- **Diferencial detectado:** {valores.get("diferencial_detectado") or "(no detectado)"}
- **Público objetivo inferido:** {valores.get("publico_objetivo_inferido") or "(no detectado)"}
- **Argumentos de confianza:**
{lista(valores.get("argumentos_de_confianza"))}

### Estética
- **Paleta de colores inferida:** {estetica.get("paleta_de_colores_inferida") or "(no detectada)"}
- **Tipo de contenido:** {", ".join(estetica.get("tipo_de_contenido") or []) or "(no detectado)"}
- **Hashtags propios:** {", ".join(estetica.get("hashtags_propios") or []) or "(ninguno)"}

### Temas recurrentes
{lista(esencia.get("temas_recurrentes"))}

### Preguntas frecuentes reales de la audiencia (de los comments)
{lista(esencia.get("preguntas_frecuentes_de_la_audiencia"))}

### Objeciones comunes detectadas
{lista(esencia.get("objeciones_comunes"))}

## Notas para el system prompt del bot

- **Personalidad resumida:** {notas.get("personalidad_resumida") or "(no definida)"}
- **Cómo debe hablar:** {notas.get("como_hablar") or "(no definido)"}
- **Qué NO inventar (datos sensibles que el bot no debe asegurar):**
{lista(notas.get("que_no_inventar"))}
- **Derivar a humano si:**
{lista(notas.get("derivar_a_humano_si"))}

## Metadata

- **Generado:** {datetime.now().isoformat()}
- **Handle:** @{handle}
- **Posts analizados:** {n_posts}
- **Stories scrapeadas:** {n_stories}
- **Highlights scrapeados:** {n_highlights}
"""
    return md


def save_perfil(handle: str, content: str, output_dir: Path) -> Path:
    """Guarda el perfil.md en la carpeta del cliente. Crea el directorio si no existe."""
    clean_handle = handle.lstrip("@")
    target = output_dir / clean_handle
    target.mkdir(parents=True, exist_ok=True)
    filepath = target / "perfil.md"
    filepath.write_text(content, encoding="utf-8")
    return filepath


def main():
    parser = argparse.ArgumentParser(
        description="Agente Investigador de QuantumHive. Scrapea una cuenta de IG y produce un perfil.md reusable."
    )
    parser.add_argument("--handle", required=True, help="Handle de Instagram (con o sin @)")
    parser.add_argument("--max-posts", type=int, default=50, help="Máximo de posts a scrapear (default: 50)")
    parser.add_argument("--no-stories", action="store_true", help="Saltar el scrapeo de stories activas")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent.parent / "clientes",
        help="Directorio base donde se crea <handle>/perfil.md (default: ../../clientes relativo al script)",
    )
    args = parser.parse_args()

    scraped = scrape_instagram(
        handle=args.handle,
        max_posts=args.max_posts,
        include_stories=not args.no_stories,
    )
    if not scraped["posts"]:
        sys.exit(f"ERROR: No se obtuvieron posts de @{args.handle}. ¿La cuenta es privada? ¿El handle es correcto?")

    profile = extract_owner_profile(scraped["posts"])
    corpus = build_corpus(scraped, profile)
    analysis = analyze_with_gemini(corpus)
    md = render_perfil_md(args.handle, scraped, profile, analysis)
    filepath = save_perfil(args.handle, md, args.output_dir)
    print(f"\nListo. Perfil guardado en: {filepath}")
    print(f"Próximo paso: revisar el archivo, ajustar con info del cliente real si hace falta, y usarlo como base del system prompt del bot.")


if __name__ == "__main__":
    main()
