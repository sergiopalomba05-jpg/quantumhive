# VIDEO_GENERATION_PIPELINE

## Decision

El bloque de generacion de video usa ComfyUI como motor automatizado por API, no como herramienta manual.

Flujo:

```txt
render_missing_jobs.jsonl
→ generar audio WAV local
→ ComfyUI genera master MP4 con avatar y fondo verde
→ FFmpeg convierte a WebM VP9 alpha + Opus
→ guardar en cache global del avatar
→ actualizar indice del restaurante
```

## Herramientas

- TTS local: F5-TTS como opcion principal.
- Motor video: ComfyUI workflow.
- Workflow inicial viable: InfiniteTalk/Wan ya existente en el repo.
- Workflow alternativo futuro: MuseTalk o LatentSync si queda mejor/mas rapido en la VM final.
- Postproceso: FFmpeg.

## Por que ComfyUI

ComfyUI permite dejar un workflow estable con nodos, modelos y parametros, y dispararlo por API desde un worker Python. Asi el agente no abre pantallas ni hace pasos manuales.

## Unidad de trabajo

Cada linea de `output/cache/render_missing_jobs.jsonl` representa un video faltante.

Ejemplo:

```json
{
  "item_id": "dish_flan-casero",
  "canonical_id": "dish_flan-casero",
  "script": "Te recomiendo Flan Casero. Con dulce de leche",
  "global_asset_key": "..."
}
```

Ese job debe terminar en:

```txt
global_cache/videos/{avatar_id}/{avatar_version}/{canonical_id}.webm
```

## Cache global del avatar

Cuando un video faltante se genera bien:

1. Se guarda el WebM final en cache global.
2. Se registra el asset en `cache/global_avatar_cache.json`.
3. El restaurante actual apunta a ese asset.

Esto permite que otro restaurante reutilice el mismo video sin renderizar.

## Inputs reales necesarios para ejecutar el primer render

Para probar un job real necesito:

- Avatar base de Sol con fondo verde, idealmente `assets/avatar/sol_v1_green.png` o `assets/avatar/sol_v1_green.mp4`.
- Workflow ComfyUI final elegido y exportado como JSON API.
- ComfyUI corriendo con API activa.
- Comando local de TTS definido y funcionando.
- FFmpeg instalado.

## Primer test obligatorio

No se renderiza toda la carta de entrada.

Primero:

```txt
connector_welcome
→ audio WAV
→ master MP4 con fondo verde y voz integrada
→ WebM VP9 alpha + Opus
→ cache global
```

Si ese resultado queda bien, se habilita batch.
