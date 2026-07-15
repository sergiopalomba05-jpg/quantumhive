# Hermes - Entorno Google Cloud
# Ejecutar antes de levantar Hermes

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Hermes - Entorno Google Cloud" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# 1. Forzar rutas canonicas
$cloudsdk_root = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk"
$env:CLOUDSDK_ROOT_DIR = $cloudsdk_root
$env:CLOUDSDK_PYTHON = "python"
$env:CLOUDSDK_CONFIG = "$env:APPDATA\gcloud"
$env:PATH = "$cloudsdk_root\bin;$cloudsdk_root\bin\sdk;$env:PATH"

# 2. Verificar gcloud
$project = gcloud config get-value core/project 2>$null
$account = gcloud config get-value core/account 2>$null

if ($project) {
    Write-Host "[OK] Proyecto: $project" -ForegroundColor Green
    Write-Host "[OK] Cuenta: $account" -ForegroundColor Green

    # 3. Verificar ADC
    $token = gcloud auth application-default print-access-token 2>$null
    if ($token) {
        Write-Host "[OK] ADC activas" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] ADC no configurada. Correr: gcloud auth application-default login" -ForegroundColor Yellow
    }

    # 4. Info para Hermes
    Write-Host "`nVariables para .env de Hermes:" -ForegroundColor Cyan
    Write-Host "  VERTEX_PROJECT_ID=$project"
    Write-Host "  VERTEX_LOCATION=us-central1"
    Write-Host "`nEntorno listo. gcloud funciona correctamente." -ForegroundColor Green
} else {
    Write-Host "[ERROR] gcloud no responde" -ForegroundColor Red
}
