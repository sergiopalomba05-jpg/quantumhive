# Handoff VM - MuseTalk 1.5 para Avatar Sol

Fecha: 2026-07-14 | Actualizado: 2026-07-16

## Objetivo

Continuar en una VM nueva la integracion de MuseTalk 1.5 como motor visual del avatar Sol, sin reescribir el pipeline existente.

El pipeline de ingesta/cache se conserva:

```txt
job -> audio WAV F5-TTS -> motor visual -> master MP4 -> WebM VP9 alpha + Opus -> cache global
```

Solo se reemplaza el motor visual de produccion por MuseTalk 1.5.

## Deploy Activo (Revision 00037-sjm)

```txt
Servicio: motor-avatares-video-test-00037-sjm
URL: https://motor-avatares-video-test-557866434489.us-central1.run.app
HTTP: 200 verificado
```

## Estado Git Actualizado

Repo:

```txt
https://github.com/sergiopalomba05-jpg/quantumhive.git
```

Rama de trabajo:

```txt
feat/avatar-engine-musetalk-v15
```

Commits clave:

```txt
f87bbf0 docs: record final sol deploy revision     (documentacion final)
dbd1a34 fix: stabilize sol avatar startup           (estabilizacion codigo)
1bce0d1 chore: preserve sol avatar source assets    (assets fuente trackeados)
```

Backup anterior:

```txt
4ad788b chore: snapshot avatar pipeline before musetalk
tag: backup-pre-musetalk-mvp
```

Regla de continuidad: seguir en `feat/avatar-engine-musetalk-v15`, no trabajar sobre `main`.
Ahora TODO esta en Git, incluyendo assets fuente y codigo del test app.

## Estado De La VM Anterior (Para Referencia)

La VM `comfyui-l4` en `us-east1-d` queda suspendida. Los datos relevantes estan en Git.
La nueva VM debe clonar el repo y continuar desde ahi.

OS:

```txt
Windows 10.0.20348
```

GPU:

```txt
NVIDIA L4
VRAM: 23034 MiB
Driver/KMD: 610.74
CUDA UMD: 13.3
```

Python global:

```txt
Python 3.12.8
torch 2.6.0+cu124
CUDA disponible: True
```

Disco:

```txt
C: repo local en C:\Users\sergio\Desktop\boveda-obsidian (TODO esta en Git)
D: usado para MuseTalk runtime
```

## Instalacion MuseTalk En D

Runtime aislado creado en:

```txt
D:\ai-runtime\musetalk-v15
```

Repo oficial clonado en:

```txt
D:\ai-runtime\musetalk-v15\MuseTalk
```

Repo oficial:

```txt
https://github.com/TMElyralab/MuseTalk.git
```

Commit pinneado:

```txt
0a89dec45a0192b824e3cf4daf96c239440c5ed8
```

Entorno virtual:

```txt
D:\ai-runtime\musetalk-v15\.venv
```

Python del venv:

```txt
Python 3.10.20
```

Paquetes principales instalados y verificados:

```txt
torch==2.0.1+cu118
torchvision==0.15.2+cu118
torchaudio==2.0.2+cu118
opencv-python==4.9.0.80
mmcv==2.0.1
mmengine==0.10.7
mmdet==3.1.0
mmpose==1.1.0
huggingface_hub==0.30.2
```

CUDA dentro del venv:

```txt
torch.cuda.is_available() == True
GPU detectada: NVIDIA L4
torch CUDA: 11.8
```

FFmpeg disponible por `imageio_ffmpeg`:

```txt
D:\ai-runtime\musetalk-v15\.venv\lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe
```

`pip check` quedo limpio despues de ajustar:

```txt
typer==0.12.5
rich==13.4.2
huggingface_hub==0.30.2
```

Motivo: el `download_weights.bat` oficial intento subir `huggingface_hub` a `1.23.0`, lo cual rompe `transformers==4.39.2`. No volver a ejecutar el `.bat` sin modificar.

## Pesos / Checkpoints

Los pesos NO quedaron completos.

Descarga iniciada pero interrumpida en:

```txt
models\musetalkV15\unet.pth
```

Archivos confirmados presentes:

```txt
D:\ai-runtime\musetalk-v15\MuseTalk\models\.gitattributes
D:\ai-runtime\musetalk-v15\MuseTalk\models\README.md
D:\ai-runtime\musetalk-v15\MuseTalk\models\musetalk\musetalk.json
D:\ai-runtime\musetalk-v15\MuseTalk\models\musetalkV15\musetalk.json
```

Faltan como minimo:

```txt
D:\ai-runtime\musetalk-v15\MuseTalk\models\musetalkV15\unet.pth
D:\ai-runtime\musetalk-v15\MuseTalk\models\sd-vae\config.json
D:\ai-runtime\musetalk-v15\MuseTalk\models\sd-vae\diffusion_pytorch_model.bin
D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper\config.json
D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper\pytorch_model.bin
D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper\preprocessor_config.json
D:\ai-runtime\musetalk-v15\MuseTalk\models\dwpose\dw-ll_ucoco_384.pth
D:\ai-runtime\musetalk-v15\MuseTalk\models\syncnet\latentsync_syncnet.pt
D:\ai-runtime\musetalk-v15\MuseTalk\models\face-parse-bisent\79999_iter.pth
D:\ai-runtime\musetalk-v15\MuseTalk\models\face-parse-bisent\resnet18-5c106cde.pth
```

Si el snapshot del disco D conserva parciales, se puede reanudar. Si no, descargar de cero.

## Comandos Para Continuar En La Nueva VM

### 1. Verificar Git

```powershell
cd "C:\Users\sergio\Desktop\boveda-obsidian"
git status
git branch --show-current
git log -5 --oneline
git tag --list backup-pre-musetalk-mvp
```

Debe estar en:

```txt
feat/avatar-engine-musetalk-v15
```

Si la rama no existe localmente:

```powershell
git fetch origin
git switch feat/avatar-engine-musetalk-v15
```

### 2. Verificar Runtime En D

```powershell
Test-Path "D:\ai-runtime\musetalk-v15\.venv\Scripts\python.exe"
Test-Path "D:\ai-runtime\musetalk-v15\MuseTalk"
```

Verificar CUDA:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\python.exe" -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none')"
```

Verificar paquetes:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\python.exe" -m pip check
```

### 3. Si Hay Lock Stale En Cache

Solo si no hay ninguna descarga corriendo y existe un lock colgado:

```powershell
$lock = "D:\ai-runtime\musetalk-v15\MuseTalk\models\.cache\huggingface\.gitignore.lock"
if (Test-Path -LiteralPath $lock) { Remove-Item -LiteralPath $lock -Force }
```

No borrar carpetas completas de cache sin aprobacion.

### 4. No Usar `download_weights.bat` Directo

El `.bat` oficial ejecuta:

```txt
pip install -U "huggingface_hub[hf_xet]"
```

Eso rompe dependencias. Usar descargas manuales con el entorno ya preparado.

### 5. Reinstalar Version Compatible De Hugging Face Si Hace Falta

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\python.exe" -m pip install "huggingface_hub==0.30.2"
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\python.exe" -m pip check
```

### 6. Descargar Pesos De Forma Controlada

Variables para no usar C:

```powershell
$env:HF_HOME = "D:\ai-runtime\musetalk-v15\hf-home"
$env:HUGGINGFACE_HUB_CACHE = "D:\ai-runtime\musetalk-v15\hf-cache"
$env:XDG_CACHE_HOME = "D:\ai-runtime\musetalk-v15\xdg-cache"
$env:TEMP = "D:\ai-runtime\musetalk-v15\tmp"
$env:TMP = "D:\ai-runtime\musetalk-v15\tmp"
```

Descargar MuseTalk 1.5:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\huggingface-cli.exe" download TMElyralab/MuseTalk --include "musetalkV15/*" --local-dir "D:\ai-runtime\musetalk-v15\MuseTalk\models" --cache-dir "D:\ai-runtime\musetalk-v15\hf-cache" --max-workers 1
```

Descargar SD VAE:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\huggingface-cli.exe" download stabilityai/sd-vae-ft-mse --include "config.json" "diffusion_pytorch_model.bin" --local-dir "D:\ai-runtime\musetalk-v15\MuseTalk\models\sd-vae" --cache-dir "D:\ai-runtime\musetalk-v15\hf-cache" --max-workers 1
```

Descargar Whisper tiny:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\huggingface-cli.exe" download openai/whisper-tiny --include "config.json" "pytorch_model.bin" "preprocessor_config.json" --local-dir "D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper" --cache-dir "D:\ai-runtime\musetalk-v15\hf-cache" --max-workers 1
```

Descargar DWPose:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\huggingface-cli.exe" download yzd-v/DWPose --include "dw-ll_ucoco_384.pth" --local-dir "D:\ai-runtime\musetalk-v15\MuseTalk\models\dwpose" --cache-dir "D:\ai-runtime\musetalk-v15\hf-cache" --max-workers 1
```

Descargar SyncNet:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\huggingface-cli.exe" download ByteDance/LatentSync --include "latentsync_syncnet.pt" --local-dir "D:\ai-runtime\musetalk-v15\MuseTalk\models\syncnet" --cache-dir "D:\ai-runtime\musetalk-v15\hf-cache" --max-workers 1
```

Descargar face-parse-bisent:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\huggingface-cli.exe" download ManyOtherFunctions/face-parse-bisent --include "79999_iter.pth" "resnet18-5c106cde.pth" --local-dir "D:\ai-runtime\musetalk-v15\MuseTalk\models\face-parse-bisent" --cache-dir "D:\ai-runtime\musetalk-v15\hf-cache" --max-workers 1
```

### 7. Healthcheck Despues De Pesos

Desde:

```powershell
cd "D:\ai-runtime\musetalk-v15\MuseTalk"
```

Ejecutar import check:

```powershell
& "D:\ai-runtime\musetalk-v15\.venv\Scripts\python.exe" -c "import torch, cv2, mmcv, mmengine, mmdet, mmpose; print('ok'); print(torch.cuda.is_available())"
```

Verificar existencia de pesos:

```powershell
Test-Path "D:\ai-runtime\musetalk-v15\MuseTalk\models\musetalkV15\unet.pth"
Test-Path "D:\ai-runtime\musetalk-v15\MuseTalk\models\sd-vae\diffusion_pytorch_model.bin"
Test-Path "D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper\pytorch_model.bin"
Test-Path "D:\ai-runtime\musetalk-v15\MuseTalk\models\dwpose\dw-ll_ucoco_384.pth"
Test-Path "D:\ai-runtime\musetalk-v15\MuseTalk\models\face-parse-bisent\79999_iter.pth"
```

## Imagen Nueva De Sol V2

La imagen neutral nueva fue enviada en chat, pero aun no quedo guardada como archivo en el repo.

En la nueva VM, guardarla en:

```txt
agencia/motor madre/PIPELINE INGESTA MENUS/assets/avatar/sol/v2/sol_v2_master_neutral_source.png
```

Luego crear por preprocesamiento determinista:

```txt
agencia/motor madre/PIPELINE INGESTA MENUS/assets/avatar/sol/v2/sol_v2_master_neutral.png
```

Requisitos:

```txt
720x1280
fondo exacto RGB(0,255,0)
busto corto
boca cerrada
ojos abiertos
mirada a camara
blazer negro preservado
broche y texto QuantumHive visibles
sin manos
sin sombras ni gradientes en verde
```

## Flujo Correcto Del Avatar (Reglas Finales)

Reglas que quedaron funcionando en produccion:

```txt
1. connector_idle queda fijo como video base.
2. No cambiar key/src del idle base.
3. Idles alternativos se reproducen encima con playAvatarClip.
4. Mirada lateral solo en 4 chips principales: Entradas, Plato principal, Bebidas, Postres.
5. Chips de platos NO miran al costado.
6. Chips de platos disparan connector_taking_order_cut.
7. Splash precarga carta/carrusel/welcome.
8. La carta no aparece hasta que el saludo real confirma onCanPlay.
```

## Codigo App Test Guardado

```txt
agencia/motor madre/motor-avatares-video-test
```

Archivos clave:

```txt
src/App.tsx
src/index.css
public/avatar-videos/sol/v1/*.webm
cloudbuild-video-test.yaml
Dockerfile
package.json
package-lock.json
```

## Assets Fuente Guardados

Se trackearon y pushearon los crudos/fuentes en:

```txt
agencia/motor madre/motor-avatares-run/foto avatar sol
```

Incluye:

```txt
PNGs fuente/referencia de Sol
Loops originales
Clips editados finales
Carpeta CORTADOS
Clips hablando 1/2/3
Clips de mirada, saludo, despedida, toma de pedido
idle 1, idle 3, idle 4, idle 5, idle 6
```

Tambien quedo guardado:

```txt
agencia/motor madre/dominus-prime/dominus.jpg
```

## Comandos Para Nueva VM

### 1. Clonar y preparar repo

```powershell
git clone https://github.com/sergiopalomba05-jpg/quantumhive.git boveda-obsidian
cd "boveda-obsidian"
git switch feat/avatar-engine-musetalk-v15
```

### 2. Preparar app test

```powershell
cd "agencia\motor madre\motor-avatares-video-test"
npm ci
npm run lint
npm run build
```

### 3. Deploy a Cloud Run

```powershell
gcloud builds submit --config "cloudbuild-video-test.yaml" .
```

### 4. Verificar deploy

```powershell
gcloud run services describe motor-avatares-video-test --region us-central1 --format "value(status.latestReadyRevisionName,status.traffic[0].revisionName,status.url)"
```

## Supabase (Plan Pendiente)

No se subieron assets a Supabase porque faltan bucket/proyecto/secrets confirmados.
El plan correcto documentado:

```txt
- Binarios en Supabase Storage
- Metadata en tabla tipo avatar_assets
- No guardar videos en columnas Postgres
- No commitear service role keys
```

Script existente:

```txt
agencia/motor madre/pipeline-vm-multimedia/scripts/upload_supabase.py
```

## Siguiente Implementacion En Codigo

Pendiente en nueva VM:

1. Completar pesos de MuseTalk en `D:\ai-runtime\musetalk-v15`
2. Crear `src/avatar_engines/`
3. Crear `MuseTalkEngine`
4. Mantener `LegacyComfyUIEngine`
5. Cambiar `generate_avatar_videos.py` solo para seleccionar motor configurable
6. Agregar `script_hash` a cache global
7. Eliminar `colorkey` negro del flujo productivo
8. Agregar QC automatico
9. Generar prueba dorada de 3 clips
10. Integrar en la app test existente

## Prueba Dorada Obligatoria

No lanzar batch completo hasta aprobar manualmente:

```txt
connector_idle
connector_welcome: "Hola, bienvenidos a La Escaloneta. Soy Sol, tu mesera virtual."
connector_entradas: "Excelente, te sugiero estas entradas."
```

## Rollback

Volver al estado previo a MuseTalk:

```powershell
git switch feat/pwa-agentes-unificada
```

O inspeccionar el snapshot exacto:

```powershell
git checkout backup-pre-musetalk-mvp
```

No usar `git reset --hard` salvo autorizacion explicita.

## Notas Criticas

- No instalar MuseTalk dentro de ComfyUI.
- No romper F5-TTS.
- No borrar motores legacy.
- No usar Veo/InfiniteTalk/Wan como produccion.
- No usar `colorkey=0x000000`; perfora el blazer negro.
- Usar el WAV original como audio final del WebM.
- No guardar en cache global renders sin QC aprobado.
- El snapshot del disco D no garantiza archivos del repo porque estan en C:\Users\sergio\Desktop\boveda-obsidian. Por eso quedaron subidos a Git.
