# Pipeline: Conexión Remota a ComfyUI

## Resumen
Pipeline para conectarse a ComfyUI corriendo en una VM GPU de GCP desde una máquina local Windows.

## Requisitos
- VM GPU en GCP con ComfyUI instalado
- gcloud CLI configurado en máquina local
- Firewall de GCP abierto en puerto 8188

## Paso 1: Verificar que la VM está encendida

```powershell
gcloud compute instances list --project=project-aa5fb956-b08a-4e13-869
```

## Paso 2: Abrir firewall de GCP para puerto 8188

```powershell
gcloud compute firewall-rules create allow-comfyui `
  --project=project-aa5fb956-b08a-4e13-869 `
  --direction=INGRESS `
  --priority=1000 `
  --network=default `
  --action=ALLOW `
  --rules=tcp:8188 `
  --source-ranges=0.0.0.0/0 `
  --description="Allow ComfyUI access"
```

## Paso 3: Conectar por RDP y abrir firewall de Windows

En la VM por RDP, ejecutar en PowerShell:

```powershell
New-NetFirewallRule -DisplayName "ComfyUI 8188" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8188 -ErrorAction SilentlyContinue
```

## Paso 4: Encontrar la ruta de ComfyUI

```powershell
Get-ChildItem "C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs" -Filter "main.py" -Recurse | Select -ExpandProperty DirectoryName
```

La ruta correcta es: `C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI`

**NOTA:** No existe `python_embeded`, el Python está en `.venv\Scripts\python.exe`

## Paso 5: Iniciar ComfyUI con --listen

```powershell
$d="C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI"
Start-Process "$d\.venv\Scripts\python.exe" -ArgumentList "`"$d\main.py`" --listen 0.0.0.0 --port 8188" -WorkingDirectory $d -WindowStyle Minimized
```

## Paso 6: Verificar conexión

Desde la VM:
```powershell
(Invoke-WebRequest -Uri "http://localhost:8188/system_stats" -TimeoutSec 5).StatusCode
```

Desde máquina local:
```powershell
Invoke-WebRequest -Uri "http://34.73.247.22:8188/system_stats" -TimeoutSec 10
```

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

## Troubleshooting

### ComfyUI no responde externamente
1. Verificar que el firewall de GCP tiene regla para puerto 8188
2. Verificar que el firewall de Windows tiene regla para puerto 8188
3. Verificar que ComfyUI está corriendo con `--listen 0.0.0.0`

### ComfyUI tarda en arrancar
- Esperar 30-60 segundos después del Start-Process
- El primer arranque puede tardar más por carga de modelos

### Error "Connection refused"
- ComfyUI no está corriendo → repetir Paso 5
- Firewall bloqueando → verificar Pasos 2 y 3
