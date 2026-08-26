import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'AGENTS.md',
  'docs/AI_MASTER_SPECIFICATION.md',
  'docs/AI_TECHNICAL_BRIEF_EN.md',
  'wrangler.toml',
  'open-next.config.ts',
  'worker-wrapper.js',
];

const checks = [
  {
    label: 'Cloudflare Worker identity is declared',
    file: 'wrangler.toml',
    pattern: /^name\s*=\s*"zayron-x"/m,
  },
  {
    label: 'D1 binding is declared',
    file: 'wrangler.toml',
    pattern: /\[\[d1_databases\]\][\s\S]*binding\s*=\s*"DB"/m,
  },
  {
    label: 'OpenNext incremental cache uses KV',
    file: 'open-next.config.ts',
    pattern: /kvIncrementalCache/,
  },
  {
    label: 'OpenNext tag cache uses KV',
    file: 'open-next.config.ts',
    pattern: /kvTagCache/,
  },
  {
    label: 'Worker exports scheduled handler',
    file: 'worker-wrapper.js',
    pattern: /async scheduled\(/,
  },
  {
    label: 'Cloudflare API MCP is configured',
    file: '.mcp.json',
    pattern: /https:\/\/mcp\.cloudflare\.com\/mcp/,
  },
];

let failures = 0;

for (const file of requiredFiles) {
  const present = existsSync(resolve(root, file));
  console.log(`${present ? 'PASS' : 'FAIL'} required file: ${file}`);
  if (!present) failures += 1;
}

for (const check of checks) {
  const filePath = resolve(root, check.file);
  const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const passed = check.pattern.test(content);
  console.log(`${passed ? 'PASS' : 'FAIL'} ${check.label}`);
  if (!passed) failures += 1;
}

console.log('INFO Cloudflare account access, DNS state, routes, secrets, and live bindings require OAuth or Wrangler authentication and cannot be proven by static repository inspection.');

if (failures > 0) {
  console.error(`Architecture readiness failed with ${failures} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('Architecture readiness passed. Continue with authenticated Cloudflare verification before deployment.');
}
