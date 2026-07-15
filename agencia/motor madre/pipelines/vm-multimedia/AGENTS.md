# AGENTS.md — VM comfyui-l4 (Pipeline Multimedia)

## Contexto
Esta VM tiene GPU NVIDIA L4 (24GB VRAM). Su propósito es ejecutar el pipeline de creación de videos del avatar "Sol" para el menú de restaurantes.

## Objetivo
Configurar la VM para ejecutar el pipeline de videos:
- F5-TTS (clonación de voz)
- LivePortrait (lip-sync / video del avatar hablando)
- ComfyUI (orquestador de workflows GPU)

## Stack instalado en la VM
- **OS:** Windows 10/11
- **GPU:** NVIDIA L4 (24GB VRAM)
- **Python:** Verificar con `python --version`
- **ComfyUI:** `E:\ComfyUI` (ya instalado y corriendo en puerto 8188)
- **CUDA:** Verificar con `nvidia-smi`

## Pasos de setup

### 1. Verificar entorno
```powershell
python --version
nvidia-smi
```

### 2. Instalar F5-TTS
```powershell
cd E:\ComfyUI
python -m venv f5tts-env
f5tts-env\Scripts\activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install f5-tts
pip install fastapi uvicorn
```

Crear servidor F5-TTS:
```powershell
# Guardar como E:\ComfyUI\f5tts-server.py
# (ver pipeline-vm-multimedia/docs/instalar-f5tts.md)
python E:\ComfyUI\f5tts-server.py
```

### 3. Instalar LivePortrait
```powershell
cd E:\ComfyUI\custom_nodes
git clone https://github.com/KwaiVGI/LivePortrait.git
cd LivePortrait
pip install -r requirements.txt
```

Reiniciar ComfyUI después de instalar.

### 4. Configurar pipeline
```powershell
cd C:\Users\sergio\pipeline-vm-multimedia
pip install -r scripts\requirements.txt
```

Editar `config/pipeline_config.json` con:
- Ruta al avatar image
- Ruta al audio de referencia (5-15 seg de voz)
- Datos de Supabase (url + key)
- Lista de platos del restaurante

### 5. Ejecutar
```powershell
python scripts\generate_dish_video.py --config config\pipeline_config.json
```

## Archivos del pipeline
```
pipeline-vm-multimedia/
├── config/pipeline_config.json    # CONFIGURACIÓN - editar aquí
├── scripts/
│   ├── generate_dish_video.py     # Script principal
│   ├── voice_clone.py             # F5-TTS wrapper
│   ├── video_generate.py          # LivePortrait wrapper
│   ├── upload_supabase.py         # Upload a Supabase
│   └── requirements.txt           # Dependencias
├── output/                        # Videos generados
├── docs/
│   ├── instalar-f5tts.md
│   └── instalar-liveportrait.md
└── README.md
```

## Servicios que deben estar corriendo
| Servicio | Puerto | URL |
|----------|--------|-----|
| ComfyUI | 8188 | http://localhost:8188 |
| F5-TTS | 8080 | http://localhost:8080 |

## Troubleshooting
- **GPU OOM:** Cerrar otros procesos, reducir resolución en config
- **ComfyUI no responde:** Reiniciar con `python main.py --listen 0.0.0.0 --port 8188`
- **F5-TTS no responde:** Verificar que el servidor esté corriendo en puerto 8080
- **Error de modelo:** Verificar que los pesos estén descargados en `pretrained_weights/`
