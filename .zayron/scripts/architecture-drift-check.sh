#!/bin/bash
echo "Running Architecture Drift Check..."

# Check for duplicate frontend
if [ -d "apps/legacy-web" ]; then
  echo "BLOCKED: Duplicate frontend detected."
  exit 1
fi

echo "PASS"
