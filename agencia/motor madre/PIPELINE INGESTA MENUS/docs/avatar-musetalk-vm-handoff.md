# Handoff VM - MuseTalk 1.5 para Avatar Sol

Fecha: 2026-07-14

## Objetivo

Continuar en una VM nueva la integracion de MuseTalk 1.5 como motor visual del avatar Sol, sin reescribir el pipeline existente.

El pipeline de ingesta/cache se conserva:

```txt
job -> audio WAV F5-TTS -> motor visual -> master MP4 -> WebM VP9 alpha + Opus -> cache global
```

Solo se reemplaza el motor visual de produccion por MuseTalk 1.5.

## Estado Git Al Cierre De Esta VM

Repo:

```txt
C:\Users\sergio\Desktop\boveda-obsidian
```

Rama de trabajo:

```txt
feat/avatar-engine-musetalk-v15
```

Backup creado antes de MuseTalk:

```txt
commit: 4ad788b chore: snapshot avatar pipeline before musetalk
tag: backup-pre-musetalk-mvp
```

Base anterior:

```txt
40f6847 chore: package avatar pipeline diagnostics
2341159 feat: add avatar video pipeline and test app
```

Regla de continuidad: seguir en `feat/avatar-engine-musetalk-v15`, no trabajar sobre `main`.

## Estado De La VM Actual

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
C: casi lleno, no usar para runtime pesado
D: usado para MuseTalk
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

FFmpeg completo con `ffprobe` instalado para LivePortrait y validaciones:

```txt
D:\tools\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\ffmpeg.exe
D:\tools\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\ffprobe.exe
```

`pip check` quedo limpio despues de ajustar:

```txt
typer==0.12.5
rich==13.4.2
huggingface_hub==0.30.2
```

Motivo: el `download_weights.bat` oficial intento subir `huggingface_hub` a `1.23.0`, lo cual rompe `transformers==4.39.2`. No volver a ejecutar el `.bat` sin modificar.

## Pesos / Checkpoints

Los pesos quedaron completos en esta VM despues de retomar la descarga controlada.

Archivos verificados:

```txt
D:\ai-runtime\musetalk-v15\MuseTalk\models\musetalkV15\unet.pth                         3400074924 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\musetalkV15\musetalk.json                    748 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\sd-vae\config.json                           547 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\sd-vae\diffusion_pytorch_model.bin           334707217 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper\config.json                          1983 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper\pytorch_model.bin                    151095027 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\whisper\preprocessor_config.json             184990 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\dwpose\dw-ll_ucoco_384.pth                   406878486 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\syncnet\latentsync_syncnet.pt                1488019828 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\face-parse-bisent\79999_iter.pth             53289463 bytes
D:\ai-runtime\musetalk-v15\MuseTalk\models\face-parse-bisent\resnet18-5c106cde.pth      46827520 bytes
```

Si el snapshot del disco D conserva esta carpeta, no hace falta volver a descargar pesos.
Si no conserva D, usar `install/musetalk-v15/install-musetalk-v15.ps1` para reconstruir.

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
$env:TORCH_HOME = "D:\ai-runtime\musetalk-v15\torch-cache"
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

Desde el repo tambien se puede ejecutar:

```powershell
& "C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\PIPELINE INGESTA MENUS\install\musetalk-v15\healthcheck-musetalk-v15.ps1"
```

O manualmente:

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

Nota: una ejecucion de `python -m scripts.inference --help` puede disparar la descarga del detector S3FD de `face_alignment`. Siempre definir `TORCH_HOME=D:\ai-runtime\musetalk-v15\torch-cache` antes de ejecutar scripts de MuseTalk para no llenar `C:`.

## Imagen Nueva De Sol V2

La imagen neutral nueva ya quedo guardada en el repo.

Fuente aprobada:

```txt
agencia/motor madre/PIPELINE INGESTA MENUS/assets/avatar/sol/v2/sol_v2_master_neutral_source.png
```

Imagen normalizada creada por preprocesamiento determinista:

```txt
agencia/motor madre/PIPELINE INGESTA MENUS/assets/avatar/sol/v2/sol_v2_master_neutral.png
```

Mascara y reporte:

```txt
agencia/motor madre/PIPELINE INGESTA MENUS/assets/avatar/sol/v2/sol_v2_master_mask.png
agencia/motor madre/PIPELINE INGESTA MENUS/assets/avatar/sol/v2/sol_v2_master_report.json
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

## Arquitectura Corregida Del Master

No crear dos masters visuales independientes para idle y speaking.

Crear un unico master visual aprobado:

```txt
agencia/motor madre/PIPELINE INGESTA MENUS/assets/avatar/sol/v2/masters/sol_v2_master_base.mkv
```

Tambien se puede exportar un preview MP4, pero el archivo fuente de produccion debe ser lossless o casi lossless.

Uso obligatorio:

```txt
idle     -> reproducir sol_v2_master_base directamente, sin MuseTalk y sin audio
speaking -> loop/recorte controlado de sol_v2_master_base a la duracion del WAV, luego MuseTalk 1.5
```

Razon: evita diferencias entre idle y speaking en identidad, escala, pose, hombros, broche, texto, blazer y encuadre.

La creacion del master base debe animar solamente rostro, ojos, labios en posicion neutral y, si es estrictamente necesario, una region minima del cuello. Fondo, blazer, camisa, hombros, broche, logo y texto QuantumHive deben permanecer congelados y recomponerse desde la imagen original con una mascara facial suave.

No confiar en el verde generado por ningun modelo. Despues de animar, segmentar a Sol, recomponer cada frame sobre RGB(0,255,0) exacto y validar matematicamente que el fondo sea uniforme.

## LivePortrait Para Master Sol V2

Runtime verificado:

```txt
D:\LivePortrait
D:\LivePortrait\.venv
Python 3.10.20
torch 2.3.0+cu118
CUDA disponible: True
GPU: NVIDIA L4
opencv-python: 4.10.0
pip check: No broken requirements found.
```

Comando de verificacion:

```powershell
& "D:\LivePortrait\.venv\Scripts\python.exe" -m pip check
& "D:\LivePortrait\.venv\Scripts\python.exe" -c "import torch, cv2, tyro; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none'); print(cv2.__version__)"
$env:TORCH_HOME='D:\LivePortrait\torch-cache'; & "D:\LivePortrait\.venv\Scripts\python.exe" inference.py -h
```

LivePortrait requiere `ffmpeg` y `ffprobe` en PATH. Usar:

```powershell
$env:PATH='D:\tools\ffmpeg\ffmpeg-8.1.2-essentials_build\bin;' + $env:PATH
```

Comando usado para generar el candidato expresivo:

```powershell
$env:PATH='D:\tools\ffmpeg\ffmpeg-8.1.2-essentials_build\bin;' + $env:PATH
$env:TORCH_HOME='D:\LivePortrait\torch-cache'
$env:TEMP='D:\LivePortrait\tmp'
$env:TMP='D:\LivePortrait\tmp'
$env:PYTHONIOENCODING='utf-8'
$env:PYTHONUTF8='1'
& "D:\LivePortrait\.venv\Scripts\python.exe" inference.py -s "C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\PIPELINE INGESTA MENUS\assets\avatar\sol\v2\sol_v2_master_neutral.png" -d "D:\LivePortrait\assets\examples\driving\d0.mp4" -o "C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\PIPELINE INGESTA MENUS\output\liveportrait_sol_v2" --animation-region exp --driving-multiplier 0.55 --flag-stitching --flag-pasteback --flag-normalize-lip --source-max-dim 1280
```

Nota Windows: sin `PYTHONIOENCODING=utf-8` / `PYTHONUTF8=1`, LivePortrait puede fallar por `UnicodeEncodeError` al imprimir el emoji del progreso.

Postproceso para construir el master FFV1 desde la salida LivePortrait:

```powershell
cd "C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\PIPELINE INGESTA MENUS"
& "D:\LivePortrait\.venv\Scripts\python.exe" "src\build_sol_v2_master_from_liveportrait.py" --ffmpeg "D:\tools\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\ffmpeg.exe"
```

Resultado tecnico validado:

```txt
assets/avatar/sol/v2/masters/sol_v2_master_base.mkv
assets/avatar/sol/v2/masters/sol_v2_master_idle.mp4
assets/avatar/sol/v2/masters/sol_v2_master_build_report.json
output/liveportrait_sol_v2/sol_v2_master_contact.jpg
```

Propiedades:

```txt
codec: FFV1
pix_fmt: bgr0
resolucion: 720x1280
fps: 25
duracion: 6.16s
frames: 154
fondo fuera de mascara: RGB(0,255,0) exacto, 100%, delta 0
```

Estado: candidato tecnico validado, pendiente de aprobacion visual humana. Revisar `output/liveportrait_sol_v2/sol_v2_master_contact.jpg` y `assets/avatar/sol/v2/masters/sol_v2_master_idle.mp4` antes de integrarlo a MuseTalk.

Formato preferido del master:

```txt
1. Secuencia PNG lossless
2. FFV1 lossless en MKV
3. Fallback: H.264 CRF 0 con pix_fmt yuv444p
```

No usar H.264 yuv420p comprimido como fuente definitiva para chromakey porque contamina bordes verdes alrededor de pelo, orejas y hombros.

Movimiento del master base:

```txt
duracion: 6 a 8 segundos
fps: 25
boca cerrada neutral
uno o dos parpadeos naturales
mirada directa
respiracion casi imperceptible
cabeza casi fija
hombros inmoviles
sin zoom
sin cambio de escala
sin movimiento de camara
```

El primer y ultimo frame deben ser compatibles. No usar ping-pong si hay parpadeo, porque produciria un parpadeo invertido.

## Siguiente Implementacion En Codigo

No se comenzo todavia la modificacion del pipeline. Pendiente:

1. Crear `src/avatar_engines/`.
2. Crear `MuseTalkEngine`.
3. Mantener `LegacyComfyUIEngine`.
4. Cambiar `generate_avatar_videos.py` solo para seleccionar motor configurable usando `sol_v2_master_base`.
5. Agregar `script_hash` a cache global.
6. Eliminar `colorkey` negro del flujo productivo.
7. Agregar QC automatico.
8. Generar prueba dorada de 3 clips.

## Prueba Dorada Obligatoria

No lanzar batch completo hasta aprobar manualmente:

```txt
connector_idle
connector_welcome: "Hola, bienvenidos a La Escaloneta. Soy Sol, tu mesera virtual."
connector_entradas: "Excelente, te sugiero estas entradas."
```

## Estado MVP Cloud Run - 2026-07-17

Servicio test deployado:

```txt
motor-avatares-video-test
URL publica: https://motor-avatares-video-test-557866434489.us-central1.run.app
Revision activa validada: motor-avatares-video-test-00024-xrx
```

Validaciones ejecutadas:

```powershell
npm run lint
npm run build
gcloud builds submit --config "cloudbuild-video-test.yaml" .
```

Assets publicos versionables en la app test:

```txt
public/avatar-videos/sol/v1/connector_idle_cut_1.webm
public/avatar-videos/sol/v1/connector_idle_cut_hair.webm
public/avatar-videos/sol/v1/connector_idle_cut_3.webm
public/avatar-videos/sol/v1/connector_idle_cut_4.webm
public/avatar-videos/sol/v1/connector_idle_cut_wait.webm
public/avatar-videos/sol/v1/connector_look_left_cut.webm
public/avatar-videos/sol/v1/connector_look_right_cut.webm
public/avatar-videos/sol/v1/connector_taking_order_cut.webm
public/avatar-videos/sol/v1/connector_welcome_cut.webm
public/avatar-videos/sol/v1/connector_farewell_cut.webm
public/avatar-videos/sol/v1/connector_live_invite_cut.webm
```

Propiedades verificadas para los clips de gesto/idle finales:

```txt
codec: VP9 WebM
resolucion: 720x1280
alpha: TAG:alpha_mode=1
audio: 0 streams para idles/gestos, para evitar doble audio
```

Mapeo de interacciones en `motor-avatares-video-test/src/App.tsx`:

```txt
idle base             -> connector_idle_cut_1.webm
idle alternativos     -> connector_idle_cut_hair.webm, connector_idle_cut_3.webm, connector_idle_cut_4.webm, connector_idle_cut_wait.webm
chip principal izq.   -> connector_look_left_cut.webm
chip principal der.   -> connector_look_right_cut.webm
agregar al pedido     -> connector_taking_order_cut.webm
bienvenida            -> connector_welcome_cut.webm
despedida             -> connector_farewell_cut.webm
invitacion a live     -> connector_live_invite_cut.webm
chips de platos       -> sin mirada lateral, solo seleccion + alta al pedido
```

## Workflow Limpio Actual - Sol V2 App Test

Objetivo del flujo actual: una experiencia guiada por capas, con 4 chips principales como home, seleccion de platos progresiva y salida clara hacia pedido.

Estado funcional deployado en Cloud Run test:

```txt
Revision: motor-avatares-video-test-00020-2xl
Build local: npm run lint OK, npm run build OK
Build remoto: gcloud builds submit OK
URL publica: https://motor-avatares-video-test-557866434489.us-central1.run.app
```

Actualizacion 2026-07-17 posterior:

```txt
Revision: motor-avatares-video-test-00021-x2h
Objetivo: precargar carta en splash, clips nuevos de mirada, rating 2s antes, invitacion a live despues de puntuar.
Build local: npm run lint OK, npm run build OK
Build remoto: gcloud builds submit OK
```

Actualizacion 2026-07-17 ajuste fino:

```txt
Revision: motor-avatares-video-test-00022-gpr
Objetivo: chips principales seleccionados 5s durante mirada lateral, follow-up guiado tambien desde boton + de tarjeta, Ver mi pedido mas abajo.
Build local: npm run lint OK, npm run build OK
Build remoto: gcloud builds submit OK
```

Actualizacion 2026-07-17 transiciones:

```txt
Revision: motor-avatares-video-test-00024-xrx
Objetivo: eliminar hueco transparente al tocar chips principales y suavizar cortes entre videos.
Build local: npm run lint OK, npm run build OK
Build remoto: gcloud builds submit OK
```

Flujo UI optimo:

```txt
1. Splash carga y precalienta connector_welcome_cut.webm.
2. La carta se monta y precalienta detras del splash con `#app.prewarming`, invisible y sin pointer events.
3. El carrusel se inicializa en segundo plano aunque `showSplash` sea true.
4. Tap de entrada reproduce bienvenida sin poster gris usando poster transparente.
5. Home muestra 4 chips principales: Entradas, Plato Principal, Bebidas, Postres.
6. Solo esos chips principales disparan mirada lateral izquierda/derecha y quedan seleccionados 5s.
7. El autoguiado de platos arranca despues de los 5s del video de mirada lateral.
8. Cada seccion muestra recomendaciones paginadas de a 3 platos.
9. El paginador siempre muestra Volver, aun cuando exista Mas opciones.
10. Elegir un plato lo agrega al pedido, despliega feedback de Sol y pasa a una capa de continuacion.
11. Boton atras del celular retrocede capas: subcategoria bebida -> tipo bebida -> pagina anterior -> home de 4 chips -> confirmacion de salida.
12. Enviar pedido dispara despedida y abre estrellas 2 segundos antes que el flujo anterior.
13. Al terminar rating se reproduce invitacion a charlar y aparece boton de llamada live arriba del avatar.
```

Continuaciones despues de agregar platos:

```txt
Entrada agregada   -> Otra entrada / Plato principal / Inicio
Principal agregado -> Otro principal / Bebidas / Inicio
Bebida agregada    -> Otra bebida / Postre / Ver mi pedido
Postre agregado    -> Ver mi pedido / Agregar algo mas
```

Reglas de interaccion que quedaron correctas:

```txt
- No llamar a converse("Contame sobre el plato...") despues de seleccionar un plato guiado.
- El seguimiento posterior al plato debe ser deterministico con getGuidedSelectionFollowup.
- El alta al pedido centraliza follow-up en addToCart para que funcione desde chip guiado y boton + de tarjeta.
- resetGuidedFlow vuelve siempre al home de 4 chips y limpia filtros de bebidas.
- preloadedAvatarVideosRef conserva los videos precargados para evitar garbage collection.
- Los videos visibles usan poster transparente para evitar frame gris.
```

Transiciones visuales actuales:

```txt
speaking video fade-in: 680ms
idle video fade: 760ms
idle queda en opacity 0.08 debajo del clip activo
speaking se desmonta 950ms despues de ended para solapar visualmente con idle
revision 00023: playAvatarClip precarga el clip en un video en memoria y recien reemplaza el visible cuando loadeddata/canplay esta listo.
revision 00023: speaking fade 1100ms, idle fade 1200ms, idle bajo clip activo opacity 0.16, desmontaje 1300ms.
```

Posicion UI actual:

```txt
cart-bar Ver mi pedido: bottom calc(196px + safe-area)
quick-actions: flanquean el avatar abajo, sin tapar el centro
live-call-float: bottom calc(222px + safe-area), aparece despues de puntuar o durante llamada live
toast: mantener fuera del rostro/avatar en mobile
```

Clips nuevos incorporados desde `CORTADOS` en revision 00021:

```txt
mirando izquierda.mp4 -> connector_look_left_cut.webm
mirando derecha.mp4 -> connector_look_right_cut.webm
invitacion a charlar.mp4 -> connector_live_invite_cut.webm
```

Validacion tecnica de los tres WebM:

```txt
codec: VP9
resolucion: 720x1280
alpha: TAG:alpha_mode=1
audio: sin audio
```

Comandos optimos para validar y deployar app test:

```powershell
cd "C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-video-test"
npm run lint
npm run build
gcloud builds submit --config "cloudbuild-video-test.yaml" .
gcloud run services describe motor-avatares-video-test --region us-central1 --format "value(status.latestReadyRevisionName,status.traffic[0].revisionName,status.url)"
```

Verificaciones HTTP minimas post deploy:

```powershell
Invoke-WebRequest -Uri "https://motor-avatares-video-test-557866434489.us-central1.run.app" -UseBasicParsing
Invoke-WebRequest -Uri "https://motor-avatares-video-test-557866434489.us-central1.run.app/avatar-videos/sol/v1/connector_welcome_cut.webm" -Method Head -UseBasicParsing
Invoke-WebRequest -Uri "https://motor-avatares-video-test-557866434489.us-central1.run.app/avatar-videos/sol/v1/connector_idle_cut_1.webm" -Method Head -UseBasicParsing
```

Pasos descartados / errores a no repetir:

```txt
- No volver a mezclar WebM viejos con el pack CORTADOS.
- No disparar mirada lateral en chips de platos o subfiltros, solo en chips principales.
- No dejar Mas opciones como unica salida: siempre mantener Volver.
- No depender de agent-browser para QA critico en esta maquina; fue inestable con ChildProcess.kill.
- No usar el download_weights.bat oficial de MuseTalk sin modificar porque actualiza huggingface_hub y rompe dependencias.
- No usar colorkey negro; perfora blazer negro.
- No usar H.264 yuv420p como master de chromakey por contaminacion de bordes.
- No borrar crudos ni carpetas de sesiones anteriores sin orden explicita.
```

Checklist de QA humano en celular real:

```txt
1. Entrar desde splash: no debe aparecer reproductor gris.
2. Welcome debe sentirse inmediato.
3. Chips principales deben quedar seleccionados y Sol debe mirar al lado correcto.
4. Chips de platos no deben disparar mirada lateral.
5. Mas opciones y Volver deben convivir en listas largas.
6. Boton atras del celular debe volver por capas hasta los 4 chips principales.
7. Ver mi pedido debe quedar pegado arriba del avatar, sin tapar rostro.
8. Transiciones entre clips no deben sentirse cortadas.
```

Texto visible/audio de bienvenida:

```txt
Bienvenidos a La Escaloneta. Soy tu mesera virtual. ¿Qué vas a elegir hoy?
```

Texto Entradas:

```txt
Excelente elección. Te recomiendo estas entradas. Arranquemos por esta primera opción.
```

Fuentes locales usadas para esta tanda, no mover ni borrar:

```txt
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\idle 1.mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\idle 3 acomodandose el pelo (online-video-cutter.com).mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\idle 3.mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\idle 4.mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\idle 5 cuando tarda mucho (online-video-cutter.com).mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\mirando a la derecha (online-video-cutter.com).mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\mirando a la izquiera (online-video-cutter.com).mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\tomando pedido (online-video-cutter.com).mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\saludo bienvenida.mp4
C:\Users\sergio\Desktop\boveda-obsidian\agencia\motor madre\motor-avatares-run\foto avatar sol\editados finales\CORTADOS\saludo despedida.mp4
```

Decision sobre clips `hablando 1/2/3.mp4`:

```txt
No conectarlos por ahora. Ya traen boca muy activa y pueden pelearse con TTS/MuseTalk.
Usarlos solo como referencia visual o para una prueba aislada con audio fijo.
```

Comando de conversion base para idles/gestos verticales sin audio:

```powershell
$filter = "scale=720:1280:force_original_aspect_ratio=decrease:flags=lanczos,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=0x00FF00,format=rgba,chromakey=0x00FF00:0.28:0.08,despill=type=green:mix=0.85:expand=0.35,format=yuva420p"
ffmpeg -y -i input.mp4 -map 0:v:0 -vf $filter -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 28 -an output.webm
```

Comando de conversion para el clip horizontal `mirando izquierda`:

```powershell
ffmpeg -y -i "mirando  a la izquiera.mp4" -map 0:v:0 -vf "crop=608:1080:656:0,scale=720:1280:flags=lanczos,format=rgba,chromakey=0x00FF00:0.28:0.08,despill=type=green:mix=0.85:expand=0.35,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 28 -an connector_look_left_final.webm
```

Notas de producto pendientes:

- QA visual humana de los gestos en celular real.
- El set activo debe ser solo el pack `CORTADOS`; los WebM anteriores fueron removidos de `public/avatar-videos/sol/v1`.
- Decidir si los chips de chat dentro del panel deben disparar tambien mirada lateral o quedar neutros.

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
- Usar un unico master base para idle y speaking; no crear masters visuales independientes.
