@echo off
title Crear VM GPU - ComfyUI
echo ========================================
echo   CREAR VM GPU PARA COMFYUI
echo   GCP - Google Cloud Platform
echo ========================================
echo.

REM Verificar gcloud
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] gcloud no encontrado.
    echo Instalar Google Cloud SDK desde:
    echo https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

REM Configuracion
set VM_NAME=comfyui-gpu
set ZONE=us-central1-a
set MACHINE_TYPE=g2-standard-8
set GPU_TYPE=nvidia-l4
set GPU_COUNT=1
set DISK_SIZE=100GB
set IMAGE_FAMILY=windows-2022-core-for-containers
set IMAGE_PROJECT=windows-cloud

echo Configuracion:
echo   VM: %VM_NAME%
echo   Zone: %ZONE%
echo   Machine: %MACHINE_TYPE%
echo   GPU: %GPU_TYPE% x%GPU_COUNT%
echo   Disk: %DISK_SIZE%
echo   Image: %IMAGE_FAMILY%
echo.

set /p CONFIRMAR="Crear VM? (S/n): "
if /i "%CONFIRMAR%"=="n" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo Creando VM...
echo Esto puede tardar 3-5 minutos...
echo.

gcloud compute instances create %VM_NAME% ^
    --zone=%ZONE% ^
    --machine-type=%MACHINE_TYPE% ^
    --accelerator=type=%GPU_TYPE%,count=%GPU_COUNT% ^
    --image-family=%IMAGE_FAMILY% ^
    --image-project=%IMAGE_PROJECT% ^
    --boot-disk-size=%DISK_SIZE% ^
    --boot-disk-type=pd-ssd ^
    --metadata-from-file=startup-script="%~dp0gcp-startup.ps1" ^
    --scopes=default ^
    --tags=comfyui,gpu

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo al crear la VM.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   VM CREADA EXITOSAMENTE
echo ========================================
echo.
echo.Nombre: %VM_NAME%
echo Zone: %ZONE%
echo.
echo Para conectar por RDP:
echo   gcloud compute instances describe %VM_NAME% --zone=%ZONE% --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
echo.
echo O usar Google Cloud Console:
echo   https://console.cloud.google.com/compute/instances?project=%IMAGE_PROJECT%
echo.
pause
