import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  INQUIRY_DESK_EMAIL,
  INQUIRY_MAX,
  INQUIRY_MIN,
  buildInquiryAlertEmail,
  buildInquiryReceiptEmail,
  dispatchEnterpriseInquiry,
  formatInquiryReference,
  generateInquiryHex,
  hashClientIp,
  isInquiryReference,
  normalizeInquiryBody,
  normalizeInquiryCompany,
  normalizeInquiryEmail,
  submitEnterpriseInquiry,
} from '../../workers/api/src/inquiries';
import {
  NEWS_COVER_CACHE_CONTROL,
  NEWS_COVER_HEIGHT,
  NEWS_COVER_WIDTH,
  newsCoverMotifForCategory,
  newsCoverResponse,
  newsCoverSpecFromArticle,
  paintNewsCover,
  renderNewsCoverPng,
} from '../../apps/web/app/lib/newsCover';
import { newsArtEntity, newsArtLabel, newsArtMotif, newsArtRandom, newsArtSeed } from '../../apps/web/app/lib/newsArt';
import { API_BASE_URL, API_ENDPOINT_COUNT, API_ENDPOINT_GROUPS } from '../../apps/web/app/lib/apiCatalog';

/**
 * PHASE 10A — enterprise inquiry intake, editorial cover renderer and portal
 * token integrity. Local only: an injected D1 shim and a stub fetch, no network.
 */

interface InsertedRow {
  sql: string;
  args: unknown[];
}

function fakeDb() {
  const rows: InsertedRow[] = [];
  return {
    rows,
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              rows.push({ sql, args });
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

function stubFetch(status = 201) {
  const calls: Array<{ url: string; payload: any }> = [];
  const fetchFn = (async (url: any, init: any) => {
    calls.push({ url: String(url), payload: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify({ messageId: `<${calls.length}@relay>` }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

const NOW = new Date('2026-11-27T10:00:00.000Z');

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('enterprise inquiry — validation', () => {
  test('company shorter than 2 characters is rejected', () => {
    expect(() => normalizeInquiryCompany('A')).toThrow(/INVALID_COMPANY|between/);
  });

  test('company longer than 120 characters is rejected', () => {
    expect(() => normalizeInquiryCompany('x'.repeat(121))).toThrow(/between/);
  });

  test('company is trimmed and internal whitespace collapsed', () => {
    expect(normalizeInquiryCompany('  Acme   Security  ')).toBe('Acme Security');
  });

  test('control characters never reach the database', () => {
    expect(normalizeInquiryCompany('Acme\u0000 Sec\u0007urity')).toBe('Acme Sec urity');
  });

  test('email must be structurally valid', () => {
    expect(() => normalizeInquiryEmail('not-an-email')).toThrow(/valid work email/);
    expect(() => normalizeInquiryEmail('a@b')).toThrow(/valid work email/);
  });

  test('email is lowercased', () => {
    expect(normalizeInquiryEmail('  Analyst@Corp.COM ')).toBe('analyst@corp.com');
  });

  test('inquiry below the minimum is rejected', () => {
    expect(() => normalizeInquiryBody('short')).toThrow(/between/);
  });

  test('inquiry above the maximum is rejected', () => {
    expect(() => normalizeInquiryBody('x'.repeat(INQUIRY_MAX + 1))).toThrow(/between/);
  });

  test('inquiry boundaries are inclusive', () => {
    expect(normalizeInquiryBody('x'.repeat(INQUIRY_MIN)).length).toBe(INQUIRY_MIN);
    expect(normalizeInquiryBody('x'.repeat(INQUIRY_MAX)).length).toBe(INQUIRY_MAX);
  });
});

describe('enterprise inquiry — reference ids and privacy', () => {
  test('reference id matches ZX-INQ-YYYYMMDD-XXXX', () => {
    const reference = formatInquiryReference(NOW, 'a1f9');
    expect(reference).toBe('ZX-INQ-20261127-A1F9');
    expect(isInquiryReference(reference)).toBe(true);
  });

  test('a malformed reference is rejected by the guard', () => {
    expect(isInquiryReference('ZX-INQ-20261127-A1F')).toBe(false);
    expect(isInquiryReference('ZX-INTEL-20261127-A1F9')).toBe(false);
    expect(isInquiryReference(null)).toBe(false);
  });

  test('generated hex is four uppercase-able hex characters', () => {
    expect(generateInquiryHex()).toMatch(/^[0-9a-f]{4}$/);
  });

  test('the client IP is hashed, never stored raw', async () => {
    const hash = await hashClientIp('203.0.113.9');
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain('203.0.113.9');
    expect(await hashClientIp('203.0.113.9')).toBe(hash);
  });

  test('an unknown client IP produces no digest', async () => {
    expect(await hashClientIp('unknown')).toBeNull();
    expect(await hashClientIp('')).toBeNull();
  });

  test('submission writes one escaped-friendly row and returns the reference', async () => {
    const db = fakeDb();
    const result = await submitEnterpriseInquiry({
      db,
      company: 'Acme Security',
      email: 'SEC@Acme.com',
      inquiry: 'We need programmatic CVE enrichment for a 12-analyst SOC.',
      clientIp: '203.0.113.9',
      now: NOW,
    });

    expect(result.ok).toBe(true);
    expect(isInquiryReference(result.reference_id)).toBe(true);
    expect(result.record.email).toBe('sec@acme.com');
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].sql).toContain('INSERT INTO enterprise_inquiries');
    const args = db.rows[0].args.map((value) => String(value ?? ''));
    expect(args).toContain('Acme Security');
    expect(args).toContain('sec@acme.com');
    expect(args.some((value) => value.includes('203.0.113.9'))).toBe(false);
  });
});

describe('enterprise inquiry — email templates', () => {
  const alert = buildInquiryAlertEmail({
    referenceId: 'ZX-INQ-20261127-A1F9',
    company: 'Acme <script>alert(1)</script>',
    email: 'sec@acme.com',
    inquiry: 'We need <b>feed enrichment</b> & IOC tooling.',
    receivedAtUtc: '2026-11-27T10:00:00.000Z',
  });

  test('the alert subject carries the reference and the company', () => {
    expect(alert.subject).toContain('ZX-INQ-20261127-A1F9');
    expect(alert.subject).toContain('Acme');
  });

  test('the alert escapes every user-supplied value', () => {
    expect(alert.html).not.toContain('<script>');
    expect(alert.html).toContain('&lt;script&gt;');
    expect(alert.html).toContain('&amp;');
  });

  test('the alert body names the submitter so the founder can reply', () => {
    expect(alert.text).toContain('Reply to this email to answer the submitter');
    expect(alert.html).toContain('sec@acme.com');
    expect(alert.text).toContain('Response commitment: 1 business day.');
  });

  const receipt = buildInquiryReceiptEmail({
    referenceId: 'ZX-INQ-20261127-A1F9',
    company: 'Acme Security',
    receivedAtUtc: '2026-11-27T10:00:00.000Z',
  });

  test('the receipt states the reference and the one-business-day SLA', () => {
    expect(receipt.subject).toContain('ZX-INQ-20261127-A1F9');
    expect(receipt.html).toContain('1 business day');
    expect(receipt.text).toContain('Response SLA: 1 business day');
  });

  test('both templates are 580px table shells with the PNG logo, never inline SVG', () => {
    for (const template of [alert, receipt]) {
      expect(template.html).toContain('width="580"');
      expect(template.html).toContain('zayron-email-logo.png');
      expect(template.html).not.toContain('<svg');
    }
  });
});

describe('enterprise inquiry — dispatch', () => {
  const record = {
    reference_id: 'ZX-INQ-20261127-A1F9',
    company: 'Acme Security',
    email: 'sec@acme.com',
    inquiry: 'We need programmatic CVE enrichment for a 12-analyst SOC.',
    created_at: '2026-11-27T10:00:00.000Z',
  };

  test('fails closed with zero network calls when no key is configured', async () => {
    const stub = stubFetch();
    const outcome = await dispatchEnterpriseInquiry({ record, brevoApiKey: '', fetchFn: stub.fetchFn });
    expect(outcome).toEqual({ alert: 'SKIPPED_NO_CREDS', receipt: 'SKIPPED_NO_CREDS', errors: [] });
    expect(stub.calls).toHaveLength(0);
  });

  test('sends the alert to intel@ with the submitter as reply-to, then the receipt', async () => {
    const stub = stubFetch();
    const outcome = await dispatchEnterpriseInquiry({ record, brevoApiKey: 'test-key', fetchFn: stub.fetchFn });
    expect(outcome.alert).toBe('SENT');
    expect(outcome.receipt).toBe('SENT');
    expect(stub.calls).toHaveLength(2);

    const [alertCall, receiptCall] = stub.calls;
    expect(alertCall.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(alertCall.payload.to).toEqual([{ email: INQUIRY_DESK_EMAIL }]);
    expect(alertCall.payload.replyTo).toEqual({ email: 'sec@acme.com', name: 'Acme Security' });
    expect(receiptCall.payload.to).toEqual([{ email: 'sec@acme.com', name: 'Acme Security' }]);
    expect(receiptCall.payload.subject).toContain('ZX-INQ-20261127-A1F9');
  });

  test('a Brevo failure is reported, never thrown', async () => {
    const stub = stubFetch(500);
    const outcome = await dispatchEnterpriseInquiry({ record, brevoApiKey: 'test-key', fetchFn: stub.fetchFn });
    expect(outcome.alert).toBe('FAILED');
    expect(outcome.receipt).toBe('FAILED');
    expect(outcome.errors.length).toBeGreaterThan(0);
  });
});

describe('editorial cover — motif and escaping', () => {
  test('every category maps to its own motif', () => {
    expect(newsCoverMotifForCategory('EXPLOITATION')).toBe('KEV');
    expect(newsCoverMotifForCategory('VULNERABILITY')).toBe('VULNERABILITY');
    expect(newsCoverMotifForCategory('MALWARE')).toBe('MALWARE');
    expect(newsCoverMotifForCategory('THREAT_ACTOR')).toBe('ACTOR');
    expect(newsCoverMotifForCategory('SUPPLY_CHAIN')).toBe('SUPPLY_CHAIN');
    expect(newsCoverMotifForCategory('ADVISORY')).toBe('ADVISORY');
  });

  test('an unknown or empty category falls back to the advisory motif', () => {
    expect(newsCoverMotifForCategory('')).toBe('ADVISORY');
    expect(newsCoverMotifForCategory('SOMETHING_NEW')).toBe('ADVISORY');
  });

  test('the bitmap font encoder is gone from the cover pipeline', () => {
    const source = readFileSync('apps/web/app/lib/newsCover.ts', 'utf8');
    for (const banned of ['GLYPHS', 'glyphFor', 'coverGlyphAdvance', 'measureCoverText', 'coverTitleLines', 'FALLBACK_GLYPH']) {
      expect(source).not.toContain(banned);
    }
    expect(source).not.toContain('canvas.text(');
    expect(source).not.toContain('textFit');
  });

  test('the cover carries no article headline at all', () => {
    const spec = {
      category: 'MALWARE',
      severity: 'HIGH',
      title: 'Unique marker headline that must never be rasterised',
      entity: 'CVE-2026-99999',
      source: 'CISA',
      publishedAt: '2026-11-20T00:00:00.000Z',
      seed: 'marker',
    };
    const a = paintNewsCover(spec);
    const b = paintNewsCover({ ...spec, title: 'A completely different headline entirely' });
    // The title is metadata only: it cannot change a single pixel.
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('punctuation-heavy headlines render without throwing', () => {
    const spec = {
      category: 'ADVISORY',
      severity: 'INFO',
      title: 'ThreatsDay: 10M NGINX Services at Risk, 250+ Malicious Extensions, AI Server Hijacking + 17 More Stories',
      entity: null,
      source: 'The Hacker News',
      publishedAt: '2026-11-26T19:39:57.000Z',
    };
    expect(paintNewsCover(spec)).toHaveLength(NEWS_COVER_WIDTH * NEWS_COVER_HEIGHT * 3);
  });

  test('distinct slugs of the same category still get distinct artwork', () => {
    const spec = {
      category: 'EXPLOITATION',
      severity: 'CRITICAL',
      title: 'Same category, different briefing',
      entity: null,
      source: 'CISA',
      publishedAt: '2026-11-20T00:00:00.000Z',
    };
    expect(Array.from(paintNewsCover({ ...spec, seed: 'alpha' }))).not.toEqual(
      Array.from(paintNewsCover({ ...spec, seed: 'beta' })),
    );
  });
});

describe('editorial cover — rendering', () => {
  const base = {
    category: 'MALWARE',
    severity: 'HIGH',
    title: 'Infostealer campaign abuses signed installers',
    entity: 'CVE-2026-12345',
    source: 'CISA',
    publishedAt: '2026-11-20T00:00:00.000Z',
    seed: 'infostealer-signed-installers',
  };

  test('paints a full 1200×675 RGB buffer', () => {
    expect(paintNewsCover(base)).toHaveLength(NEWS_COVER_WIDTH * NEWS_COVER_HEIGHT * 3);
  });

  test('is deterministic for the same briefing', () => {
    expect(Array.from(paintNewsCover(base))).toEqual(Array.from(paintNewsCover(base)));
  });

  test('differs between categories', () => {
    const a = paintNewsCover(base);
    const b = paintNewsCover({ ...base, category: 'THREAT_ACTOR' });
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  test('renders a real PNG with the declared dimensions', async () => {
    const png = await renderNewsCoverPng(base);
    expect(Array.from(png.subarray(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(NEWS_COVER_WIDTH);
    expect(view.getUint32(20)).toBe(NEWS_COVER_HEIGHT);
  });

  test('serves the cover with the public day/week cache contract', async () => {
    const response = await newsCoverResponse(base);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe(NEWS_COVER_CACHE_CONTROL);
    expect(NEWS_COVER_CACHE_CONTROL).toBe('public, max-age=86400, s-maxage=604800');
  });

  test('absent metadata still yields a complete cover', () => {
    const png = paintNewsCover({ category: '', severity: '', title: '', source: '', publishedAt: '', entity: null });
    expect(png).toHaveLength(NEWS_COVER_WIDTH * NEWS_COVER_HEIGHT * 3);
  });

  test('the spec prefers a KEV CVE, then a catalog-linked entity, then nothing', () => {
    const withCve = newsCoverSpecFromArticle({
      slug: 's1',
      title: 't',
      category: 'EXPLOITATION',
      severity: 'CRITICAL',
      source_name: 'CISA',
      published_at: '2026-11-20T00:00:00.000Z',
      mentions: [{ entity_type: 'actor', entity_label: 'APT-Test', in_catalog: 1 }],
      graph_enrichment: { cves: [{ cve_id: 'CVE-2026-0001', cisa_kev: true }] },
    });
    expect(withCve.entity).toBe('CVE-2026-0001 · KEV');
    expect(withCve.seed).toBe('s1');

    const withActor = newsCoverSpecFromArticle({
      slug: 's2',
      title: 't',
      category: 'THREAT_ACTOR',
      severity: 'HIGH',
      source_name: 'Publisher',
      published_at: '2026-11-20T00:00:00.000Z',
      mentions: [
        { entity_type: 'actor', entity_label: 'Uncatalogued', in_catalog: 0 },
        { entity_type: 'actor', entity_label: 'APT-Test', in_catalog: 1 },
      ],
    });
    expect(withActor.entity).toBe('APT-Test');

    const bare = newsCoverSpecFromArticle({
      slug: 's3',
      title: 't',
      category: 'ADVISORY',
      severity: 'INFO',
      source_name: 'Publisher',
      published_at: '2026-11-20T00:00:00.000Z',
    });
    expect(bare.entity).toBeNull();
  });
});

describe('API portal catalog — accuracy', () => {
  test('exactly 27 live resource endpoints are documented', () => {
    expect(API_ENDPOINT_COUNT).toBe(27);
    expect(API_ENDPOINT_GROUPS.reduce((total, group) => total + group.endpoints.length, 0)).toBe(27);
  });

  test('every endpoint is unique and rooted at /', () => {
    const seen = new Set<string>();
    for (const group of API_ENDPOINT_GROUPS) {
      for (const endpoint of group.endpoints) {
        expect(endpoint.path.startsWith('/')).toBe(true);
        const key = `${endpoint.method} ${endpoint.path}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(27);
  });

  test('the base URL is the live dedicated API origin', () => {
    expect(API_BASE_URL).toBe('https://api.zayron-x.co/api/v1');
  });
});

describe('surface integrity — token parity and wiring', () => {
  const read = (path: string) => readFileSync(path, 'utf8');

  test('globals.css keeps the exact hairline / accent tokens', () => {
    const css = read('apps/web/app/globals.css');
    expect(css).toContain('--line:#282724');
    expect(css).toContain('--orange:#ff6b00');
    expect(css).toContain('--black:#050505');
    expect(css).toContain('--paper:#f7f7f4');
    expect(css).toContain('.ns-lead');
    expect(css).toContain('.inquiry');
    expect(css).toContain('.dx-rail');
  });

  test('the home page renders the inquiry form and keeps the footer', () => {
    const home = read('apps/web/app/page.tsx');
    expect(home).toContain('EnterpriseInquiry');
    expect(home).toContain('<SiteFooter />');
    expect(home).not.toContain('FinalCtaFooter');
  });

  test('the newsroom index wires the vector artwork into the lead and every card', () => {
    const news = read('apps/web/app/news/page.tsx');
    expect(news).toContain('EditorialNewsArtwork');
    expect(news).toContain('ns-lead');
    expect(news).toContain('ns-card');
    expect(news).toContain('IntelAlertStrip');
    // No bitmap cover images left on the index, and no empty KPI bar.
    expect(news).not.toContain('newsCoverUrl');
    expect(news).not.toContain('<img');
    expect(news).not.toContain('ns-meta"');
    expect(news).not.toContain('PUBLISHED BRIEFINGS');
  });

  test('the briefing detail page uses vector artwork for its hero and the PNG for og:image', () => {
    const detail = read('apps/web/app/news/[slug]/page.tsx');
    expect(detail).toContain('newsCoverUrl(article.slug)');
    expect(detail).toContain('EditorialNewsArtwork');
    expect(detail).toContain('ns-cover');
    expect(detail).toContain('twitter: { card: "summary_large_image"');
  });

  test('the inquiry form posts to the versioned endpoint and gates on Turnstile', () => {
    const form = read('apps/web/app/components/EnterpriseInquiry.tsx');
    expect(form).toContain('"/api/v1/inquiries"');
    expect(form).toContain('turnstile_token');
    expect(form).toContain('resetTurnstile');
  });

  test('the developer portal renders the real endpoint catalog', () => {
    const portal = read('apps/web/app/components/DeveloperPortal.tsx');
    expect(portal).toContain('API_ENDPOINT_GROUPS');
    expect(portal).toContain('Authorization: Bearer');
    expect(portal).toContain('/api/v1/keys/self-serve');
  });

  test('the subscribe strip wears the site tokens and keeps the Turnstile gate', () => {
    const strip = read('apps/web/app/components/IntelAlertStrip.tsx');
    expect(strip).not.toContain('#090C10');
    expect(strip).not.toContain('#ffffff');
    expect(strip).toContain('disabled={submitting || (Boolean(turnstileSiteKey) && !turnstileValue)}');
    expect(strip).toContain('resetTurnstile()');
    expect(strip).toContain('turnstile/v0/api.js?render=explicit');
    expect(strip).toContain('theme: "dark"');
    expect(strip).toContain('ia-segmented');
    expect(strip).toContain('frequency: cadence');

    const css = read('apps/web/app/globals.css');
    const panel = css.slice(css.indexOf('.ia-panel{'), css.indexOf('@media(max-width:900px){\n  .ia-panel'));
    expect(panel).toContain('background:#0d0d0c');
    expect(panel).toContain('background:#050505');
    expect(panel).toContain('background:#ff6b00');
    expect(panel).toContain('border:1px solid #282724');
    expect(panel).toContain('#100b07');
    expect(panel).not.toContain('#ffffff');
    expect(panel).not.toContain('rgb(255, 255, 255)');
  });

  test('the newsroom renders no zero-value KPI box', () => {
    const news = read('apps/web/app/news/page.tsx');
    expect(news).toContain('ns-subhead');
    expect(news).toContain('Verified Briefings');
    expect(news).not.toMatch(/<strong>\{0\}<\/strong>/);
    expect(news).not.toContain('LINKED ENTITIES');
  });
});

describe('editorial artwork — retina vector covers', () => {
  test('every category resolves to its own motif and pill label', () => {
    expect(newsArtMotif('EXPLOITATION')).toBe('KEV');
    expect(newsArtMotif('THREAT_ACTOR')).toBe('ACTOR');
    expect(newsArtMotif('SUPPLY_CHAIN')).toBe('SUPPLY_CHAIN');
    expect(newsArtMotif('SOMETHING_NEW')).toBe('ADVISORY');
    expect(newsArtLabel('EXPLOITATION')).toBe('CISA KEV');
    expect(newsArtLabel('THREAT_ACTOR')).toBe('THREAT ACTOR');
  });

  test('the seeded composition is deterministic', () => {
    const runA = newsArtRandom(newsArtSeed('cve-2026-0001|MALWARE'));
    const runB = newsArtRandom(newsArtSeed('cve-2026-0001|MALWARE'));
    expect([runA(), runA(), runA()]).toEqual([runB(), runB(), runB()]);
  });

  test('no two briefings share a composition seed', () => {
    const slugs = Array.from({ length: 17 }, (_, index) => `briefing-${index}-cve-2026-${1000 + index}`);
    const seeds = new Set(slugs.map((slug) => newsArtSeed(`${slug}|VULNERABILITY`)));
    expect(seeds.size).toBe(slugs.length);
  });

  test('the entity chip prefers a KEV CVE, then a catalog-verified mention', () => {
    expect(
      newsArtEntity({
        graph_enrichment: { cves: [{ cve_id: 'CVE-2026-0001', cisa_kev: true }] },
        mentions: [{ entity_label: 'APT-Test', in_catalog: 1 }],
      }),
    ).toBe('CVE-2026-0001 · KEV');
    expect(
      newsArtEntity({
        mentions: [{ entity_label: 'Uncatalogued', in_catalog: 0 }, { entity_label: 'APT-Test', in_catalog: 1 }],
      }),
    ).toBe('APT-Test');
    expect(newsArtEntity({})).toBeNull();
  });

  test('the component draws inline SVG only and never repeats the headline', () => {
    const art = readSource('apps/web/app/components/EditorialNewsArtwork.tsx');
    expect(art).toContain('viewBox="0 0 1200 675"');
    expect(art).toContain('<svg');
    expect(art).not.toContain('<img');
    expect(art).not.toContain('newsCoverUrl');
    expect(art).not.toContain('.title');
    expect(art).not.toContain('GLYPHS');
    // Two overlays only: the category pill and an optional entity chip.
    expect(art).toContain('ena-pill');
    expect(art).toContain('entity ?');
  });
});
