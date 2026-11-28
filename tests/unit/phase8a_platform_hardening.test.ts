/**
 * PHASE 8A — PLATFORM HARDENING GATE.
 *
 * Covers, without any network, D1 or live endpoint:
 *   · the Telegram duplicate-post root cause and its 7-day base-id lock;
 *   · the enterprise API (`POST /iocs/bulk` cap/normalization, `?since=` and
 *     `?offset=` incremental sync) with a statement-capturing D1 shim;
 *   · the PoC-in-GitHub quiet-hours slot isolation and EPSS velocity schema;
 *   · the deterministic KQL/SPL generators, the MITRE ATT&CK family map and the
 *     zero-raw-malicious-anchor invariant of every new surface.
 */
import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';

import {
  TELEGRAM_DEDUPE_WINDOW_DAYS,
  TELEGRAM_CVE_SELECTION_SQL,
  TELEGRAM_MALWARE_SELECTION_SQL,
  normalizeTelegramEntityId,
} from '../../workers/ingest/src/telegramDispatch';
import {
  POC_MAX_SUBREQUESTS,
  isPocSyncSlot,
  newestPocFileNames,
  parsePocIndex,
  pocCveFromFileName,
} from '../../workers/ingest/src/pocSync';
import {
  IOC_BULK_MAX_ITEMS,
  bulkLookupIocs,
  normalizeSinceParam,
  queryIocFeed,
} from '../../workers/api/src/iocs';
import { TELEGRAM_WIRE_SLOTS } from '../../workers/ingest/src/telegramSlots';
import {
  familyDetectionQueries,
  cveHuntingQueries,
  isVettedPivotUrl,
  mitreTechniqueUrl,
  mitreTechniquesForFamily,
  threatPivots,
} from '../../apps/web/app/lib/detectionAsCode';
import { adjustedRisk } from '../../apps/web/app/lib/riskAdjuster';

const read = (path: string) => fs.readFileSync(path, 'utf8');

/* ── 1. Telegram duplicate dispatch ───────────────────────────────────────── */

describe('telegram dedupe', () => {
  test('the ledger key is normalized to the canonical base entity', () => {
    expect(normalizeTelegramEntityId('CVE-2026-65879@08:00')).toBe('CVE-2026-65879');
    expect(normalizeTelegramEntityId('mir_66cd231d1563b12f@09:20')).toBe('mir_66cd231d1563b12f');
    expect(normalizeTelegramEntityId('CVE-2026-65879')).toBe('CVE-2026-65879');
    expect(normalizeTelegramEntityId('')).toBe('');
    expect(normalizeTelegramEntityId(undefined)).toBe('');
  });

  test('an @08:00 row blocks the same CVE at 10:40 (base-id lookup)', () => {
    for (const sql of [TELEGRAM_CVE_SELECTION_SQL, TELEGRAM_MALWARE_SELECTION_SQL]) {
      expect(sql).toContain('base_entity_id');
      expect(sql).toMatch(/d\.entity_id LIKE .* \|\| '@%'/);
      // PHASE 9A — the lock is permanent: any SENT base id is excluded forever,
      // not for a 7-day window. This is what closes FALLBACK_TO_CVE re-posts.
      expect(sql).toContain("d.status = 'SENT'");
      expect(sql).not.toContain("datetime('now', '-7 days')");
      expect(TELEGRAM_DEDUPE_WINDOW_DAYS).toBe(7);
    }
  });

  test('the wire writes both the per-slot id and the normalized base id', () => {
    const wire = read('workers/ingest/src/telegramWireSlot.ts');
    expect(wire).toContain('base_entity_id');
    expect(wire).toContain('normalizeTelegramEntityId(payload.entity_id)');
    // delivery mode is recorded so photo vs text is auditable
    expect(wire).toContain('delivery_mode');
    expect(wire).toContain("send.viaPhoto ? 'photo' : 'text'");
    const dispatch = read('workers/ingest/src/telegramDispatch.ts');
    expect(dispatch).toContain("'text'");
  });

  test('the migration backfills pre-existing slot-suffixed rows', () => {
    const sql = read('db/migrations/0037_dynamic_intel_v1.sql');
    expect(sql).toContain('ALTER TABLE telegram_dispatches ADD COLUMN base_entity_id TEXT');
    expect(sql).toContain('ALTER TABLE telegram_dispatches ADD COLUMN delivery_mode TEXT');
    expect(sql).toContain("instr(entity_id, '@')");
    expect(sql).toContain('idx_telegram_dispatches_base');
  });
});

/* ── 2. Enterprise API ────────────────────────────────────────────────────── */

interface CapturedStatement {
  sql: string;
  binds: unknown[];
}

/** Smallest D1 surface these pure functions use: prepare/bind/all/batch. */
function shimDb(rows: Array<Record<string, unknown>>, captured: CapturedStatement[] = []) {
  const make = (sql: string, binds: unknown[]): any => ({
    sql,
    binds,
    bind: (...args: unknown[]) => make(sql, args),
    all: async () => ({ results: rows }),
    first: async () => rows[0] ?? null,
    run: async () => ({ success: true }),
  });
  return {
    prepare: (sql: string) => {
      const statement = make(sql, []);
      captured.push({ sql, binds: [] });
      const originalBind = statement.bind;
      statement.bind = (...args: unknown[]) => {
        captured[captured.length - 1].binds = args;
        return originalBind(...args);
      };
      return statement;
    },
    batch: async (statements: any[]) => statements.map((statement) => ({ results: rows })),
  } as any;
}

const IOC_ROW = {
  id: 'ioc_1',
  type: 'ip',
  normalized_value: '45.9.168.10',
  confidence: 92,
  status: 'ACTIVE',
  seen_count: 3,
  sources_json: '["feodo-tracker"]',
  family: 'QakBot',
  asn: 'AS204957',
  asn_name: 'GREEN FLOOD',
  country: 'NL',
  expires_at: null,
  radar_enriched_at: null,
  created_at: '2026-11-20 00:00:00',
  updated_at: '2026-11-26 00:00:00',
};

describe('POST /api/v1/iocs/bulk', () => {
  test('the cap is 50 and the route is documented', () => {
    expect(IOC_BULK_MAX_ITEMS).toBe(50);
    const api = read('workers/api/src/index.ts');
    expect(api).toContain("path === '/api/v1/iocs/bulk' && request.method === 'POST'");
    expect(api).toContain("'TOO_MANY_INDICATORS'");
    expect(api).toContain("'EMPTY_INDICATORS'");
    expect(api).toContain("'API_KEY_REQUIRED'");
    // The read-only POST is exempt from the legacy mutation freeze.
    expect(api).toContain("const readOnlyPost = path === '/api/v1/iocs/bulk'");
    const openapi = read('workers/api/src/openapi.ts');
    expect(openapi).toContain('"/iocs/bulk"');
    expect(openapi).toContain('maxItems: 50');
  });

  test('defanged input is refanged and matched; unknown values are not', async () => {
    const result = await bulkLookupIocs(shimDb([IOC_ROW]), [
      '45.9.168.10',
      '45[.]9[.]168[.]10',
      '203.0.113.99',
    ]);
    expect(result.summary.requested).toBe(3);
    expect(result.summary.found).toBe(2);
    expect(result.summary.active).toBe(2);
    expect(result.unmatched).toEqual(['203.0.113.99']);
    expect(result.matched[0].defanged).toBe('45[.]9[.]168[.]10');
    expect(result.matched[0].family).toBe('QakBot');
    expect(result.matched[0].sources).toEqual(['feodo-tracker']);
    expect(result.matched[0].asn).toBe('AS204957');
    expect(result.matched[0].country).toBe('NL');
  });

  test('one batched call, never one query per indicator', async () => {
    const captured: CapturedStatement[] = [];
    const db = shimDb([IOC_ROW], captured);
    let batches = 0;
    const originalBatch = db.batch;
    db.batch = async (statements: any[]) => {
      batches += 1;
      return originalBatch(statements);
    };
    await bulkLookupIocs(db, Array.from({ length: 50 }, (_, i) => `10.0.0.${i}`));
    expect(batches).toBe(1);
  });
});

describe('GET /api/v1/iocs/feed incremental sync', () => {
  test('since is normalized to the stored datetime shape', () => {
    expect(normalizeSinceParam('2026-11-01T00:00:00Z')).toEqual({ ok: true, value: '2026-11-01 00:00:00' });
    expect(normalizeSinceParam('2026-11-01 12:30:00')).toEqual({ ok: true, value: '2026-11-01 12:30:00' });
    expect(normalizeSinceParam('')).toEqual({ ok: true, value: null });
    // A bad checkpoint must never degrade into a full re-pull.
    expect(normalizeSinceParam('yesterday-ish').ok).toBe(false);
  });

  test('since/offset reach SQL as a bound timestamp and an OFFSET clause', async () => {
    const captured: CapturedStatement[] = [];
    const feed = await queryIocFeed(shimDb([IOC_ROW], captured), {
      since: '2026-11-01T00:00:00Z',
      offset: 100,
      limit: 50,
    });
    const select = captured.find((entry) => entry.sql.includes('FROM iocs WHERE') && entry.sql.includes('ORDER BY'));
    expect(select).toBeDefined();
    expect(select!.sql).toContain('updated_at >= ?');
    expect(select!.sql).toContain('LIMIT ? OFFSET ?');
    expect(select!.binds).toContain('2026-11-01 00:00:00');
    expect(select!.binds.slice(-2)).toEqual([50, 100]);
    expect(feed.filters.since).toBe('2026-11-01 00:00:00');
    expect(feed.filters.offset).toBe(100);
    // 100 rows requested from offset 100 of a 1-row set → no next page.
    expect(feed.nextOffset).toBeNull();
  });

  test('the route validates since and emits the next cursor', () => {
    const api = read('workers/api/src/index.ts');
    expect(api).toContain("'INVALID_SINCE'");
    expect(api).toContain("'X-Zayron-Next-Cursor'");
    expect(api).toContain('since: sinceParam.value');
    const openapi = read('workers/api/src/openapi.ts');
    expect(openapi).toContain('name: "since"');
    expect(openapi).toContain('name: "offset"');
  });
});

/* ── 3. PoC-in-GitHub + EPSS velocity ─────────────────────────────────────── */

describe('PoC-in-GitHub sync', () => {
  test('the sync owns ONLY the quiet-hours :40 ticks', () => {
    expect(isPocSyncSlot(new Date('2026-11-26T02:40:00Z'))).toBe(true);
    // PHASE 8B added the 04:40 quiet slot (still zero Telegram/IOC collision).
    expect(isPocSyncSlot(new Date('2026-11-26T04:40:00Z'))).toBe(true);
    expect(isPocSyncSlot(new Date('2026-11-26T06:40:00Z'))).toBe(true);
    // Never the IOC ingest (:20 at 00/08/16)…
    expect(isPocSyncSlot(new Date('2026-11-26T00:20:00Z'))).toBe(false);
    expect(isPocSyncSlot(new Date('2026-11-26T08:20:00Z'))).toBe(false);
    expect(isPocSyncSlot(new Date('2026-11-26T16:20:00Z'))).toBe(false);
    // …never a Telegram wire slot…
    for (const slot of TELEGRAM_WIRE_SLOTS) {
      expect(isPocSyncSlot(new Date(`2026-11-26T${slot.utc}:00Z`))).toBe(false);
    }
    // …and never the heavy :00 pulse.
    expect(isPocSyncSlot(new Date('2026-11-26T02:00:00Z'))).toBe(false);
    expect(isPocSyncSlot(new Date('2026-11-26T05:40:00Z'))).toBe(false);
    expect(POC_MAX_SUBREQUESTS).toBeLessThanOrEqual(6);
  });

  test('upstream entries are parsed strictly and nothing is invented', () => {
    expect(pocCveFromFileName('CVE-2026-135713.json')).toBe('CVE-2026-135713');
    expect(pocCveFromFileName('README.md')).toBeNull();
    expect(newestPocFileNames([
      { name: 'CVE-2026-1000.json' },
      { name: 'CVE-2026-9999.json' },
      { name: 'CVE-2026-5000.json' },
    ], 2)).toEqual(['CVE-2026-9999', 'CVE-2026-5000']);
    const entries = parsePocIndex([
      { full_name: 'owner/repo', html_url: 'https://github.com/owner/repo', stargazers_count: 7, created_at: '2026-11-24T11:29:48Z' },
      { full_name: 'evil', html_url: 'http://not-github.example/x' },
      { nope: true },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].stars).toBe(7);
  });

  test('the schema, slot wiring and API projection all exist', () => {
    const sql = read('db/migrations/0037_dynamic_intel_v1.sql');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS cve_pocs');
    expect(sql).toContain('ALTER TABLE vulnerabilities ADD COLUMN previous_epss REAL');
    expect(sql).toContain('ALTER TABLE vulnerabilities ADD COLUMN epss_delta REAL');
    const ingest = read('workers/ingest/src/index.ts');
    expect(ingest).toContain("env.POC_SYNC_ENABLED === 'true' && isPocSyncSlot(new Date())");
    expect(ingest).toContain("url.pathname === '/internal/poc-sync'");
    const api = read('workers/api/src/index.ts');
    expect(api).toContain('FROM cve_pocs WHERE cve_id = ?');
    expect(api).toContain('pocs: pocRows.results || []');
  });

  test('EPSS velocity is computed from the stored score', () => {
    const upsert = read('workers/ingest/src/authoritativeVulnIngest.ts');
    expect(upsert).toContain('previous_epss = CASE');
    expect(upsert).toContain('epss_delta = CASE');
    expect(upsert).toContain('excluded.epss_score - vulnerabilities.epss_score');
  });
});

/* ── 4. Dynamic intelligence surfaces ─────────────────────────────────────── */

describe('detection-as-code', () => {
  test('family queries are deterministic and pre-populated with defanged values', () => {
    const indicators = ['45[.]9[.]168[.]10', 'hxxp://evil[.]example/x', '45[.]9[.]168[.]10'];
    const first = familyDetectionQueries('QakBot', indicators);
    const second = familyDetectionQueries('QakBot', indicators);
    expect(first).toEqual(second);
    expect(first.kql).toContain('45[.]9[.]168[.]10');
    expect(first.kql).toContain('DeviceNetworkEvents');
    expect(first.spl).toContain('index=*');
    expect(first.firewall).toContain('hxxp://evil[.]example/x');
    // Defanged values only — no bare dotted quad can leak into a query.
    expect(/(\d{1,3}\.){3}\d{1,3}/.test(first.kql)).toBe(false);
    expect(first.kql).not.toContain('http://');
    const empty = familyDetectionQueries('Unknown', []);
    expect(empty.kql).toContain('no active indicator');
  });

  test('CVE hunting templates omit generic boilerplate and require verified detection rules', () => {
    expect(cveHuntingQueries('cve-2026-1234', { product: 'Example Server' })).toBeNull();
    const hunt = cveHuntingQueries('cve-2026-1234', {
      product: 'Example Server',
      rules: [
        {
          id: 'sigma-ex-1234',
          title: 'Example Server RCE Attempt',
          source: 'sigma',
          source_url: 'https://github.com/SigmaHQ/sigma/blob/master/rules/ex.yml',
        },
      ],
    });
    expect(hunt).not.toBeNull();
    expect(hunt!.kql).toContain('CVE-2026-1234');
    expect(hunt!.kql).toContain('sigma-ex-1234');
    expect(hunt!.kql).not.toContain('ProcessCommandLine has "CVE-');
    expect(hunt!.spl).toContain('index=notable');
  });

  test('MITRE mapping uses documented IDs only', () => {
    expect(mitreTechniquesForFamily('Cobalt Strike').map((t) => t.id)).toEqual([
      'T1071.001', 'T1055', 'T1059.001', 'T1105',
    ]);
    expect(mitreTechniquesForFamily('sliver').map((t) => t.id)).toContain('T1573');
    expect(mitreTechniquesForFamily('QakBot').map((t) => t.id)).toContain('T1566.001');
    expect(mitreTechniquesForFamily('Emotet').map((t) => t.id)).toContain('T1547.001');
    expect(mitreTechniquesForFamily('NotTracked')).toEqual([]);
    expect(mitreTechniqueUrl('T1071.001')).toBe('https://attack.mitre.org/techniques/T1071/001/');
    expect(mitreTechniqueUrl('T1055')).toBe('https://attack.mitre.org/techniques/T1055/');
    for (const techniques of Object.values({ cobalt: mitreTechniquesForFamily('cobalt-strike') })) {
      for (const technique of techniques) expect(technique.id).toMatch(/^T\d{4}(\.\d{3})?$/);
    }
  });

  test('pivots only ever point at vetted lookup services', () => {
    for (const pivot of threatPivots('45[.]9[.]168[.]10')) {
      expect(isVettedPivotUrl(pivot.url)).toBe(true);
      expect(pivot.url).not.toMatch(/^https:\/\/(\d{1,3}\.){3}\d{1,3}/);
    }
    expect(isVettedPivotUrl('https://evil.example/search?q=1')).toBe(false);
    expect(isVettedPivotUrl('javascript:alert(1)')).toBe(false);
  });

  test('risk adjuster shifts the band deterministically', () => {
    expect(adjustedRisk('P2', { internetFacing: true, controls: 'none', criticality: 'standard' }))
      .toMatchObject({ base: 'P2', priority: 'P0', sla: '24h' });
    expect(adjustedRisk('P1', { internetFacing: false, controls: 'strict', criticality: 'standard' }))
      .toMatchObject({ priority: 'P3', sla: '30d' });
    expect(adjustedRisk('CRITICAL', { internetFacing: false, controls: 'none', criticality: 'standard' }))
      .toMatchObject({ base: 'P0', priority: 'P0' });
    expect(adjustedRisk('LOW', { internetFacing: false, controls: 'none', criticality: 'standard' }))
      .toMatchObject({ priority: 'P3' });
  });
});

describe('zero raw malicious anchors', () => {
  const surfaces = [
    'apps/web/app/components/ThreatPivots.tsx',
    'apps/web/app/components/CodeTabs.tsx',
    'apps/web/app/intelligence/malware/families/[slug]/page.tsx',
    'apps/web/app/components/VulnerabilityDetail.tsx',
  ];

  test('no anchor is derived from an indicator field', () => {
    for (const file of surfaces) {
      const source = read(file);
      expect(source).not.toMatch(/href=\{[^}]*defanged/);
      expect(source).not.toMatch(/href=\{[^}]*normalized_value/);
    }
    // No NEW surface builds a literal remote URL as an anchor destination;
    // the only remote anchors are the vetted pivot arrays and validated GitHub
    // PoC URLs.
    for (const file of ['apps/web/app/components/ThreatPivots.tsx', 'apps/web/app/components/CodeTabs.tsx']) {
      expect(read(file)).not.toMatch(/href=\{`http/);
    }
  });

  test('pivot anchors carry the security rel and a vetted host', () => {
    const source = read('apps/web/app/components/ThreatPivots.tsx');
    expect(source).toContain('rel="noopener noreferrer nofollow"');
    expect(source).toContain('pivot.url');
    // The indicator is never the anchor text.
    expect(source).not.toContain('{value}</a>');
  });

  test('PoC links are github.com only', () => {
    const source = read('apps/web/app/components/VulnerabilityDetail.tsx');
    expect(source).toContain('^https:\\/\\/github\\.com\\/');
    expect(source).toContain('rel="noopener noreferrer nofollow"');
  });
});
