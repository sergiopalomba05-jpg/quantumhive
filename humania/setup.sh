#!/bin/bash
# ============================================
# HUMANIA — Setup Script
# Configura el proyecto para deploy
# ============================================

set -e

PROJECT_ID="project-aa5fb956-b08a-4e13-869"
REGION="us-central1"
AR_REPO="humania-artifacts"
SERVICE_NAME="humania"

echo "🚀 Configurando HUMANIA..."

# 1. Verificar gcloud
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI no encontrado. Instalar: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ gcloud CLI encontrado"

# 2. Verificar autenticación
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
    echo "❌ No hay cuenta activa. Ejecutar: gcloud auth login"
    exit 1
fi
echo "✅ Cuenta activa: $ACCOUNT"

# 3. Configurar proyecto
gcloud config set project $PROJECT_ID
echo "✅ Proyecto configurado: $PROJECT_ID"

# 4. Habilitar APIs necesarias
echo "📦 Habilitando APIs..."
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    compute.googleapis.com \
    --project=$PROJECT_ID

echo "✅ APIs habilitadas"

# 5. Crear Artifact Registry repo
echo "📦 Creando Artifact Registry repo..."
gcloud artifacts repositories create $AR_REPO \
    --repository-format=docker \
    --location=$REGION \
    --description="HUMANIA Docker images" \
    --project=$PROJECT_ID || echo "Repo ya existe"

echo "✅ Artifact Registry repo listo"

# 6. Configurar Docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo "✅ Docker configurado"

# 7. Crear Service Account para deploy
SA_NAME="humania-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🔐 Creando Service Account..."
gcloud iam service-accounts create $SA_NAME \
    --display-name="HUMANIA Deployer" \
    --project=$PROJECT_ID || echo "SA ya existe"

# Asignar roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.writer" \
    --condition=None

echo "✅ Service Account configurado"

# 8. Generar key para GitHub Actions
echo "🔑 Generando key para GitHub Actions..."
KEY_FILE="/tmp/humania-deployer-key.json"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SA_EMAIL

echo ""
echo "=========================================="
echo "✅ Setup completado!"
echo "=========================================="
echo ""
echo "Siguiente paso: copiar el contenido de $KEY_FILE"
echo "y agregarlo como GitHub Secret named 'GCP_SA_KEY'"
echo ""
echo "También agregar como GitHub Secret:"
echo "  - GEMINI_API_KEY: tu_api_key_de_vertex_ai"
echo ""
echo "Para deploy manual:"
echo "  gcloud run deploy $SERVICE_NAME \\"
echo "    --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE_NAME}:latest \\"
echo "    --region $REGION \\"
echo "    --gpu 1 \\"
echo "    --gpu-type nvidia-l4"
