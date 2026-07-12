@echo off
setlocal enabledelayedexpansion

title Hermes — Conexion con Google Cloud

echo ============================================
echo  Hermes — Entorno Google Cloud
echo ============================================
echo.

REM ── 1. Verificar que gcloud existe ──
where gcloud >nul 2>&1
if errorlevel 1 (
    echo [ERROR] gcloud no esta en el PATH.
    echo Instalalo desde: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

REM ── 2. Forzar rutas canonicas (evita el bug C:\c\...) ──
set "CLOUDSDK_ROOT_DIR=C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk"
set "CLOUDSDK_PYTHON=python"
set "CLOUDSDK_CONFIG=%APPDATA%\gcloud"
set "PATH=%CLOUDSDK_ROOT_DIR%\bin;%CLOUDSDK_ROOT_DIR%\bin\sdk;%PATH%"

REM ── 3. Verificar que gcloud responde ──
echo [OK] CLOUDSDK_ROOT_DIR=%CLOUDSDK_ROOT_DIR%
for /f "tokens=*" %%a in ('gcloud config get-value core/project 2^>nul') do set "PROJECT=%%a"
echo [OK] Proyecto activo: %PROJECT%

for /f "tokens=*" %%a in ('gcloud config get-value core/account 2^>nul') do set "ACCOUNT=%%a"
echo [OK] Cuenta activa: %ACCOUNT%

REM ── 4. Verificar ADC (Application Default Credentials) ──
gcloud auth application-default print-access-token >nul 2>&1
if errorlevel 1 (
    echo.
    echo [AVISO] ADC no configurada. Ejecutar:
    echo    gcloud auth application-default login
    echo.
) else (
    echo [OK] Application Default Credentials activas
)

REM ── 5. Variables para Hermes ──
echo.
echo ============================================
echo  Variables para el .env de Hermes
echo  (%LOCALAPPDATA%\hermes\.env)
echo ============================================
echo.
echo  VERTEX_PROJECT_ID=%PROJECT%
echo  VERTEX_LOCATION=us-central1
echo  GOOGLE_APPLICATION_CREDENTIALS= (ADC automatica)
echo.
echo ============================================
echo  Entorno listo. gcloud funciona correctamente.
echo ============================================

REM ── 6. Si se pasa un comando como arg, lo ejecuta ──
if not "%1"=="" (
    echo.
    echo Ejecutando: %*
    %*
    exit /b !ERRORLEVEL!
)

exit /b 0
