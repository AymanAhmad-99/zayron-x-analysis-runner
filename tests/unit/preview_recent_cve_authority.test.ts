import { describe, it, expect } from 'bun:test';
import {
  CISA_KEV_AUTHORITY,
  NVD_CVE_AUTHORITY,
  authorityForKevMembership,
  authorityEvidenceId,
  NOT_APPLICABLE,
} from '../../packages/intelligence/src/vulnerability/analysisAuthority';
import {
  ammanDayWindow,
  parseNvdTimestamp,
  assessNvdCveRecord,
  fetchRecentNvdCve,
  AMMAN_UTC_OFFSET_MINUTES,
} from '../../packages/intelligence/src/vulnerability/recentNvdCve';
import {
  projectClaimsForPrimaryAuthority,
  projectReportForPrimaryAuthority,
} from '../../packages/intelligence/src/vulnerability/nonKevAuthorityProjection';
import { requiredTrust, classifyEndpoint } from '../../workers/api/src/security';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const NVD_PREVIEW_ROUTE = '/api/v1/canary/analyst-grade-cve-nvd-preview';
const KEV_ROUTE = '/api/v1/canary/analyst-grade-cve';

// The API worker cannot be imported under bun (its WorkflowEntrypoint import
// resolves only inside workerd), so its route wiring is asserted against the
// source text — the same convention used by the temporal-provenance suite.
const API_WORKER_SOURCE = readFileSync(join(__dirname, '../../workers/api/src/index.ts'), 'utf8');

// Deterministic instant: 2026-10-11 20:00 Asia/Amman (17:00Z).
const NOW = new Date('2026-10-11T17:00:00.000Z');

function nvdRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'CVE-2026-108605',
    sourceIdentifier: 'security@example.test',
    published: '2026-10-11T16:16:31.713',
    lastModified: '2026-10-11T16:16:31.713',
    vulnStatus: 'Received',
    descriptions: [{ lang: 'en', value: 'Acme Widget Server through 3.9.5 contains a missing authorization flaw in the controller.' }],
    metrics: {
      cvssMetricV31: [
        {
          source: 'nvd@nist.gov',
          type: 'Primary',
          cvssData: {
            version: '3.1',
            vectorString: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
            attackVector: 'NETWORK',
            attackComplexity: 'LOW',
            privilegesRequired: 'LOW',
            userInteraction: 'NONE',
            baseScore: 8.8,
            baseSeverity: 'HIGH',
          },
        },
      ],
    },
    weaknesses: [{ source: 'nvd@nist.gov', type: 'Primary', description: [{ lang: 'en', value: 'CWE-862' }] }],
    configurations: [
      {
        nodes: [
          {
            operator: 'OR',
            cpeMatch: [
              {
                vulnerable: true,
                criteria: 'cpe:2.3:a:acme:widget_server:3.9.5:*:*:*:*:*:*:*',
                matchCriteriaId: 'X',
                versionEndIncluding: '3.9.5',
              },
            ],
          },
        ],
      },
    ],
    references: [
      { url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-108605', source: 'nvd@nist.gov', tags: ['Third Party Advisory'] },
      { url: 'https://advisories.example.test/CVE-2026-108605', source: 'cna@example.test', tags: ['Vendor Advisory'] },
    ],
    ...overrides,
  };
}

describe('Asia/Amman publication window', () => {
  it('uses the permanent UTC+03:00 offset and produces a 24h UTC interval', () => {
    expect(AMMAN_UTC_OFFSET_MINUTES).toBe(180);
    const w = ammanDayWindow(NOW);
    expect(w.day).toBe('2026-10-11');
    expect(w.windowStartUtc).toBe('2026-10-10T21:00:00.000Z');
    expect(w.windowEndUtc).toBe('2026-10-11T21:00:00.000Z');
    expect(Date.parse(w.windowEndUtc) - Date.parse(w.windowStartUtc)).toBe(86_400_000);
  });

  it('crosses the UTC midnight boundary as a real Amman day (early-morning Amman is previous UTC day)', () => {
    // 2026-10-12 00:30 Asia/Amman == 2026-10-11T21:30Z
    const w = ammanDayWindow(new Date('2026-10-11T21:30:00.000Z'));
    expect(w.day).toBe('2026-10-12');
    expect(w.windowStartUtc).toBe('2026-10-11T21:00:00.000Z');
  });

  it('treats NVD timestamps without a designator as UTC', () => {
    expect(parseNvdTimestamp('2026-10-11T16:16:31.713')?.toISOString()).toBe('2026-10-11T16:16:31.713Z');
    expect(parseNvdTimestamp('2026-10-11T16:16:31.713Z')?.toISOString()).toBe('2026-10-11T16:16:31.713Z');
    expect(parseNvdTimestamp('')).toBeNull();
    expect(parseNvdTimestamp(undefined)).toBeNull();
    expect(parseNvdTimestamp('not-a-date')).toBeNull();
  });
});

describe('analysis authority distinguishes NVD publication from KEV listing', () => {
  it('the NVD authority never asserts active exploitation', () => {
    expect(NVD_CVE_AUTHORITY.isKev).toBe(false);
    expect(NVD_CVE_AUTHORITY.knownExploited).toBe(false);
    expect(NVD_CVE_AUTHORITY.exploitationAttemptObserved).toBe(false);
    // KEV membership and exploitation evidence are two different facts, reported
    // on two different fields. The exploitation field never carries the membership
    // token: absence from KEV is not "exploited", and it is not "definitively never
    // exploited" either — exploitation is simply unconfirmed.
    expect(NVD_CVE_AUTHORITY.kevStatus).toBe('NOT_LISTED_IN_KEV');
    expect(NVD_CVE_AUTHORITY.exploitationStatus).toBe('UNCONFIRMED');
    expect(NVD_CVE_AUTHORITY.exploitationStatus).not.toBe('NOT_LISTED_IN_KEV');
    expect(NVD_CVE_AUTHORITY.exploitationStatus).not.toBe('KNOWN_EXPLOITED');
    expect(NVD_CVE_AUTHORITY.kevFieldsApplicable).toBe(false);
    expect(NVD_CVE_AUTHORITY.evidenceBasis).toContain('NOT a CISA KEV catalog listing');
  });

  it('the KEV authority reproduces the historical literals exactly (existing path unchanged)', () => {
    expect(CISA_KEV_AUTHORITY.isKev).toBe(true);
    expect(CISA_KEV_AUTHORITY.sourceId).toBe('cisa-kev');
    expect(CISA_KEV_AUTHORITY.sourceTitle).toBe('CISA Known Exploited Vulnerabilities');
    expect(CISA_KEV_AUTHORITY.kevStatus).toBe('LISTED_IN_KEV');
    expect(CISA_KEV_AUTHORITY.exploitationStatus).toBe('KNOWN_EXPLOITED');
    expect(CISA_KEV_AUTHORITY.claimSource).toBe('CISA KEV');
    expect(CISA_KEV_AUTHORITY.dedupPrefix).toBe('cisa-kev');
    expect(CISA_KEV_AUTHORITY.exploitationAuthority).toBe('CISA KEV');
  });

  it('derives the authority from KEV membership and keeps evidence ids distinct', () => {
    expect(authorityForKevMembership(true).authority).toBe('CISA_KEV');
    expect(authorityForKevMembership(false).authority).toBe('NVD_CVE');
    expect(authorityEvidenceId('CVE-2026-108605', CISA_KEV_AUTHORITY)).toBe('evi_cve_2026_108605_kev');
    expect(authorityEvidenceId('CVE-2026-108605', NVD_CVE_AUTHORITY)).toBe('evi_cve_2026_108605_nvd');
    expect(NOT_APPLICABLE).toBe('NOT_APPLICABLE');
  });
});

describe('recent NVD CVE validation', () => {
  it('accepts a genuinely today-published CVE and parses authoritative fields', () => {
    const outcome = assessNvdCveRecord(nvdRecord(), { cveId: 'CVE-2026-108605', now: NOW });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const e = outcome.evidence;
    expect(e.cveId).toBe('CVE-2026-108605');
    expect(e.publishedAt).toBe('2026-10-11T16:16:31.713Z');
    expect(e.ammanDay).toBe('2026-10-11');
    expect(e.vendor).toBe('acme');
    expect(e.product).toBe('widget_server');
    expect(e.cweIds).toEqual(['CWE-862']);
    expect(e.cvssScore).toBe('8.8');
    expect(e.attackVector).toBe('NETWORK');
    expect(e.references).toHaveLength(2);
    expect(e.kevListedByNvdRecord).toBe(false);
  });

  it('rejects a stale CVE instead of substituting it', () => {
    const outcome = assessNvdCveRecord(nvdRecord({ published: '2026-10-10T20:59:59.000Z' }), { cveId: 'CVE-2026-108605', now: NOW });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('NOT_PUBLISHED_TODAY');
    expect(outcome.message).toContain('Historic CVEs are never substituted');
  });

  it('rejects a CVE whose NVD record already carries KEV designation', async () => {
    const direct = assessNvdCveRecord(nvdRecord({ cisaExploitAdd: '2026-10-01' }), { cveId: 'CVE-2026-108605', now: NOW });
    expect(direct.ok).toBe(true);
    if (direct.ok) expect(direct.evidence.kevListedByNvdRecord).toBe(true);

    const viaFetch = await fetchRecentNvdCve({
      cveId: 'CVE-2026-108605',
      now: NOW,
      fetchFn: (async () => new Response(JSON.stringify({ vulnerabilities: [{ cve: nvdRecord({ cisaExploitAdd: '2026-10-01' }) }] }))) as any,
    });
    expect(viaFetch.ok).toBe(false);
    if (viaFetch.ok) return;
    expect(viaFetch.code).toBe('KEV_LISTED');
  });

  it('rejects malformed, missing and unsupported evidence', () => {
    const cases: Array<[string, unknown, string]> = [
      ['invalid id', nvdRecord(), 'INVALID_CVE_ID'],
      ['no record', null, 'NO_UPSTREAM_RECORD'],
      ['id mismatch', nvdRecord({ id: 'CVE-2026-999999' }), 'MALFORMED_UPSTREAM_RECORD'],
      ['no published', nvdRecord({ published: undefined }), 'PUBLISHED_MISSING'],
      ['bad published', nvdRecord({ published: 'yesterday' }), 'PUBLISHED_INVALID'],
      ['future', nvdRecord({ published: '2026-10-11T19:30:00.000Z' }), 'PUBLISHED_IN_FUTURE'],
      ['no description', nvdRecord({ descriptions: [] }), 'NO_DESCRIPTION'],
      ['no refs', nvdRecord({ references: [] }), 'NO_REFERENCES'],
      ['non-http refs', nvdRecord({ references: [{ url: 'ftp://x.test/a' }] }), 'NO_REFERENCES'],
    ];
    for (const [label, record, code] of cases) {
      const cveId = label === 'invalid id' ? 'NOT-A-CVE' : 'CVE-2026-108605';
      const outcome = assessNvdCveRecord(record, { cveId, now: NOW });
      expect(`${label}:${outcome.ok ? 'OK' : outcome.code}`).toBe(`${label}:${code}`);
    }
  });

  it('marks absent CVSS/vendor/CWE as not applicable rather than inventing values', () => {
    const sparse = nvdRecord({ metrics: {}, weaknesses: [], configurations: [] });
    const outcome = assessNvdCveRecord(sparse, { cveId: 'CVE-2026-108605', now: NOW });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.evidence.cvssScore).toBe(NOT_APPLICABLE);
    expect(outcome.evidence.cvssVector).toBeNull();
    expect(outcome.evidence.cweIds).toEqual([]);
    expect(outcome.evidence.vendor).toBe('Unknown');
    expect(outcome.evidence.product).toBe('Unknown');
    expect(outcome.evidence.vulnerabilityName).toBe('CVE-2026-108605 Security Advisory');
  });

  it('reports upstream failures explicitly instead of fabricating a record', async () => {
    const http500 = await fetchRecentNvdCve({
      cveId: 'CVE-2026-108605',
      now: NOW,
      fetchFn: (async () => new Response('upstream down', { status: 503 })) as any,
    });
    expect(http500.ok).toBe(false);
    if (!http500.ok) expect(http500.code).toBe('NO_UPSTREAM_RECORD');

    const empty = await fetchRecentNvdCve({
      cveId: 'CVE-2026-108605',
      now: NOW,
      fetchFn: (async () => new Response(JSON.stringify({ vulnerabilities: [] }))) as any,
    });
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.code).toBe('NO_UPSTREAM_RECORD');
      expect(empty.message).toContain('no published record');
    }

    const thrown = await fetchRecentNvdCve({
      cveId: 'CVE-2026-108605',
      now: NOW,
      fetchFn: (async () => { throw new Error('socket hang up'); }) as any,
    });
    expect(thrown.ok).toBe(false);
    if (!thrown.ok) expect(thrown.message).toContain('socket hang up');
  });

  it('accepts a today-published CVE end to end through the fetch boundary', async () => {
    const outcome = await fetchRecentNvdCve({
      cveId: 'CVE-2026-108605',
      now: NOW,
      fetchFn: (async (url: string) => {
        expect(String(url)).toContain('cveId=CVE-2026-108605');
        return new Response(JSON.stringify({ vulnerabilities: [{ cve: nvdRecord() }] }));
      }) as any,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.evidence.vulnerabilityName).toBe('acme widget_server (CWE-862) Vulnerability');
    expect(outcome.evidence.affectedVersions).toEqual(['3.9.5', '<= 3.9.5']);
  });
});

// ── Authority projection ────────────────────────────────────────────────────
// Mirrors the real KEV ledger shape for the claims whose truth belongs to the
// KEV authority, so the projection is exercised against the fields that would
// otherwise be published as fabricated KEV threat intelligence.
function kevShapedLedger() {
  return [
    { id: 'CLM-01', claim_id: 'CLM-01', field: 'identity', value: 'CVE-2026-108605', truth_type: 'SOURCE_FACT', confidence: 1, source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', source_timestamp: '2026-01-01', notes: 'CISA KEV baseline member' },
    { id: 'CLM-02', claim_id: 'CLM-02', field: 'vendor', value: 'acme', truth_type: 'SOURCE_FACT', confidence: 1, source: 'Authoritative CNA / NVD', source_ids: ['cisa-kev', 'nvd-cpe'], source_url: null, source_timestamp: '2026-10-11T16:16:31.713Z' },
    { id: 'CLM-10', claim_id: 'CLM-10', field: 'exploitation', value: 'Active in-the-wild exploitation', truth_type: 'SOURCE_FACT', confidence: 1, source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', source_timestamp: '2026-01-01', notes: 'Active in-the-wild exploitation confirmed by CISA KEV' },
    { id: 'CLM-11', claim_id: 'CLM-11', field: 'ransomware', value: 'Unknown', truth_type: 'SOURCE_FACT', confidence: 1, source: 'CISA KEV', source_ids: ['cisa-kev'] },
    { id: 'CLM-29', claim_id: 'CLM-29', field: 'cisa_due_date', value: 'NOT_APPLICABLE', truth_type: 'NOT_AVAILABLE', confidence: 1, source: 'CISA KEV', source_ids: ['cisa-kev'] },
  ] as any[];
}

function kevShapedReport() {
  return {
    dates: { cve_published_at: '2026-10-11T16:16:31.713Z', cisa_kev_added_at: '2026-01-01', cisa_due_at: '2026-01-21' },
    signals: { kev_listed: true, observed_in_wild: true, exploited_in_the_wild: true, exploit_attempt_observed: true, ransomware_campaign_use: 'Unknown', ransomware_associated: 'Unknown' },
    exploitation: { known_exploited: true, kev_listed: true, observed_in_wild: true, exploited_in_the_wild: true, exploit_attempt_observed: true, exploitation_status: 'KNOWN_EXPLOITED', ransomware_campaign_use: 'Unknown', cisa_action: 'Apply updates', cisa_due_date: '2026-01-21', evidence_basis: 'CISA KEV catalog inclusion establishes binding remediation due dates...' },
    threat_context: { active_exploitation: true, ransomware_association: 'NO_CONFIRMED_EVIDENCE', source: 'CISA KEV Catalog & Threat Telemetry' },
    provenance: {
      authorities: { exploitation: 'CISA KEV' },
      evidence: [{ id: 'evi_cve_2026_108605_kev', source: 'CISA KEV', weight: '1.0', title: 'x', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', snippet: 'kev' }],
    },
    remediation: { cisa_action: 'Apply updates', due_date: '2026-01-21' },
  } as any;
}

describe('authority projection keeps KEV output untouched and makes NVD output honest', () => {
  it('is a strict no-op for the CISA KEV authority', () => {
    const claims = kevShapedLedger();
    const before = JSON.stringify(claims);
    projectClaimsForPrimaryAuthority(claims, CISA_KEV_AUTHORITY, 'CVE-2026-108605');
    expect(JSON.stringify(claims)).toBe(before);

    const report = kevShapedReport();
    const reportBefore = JSON.stringify(report);
    projectReportForPrimaryAuthority(report, CISA_KEV_AUTHORITY, 'CVE-2026-108605');
    expect(JSON.stringify(report)).toBe(reportBefore);
  });

  it('replaces KEV-owned provenance on claims without deleting claims', () => {
    const claims = kevShapedLedger();
    projectClaimsForPrimaryAuthority(claims, NVD_CVE_AUTHORITY, 'CVE-2026-108605');
    expect(claims).toHaveLength(5);
    expect(claims[0].source).toBe('NVD CVE API 2.0');
    expect(claims[0].source_ids).toEqual(['nvd-api']);
    expect(claims[0].source_url).toBe('https://nvd.nist.gov/vuln/detail/CVE-2026-108605');
    expect(claims[1].source_ids).toEqual(['nvd-api', 'nvd-cpe']);
  });

  it('demotes the exploitation, ransomware and due-date claims to non-assertions', () => {
    const claims = kevShapedLedger();
    projectClaimsForPrimaryAuthority(claims, NVD_CVE_AUTHORITY, 'CVE-2026-108605');
    const exploitation = claims.find(c => c.field === 'exploitation')!;
    // The exploitation claim carries the EXPLOITATION EVIDENCE state; the KEV
    // membership statement is a separate, explicitly named token in the notes.
    expect(exploitation.value).toBe('UNCONFIRMED');
    expect(exploitation.truth_type).toBe('NOT_AVAILABLE');
    expect(exploitation.value).not.toContain('Active in-the-wild');
    expect(exploitation.value).not.toBe('NOT_LISTED_IN_KEV');
    expect(exploitation.notes).toContain('kev_status=NOT_LISTED_IN_KEV');
    expect(exploitation.notes).toContain('exploitation_status=UNCONFIRMED');
    expect(exploitation.notes).toContain('not evidence that exploitation has not occurred');

    const ransomware = claims.find(c => c.field === 'ransomware')!;
    expect(ransomware.value).toBe('NOT_APPLICABLE');
    expect(ransomware.truth_type).toBe('NOT_AVAILABLE');

    const due = claims.find(c => c.field === 'cisa_due_date')!;
    expect(due.value).toBe('NOT_APPLICABLE');
    expect(due.notes).toContain('not a CISA KEV catalog listing');
  });

  it('rewrites the report exploitation projection and primary evidence record', () => {
    const report = kevShapedReport();
    projectReportForPrimaryAuthority(report, NVD_CVE_AUTHORITY, 'CVE-2026-108605');
    expect(report.signals.kev_listed).toBe(false);
    expect(report.signals.exploited_in_the_wild).toBe(false);
    expect(report.exploitation.known_exploited).toBe(false);
    // Independently represented: membership (kev_status) and exploitation evidence
    // (exploitation_status) never collapse into one token.
    expect(report.exploitation.kev_status).toBe('NOT_LISTED_IN_KEV');
    expect(report.exploitation.exploitation_status).toBe('UNCONFIRMED');
    expect(report.signals.kev_status).toBe('NOT_LISTED_IN_KEV');
    expect(report.exploitation.evidence_basis).toContain('NOT a CISA KEV catalog listing');
    expect(report.threat_context.active_exploitation).toBe(false);
    expect(report.threat_context.source).toContain('no CISA KEV listing');
    expect(report.dates.cisa_kev_added_at).toBe('NOT_APPLICABLE');
    expect(report.dates.cisa_due_at).toBe('NOT_APPLICABLE');
    expect(report.provenance.authorities.exploitation).toContain('no CISA KEV listing');
    expect(report.provenance.evidence[0].id).toBe('evi_cve_2026_108605_nvd');
    expect(report.provenance.evidence[0].source).toBe('NVD CVE API 2.0');
    expect(report.provenance.evidence[0].url).toBe('https://nvd.nist.gov/vuln/detail/CVE-2026-108605');
    expect(report.remediation.cisa_action).toBe('NOT_APPLICABLE');
    // Structure preserved: NO key is removed. The single additive key is the
    // explicit membership token (`kev_status`), which is the point of this change —
    // previously the membership token occupied `exploitation_status`.
    const originalKeys = Object.keys(kevShapedReport().exploitation);
    for (const key of originalKeys) expect(Object.keys(report.exploitation)).toContain(key);
    expect(Object.keys(report.exploitation)).toHaveLength(originalKeys.length + 1);
    expect(report.exploitation.kev_status).toBe('NOT_LISTED_IN_KEV');
  });
});

describe('Preview NVD route authorization and environment boundary', () => {
  it('requires the same operator credential as the KEV canary route', () => {
    // The invariant that matters is that the new route is behind the SAME edge
    // trust boundary as the KEV route (operator admin or knowledge-internal
    // token), never anonymous: the live Preview API returns 401
    // "Operator authentication required" for this exact class of path.
    const trust = requiredTrust('POST', NVD_PREVIEW_ROUTE);
    expect(trust).toBe(requiredTrust('POST', KEV_ROUTE));
    expect(trust).toBe('admin_or_internal');
    expect(trust).not.toBe('public');
    expect(classifyEndpoint('POST', NVD_PREVIEW_ROUTE)).toBe(classifyEndpoint('POST', KEV_ROUTE));
    expect(classifyEndpoint('POST', NVD_PREVIEW_ROUTE)).toBe('mutation');
  });

  it('registers the route and refuses to run outside Preview', () => {
    expect(API_WORKER_SOURCE).toContain(`path === '${NVD_PREVIEW_ROUTE}' && request.method === 'POST'`);
    // The Preview-only guard must sit in the same handler as the route predicate,
    // before any analysis is dispatched.
    const routeIndex = API_WORKER_SOURCE.indexOf(`path === '${NVD_PREVIEW_ROUTE}'`);
    expect(routeIndex).toBeGreaterThan(-1);
    const guardWindow = API_WORKER_SOURCE.slice(routeIndex, routeIndex + 900);
    expect(guardWindow).toContain("env.ENVIRONMENT !== 'preview'");
    expect(guardWindow).toContain('PREVIEW_ONLY');
    expect(guardWindow).toContain('403');
    expect(guardWindow.indexOf("env.ENVIRONMENT !== 'preview'")).toBeLessThan(guardWindow.indexOf('worker.dispatch'));
  });

  it('validates the CVE identifier before dispatching into the pipeline', () => {
    const routeIndex = API_WORKER_SOURCE.indexOf(`path === '${NVD_PREVIEW_ROUTE}'`);
    const guardWindow = API_WORKER_SOURCE.slice(routeIndex, routeIndex + 900);
    expect(guardWindow).toContain('Invalid or missing cve_id');
    expect(guardWindow).toContain('400');
  });

  it('cannot be enabled through a forged request: the internal marker is stripped unconditionally', () => {
    // The authority marker is the ONLY way to reach the NVD path, and it is
    // removed from every inbound client request before the security boundary.
    expect(API_WORKER_SOURCE).toContain("const PREVIEW_NVD_AUTHORITY_HEADER = 'x-zayron-preview-nvd-authority'");
    const fetchStart = API_WORKER_SOURCE.indexOf('async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {');
    expect(fetchStart).toBeGreaterThan(-1);
    const fetchBody = API_WORKER_SOURCE.slice(fetchStart, fetchStart + 700);
    expect(fetchBody).toContain('headers.delete(PREVIEW_NVD_AUTHORITY_HEADER)');
    expect(fetchBody.indexOf('headers.delete(PREVIEW_NVD_AUTHORITY_HEADER)')).toBeLessThan(fetchBody.indexOf('withSecurityBoundary'));

    // And the authority is only reachable when BOTH the Preview environment and
    // the marker agree, in the shared resolver itself.
    const resolverStart = API_WORKER_SOURCE.indexOf('async function resolvePreviewNvdAuthority(');
    expect(resolverStart).toBeGreaterThan(-1);
    const resolver = API_WORKER_SOURCE.slice(resolverStart, resolverStart + 900);
    expect(resolver).toContain("if (env.ENVIRONMENT !== 'preview') return null");
    expect(resolver).toContain("if (request.headers.get(PREVIEW_NVD_AUTHORITY_HEADER) !== '1') return null");
  });

  it('keeps the KEV route and its KEV gate unchanged (production policy preserved)', () => {
    // The historical refusal must still be reachable verbatim for a non-KEV CVE
    // that is not carrying the Preview NVD authority.
    expect(API_WORKER_SOURCE).toContain('not found in CISA KEV catalog`, 404, \'NOT_IN_KEV\'');
    // The NVD authority must never bypass the KEV gate when no marker is present.
    expect(API_WORKER_SOURCE).toContain('const previewNvd = kevItem ? null : await resolvePreviewNvdAuthority(request, env, targetCve);');
    expect(API_WORKER_SOURCE).toContain('if (!kevItem && !previewNvd) {');
  });
});

// ── The bounded live-validation seam ─────────────────────────────────────────────
// A genuine Gemini analysis needs the deployed worker's own GEMINI_API_KEY, so it
// can only run inside Cloudflare. This entrypoint is the credential-free way in:
// it reuses the guarded route above in-process and is unreachable over HTTP.
describe('Preview NVD validation entrypoint', () => {
  it('exposes a Preview-gated entrypoint that reuses the existing guarded route', () => {
    const classStart = API_WORKER_SOURCE.indexOf('export class PreviewNvdValidator extends WorkerEntrypoint');
    expect(classStart).toBeGreaterThan(-1);
    const body = API_WORKER_SOURCE.slice(classStart, classStart + 1200);

    // Fails closed outside Preview, and before any work is done.
    expect(body).toContain("if (this.env.ENVIRONMENT !== 'preview')");
    expect(body.indexOf("this.env.ENVIRONMENT !== 'preview'")).toBeLessThan(body.indexOf('worker.dispatch'));

    // Reuses the SAME route handler: no duplicated pipeline, no second Gemini client.
    expect(body).toContain(NVD_PREVIEW_ROUTE);
    expect(body).toContain('worker.dispatch(');

    // No second Gemini client was introduced anywhere in the worker.
    expect(API_WORKER_SOURCE).not.toContain('generativelanguage.googleapis.com');
  });

  it('is not reachable over HTTP: the router never references the entrypoint', () => {
    const dispatchStart = API_WORKER_SOURCE.indexOf('async dispatch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {');
    expect(dispatchStart).toBeGreaterThan(-1);
    const defaultExport = API_WORKER_SOURCE.indexOf('export default worker;');
    expect(defaultExport).toBeGreaterThan(dispatchStart);
    // The region covers the whole HTTP router that `fetch()` delegates to.
    const router = API_WORKER_SOURCE.slice(dispatchStart, defaultExport);
    expect(router.length).toBeGreaterThan(1000);
    expect(router).not.toContain('PreviewNvdValidator');
    // And no credential-bearing route was added for it.
    expect(API_WORKER_SOURCE).not.toContain("'/api/v1/canary/preview-nvd-validator'");
  });

  it('leaves the existing KEV service-binding seam unchanged (no authority marker on the ingest path)', () => {
    // Continuous ingestion keeps reaching exactly the historical KEV route with no
    // marker, so its behaviour is byte-identical to before this work.
    const helperStart = API_WORKER_SOURCE.indexOf('async function invokeAnalystGradeCve(');
    expect(helperStart).toBeGreaterThan(-1);
    const helper = API_WORKER_SOURCE.slice(helperStart, helperStart + 600);
    expect(helper).toContain(KEV_ROUTE);
    expect(helper).not.toContain('PREVIEW_NVD_AUTHORITY_HEADER');
    expect(helper).not.toContain(NVD_PREVIEW_ROUTE);
  });
});
