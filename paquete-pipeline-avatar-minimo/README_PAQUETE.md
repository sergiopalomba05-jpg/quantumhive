# Paquete minimo para analizar pipeline de avatar

## Codigo incluido

- `src/generate_avatar_videos.py`
- `src/generate_veo_google_cloud.py`
- `src/postprocess_veo_avatar.py`
- `src/resolve_global_cache.py`

## Config / workflows incluidos

- `config/video_generation.json`
- `workflows/comfyui_workflow_api.json`
- `workflows/workflow_infinitetalk_funcional_reducido.json`

## Instalacion incluida

- `install/requirements.txt`
- `install/instalar-en-vm.ps1`

No encontre `pyproject.toml` ni Dockerfile especifico para `PIPELINE INGESTA MENUS`. El Dockerfile existente relevante para la app test vive en `agencia/motor madre/motor-avatares-video-test/Dockerfile`, pero no es el worker de generacion.

## Assets incluidos

- `assets/sol_v1_green.png`
- `assets/sol_ar_v1_ref.wav`

## Resultados fallidos incluidos

- `failed_results/veo_connector_welcome_failed.mp4`
- `failed_results/infinitetalk_connector_entradas_failed_master.mp4`

## Comando exacto FFmpeg usado por `generate_avatar_videos.py`

```powershell
"<ffmpeg>" -y -i "<master_mp4>" -vf "chromakey=0x00FF00:0.18:0.04,despill=type=green:mix=0.75:expand=0.25,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 26 -c:a libopus -b:a 96k "<final_webm>"
```

## Comando nuevo de postproceso Veo

```powershell
python src/postprocess_veo_avatar.py --input output/work/veo_chroma_v2/connector_welcome.mp4 --output global_cache/videos/sol/v1/connector_welcome.webm --key-black-edges
```
