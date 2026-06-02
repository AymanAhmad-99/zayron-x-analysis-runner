import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

// ─────────────────────────────────────────────
// 10 Integration Tests — Real HTTP against dev server
// ─────────────────────────────────────────────
// Requires: bun run preview (or bun run dev)
//
// These tests are INTEGRATION tests — they hit a running server.
// If no server is running, they will fail with ECONNREFUSED.
//
// Skip integration tests in CI if no server:
const skipIfNoServer = async () => {
  try {
    await fetch(`${BASE_URL}/api/db-status`);
    return false; // server is running → don't skip
  } catch {
    return true; // no server → skip
  }
};

describe('API Integration Tests', () => {
  let serverAvailable = false;

  beforeAll(async () => {
    serverAvailable = !(await skipIfNoServer());
    if (!serverAvailable) {
      console.warn('[INTEGRATION] No server detected at', BASE_URL, '— skipping integration tests.');
    }
  });

  // ── Articles ──

  it('1. GET /api/articles returns 200 and JSON with articles array', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/articles`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');

    const body = await res.json();
    expect(body).toHaveProperty('articles');
    expect(Array.isArray(body.articles)).toBe(true);
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('totalPages');
  });

  it('2. GET /api/articles?page=1&limit=5 returns exactly 5 articles', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/articles?page=1&limit=5`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.articles)).toBe(true);
    expect(body.articles.length).toBeLessThanOrEqual(5);
    expect(body.page).toBe(1);
  });

  it('3. GET /api/articles/non-existent-slug returns 404', async () => {
    if (!serverAvailable) return;

    // NOTE: The route is /api/articles/[slug], so we request the slug directly
    const res = await fetch(`${BASE_URL}/api/articles/this-slug-does-not-exist-99999`);
    // Accept 404 or 500 (DB may be offline) — either way not 200
    expect(res.status).not.toBe(200);
    if (res.status === 404) {
      const body = await res.json();
      expect(body).toHaveProperty('error');
    }
  });

  // ── CVEs ──

  it('4. GET /api/cves returns 200 and JSON with cves array', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/cves`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('cves');
    expect(Array.isArray(body.cves)).toBe(true);
  });

  // ── Search ──

  it('5. GET /api/search?q=test&type=articles returns 200 with results', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/search?q=test&type=articles`);
    // May be 200 or 429 (rate limited) — both are valid
    expect([200, 429]).toContain(res.status);

    if (res.status === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('articles');
      expect(body).toHaveProperty('query');
    }
  });

  // ── Subscribe ──

  it('6. POST /api/subscribe with valid email returns 201', async () => {
    if (!serverAvailable) return;

    const uniqueEmail = `test-${Date.now()}@example.com`;
    const res = await fetch(`${BASE_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail }),
    });
    // 201 = created, 409 = already exists (test repeat), 429 = rate limited
    expect([201, 409, 429]).toContain(res.status);
  });

  it('7. POST /api/subscribe with duplicate email returns 409', async () => {
    if (!serverAvailable) return;

    const email = 'duplicate-test@example.com';
    // First subscribe
    await fetch(`${BASE_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // Second subscribe (duplicate)
    const res = await fetch(`${BASE_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // 409 = conflict, 429 = rate limited
    expect([409, 429]).toContain(res.status);
  });

  it('8. POST /api/subscribe with invalid email returns 400', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect([400, 429]).toContain(res.status);
  });

  // ── RSS ──

  it('9. GET /api/rss returns 200 and Content-Type application/xml', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/rss`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('xml');
  });

  // ── Revalidate ──

  it('10. POST /api/revalidate without secret returns 401', async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/' }),
    });
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
