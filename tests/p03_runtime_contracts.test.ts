import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('P0.3 — Production Isolation & Runtime Contracts', () => {
  it('verifies apps/web/wrangler.jsonc declares both production and preview environments with correct API URLs', () => {
    const raw = readFileSync(resolve(__dirname, '../apps/web/wrangler.jsonc'), 'utf-8');
    const config = JSON.parse(raw);
    expect(config.env).toBeDefined();
    expect(config.env.production).toBeDefined();
    expect(config.env.production.name).toBe('zayron-x-web');
    expect(config.env.production.vars.ENVIRONMENT).toBe('production');
    expect(config.env.production.vars.NEXT_PUBLIC_API_BASE_URL).toBe('https://zayron-x.co/api/v1');
    expect(config.env.production.vars.NEXT_PUBLIC_SITE_URL).toBe('https://zayron-x.co');
    expect(config.env.production.routes).toEqual([
      { pattern: 'zayron-x.co/*', zone_name: 'zayron-x.co' },
      { pattern: 'www.zayron-x.co/*', zone_name: 'zayron-x.co' }
    ]);

    expect(config.env.preview).toBeDefined();
    expect(config.env.preview.name).toBe('zayron-x-web-preview');
    expect(config.env.preview.vars.ENVIRONMENT).toBe('preview');
    expect(config.env.preview.vars.NEXT_PUBLIC_API_BASE_URL).toBe('https://zayron-x-api-preview.aabusabih.workers.dev/api/v1');
  });

  it('verifies apps/web/package.json contains deploy:production and deploy:preview', () => {
    const raw = readFileSync(resolve(__dirname, '../apps/web/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    expect(pkg.scripts['deploy:preview']).toBe('wrangler deploy --env preview');
    expect(pkg.scripts['deploy:production']).toBe('wrangler deploy --env production');
  });

  it('verifies apps/web/app/lib/api.ts contains zero /api/v1 stripping', () => {
    const content = readFileSync(resolve(__dirname, '../apps/web/app/lib/api.ts'), 'utf-8');
    expect(content).not.toContain('replace(/\\/api\\/v1$/');
    expect(content).not.toContain("replace(/\/api\/v1$/");
    // Verify all major sub-resource endpoints cleanly target ${API_BASE}/...
    expect(content).toContain('${API_BASE}/graph/edges');
    expect(content).toContain('${base}/actors/${encodeURIComponent(id)}');
    expect(content).toContain('${base}/campaigns/${encodeURIComponent(id)}');
    expect(content).toContain('${base}/iocs/${encodeURIComponent(id)}');
    expect(content).toContain('${API_BASE}/iocs${query.size');
    expect(content).toContain('${API_BASE}/campaigns');
    expect(content).toContain('${API_BASE}/actors${query}');
    expect(content).toContain('${API_BASE}/intelligence');
    expect(content).toContain('${API_BASE}/search');
  });

  it('verifies workers/api/wrangler.toml preview environment binds staging Vectorize index', () => {
    const content = readFileSync(resolve(__dirname, '../workers/api/wrangler.toml'), 'utf-8');
    expect(content).toContain('[[env.preview.vectorize]]');
    expect(content).toContain('index_name = "zayron-doc04-staging-index"');
  });

  it('verifies workers/ingest/wrangler.toml preview environment binds staging Vectorize index and preview services', () => {
    const content = readFileSync(resolve(__dirname, '../workers/ingest/wrangler.toml'), 'utf-8');
    expect(content).toContain('[[env.preview.vectorize]]');
    expect(content).toContain('index_name = "zayron-doc04-staging-index"');
    expect(content).toContain('service = "zayron-telegram-collector-do-preview"');
    expect(content).toContain('service = "zayron-x-api-preview"');
  });

  it('verifies queue consumers prevent redelivery loops under freeze by acknowledging frozen messages', () => {
    const apiSrc = readFileSync(resolve(__dirname, '../workers/api/src/index.ts'), 'utf-8').replace(/\r\n/g, '\n');
    expect(apiSrc).toContain("if (env.LEGACY_FREEZE === 'true') {\n      batch.ackAll();\n      return;\n    }");

    const ingestSrc = readFileSync(resolve(__dirname, '../workers/ingest/src/index.ts'), 'utf-8');
    expect(ingestSrc).toContain('if (isFrozen) {');
    expect(ingestSrc).toContain('msg.ack();');
  });
});
