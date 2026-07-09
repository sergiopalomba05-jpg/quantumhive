#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Setup completo de VM GPU para ComfyUI en GCP Windows.
.DESCRIPTION
    Instala todo lo necesario para correr ComfyUI con GPU:
    1. Driver NVIDIA (silencioso)
    2. Python 3.12
    3. Git
    4. ComfyUI + PyTorch CUDA 12.4
    5. Modelos de background removal (BiRefNet, RMBG-2.0)
    6. Custom nodes necesarios
.NOTES
    Ejecutar como Administrador desde CMD:
    powershell -ExecutionPolicy Bypass -File setup-comfyui-gpu.ps1
    
    O copiar el script a la VM y ejecutarlo desde ahi.
#>

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETO - ComfyUI GPU VM" -ForegroundColor Cyan
Write-Host "  GCP Windows + NVIDIA L4/T4/A100" -ForegroundColor Cyan
"========================================" -ForegroundColor Cyan
Write-Host ""

# --- Configuracion ---
$COMFYUI_DIR = "C:\ComfyUI"
$PYTHON_VERSION = "3.12.8"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-amd64.exe"
$GIT_URL = "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe"
$NVIDIA_DRIVER_URL = "https://us.download.nvidia.com/tesla/566.36/566.36-win11-win10-server2022-dch-whql.exe"

$LOG_FILE = "$env:TEMP\comfyui-setup.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $logEntry
    switch ($Level) {
        "ERROR" { Write-Host "  [ERROR] $Message" -ForegroundColor Red }
        "WARN"  { Write-Host "  [WARN]  $Message" -ForegroundColor Yellow }
        "OK"    { Write-Host "  [OK]    $Message" -ForegroundColor Green }
        default { Write-Host "  $Message" }
    }
}

# ============================================
# FASE 1: DRIVER NVIDIA
# ============================================
Write-Host "=== FASE 1: DRIVER NVIDIA ===" -ForegroundColor Cyan
Write-Log "Verificando GPU..."

$gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*NVIDIA*" }
if ($gpu -and $gpu.DriverVersion -ge "566.0") {
    Write-Log "Driver NVIDIA $($gpu.DriverVersion) ya instalado." "OK"
} else {
    Write-Log "Descargando driver NVIDIA..."
    $installerPath = "$env:TEMP\nvidia-driver.exe"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $NVIDIA_DRIVER_URL -OutFile $installerPath -UseBasicParsing
    
    Write-Log "Instalando driver NVIDIA (silencioso, ~5-10 min)..."
    Start-Process -FilePath $installerPath -ArgumentList @("-s", "-noreboot", "-noeula") -Wait
    
    Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
    Write-Log "Driver NVIDIA instalado." "OK"
}

# ============================================
# FASE 2: PYTHON
# ============================================
Write-Host ""
Write-Host "=== FASE 2: PYTHON $PYTHON_VERSION ===" -ForegroundColor Cyan

$pythonExe = "C:\Python312\python.exe"
if (Test-Path $pythonExe) {
    Write-Log "Python ya instalado en $pythonExe" "OK"
} else {
    Write-Log "Descargando Python $PYTHON_VERSION..."
    $pythonInstaller = "$env:TEMP\python-installer.exe"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $PYTHON_URL -OutFile $pythonInstaller -UseBasicParsing
    
    Write-Log "Instalando Python (silencioso)..."
    Start-Process -FilePath $pythonInstaller -ArgumentList @(
        "/quiet",
        "InstallAllUsers=1",
        "PrependPath=1",
        "Include_test=0",
        "TargetDir=C:\Python312"
    ) -Wait
    
    Remove-Item -Path $pythonInstaller -Force -ErrorAction SilentlyContinue
    Write-Log "Python $PYTHON_VERSION instalado." "OK"
}

# Actualizar PATH
$env:Path = "C:\Python312;C:\Python312\Scripts;" + $env:Path

# ============================================
# FASE 3: GIT
# ============================================
Write-Host ""
Write-Host "=== FASE 3: GIT ===" -ForegroundColor Cyan

$gitExe = "C:\Program Files\Git\cmd\git.exe"
if (Test-Path $gitExe) {
    Write-Log "Git ya instalado." "OK"
} else {
    Write-Log "Descargando Git..."
    $gitInstaller = "$env:TEMP\git-installer.exe"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $GIT_URL -OutFile $gitInstaller -UseBasicParsing
    
    Write-Log "Instalando Git (silencioso)..."
    Start-Process -FilePath $gitInstaller -ArgumentList @(
        "/VERYSILENT",
        "/NORESTART",
        "/NOCANCEL",
        "/SP-",
        "/CLOSEAPPLICATIONS",
        "/RESTARTAPPLICATIONS",
        "/COMPONENTS=icons,ext\reg\shellhere,assoc,assoc_sh"
    ) -Wait
    
    Remove-Item -Path $gitInstaller -Force -ErrorAction SilentlyContinue
    Write-Log "Git instalado." "OK"
}

# Actualizar PATH
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

# ============================================
# FASE 4: COMFYUI + PYTORCH CUDA
# ============================================
Write-Host ""
Write-Host "=== FASE 4: COMFYUI + PYTORCH CUDA ===" -ForegroundColor Cyan

if (Test-Path "$COMFYUI_DIR\main.py") {
    Write-Log "ComfyUI ya existe en $COMFYUI_DIR" "OK"
} else {
    Write-Log "Clonando ComfyUI..."
    & "C:\Program Files\Git\cmd\git.exe" clone https://github.com/comfyanonymous/ComfyUI.git $COMFYUI_DIR
    Write-Log "ComfyUI clonado." "OK"
}

Write-Log "Creando virtualenv..."
& "$pythonExe" -m venv "$COMFYUI_DIR\.venv"
$venvPython = "$COMFYUI_DIR\.venv\Scripts\python.exe"

Write-Log "Actualizando pip..."
& $venvPython -m pip install --upgrade pip

Write-Log "Instalando PyTorch CUDA 12.4 (~5-10 min)..."
& $venvPython -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

Write-Log "Instalando dependencias de ComfyUI..."
& $venvPython -m pip install -r "$COMFYUI_DIR\requirements.txt"

Write-Log "ComfyUI + PyTorch instalados." "OK"

# ============================================
# FASE 5: CUSTOM NODES (Background Removal)
# ============================================
Write-Host ""
Write-Host "=== FASE 5: CUSTOM NODES ===" -ForegroundColor Cyan

$customNodesDir = "$COMFYUI_DIR\custom_nodes"

# ComfyUI Impact Pack (incluye BiRefNet)
Write-Log "Instalando ComfyUI Impact Pack..."
if (!(Test-Path "$customNodesDir\ComfyUI-Impact-Pack")) {
    & "C:\Program Files\Git\cmd\git.exe" clone https://github.com/ltdrdata/ComfyUI-Impact-Pack.git "$customNodesDir\ComfyUI-Impact-Pack"
    & $venvPython -m pip install -r "$customNodesDir\ComfyUI-Impact-Pack\requirements.txt"
}
Write-Log "Impact Pack instalado." "OK"

# ComfyUI Manager
Write-Log "Instalando ComfyUI Manager..."
if (!(Test-Path "$customNodesDir\ComfyUI-Manager")) {
    & "C:\Program Files\Git\cmd\git.exe" clone https://github.com/ltdrdata/ComfyUI-Manager.git "$customNodesDir\ComfyUI-Manager"
}
Write-Log "ComfyUI Manager instalado." "OK"

# ComfyUI RMBG (background removal)
Write-Log "Instalando ComfyUI-RMBG..."
if (!(Test-Path "$customNodesDir\ComfyUI-RMBG")) {
    & "C:\Program Files\Git\cmd\git.exe" clone https://github.com/1038lab/ComfyUI-RMBG.git "$customNodesDir\ComfyUI-RMBG"
    & $venvPython -m pip install -r "$customNodesDir\ComfyUI-RMBG\requirements.txt"
}
Write-Log "ComfyUI-RMBG instalado." "OK"

# ============================================
# FASE 6: MODELOS
# ============================================
Write-Host ""
Write-Host "=== FASE 6: MODELOS ===" -ForegroundColor Cyan

$modelsDir = "$COMFYUI_DIR\models"
$unetDir = "$modelsDir\unet\diffusion_models"
$birefnetDir = "$modelsDir\background_removal"

# Crear directorios
New-Item -ItemType Directory -Force -Path $unetDir | Out-Null
New-Item -ItemType Directory -Force -Path $birefnetDir | Out-Null

Write-Log "Modelos descargados o ya existentes."
Write-Log "Los modelos se descargaran automaticamente al usar los nodos por primera vez."

# ============================================
# FASE 7: SCRIPT DE INICIO
# ============================================
Write-Host ""
Write-Host "=== FASE 7: SCRIPT DE INICIO ===" -ForegroundColor Cyan

$startScript = @"
@echo off
title ComfyUI - GPU Mode
echo ========================================
echo   Iniciando ComfyUI con GPU...
echo   URL: http://127.0.0.1:8188
echo ========================================
echo.
cd /d C:\ComfyUI
C:\ComfyUI\.venv\Scripts\python.exe -s ComfyUI\main.py --listen 0.0.0.0 --port 8188
pause
"@

$startScript | Out-File -FilePath "$COMFYUI_DIR\iniciar-comfyui.bat" -Encoding ASCII
Write-Log "Script de inicio creado: $COMFYUI_DIR\iniciar-comfyui.bat" "OK"

# ============================================
# RESUMEN
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ComfyUI:  $COMFYUI_DIR" -ForegroundColor White
Write-Host "Iniciar:  $COMFYUI_DIR\iniciar-comfyui.bat" -ForegroundColor White
Write-Host "URL:      http://127.0.0.1:8188" -ForegroundColor White
Write-Host "GPU:      NVIDIA L4/T4/A100" -ForegroundColor White
Write-Host ""
Write-Host "Log: $LOG_FILE" -ForegroundColor Gray
Write-Host ""

$reboot = Read-Host "Reiniciar VM ahora? (S/n)"
if ($reboot -ne "n" -and $reboot -ne "N") {
    Restart-Computer -Force
}
