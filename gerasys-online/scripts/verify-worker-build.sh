#!/bin/bash
# ──────────────────────────────────────────────────────────────
# ZAYRON‑X — Worker Bundle Verification
#
# Scans the built .open-next/worker.js for forbidden Node.js
# built-in module references.  These modules do NOT exist in
# Cloudflare Workers V8 isolates and will cause "No such
# module" errors at runtime (code 10021).
#
# Run AFTER `bun run build` (or `next build --webpack`).
# ──────────────────────────────────────────────────────────────
set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifying Worker bundle for forbidden Node.js modules..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BUNDLE_DIR=".open-next"

if [ ! -d "$BUNDLE_DIR" ]; then
    echo "❌ ERROR: $BUNDLE_DIR does not exist. Run 'bun run build' first."
    exit 1
fi

# Top-tier severity: these modules CANNOT exist in Workers and will
# cause deployment rejection or runtime crashes (code 10021).
FORBIDDEN_MODULES=(
    "node:fs"
    "node:child_process"
    "node:module"
    "node:v8"
    "node:worker_threads"
    "node:os"
    "node:http2"
)

FILES_TO_SCAN=(
    ".open-next/worker.js"
    "worker-wrapper.js"
)

echo ""
echo "📋 Checking for CRITICAL modules (deployment blockers)..."
CRITICAL_FOUND=false
for mod in "${FORBIDDEN_MODULES[@]}"; do
    FOUND_IN_FILE=""
    for file in "${FILES_TO_SCAN[@]}"; do
        if [ -f "$file" ] && grep -q "$mod" "$file" 2>/dev/null; then
            FOUND_IN_FILE="$file"
            break
        fi
    done

    if [ -n "$FOUND_IN_FILE" ]; then
        echo "   ❌ FOUND: $mod"
        for file in "${FILES_TO_SCAN[@]}"; do
            if [ -f "$file" ] && grep -q "$mod" "$file" 2>/dev/null; then
                grep -Hrn "$mod" "$file"
            fi
        done
        CRITICAL_FOUND=true
    else
        echo "   ✅ $mod — not found"
    fi
done

if [ "$CRITICAL_FOUND" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ FAILED: Forbidden Node.js modules detected in bundle!"
    echo ""
    echo "   Fix: Ensure lib/polyfills/fs.ts and lib/polyfills/os.ts"
    echo "   exist, and wrangler.toml has [build.alias] redirecting"
    echo "   'fs' and 'os' to the polyfill stubs."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

# Secondary severity: these should not be in the bundle but are
# provided by nodejs_compat_v2 at runtime.  If they appear as
# unresolved imports, they will still fail.
echo ""
echo "📋 Checking for WARNING modules (nodejs_compat_v2 polyfills)..."
WARNING_MODULES=(
    "node:net"
    "node:tls"
    "node:dns"
    "node:path"
    "node:process"
    "node:http"
    "node:https"
    "node:zlib"
    "node:readline"
    "node:url"
    "node:querystring"
    "node:punycode"
    "node:perf_hooks"
    "node:diagnostics_channel"
    "node:trace_events"
)

WARNING_FOUND=false
for mod in "${WARNING_MODULES[@]}"; do
    FOUND_IN_FILE=""
    for file in "${FILES_TO_SCAN[@]}"; do
        if [ -f "$file" ] && grep -q "$mod" "$file" 2>/dev/null; then
            FOUND_IN_FILE="$file"
            break
        fi
    done
    if [ -n "$FOUND_IN_FILE" ]; then
        echo "   ⚠️  WARNING: $mod — will be polyfilled at runtime"
        WARNING_FOUND=true
    fi
done

if [ "$WARNING_FOUND" = false ]; then
    echo "   ✅ No warnings"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Worker bundle is clean — no deployment-blocking"
echo "   Node.js built‑ins found."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
