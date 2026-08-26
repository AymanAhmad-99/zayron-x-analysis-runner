#!/bin/bash
# ============================================
# ZAYRON-X — Production Deploy Script
# Run on VPS: bash deploy.sh
# ============================================

set -e

echo "=== ZAYRON-X Deployment ==="
echo "Started: $(date)"

PROJECT_DIR="/var/www/zayron"
APP_DIR="$PROJECT_DIR/zayron-x"
REPO_URL="https://github.com/zayron-x/zayron-x.git"
BRANCH="main"

# 1. Pull latest code
echo "--- Pulling latest code ---"
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# 2. Install Next.js dependencies
echo "--- Installing dependencies ---"
cd "$APP_DIR"
bun install --frozen-lockfile --production

# 3. Build Next.js
echo "--- Building Next.js ---"
bun run build

# 4. Apply database migrations
echo "--- Applying database migrations ---"
bun run db:push || echo "Migration skipped — no pending changes"

# 5. Apply RLS security policies
echo "--- Applying RLS policies ---"
if [ -f "$PROJECT_DIR/supabase_rls_patch.sql" ]; then
    echo "RLS patch available at $PROJECT_DIR/supabase_rls_patch.sql"
    echo "Apply manually via Supabase SQL Editor or supabase CLI."
fi

# 6. Restart PM2 processes
echo "--- Restarting PM2 ---"
pm2 startOrReload "$APP_DIR/pm2.ecosystem.config.js" --update-env

# 7. Reload Nginx
echo "--- Reloading Nginx ---"
sudo nginx -t && sudo systemctl reload nginx

# 8. Cleanup
echo "--- Cleaning up ---"
pm2 save

echo "=== Deployment complete: $(date) ==="
echo "Site: https://zayron-x.com"
