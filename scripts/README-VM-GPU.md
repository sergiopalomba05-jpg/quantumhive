# Scripts de Automatizacion - VM GPU + ComfyUI

Pipeline completo para automatizar la instalacion de GPU drivers y ComfyUI en VMs de Google Cloud Platform (GCP).

## Archivos

| Script | Descripcion |
|--------|-------------|
| `setup-comfyui-gpu.ps1` | **Setup completo**: driver + Python + Git + ComfyUI + PyTorch CUDA + custom nodes + dependencias |
| `install-nvidia-driver.ps1` | Solo instalar driver NVIDIA 566.36 |
| `gcp-startup.ps1` | Startup script para GCP (se ejecuta automaticamente al crear la VM) |
| `gcp-create-vm.bat` | Batch para crear VM GPU con gcloud (doble click) |

## Uso Rapido

### Opcion 1: Setup completo en VM existente

Desde CMD como administrador en la VM:

```cmd
powershell -ExecutionPolicy Bypass -File setup-comfyui-gpu.ps1
```

### Opcion 2: Crear VM nueva con setup automatico

Doble click en `gcp-create-vm.bat` o ejecutar:

```cmd
gcloud compute instances create comfyui-gpu^
  --zone=us-central1-a^
  --machine-type=g2-standard-8^
  --accelerator=type=nvidia-l4,count=1^
  --image-family=windows-2022-core-for-containers^
  --image-project=windows-cloud^
  --boot-disk-size=100GB^
  --metadata-from-file=startup-script=gcp-startup.ps1
```

### Opcion 3: Solo driver NVIDIA

```cmd
powershell -ExecutionPolicy Bypass -File install-nvidia-driver.ps1
```

## Que Instala el Pipeline Completo

1. **Driver NVIDIA 566.36** (silencioso, sin interaccion)
2. **Python 3.12.8** (con PATH configurado)
3. **Git 2.47.1**
4. **ComfyUI** (clone desde GitHub)
5. **PyTorch CUDA 12.4** (soporte GPU)
6. **Custom nodes**:
   - ComfyUI-Manager (gestion de nodos)
   - ComfyUI-RMBG (background removal con RMBG-2.0, BiRefNet, BEN, BEN2, SAM)
7. **Dependencias**: todas las librerias necesarias
8. **Script de inicio**: `iniciar-comfyui.bat`

## GPU Soportadas

- NVIDIA L4 (24GB VRAM) - Recomendada para ComfyUI
- NVIDIA T4 (16GB VRAM)
- NVIDIA A100 (40/80GB VRAM)
- NVIDIA V100 (16GB VRAM)

## Modelos de Background Removal

- RMBG-2.0 (BiRefNet) - Mejor calidad
- INSPYRENET - Rapido para retratos
- BEN/BEN2 - Balance velocidad/calidad
- BiRefNet (variantes) - Alta resolucion
- SAM/SAM2 - Segmentacion precisa

## Requisitos

- VM GCP con GPU (g2-standard-8, a2-standard-4, etc.)
- Windows Server 2022 o Windows 11
- Acceso RDP a la VM
- Ejecutar como Administrador
- Google Cloud SDK (gcloud) instalado (para crear VMs)

## Post-Instalacion

1. Reiniciar la VM (si no se hizo automaticamente)
2. Ejecutar `C:\ComfyUI\iniciar-comfyui.bat`
3. Abrir `http://127.0.0.1:8188` en el navegador
4. Usar nodo RMBG para background removal

## Solucion de Problemas

### nvidia-smi no funciona
- El driver no se instalo correctamente
- Reinstalar: `powershell -ExecutionPolicy Bypass -File install-nvidia-driver.ps1`

### CUDA not available
- PyTorch no tiene soporte CUDA
- Reinstalar PyTorch:
```cmd
C:\ComfyUI\.venv\Scripts\pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

### ComfyUI no inicia
- Verificar que Python y Git estan en PATH
- Revisar el log en `%TEMP%\comfyui-setup.log`

### Custom nodes no aparecen
- Verificar que estan en `C:\ComfyUI\custom_nodes\`
- Reiniciar ComfyUI
