# Skill: Setup de VM GPU con ComfyUI + NVIDIA Drivers

## Trigger
Cuando el usuario pida configurar una VM GPU para ComfyUI, instalar NVIDIA drivers, o similar.

## Datos de la VM GPU

| Campo | Valor |
|-------|-------|
| Nombre | comfyui-l4 |
| IP externa | 34.73.247.22 |
| Zona | us-east1-d |
| Machine type | g2-standard-8 (8 vCPU, 32GB RAM) |
| GPU | NVIDIA L4 (24GB VRAM) |
| Usuario | sergio |
| Proyecto | project-aa5fb956-b08a-4e13-869 |

## Rutas Importantes en la VM

```
C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI\
├── main.py
├── .venv\Scripts\python.exe
├── custom_nodes\
├── input\
├── output\
└── models\
```

**NOTA:** NO existe `python_embeded`. El Python está en `.venv\Scripts\python.exe`.

## Scripts de Setup

### 1. Instalar NVIDIA Driver (si no está instalado)
Ver `scripts/install-nvidia-driver.ps1`

### 2. Configurar ComfyUI para acceso remoto
Ver `habilidades-multimedia/pipelines/comfyui-remote-connection.md`

### 3. Instalar nodos RMBG
Ver `habilidades-multimedia/pipelines/avatar-video-processing.md`

## Troubleshooting

- **ComfyUI no responde:** Verificar firewall de GCP (puerto 8188) + firewall de Windows
- **Python no encontrado:** Usar `.venv\Scripts\python.exe` en vez de `python_embeded`
- **Modelos no cargados:** Verificar que los modelos estén en `models/`
