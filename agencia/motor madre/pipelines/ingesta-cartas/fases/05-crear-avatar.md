# FASE 5: Crear Avatar (Video Sin Fondo)

**Objetivo:** Tomar la foto/video del avatar y generar una versión sin fondo (WebP/WebM animado).

---

## Flujo

```
Foto/video del avatar (upload o preset)
    │
    ├── ¿Es video? ──SÍ──> Extraer frames → Quitar fondo frame por frame
    │
    └── NO (foto)
        │
        ▼
    ComfyUI + BriaRemoveBackground
        │
        ▼
    Avatar sin fondo (PNG/WebP)
        │
    ├── ¿Se quiere animar? ──SÍ──> LivePortrait (loops de idle)
    │
    └── NO
        │
        ▼
    Avatar estático sin fondo
        │
        ▼
    Upload a Supabase Storage
```

---

## Opciones de Avatar

### Opción A: Foto del cliente
- Upload de imagen frontal del avatar
- Fondo liso preferentemente
- Se procesa con ComfyUI RMBG

### Opción B: Video del cliente
- Upload de video corto (5-15 seg)
- Se extraen frames con ffmpeg
- Cada frame se procesa con ComfyUI RMBG
- Se reconstruye el video sin fondo

### Opción C: Avatar preset "Sol"
- Ya creado: `public/avatar-bienvenido.webp`
- WebP animado sin fondo, 720x405, 30fps
- Listo para usar directamente

### Opción D: Generar con IA (futuro)
- ComfyUI + Flux + IP-Adapter
- Prompt: "Foto frontal de mesera argentina, sonriente, fondo liso"
- Consistencia facial con IP-Adapter

---

## Procesamiento con ComfyUI

### Para foto (imagen estática):

```
POST http://34.73.247.22:8188/api/prompt
{
  "prompt": {
    "1": {
      "class_type": "LoadImage",
      "inputs": { "image": "avatar.jpg" }
    },
    "2": {
      "class_type": "BriaRemoveImageBackground",
      "inputs": { "image": ["1", 0] }
    },
    "3": {
      "class_type": "SaveImage",
      "inputs": { "image": ["2", 0], "filename_prefix": "avatar_nobg" }
    }
  }
}
```

### Para video (frames):

```
1. Extraer frames:
   ffmpeg -i avatar.mp4 -vf "fps=30" frames/frame_%04d.png

2. Para cada frame, ejecutar workflow RMBG

3. Reconstruir video:
   ffmpeg -framerate 30 -i frames/nobg_%04d.png -c:v libwebp -lossless 0 -qscale 80 -loop 0 -alpha_quality 100 avatar.webp
```

---

## Formatos de Salida

| Formato | Uso | Transparencia | Audio |
|---------|-----|---------------|-------|
| WebP animado | Splash screen, botón flotante | ✅ | ❌ |
| WebM (VP9 alpha) | Video principal del avatar | ✅ | ✅ |
| PNG | Avatar estático | ✅ | ❌ |

**Recomendación:** 
- WebP animado para splash y botón (liviano, ~4MB)
- WebM con alpha + audio para videos por plato (Fase 7)

---

## Almacenamiento en Supabase

```
avatars/
├── {restaurant_id}/
│   ├── original.jpg          # Foto original del cliente
│   ├── nobg.png              # Sin fondo
│   ├── nobg.webp             # Sin fondo (animado si es video)
│   └── avatar-video.webm     # Video sin fondo con audio
```

---

## Acceso a ComfyUI VM

**IP:** 34.73.247.22
**Puerto:** 8188
**URL:** http://34.73.247.22:8188

**Problema actual:** No se puede acceder por SSH desde la máquina local. Solo se puede acceder por RDP.

**Solución alternativa:** Procesar localmente con `rembg` (ya instalado):
```python
from rembg import remove
from PIL import Image

def remove_background(input_path: str, output_path: str):
    """Quitar fondo de imagen usando rembg (CPU)"""
    with open(input_path, 'rb') as f:
        input_data = f.read()
    
    output_data = remove(input_data)
    
    with open(output_path, 'wb') as f:
        f.write(output_data)
```

**Nota:** `rembg` en CPU es más lento (~30 seg por imagen) pero funciona sin GPU.

---

## Bloqueos Actuales

1. **ComfyUI VM** → No accesible por SSH, solo RDP
2. **rembg local** → Funciona pero es lento en CPU
3. **LivePortrait** → No instalado (necesario para animar)
4. **Video sin fondo** → Necesita ffmpeg con soporte VP9 alpha (no disponible en Windows)
5. **Costo:** $0 (procesamiento local o en VM propia)
