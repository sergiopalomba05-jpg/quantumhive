# Spec — Pipeline de prospección B2B "Mundial"

**Fecha:** 2026-06-11
**Frente:** `directimport` (FRENTE 1 — B2B mayorista)
**Campaña:** Liquidación 12.000 remeras Argentina del Mundial (debut 16/06).
**Ventana:** Crítica. Liquidar antes de que baje la demanda.

---

## 1. Objetivo

Producir leads B2B accionables (con link `wa.me` listo) en dos segmentos:

- **Bultos** (300 u) — distribuidores, mayoristas, polirrubros, ferias.
- **Curvas** (10 u, USD 120) — locales chicos, showrooms, regalerías.

La ejecución del primer contacto la hace Sergio a mano (click-to-chat), porque mantiene el número de WhatsApp vivo y evita PEER_FLOOD.

**No-objetivos:** auto-envío, auto-posteo, orquestación multi-agente, Make/n8n para esto, Meta Ads.

## 2. Arquitectura

Dos scripts CLI Python independientes, secuenciales, con un CSV intermedio que sirve de gate humano.

```
queries (constantes en el script o flag CLI)
        │
        ▼
┌──────────────────────┐
│  scrape_maps.py      │  ← actor compass/crawler-google-places (Apify)
│  Script 1            │
└─────────┬────────────┘
          │  data/leads_crudo.csv
          ▼
┌──────────────────────┐
│  procesar_leads.py   │  ← dedupe, normalizar tel, clasificar, wa.me
│  Script 2            │
└─────────┬────────────┘
          │
          ├──► data/leads_procesado.csv  (respaldo local)
          └──► Google Sheet              (operativo — click-to-chat)
```

**Por qué dos scripts y no uno:**
1. Una responsabilidad por archivo (sigue el patrón de `agencia/agentes/<nombre>/`).
2. El CSV intermedio es revisable a ojo antes de gastar llamadas a Gemini.
3. El brief lo pide así explícitamente.
4. Cumple "un paso estable antes del siguiente" (CLAUDE.md regla 3).

## 3. Estructura de archivos

```
directimport/agentes/mundial/
├── scrape_maps.py
├── procesar_leads.py
├── tests/
│   └── test_procesar.py        ← unit tests de funciones puras
├── requirements.txt
├── .env.ejemplo
├── .gitignore                  ← ignora data/ y .env
├── README.md
└── data/
    ├── leads_crudo.csv         ← output Script 1
    └── leads_procesado.csv     ← respaldo Script 2
```

## 4. Script 1 — `scrape_maps.py`

### CLI

```
python scrape_maps.py --query "<texto>" [--max N] [--output PATH] [--append]
python scrape_maps.py --all [--max N] [--output PATH]
```

- `--query "distribuidora indumentaria San Martin"` — una sola búsqueda, modo smoke test.
- `--all` — itera el producto cartesiano de `TIPOS × LOCALIDADES` (constantes en el script). Modo full run.
- `--max 50` — tope por query (default 50). Apify cobra por place scrapeado.
- `--output data/leads_crudo.csv` — destino (default ese).
- `--append` — agrega filas al CSV existente; sin el flag sobrescribe.

### Constantes (en el script, editables)

```python
TIPOS = [
    "distribuidora de indumentaria",
    "mayorista de ropa",
    "polirrubro mayorista",
    "local de ropa",
    "casa de deportes",
    "regaleria",
]

LOCALIDADES = [
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
]
```

### Apify actor

- ID: `compass/crawler-google-places` (verificado, mantenido — last modified hace un día).
- Pricing: USD 1.50 / 1000 places. Para una corrida `--all` con `--max 30` ≈ 6 × 13 × 30 = 2340 places ≈ USD 3.5 — razonable.
- Input JSON:
  ```json
  {
    "searchStringsArray": ["<query con localidad>"],
    "maxCrawledPlacesPerSearch": 50,
    "language": "es",
    "countryCode": "ar"
  }
  ```
- Output (un item por place): `title`, `phone`, `address`, `categoryName`, `totalScore`, `website`, `placeId`, `url`.

### Output CSV

Columnas: `query, title, phone, address, category, rating, website, place_id, url, scraped_at`.

### Errores y bordes

- Sin `--query` ni `--all` → error claro.
- Sin `APIFY_API_TOKEN` → sale con `sys.exit("ERROR: ...")` (mismo patrón del investigador).
- Apify devuelve 0 items → log de warning, exit 0 (no es error fatal).
- Si una query del batch falla, las otras siguen. Log al final con conteo OK/fallidas.

## 5. Script 2 — `procesar_leads.py`

### CLI

```
python procesar_leads.py [--input PATH] [--sheet-id ID] [--no-sheet] [--gemini]
```

- `--input data/leads_crudo.csv` — default.
- `--sheet-id <id>` — ID del Google Sheet destino. Si no se pasa, se toma de `SHEET_ID` en `.env`.
- `--no-sheet` — solo escribe el CSV procesado, no toca Sheet (útil para smoke test sin GCP).
- `--gemini` — habilita clasificación con Gemini para casos dudosos. Sin el flag, los dudosos quedan etiquetados como `Bultos` por default (sesgo a volumen, criterio operativo del CEO).

### Pipeline

1. **Leer CSV crudo.**
2. **Dedupe por teléfono normalizado.** Quedarse con la primera fila por teléfono. Filas sin teléfono se descartan con log (no se pueden contactar por WhatsApp).
3. **Normalizar teléfono a formato wa.me** (función pura, testeable).
4. **Clasificar Bultos / Curvas:**
   - Heurística sobre `category` + `title` (función pura, testeable).
   - Dudosos → `Bultos` por default, o Gemini si `--gemini`.
5. **Generar mensaje desde plantilla** del segmento, con `[Nombre]` interpolado.
6. **Generar `link_wame`** con el mensaje URL-encoded.
7. **Escribir CSV procesado** (siempre — es el respaldo).
8. **Escribir a Google Sheet** (a menos que `--no-sheet`): limpia la hoja "Leads" y vuelca todo. Idempotente.

### Normalización de teléfono Argentina → wa.me

`wa.me` exige solo dígitos, sin `+`, sin espacios. Para Argentina el formato es `549 + área + número` (el `9` adicional es para WhatsApp en móviles).

Casos a manejar:

| Input crudo                 | Output normalizado |
|-----------------------------|--------------------|
| `+54 11 1234-5678`          | `5491112345678`    |
| `011 1234-5678`             | `5491112345678`    |
| `(011) 4567-8910`           | `5491145678910`    |
| `+54 9 11 1234 5678`        | `5491112345678`    |
| `1156781234`                | `5491156781234`    |
| `54 2241 567890`            | `5492241567890`    |
| inválido / vacío            | `None` (se descarta) |

Reglas:
1. Strip todo lo no-dígito.
2. Si empieza con `0`, removerlo (prefijo nacional argentino).
3. Si empieza con `54`, removerlo (lo agrego al final).
4. Si empieza con `9` (después del paso anterior), removerlo.
5. Validar largo: 10 dígitos (área + número) en AR → prefijar `549`. Otro largo → `None`.

### Heurística de clasificación

`title + " " + category` en minúsculas. Las keywords de Curvas se dividen en **fuertes** (estilo retail puro, contradicen Bultos) y **débiles** (categoría genérica que cualquier local puede llevar, incluido un polirrubro mayorista).

- **Bultos** keywords (todas fuertes): `distribuidora`, `distribuidor`, `mayorista`, `mayorist`, `polirrubro`, `polirubro`, `por mayor`, `wholesale`, `feria`.
- **Curvas fuertes**: `boutique`, `showroom`, `regaleria`, `regalería`, `casa de deportes`.
- **Curvas débiles**: `local de ropa`, `tienda`.

Reglas:

| Bultos | Curvas fuerte | Curvas débil | Resultado |
|--------|---------------|--------------|-----------|
| ✓      | ✓             | -            | Dudoso    |
| ✓      | ✗             | ✓            | Bultos    |
| ✓      | ✗             | ✗            | Bultos    |
| ✗      | ✓             | -            | Curvas    |
| ✗      | ✗             | ✓            | Curvas    |
| ✗      | ✗             | ✗            | Dudoso    |

Ejemplo: `"Polirrubro 25 de Mayo"` con categoría Google Maps `"Tienda"` → Bultos (polirrubro pesa más que tienda como categoría genérica). `"Mayorista Boutique Chic"` → Dudoso (señales contradictorias reales).

### Clasificación con Gemini (solo dudosos, solo si `--gemini`)

- Modelo: `gemini-1.5-pro` (mismo que investigador, ya probado en el repo).
- Prompt corto, fuerza una palabra:

  ```
  Negocio B2B argentino. Necesito clasificar para venta de remeras del Mundial.
  - Bultos = compra 300+ unidades (distribuidoras, mayoristas, polirrubros que revenden al por mayor).
  - Curvas = compra 10-50 unidades (locales chicos, showrooms, revendedores barriales).

  Negocio:
    Nombre: {title}
    Categoria: {category}
    Direccion: {address}

  Responde SOLO con UNA palabra: Bultos o Curvas.
  ```
- Si la respuesta no es exactamente `Bultos` o `Curvas` (case-insensitive), default a `Bultos`.

### Plantillas de mensaje (literal del brief)

Bultos:
```
Hola {nombre}, soy mayorista en CABA. Tengo stock fisico inmediato de remeras de Argentina del Mundial — bulto cerrado de 300 (curva S-XL). Flete propio a GBA y despacho a expreso para el interior. Se puede abonar contra entrega. Te paso fotos del galpon y precio por bulto?
```

Curvas:
```
Hola {nombre}, mayorista en CABA. Curvas de 10 remeras de Argentina del Mundial, surtido de talles, listas para colgar. Minimo 1 curva (USD 120). Entrega en tu local en GBA y pago contra entrega. Te mando fotos y precio?
```

**Notas:**
- Sin acentos en el output (UTF-8 + URL encoding de WhatsApp lo come, pero hay menos sorpresas en celulares viejos).
- `{nombre}` ← `title` del lead, capitalizado.
- El precio por bulto NO va en el mensaje (el lead engancha, después se le manda fotos + precio en privado).

### Output Google Sheet

Pestaña `Leads`. Columnas:

| col | nombre        |
|-----|---------------|
| A   | nombre        |
| B   | telefono      |
| C   | segmento      |
| D   | direccion     |
| E   | categoria     |
| F   | rating        |
| G   | link_wame     |
| H   | mensaje       |
| I   | estado        |
| J   | notas         |
| K   | actualizado   |

`estado` arranca en `pendiente`. `notas` vacío. `actualizado` con timestamp ISO.

### Errores y bordes

- Sin `GEMINI_API_KEY` y `--gemini` activo → error claro al arranque.
- Sin credenciales GCP y sin `--no-sheet` → error claro al arranque.
- CSV vacío / no existe → error claro.
- Si todos los leads se descartan por falta de teléfono → log de warning, sale con código 1.

## 6. Configuración

`.env.ejemplo`:

```
APIFY_API_TOKEN=
GEMINI_API_KEY=
GCP_SA_JSON_PATH=
SHEET_ID=
```

`requirements.txt`:

```
apify-client>=1.7.0
google-genai>=1.0.0
gspread>=6.0.0
python-dotenv>=1.0.0
pytest>=8.0.0
```

`.gitignore` (local a la carpeta):

```
.env
data/
*.pyc
__pycache__/
```

## 7. Tests (TDD-lite)

Solo funciones puras. Sin mocks de Apify ni Gemini (overhead alto, valor bajo dado el time-pressure).

`tests/test_procesar.py`:

- `test_normalizar_telefono_*` — 6-8 casos de la tabla.
- `test_clasificar_bultos` — keywords positivas para Bultos.
- `test_clasificar_curvas` — keywords positivas para Curvas.
- `test_clasificar_dudoso` — sin matches → "Dudoso".
- `test_wame_link_encoding` — caracteres especiales del mensaje URL-encoded correctamente.
- `test_render_mensaje_bultos` / `_curvas` — `{nombre}` reemplazado.

Comando: `pytest directimport/agentes/mundial/tests/ -v`.

## 8. Definición de hecho (gate de la campaña)

**Gate 1 (smoke test):**
```
python scrape_maps.py --query "distribuidora indumentaria San Martin" --max 10
python procesar_leads.py --no-sheet --input data/leads_crudo.csv
```
Resultado esperado: CSV procesado con ≥3 filas, telefonos en formato `549...`, link `wa.me` que al abrirse muestra el mensaje correcto por segmento.

**Gate 2 (full run):**
```
python scrape_maps.py --all --max 30
python procesar_leads.py --sheet-id <id> --gemini
```
Google Sheet poblado, segmentos balanceados, Sergio empieza a clickear.

## 9. Lo que NO se construye (anti-scope reafirmado del brief)

- Enjambre de 4 agentes (Extractor/Clasificador/Redactor/Organizador).
- Make.com / Coze / Flowise / Langflow / CrewAI.
- Auto-envío de WhatsApp (Baileys, whatsapp-web.js).
- Auto-posteo en grupos.
- Meta Ads.
- Telegram/Telethon (Script 3 del brief — queda para v2 si la campaña lo amerita).

## 10. Riesgos y cómo se mitigan

| Riesgo                                         | Mitigación                                                  |
|------------------------------------------------|-------------------------------------------------------------|
| Apify devuelve `phone` vacío en muchos places  | Se descarta esa fila con log. Es esperable.                 |
| Telefonos no-argentinos en datos               | Normalizador devuelve `None` si el largo no es AR válido.   |
| Gemini caro o lento si hay miles de dudosos    | Default `Bultos` si `--gemini` no se pasa.                  |
| GCP Service Account no configurada             | `--no-sheet` permite operar solo con CSV.                   |
| Token de Apify expuesto                        | `.env` en `.gitignore` carpeta + raíz. No commitea.         |
| Sergio corre `--all` sin haber probado smoke   | README explica el gate. CLI sin `--query`/`--all` ayuda.    |

---

**Estado:** spec congelado. Implementación arranca a continuación, en este worktree.
