"""
procesar_leads.py — Script 2 de la campana Mundial

Lee el CSV crudo de scrape_maps.py, dedupe por telefono, normaliza a wa.me,
clasifica Bultos/Curvas, genera mensaje y link click-to-chat, escribe en
Google Sheet (o solo CSV con --no-sheet).

Uso:
    python procesar_leads.py --no-sheet
    python procesar_leads.py --sheet-id 1abc...XYZ
    python procesar_leads.py --sheet-id 1abc...XYZ --gemini

Variables de entorno requeridas (en .env junto al script):
    APIFY_API_TOKEN     (no se usa en este script, ya estaba en .env)
    GEMINI_API_KEY      (solo si se usa --gemini)
    GCP_SA_JSON_PATH    (solo si se escribe a Google Sheet)
    SHEET_ID            (si no se pasa --sheet-id)

Salida:
    data/leads_procesado.csv        (siempre, respaldo)
    Google Sheet pestana "Leads"    (a menos que --no-sheet)
"""

import argparse
import csv
import os
import re
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


# ---------------------------------------------------------------------------
# Plantillas de mensaje (ASCII-friendly — celus viejos rompen con UTF-8)
# ---------------------------------------------------------------------------

PLANTILLA_BULTOS = (
    "Hola {nombre}, soy mayorista en CABA. Tengo stock fisico inmediato de "
    "remeras de Argentina del Mundial - bulto cerrado de 300 (curva S-XL). "
    "Flete propio a GBA y despacho a expreso para el interior. Se puede "
    "abonar contra entrega. Te paso fotos del galpon y precio por bulto?"
)

PLANTILLA_CURVAS = (
    "Hola {nombre}, mayorista en CABA. Curvas de 10 remeras de Argentina del "
    "Mundial, surtido de talles, listas para colgar. Minimo 1 curva (USD 120). "
    "Entrega en tu local en GBA y pago contra entrega. Te mando fotos y precio?"
)


# ---------------------------------------------------------------------------
# Heuristicas de clasificacion
# ---------------------------------------------------------------------------

KEYWORDS_BULTOS = (
    "distribuidora",
    "distribuidor",
    "mayorista",
    "mayorist",
    "polirrubro",
    "polirubro",
    "por mayor",
    "wholesale",
    "feria",
)

# Curvas se divide en fuertes (estilo retail puro) y debiles (categoria
# generica que cualquier local puede llevar, incluido un polirrubro).
# Solo las fuertes empatan con Bultos y disparan "Dudoso".
KEYWORDS_CURVAS_FUERTES = (
    "boutique",
    "showroom",
    "regaleria",
    "regalería",
    "casa de deportes",
)

KEYWORDS_CURVAS_DEBILES = (
    "local de ropa",
    "tienda",
)


# ---------------------------------------------------------------------------
# Funciones puras (testeables)
# ---------------------------------------------------------------------------


def normalizar_telefono(raw):
    """Normaliza un telefono argentino al formato wa.me (549<area><numero>).

    Devuelve None si el input es invalido o no parece numero argentino.
    """
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if not digits:
        return None
    if digits.startswith("0"):
        digits = digits[1:]
    if digits.startswith("54"):
        digits = digits[2:]
    if digits.startswith("9"):
        digits = digits[1:]
    if len(digits) != 10:
        return None
    return "549" + digits


def clasificar(title, category):
    """Clasifica un negocio en 'Bultos', 'Curvas' o 'Dudoso'.

    Reglas:
      - Bultos + Curvas FUERTE  → Dudoso (conflicto real, no podemos decidir)
      - Bultos solo (con o sin Curvas debil) → Bultos
      - Curvas (fuerte o debil) sin Bultos → Curvas
      - Ninguna → Dudoso
    """
    texto = f"{title or ''} {category or ''}".lower()
    es_bultos = any(kw in texto for kw in KEYWORDS_BULTOS)
    es_curvas_fuerte = any(kw in texto for kw in KEYWORDS_CURVAS_FUERTES)
    es_curvas_debil = any(kw in texto for kw in KEYWORDS_CURVAS_DEBILES)
    if es_bultos and es_curvas_fuerte:
        return "Dudoso"
    if es_bultos:
        return "Bultos"
    if es_curvas_fuerte or es_curvas_debil:
        return "Curvas"
    return "Dudoso"


def render_mensaje(segmento, nombre):
    """Renderiza la plantilla del segmento con el nombre del lead."""
    nombre_limpio = (nombre or "").strip() or "amigo"
    if segmento == "Bultos":
        return PLANTILLA_BULTOS.format(nombre=nombre_limpio)
    if segmento == "Curvas":
        return PLANTILLA_CURVAS.format(nombre=nombre_limpio)
    raise ValueError(f"Segmento desconocido: {segmento}")


def build_wame_link(telefono, mensaje):
    """Genera link click-to-chat de WhatsApp."""
    return f"https://wa.me/{telefono}?text={urllib.parse.quote(mensaje)}"


# ---------------------------------------------------------------------------
# Clasificacion con Gemini (solo dudosos, solo si --gemini)
# ---------------------------------------------------------------------------

PROMPT_GEMINI = """Negocio B2B argentino. Necesito clasificar para venta de remeras del Mundial.
- Bultos = compra 300+ unidades (distribuidoras, mayoristas, polirrubros que revenden al por mayor).
- Curvas = compra 10-50 unidades (locales chicos, showrooms, revendedores barriales).

Negocio:
  Nombre: {title}
  Categoria: {category}
  Direccion: {address}

Responde SOLO con UNA palabra: Bultos o Curvas."""


def clasificar_con_gemini(client, model, title, category, address):
    """Resuelve un caso dudoso con Gemini. Devuelve 'Bultos' o 'Curvas'."""
    prompt = PROMPT_GEMINI.format(
        title=title or "",
        category=category or "",
        address=address or "",
    )
    try:
        response = client.models.generate_content(model=model, contents=prompt)
        texto = (response.text or "").strip().lower()
        if "curvas" in texto:
            return "Curvas"
        if "bultos" in texto:
            return "Bultos"
    except Exception as e:
        print(f"      ! Gemini fallo: {e}. Default a Bultos.")
    return "Bultos"


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------


def leer_crudo(path):
    """Lee el CSV crudo de scrape_maps.py y devuelve lista de dicts."""
    if not path.exists():
        sys.exit(f"ERROR: no existe {path}. Corre primero scrape_maps.py.")
    with open(path, "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def procesar(filas, usar_gemini, gemini_client, gemini_model):
    """Aplica el pipeline a las filas crudas y devuelve filas procesadas."""
    print(f"[1/3] Procesando {len(filas)} filas crudas...")

    # Dedupe por telefono normalizado. Filas sin telefono se descartan.
    vistos = {}
    sin_tel = 0
    for fila in filas:
        tel = normalizar_telefono(fila.get("phone"))
        if not tel:
            sin_tel += 1
            continue
        if tel in vistos:
            continue
        vistos[tel] = fila
        fila["_tel_norm"] = tel

    print(f"      - {len(vistos)} unicos por telefono ({sin_tel} sin telefono)")

    # Clasificar y renderizar mensaje
    procesadas = []
    dudosos = 0
    resueltos_gemini = 0
    for fila in vistos.values():
        title = fila.get("title", "")
        category = fila.get("category", "")
        address = fila.get("address", "")

        segmento = clasificar(title, category)
        if segmento == "Dudoso":
            dudosos += 1
            if usar_gemini and gemini_client:
                segmento = clasificar_con_gemini(
                    gemini_client, gemini_model, title, category, address
                )
                resueltos_gemini += 1
            else:
                segmento = "Bultos"  # default operativo

        mensaje = render_mensaje(segmento, title)
        link = build_wame_link(fila["_tel_norm"], mensaje)

        procesadas.append(
            {
                "nombre": title,
                "telefono": fila["_tel_norm"],
                "segmento": segmento,
                "direccion": address,
                "categoria": category,
                "rating": fila.get("rating", ""),
                "link_wame": link,
                "mensaje": mensaje,
                "estado": "pendiente",
                "notas": "",
                "actualizado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            }
        )

    print(f"      - {dudosos} dudosos ({resueltos_gemini} resueltos por Gemini)")
    print(f"[2/3] Listas {len(procesadas)} filas procesadas.")
    return procesadas


def escribir_csv(procesadas, path):
    """Escribe el CSV procesado."""
    if not procesadas:
        print("      ! Nada para escribir, salgo.")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(procesadas[0].keys()))
        writer.writeheader()
        writer.writerows(procesadas)
    print(f"      - CSV: {path}")


def escribir_sheet(procesadas, sheet_id, sa_json_path):
    """Vuelca a Google Sheet pestana 'Leads'. Idempotente: limpia y reescribe."""
    if not procesadas:
        print("      ! Nada para escribir en Sheet.")
        return
    import gspread  # import perezoso para no obligar la dep si --no-sheet

    gc = gspread.service_account(filename=sa_json_path)
    sh = gc.open_by_key(sheet_id)
    try:
        ws = sh.worksheet("Leads")
        ws.clear()
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(title="Leads", rows=len(procesadas) + 10, cols=15)

    cabecera = list(procesadas[0].keys())
    valores = [cabecera] + [[fila.get(c, "") for c in cabecera] for fila in procesadas]
    ws.update("A1", valores, value_input_option="USER_ENTERED")
    print(f"      - Sheet: https://docs.google.com/spreadsheets/d/{sheet_id}")


def main():
    parser = argparse.ArgumentParser(description="Script 2 — procesar leads de la campana Mundial")
    parser.add_argument("--input", default="data/leads_crudo.csv", help="CSV crudo")
    parser.add_argument("--output", default="data/leads_procesado.csv", help="CSV procesado")
    parser.add_argument("--sheet-id", default=os.getenv("SHEET_ID"), help="ID del Google Sheet")
    parser.add_argument("--no-sheet", action="store_true", help="No escribir a Google Sheet")
    parser.add_argument("--gemini", action="store_true", help="Usar Gemini para casos dudosos")
    args = parser.parse_args()

    input_path = Path(__file__).parent / args.input
    output_path = Path(__file__).parent / args.output

    # Configuracion de Gemini (solo si --gemini)
    gemini_client = None
    gemini_model = "gemini-1.5-pro"
    if args.gemini:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            sys.exit("ERROR: --gemini requiere GEMINI_API_KEY en .env")
        from google import genai

        gemini_client = genai.Client(api_key=gemini_key)

    # Validar config de Sheet
    if not args.no_sheet:
        sa_path = os.getenv("GCP_SA_JSON_PATH")
        if not args.sheet_id:
            sys.exit("ERROR: pasa --sheet-id o define SHEET_ID en .env (o usa --no-sheet)")
        if not sa_path or not Path(sa_path).exists():
            sys.exit(
                "ERROR: GCP_SA_JSON_PATH no existe. Configurala en .env o usa --no-sheet"
            )

    # Pipeline
    filas = leer_crudo(input_path)
    if not filas:
        sys.exit("ERROR: el CSV crudo esta vacio.")

    procesadas = procesar(filas, args.gemini, gemini_client, gemini_model)
    if not procesadas:
        sys.exit("ERROR: ninguna fila sobrevivio al procesado (sin telefonos validos).")

    print("[3/3] Escribiendo salidas...")
    escribir_csv(procesadas, output_path)
    if not args.no_sheet:
        escribir_sheet(procesadas, args.sheet_id, os.getenv("GCP_SA_JSON_PATH"))

    print(f"OK. {len(procesadas)} leads procesados.")


if __name__ == "__main__":
    main()
