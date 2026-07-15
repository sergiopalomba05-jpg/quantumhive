# NECESARIO_PARA_PRIMER_RENDER

Para ejecutar el primer video real del avatar no falta arquitectura. Falta conectar los insumos reales del motor de video.

## Necesario

1. Avatar base de Sol.

Ruta esperada:

```txt
assets/avatar/sol_v1_green.png
```

Tambien sirve un MP4 base si el workflow elegido trabaja mejor con video.

Requisito: fondo verde limpio para poder convertir despues a alfa.

2. Workflow ComfyUI API.

Ruta esperada:

```txt
config/comfyui_workflow_api.json
```

Debe aceptar:

- Imagen/video base del avatar.
- Audio WAV.
- Prefijo de salida.

Debe producir:

```txt
output/work/{global_asset_key}/master.mp4
```

3. TTS local.

Hay que completar en `config/video_generation.json`:

```json
"tts": {
  "command_template": "COMANDO_REAL_AQUI"
}
```

El comando debe leer:

```txt
{script_file}
```

Y escribir:

```txt
{audio_path}
```

4. ComfyUI corriendo.

URL esperada:

```txt
http://127.0.0.1:8188
```

5. FFmpeg instalado.

Se usa para convertir:

```txt
master.mp4 con fondo verde + audio
→ WebM VP9 alpha + Opus
```

## Primer job recomendado

```txt
connector_welcome
```

No probar primero con toda la carta.
