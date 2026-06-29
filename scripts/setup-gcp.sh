#!/usr/bin/env bash
# =============================================================================
# setup-gcp.sh — Configura GCP para Nelson IANoteTaker
#
# Uso:
#   chmod +x scripts/setup-gcp.sh
#   ./scripts/setup-gcp.sh
#
# Requisitos previos:
#   - gcloud CLI instalado: https://cloud.google.com/sdk/docs/install
#   - Autenticado: gcloud auth login
#   - Proyecto GCP creado con facturación activada
# =============================================================================

set -e

# ── Configuración — editar estos valores ──────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
BILLING_ACCOUNT_ID="${GCP_BILLING_ACCOUNT_ID:-}"
ALERT_EMAIL="${GCP_ALERT_EMAIL:-}"
BUDGET_LIMIT_USD=10    # Budget total en USD
ALERT_THRESHOLD_USD=5  # Alerta al llegar a $5 USD (50% del budget)
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
err()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

# Validar variables requeridas
[ -z "$PROJECT_ID" ]       && err "Falta GCP_PROJECT_ID. Ej: export GCP_PROJECT_ID=mi-proyecto"
[ -z "$BILLING_ACCOUNT_ID" ] && err "Falta GCP_BILLING_ACCOUNT_ID. Ver: gcloud billing accounts list"
[ -z "$ALERT_EMAIL" ]      && err "Falta GCP_ALERT_EMAIL para recibir alertas de billing"

log "Configurando proyecto: $PROJECT_ID en región $REGION"

# ── 1. Establecer proyecto activo ─────────────────────────────────────────────
gcloud config set project "$PROJECT_ID"
log "Proyecto activo: $PROJECT_ID"

# ── 2. Vincular cuenta de facturación ────────────────────────────────────────
gcloud billing projects link "$PROJECT_ID" \
  --billing-account="$BILLING_ACCOUNT_ID"
log "Facturación vinculada"

# ── 3. Habilitar APIs necesarias ─────────────────────────────────────────────
log "Habilitando APIs (puede tardar 1-2 minutos)..."
gcloud services enable \
  run.googleapis.com \
  speech.googleapis.com \
  docs.googleapis.com \
  drive.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbilling.googleapis.com \
  billingbudgets.googleapis.com \
  --project="$PROJECT_ID"
log "APIs habilitadas"

# ── 4. Crear repositorio de imágenes Docker ──────────────────────────────────
REPO_NAME="nelson-bff"
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || warn "Repositorio '$REPO_NAME' ya existe, continuando..."
log "Repositorio Docker: $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"

# ── 5. Crear Service Account para el BFF ────────────────────────────────────
SA_NAME="nelson-bff-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create "$SA_NAME" \
  --display-name="Nelson BFF Service Account" \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || warn "Service account ya existe, continuando..."

# Asignar rol de Speech-to-Text
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/speech.client" \
  --quiet

log "Service account configurado: $SA_EMAIL"

# ── 6. Crear alerta de presupuesto ($5 USD) ──────────────────────────────────
log "Creando alerta de presupuesto..."

# Obtener el número de proyecto (requerido por la Budgets API)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT_ID" \
  --display-name="Nelson IANoteTaker – Alerta \$${ALERT_THRESHOLD_USD}" \
  --budget-amount="${BUDGET_LIMIT_USD}USD" \
  --threshold-rule="percent=0.5,basis=CURRENT_SPEND" \
  --threshold-rule="percent=0.9,basis=CURRENT_SPEND" \
  --threshold-rule="percent=1.0,basis=CURRENT_SPEND" \
  --filter-projects="projects/$PROJECT_NUMBER" \
  --all-updates-rule-monitoring-notification-channels="" \
  --format="value(name)" 2>/dev/null || warn "No se pudo crear el budget automáticamente. Créalo manualmente en: https://console.cloud.google.com/billing/$BILLING_ACCOUNT_ID/budgets"

log "Alerta de presupuesto configurada: aviso a \$${ALERT_THRESHOLD_USD} USD, límite \$${BUDGET_LIMIT_USD} USD"

# ── 7. Resumen ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} GCP configurado correctamente para Nelson IANoteTaker${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Proyecto:       $PROJECT_ID"
echo "  Región:         $REGION"
echo "  Docker repo:    $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"
echo "  Service account: $SA_EMAIL"
echo ""
echo "Próximos pasos:"
echo "  1. Obtener GEMINI_API_KEY en: https://aistudio.google.com"
echo "  2. Ejecutar el deploy del BFF:"
echo ""
echo "     gcloud builds submit \\"
echo "       --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/bff:latest \\"
echo "       -f apps/bff/Dockerfile ."
echo ""
echo "     gcloud run deploy nelson-bff \\"
echo "       --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/bff:latest \\"
echo "       --region $REGION \\"
echo "       --service-account $SA_EMAIL \\"
echo "       --set-env-vars GEMINI_API_KEY=TU_KEY,GOOGLE_CLOUD_PROJECT=$PROJECT_ID \\"
echo "       --min-instances 0 --max-instances 5"
echo ""
echo "  3. Configurar alertas de email en GCP Console:"
echo "     https://console.cloud.google.com/billing/$BILLING_ACCOUNT_ID/budgets"
echo ""
