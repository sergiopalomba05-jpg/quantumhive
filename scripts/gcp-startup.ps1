#Requires -RunAsAdministrator
<#
.SYNOPSIS
    GCP Startup Script - Setup automatico de VM GPU para ComfyUI.
.DESCRIPTION
    Se ejecuta automaticamente al crear una VM GPU en GCP.
    Uso: Configurar como metadata startup-script en GCP.
    
    gcloud compute instances create my-vm ^
      --zone=us-central1-a ^
      --machine-type=g2-standard-8 ^
      --accelerator=type=nvidia-l4,count=1 ^
      --metadata-from-file=startup-script=gcp-startup.ps1
.NOTES
    Requiere: GCP VM con GPU (g2-standard-*, a2-standard-*, etc.)
    SO: Windows Server 2022 o Windows 11
#>

$ErrorActionPreference = "Continue"
$LOG_FILE = "C:\gcp-startup.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $Message"
    Add-Content -Path $LOG_FILE -Value $entry
    Write-Output $entry
}

Write-Log "=========================================="
Write-Log "  GCP STARTUP SCRIPT - ComfyUI GPU VM"
Write-Log "=========================================="

# --- FASE 1: Driver NVIDIA ---
Write-Log "FASE 1: Verificando GPU..."
$gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*NVIDIA*" }
if ($gpu -and $gpu.DriverVersion -ge "566.0") {
    Write-Log "Driver NVIDIA ya instalado: $($gpu.DriverVersion)"
} else {
    Write-Log "Descargando driver NVIDIA 566.36..."
    $nvidiaUrl = "https://us.download.nvidia.com/tesla/566.36/566.36-win11-win10-server2022-dch-whql.exe"
    $nvidiaInstaller = "$env:TEMP\nvidia-driver.exe"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    
    try {
        Invoke-WebRequest -Uri $nvidiaUrl -OutFile $nvidiaInstaller -UseBasicParsing
        Write-Log "Instalando driver NVIDIA (silencioso)..."
        Start-Process -FilePath $nvidiaInstaller -ArgumentList @("-s", "-noreboot", "-noeula") -Wait
        Remove-Item -Path $nvidiaInstaller -Force -ErrorAction SilentlyContinue
        Write-Log "Driver NVIDIA instalado."
    } catch {
        Write-Log "ERROR al instalar driver NVIDIA: $_"
    }
}

# --- FASE 2: Python ---
Write-Log "FASE 2: Verificando Python..."
$pythonExe = "C:\Python312\python.exe"
if (!(Test-Path $pythonExe)) {
    Write-Log "Descargando Python 3.12..."
    $pythonUrl = "https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe"
    $pythonInstaller = "$env:TEMP\python-installer.exe"
    
    try {
        Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller -UseBasicParsing
        Start-Process -FilePath $pythonInstaller -ArgumentList @(
            "/quiet", "InstallAllUsers=1", "PrependPath=1", 
            "Include_test=0", "TargetDir=C:\Python312"
        ) -Wait
        Remove-Item -Path $pythonInstaller -Force -ErrorAction SilentlyContinue
        Write-Log "Python 3.12 instalado."
    } catch {
        Write-Log "ERROR al instalar Python: $_"
    }
}

# --- FASE 3: Git ---
Write-Log "FASE 3: Verificando Git..."
$gitExe = "C:\Program Files\Git\cmd\git.exe"
if (!(Test-Path $gitExe)) {
    Write-Log "Descargando Git..."
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe"
    $gitInstaller = "$env:TEMP\git-installer.exe"
    
    try {
        Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller -UseBasicParsing
        Start-Process -FilePath $gitInstaller -ArgumentList @(
            "/VERYSILENT", "/NORESTART", "/SP-"
        ) -Wait
        Remove-Item -Path $gitInstaller -Force -ErrorAction SilentlyContinue
        Write-Log "Git instalado."
    } catch {
        Write-Log "ERROR al instalar Git: $_"
    }
}

# --- FASE 4: ComfyUI ---
Write-Log "FASE 4: Verificando ComfyUI..."
$comfyDir = "C:\ComfyUI"
if (!(Test-Path "$comfyDir\main.py")) {
    Write-Log "Clonando ComfyUI..."
    & $gitExe clone https://github.com/comfyanonymous/ComfyUI.git $comfyDir
} else {
    Write-Log "ComfyUI ya existe."
}

# Virtualenv + PyTorch CUDA
if (!(Test-Path "$comfyDir\.venv\Scripts\python.exe")) {
    Write-Log "Creando virtualenv..."
    & $pythonExe -m venv "$comfyDir\.venv"
    
    & "$comfyDir\.venv\Scripts\python.exe" -m pip install --upgrade pip
    & "$comfyDir\.venv\Scripts\python.exe" -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
    & "$comfyDir\.venv\Scripts\python.exe" -m pip install -r "$comfyDir\requirements.txt"
}

# --- FASE 5: Custom Nodes ---
Write-Log "FASE 5: Instalando custom nodes..."
$customNodes = "$comfyDir\custom_nodes"

if (!(Test-Path "$customNodes\ComfyUI-Manager")) {
    & $gitExe clone https://github.com/ltdrdata/ComfyUI-Manager.git "$customNodes\ComfyUI-Manager"
}

if (!(Test-Path "$customNodes\ComfyUI-RMBG")) {
    & $gitExe clone https://github.com/1038lab/ComfyUI-RMBG.git "$customNodes\ComfyUI-RMBG"
    & "$comfyDir\.venv\Scripts\python.exe" -m pip install -r "$customNodes\ComfyUI-RMBG\requirements.txt"
}

# --- FASE 6: Script de inicio ---
Write-Log "FASE 6: Creando script de inicio..."
$startScript = @"
@echo off
title ComfyUI - GPU Mode
cd /d C:\ComfyUI
C:\ComfyUI\.venv\Scripts\python.exe -s ComfyUI\main.py --listen 0.0.0.0 --port 8188
pause
"@
$startScript | Out-File -FilePath "$comfyDir\iniciar-comfyui.bat" -Encoding ASCII

# --- RESUMEN ---
Write-Log "=========================================="
Write-Log "  SETUP COMPLETADO"
Write-Log "  ComfyUI: $comfyDir"
Write-Log "  Iniciar: $comfyDir\iniciar-comfyui.bat"
Write-Log "  URL: http://127.0.0.1:8188"
Write-Log "=========================================="
