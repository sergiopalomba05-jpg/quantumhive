# ============================================================
# SCRIPT: Configurar ComfyUI para acceso remoto + RMBG
# EJECUTAR EN LA VM GPU POR RDP
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CONFIGURANDO COMFYUI PARA ACCESO REMOTO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Buscar ComfyUI
$comfyPaths = @(
    "C:\Users\sergio\AppData\Local\Comfy-Desktop\ComfyUI-Installs\multimedia quantum\ComfyUI",
    "C:\Users\sergio\ComfyUI",
    "C:\ComfyUI",
    "D:\ComfyUI"
)

$comfyDir = $null
foreach ($path in $comfyPaths) {
    if (Test-Path $path) {
        $comfyDir = $path
        Write-Host "[OK] ComfyUI encontrado en: $path" -ForegroundColor Green
        break
    }
}

if (-not $comfyDir) {
    Write-Host "[ERROR] No se encontro ComfyUI" -ForegroundColor Red
    Write-Host "Buscando en todo el disco..." -ForegroundColor Yellow
    $found = Get-ChildItem -Path C:\ -Filter "main.py" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.DirectoryName -like "*ComfyUI*" } | Select-Object -First 1
    if ($found) {
        $comfyDir = $found.DirectoryName
        Write-Host "[OK] Encontrado en: $comfyDir" -ForegroundColor Green
    } else {
        Write-Host "[FATAL] ComfyUI no encontrado. Instalalo primero." -ForegroundColor Red
        exit 1
    }
}

# 2. Matar procesos de ComfyUI existentes
Write-Host "`n[1/6] Terminando procesos existentes..." -ForegroundColor Yellow
Get-Process -Name python* -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*ComfyUI*" -or $_.CommandLine -like "*main.py*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "[OK] Procesos terminados" -ForegroundColor Green

# 3. Abrir firewall puerto 8188
Write-Host "`n[2/6] Abriendo puerto 8188 en firewall..." -ForegroundColor Yellow
$rule = Get-NetFirewallRule -DisplayName "ComfyUI*" -ErrorAction SilentlyContinue
if (-not $rule) {
    New-NetFirewallRule -DisplayName "ComfyUI Port 8188" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8188
    Write-Host "[OK] Regla de firewall creada" -ForegroundColor Green
} else {
    Write-Host "[OK] Regla ya existe" -ForegroundColor Green
}

# 4. Verificar que RMBG esta instalado
Write-Host "`n[3/6] Verificando nodos RMBG..." -ForegroundColor Yellow
$customNodes = Join-Path $comfyDir "custom_nodes"
$rmbgPath = Join-Path $customNodes "ComfyUI-RMBG"
if (Test-Path $rmbgPath) {
    Write-Host "[OK] ComfyUI-RMBG instalado" -ForegroundColor Green
} else {
    Write-Host "[INFO] Instalando ComfyUI-RMBG..." -ForegroundColor Yellow
    Push-Location $customNodes
    git clone https://github.com/1038lab/ComfyUI-RMBG.git
    Push-Location "ComfyUI-RMBG"
    & python -m pip install -r requirements.txt
    Pop-Location
    Pop-Location
    Write-Host "[OK] ComfyUI-RMBG instalado" -ForegroundColor Green
}

# 5. Verificar ComfyUI-Manager
Write-Host "`n[4/6] Verificando ComfyUI-Manager..." -ForegroundColor Yellow
$managerPath = Join-Path $customNodes "ComfyUI-Manager"
if (Test-Path $managerPath) {
    Write-Host "[OK] ComfyUI-Manager instalado" -ForegroundColor Green
} else {
    Write-Host "[INFO] Instalando ComfyUI-Manager..." -ForegroundColor Yellow
    Push-Location $customNodes
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
    Pop-Location
    Write-Host "[OK] ComfyUI-Manager instalado" -ForegroundColor Green
}

# 6. Iniciar ComfyUI con --listen
Write-Host "`n[5/6] Iniciando ComfyUI en modo escucha..." -ForegroundColor Yellow
$env:PYTHONPATH = $comfyDir
$mainPy = Join-Path $comfyDir "main.py"

# Verificar que Python funciona
Write-Host "Verificando Python..." -ForegroundColor DarkGray
$pythonExe = Join-Path $comfyDir "python_embeded\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

# Iniciar ComfyUI como proceso background
$process = Start-Process -FilePath $pythonExe -ArgumentList "`"$mainPy`" --listen 0.0.0.0 --port 8188 --preview-method auto" -WorkingDirectory $comfyDir -PassThru -WindowStyle Minimized
Write-Host "[OK] ComfyUI iniciado (PID: $($process.Id))" -ForegroundColor Green

# 7. Esperar a que este listo
Write-Host "`n[6/6] Esperando a que ComfyUI este listo..." -ForegroundColor Yellow
$maxWait = 60
$waited = 0
while ($waited -lt $maxWait) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8188/system_stats" -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] ComfyUI esta listo!" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 3
        $waited += 3
        Write-Host "." -NoNewline -ForegroundColor DarkGray
    }
}

if ($waited -ge $maxWait) {
    Write-Host "`n[WARN] ComfyUI tarda en arrancar. Verifica manualmente." -ForegroundColor Yellow
}

# 8. Verificar acceso externo
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " VERIFICACION FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "34.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
Write-Host "IP de la VM: $ip" -ForegroundColor White
Write-Host "Puerto: 8188" -ForegroundColor White
Write-Host "URL: http://${ip}:8188" -ForegroundColor Green
Write-Host "URL externa: http://34.73.247.22:8188" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " COMFYUI CONFIGURADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ahora podes usar ComfyUI desde:" -ForegroundColor White
Write-Host "  - Dentro de la VM: http://localhost:8188" -ForegroundColor White
Write-Host "  - Externamente: http://34.73.247.22:8188" -ForegroundColor White
Write-Host "`nNodos instalados:" -ForegroundColor White
Write-Host "  - ComfyUI-Manager (para instalar nodos)" -ForegroundColor White
Write-Host "  - ComfyUI-RMBG (para quitar fondos)" -ForegroundColor White
