#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala el driver NVIDIA GPU en una VM de GCP Windows.
.DESCRIPTION
    Descarga e instala el driver NVIDIA silenciosamente.
    Compatible con GPU L4, T4, A100, V100, etc.
.NOTES
    Ejecutar como Administrador desde CMD:
    powershell -ExecutionPolicy Bypass -File install-nvidia-driver.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR NVIDIA DRIVER - GCP VM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Configuracion ---
$DRIVER_VERSION = "566.36"
$DOWNLOAD_URL = "https://us.download.nvidia.com/tesla/566.36/566.36-win11-win10-server2022-dch-whql.exe"
$INSTALLER_PATH = "$env:TEMP\nvidia-driver-installer.exe"

# --- Verificar GPU ---
Write-Host "[1/5] Verificando GPU..." -ForegroundColor Yellow
$gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*NVIDIA*" }
if ($gpu) {
    Write-Host "  GPU detectada: $($gpu.Name)" -ForegroundColor Green
    Write-Host "  Driver actual: $($gpu.DriverVersion)" -ForegroundColor Gray
} else {
    Write-Host "  No se detecto GPU NVIDIA. Verificando dispositivos..." -ForegroundColor Red
    Get-WmiObject Win32_VideoController | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
}

# --- Verificar si ya esta instalado ---
Write-Host ""
Write-Host "[2/5] Verificando driver actual..." -ForegroundColor Yellow
if ($gpu -and $gpu.DriverVersion -ge "566.0") {
    Write-Host "  Driver $($gpu.DriverVersion) ya instalado y compatible." -ForegroundColor Green
    $confirm = Read-Host "  Deseas reinstalar? (s/N)"
    if ($confirm -ne "s" -and $confirm -ne "S") {
        Write-Host "  Omitiendo instalacion." -ForegroundColor Yellow
        exit 0
    }
}

# --- Descargar driver ---
Write-Host ""
Write-Host "[3/5] Descargando driver NVIDIA $DRIVER_VERSION..." -ForegroundColor Yellow
Write-Host "  URL: $DOWNLOAD_URL" -ForegroundColor Gray
Write-Host "  Esto puede tardar varios minutos..." -ForegroundColor Gray

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $INSTALLER_PATH -UseBasicParsing
    Write-Host "  Descarga completada." -ForegroundColor Green
} catch {
    Write-Host "  Error al descargar: $_" -ForegroundColor Red
    Write-Host "  Intenta descargar manualmente desde:" -ForegroundColor Yellow
    Write-Host "  https://www.nvidia.com/download/find.aspx" -ForegroundColor Yellow
    exit 1
}

# --- Instalar driver ---
Write-Host ""
Write-Host "[4/5] Instalando driver NVIDIA (silencioso)..." -ForegroundColor Yellow
Write-Host "  Esto puede tardar 5-10 minutos..." -ForegroundColor Gray

$installArgs = @(
    "-s"           # Silencioso
    "-noreboot"    # No reiniciar
    "-noeula"      # No mostrar EULA
)

try {
    $process = Start-Process -FilePath $INSTALLER_PATH -ArgumentList $installArgs -Wait -PassThru
    if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 1) {
        Write-Host "  Instalacion completada exitosamente." -ForegroundColor Green
    } else {
        Write-Host "  Instalacion finalizo con codigo: $($process.ExitCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error durante la instalacion: $_" -ForegroundColor Red
    exit 1
}

# --- Verificar ---
Write-Host ""
Write-Host "[5/5] Verificando instalacion..." -ForegroundColor Yellow
$gpuAfter = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*NVIDIA*" }
if ($gpuAfter) {
    Write-Host "  Driver instalado: $($gpuAfter.DriverVersion)" -ForegroundColor Green
    Write-Host "  GPU: $($gpuAfter.Name)" -ForegroundColor Green
} else {
    Write-Host "  No se pudo verificar. Es posible que necesite reinicio." -ForegroundColor Yellow
}

# --- Limpiar ---
Remove-Item -Path $INSTALLER_PATH -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALACION COMPLETADA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: Reinicia la VM para que el driver tome efecto." -ForegroundColor Red
Write-Host ""

$reboot = Read-Host "Deseas reiniciar ahora? (S/n)"
if ($reboot -ne "n" -and $reboot -ne "N") {
    Write-Host "Reiniciando VM..." -ForegroundColor Yellow
    Restart-Computer -Force
} else {
    Write-Host "Reinicia manualmente cuando puedas." -ForegroundColor Yellow
}
