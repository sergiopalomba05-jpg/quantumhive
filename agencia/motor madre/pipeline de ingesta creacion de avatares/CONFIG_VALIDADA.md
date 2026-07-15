# Configuracion validada

## Arranque

```powershell
$comfyRoot = "C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI"
& "$comfyRoot\.venv\Scripts\python.exe" main.py --listen 127.0.0.1 --port 8188 --disable-cuda-malloc --lowvram
```

## Workflow reducido validado

Archivo fuente:

```text
C:\Users\sergio\Desktop\boveda-obsidian\AVATARES VIDEOS\workflows\infinitetalk_clean.json
```

Valores clave:

```text
Wav2Vec base_precision: fp32
T5 precision: bf16
CLIP vision precision: fp16
VAE precision: fp16
Wan base_precision: fp16
width: 384
height: 224
num_frames: 17
frame_window_size: 17
steps: 5
enable_vae_tiling: true
```

Salida validada:

```text
ComfyUI/output/infinitetalk_test_00001_.png
...
ComfyUI/output/infinitetalk_test_00017_.png
```

## Nota sobre video final

El workflow actual guarda frames PNG. Para preview visual se puede ensamblar con `ffmpeg`:

```powershell
ffmpeg -framerate 25 -i infinitetalk_test_%05d_.png -c:v libx264 -pix_fmt yuv420p preview.mp4
```

Si el patron exacto de nombres cambia, ajustar `%05d` al formato generado por `SaveImage`.
