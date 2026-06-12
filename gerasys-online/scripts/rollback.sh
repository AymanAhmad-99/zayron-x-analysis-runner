#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ZAYRON-X — Production Rollback Script
#
# Reverts the Cloudflare Worker to the previous deployment using
# `wrangler rollback`.  If no previous deployment exists, the
# script exits with an error.
#
# Usage:
#   bash scripts/rollback.sh
#   bash scripts/rollback.sh --env preview    # Roll back preview
#
# Required environment variables:
#   CLOUDFLARE_API_TOKEN   — CF API token with Workers edit scope
#   CLOUDFLARE_ACCOUNT_ID  — Cloudflare account ID
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV="production"
NON_INTERACTIVE=false

# Check if CI environment variable is set
if [[ "${CI:-}" == "true" ]]; then
  NON_INTERACTIVE=true
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENV="$2"
      shift 2
      ;;
    -y|--yes)
      NON_INTERACTIVE=true
      shift
      ;;
    *)
      if [[ "$1" != -* ]]; then
        ENV="$1"
      fi
      shift
      ;;
  esac
done


RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[ROLLBACK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[ROLLBACK]${NC} $1"; }
log_error() { echo -e "${RED}[ROLLBACK]${NC} $1"; }

# ── Pre-flight checks ────────────────────────────────────────

if ! command -v wrangler &> /dev/null; then
  log_error "wrangler CLI not found. Install with: bun add -g wrangler"
  exit 1
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  log_error "CLOUDFLARE_API_TOKEN is not set."
  exit 1
fi

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  log_error "CLOUDFLARE_ACCOUNT_ID is not set."
  exit 1
fi

# ── Verify current deployment state ──────────────────────────

log_info "Checking current deployment for environment: ${ENV}"

DEPLOYMENTS=$(wrangler deployments list --env "$ENV" 2>&1) || {
  log_error "Failed to list deployments. Is the Worker name correct?"
  log_error "Output: $DEPLOYMENTS"
  exit 1
}

DEPLOYMENT_COUNT=$(echo "$DEPLOYMENTS" | grep -c "Deployment ID" || true)

if [ "$DEPLOYMENT_COUNT" -lt 2 ]; then
  log_error "Only ${DEPLOYMENT_COUNT} deployment(s) found — nothing to roll back to."
  log_error "A rollback requires at least one previous deployment."
  exit 1
fi

# ── Execute rollback ─────────────────────────────────────────

log_warn "Preparing to roll back 'zayron-x' (env: ${ENV}) to previous deployment..."
log_info "Recent deployments:"
echo "$DEPLOYMENTS" | head -10
echo ""

if [ "$NON_INTERACTIVE" != "true" ]; then
  read -rp "Confirm rollback? This will immediately revert all traffic. [y/N]: " CONFIRM

  if [ "${CONFIRM,,}" != "y" ] && [ "${CONFIRM,,}" != "yes" ]; then
    log_info "Rollback cancelled."
    exit 0
  fi
fi

log_info "Executing rollback..."

ROLLBACK_OUTPUT=$(wrangler rollback --env "$ENV" 2>&1) || {
  log_error "Rollback FAILED."
  log_error "Output: $ROLLBACK_OUTPUT"
  log_error "Attempt manual rollback: wrangler rollback --env $ENV"
  exit 1
}

log_info "Rollback SUCCESSFUL."

# ── Verify rollback ──────────────────────────────────────────

log_info "Verifying rollback..."
sleep 5

# Check Sentry error rate after rollback (optional — requires SENTRY_AUTH_TOKEN)
if [ -n "${SENTRY_AUTH_TOKEN:-}" ] && [ -n "${SENTRY_ORG:-}" ] && [ -n "${SENTRY_PROJECT:-}" ]; then
  log_info "Checking Sentry error rate post-rollback..."

  STATS=$(curl -s -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
    "${SENTRY_API_BASE:-https://sentry.io/api/0}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/stats/?resolution=5m&stat=received" 2>&1) || true

  if echo "$STATS" | grep -q '"error"'; then
    log_warn "Could not verify Sentry stats (credentials may be wrong)."
  else
    log_info "Sentry stats retrieved — monitor for error normalization."
  fi
fi

log_info "Rollback complete. Previous deployment is now serving 100% of traffic."
log_info "Monitor https://zayron-x.com/status for health."

exit 0
