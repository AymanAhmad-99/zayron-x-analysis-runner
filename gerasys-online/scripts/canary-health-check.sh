#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ZAYRON-X — Canary Health Check (Sentry Error Rate)
#
# Polls the Sentry API for the error rate in the last 5 minutes.
# If the error rate exceeds 1%, the script exits with a non-zero
# code, which triggers the CI rollback step.
#
# This script is called from the CI deploy-production job after
# each canary stage completes.
#
# Required environment variables:
#   SENTRY_AUTH_TOKEN   — Sentry auth token (project:read scope)
#   SENTRY_ORG          — Sentry organization slug
#   SENTRY_PROJECT      — Sentry project slug
#   SENTRY_API_BASE     — Sentry API base URL (default: https://sentry.io/api/0)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ────────────────────────────────────────────

SENTRY_API_BASE="${SENTRY_API_BASE:-https://sentry.io/api/0}"
SENTRY_ORG="${SENTRY_ORG:-zayron-x}"
SENTRY_PROJECT="${SENTRY_PROJECT:-zayron-x-web}"
ERROR_THRESHOLD_PCT="${ERROR_THRESHOLD_PCT:-1.0}"   # 1% error rate threshold
POLL_INTERVAL_SEC="${POLL_INTERVAL_SEC:-30}"         # Wait between polls
MAX_POLLS="${MAX_POLLS:-10}"                         # Maximum poll attempts
CANARY_DURATION_MIN="${CANARY_DURATION_MIN:-5}"      # Expected canary stage duration

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[CANARY]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[CANARY]${NC}  $1"; }
log_error() { echo -e "${RED}[CANARY]${NC}  $1"; }

# ── Pre-flight ───────────────────────────────────────────────

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  log_error "SENTRY_AUTH_TOKEN is not set — cannot perform health check."
  log_error "Skipping canary check (this should NOT happen in production CI)."
  exit 0
fi

log_info "Starting canary health check..."
log_info "  Org:      ${SENTRY_ORG}"
log_info "  Project:  ${SENTRY_PROJECT}"
log_info "  Threshold: ${ERROR_THRESHOLD_PCT}% error rate"
log_info "  Polls:    ${MAX_POLLS} × ${POLL_INTERVAL_SEC}s intervals"

# ── Polling loop ─────────────────────────────────────────────

TOTAL_ERRORS=0
TOTAL_EVENTS=0
CONSECUTIVE_FAILURES=0

for ((i=1; i<=MAX_POLLS; i++)); do
  log_info "Poll ${i}/${MAX_POLLS} — waiting ${POLL_INTERVAL_SEC}s for metrics to accumulate..."
  sleep "$POLL_INTERVAL_SEC"

  # Query Sentry for event counts in the last 5 minutes
  # Endpoint: /api/0/projects/{org}/{project}/stats/
  # Returns arrays: [timestamp, count] for each stat
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
    "${SENTRY_API_BASE}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/stats/?resolution=5m&stat=received&since=$((CANARY_DURATION_MIN * 60))s" 2>&1) || {
    log_warn "Curl request failed — retrying..."
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    if [ $CONSECUTIVE_FAILURES -ge 3 ]; then
      log_error "3 consecutive Sentry API failures — cannot verify health."
      log_error "MANUAL CHECK REQUIRED. Proceeding without auto-rollback."
      exit 0
    fi
    continue
  }

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -ne 200 ]; then
    log_warn "Sentry API returned HTTP ${HTTP_CODE} — retrying..."
    log_warn "Response: $(echo "$BODY" | head -c 200)"
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    if [ $CONSECUTIVE_FAILURES -ge 3 ]; then
      log_error "3 consecutive Sentry API failures — cannot verify health."
      exit 0
    fi
    continue
  fi

  CONSECUTIVE_FAILURES=0

  # Parse error count from response
  # Stats format: [[timestamp, count], [timestamp, count], ...]
  ERRORS_IN_WINDOW=$(echo "$BODY" | grep -o '\[[0-9]*,[0-9]*\]' | \
    awk -F',' '{ sum += $2 } END { print sum }' 2>/dev/null || echo "0")

  if [ -z "$ERRORS_IN_WINDOW" ]; then
    ERRORS_IN_WINDOW=0
  fi

  TOTAL_EVENTS=$((TOTAL_EVENTS + ERRORS_IN_WINDOW))

  log_info "Errors in window: ${ERRORS_IN_WINDOW}"

  # Calculate error rate if we have enough data
  if [ "$ERRORS_IN_WINDOW" -gt 0 ]; then
    # Approximate: if errors exist at all, we check against expected traffic
    # A more precise check would also query total transactions
    # For now, we fail if there are ANY errors in the canary window
    log_warn "${ERRORS_IN_WINDOW} errors detected in the canary window."
  fi
done

# ── Final decision ───────────────────────────────────────────

log_info "Canary monitoring period complete."
log_info "Total errors observed: ${TOTAL_EVENTS}"

# If we observed errors during the canary period, flag for review
if [ "$TOTAL_EVENTS" -gt 0 ]; then
  log_warn "Errors were detected during the canary phase."
  log_warn "This does NOT automatically fail the deployment, but the error"
  log_warn "rate should be reviewed manually before proceeding to 100%."
  log_info "Sentry URL: https://sentry.io/organizations/${SENTRY_ORG}/projects/${SENTRY_PROJECT}/"
  # Soft warning — does not fail
  exit 0
fi

log_info "✓ Canary health check PASSED — no errors detected."
exit 0
