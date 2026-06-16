# Agente Catalogador de Fábricas — QuantumHive

Busca fábricas en Argentina por rubro (vía Google Maps + Apify) y produce un `.md` por fábrica con su contacto, catálogo, capacidad, certificaciones y evaluación de relevancia como proveedor mayorista. Output pensado para alimentar el catálogo curado de **Directimport**.

## Uso

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Configurar .env (copiar .env.ejemplo a .env y completar tokens)
cp .env.ejemplo .env
# Editar .env con tus APIFY_API_TOKEN y GEMINI_API_KEY reales

# 3. Correr el agente por rubro
python catalogador.py --categoria textiles
python catalogador.py --categoria tecnologia --max-fabricas 20
python catalogador.py --categoria bicicletas --region "Córdoba, Rosario"
python catalogador.py --categoria zapatillas --region "CABA, Gran Buenos Aires"

# 4. Re-correr con --force si querés re-procesar las que ya tienen .md
python catalogador.py --categoria textiles --force
```

## Salida

Cada fábrica encontrada se guarda en:
```
agencia/clientes/mayorista/fabricas/<categoria>/<slug>.md
```

Un `.md` por fábrica con: nombre, ubicación, contacto, productos detectados, certificaciones, ¿ofrece mayorista?, evaluación de relevancia.

## Rubros soportados

- `textiles` — fábrica textil, ropa, indumentaria, confección industrial.
- `tecnologia` — electrónica, auriculares, ensamblado de tecnología.
- `bicicletas` — fabricante de bicicletas, rodados.
- `zapatillas` — calzado deportivo, zapatillas.

Para sumar un rubro nuevo, agregá un bloque en `DEFAULT_QUERIES` dentro de `catalogador.py` con 4-5 variantes de búsqueda.

## Stack

- **Apify** (`compass/google-maps-scraper`): búsqueda de fábricas en Google Maps.
- **Requests**: fetch del HTML del sitio web de cada fábrica.
- **Gemini 1.5 Pro** (`google-genai` SDK): extracción estructurada de datos.
- **python-dotenv**: carga de variables de entorno.

## Variables de entorno

| Variable | Dónde sacarla |
|----------|---------------|
| `APIFY_API_TOKEN` | https://console.apify.com/account/integrations |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |

## Costos estimados por corrida (25 fábricas)

- Apify: ~$0.10–$0.30 (5 queries × 25 places).
- Gemini 1.5 Pro: ~$0.05–$0.15 (25 extracciones).
- Total: <$0.50 por corrida, completamente cubierto por el free tier de Gemini.

## Idempotencia

El agente **salta fábricas que ya tienen `.md`**. Para re-procesar, usá `--force`. Esto te permite correr el agente varias veces para sumar fábricas nuevas sin duplicar las existentes.

## Limitaciones conocidas

- El fetch de sitios web usa `requests` (HTML estático). Si la fábrica tiene una web con mucho JS, puede no traer el catálogo. Workaround futuro: agregar Playwright o usar el actor `apify/website-content-crawler` de Apify.
- El actor `compass/google-maps-scraper` es pago (incluido en planes Apify de pago). Verificá que tu plan lo incluya o usá una alternativa (`drobnikj/google-maps-scraper`).
- No detecta webs caídas ni cerradas. Las filtra silenciosamente.

## Próximas mejoras (diferido)

- Reemplazo de `requests` por `apify/website-content-crawler` para sitios con JS.
- Sumar directorios industriales argentinos (Cámaras textiles, CAIByM, etc.).
- Sumar AFIP lookup para verificar CUIT y condición de la fábrica.
- Sumar scraping de Instagram de cada fábrica (muchas tienen catálogo ahí).
