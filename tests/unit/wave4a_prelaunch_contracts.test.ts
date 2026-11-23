/**
 * Wave 4A — pre-launch Tier A contracts.
 *
 * Deterministic, local-only. Covers the four defects this wave closes:
 *   1. authenticated/admin responses must never be publicly cacheable;
 *   2. `/api/v1/feed` reports the real filtered count and bounds/serves `q`
 *      under the stricter `search` rate-limit class;
 *   3. the Telegram publication engine CLAIMS the idempotency key before the
 *      outbound send (no double post on retry), and surfaces 429 +
 *      Retry-After instead of a generic failure;
 *   4. production GitHub dispatch is authenticated and fails closed.
 */
import { describe, expect, test } from 'bun:test';

import {
  applyResponseCachePolicy,
  classifyEndpoint,
  RateLimiter,
  withSecurityBoundary,
} from '../../workers/api/src/security';
import {
  buildFeedQuery,
  FEED_MAX_LIMIT,
  FEED_MAX_QUERY_LENGTH,
} from '../../workers/api/src/feedQuery';
import {
  CLAIM_ASSET_SQL,
  publishApprovedIntelligence,
  SENDING_LEASE_SECONDS,
  type PublicationEnv,
} from '../../workers/api/src/publication';
import { authenticateDispatchRequest, type Env as ValidationEnv } from '../../workers/malware-validation/src/index';

const ENV = {
  ADMIN_API_TOKEN: 'admin-secret',
  ENVIRONMENT: 'preview',
};

const PUBLIC_CACHE = 'public, max-age=30, s-maxage=60, stale-while-revalidate=120';

describe('Wave 4A — cache policy at the trust boundary', () => {
  test('an admin 200 is private, no-store even when the handler set public caching', async () => {
    const dispatch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': PUBLIC_CACHE },
      });
    const req = new Request('https://api.test/api/v1/admin/ai-budget', {
      headers: { 'X-Admin-Token': 'admin-secret' },
    });
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  test('a public 200 keeps its cacheability', async () => {
    const dispatch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': PUBLIC_CACHE },
      });
    const req = new Request('https://api.test/api/v1/health');
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.headers.get('Cache-Control')).toBe(PUBLIC_CACHE);
  });

  test('a public non-200 is never publicly cacheable', async () => {
    const dispatch = async () =>
      new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': PUBLIC_CACHE },
      });
    const req = new Request('https://api.test/api/v1/health');
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  test('the helper leaves a public 200 untouched and rewrites everything else', () => {
    // A Response body is single-use, so each call gets its own response (the
    // boundary calls the helper exactly once per response).
    const publicOk = new Response('{}', { status: 200, headers: { 'Cache-Control': PUBLIC_CACHE } });
    expect(applyResponseCachePolicy(publicOk, true).headers.get('Cache-Control')).toBe(PUBLIC_CACHE);
    const privateOk = new Response('{}', { status: 200, headers: { 'Cache-Control': PUBLIC_CACHE } });
    expect(applyResponseCachePolicy(privateOk, false).headers.get('Cache-Control')).toBe('private, no-store');
  });

  test('a cacheable public response varies on Origin without losing an existing Vary', async () => {
    const dispatch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': PUBLIC_CACHE, Vary: 'Accept-Encoding' },
      });
    const req = new Request('https://api.test/api/v1/health', {
      headers: { Origin: 'https://zayron-x.co' },
    });
    const res = await withSecurityBoundary(req, ENV, dispatch, new RateLimiter(() => 0));
    expect(res.headers.get('Cache-Control')).toBe(PUBLIC_CACHE);
    const vary = (res.headers.get('Vary') ?? '').split(',').map((v) => v.trim());
    expect(vary).toContain('Origin');
    expect(vary).toContain('Accept-Encoding');
    // Never a wildcard, so the CDN cannot cache one origin's ACAO for another.
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://zayron-x.co');
  });
});

describe('Wave 4A — /api/v1/feed count and bounds', () => {
  const whereOf = (sql: string) => sql.slice(sql.indexOf('WHERE 1=1'));

  test('the count statement shares the exact WHERE clause and has no LIMIT', () => {
    const feed = buildFeedQuery({ severity: 'HIGH', status: 'published', type: 'cve', q: 'log4j', limit: '5' });
    expect(feed.countSql).toContain('SELECT COUNT(*) AS total');
    expect(feed.countSql).not.toContain('LIMIT');
    expect(whereOf(feed.rowsSql).startsWith(whereOf(feed.countSql))).toBe(true);
    expect(feed.rowsParams.slice(0, -2)).toEqual(feed.countParams);
    expect(feed.rowsParams.slice(-2)).toEqual([5, 0]);
  });

  test('limit is clamped and the page never exceeds the hard cap', () => {
    expect(buildFeedQuery({ limit: '10000' }).limit).toBe(FEED_MAX_LIMIT);
    expect(buildFeedQuery({ limit: '0' }).limit).toBeGreaterThan(0);
    expect(buildFeedQuery({ limit: '-4' }).limit).toBeGreaterThan(0);
    expect(buildFeedQuery({}).offset).toBe(0);
  });

  test('q is bounded to the hard maximum length', () => {
    const feed = buildFeedQuery({ q: 'a'.repeat(5000) });
    expect(feed.search?.length).toBe(FEED_MAX_QUERY_LENGTH);
    expect(String(feed.rowsParams[0]).length).toBe(FEED_MAX_QUERY_LENGTH + 2);
  });

  test('a search-bearing feed is classified as `search`, a plain feed as public read', () => {
    expect(classifyEndpoint('GET', '/api/v1/feed')).toBe('public_read');
    expect(classifyEndpoint('GET', '/api/v1/feed', false)).toBe('public_read');
    expect(classifyEndpoint('GET', '/api/v1/feed', true)).toBe('search');
  });
});

// ── Telegram publication: claim-before-send ─────────────────────────

type DbSeed = { eventStatus?: string; article?: boolean };
type FakeAsset = { id: string; status: 'SENDING' | 'PUBLISHED' | 'FAILED'; stale?: boolean };

function makePublicationEnv(seed: DbSeed, send: () => Response) {
  const log: string[] = [];
  const publications: string[] = [];
  // idempotency_key -> row, mirroring `social_assets` + the unique index.
  // `stale` stands in for `datetime(updated_at) <= datetime('now','-300 seconds')`;
  // the lease predicate itself is asserted directly on CLAIM_ASSET_SQL below.
  const assets = new Map<string, FakeAsset>();
  const keyById = new Map<string, string>();
  const norm = (sql: string) => sql.replace(/\s+/g, ' ').trim();

  const db = {
    prepare(sql: string) {
      const q = norm(sql);
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (q.startsWith('INSERT INTO social_assets')) {
                // Claim: insert a new key, or reclaim FAILED / expired SENDING,
                // RETURNING the id every later write must use.
                log.push('claim');
                const key = String(args[5]);
                const existing = assets.get(key);
                const reclaimable =
                  !existing || existing.status === 'FAILED' || existing.stale === true;
                if (!reclaimable) return null;
                const claimedId = existing?.id ?? String(args[0]);
                assets.set(key, { id: claimedId, status: 'SENDING' });
                keyById.set(claimedId, key);
                return { id: claimedId } as T;
              }
              if (q.startsWith('SELECT id, status FROM intelligence_events')) {
                return { id: String(args[0]), status: seed.eventStatus ?? 'READY_TO_PUBLISH' } as T;
              }
              if (q.startsWith('SELECT id, title, dek, excerpt FROM articles')) {
                if (seed.article === false) return null;
                return { id: 'art_1', title: 'CVE-2026-0001 exploited', dek: 'dek', excerpt: 'excerpt' } as T;
              }
              if (q.startsWith('SELECT id FROM social_assets WHERE idempotency_key')) {
                const existing = assets.get(String(args[0]));
                return (existing ? { id: existing.id } : null) as T | null;
              }
              return null;
            },
            async run() {
              const setStatus = (id: string, status: FakeAsset['status']) => {
                const key = keyById.get(id);
                if (key) assets.set(key, { ...(assets.get(key) as FakeAsset), status });
                log.push('write');
                return { meta: { changes: key ? 1 : 0 } };
              };
              if (q.startsWith("UPDATE social_assets SET status = 'PUBLISHED'")) {
                return setStatus(String(args[0]), 'PUBLISHED');
              }
              if (q.startsWith("UPDATE social_assets SET status = 'FAILED'")) {
                return setStatus(String(args[0]), 'FAILED');
              }
              if (q.startsWith('INSERT INTO social_publications')) {
                publications.push(String(args[1]));
              }
              log.push('write');
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };

  const env = {
    DB: db as unknown as PublicationEnv['DB'],
    TELEGRAM_TARGET_CHANNEL: 'test-channel',
    TELEGRAM_COLLECTOR_SERVICE: {
      async fetch() {
        log.push('fetch');
        return send();
      },
    } as unknown as PublicationEnv['TELEGRAM_COLLECTOR_SERVICE'],
  };

  return { env, log, assets, publications };
}

const PUBLISH_INPUT = {
  intelligence_id: 'evt_wave4a',
  publication_type: 'telegram' as const,
  idempotency_key: 'evt_wave4a:telegram:v3.0',
};

describe('Wave 4A — Telegram claim-before-send', () => {
  test('the idempotency key is claimed BEFORE the outbound send', async () => {
    const { env, log } = makePublicationEnv({}, () =>
      new Response(JSON.stringify({ message_id: 42 }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const first = await publishApprovedIntelligence(env, PUBLISH_INPUT);
    expect(first.status).toBe('PUBLISHED');
    expect(log.filter((l) => l === 'fetch')).toHaveLength(1);
    // The INSERT (claim) must precede the fetch in the execution order.
    expect(log.indexOf('claim')).toBeGreaterThanOrEqual(0);
    expect(log.indexOf('claim')).toBeLessThan(log.indexOf('fetch'));
  });

  test('a retry with the same key is a DUPLICATE and performs no second send', async () => {
    const { env, log } = makePublicationEnv({}, () =>
      new Response(JSON.stringify({ message_id: 42 }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    expect((await publishApprovedIntelligence(env, PUBLISH_INPUT)).status).toBe('PUBLISHED');
    const second = await publishApprovedIntelligence(env, PUBLISH_INPUT);
    expect(second.status).toBe('DUPLICATE');
    expect(second.publication_id).toMatch(/^asset_tg_/);
    expect(log.filter((l) => l === 'fetch')).toHaveLength(1);
  });

  test('a 429 from the collector returns FAILED + RATE_LIMITED + Retry-After seconds', async () => {
    const { env } = makePublicationEnv({}, () =>
      new Response(JSON.stringify({ error: 'FLOOD_WAIT' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '17' },
      }),
    );
    const result = await publishApprovedIntelligence(env, PUBLISH_INPUT);
    expect(result.status).toBe('FAILED');
    expect(result.telegram_status).toBe('RATE_LIMITED');
    expect(result.retry_after_seconds).toBe(17);
  });

  test('after a 429 the key is reclaimable, so the delayed retry really sends', async () => {
    let calls = 0;
    const { env, log, assets } = makePublicationEnv({}, () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: 'FLOOD_WAIT' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
        });
      }
      return new Response(JSON.stringify({ message_id: 7 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    expect((await publishApprovedIntelligence(env, PUBLISH_INPUT)).telegram_status).toBe('RATE_LIMITED');
    expect(assets.get(PUBLISH_INPUT.idempotency_key)).toMatchObject({ status: 'FAILED' });
    const retry = await publishApprovedIntelligence(env, PUBLISH_INPUT);
    expect(retry.status).toBe('PUBLISHED');
    expect(log.filter((l) => l === 'fetch')).toHaveLength(2);
    expect(assets.get(PUBLISH_INPUT.idempotency_key)).toMatchObject({ status: 'PUBLISHED' });
  });

  test('the claim is ONE atomic upsert that reclaims FAILED and a stale SENDING lease', () => {
    const sql = CLAIM_ASSET_SQL.replace(/\s+/g, ' ');
    // Single statement: no SELECT-then-INSERT window a concurrent delivery can win.
    expect(sql).not.toContain(';');
    expect(sql.startsWith('INSERT INTO social_assets')).toBe(true);
    expect(sql).toContain('ON CONFLICT(idempotency_key) DO UPDATE');
    expect(sql).toContain("social_assets.status = 'FAILED'");
    // Stale-lease reclaim: a SENDING claim older than the lease is reclaimable,
    // otherwise an isolate that dies mid-send makes the key unsendable forever.
    expect(sql).toContain("social_assets.status = 'SENDING'");
    expect(sql).toContain(`-${SENDING_LEASE_SECONDS} seconds`);
    expect(SENDING_LEASE_SECONDS).toBeGreaterThanOrEqual(300);
    // The surviving id is what every later transition must use.
    expect(sql).toContain('RETURNING id');
  });

  test('a stale SENDING lease is reclaimed under the ORIGINAL asset id', async () => {
    const { env, assets, publications } = makePublicationEnv({}, () =>
      new Response(JSON.stringify({ message_id: 9 }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    // A crash between claim and terminal write leaves this row behind.
    assets.set(PUBLISH_INPUT.idempotency_key, { id: 'asset_stuck', status: 'SENDING', stale: true });
    const result = await publishApprovedIntelligence(env, PUBLISH_INPUT);
    expect(result.status).toBe('PUBLISHED');
    expect(assets.get(PUBLISH_INPUT.idempotency_key)).toMatchObject({
      id: 'asset_stuck',
      status: 'PUBLISHED',
    });
    // The publication row references the id the claim RETURNED, not a fresh one.
    expect(publications).toEqual(['asset_stuck']);
  });

  test('a SENDING claim still inside its lease is a DUPLICATE (no double post)', async () => {
    const { env, log, assets } = makePublicationEnv({}, () => new Response('{}', { status: 200 }));
    assets.set(PUBLISH_INPUT.idempotency_key, { id: 'asset_in_flight', status: 'SENDING', stale: false });
    const result = await publishApprovedIntelligence(env, PUBLISH_INPUT);
    expect(result.status).toBe('DUPLICATE');
    expect(result.publication_id).toBe('asset_in_flight');
    expect(log).not.toContain('fetch');
  });

  test('a rejected Trust Gate performs no send at all', async () => {
    const { env, log } = makePublicationEnv({ eventStatus: 'WITHHELD' }, () => new Response('{}', { status: 200 }));
    const result = await publishApprovedIntelligence(env, PUBLISH_INPUT);
    expect(result.status).toBe('REJECTED');
    expect(log).toHaveLength(0);
  });
});

// ── Production GitHub dispatch authentication ──────────────────────

const PROD_SECRET = 'wave4a-dispatch-secret-0123456789abcdef';

function dispatchRequest(headers: Record<string, string> = {}) {
  return new Request('https://ctl.internal/internal/analysis/github/dispatch', { method: 'POST', headers });
}

describe('Wave 4A — production dispatch auth fail-closed', () => {
  test('unconfigured secret fails closed with 503', () => {
    const verdict = authenticateDispatchRequest(dispatchRequest(), {} as unknown as ValidationEnv);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.response.status).toBe(503);
  });

  test('a short/misconfigured secret also fails closed with 503', () => {
    const verdict = authenticateDispatchRequest(
      dispatchRequest({ Authorization: 'Bearer short' }),
      { DISPATCH_SHARED_SECRET: 'too-short' } as unknown as ValidationEnv,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.response.status).toBe(503);
  });

  test('anonymous and wrong-token production dispatch are rejected 401', () => {
    const env = { DISPATCH_SHARED_SECRET: PROD_SECRET } as unknown as ValidationEnv;
    const anonymous = authenticateDispatchRequest(dispatchRequest(), env);
    expect(anonymous.ok).toBe(false);
    if (!anonymous.ok) expect(anonymous.response.status).toBe(401);

    const wrong = authenticateDispatchRequest(dispatchRequest({ Authorization: 'Bearer nope' }), env);
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.response.status).toBe(401);
  });

  test('the exact production bearer is accepted', () => {
    const env = { DISPATCH_SHARED_SECRET: PROD_SECRET } as unknown as ValidationEnv;
    expect(authenticateDispatchRequest(dispatchRequest({ Authorization: `Bearer ${PROD_SECRET}` }), env).ok).toBe(true);
  });
});