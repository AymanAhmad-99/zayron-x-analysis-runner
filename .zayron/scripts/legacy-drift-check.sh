#!/bin/bash
echo "Running Legacy Drift Check..."

if grep -q "npm run deploy" .github/workflows/*.yml 2>/dev/null; then
  echo "BLOCKED: Legacy deployment command detected."
  exit 1
fi

echo "PASS"
