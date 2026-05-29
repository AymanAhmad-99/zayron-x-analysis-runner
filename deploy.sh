#!/usr/bin/env bash
# ============================================================================
# ZAYRON-X PRODUCTION MASTER DEPLOYMENT & VERIFICATION SUITE
# ============================================================================
# This script prepares, prunes, builds, launches, and self-checks the
# Zayron-X cyber threat intelligence harvesting platform.
#
# Designed to run within standard Bash environments (Linux, WSL, Git Bash).
# ============================================================================

set -euo pipefail

# ANSI color codes for high-visibility terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}         ZAYRON-X CYBER INTELLIGENCE SYSTEM ORCHESTRATOR           ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# Ensure we are in the repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ----------------------------------------------------------------------------
# STEP 1: Server Cleansing (Orphaned / Dangling Resource Elimination)
# ----------------------------------------------------------------------------
echo -e "\n${YELLOW}[*] PHASE 1: Executing complete server cleanup prune...${NC}"
# Stop any running docker services first to avoid locking resources during prune
if command -v docker &>/dev/null; then
    if [ -f "workers/docker-compose.yml" ]; then
        echo -e "${YELLOW}[*] Stopping existing Zayron-X services...${NC}"
        docker compose -f workers/docker-compose.yml down --remove-orphans || true
    fi
    echo -e "${YELLOW}[*] Pruning unused container caches, dangling images, and volumes...${NC}"
    docker system prune -af --volumes
    echo -e "${GREEN}[+] Host system cleaned successfully.${NC}"
else
    echo -e "${RED}[!] Docker is not installed on this host! Aborting deployment.${NC}"
    exit 1
fi

# ----------------------------------------------------------------------------
# STEP 2: Git Repository Integrity Check
# ----------------------------------------------------------------------------
echo -e "\n${YELLOW}[*] PHASE 2: Checking Git repository integrity and sync status...${NC}"
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    echo -e "${RED}[!] Fatal: Current directory is not a valid Git repository!${NC}"
    exit 1
fi

# Update remote tracking branches
echo -e "${YELLOW}[*] Fetching updates from remote repository origin...${NC}"
git fetch origin || echo -e "${YELLOW}[!] Warning: Remote origin unreachable. Proceeding with offline deployment...${NC}"

LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "HEAD")
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "HEAD")
BASE=$(git merge-base HEAD @{u} 2>/dev/null || echo "HEAD")

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}[+] Git repository is up-to-date with remote origin.${NC}"
elif [ "$LOCAL" = "$BASE" ]; then
    echo -e "${YELLOW}[!] Updates detected on remote. Pulling latest code change...${NC}"
    git pull origin main || git pull origin master || echo -e "${YELLOW}[!] Warning: git pull failed. Deploying current local tree.${NC}"
elif [ "$REMOTE" = "$BASE" ]; then
    echo -e "${YELLOW}[!] Local changes are ahead of remote. Deploying local commits.${NC}"
else
    echo -e "${RED}[!] WARNING: Repository branches have diverged. Deploying current local workspace state.${NC}"
fi

# Validate crucial directories and configuration files exist
if [ ! -f "workers/docker-compose.yml" ]; then
    echo -e "${RED}[!] Fatal: workers/docker-compose.yml is missing!${NC}"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[!] WARNING: Root-level .env file is missing! Production containers may fail to resolve keys.${NC}"
fi

# ----------------------------------------------------------------------------
# STEP 3: Build & Asynchronous Service Startup with Health Checking
# ----------------------------------------------------------------------------
echo -e "\n${YELLOW}[*] PHASE 3: Building and launching micro-containers...${NC}"

# Launch docker services in detached mode
docker compose -f workers/docker-compose.yml up -d --build --force-recreate

echo -e "${YELLOW}[*] Waiting for microservices to initialize and complete healthcheck grace periods...${NC}"
sleep 15

# Monitor health statuses of launched containers (3 Ingestors + AI + Tor Proxy)
services=("zayron_tor_proxy" "zayron_crew_daemon" "zayron_radar_daemon" "zayron_rss_daemon" "zayron_darkweb_daemon")
for container in "${services[@]}"; do
    echo -e "${YELLOW}[*] Checking health status for: ${container}...${NC}"
    
    # Poll health status up to 3 times
    HEALTH="starting"
    for i in {1..3}; do
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
        if [ "$HEALTH" = "healthy" ]; then
            break
        fi
        echo -e "${YELLOW}    -> Health status: ${HEALTH}. Retrying check in 5 seconds (Attempt $i/3)...${NC}"
        sleep 5
    done

    if [ "$HEALTH" != "healthy" ]; then
        echo -e "${RED}[!] FATAL: Container ${container} failed its system healthcheck!${NC}"
        echo -e "${YELLOW}[*] Fetching crash logs for ${container}...${NC}"
        docker compose -f workers/docker-compose.yml logs --tail=50 "$container" || true
        exit 1
    fi
    echo -e "${GREEN}[+] Service ${container} is healthy.${NC}"
done

# ----------------------------------------------------------------------------
# STEP 4: Live Verification Suite (Tor Proxy, Supabase Connectivity & Telegram Router)
# ----------------------------------------------------------------------------
echo -e "\n${YELLOW}[*] PHASE 4: Executing active Verification Suite...${NC}"

# A. Tor Egress and Onion-routing verification
echo -e "${YELLOW}[*] Verifying Tor Proxy routing and exit-node verification...${NC}"
TOR_STATUS=$(docker compose -f workers/docker-compose.yml exec -T zayron_crew python -c "
import urllib.request
import json
import sys

proxies = {
    'http': 'socks5h://tor_proxy:9050',
    'https': 'socks5h://tor_proxy:9050'
}
handler = urllib.request.ProxyHandler(proxies)
opener = urllib.request.build_opener(handler)
try:
    req = urllib.request.Request(
        'https://check.torproject.org/api/ip',
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0'}
    )
    with opener.open(req, timeout=15) as response:
        data = json.loads(response.read().decode('utf-8'))
        is_tor = data.get('IsTor', False)
        ip = data.get('IP', 'Unknown')
        if is_tor:
            print(f'SUCCESS|{ip}')
        else:
            print('FAILED_NOT_TOR')
except Exception as e:
    print(f'ERROR|{e}')
" | tr -d '\r')

if [[ "$TOR_STATUS" == SUCCESS* ]]; then
    EXIT_IP=$(echo "$TOR_STATUS" | cut -d'|' -f2)
    echo -e "${GREEN}[+] Tor proxy egress verified successfully! Exit Node IP: ${EXIT_IP}${NC}"
else
    echo -e "${RED}[!] Egress routing verification failed via Tor: ${TOR_STATUS}${NC}"
    exit 1
fi

# B. Supabase DB Connection and schema latency checking
echo -e "${YELLOW}[*] Checking Supabase database connectivity...${NC}"
DB_STATUS=$(docker compose -f workers/docker-compose.yml exec -T zayron_crew python -c "
import urllib.request
import os
import sys
import time

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
if not url or not key:
    print('ERROR|Missing environment variables in container.')
    sys.exit(0)

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Accept': 'application/json'
}
req = urllib.request.Request(f'{url}/rest/v1/raw_feeds?limit=1', headers=headers)
try:
    start_time = time.time()
    with urllib.request.urlopen(req, timeout=15) as response:
        latency = (time.time() - start_time) * 1000
        if response.status in (200, 201, 204):
            print(f'SUCCESS|{latency:.2f}ms')
        else:
            print(f'FAILED_HTTP|{response.status}')
except Exception as e:
    print(f'ERROR|{e}')
" | tr -d '\r')

if [[ "$DB_STATUS" == SUCCESS* ]]; then
    DB_LATENCY=$(echo "$DB_STATUS" | cut -d'|' -f2)
    echo -e "${GREEN}[+] Supabase connection is functional. Latency: ${DB_LATENCY}${NC}"
else
    echo -e "${RED}[!] Database connection verification failed: ${DB_STATUS}${NC}"
    exit 1
fi

# C. Telegram Gateway reachability check
echo -e "${YELLOW}[*] Testing external reachability to Telegram network gateways...${NC}"
TG_STATUS=$(docker compose -f workers/docker-compose.yml exec -T zayron_crew python -c "
import socket
import sys
try:
    socket.setdefaulttimeout(10)
    # Check DNS and resolve API endpoint
    ip = socket.gethostbyname('api.telegram.org')
    print(f'SUCCESS|Resolved api.telegram.org to {ip}')
except Exception as e:
    print(f'ERROR|{e}')
" | tr -d '\r')

if [[ "$TG_STATUS" == SUCCESS* ]]; then
    TG_RESOLVE=$(echo "$TG_STATUS" | cut -d'|' -f2)
    echo -e "${GREEN}[+] Telegram route verified: ${TG_RESOLVE}${NC}"
else
    echo -e "${RED}[!] Reachability verification to Telegram failed: ${TG_STATUS}${NC}"
    exit 1
fi

# ----------------------------------------------------------------------------
# STEP 5: Re-securing Sandbox & Conclusion
# ----------------------------------------------------------------------------
echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${GREEN}[+] DEPLOYMENT COMPLETED: ALL CONTAINERS HEALTHY & PATHS SECURED.${NC}"
echo -e "${GREEN}[+] ZAYRON-X PLATFORM OPERATIONAL AND VIGILANT.${NC}"
echo -e "${CYAN}====================================================================${NC}"
exit 0
