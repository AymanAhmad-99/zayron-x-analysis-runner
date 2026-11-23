/**
 * ZAYRON-X — ISOLATED PREVIEW INTELLIGENCE SUPPLY (isolation invariants)
 *
 * These tests exercise the ACTUAL configuration resolution and execution
 * boundaries of the Preview intelligence supply path — not hard-coded fixture
 * names. Where a test could be vacuous, the same test also proves the
 * production-side counterexample exists (e.g. the production database identity
 * really is present in the production half of the real `wrangler.toml`).
 *
 * All identifiers are SYNTHETIC (CVE-2099-00001, synthetic payload text). No
 * live upstream fetch, no remote D1, no malware sample execution, no model call.
 *
 * Covered invariants:
 *   1. the Preview API reads only the approved Preview database
 *   2. the Preview ingestion path cannot resolve to the production database
 *   3. missing / malformed / conflicting database ids fail closed
 *   4. Preview ingestion never falls back to production report contents
 *   5. repeated ingestion stays bounded and creates no duplicate canonical reports
 *   6. the malware read gate keeps existing reports and explicit failure states
 *   7. synthetic test data cannot be mistaken for a real published report
 *   8. production configuration and deployment behaviour are unchanged
 */
import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  parseToml,
  evaluateApiPreviewTarget,
  API_PREVIEW_DB_ID,
  API_PREVIEW_DB_NAME,
  API_PREVIEW_SUPPLY_IDENTITY_VAR,
  API_PRODUCTION_DB_ID,
  API_PRODUCTION_DB_NAME,
} from '../../workers/api/scripts/preview-target-guard.mjs';
import {
  assertPreviewVulnerabilityDatabase,
  parsePreviewDatabaseIdentity,
  persistNormalizedPreview,
  previewSupplyIdentityFromConfigVars,
  PREVIEW_SUPPLY_DATABASE_IDENTITY,
  PREVIEW_VULNERABILITY_DATABASE_ID,
  PREVIEW_VULNERABILITY_DATABASE_NAME,
  PRODUCTION_VULNERABILITY_DATABASE_ID,
  type PreviewD1Executor,
} from '../../packages/intelligence/src/sources/persistence';
import {
  assertApprovedPreviewProviderRequest,
  fetchWithRetry,
  orchestrateVulnerabilitySources,
  previewProviderRequests,
  previewVulnerabilityDatabaseIdentityFromConfig,
  PREVIEW_MAX_PROVIDER_REQUESTS,
} from '../../packages/intelligence/src/sources/orchestration';
import {
  loadServableMalwareReport,
  loadServableMalwareReports,
} from '../../workers/api/src/malwareReportReadGate';

const ROOT = path.resolve(import.meta.dir, '..', '..');
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

const WRANGLER = read('workers/api/wrangler.toml');
const API_SOURCE = read('workers/api/src/index.ts');
const ORCHESTRATION_SOURCE = read('packages/intelligence/src/sources/orchestration.ts');
const PERSISTENCE_SOURCE = read('packages/intelligence/src/sources/persistence.ts');

const APPROVED_PREVIEW_IDENTITY = {
  database_name: PREVIEW_VULNERABILITY_DATABASE_NAME,
  database_id: PREVIEW_VULNERABILITY_DATABASE_ID,
};
const PRODUCTION_VULNERABILITY_DATABASE_NAME = API_PRODUCTION_DB_NAME;
const PRODUCTION_IDENTITY = {
  database_name: PRODUCTION_VULNERABILITY_DATABASE_NAME,
  database_id: PRODUCTION_VULNERABILITY_DATABASE_ID,
};

/** The pre-edit byte hash of workers/api/wrangler.toml (captured before this phase). */
const WRANGLER_PRE_EDIT_SHA256 = '905f8afc714ff4043805629f818332d0aa9874b73d4c1593671556383fecaee6';
/** The production half of wrangler.toml, unchanged across this phase. */
const WRANGLER_PRODUCTION_HALF_SHA256 = 'fe15bf8e3a11ed3b4dcfa3f446647eb14743d31f31bc94cffcb88f6e544ceef7';
/** The exact block this phase added to `[env.preview.vars]`. */
const SUPPLY_IDENTITY_BLOCK = [
  '',
  '',
  '# Effective Preview INTELLIGENCE-SUPPLY destination, declared as configuration',
  '# ("<database_name>:<database_id>") rather than inferred from the environment',
  '# name. The Preview supply path resolves this value at runtime and fails closed',
  '# on missing/malformed/conflicting input, and',
  '# `scripts/preview-target-guard.mjs` refuses any deploy where it disagrees with',
  '# the `[env.preview].DB` binding or names the production database.',
  'PREVIEW_SUPPLY_DB_IDENTITY = "zayron-x-preview-db:34962f8f-abd1-4b0b-8bd7-b4eab59bd902"',
].join('\r\n');

const previewHalfOf = (toml: string) => toml.slice(toml.indexOf('[env.preview]'));
const productionHalfOf = (toml: string) => toml.slice(0, toml.indexOf('[env.preview]'));

const expectCode = (fn: () => unknown, code: string) => {
  let message = '';
  try {
    fn();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe(code);
};

// ── Synthetic upstream fixtures (never live, always obviously synthetic) ───────
const SYNTHETIC_CVE = 'CVE-2099-00001';
const SYNTHETIC_KEV = {
  vulnerabilities: [
    {
      cveID: SYNTHETIC_CVE,
      product: 'SyntheticFixtureProduct',
      shortDescription: 'SYNTHETIC FIXTURE — not a real vulnerability record',
      requiredAction: 'SYNTHETIC_FIXTURE_REQUIRED_ACTION',
      dateAdded: '2099-01-01',
      dueDate: '2099-01-21',
    },
  ],
};
const SYNTHETIC_NVD = {
  vulnerabilities: [
    {
      cve: {
        id: SYNTHETIC_CVE,
        descriptions: [{ value: 'SYNTHETIC FIXTURE description (NVD shape)' }],
        metrics: { cvssMetricV31: [{ cvssData: { baseScore: 9.8, vectorString: 'CVSS:3.1/AV:N/AC:L/SYNTHETIC' } }] },
        weaknesses: [{ description: [{ value: 'CWE-0000' }] }],
        references: [{ url: 'https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=' + SYNTHETIC_CVE }],
      },
    },
  ],
};
const SYNTHETIC_EPSS = { data: [{ cve: SYNTHETIC_CVE, epss: '0.51234', percentile: '0.98123', date: '2099-01-02' }] };

const payloadForUrl = (url: string): unknown => {
  const host = new URL(url).hostname;
  if (host === 'www.cisa.gov') return SYNTHETIC_KEV;
  if (host === 'services.nvd.nist.gov') return SYNTHETIC_NVD;
  if (host === 'api.first.org') return SYNTHETIC_EPSS;
  throw new Error(`UNEXPECTED_UPSTREAM_HOST:${host}`);
};

/** Offline fetcher. Counts calls so tests can prove what was (not) attempted. */
function stubFetcher(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const override = Object.entries(overrides).find(([host]) => new URL(url).hostname === host)?.[1];
    return new Response(JSON.stringify(override ?? payloadForUrl(url)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

// ── Minimal in-memory D1 that reproduces the SQL contract being tested ────────
function fakePreviewStore() {
  const sourceRecords = new Map<string, { contentHash: string; fetchedAt: string }>();
  const canonical = new Map<string, string>();
  const readModel = new Map<string, any>();
  const writes: string[] = [];
  let sourceRecordStatements = 0;

  const db: PreviewD1Executor = {
    prepare(sql: string) {
      const flat = sql.replace(/\s+/g, ' ').trim();
      if (/INSERT/i.test(flat)) writes.push(flat);
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (flat.includes('INSERT INTO vulnerability_source_records')) {
                sourceRecordStatements += 1;
                const [sourceId, sourceRecordId, , , contentHash, fetchedAt] = args as string[];
                const key = `${sourceId}:${sourceRecordId}`;
                const prior = sourceRecords.get(key);
                // Mirrors `... DO UPDATE ... WHERE content_hash <> excluded.content_hash`.
                if (!prior || prior.contentHash !== contentHash) sourceRecords.set(key, { contentHash, fetchedAt });
                return {};
              }
              if (flat.includes('INSERT INTO canonical_vulnerabilities')) {
                const [id, , , , , , canonicalJson] = args as string[];
                canonical.set(id, canonicalJson);
                return {};
              }
              if (flat.includes('INSERT INTO vulnerabilities')) {
                const [id, cve, title, description, severity, cvssScore, cvssVector, exploited, publishedAt, createdAt, updatedAt] =
                  args as [string, string, string, string, string, number | null, string | null, number, string, string, string];
                const prior = readModel.get(id);
                readModel.set(id, prior
                  ? {
                      ...prior,
                      cveId: cve ?? prior.cveId,
                      title,
                      description,
                      severity: prior.severity === 'CRITICAL' || severity === 'CRITICAL' ? 'CRITICAL' : severity,
                      cvssScore: cvssScore ?? prior.cvssScore,
                      cvssVector: cvssVector ?? prior.cvssVector,
                      exploited: Math.max(prior.exploited, exploited),
                      publishedAt: prior.publishedAt ?? publishedAt,
                      updatedAt,
                      writes: prior.writes + 1,
                    }
                  : { id, cveId: cve, title, description, severity, cvssScore, cvssVector, exploited, publishedAt, createdAt, updatedAt, writes: 1 });
                return {};
              }
              throw new Error(`UNEXPECTED_SQL:${flat}`);
            },
            async first<T>() {
              if (flat.includes('SELECT canonical_json FROM canonical_vulnerabilities')) {
                const stored = canonical.get(String(args[0]));
                return (stored ? { canonical_json: stored } : null) as T | null;
              }
              throw new Error(`UNEXPECTED_SQL:${flat}`);
            },
          };
        },
      } as any;
    },
  };

  return { db, sourceRecords, canonical, readModel, writes, get sourceRecordStatements() { return sourceRecordStatements; } };
}

// ═══ 1. The Preview API reads only the approved Preview database ══════════════
describe('preview isolation 1 — approved preview read store only', () => {
  test('the real [env.preview] passes the deploy guard and binds the approved databases', () => {
    const verdict = evaluateApiPreviewTarget(parseToml(WRANGLER));
    expect(verdict.ok).toBe(true);
  });

  test('the preview half carries only approved preview identities, never production', () => {
    const preview = previewHalfOf(WRANGLER);
    expect(preview).toContain(`database_name = "${API_PREVIEW_DB_NAME}"`);
    expect(preview).toContain(`database_id = "${API_PREVIEW_DB_ID}"`);
    expect(preview).not.toContain(API_PRODUCTION_DB_ID);
    expect(preview).not.toContain(API_PRODUCTION_DB_NAME);
  });

  test('the production identities really do exist in the production half (non-vacuous)', () => {
    const production = productionHalfOf(WRANGLER);
    expect(production).toContain(API_PRODUCTION_DB_ID);
    expect(production).toContain(`database_name = "${API_PRODUCTION_DB_NAME}"`);
    // The canonical malware-report store (ZX_DB) is production-bound there.
    expect(production.split('binding = "ZX_DB"').length - 1).toBe(1);
  });
});

// ═══ 2. Ingestion cannot resolve to the production database ═══════════════════
describe('preview isolation 2 — ingestion cannot reach production', () => {
  test('a production identity is refused by the shared guard', () => {
    expectCode(() => assertPreviewVulnerabilityDatabase(PRODUCTION_IDENTITY), 'PREVIEW_PRODUCTION_DATABASE_FORBIDDEN');
    expectCode(() => parsePreviewDatabaseIdentity(`zayron-x-db:${PRODUCTION_VULNERABILITY_DATABASE_ID}`), 'PREVIEW_PRODUCTION_DATABASE_FORBIDDEN');
  });

  test('the effective-configuration resolver refuses a preview env bound to production', () => {
    const forged = WRANGLER.replace(
      `[[env.preview.d1_databases]]\r\nbinding = "DB"\r\ndatabase_name = "${API_PREVIEW_DB_NAME}"\r\ndatabase_id = "${API_PREVIEW_DB_ID}"`,
      `[[env.preview.d1_databases]]\r\nbinding = "DB"\r\ndatabase_name = "${API_PRODUCTION_DB_NAME}"\r\ndatabase_id = "${API_PRODUCTION_DB_ID}"`,
    );
    expect(forged).not.toBe(WRANGLER);
    expectCode(() => previewVulnerabilityDatabaseIdentityFromConfig(forged), 'PREVIEW_PRODUCTION_DATABASE_FORBIDDEN');
    const verdict = evaluateApiPreviewTarget(parseToml(forged));
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('PRODUCTION_D1_BINDING');
  });

  test('the runtime identity var cannot name production', () => {
    expectCode(
      () => previewSupplyIdentityFromConfigVars({ [API_PREVIEW_SUPPLY_IDENTITY_VAR]: `zayron-x-db:${PRODUCTION_VULNERABILITY_DATABASE_ID}` }),
      'PREVIEW_PRODUCTION_DATABASE_FORBIDDEN',
    );
  });

  test('the real preview config resolves to exactly the approved pair', () => {
    const resolved = previewVulnerabilityDatabaseIdentityFromConfig(WRANGLER);
    expect(resolved.database_id).toBe(PREVIEW_VULNERABILITY_DATABASE_ID);
    expect(resolved.database_name).toBe(PREVIEW_VULNERABILITY_DATABASE_NAME);
    expect(`${resolved.database_name}:${resolved.database_id}`).toBe(PREVIEW_SUPPLY_DATABASE_IDENTITY);
  });
});

// ═══ 3. Missing / malformed / conflicting database ids fail closed ════════════
describe('preview isolation 3 — identity failure modes fail closed', () => {
  test('missing identity', () => {
    expectCode(() => assertPreviewVulnerabilityDatabase(undefined), 'PREVIEW_DB_IDENTITY_MISSING');
    expectCode(() => assertPreviewVulnerabilityDatabase({ database_name: API_PREVIEW_DB_NAME }), 'PREVIEW_DB_IDENTITY_MISSING');
    expectCode(() => previewSupplyIdentityFromConfigVars({}), 'PREVIEW_DB_IDENTITY_MISSING');
    expectCode(() => parsePreviewDatabaseIdentity(''), 'PREVIEW_DB_IDENTITY_MISSING');
  });

  test('malformed identity', () => {
    expectCode(() => assertPreviewVulnerabilityDatabase({ database_name: '', database_id: API_PREVIEW_DB_ID }), 'PREVIEW_DB_IDENTITY_MALFORMED');
    expectCode(() => parsePreviewDatabaseIdentity('not-an-identity'), 'PREVIEW_DB_IDENTITY_MALFORMED');
    expectCode(() => parsePreviewDatabaseIdentity('zayron-x-preview-db:'), 'PREVIEW_DB_IDENTITY_MALFORMED');
  });

  test('conflicting identity (name says preview, id says production)', () => {
    expectCode(
      () => assertPreviewVulnerabilityDatabase({ database_name: API_PREVIEW_DB_NAME, database_id: API_PRODUCTION_DB_ID }),
      'PREVIEW_DATABASE_IDENTITY_CONFLICT',
    );
    expectCode(
      () => parsePreviewDatabaseIdentity(`${API_PREVIEW_DB_NAME}:${PRODUCTION_VULNERABILITY_DATABASE_ID}`),
      'PREVIEW_DATABASE_IDENTITY_CONFLICT',
    );
  });

  test('coherent but unapproved identity', () => {
    expectCode(
      () => assertPreviewVulnerabilityDatabase({ database_name: 'some-other-db', database_id: '00000000-0000-0000-0000-000000000000' }),
      'PREVIEW_DATABASE_IDENTITY_MISMATCH',
    );
  });

  test('effective configuration without a preview environment', () => {
    expectCode(() => previewVulnerabilityDatabaseIdentityFromConfig('name = "x"\n[vars]\nENVIRONMENT = "production"\n'), 'PREVIEW_ENVIRONMENT_MISSING');
  });

  test('ambiguous DB bindings in the preview environment', () => {
    const duplicated = WRANGLER.replace(
      '[env.preview.vars]',
      `[[env.preview.d1_databases]]\r\nbinding = "DB"\r\ndatabase_name = "${API_PREVIEW_DB_NAME}"\r\ndatabase_id = "${API_PREVIEW_DB_ID}"\r\n\r\n[env.preview.vars]`,
    );
    expectCode(() => previewVulnerabilityDatabaseIdentityFromConfig(duplicated), 'PREVIEW_DB_BINDING_AMBIGUOUS');
  });

  test('the deploy guard rejects a malformed or unapproved supply identity', () => {
    const malformed = parseToml(WRANGLER.replace(
      'PREVIEW_SUPPLY_DB_IDENTITY = "zayron-x-preview-db:34962f8f-abd1-4b0b-8bd7-b4eab59bd902"',
      'PREVIEW_SUPPLY_DB_IDENTITY = "not-an-identity"',
    ));
    expect(evaluateApiPreviewTarget(malformed).code).toBe('PREVIEW_SUPPLY_IDENTITY_MALFORMED');

    const unapproved = parseToml(WRANGLER.replace(
      'PREVIEW_SUPPLY_DB_IDENTITY = "zayron-x-preview-db:34962f8f-abd1-4b0b-8bd7-b4eab59bd902"',
      'PREVIEW_SUPPLY_DB_IDENTITY = "some-other-db:00000000-0000-0000-0000-000000000000"',
    ));
    expect(evaluateApiPreviewTarget(unapproved).code).toBe('PREVIEW_SUPPLY_IDENTITY_MISMATCH');
  });

  test('the deploy guard rejects a supply identity naming production', () => {
    const production = parseToml(WRANGLER.replace(
      'PREVIEW_SUPPLY_DB_IDENTITY = "zayron-x-preview-db:34962f8f-abd1-4b0b-8bd7-b4eab59bd902"',
      `PREVIEW_SUPPLY_DB_IDENTITY = "${API_PRODUCTION_DB_NAME}:${API_PRODUCTION_DB_ID}"`,
    ));
    const verdict = evaluateApiPreviewTarget(production);
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('PREVIEW_SUPPLY_IDENTITY_PRODUCTION');
  });

  test('a supply identity that disagrees with the DB binding is refused at runtime', () => {
    const conflicted = WRANGLER.replace(
      `[[env.preview.d1_databases]]\r\nbinding = "DB"\r\ndatabase_name = "${API_PREVIEW_DB_NAME}"\r\ndatabase_id = "${API_PREVIEW_DB_ID}"`,
      `[[env.preview.d1_databases]]\r\nbinding = "DB"\r\ndatabase_name = "${API_PRODUCTION_DB_NAME}"\r\ndatabase_id = "${API_PRODUCTION_DB_ID}"`,
    );
    expect(() => previewVulnerabilityDatabaseIdentityFromConfig(conflicted)).toThrow();
  });
});

// ═══ 4. No production report fallback anywhere in the ingestion path ══════════
describe('preview isolation 4 — no production fallback', () => {
  test('a production identity aborts BEFORE any upstream fetch', async () => {
    const { fetcher, calls } = stubFetcher();
    await expect(
      orchestrateVulnerabilitySources(previewProviderRequests(SYNTHETIC_CVE), { fetcher, db: fakePreviewStore().db as any, databaseIdentity: PRODUCTION_IDENTITY }),
    ).rejects.toThrow('PREVIEW_PRODUCTION_DATABASE_FORBIDDEN');
    expect(calls).toHaveLength(0);
  });

  test('a missing binding or identity aborts before any upstream fetch', async () => {
    const { fetcher, calls } = stubFetcher();
    await expect(
      orchestrateVulnerabilitySources(previewProviderRequests(SYNTHETIC_CVE), { fetcher, databaseIdentity: APPROVED_PREVIEW_IDENTITY }),
    ).rejects.toThrow('PREVIEW_DATABASE_BINDING_REQUIRED');
    await expect(
      orchestrateVulnerabilitySources(previewProviderRequests(SYNTHETIC_CVE), { fetcher, db: fakePreviewStore().db }),
    ).rejects.toThrow('PREVIEW_DATABASE_IDENTITY_REQUIRED');
    expect(calls).toHaveLength(0);
  });

  test('persistence itself re-asserts the identity (a caller cannot bypass the guard)', async () => {
    const store = fakePreviewStore();
    const requests = previewProviderRequests(SYNTHETIC_CVE);
    const { fetcher } = stubFetcher();
    const parsed = requests[1].parser(SYNTHETIC_NVD, requests[1].url).normalized!;
    await expect(persistNormalizedPreview(store.db, PRODUCTION_IDENTITY, parsed)).rejects.toThrow('PREVIEW_PRODUCTION_DATABASE_FORBIDDEN');
    expect(store.canonical.size).toBe(0);
    expect(store.readModel.size).toBe(0);
  });

  test('only approved upstream hosts may be contacted', () => {
    expectCode(
      () => assertApprovedPreviewProviderRequest({ provider: 'nvd', url: 'https://zayron-x-api.aabusabih.workers.dev/api/v1/vulnerabilities?limit=1', parser: (() => ({})) as any }),
      'PREVIEW_PROVIDER_URL_NOT_APPROVED',
    );
    for (const request of previewProviderRequests(SYNTHETIC_CVE)) {
      expect(() => assertApprovedPreviewProviderRequest(request)).not.toThrow();
    }
  });

  test('the ingestion source contains no production store or report-body reference', () => {
    // The fetch/persist path never mentions the production database at all.
    expect(ORCHESTRATION_SOURCE).not.toContain(API_PRODUCTION_DB_ID);
    // The persistence module knows the production id EXACTLY ONCE, as the
    // refusal input constant. It is never a destination, a target, or a fallback.
    expect(PERSISTENCE_SOURCE.split(API_PRODUCTION_DB_ID)).toHaveLength(2);
    expect(PERSISTENCE_SOURCE).toContain(`export const PRODUCTION_VULNERABILITY_DATABASE_ID = '${API_PRODUCTION_DB_ID}';`);
    expect(PERSISTENCE_SOURCE).toContain("=== PRODUCTION_VULNERABILITY_DATABASE_ID");
    for (const source of [ORCHESTRATION_SOURCE, PERSISTENCE_SOURCE]) {
      expect(source).not.toContain('intelligence_reports');
      expect(source).not.toContain('report_json');
      expect(source).not.toContain('malware_reports');
      // No production-hosted report/report-body endpoint is ever contacted.
      expect(source).not.toContain('workers.dev');
    }
  });
});

// ═══ 5. Repeated ingestion stays bounded and duplicate-free ═══════════════════
describe('preview isolation 5 — bounded, idempotent ingestion', () => {
  test('two identical runs produce one canonical row, one read-model row, keyed provenance', async () => {
    const store = fakePreviewStore();
    const requests = previewProviderRequests(SYNTHETIC_CVE);

    const first = stubFetcher();
    const runOne = await orchestrateVulnerabilitySources(requests, { fetcher: first.fetcher, db: store.db, databaseIdentity: APPROVED_PREVIEW_IDENTITY });
    // Three providers observed, ONE canonical identity: the later two are
    // duplicates, never additional canonical reports.
    expect(runOne.records).toHaveLength(1);
    expect(runOne.metrics.filter((metric) => metric.duplicates === 1)).toHaveLength(2);
    expect(store.canonical.size).toBe(1);
    expect(store.readModel.size).toBe(1);
    expect(store.sourceRecords.size).toBe(3);

    const second = stubFetcher();
    const runTwo = await orchestrateVulnerabilitySources(requests, { fetcher: second.fetcher, db: store.db, databaseIdentity: APPROVED_PREVIEW_IDENTITY });
    // Second run resolves the SAME canonical identity: duplicates are counted,
    // never created.
    expect(store.canonical.size).toBe(1);
    expect(store.readModel.size).toBe(1);
    expect(store.sourceRecords.size).toBe(3);
    expect(runTwo.metrics.filter((metric) => metric.duplicates === 1)).toHaveLength(2);
    expect(runTwo.metrics.every((metric) => metric.canonicalEntitiesCreated === 0)).toBe(true);
    expect(runTwo.metrics.every((metric) => metric.canonicalEntitiesUpdated === 1)).toBe(true);

    const row = [...store.readModel.values()][0];
    expect(row.id).toBe('vuln_cve_2099_00001');
    // Three provider writes in each of the two runs, all UPDATING the one row.
    expect(row.writes).toBe(6);
    expect(row.exploited).toBe(1);
    expect(row.severity).toBe('CRITICAL');
  });

  test('every write is keyed (ON CONFLICT) so re-running cannot insert duplicates', () => {
    const store = fakePreviewStore();
    expect(store.writes.length).toBe(0);
    return orchestrateVulnerabilitySources(previewProviderRequests(SYNTHETIC_CVE), {
      fetcher: stubFetcher().fetcher,
      db: store.db,
      databaseIdentity: APPROVED_PREVIEW_IDENTITY,
    }).then(() => {
      expect(store.writes.length).toBeGreaterThan(0);
      for (const sql of store.writes) expect(sql).toContain('ON CONFLICT');
      // Provenance is rewritten only for changed content, and never without a key.
      expect(store.sourceRecordStatements).toBeGreaterThan(0);
    });
  });

  test('the request/discovery bounds are enforced', async () => {
    const store = fakePreviewStore();
    const requests = previewProviderRequests(SYNTHETIC_CVE);
    await expect(
      orchestrateVulnerabilitySources(requests, { fetcher: stubFetcher().fetcher, db: store.db, databaseIdentity: APPROVED_PREVIEW_IDENTITY, maxRequests: PREVIEW_MAX_PROVIDER_REQUESTS + 1 }),
    ).rejects.toThrow('PREVIEW_REQUEST_LIMIT_INVALID');
    await expect(
      orchestrateVulnerabilitySources([...requests, requests[0]], { fetcher: stubFetcher().fetcher, db: store.db, databaseIdentity: APPROVED_PREVIEW_IDENTITY }),
    ).rejects.toThrow('PREVIEW_REQUEST_LIMIT_EXCEEDED');

    const flood = stubFetcher({ 'www.cisa.gov': { vulnerabilities: Array.from({ length: 501 }, (_, i) => ({ cveID: `CVE-2099-9${String(i).padStart(4, '0')}` })) } });
    const result = await orchestrateVulnerabilitySources([requests[0]], { fetcher: flood.fetcher, db: store.db, databaseIdentity: APPROVED_PREVIEW_IDENTITY });
    expect(result.metrics[0].error).toBe('PREVIEW_DISCOVERY_LIMIT_EXCEEDED');
    expect(store.canonical.size).toBe(0);
  });

  test('retries are bounded and an invalid identifier is refused', async () => {
    let attempts = 0;
    const alwaysFails = (async () => { attempts += 1; throw new Error('SYNTHETIC_NETWORK_FAILURE'); }) as unknown as typeof fetch;
    await expect(fetchWithRetry(alwaysFails, 'https://www.cisa.gov/x', 2, 0, 10)).rejects.toThrow('SYNTHETIC_NETWORK_FAILURE');
    expect(attempts).toBe(2);
    expectCode(() => previewProviderRequests('CVE-2099-1'), 'INVALID_CVE_ID');
  });
});

// ═══ 6. The malware read gate keeps reports and explicit failure states ═══════
describe('preview isolation 6 — malware read gate failure states', () => {
  const storeWith = (rows: any[]) => ({
    prepare: () => ({
      all: async () => ({ results: rows }),
      bind: (...args: unknown[]) => ({
        first: async () => rows.find((row) => row.id === args[0]) ?? null,
      }),
    }),
  });

  const rows = [
    { id: 'mir_synthetic_unparsable', sha256: null, report_json: '{not json', source: 'SYNTHETIC', published_at: null },
    { id: 'mir_synthetic_empty', sha256: null, report_json: '{}', source: 'SYNTHETIC', published_at: null },
  ];

  test('invalid rows are excluded from the list, with reasons preserved', async () => {
    const gate = await loadServableMalwareReports(storeWith(rows) as any);
    expect(gate.rows).toHaveLength(0);
    expect(gate.excluded).toBe(2);
    expect(gate.invalid_report_ids).toEqual(['mir_synthetic_unparsable', 'mir_synthetic_empty']);
  });

  test('an invalid row yields explicit rejections rather than a clean verdict', async () => {
    const gate = await loadServableMalwareReport(storeWith(rows) as any, 'mir_synthetic_unparsable');
    expect(gate.row).toBeNull();
    expect(gate.rejections).toContain('stored_report:unparsable_json');

    const empty = await loadServableMalwareReport(storeWith(rows) as any, 'mir_synthetic_empty');
    expect(empty.row).toBeNull();
    expect(empty.rejections.length).toBeGreaterThan(0);
  });

  test('an absent row is distinct from an invalid row', async () => {
    const gate = await loadServableMalwareReport(storeWith(rows) as any, 'mir_absent_row');
    expect(gate.row).toBeNull();
    expect(gate.rejections).toHaveLength(0);
  });

  test('the read gate is the only path to the canonical report store', () => {
    const gateSource = read('workers/api/src/malwareReportReadGate.ts');
    expect(gateSource).toContain('FROM malware_reports');
    expect(gateSource).toContain('validateStoredMalwareReport');
    expect(gateSource).not.toContain(API_PRODUCTION_DB_ID);
  });
});

// ═══ 7. Synthetic data cannot be mistaken for a real published report ════════
describe('preview isolation 7 — synthetic is never presented as real', () => {
  test('a synthetic fixture cannot pass the published-report gate', async () => {
    const synthetic = {
      id: 'mir_synthetic_fixture_0001',
      sha256: null,
      report_json: JSON.stringify({ report_id: 'mir_synthetic_fixture_0001', synthetic: true, note: 'SYNTHETIC FIXTURE' }),
      source: 'SYNTHETIC',
      published_at: null,
    };
    const gate = await loadServableMalwareReport({
      prepare: () => ({ bind: () => ({ first: async () => synthetic }), all: async () => ({ results: [synthetic] }) }),
    } as any, 'mir_synthetic_fixture_0001');
    expect(gate.row).toBeNull();
    expect(gate.rejections.length).toBeGreaterThan(0);
  });

  test('the projected vulnerability read model states observed facts, never model conclusions', async () => {
    const store = fakePreviewStore();
    await orchestrateVulnerabilitySources(previewProviderRequests(SYNTHETIC_CVE), {
      fetcher: stubFetcher().fetcher,
      db: store.db,
      databaseIdentity: APPROVED_PREVIEW_IDENTITY,
    });
    const row = [...store.readModel.values()][0];
    expect(row.description.startsWith('OBSERVED_FACTS')).toBe(true);
    expect(row.description).toContain('exploitation=KNOWN_EXPLOITED');
    for (const marker of ['INTERPRETATION', 'ASSESSMENT', 'CONCLUSION', 'MODEL_GENERATED']) {
      expect(row.description).not.toContain(marker);
    }
  });

  test('a record with no provenance is refused', async () => {
    const store = fakePreviewStore();
    const requests = previewProviderRequests(SYNTHETIC_CVE);
    const parsed = requests[1].parser(SYNTHETIC_NVD, requests[1].url).normalized!;
    await expect(
      persistNormalizedPreview(store.db, APPROVED_PREVIEW_IDENTITY, { ...parsed, sourceRecords: [] }),
    ).rejects.toThrow('SOURCE_PROVENANCE_REQUIRED');
    expect(store.canonical.size).toBe(0);
  });
});

// ═══ 8. Production configuration and deployment behaviour are unchanged ═══════
describe('preview isolation 8 — production configuration untouched', () => {
  test('the only change to the real wrangler.toml is the preview supply identity block', () => {
    expect(WRANGLER.split(SUPPLY_IDENTITY_BLOCK)).toHaveLength(2);
    expect(hash(WRANGLER.replace(SUPPLY_IDENTITY_BLOCK, ''))).toBe(WRANGLER_PRE_EDIT_SHA256);
    expect(hash(productionHalfOf(WRANGLER))).toBe(WRANGLER_PRODUCTION_HALF_SHA256);
  });

  test('the supply identity var exists only in the preview half', () => {
    expect(previewHalfOf(WRANGLER)).toContain(`PREVIEW_SUPPLY_DB_IDENTITY = "${PREVIEW_SUPPLY_DATABASE_IDENTITY}"`);
    expect(productionHalfOf(WRANGLER)).not.toContain(API_PREVIEW_SUPPLY_IDENTITY_VAR);
  });

  test('the production deploy surface is unchanged and still fails closed', () => {
    const apiPackage = JSON.parse(read('workers/api/package.json')) as { scripts: Record<string, string> };
    expect(apiPackage.scripts.deploy).toContain('generic deploy is disabled');
    expect(apiPackage.scripts['deploy:preview']).toBe('node scripts/deploy-preview.mjs');
    expect(apiPackage.scripts['deploy:production']).toContain('production-release-gate.mjs');
    expect(apiPackage.scripts['deploy:production']).toContain('api-production');
  });

  test('the supply route is preview-gated and resolves its destination from configuration', () => {
    const route = API_SOURCE.slice(API_SOURCE.indexOf('/api/v1/admin/preview-vulnerability-supply'));
    const body = route.slice(0, 4000);
    expect(body).toContain("if (env.ENVIRONMENT !== 'preview')");
    expect(body).toContain('PREVIEW_ONLY');
    expect(body).toContain('previewSupplyIdentityFromConfigVars');
    expect(body).toContain('orchestrateVulnerabilitySources');
  });
});
