@echo off
REM sync-all-branches.bat
REM Sincroniza todas las ramas - ejecutar desde la raiz del repo

echo === QuantumHive Git Sync ===
echo.

echo [1/3] Fetching all remotes...
git fetch --all --prune
echo.

echo [2/3] Branch actual:
git branch --show-current
echo.

echo [3/3] Estado de ramas:
git branch -vv
echo.

echo [4/4] Pull branch actual...
git pull --ff-only
echo.

echo === Sync completo ===
echo.
echo Para sync completo de todas las ramas:
echo   powershell -ExecutionPolicy Bypass -File scripts\sync-all-branches.ps1 -AutoMerge
