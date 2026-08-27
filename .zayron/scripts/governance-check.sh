#!/bin/bash
echo "Running Governance Check..."

if [ ! -f .zayron/controls/governance.config.json ]; then
  echo "BLOCKED: governance.config.json missing"
  exit 1
fi

echo "PASS"
