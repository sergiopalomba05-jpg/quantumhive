# Agente Investigador — QuantumHive
# Extrae el contenido público de una cuenta de Instagram y produce un perfil.md
# con los datos del negocio y la esencia de marca.
#
# Uso:
#   python agente_investigador.py --handle yaspapeobeauty
#   python agente_investigador.py --handle yaspapeobeauty --max-posts 50 --max-reels 3
#
# Variables de entorno requeridas (.env):
#   APIFY_API_TOKEN
#   GEMINI_API_KEY

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from apify_client import ApifyClient
from dotenv import load_dotenv
from google import genai

# Cargar .env desde el directorio del script
load_dotenv(Path(__file__).parent / ".env")

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not APIFY_API_TOKEN:
    sys.exit("ERROR: APIFY_API_TOKEN no está definido en .env")
if not GEMINI_API_KEY:
    sys.exit("ERROR: GEMINI_API_KEY no está definido en .env")

# Actor de Apify para Instagram. Verificar vigencia antes de usar (regla #6 de CLAUDE.md).
# Búsqueda: https://apify.com/store?search=instagram%20scraper
# Ajustar este ID si el actor cambia o si se prefiere uno de la comunidad.
APIFY_INSTAGRAM_ACTOR = "apify/instagram-scraper"

# Modelo de Gemini. 1.5 Pro tiene contexto grande y es multimodal (barato para texto).
GEMINI_MODEL = "gemini-1.5-pro"


def scrape_instagram(handle: str, max_posts: int) -> dict:
    """Corre el actor de Apify para obtener bio, posts, comentarios y métricas."""
    print(f"[1/4] Scrapeando @{handle} con Apify (máx {max_posts} posts)...")
    client = ApifyClient(APIFY_API_TOKEN)
    clean_handle = handle.lstrip("@")
    run_input = {
        "directUrls": [f"https://www.instagram.com/{clean_handle}/"],
        "resultsType": "posts",
        "resultsLimit": max_posts,
        "addParentData": True,
    }
    run = client.actor(APIFY_INSTAGRAM_ACTOR).call(run_input=run_input)
    if not run:
        sys.exit("ERROR: Apify no devolvió resultados. Verificar token, actor vigente o privacidad de la cuenta.")
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"      OK: {len(items)} posts scrapeados.")
    return {
        "handle": clean_handle,
        "items": items,
    }


def build_corpus(scraped: dict) -> str:
    """Construye un corpus de texto con bio, captions y comentarios para Gemini."""
    print("[2/4] Armando corpus de texto para Gemini...")
    items = scraped["items"]
    chunks = []
    for i, post in enumerate(items[:50], start=1):
        caption = post.get("caption", "") or ""
        comments_count = post.get("commentsCount", 0)
        likes = post.get("likesCount", 0)
        post_type = post.get("type", "post")
        url = post.get("url", "")
        chunks.append(
            f"--- Post {i} ({post_type}) | likes: {likes} | comments: {comments_count} ---\n"
            f"URL: {url}\n"
            f"caption: {caption}\n"
        )
    corpus = "\n".join(chunks)
    print(f"      OK: corpus de {len(corpus)} caracteres.")
    return corpus


EXTRACTION_PROMPT = """Sos un analista de marca. Recibiste el contenido público de una cuenta de Instagram.
Tu trabajo es extraer los datos del negocio y la esencia de marca para alimentar el system prompt
de un chatbot que va a atender a los clientes de este negocio en nombre de la marca.

NO inventes datos. Si un campo no aparece o no se puede inferir con confianza, devolvé null o
"no detectado". Sé concreto: extraé frases textuales cuando las veas, no parafrasees.

Devolvé un JSON estricto con esta estructura:

{
  "datos_negocio": {
    "nombre_comercial": null,
    "rubro": null,
    "ubicacion": null,
    "bio": null,
    "link_en_bio": null,
    "contacto_detectado": null,
    "servicios_detectados": [],
    "horarios_detectados": null
  },
  "esencia_marca": {
    "tono_de_voz": {
      "personalidad_general": null,
      "vocabulario_tipico": [],
      "frases_propias_textuales": [],
      "tratamiento": null
    },
    "valores_y_propuesta": {
      "argumentos_de_confianza": [],
      "diferencial_detectado": null,
      "publico_objetivo_inferido": null
    },
    "estetica": {
      "paleta_de_colores_inferida": null,
      "tipo_de_contenido": [],
      "hashtags_propios": []
    },
    "preguntas_frecuentes_de_la_audiencia": []
  },
  "notas_para_system_prompt": {
    "personalidad_resumida": null,
    "que_no_inventar": [],
    "derivar_a_humano_si": []
  }
}

CORPUS DE LA CUENTA:
{corpus}

Devolvé SOLO el JSON, sin texto adicional, sin markdown, sin explicaciones."""


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
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"      WARN: Gemini no devolvió JSON limpio. Guardando raw. Error: {e}")
        print(f"      Raw: {text[:500]}...")
        data = {"_raw_gemini_response": text, "_error": str(e)}
    print("      OK: análisis recibido.")
    return data


def render_perfil_md(handle: str, scraped: dict, analysis: dict) -> str:
    """Formatea el JSON de Gemini como Markdown legible (perfil.md)."""
    print("[4/4] Renderizando perfil.md...")
    datos = analysis.get("datos_negocio", {})
    esencia = analysis.get("esencia_marca", {})
    tono = esencia.get("tono_de_voz", {})
    valores = esencia.get("valores_y_propuesta", {})
    estetica = esencia.get("estetica", {})
    faq = esencia.get("preguntas_frecuentes_de_la_audiencia", [])
    notas = analysis.get("notas_para_system_prompt", {})

    def lista(items, prefix="- "):
        if not items:
            return f"{prefix}(no detectado)\n"
        return "".join(f"{prefix}{i}\n" for i in items)

    md = f"""# Perfil de @{handle}

> Generado el {datetime.now().strftime("%Y-%m-%d %H:%M")} por el Agente Investigador de QuantumHive.
> Insumo para el system prompt del bot. NO es un reemplazo de la info real que da el cliente.

## Datos del negocio

- **Nombre comercial:** {datos.get("nombre_comercial") or "(no detectado)"}
- **Rubro:** {datos.get("rubro") or "(no detectado)"}
- **Ubicación:** {datos.get("ubicacion") or "(no detectado)"}
- **Bio:** {datos.get("bio") or "(no detectado)"}
- **Link en bio:** {datos.get("link_en_bio") or "(no detectado)"}
- **Contacto detectado:** {datos.get("contacto_detectado") or "(no detectado)"}
- **Servicios detectados:** {", ".join(datos.get("servicios_detectados") or []) or "(ninguno)"}
- **Horarios detectados:** {datos.get("horarios_detectados") or "(no detectado)"}

## Esencia de marca

### Tono de voz
- **Personalidad general:** {tono.get("personalidad_general") or "(no detectado)"}
- **Tratamiento:** {tono.get("tratamiento") or "(no detectado)"}
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

### Preguntas frecuentes de la audiencia
{lista(faq)}

## Notas para el system prompt del bot

- **Personalidad resumida:** {notas.get("personalidad_resumida") or "(no definida)"}
- **Qué NO inventar:**
{lista(notas.get("que_no_inventar"))}
- **Derivar a humano si:**
{lista(notas.get("derivar_a_humano_si"))}

## Metadata

- **Posts analizados:** {len(scraped.get("items", []))}
- **Handle:** @{handle}
- **Fecha de generación:** {datetime.now().isoformat()}
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
        description="Agente Investigador de QuantumHive. Scrapea una cuenta de IG y produce un perfil.md."
    )
    parser.add_argument("--handle", required=True, help="Handle de Instagram (con o sin @)")
    parser.add_argument("--max-posts", type=int, default=30, help="Máximo de posts a scrapear (default: 30)")
    parser.add_argument("--max-reels", type=int, default=0, help="Máximo de reels a transcribir (default: 0, no transcribe)")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent.parent / "clientes",
        help="Directorio base donde se crea <handle>/perfil.md (default: ../../clientes relativo al script)",
    )
    args = parser.parse_args()

    if args.max_reels > 0:
        print("NOTA: --max-reels > 0 está definido pero la transcripción no está implementada en este skeleton.")
        print("      Próxima iteración: agregar yt-dlp + Whisper para los N reels más vistos.")

    scraped = scrape_instagram(args.handle, args.max_posts)
    corpus = build_corpus(scraped)
    analysis = analyze_with_gemini(corpus)
    md = render_perfil_md(args.handle, scraped, analysis)
    filepath = save_perfil(args.handle, md, args.output_dir)
    print(f"\nListo. Perfil guardado en: {filepath}")
    print(f"Próximo paso: revisar el archivo, ajustar con info del cliente real, y usarlo como base del system prompt del bot.")


if __name__ == "__main__":
    main()
