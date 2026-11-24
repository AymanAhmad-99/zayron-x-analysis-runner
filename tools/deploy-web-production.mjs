#!/usr/bin/env node
/**
 * `bun run deploy:web:prod` — the guarded PRODUCTION web deploy.
 *
 * Steps (all fail closed):
 *   1. build `apps/web` (vinext build + the preview rewrite, as designed)
 *   2. materialise `dist/server/wrangler.production.json` from the built config
 *   3. assert the production identity — name, routes, vars, API binding, and
 *      NO preview marker anywhere. Any violation aborts before Wrangler runs.
 *   4. deploy through the production release gate with the explicit config.
 *      The Wrangler environment flag is deliberately NOT used: this app's
 *      `.wrangler/deploy/config.json` redirect makes it a silent no-op.
 *
 * Usage:
 *   node tools/deploy-web-production.mjs                # build + assert + deploy
 *   node tools/deploy-web-production.mjs --dry-run      # build + assert only
 *   node tools/deploy-web-production.mjs --skip-build    # reuse the last build
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertProductionWebConfig, buildProductionWebConfig } from './lib/web-production-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const webRoot = path.resolve(repoRoot, 'apps/web');
const builtConfigPath = path.resolve(webRoot, 'dist/server/wrangler.json');
const productionConfigPath = path.resolve(webRoot, 'dist/server/wrangler.production.json');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipBuild = args.has('--skip-build');

const RELEASE_AUTHORIZATION = 'I-AUTHORIZE-PRODUCTION-DEPLOY:web-production';

function refuse(message, code) {
  console.error(`[deploy:web:prod] REFUSED — ${message}`);
  process.exit(code || 1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', cwd: webRoot, ...options });
  if (result.error) refuse(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0) refuse(`${command} ${commandArgs.join(' ')} exited ${result.status}`);
}

if (!skipBuild) {
  console.log('[deploy:web:prod] building apps/web (vinext build + preview preparation)…');
  run('bun', ['run', 'build']);
}

if (!fs.existsSync(builtConfigPath)) {
  refuse(`missing ${path.relative(repoRoot, builtConfigPath)} — run without --skip-build`);
}

let built;
try {
  built = JSON.parse(fs.readFileSync(builtConfigPath, 'utf8'));
} catch (error) {
  refuse(`unreadable built config: ${error.message}`);
}

const productionConfig = buildProductionWebConfig(built);
const violations = assertProductionWebConfig(productionConfig);
if (violations.length > 0) {
  refuse(`generated production config is not production-shaped:\n  - ${violations.join('\n  - ')}`, 2);
}

// The PREVIEW artifact must never be deployed by accident, so compare identities.
if (productionConfig.name === built.name) {
  refuse('generated config did not change identity — refusing to deploy the preview artifact', 2);
}

fs.writeFileSync(productionConfigPath, `${JSON.stringify(productionConfig, null, 2)}\n`);
console.log(`[deploy:web:prod] wrote ${path.relative(repoRoot, productionConfigPath)}`);
console.log(`[deploy:web:prod] identity: ${productionConfig.name} → ${productionConfig.routes.map((r) => r.pattern).join(', ')}`);
console.log(`[deploy:web:prod] vars: ${JSON.stringify(productionConfig.vars)}`);
console.log(`[deploy:web:prod] API binding: ${productionConfig.services[0].service}`);

if (dryRun) {
  console.log('[deploy:web:prod] dry run complete — nothing deployed.');
  process.exit(0);
}

if (process.env.ZAYRON_PRODUCTION_RELEASE_AUTHORIZED !== RELEASE_AUTHORIZATION) {
  refuse(`production release is not authorized. Set ZAYRON_PRODUCTION_RELEASE_AUTHORIZED=${RELEASE_AUTHORIZATION}`);
}

run('node', [
  path.resolve(repoRoot, 'scripts/release/production-release-gate.mjs'),
  'web-production',
  '--',
  'npx',
  'wrangler',
  'deploy',
  '--config',
  'dist/server/wrangler.production.json',
]);
