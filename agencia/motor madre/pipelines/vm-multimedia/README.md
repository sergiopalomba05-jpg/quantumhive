# Pipeline VM Multimedia - Creación de Videos del Avatar a Cache

## Qué es

Pipeline automatizado que genera videos del avatar "Sol" hablando de cada plato del menú. Los videos se cachean y se sirven desde Supabase Storage.

## Flujo

```
Foto avatar + Voz referencia + Nombres de platos
    │
    ├──> F5-TTS (clonación de voz)
    │    └──> Audio por plato (avatar hablando del plato)
    │
    ├──> LivePortrait (lip-sync)
    │    └──> Video por plato (avatar hablando + labios sincronizados)
    │
    └──> Supabase Storage
         └──> URL del video cacheado
```

## Requisitos

### VM con GPU (comfyui-l4)
- **Sistema:** Windows 10/11
- **GPU:** NVIDIA L4 (24GB VRAM)
- **RAM:** 32GB mínimo
- **Disco:** 100GB libre

### Servicios que deben estar corriendo

1. **ComfyUI** (puerto 8188)
   - Con custom node LivePortrait instalado
   - Acceso: `http://localhost:8188`

2. **F5-TTS** (puerto 8080)
   - Servicio FastAPI de clonación de voz
   - Acceso: `http://localhost:8080`

## Instalación en la VM

### Paso 1: Copiar el pipeline
```powershell
# Desde RDP, copiar la carpeta pipeline-vm-multimedia a la VM
# Ruta recomendada: C:\Users\sergio\pipeline-vm-multimedia
```

### Paso 2: Instalar dependencias
```powershell
cd C:\Users\sergio\pipeline-vm-multimedia
pip install -r scripts\requirements.txt
```

### Paso 3: Configurar
Editar `config/pipeline_config.json`:
- `restaurant_name`: Nombre del restaurante
- `avatar_image`: Ruta a la imagen del avatar
- `voice_reference`: Ruta al audio de referencia (5-15 seg)
- `supabase_url`: URL de tu proyecto Supabase
- `supabase_key`: API key de Supabase

### Paso 4: Ejecutar
```powershell
# Opción A: Usar el batch
run_pipeline.bat

# Opción B: Ejecutar directamente
python scripts/generate_dish_video.py --config config/pipeline_config.json
```

## Estructura

```
pipeline-vm-multimedia/
├── config/
│   └── pipeline_config.json    # Configuración del pipeline
├── scripts/
│   ├── generate_dish_video.py  # Script principal (orquestador)
│   ├── voice_clone.py          # Clonación de voz con F5-TTS
│   ├── video_generate.py       # Generación de video con LivePortrait
│   ├── upload_supabase.py      # Upload a Supabase Storage
│   └── requirements.txt        # Dependencias Python
├── output/                     # Salida (audios + videos)
│   ├── audio/                  # Audios generados
│   └── video/                  # Videos generados
├── docs/
│   └── instalar-f5tts.md       # Guía de instalación de F5-TTS
│   └── instalar-liveportrait.md # Guía de instalación de LivePortrait
├── run_pipeline.bat            # Batch para ejecutar desde RDP
└── README.md                   # Este archivo
```

## Input del Pipeline

### Archivo de configuración (`pipeline_config.json`)
```json
{
  "restaurant_name": "la-escaloneta",
  "avatar_image": "ruta/al/avatar.webp",
  "voice_reference": "ruta/al/audio-referencia.wav",
  "dishes": [
    {
      "id": "milanesa-napolitana",
      "name": "Milanesa Napolitana",
      "description": "Milanesa de carne con jamón y queso...",
      "price": "$3.800"
    }
  ]
}
```

### Audio de referencia
- Formato: WAV
- Duración: 5-15 segundos
- Contenido: La voz del avatar hablando naturalmente
- Calidad: 44.1kHz, 16-bit mínimo

## Output del Pipeline

### Para cada plato se genera:
1. **Audio** (`output/audio/{dish_id}.wav`)
   - Voz del avatar hablando del plato
   - Texto: "Hola! Soy Sol... Te recomiendo el [plato]. [descripción]"

2. **Video** (`output/video/{dish_id}.webm`)
   - Avatar hablando con labios sincronizados
   - Fondo transparente (WebM alpha)
   - Resolución: 720x405, 30fps

3. **URL** (en `output/video/results.json`)
   - URL pública de Supabase Storage
   - Lista para usar en la PWA

## Troubleshooting

### F5-TTS no responde
```powershell
# Verificar que esté corriendo
curl http://localhost:8080/health

# Reiniciar
cd E:\ComfyUI\f5-tts
python -m f5_tts.api
```

### ComfyUI no responde
```powershell
# Verificar que esté corriendo
curl http://localhost:8188/system_stats

# Reiniciar
cd E:\ComfyUI
.\venv\Scripts\python.exe main.py --listen 0.0.0.0 --port 8188
```

### Error de memoria GPU
- Reducir resolución en `pipeline_config.json`
- Procesar platos de a uno
- Cerrar otros programas que usen GPU

### Video sin audio
- Verificar que F5-TTS generó el audio correctamente
- Verificar que el audio no está corrupto
- Revisar logs de ComfyUI

## Costo

| Componente | Costo |
|------------|-------|
| GPU (VM) | $0 (créditos GCP) |
| F5-TTS | $0 (open source) |
| LivePortrait | $0 (open source) |
| Supabase Storage | $0 (free tier: 1GB) |
| **Total** | **$0** |
