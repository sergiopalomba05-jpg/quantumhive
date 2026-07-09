@echo off
REM git-sync.bat - Wrapper para git-sync.ps1
REM Uso:  git-sync start | stop | status

set SCRIPT=%~dp0git-sync.ps1

if /I "%1"=="start" (
    powershell -ExecutionPolicy Bypass -File "%SCRIPT%" -start
    goto :eof
)
if /I "%1"=="stop" (
    start /B powershell -ExecutionPolicy Bypass -File "%SCRIPT%" -stop >nul 2>&1
    goto :eof
)
if /I "%1"=="status" (
    powershell -ExecutionPolicy Bypass -File "%SCRIPT%" -status
    goto :eof
)

echo Uso: git-sync [start^|stop^|status]
echo.
echo   start   - Inicia sync en background
echo   stop    - Detiene sync
echo   status  - Muestra estado
