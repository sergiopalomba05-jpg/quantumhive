# Pipeline: Procesamiento de Video de Avatar (Quitar Fondo + WebP)

## Resumen
Pipeline para tomar un video MP4 de un avatar, quitarle el fondo usando ComfyUI RMBG, y generar un WebP animado con canal alfa (transparencia).

## Arquitectura

```
Video MP4 (con fondo)
    │
    ▼
ffmpeg (extraer frames) → 217 frames PNG
    │
    ▼
ComfyUI + BriaRemoveImageBackground (por frame)
    │
    ▼
Frames PNG sin fondo
    │
    ▼
ffmpeg (recomponer) → WebP animado con alpha
```

## Paso 1: Verificar ComfyUI

```powershell
Invoke-WebRequest -Uri "http://34.73.247.22:8188/system_stats" -TimeoutSec 10
```

## Paso 2: Subir video a ComfyUI

```powershell
$videoPath = "C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\bienbenido a la escaloneta.mp4"
$videoBytes = [System.IO.File]::ReadAllBytes($videoPath)
$boundary = [System.Guid]::NewGuid().ToString()

$bodyLines = @(
    "--$boundary",
    'Content-Disposition: form-data; name="image"; filename="bienbenido.mp4"',
    "Content-Type: video/mp4",
    "",
    [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($videoBytes),
    "--$boundary--"
) -join "`r`n"

Invoke-WebRequest -Uri "http://34.73.247.22:8188/upload/image" -Method Post -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyLines -TimeoutSec 60
```

## Paso 3: Ejecutar workflow RMBG

Opción A - Usar BriaRemoveVideoBackground (requiere video como input):
```json
{
  "3": { "class_type": "LoadVideo", "inputs": { "file": "bienbenido.mp4" } },
  "4": { "class_type": "BriaRemoveVideoBackground", "inputs": { "video": ["3", 0], "background_color": "Green", "seed": 42 } },
  "5": { "class_type": "SaveVideo", "inputs": { "video": ["4", 0], "filename_prefix": "avatar_nobg" } }
}
```

Opción B - Procesar frame por frame (más lento pero más control):
```powershell
# Extraer frames
& ffmpeg -i video.mp4 -vf "fps=30" "frames/frame_%04d.png" -y

# Para cada frame, subir a ComfyUI y ejecutar workflow
# Usar nodo BriaRemoveImageBackground en vez de BriaRemoveVideoBackground
```

## Paso 4: Descargar video procesado

```powershell
# ComfyUI guarda en C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI\output\
# Descargar por RDP o copiar a carpeta compartida
```

## Paso 5: Convertir a WebP con alpha

```powershell
$ffmpeg = "C:\Users\sergio\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"

# Si el video tiene fondo verde/chroma key:
& $ffmpeg -i "output_nobg.mp4" -vf "chromakey=0x00FF00:0.1:0.1" -c:v libwebp -lossless 0 -qscale 80 -loop 0 -alpha_quality 100 -pix_fmt rgba "avatar.webp" -y

# Si el video ya tiene transparencia (WebM alpha):
& $ffmpeg -i "output_nobg.webm" -c:v libwebp -lossless 0 -qscale 80 -loop 0 -alpha_quality 100 -pix_fmt rgba "avatar.webp" -y
```

## Paso 6: Copiar a la PWA

```powershell
Copy-Item "avatar.webp" "C:\Users\sergio\Desktop\boveda obsidian\directimport-app\public\avatar-bienvenido.webp" -Force
```

## Nodos Disponibles en ComfyUI (VM GPU)

### Background Removal
- `BriaRemoveImageBackground` - Quitar fondo de imagen (INPUT: IMAGE)
- `BriaRemoveVideoBackground` - Quitar fondo de video (INPUT: VIDEO)
- `RecraftRemoveBackgroundNode` - Alternativa de RMBG

### Video I/O
- `LoadVideo` - Cargar video (requiere ComfyUI-VideoHelperSuite)
- `SaveVideo` - Guardar video
- `CreateVideo` - Crear video desde frames

### Image I/O
- `LoadImage` - Cargar imagen
- `SaveImage` - Guardar imagen
- `PreviewImage` - Preview de imagen

## Limitaciones Conocidas

1. **ffmpeg NO puede escribir WebM VP9 con alpha** - Usar WebP como alternativa
2. **ComfyUI VideoHelperSuite** puede tener issues con ciertos codecs
3. **BriaRemoveVideoBackground** necesita el modelo BRIA descargado (~2GB)

## Datos de la VM

| Campo | Valor |
|-------|-------|
| IP | 34.73.247.22 |
| ComfyUI Port | 8188 |
| Output Dir | `C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI\output\` |
| Input Dir | `C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI\input\` |
