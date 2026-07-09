---
name: gpu-vm-setup
description: |
  Setup automatico de VM GPU en Google Cloud Platform para ComfyUI.
  Instala driver NVIDIA, Python, Git, ComfyUI, PyTorch CUDA, custom nodes
  y modelos de background removal. Para VMs Windows con GPU (L4, T4, A100, V100).
triggers:
  - "gpu vm"
  - "vm gpu"
  - "comfyui"
  - "nvidia driver"
  - "cuda"
  - "background removal"
  - "setup vm"
  - "instalar vm"
  - "crear vm"
  - "gcp vm"
  - "gpu setup"
  - "instalar gpu"
  - "comfyui vm"
od:
  mode: utility
  surface: cli
  platform: windows
  scenario: automation
  preview:
    type: markdown
  design_system:
    requires: false
  capabilities_required:
    - file_write
    - bash
---

# GPU VM Setup - ComfyUI

Skill para automatizar el setup completo de VMs GPU en GCP para correr ComfyUI con background removal.

## Archivos del Skill

| Archivo | Descripcion |
|---------|-------------|
| `scripts/setup-comfyui-gpu.ps1` | Setup completo (driver + Python + Git + ComfyUI + CUDA + custom nodes) |
| `scripts/install-nvidia-driver.ps1` | Solo instalar driver NVIDIA |
| `scripts/gcp-startup.ps1` | Startup script para GCP (se ejecuta al crear la VM) |
| `scripts/gcp-create-vm.bat` | Batch para crear VM GPU con gcloud |

## Uso

### Opcion 1: Setup completo en VM existente

Desde CMD como administrador en la VM:

```cmd
powershell -ExecutionPolicy Bypass -File scripts\setup-comfyui-gpu.ps1
```

### Opcion 2: Crear VM nueva con setup automatico

```cmd
scripts\gcp-create-vm.bat
```

O manualmente con gcloud:

```cmd
gcloud compute instances create comfyui-gpu ^
  --zone=us-central1-a ^
  --machine-type=g2-standard-8 ^
  --accelerator=type=nvidia-l4,count=1 ^
  --image-family=windows-2022-core-for-containers ^
  --image-project=windows-cloud ^
  --boot-disk-size=100GB ^
  --metadata-from-file=startup-script=scripts\gcp-startup.ps1
```

### Opcion 3: Solo driver NVIDIA

```cmd
powershell -ExecutionPolicy Bypass -File scripts\install-nvidia-driver.ps1
```

## GPU Soportadas

- NVIDIA L4 (24GB VRAM) - Recomendada para ComfyUI
- NVIDIA T4 (16GB VRAM)
- NVIDIA A100 (40/80GB VRAM)
- NVIDIA V100 (16GB VRAM)

## Que Instala

1. **Driver NVIDIA 566.36** (silencioso)
2. **Python 3.12.8** (con PATH)
3. **Git 2.47.1**
4. **ComfyUI** (clone desde GitHub)
5. **PyTorch CUDA 12.4**
6. **Custom nodes**: ComfyUI-Manager, ComfyUI-RMBG (background removal)
7. **Dependencias**: RMBG-2.0, BiRefNet, BEN, BEN2, SAM, etc.
8. **Script de inicio**: `iniciar-comfyui.bat`

## Modelos de Background Removal

- RMBG-2.0 (BiRefNet) - Mejor calidad
- INSPYRENET - Rapido para retratos
- BEN/BEN2 - Balance velocidad/calidad
- BiRefNet (variantes) - Alta resolucion
- SAM/SAM2 - Segmentacion precisa

## Post-Instalacion

1. Reiniciar la VM
2. Ejecutar `C:\ComfyUI\iniciar-comfyui.bat`
3. Abrir `http://127.0.0.1:8188`
4. Usar nodo RMBG para background removal

## Solucion de Problemas

### nvidia-smi no funciona
- Reinstalar driver: `powershell -ExecutionPolicy Bypass -File scripts\install-nvidia-driver.ps1`

### CUDA not available
- Reinstalar PyTorch:
```cmd
C:\ComfyUI\.venv\Scripts\pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

### ComfyUI no inicia
- Verificar Python y Git en PATH
- Revisar log: `%TEMP%\comfyui-setup.log`
