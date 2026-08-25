const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', 'zayron-x', '.next');
const openNextDir = path.join(__dirname, '..', 'zayron-x', '.open-next');

if (!fs.existsSync(nextDir)) {
  console.log('No .next directory found. Please run `bun run build` first.');
  process.exit(1);
}

if (!fs.existsSync(openNextDir)) {
  console.log('No .open-next directory found. Please run `bun run build:cf` after `bun run build`.');
  process.exit(1);
}

const nextStat = fs.statSync(nextDir);
const openNextStat = fs.statSync(openNextDir);

if (openNextStat.mtimeMs < nextStat.mtimeMs) {
  console.error('\n[ERROR] DEPLOYMENT BLOCKED: STALE OPEN-NEXT BUILD');
  console.error('.open-next is OLDER than .next.');
  console.error('You must run `bun run build:cf` again before deploying to ensure Cloudflare artifacts are up to date.\n');
  process.exit(1);
}

console.log('[OK] Build artifacts are correctly synchronized.');
process.exit(0);
