@echo off
setlocal

set "VM_USER=sergio"
set "VM_HOST=34.46.143.250"
set "LOCAL_PORT=3390"
set "REMOTE_PORT=3389"
set "SSH_KEY=%USERPROFILE%\.ssh\google_compute_engine"
set "KNOWN_HOSTS=%USERPROFILE%\.ssh\google_compute_known_hosts"
set "RDP_FILE=%~dp0opencode-workstation.rdp"

if not exist "%SSH_KEY%" (
  echo No existe la clave SSH esperada en "%SSH_KEY%".
  pause
  exit /b 1
)

if not exist "%RDP_FILE%" (
  echo No existe el archivo RDP en "%RDP_FILE%".
  pause
  exit /b 1
)

for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-NetTCPConnection -LocalPort %LOCAL_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"') do set "TUNNEL_PID=%%i"

if not defined TUNNEL_PID (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$args=@('-F','NUL','-N','-L','%LOCAL_PORT%:127.0.0.1:%REMOTE_PORT%','-i','%SSH_KEY%','-o','UserKnownHostsFile=%KNOWN_HOSTS%','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=no','%VM_USER%@%VM_HOST%'); Start-Process -WindowStyle Hidden -FilePath (Get-Command ssh.exe).Source -ArgumentList $args"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(10); do { $ok=Test-NetConnection -ComputerName 127.0.0.1 -Port %LOCAL_PORT% -WarningAction SilentlyContinue; if ($ok.TcpTestSucceeded) { exit 0 }; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $deadline); exit 1"
  if errorlevel 1 (
    echo No se pudo abrir el tunel RDP a la VM.
    pause
    exit /b 1
  )
)

start "" mstsc "%RDP_FILE%"
echo Se abrio Escritorio remoto para la VM.
exit /b 0
