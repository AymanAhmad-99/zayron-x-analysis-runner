/**
 * Phase 4A — the production web deploy config guard.
 *
 * Gate 3B deployed the PREVIEW worker from `apps/web` because the build rewrites
 * `dist/server/wrangler.json` to the preview identity and `.wrangler/deploy/
 * config.json` makes Wrangler read that file regardless of `--env production`.
 * These tests pin the replacement: an explicit production config that is
 * asserted for identity and preview markers before Wrangler is ever invoked.
 */
import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCTION_WEB_IDENTITY,
  assertProductionWebConfig,
  buildProductionWebConfig,
} from '../../tools/lib/web-production-config.mjs';

const repoRoot = path.resolve(import.meta.dir, '../..');

/** The exact preview artifact `prepare-preview.js` produces. */
const previewShaped = {
  configPath: 'D:\\Desktop\\zayron-app\\apps\\web\\wrangler.jsonc',
  userConfigPath: 'D:\\Desktop\\zayron-app\\apps\\web\\wrangler.jsonc',
  topLevelName: 'zayron-x-web',
  definedEnvironments: ['production', 'preview'],
  compatibility_date: '2025-09-23',
  compatibility_flags: ['nodejs_compat'],
  name: 'zayron-x-web-preview',
  main: 'index.js',
  triggers: {},
  assets: { directory: '../client', not_found_handling: 'none', binding: 'ASSETS' },
  workers_dev: true,
  vars: {
    ENVIRONMENT: 'preview',
    NEXT_PUBLIC_ENVIRONMENT: 'preview',
    NEXT_PUBLIC_PREVIEW_MODE: 'true',
    NEXT_PUBLIC_SITE_URL: 'https://zayron-x-web-preview.aabusabih.workers.dev',
    NEXT_PUBLIC_API_BASE_URL: 'https://zayron-x-api-preview.aabusabih.workers.dev/api/v1',
  },
  services: [{ binding: 'API', service: 'zayron-x-api-preview' }],
  no_bundle: true,
  routes: [],
};

describe('1 — the generated production config', () => {
  const config = buildProductionWebConfig(previewShaped);

  it('is a production identity with production routes, vars and API binding', () => {
    expect(config.name).toBe('zayron-x-web');
    expect(config.workers_dev).toBe(false);
    expect(config.routes).toEqual(PRODUCTION_WEB_IDENTITY.routes);
    expect(config.vars).toEqual(PRODUCTION_WEB_IDENTITY.vars);
    expect(config.vars.ENVIRONMENT).toBe('production');
    expect(config.vars.NEXT_PUBLIC_SITE_URL).toBe('https://zayron-x.co');
    expect(config.vars.NEXT_PUBLIC_API_BASE_URL).toBe('https://zayron-x.co/api/v1');
    expect(config.vars.API_BASE_URL).toBe('https://api.zayron-x.co/api/v1');
    expect(config.vars.SITEMAP_MAX_SHARDS).toBe('10');
    expect(config.services).toEqual([{ binding: 'API', service: 'zayron-x-api' }]);
  });

  it('drops every Wrangler pointer, nested env and preview-only var', () => {
    expect(config.configPath).toBeUndefined();
    expect(config.userConfigPath).toBeUndefined();
    expect(config.env).toBeUndefined();
    expect(config.vars.NEXT_PUBLIC_PREVIEW_MODE).toBeUndefined();
    expect(JSON.stringify(config.vars)).not.toContain('workers.dev');
    expect(JSON.stringify(config.vars)).not.toContain('preview');
  });

  it('preserves the build artifact shape Wrangler needs', () => {
    expect(config.main).toBe('index.js');
    expect(config.assets.directory).toBe('../client');
    expect(config.no_bundle).toBe(true);
    expect(config.compatibility_date).toBe('2025-09-23');
  });

  it('passes its own assertion', () => {
    expect(assertProductionWebConfig(config)).toEqual([]);
  });
});

describe('2 — the guard rejects the footguns', () => {
  it('rejects the untouched preview artifact', () => {
    const violations = assertProductionWebConfig(previewShaped);
    expect(violations).toContain('NAME_NOT_PRODUCTION:zayron-x-web-preview');
    expect(violations).toContain('WORKERS_DEV_ENABLED');
    expect(violations).toContain('ENVIRONMENT_NOT_PRODUCTION:preview');
    expect(violations).toContain('API_BINDING_NOT_PRODUCTION:zayron-x-api-preview');
    expect(violations).toContain('ROUTE_MISSING:zayron-x.co/*');
    expect(violations).toContain('PREVIEW_MARKER:preview');
  });

  it('rejects a partially-patched config that kept a preview var or route', () => {
    const config = buildProductionWebConfig(previewShaped);
    config.vars = { ...config.vars, NEXT_PUBLIC_PREVIEW_MODE: 'true' };
    config.routes = [...config.routes, { pattern: 'staging.zayron-x.co/*', zone_name: 'zayron-x.co' }];
    const violations = assertProductionWebConfig(config);
    expect(violations).toContain('PREVIEW_MODE_FLAG_PRESENT');
    expect(violations).toContain('ROUTE_NOT_PRODUCTION:staging.zayron-x.co/*');
  });

  it('rejects a config with an unpinned sitemap shard count or workers.dev', () => {
    const config = buildProductionWebConfig(previewShaped);
    config.vars = { ...config.vars, SITEMAP_MAX_SHARDS: '1' };
    config.workers_dev = true;
    const violations = assertProductionWebConfig(config);
    expect(violations).toContain('SITEMAP_SHARDS_NOT_PINNED:1');
    expect(violations).toContain('WORKERS_DEV_ENABLED');
  });

  it('rejects a missing assets directory or main entry', () => {
    const config = buildProductionWebConfig(previewShaped);
    delete (config as any).assets;
    delete (config as any).main;
    const violations = assertProductionWebConfig(config);
    expect(violations).toContain('ASSETS_DIRECTORY_MISSING');
    expect(violations).toContain('MAIN_MISSING');
  });
});

describe('3 — the deploy path never relies on --env production', () => {
  it('the script deploys the generated production config explicitly', () => {
    const script = fs.readFileSync(path.join(repoRoot, 'tools/deploy-web-production.mjs'), 'utf8');
    expect(script).toContain('dist/server/wrangler.production.json');
    expect(script).toContain('wrangler.production.json');
    expect(script).toContain('production-release-gate.mjs');
    expect(script).toContain('web-production');
    expect(script).not.toContain("'--env'");
    expect(script).not.toContain('--env production');
    expect(script).toContain('assertProductionWebConfig');
  });

  it('is exposed as a single guarded command', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    expect(pkg.scripts['deploy:web:prod']).toBe('node tools/deploy-web-production.mjs');
  });
});
