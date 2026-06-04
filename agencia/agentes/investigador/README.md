# Agente Investigador

> Extrae el contenido público de una cuenta de Instagram y produce un `perfil.md` con los datos del negocio y la esencia de marca. Es el paso 1 antes de armar el bot de cualquier cliente.

## Qué hace

1. Scrapea la cuenta de IG con Apify (bio, posts, captions, comentarios, métricas).
2. Construye un corpus de texto.
3. Lo manda a Gemini 1.5 Pro con un prompt de extracción estructurado.
4. Renderiza el resultado como `perfil.md` en `agencia/clientes/<handle>/perfil.md`.

Ese `perfil.md` es el insumo del **system prompt del bot** de ese cliente.

## Setup

```bash
cd agencia/agentes/investigador
pip install -r requirements.txt
cp .env.ejemplo .env
# Editar .env y llenar APIFY_API_TOKEN y GEMINI_API_KEY
```

## Uso

```bash
# Caso por defecto
python agente_investigador.py --handle yaspapeobeauty

# Con más posts
python agente_investigador.py --handle yaspapeobeauty --max-posts 50
```

## Variables de entorno

| Variable | Dónde se saca |
|----------|---------------|
| `APIFY_API_TOKEN` | https://console.apify.com/account/integrations |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |

## Regla #6 de CLAUDE.md

Antes de usar este agente en producción, **verificar** que el actor de Apify (`apify/instagram-scraper`) está vigente y mantenido. Si cambió o está deprecado, ajustar `APIFY_INSTAGRAM_ACTOR` en el código o buscar un actor alternativo de la comunidad.

## Output

El archivo `perfil.md` se guarda en `agencia/clientes/<handle>/perfil.md` (configurable con `--output-dir`).

Estructura del `perfil.md`:

- Datos del negocio (bio, link, contacto, servicios detectados)
- Esencia de marca (tono, vocabulario, valores, estética)
- Preguntas frecuentes de la audiencia
- Notas para el system prompt del bot

## Pendientes (próxima iteración)

- [ ] Transcripción de reels (yt-dlp + Whisper)
- [ ] Soporte para cuentas privadas (pedir acceso o abortar limpio)
- [ ] Modo batch para onboardear varios clientes en una corrida
- [ ] Caché de resultados para no re-scrapear si no cambió
