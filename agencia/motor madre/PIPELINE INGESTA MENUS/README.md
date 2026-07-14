# PIPELINE INGESTA MENUS

Fuente de verdad actual: `PIPELINE_DEFINITIVO.md`.

Objetivo: ingestar cartas de restaurantes, normalizarlas, generar jobs deterministas y preparar la creacion masiva de videos finales por plato/conector.

Regla: no tocar `motor-avatares-run` ni el frontend actual hasta que existan assets finales completos.

Primer paso de implementacion: Nodo 1 y Nodo 2, es decir ingesta de carta + normalizacion/IDs deterministas.

## Uso MVP 1

Desde esta carpeta:

```powershell
python .\src\ingest_menu.py --input .\inputs\menus\menu_ejemplo.txt --restaurant-id la-escaloneta --output .\output
```

Salidas:

- `output/normalized/menu.normalized.json`
- `output/jobs/render_jobs.jsonl`

Resolver cache global del avatar:

```powershell
python .\src\resolve_global_cache.py --jobs .\output\jobs\render_jobs.jsonl --cache .\cache\global_avatar_cache.json --output .\output
```

Salidas:

- `output/cache/cache_hits.jsonl`
- `output/cache/render_missing_jobs.jsonl`
- `output/index/restaurant_video_index.json`

Preparar generacion de videos, sin ejecutar modelos todavia:

```powershell
python .\src\generate_avatar_videos.py --config .\config\video_generation.json --limit 1 --dry-run
```

El primer render real necesita completar `config/video_generation.json` con el comando TTS y el workflow ComfyUI API final.
