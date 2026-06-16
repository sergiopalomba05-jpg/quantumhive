# Agente Mundial — Pipeline B2B

Pipeline de prospeccion para la campana de liquidacion de 12.000 remeras
Argentina del Mundial. Genera leads B2B clasificados (Bultos vs Curvas)
con link `wa.me` listo para click-to-chat.

Dos scripts secuenciales. El envio lo hace Sergio a mano (mantiene el numero
de WhatsApp vivo, evita PEER_FLOOD).

## Stack

- Python 3.10+
- Apify (actor `compass/crawler-google-places`) para Google Maps
- Gemini (opcional) para casos dudosos de clasificacion
- Google Sheets (opcional) para tablero operativo

## Setup (una vez)

```powershell
# 1. Instalar dependencias
python -m pip install -r requirements.txt

# 2. Configurar .env
Copy-Item .env.ejemplo .env
# Editar .env con tus tokens (Apify minimo; Gemini y GCP solo si los usas)
```

Para usar Google Sheet hace falta una Service Account de GCP con la API
de Sheets habilitada y el JSON descargado. **Compartir el Sheet con el
email de la Service Account** (rol: editor).

## Uso

### Gate 1 — Smoke test (gratis salvo Apify, ~USD 0.02)

```powershell
# Script 1: una sola query
python scrape_maps.py --query "distribuidora indumentaria San Martin" --max 10

# Script 2: procesar sin tocar Sheet
python procesar_leads.py --no-sheet
```

Resultado esperado: `data/leads_procesado.csv` con ≥3 filas, telefonos en
formato `549...`, y links `wa.me` que al abrirse muestran el mensaje del
segmento correcto.

Verificacion manual:
- Abri `data/leads_procesado.csv` en Excel/LibreOffice
- Clickea un par de links `wa.me` — debe abrir WhatsApp con el texto correcto

### Gate 2 — Corrida completa

```powershell
# Script 1: cartesiano TIPOS x LOCALIDADES (≈USD 3-5 en Apify)
python scrape_maps.py --all --max 30

# Script 2: con Gemini para dudosos, volcando al Sheet
python procesar_leads.py --gemini --sheet-id <ID_DEL_SHEET>
```

A partir de aca, Sergio abre el Sheet y empieza a clickear links.

## Comandos relevantes

| Comando                                                         | Que hace                                            |
|-----------------------------------------------------------------|-----------------------------------------------------|
| `python scrape_maps.py --query "..."`                           | Una sola busqueda                                   |
| `python scrape_maps.py --all`                                   | Producto cartesiano TIPOS × LOCALIDADES             |
| `python scrape_maps.py --query "..." --append`                  | Agrega a `data/leads_crudo.csv` sin sobrescribir    |
| `python procesar_leads.py --no-sheet`                           | Solo escribe CSV (no toca Sheet)                    |
| `python procesar_leads.py --gemini`                             | Usa Gemini para resolver dudosos                    |
| `python procesar_leads.py --sheet-id <id>`                      | Vuelca al Sheet pasado                              |
| `python -m pytest tests/ -v`                                    | Corre tests unitarios                               |

## Anti-scope

Lo que este pipeline **NO** hace y no va a hacer:

- ❌ Auto-envio de WhatsApp (Baileys / whatsapp-web.js). El envio es
  click-to-chat manual.
- ❌ Auto-posteo en grupos de Facebook/Telegram.
- ❌ Orquestacion multi-agente, Make.com, Coze, Flowise, n8n para esto.
- ❌ Meta Ads.

Estos puntos son decisiones del brief — no los reabrir sin discutir con Sergio.

## Estructura

```
directimport/agentes/mundial/
├── scrape_maps.py          ← Script 1
├── procesar_leads.py       ← Script 2
├── tests/test_procesar.py  ← unit tests
├── requirements.txt
├── .env.ejemplo            ← plantilla (las claves vacias)
├── .env                    ← LOCAL, NO commitear (en .gitignore)
├── .gitignore
├── README.md               ← este archivo
└── data/                   ← LOCAL, NO commitear
    ├── leads_crudo.csv     ← output Script 1
    └── leads_procesado.csv ← output Script 2 (respaldo del Sheet)
```

## Que mas mirar

- Spec original del pipeline: `docs/superpowers/specs/2026-06-11-mundial-pipeline-design.md`
- Brief de la campana: el mensaje del CEO en la sesion del 2026-06-11.
- CLAUDE.md raiz: reglas de oro del repo.
