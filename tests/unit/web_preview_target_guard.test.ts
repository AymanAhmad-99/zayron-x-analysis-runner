import { describe, it, expect } from 'bun:test';
import {
  evaluateWebPreviewTarget,
  WEB_PREVIEW_WORKER,
  WEB_PREVIEW_HOST,
  WEB_PREVIEW_API_HOST,
} from '../../apps/web/scripts/preview-target-guard.mjs';

/**
 * PHASE 12.27 — web preview/production identity regression suite.
 *
 * Background: apps/web/wrangler.jsonc's top-level (default) block once paired
 * production markers (ENVIRONMENT=production, zayron-x.co routes) with the
 * PREVIEW API URL — an incoherent block matching no real environment. The only
 * enabled deploy path is the guarded preview flow (deploy:preview), and the
 * browser bundle hardcodes the preview API fallback (apps/web/app/lib/api.ts),
 * so the top-level default is honestly preview-flavored. These tests lock that:
 * the raw default block can never pass the preview guard, and no preview-shaped
 * artifact can ever target production.
 */
describe('web preview-target guard (Phase 12.27 identity regression)', () => {
  const loadSourceConfig = async () => {
    const fs = await import('fs');
    return JSON.parse(fs.readFileSync('apps/web/wrangler.jsonc', 'utf8'));
  };

  it('1. raw top-level default block is rejected as a preview deploy target', async () => {
    const cfg = await loadSourceConfig();
    const verdict = evaluateWebPreviewTarget({
      name: cfg.name,
      workers_dev: cfg.workers_dev,
      routes: cfg.routes,
      vars: cfg.vars,
    });
    expect(verdict.ok).toBe(false);
  });

  it('2. top-level default block is honestly preview-flavored (the 12.27 correction)', async () => {
    const cfg = await loadSourceConfig();
    // ENVIRONMENT must agree with the preview API URL the block already carries.
    expect(cfg.vars.ENVIRONMENT).toBe('preview');
    // No behavior change: the API URL itself is untouched (preview host), so
    // local dev SSR keeps hitting the same API as the hardcoded client fallback.
    expect(cfg.vars.NEXT_PUBLIC_API_BASE_URL).toContain(WEB_PREVIEW_API_HOST);
  });

  it('3. canonical flattened preview shape passes the guard', async () => {
    const cfg = await loadSourceConfig();
    const flattened = {
      name: WEB_PREVIEW_WORKER,
      workers_dev: true,
      routes: [],
      vars: cfg.env.preview.vars,
    };
    const verdict = evaluateWebPreviewTarget(flattened);
    expect(verdict.ok).toBe(true);
    expect(verdict.code).toBe('PREVIEW_VALID');
  });

  it('4. preview artifact pointing at the production API is rejected', () => {
    const verdict = evaluateWebPreviewTarget({
      name: WEB_PREVIEW_WORKER,
      workers_dev: true,
      routes: [],
      vars: {
        ENVIRONMENT: 'preview',
        NEXT_PUBLIC_SITE_URL: `https://${WEB_PREVIEW_HOST}`,
        NEXT_PUBLIC_API_BASE_URL: 'https://zayron-x.co/api/v1',
      },
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('PRODUCTION_API_BINDING');
  });

  it('5. preview artifact pointing at the production site is rejected', () => {
    const verdict = evaluateWebPreviewTarget({
      name: WEB_PREVIEW_WORKER,
      workers_dev: true,
      routes: [],
      vars: {
        ENVIRONMENT: 'preview',
        NEXT_PUBLIC_SITE_URL: 'https://zayron-x.co',
        NEXT_PUBLIC_API_BASE_URL: `https://${WEB_PREVIEW_API_HOST}/api/v1`,
      },
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('PRODUCTION_SITE_URL');
  });

  it('6. preview artifact carrying production routes is rejected', () => {
    const verdict = evaluateWebPreviewTarget({
      name: WEB_PREVIEW_WORKER,
      workers_dev: true,
      routes: [{ pattern: 'zayron-x.co/*', zone_name: 'zayron-x.co' }],
      vars: {
        ENVIRONMENT: 'preview',
        NEXT_PUBLIC_SITE_URL: `https://${WEB_PREVIEW_HOST}`,
        NEXT_PUBLIC_API_BASE_URL: `https://${WEB_PREVIEW_API_HOST}/api/v1`,
      },
    });
    expect(verdict.ok).toBe(false);
  });
});
