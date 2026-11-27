import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  EMAIL_DIGEST_HOURS,
  LINKEDIN_PUBLISH_HOURS,
  X_PUBLISH_HOURS,
  isEmailDigestSlot,
  isLinkedInPublishSlot,
  isXPublishSlot,
  selectSocialCandidate,
} from '../../workers/ingest/src/socialDispatch';
import {
  TELEGRAM_WIRE_SLOTS,
  isAuthoritativePulseTick,
  isIocIngestTick,
} from '../../workers/ingest/src/telegramSlots';
import { NEWS_INGEST_HOURS } from '../../workers/ingest/src/newsIngest';
import { RADAR_BACKFILL_SLOT_HOURS } from '../../workers/ingest/src/radarBackfill';
import { POC_QUIET_SLOT_HOURS } from '../../workers/ingest/src/pocSync';
import { CISA_KEV_QUIET_SLOT_HOURS } from '../../workers/ingest/src/cisaKevBackfill';
import {
  buildOAuth1Header,
  formatXPost,
  formatXSelfReply,
  runXPublishPass,
} from '../../workers/ingest/src/xPublisher';
import { formatLinkedInPost, runLinkedInPublishPass } from '../../workers/ingest/src/linkedinPublisher';
import {
  buildEmailDigestHtml,
  buildEmailDigestText,
  runEmailDigestPass,
} from '../../workers/ingest/src/emailDigest';
import { buildIndexNowUrls } from '../../workers/ingest/src/newsIngest';
import {
  BriefingError,
  subscribeBriefing,
  unsubscribeBriefing,
} from '../../workers/api/src/briefings';
import { buildOpenApiDocument } from '../../workers/api/src/openapi';
import { classifyEndpoint, requiredTrust } from '../../workers/api/src/security';
import { buildNewsRssXml, WEBSUB_HUB_URL } from '../../apps/web/app/lib/rss';
import { buildUrlset, normalizeSitemapLastmod, robotsText } from '../../apps/web/app/lib/sitemap';

const utc = (hour: number, minute: number) => new Date(Date.UTC(2026, 10, 27, hour, minute, 0));

function createInMemoryDistributionDb() {
  const socialRows: any[] = [];
  const subscribers = new Map<string, any>();

  return {
    socialRows,
    subscribers,
    prepare(sql: string) {
      let args: any[] = [];
      const stmt = {
        bind(...values: any[]) {
          args = values;
          return stmt;
        },
        async first<T = any>(): Promise<T | null> {
          if (sql.includes('FROM vulnerabilities') && sql.includes('social_dispatches')) {
            const platform = sql.includes("s.platform = 'x'") ? 'x' : 'linkedin';
            const sent = socialRows.some((r) => r.platform === platform && r.base_entity_id === 'CVE-2026-99001' && r.status === 'SENT');
            if (sent) return null;
            return {
              cve_id: 'CVE-2026-99001',
              title: 'CVE-2026-99001 Advisory',
              description: 'Remote code execution in Edge Gateway before patch.',
              severity: 'CRITICAL',
              cvss_score: 9.8,
              epss_score: 0.942,
              is_exploited_in_wild: 1,
              affected_vendor: 'Acme',
              affected_product: 'Edge Gateway',
              strategic_brief_json: JSON.stringify({
                executive_summary: 'Active exploitation observed against unpatched Acme Edge Gateway.',
                remediation: { immediate_action: 'Upgrade to v4.2.1 immediately.' },
              }),
            } as T;
          }
          if (sql.includes('FROM news_articles') && sql.includes('social_dispatches')) {
            const platform = String(args[0] ?? 'x');
            const sent = socialRows.some((r) => r.platform === platform && r.base_entity_id === 'test-briefing' && r.status === 'SENT');
            if (sent) return null;
            return {
              slug: 'test-briefing',
              title: 'Zero-Day Exploited in Wild',
              verdict: 'Vendor patch released for active campaign.',
              summary: 'Summary',
              category: 'EXPLOITATION',
              severity: 'HIGH',
              source_name: 'CISA Advisories',
              graph_enrichment_json: '{}',
              published_at: '2026-11-27T08:00:00Z',
            } as T;
          }
          return null;
        },
        async all<T = any>() {
          if (sql.includes('FROM email_subscribers')) {
            const active = Array.from(subscribers.values()).filter((s) => s.status === 'ACTIVE');
            return { results: active as T[] };
          }
          if (sql.includes('FROM news_articles')) {
            return {
              results: [
                {
                  slug: 'cisa-alert-2026',
                  title: 'CISA Releases Emergency Directive',
                  severity: 'CRITICAL',
                  source_name: 'CISA Advisories',
                  verdict: 'Patch within 48 hours.',
                },
              ] as T[],
            };
          }
          if (sql.includes('FROM vulnerabilities')) {
            return {
              results: [
                {
                  cve_id: 'CVE-2026-99001',
                  severity: 'CRITICAL',
                  affected_vendor: 'Acme',
                  affected_product: 'Edge Gateway',
                  cvss_score: 9.8,
                },
              ] as T[],
            };
          }
          if (sql.includes('FROM malware_reports')) {
            return {
              results: [
                { id: 'MAL-2026-5001', title: 'Malicious npm package evil-pkg', severity: 'HIGH' },
              ] as T[],
            };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (sql.includes('INSERT OR IGNORE INTO social_dispatches')) {
            const [id, platform, entity_type, base_entity_id, external_post_id, reply_post_id, status, error_message, dispatched_at] = args;
            const dup =
              status === 'SENT' &&
              socialRows.some((r) => r.platform === platform && r.base_entity_id === base_entity_id && r.status === 'SENT');
            if (!dup) {
              socialRows.push({
                id,
                platform,
                entity_type,
                base_entity_id,
                external_post_id,
                reply_post_id,
                status,
                error_message,
                dispatched_at,
              });
            }
            return { meta: { changes: dup ? 0 : 1 } };
          }
          if (sql.includes('INSERT INTO email_subscribers')) {
            const [id, email, frequency, focus, token, subscribedAt] = args;
            const existing = subscribers.get(email);
            if (existing) {
              existing.frequency = frequency;
              existing.focus = focus;
              existing.status = 'ACTIVE';
              existing.unsubscribed_at = null;
            } else {
              subscribers.set(email, {
                id,
                email,
                frequency,
                focus,
                status: 'ACTIVE',
                unsubscribe_token: token,
                subscribed_at: subscribedAt,
                unsubscribed_at: null,
                last_sent_at: null,
              });
            }
            return { meta: { changes: 1 } };
          }
          if (sql.includes('UPDATE email_subscribers') && sql.includes("status = 'UNSUBSCRIBED'")) {
            const [unsubAt, token] = args;
            let changes = 0;
            for (const sub of subscribers.values()) {
              if (sub.unsubscribe_token === token) {
                sub.status = 'UNSUBSCRIBED';
                sub.unsubscribed_at = unsubAt;
                changes += 1;
              }
            }
            return { meta: { changes } };
          }
          if (sql.includes('UPDATE email_subscribers SET last_sent_at')) {
            const [sentAt, id] = args;
            for (const sub of subscribers.values()) {
              if (sub.id === id) sub.last_sent_at = sentAt;
            }
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
      };
      return stmt;
    },
    async batch(stmts: any[]) {
      const results = [];
      for (const s of stmts) results.push(await s.run());
      return results;
    },
  };
}

describe('Phase 9C — Cron Slot Isolation', () => {
  test('Phase 9C :40 UTC slots have zero overlap with any existing :00, :20, or :40 job and leave 22:40 free', () => {
    const existing40Hours = new Set<number>([
      ...TELEGRAM_WIRE_SLOTS.filter((s) => s.minuteOfDay % 60 === 40).map((s) => Math.floor(s.minuteOfDay / 60)),
      ...NEWS_INGEST_HOURS,
      ...RADAR_BACKFILL_SLOT_HOURS,
      ...POC_QUIET_SLOT_HOURS,
      ...CISA_KEV_QUIET_SLOT_HOURS,
    ]);

    const phase9cHours = [...X_PUBLISH_HOURS, ...LINKEDIN_PUBLISH_HOURS, ...EMAIL_DIGEST_HOURS];
    expect(new Set(phase9cHours).size).toBe(phase9cHours.length);

    for (const hour of phase9cHours) {
      expect(existing40Hours.has(hour)).toBe(false);
      const d = utc(hour, 40);
      expect(isIocIngestTick(d, 8)).toBe(false);
      expect(isAuthoritativePulseTick(d)).toBe(false);
    }

    // 22:40 UTC remains free safety reserve
    expect(existing40Hours.has(22)).toBe(false);
    expect(isXPublishSlot(utc(22, 40))).toBe(false);
    expect(isLinkedInPublishSlot(utc(22, 40))).toBe(false);
    expect(isEmailDigestSlot(utc(22, 40))).toBe(false);

    // Exact slot checks
    expect(X_PUBLISH_HOURS).toEqual([7, 11, 15, 19, 21, 23]);
    expect(LINKEDIN_PUBLISH_HOURS).toEqual([13, 17]);
    expect(EMAIL_DIGEST_HOURS).toEqual([9]);
  });
});

describe('Phase 9C — X & LinkedIn Publishers, OAuth 1.0a & Dedupe', () => {
  test('buildOAuth1Header produces deterministic HMAC-SHA1 signature', async () => {
    const creds = {
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      accessToken: 'at_test',
      accessTokenSecret: 'ats_test',
    };
    const h1 = await buildOAuth1Header({
      method: 'POST',
      url: 'https://api.twitter.com/2/tweets',
      creds,
      nonce: 'fixednonce123',
      timestamp: '1700000000',
    });
    const h2 = await buildOAuth1Header({
      method: 'POST',
      url: 'https://api.twitter.com/2/tweets',
      creds,
      nonce: 'fixednonce123',
      timestamp: '1700000000',
    });
    expect(h1).toBe(h2);
    expect(h1.startsWith('OAuth ')).toBe(true);
    expect(h1).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(h1).toContain('oauth_nonce="fixednonce123"');
    expect(h1).toContain('oauth_timestamp="1700000000"');
    expect(h1).toContain('oauth_signature="');
  });

  test('X publisher fails closed with SKIPPED_NO_CREDS and 0 subrequests when any secret is missing', async () => {
    const db = createInMemoryDistributionDb();
    let fetchCount = 0;
    const res = await runXPublishPass(
      { DB: db, X_API_KEY: 'only-one' },
      {
        when: utc(7, 40),
        fetchFn: (async () => {
          fetchCount += 1;
          return new Response('{}');
        }) as unknown as typeof fetch,
      },
    );
    expect(res.status).toBe('SKIPPED_NO_CREDS');
    expect(res.subrequestsUsed).toBe(0);
    expect(fetchCount).toBe(0);
  });

  test('X publisher formats <=220 char post + self-reply, uses <=4 subrequests, and deduplicates all-time', async () => {
    const db = createInMemoryDistributionDb();
    const calls: string[] = [];
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

    const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/api/og/')) {
        return new Response(pngBytes, { status: 200, headers: { 'content-type': 'image/png' } });
      }
      if (url.includes('upload.twitter.com')) {
        return new Response(JSON.stringify({ media_id_string: 'media_999' }), { status: 200 });
      }
      if (url.includes('api.twitter.com/2/tweets')) {
        const body = JSON.parse(String(init?.body ?? '{}'));
        if (body.reply?.in_reply_to_tweet_id) {
          return new Response(JSON.stringify({ data: { id: 'tweet_reply_2' } }), { status: 201 });
        }
        expect(body.text.length).toBeLessThanOrEqual(220);
        expect(body.media?.media_ids).toEqual(['media_999']);
        return new Response(JSON.stringify({ data: { id: 'tweet_main_1' } }), { status: 201 });
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const env = {
      DB: db,
      X_API_KEY: 'ck',
      X_API_SECRET: 'cs',
      X_ACCESS_TOKEN: 'at',
      X_ACCESS_TOKEN_SECRET: 'ats',
    };

    const first = await runXPublishPass(env, { when: utc(11, 40), fetchFn: fakeFetch });
    expect(first.status).toBe('SENT');
    expect(first.tweet_id).toBe('tweet_main_1');
    expect(first.reply_id).toBe('tweet_reply_2');
    expect(first.media_attached).toBe(true);
    expect(first.subrequestsUsed).toBeLessThanOrEqual(4);
    expect(calls.length).toBe(4);

    const candidate = await selectSocialCandidate(db, 'x');
    expect(candidate?.base_entity_id).toBe('test-briefing');
    if (candidate) {
      expect(formatXPost(candidate).length).toBeLessThanOrEqual(220);
      expect(formatXSelfReply(candidate)).toContain('t.me/zayronxai');
    }
  });

  test('LinkedIn publisher fails closed on missing creds and publishes CISO 3-part format in <=4 subrequests', async () => {
    const db = createInMemoryDistributionDb();
    let fetchCount = 0;
    const skipped = await runLinkedInPublishPass(
      { DB: db },
      {
        when: utc(13, 40),
        fetchFn: (async () => {
          fetchCount += 1;
          return new Response('{}');
        }) as unknown as typeof fetch,
      },
    );
    expect(skipped.status).toBe('SKIPPED_NO_CREDS');
    expect(fetchCount).toBe(0);

    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const calls: string[] = [];
    const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/api/og/')) {
        return new Response(pngBytes, { status: 200, headers: { 'content-type': 'image/png' } });
      }
      if (url.includes('initializeUpload')) {
        return new Response(
          JSON.stringify({ value: { uploadUrl: 'https://upload.linkedin.com/put-1', image: 'urn:li:image:123' } }),
          { status: 200 },
        );
      }
      if (url.includes('upload.linkedin.com/put-1')) {
        return new Response('', { status: 201 });
      }
      if (url.includes('api.linkedin.com/rest/posts')) {
        const body = JSON.parse(String(init?.body ?? '{}'));
        expect(body.commentary).toContain('What Happened');
        expect(body.commentary).toContain('Live ZAYRON-X Telemetry');
        expect(body.commentary).toContain('Immediate Defensive Action');
        expect(body.commentary).toContain('#Cybersecurity #ThreatIntelligence #SOC');
        return new Response('', { status: 201, headers: { 'x-restli-id': 'urn:li:share:777' } });
      }
      return new Response('', { status: 404 });
    }) as unknown as typeof fetch;

    const sent = await runLinkedInPublishPass(
      { DB: db, LINKEDIN_ACCESS_TOKEN: 'li_tok', LINKEDIN_AUTHOR_URN: 'urn:li:organization:42' },
      { when: utc(13, 40), fetchFn: fakeFetch },
    );
    expect(sent.status).toBe('SENT');
    expect(sent.post_id).toBe('urn:li:share:777');
    expect(sent.subrequestsUsed).toBeLessThanOrEqual(4);
    expect(calls.length).toBe(4);

    // Format helper sanity
    const liText = formatLinkedInPost({
      entity_type: 'cve',
      base_entity_id: 'CVE-2026-99001',
      title: 'CVE-2026-99001',
      verdict: 'Remote code execution.',
      severity: 'CRITICAL',
      canonical_url: 'https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-99001',
      og_image_url: 'https://zayron-x.co/api/og/cve/CVE-2026-99001',
      cvss_score: 9.8,
      epss_score: 0.9,
      is_kev: true,
      source_name: 'NVD',
      category: 'VULNERABILITY',
      remediation_hint: 'Patch now.',
      ecosystem: null,
      package_name: null,
      linked_cves: ['CVE-2026-99001'],
    });
    expect(liText).toContain('CISA KEV: Listed');
  });
});

describe('Phase 9C — IndexNow Batching, Key File, Briefings API & Email Digest', () => {
  test('IndexNow verification key file exists with exact 32-char hex key', () => {
    const keyFile = readFileSync('apps/web/public/52217d0bead0f27974ed75fe089329e2.txt', 'utf8');
    expect(keyFile).toBe('52217d0bead0f27974ed75fe089329e2');
  });

  test('buildIndexNowUrls batches News, CVE/KEV/PoC, and MAL-* URLs cleanly up to 100', () => {
    const batch = buildIndexNowUrls({
      newsSlugs: ['story-1', 'story-1'],
      cveIds: ['cve-2026-100', 'CVE-2026-101'],
      malwareIds: ['MAL-2026-500'],
      includeExploitsHub: true,
    });
    expect(batch).toEqual([
      'https://zayron-x.co/news/story-1',
      'https://zayron-x.co/news',
      'https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-100',
      'https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-101',
      'https://zayron-x.co/intelligence/exploits',
      'https://zayron-x.co/intelligence/malware/advisories/MAL-2026-500',
      'https://zayron-x.co/intelligence/malware',
    ]);
    const big = buildIndexNowUrls({
      cveIds: Array.from({ length: 150 }, (_, i) => `CVE-2026-${1000 + i}`),
    });
    expect(big.length).toBe(100);
  });

  test('briefings subscribe/unsubscribe handles validation, idempotency, OpenAPI, and Turnstile guard', async () => {
    const db = createInMemoryDistributionDb();

    await expect(
      subscribeBriefing({ db, email: 'not-an-email' }),
    ).rejects.toBeInstanceOf(BriefingError);

    const sub1 = await subscribeBriefing({ db, email: '  SecOps@Example.COM ', frequency: 'daily', focus: 'critical_kev' });
    expect(sub1).toEqual({ ok: true, status: 'ACTIVE', frequency: 'daily', focus: 'critical_kev' });

    const stored = db.subscribers.get('secops@example.com');
    expect(stored?.status).toBe('ACTIVE');

    const unsub = await unsubscribeBriefing({ db, token: stored.unsubscribe_token });
    expect(unsub).toEqual({ ok: true, status: 'UNSUBSCRIBED', updated: true });
    expect(db.subscribers.get('secops@example.com')?.status).toBe('UNSUBSCRIBED');

    // Re-subscribe reactivates cleanly
    const sub2 = await subscribeBriefing({ db, email: 'secops@example.com', frequency: 'weekly', focus: 'all' });
    expect(sub2).toEqual({ ok: true, status: 'ACTIVE', frequency: 'weekly', focus: 'all' });
    expect(db.subscribers.get('secops@example.com')?.status).toBe('ACTIVE');

    // Security & OpenAPI contracts
    expect(requiredTrust('POST', '/api/v1/briefings/subscribe')).toBe('public');
    expect(classifyEndpoint('POST', '/api/v1/briefings/subscribe')).toBe('public_write');
    expect(requiredTrust('GET', '/api/v1/briefings/unsubscribe')).toBe('public');

    const openapi = buildOpenApiDocument({ origin: 'https://zayron-x.co' }) as { paths: Record<string, unknown> };
    expect(openapi.paths['/briefings/subscribe']).toBeDefined();
    expect(openapi.paths['/briefings/unsubscribe']).toBeDefined();

    const apiSource = readFileSync('workers/api/src/index.ts', 'utf8');
    expect(apiSource).toContain("path === '/api/v1/briefings/subscribe'");
    expect(apiSource).toContain('verifyTurnstileToken(env, body.turnstile_token, clientIp)');
  });

  test('emailDigest fails closed without BREVO_API_KEY and sends batched Brevo messageVersions with List-Unsubscribe', async () => {
    const db = createInMemoryDistributionDb();
    let fetches = 0;
    const noCreds = await runEmailDigestPass(
      { DB: db },
      {
        when: utc(9, 40),
        fetchFn: (async () => {
          fetches += 1;
          return new Response('{}');
        }) as unknown as typeof fetch,
      },
    );
    expect(noCreds.status).toBe('SKIPPED_NO_CREDS');
    expect(fetches).toBe(0);

    const noSubs = await runEmailDigestPass(
      { DB: db, BREVO_API_KEY: 'xkeysib-test' },
      { when: utc(9, 40), fetchFn: (async () => new Response('{}')) as unknown as typeof fetch },
    );
    expect(noSubs.status).toBe('NO_SUBSCRIBERS');

    await subscribeBriefing({ db, email: 'analyst@example.com' });
    const sentPayloads: any[] = [];
    const sent = await runEmailDigestPass(
      { DB: db, BREVO_API_KEY: 'xkeysib-test' },
      {
        when: utc(9, 40),
        fetchFn: (async (_url: RequestInfo | URL, init?: RequestInit) => {
          sentPayloads.push(JSON.parse(String(init?.body ?? '{}')));
          return new Response(JSON.stringify({ messageId: 'brevo_1' }), { status: 201 });
        }) as unknown as typeof fetch,
      },
    );
    expect(sent.status).toBe('SENT');
    expect(sent.emails_sent).toBe(1);
    expect(sent.subrequestsUsed).toBe(1);
    const version = sentPayloads[0].messageVersions[0];
    expect(version.headers['List-Unsubscribe']).toContain('https://api.zayron-x.co/api/v1/briefings/unsubscribe?token=');
    expect(version.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(version.htmlContent).toContain('ZAYRON-X');

    const html = buildEmailDigestHtml(
      {
        dateLabel: '2026-11-27',
        news: [{ slug: 's1', title: 'Alert', severity: 'CRITICAL', source_name: 'CISA', verdict: 'Patch now.' }],
        kevs: [{ cve_id: 'CVE-2026-1', severity: 'CRITICAL', affected_vendor: 'Acme', affected_product: 'GW', cvss_score: 9.8 }],
        malware: [{ id: 'MAL-2026-1', title: 'Evil pkg', severity: 'HIGH' }],
      },
      'https://api.zayron-x.co/api/v1/briefings/unsubscribe?token=abc',
    );
    expect(html).toContain('CVE-2026-1');
    expect(html).toContain('MAL-2026-1');
    expect(buildEmailDigestText({ dateLabel: '2026-11-27', news: [], kevs: [], malware: [] }, 'https://x/unsub')).toContain('https://x/unsub');
  });
});

describe('Phase 9C — RSS 2.0 + WebSub, Sitemap RFC 3339 & Idempotent Migration', () => {
  test('buildNewsRssXml emits valid RSS 2.0 with WebSub hub and self link', () => {
    const xml = buildNewsRssXml(
      [
        {
          slug: 'brief-1',
          title: 'RCE & Privilege Escalation in Gateway',
          verdict: 'Patch available.',
          summary: 'Summary',
          category: 'EXPLOITATION',
          severity: 'CRITICAL',
          source_name: 'CISA Advisories',
          published_at: '2026-11-27T08:40:00Z',
        },
      ],
      'https://zayron-x.co',
    );
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(xml).toContain(`<atom:link rel="hub" href="${WEBSUB_HUB_URL}" />`);
    expect(xml).toContain('<atom:link rel="self" href="https://zayron-x.co/news/rss.xml" type="application/rss+xml" />');
    expect(xml).toContain('RCE &amp; Privilege Escalation in Gateway');
  });

  test('normalizeSitemapLastmod fixes SQLite space-separated timestamps and drops invalid ones', () => {
    expect(normalizeSitemapLastmod('2026-11-24 19:20:38')).toBe('2026-11-24T19:20:38Z');
    expect(normalizeSitemapLastmod('2026-10-02 19:58:31')).toBe('2026-10-02T19:58:31Z');
    expect(normalizeSitemapLastmod('2026-11-27')).toBe('2026-11-27');
    expect(normalizeSitemapLastmod('not-a-date')).toBeNull();
    const xml = buildUrlset([
      { loc: 'https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-1', lastmod: '2026-11-24 19:20:38' },
    ]);
    expect(xml).toContain('<lastmod>2026-11-24T19:20:38Z</lastmod>');
  });

  test('robotsText lists both sitemap.xml and sitemaps/news.xml', () => {
    const robots = robotsText(false, 'https://zayron-x.co');
    expect(robots).toContain('Sitemap: https://zayron-x.co/sitemap.xml');
    expect(robots).toContain('Sitemap: https://zayron-x.co/sitemaps/news.xml');
  });

  test('migration 0041 uses strictly idempotent DDL', () => {
    const sql = readFileSync('db/migrations/0041_distribution_social_email_v1.sql', 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS social_dispatches');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_social_sent_dedupe');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS email_subscribers');
    expect(sql).not.toMatch(/DROP\s+TABLE|ALTER\s+TABLE/i);
  });
});
