/**
 * Phase 4A — SELECTIVE UNFREEZE.
 *
 * `LEGACY_FREEZE="true"` must keep blocking every legacy path while
 * `AUTHORITATIVE_CVE_CRON_ENABLED="true"` opens exactly one: the bounded
 * NVD + CISA KEV + FIRST EPSS pulse.
 */
import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUTHORITATIVE_CRON_FLAG,
  authoritativeCronEnabled,
  runAuthoritativePulse,
} from '../../workers/ingest/src/authoritativePulse';

const repoRoot = path.resolve(import.meta.dir, '../..');
const ingestSource = fs.readFileSync(path.join(repoRoot, 'workers/ingest/src/index.ts'), 'utf8');
const ingestWrangler = fs.readFileSync(path.join(repoRoot, 'workers/ingest/wrangler.toml'), 'utf8');

function fakeDb(rows: any[] = []) {
  const statements: string[] = [];
  const db = {
    prepare(sql: string) {
      statements.push(sql);
      const api = {
        bind: () => api,
        run: async () => ({ success: true }),
        all: async () => ({ results: rows }),
        first: async () => null,
      };
      return api;
    },
  };
  return { db, statements };
}

/** A stored authoritative row the strategic layer considers inside the pulse. */
const eligibleStrategicRow = {
  cve_id: 'CVE-2026-91001',
  description: 'A heap overflow in the parser allows remote code execution.',
  severity: 'CRITICAL',
  cvss_score: 9.1,
  cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  epss_score: 0.4,
  epss_percentile: 0.96,
  is_exploited_in_wild: 0,
  affected_vendor: 'Acme',
  affected_product: 'Gateway',
  kev_due_date: null,
  affected_versions_json: JSON.stringify(['< 4.2.9']),
  fixed_versions_json: JSON.stringify(['4.2.9']),
};

const nvdPayload = {
  vulnerabilities: [
    {
      cve: {
        id: 'CVE-2026-91001',
        descriptions: [{ lang: 'en', value: 'A heap overflow in the parser allows remote code execution.' }],
        metrics: { cvssMetricV31: [{ cvssData: { baseScore: 9.1, vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' } }] },
        configurations: [{ nodes: [{ cpeMatch: [{ criteria: 'cpe:2.3:a:acme:gateway:4.2.0:*:*:*:*:*:*:*', versionEndExcluding: '4.2.9' }] }] }],
        references: [],
        published: new Date().toISOString(),
      },
    },
  ],
};

describe('1 — the flag is explicit and fails closed', () => {
  it('is enabled ONLY by the exact string "true"', () => {
    expect(AUTHORITATIVE_CRON_FLAG).toBe('AUTHORITATIVE_CVE_CRON_ENABLED');
    expect(authoritativeCronEnabled({ AUTHORITATIVE_CVE_CRON_ENABLED: 'true' })).toBe(true);
    expect(authoritativeCronEnabled({ AUTHORITATIVE_CVE_CRON_ENABLED: 'TRUE' })).toBe(false);
    expect(authoritativeCronEnabled({ AUTHORITATIVE_CVE_CRON_ENABLED: '1' })).toBe(false);
    expect(authoritativeCronEnabled({ AUTHORITATIVE_CVE_CRON_ENABLED: 'false' })).toBe(false);
    expect(authoritativeCronEnabled({})).toBe(false);
  });

  it('production wrangler keeps the freeze AND enables only the authoritative pulse', () => {
    const productionBlock = ingestWrangler.split('[vars]')[1].split('[env.preview]')[0];
    expect(productionBlock).toContain('LEGACY_FREEZE = "true"');
    expect(productionBlock).toContain('AUTHORITATIVE_CVE_CRON_ENABLED = "true"');
  });
});

describe('2 — the freeze branch runs ONLY the authoritative pulse', () => {
  it('returns before every legacy path in scheduled()', () => {
    const scheduled = ingestSource.slice(ingestSource.indexOf('async scheduled('));
    const freezeBranch = scheduled.indexOf("if (env.LEGACY_FREEZE === 'true')");
    const pulseCall = scheduled.indexOf('runAuthoritativePulse');
    const legacyRss = scheduled.indexOf('cybersecurity-advisories/all.xml');
    const legacyKevEnqueue = scheduled.indexOf("sourceId: 'cisa-kev'");
    const legacyMsrc = scheduled.indexOf('api.msrc.microsoft.com');

    expect(freezeBranch).toBeGreaterThanOrEqual(0);
    expect(pulseCall).toBeGreaterThan(freezeBranch);
    expect(legacyRss).toBeGreaterThan(pulseCall);
    expect(legacyKevEnqueue).toBeGreaterThan(pulseCall);
    expect(legacyMsrc).toBeGreaterThan(pulseCall);

    // The freeze branch must return before falling through to the legacy body.
    const branch = scheduled.slice(freezeBranch, pulseCall);
    const returnAfterPulse = scheduled.slice(pulseCall, scheduled.indexOf('const smokeTraceId'));
    expect(branch).toContain('AUTHORITATIVE_CVE_PULSE_DISABLED');
    expect(returnAfterPulse).toContain('return;');
    // No outbound publication, no collector call, no Telegram read in the branch.
    expect(branch).not.toContain('telegram');
    expect(branch).not.toContain('PUBLISH_QUEUE');
  });

  it('the operator trigger remains preview-only', () => {
    expect(ingestSource).toContain("if (this.env.ENVIRONMENT === 'production')");
    expect(ingestSource).toContain("'/internal/strategic-cve-analysis'");
  });
});

describe('3 — one bounded pulse', () => {
  it('ingests authoritative facts and reports structured counters', async () => {
    const { db, statements } = fakeDb([eligibleStrategicRow]);
    const fetchFn = (async (input: any) => {
      const url = String(input);
      if (url.includes('services.nvd.nist.gov')) {
        return new Response(JSON.stringify(nvdPayload), { status: 200 });
      }
      return new Response('unavailable', { status: 503 });
    }) as unknown as typeof fetch;

    const pulse = await runAuthoritativePulse(
      { DB: db, ENVIRONMENT: 'production' },
      { trigger: '0 */4 * * *', fetchFn, strategicLimit: 1 },
    );

    expect(pulse.trigger).toBe('0 */4 * * *');
    expect(pulse.fetched).toBe(1);
    expect(pulse.upserted).toBe(1);
    expect(pulse.errors.join(' ')).toContain('KEV_UNAVAILABLE');
    // No credential in production → the strategic layer skips cleanly.
    expect(pulse.strategic?.skipped.MISSING_CREDENTIAL).toBe(1);
    expect(pulse.strategic?.generated).toBe(0);
    // Only authoritative writes were attempted.
    expect(statements.some((sql) => sql.includes('INSERT INTO vulnerabilities') || sql.includes('INTO vulnerabilities'))).toBe(true);
    expect(statements.some((sql) => /intelligence_events|source_messages|articles/.test(sql))).toBe(false);
  });

  it('a total NVD failure is reported, never thrown', async () => {
    const { db } = fakeDb();
    const fetchFn = (async () => new Response('down', { status: 503 })) as unknown as typeof fetch;
    const pulse = await runAuthoritativePulse({ DB: db, ENVIRONMENT: 'production' }, { fetchFn, strategicLimit: 1 });
    expect(pulse.fetched).toBe(0);
    expect(pulse.errors.join(' ')).toContain('INGEST_FAILED');
    expect(pulse.duration_ms).toBeGreaterThanOrEqual(0);
  });
});
