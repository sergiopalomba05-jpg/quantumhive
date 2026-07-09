# git-sync.ps1 - Sync automatico via GitHub API
# Uso:
#   .\scripts\git-sync.ps1 start   - inicia en background
#   .\scripts\git-sync.ps1 stop    - detiene
#   .\scripts\git-sync.ps1 status  - muestra estado

param(
    [switch]$start,
    [switch]$stop,
    [switch]$status,
    [switch]$daemon  # interno: usado por auto-daemonize
)

$ErrorActionPreference = "SilentlyContinue"
$script:REPO = "sergiopalomba05-jpg/quantumhive"
$script:INTERVAL = 30
$script:ROOT = Split-Path $PSCommandPath -Parent
$script:LOG = Join-Path $script:ROOT "git-sync.log"
$script:PID_FILE = Join-Path $script:ROOT "git-sync.pid"

function Log { param($m) "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $m" | Out-File -Append $script:LOG }

function Get-RemoteSHA {
    try {
        $url = "https://api.github.com/repos/$($script:REPO)/commits?per_page=1"
        return (Invoke-RestMethod $url -TimeoutSec 10)[0].sha
    } catch { Log "ERROR API: $($_.Exception.Message)"; return $null }
}

function Get-LocalSHA { return git rev-parse HEAD 2>$null }

function Sync {
    $r = Get-RemoteSHA
    $l = Get-LocalSHA
    if (-not $r -or -not $l) { return }
    if ($r -ne $l) {
        Log "CAMBIO - remoto:$($r.Substring(0,8)) local:$($l.Substring(0,8))"
        $dirty = git status --porcelain 2>$null
        if ($dirty) {
            Log "WORKTREE SUCIO - stash antes de pull"
            git stash push -m "sync $(Get-Date -Format 'HH:mm:ss')" 2>$null
        }
        $pull = git pull --rebase origin 2>&1
        Log "PULL: $pull"
    }
}

function Start-Daemon {
    Log "=== INICIADO ==="
    $PID | Out-File $script:PID_FILE -NoNewline
    while ($true) { Sync; Start-Sleep $script:INTERVAL }
}

function Stop-Sync {
    if (Test-Path $script:PID_FILE) {
        $p = Get-Content $script:PID_FILE
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        Remove-Item $script:PID_FILE -Force
        Log "DETENIDO (PID $p)"
        Write-Host "Sync detenido." -ForegroundColor Yellow
    } else { Write-Host "No hay sync activo." -ForegroundColor Gray }
}

function Show-Status {
    if (Test-Path $script:PID_FILE) {
        $p = Get-Content $script:PID_FILE
        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
        if (-not $proc) {
            Remove-Item $script:PID_FILE -Force
            Write-Host "INACTIVO (PID muerto)" -ForegroundColor Red; return
        }
        Write-Host "ACTIVO - PID $p (cada ${script:INTERVAL}s)" -ForegroundColor Green
        $l = Get-LocalSHA; $r = Get-RemoteSHA
        if ($l -and $r) {
            if ($l -eq $r) { Write-Host "  -> Sincronizado" -ForegroundColor Green }
            else { Write-Host "  -> Pendiente de pull" -ForegroundColor Yellow }
            Write-Host "  Local: $($l.Substring(0,8))  Remoto: $($r.Substring(0,8))" -ForegroundColor Cyan
        }
    } else { Write-Host "INACTIVO" -ForegroundColor Red }
}

# --- LOGICA PRINCIPAL ---

if ($daemon) {
    # Modo interno: ejecuta el loop
    Start-Daemon
    exit
}

if ($stop) { Stop-Sync; exit }
if ($status) { Show-Status; exit }

if ($start) {
    # Verificar si ya esta corriendo
    if (Test-Path $script:PID_FILE) {
        $p = Get-Content $script:PID_FILE
        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
        if ($proc) { Write-Host "Ya activo (PID $p). Usa 'stop' para detener." -ForegroundColor Yellow; exit }
        Remove-Item $script:PID_FILE -Force
    }
    # Auto-daemonize: se lanza a si mismo en un proceso independiente
    $arg = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -daemon"
    Start-Process powershell -WindowStyle Hidden -ArgumentList $arg
    Write-Host "Sync iniciado en background." -ForegroundColor Green
    Start-Sleep 1
    Show-Status
    exit
}

Write-Host "Uso: .\scripts\git-sync.ps1 start | stop | status"
Write-Host "  start  - Inicia sync cada ${script:INTERVAL}s"
Write-Host "  stop   - Detiene sync"
Write-Host "  status - Muestra estado"
