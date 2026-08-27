#!/bin/bash
echo "Running Secret Scan..."

if grep -q -rE "(API_KEY|CF_API_TOKEN|TELEGRAM_SESSION|session_string)=" apps/ workers/ 2>/dev/null; then
  echo "BLOCKED: Secret leakage detected."
  exit 1
fi

echo "PASS"
