const { execSync } = require('child_process');
const fs = require('fs');

console.log('[ZAYRON-X] Running pre-commit secrets scan...');

try {
  // Only check files that are added (A), copied (C), modified (M), or renamed (R) - exclude deleted (D)
  const staged = execSync('git diff --cached --diff-filter=d --name-only', { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  const blockedPatterns = [
    /eyJhbGciOi[a-zA-Z0-9_-]{20,}/, // JWT token
    /1BJWap1wBu8GE6OySkduybl[a-zA-Z0-9_-]+/i, // Specific exposed historical MTProto session string
    /phone_code_hash\s*[:=]\s*['"][a-f0-9]{10,}['"]/i, // Phone code hash credential
    /TELEGRAM_SESSION\s*=\s*['"][a-zA-Z0-9_\-=+]{50,}['"]/i,
    /CF_API_TOKEN\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/i
  ];

  for (const file of staged) {
    if (!fs.existsSync(file)) continue;
    if (file === '.gitignore') continue;
    const stat = fs.statSync(file);
    if (stat.isDirectory() || stat.size > 2 * 1024 * 1024) continue;

    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      // M16.3.7C §3 — FAIL-CLOSED: a staged file that cannot be read means the
      // scan is INCOMPLETE. An uninspected staged file must never be treated as
      // clean, so the commit is refused instead of silently skipped.
      console.error(`\x1b[31m[BLOCKED] secrets scan could not read staged file: ${file}\x1b[0m`);
      console.error('[ZAYRON-X] Pre-commit secrets scan: FAIL-CLOSED (unreadable staged file)');
      process.exit(1);
    }

    for (const pattern of blockedPatterns) {
      if (pattern.test(content)) {
        console.error(`\x1b[31m[BLOCKED] Potential secret matched ${pattern} in staged file: ${file}\x1b[0m`);
        process.exit(1);
      }
    }
  }

  console.log('[ZAYRON-X] Pre-commit secrets scan: PASS');
  process.exit(0);
} catch (err) {
  // M16.3.7C §3 — FAIL-CLOSED: a scanner/runtime/dependency failure (git
  // unavailable, malformed state, unreadable repository) must NEVER be
  // reported as success. If the scan cannot complete, the commit is refused.
  console.error('[ZAYRON-X] Pre-commit secrets scan error:', err && err.message ? err.message : err);
  console.error('[ZAYRON-X] Pre-commit secrets scan: FAIL-CLOSED (scanner could not complete inspection)');
  process.exit(1);
}
