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
      continue;
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
  console.error('[ZAYRON-X] Pre-commit secrets scan error:', err.message);
  process.exit(0);
}
