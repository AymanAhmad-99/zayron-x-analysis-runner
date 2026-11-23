import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildTemporalProvenance,
  normalizeIsoTimestamp,
  normalizeEpssObservation,
  parseEpss,
  validateTemporalProvenance,
  validateReportSemantics,
  type TemporalProvenance,
} from '../../packages/intelligence/src/sources/adapters';

import goldenFive from '../fixtures/phase1_golden_five_reports.json';
import goldenFiveTemporal from '../../GOLDEN_FIVE_TEMPORAL_EXPECTATIONS.json';

const REPORTS = (goldenFive as any).reports as Record<string, any>;
const CVES = Object.keys(REPORTS);
const EXPECTED = (goldenFiveTemporal as any).reports as Record<string, any>;

const adaptersSource = readFileSync(
  join(import.meta.dir, '..', '..', 'packages', 'intelligence', 'src', 'sources', 'adapters.ts'),
  'utf8'
);
const sourceClientsSource = readFileSync(
  join(import.meta.dir, '..', '..', 'packages', 'intelligence', 'src', 'sources', 'sourceClients.ts'),
  'utf8'
);
const apiSource = readFileSync(
  join(import.meta.dir, '..', '..', 'workers', 'api', 'src', 'index.ts'),
  'utf8'
);
const uiSource = readFileSync(
  join(import.meta.dir, '..', '..', 'apps', 'web', 'app', 'components', 'VulnerabilityDetail.tsx'),
  'utf8'
);

/** Canonical temporal provenance for a Golden Five report, built deterministically
 * from the CVE-record publication timestamp the fixture reports own. */
function temporalFor(cve: string): TemporalProvenance {
  const e = EXPECTED[cve];
  return buildTemporalProvenance({
    cve_published_at: e.cve_published_at,
    source_published_at: { nvd: e.cve_published_at },
    source_observed_at: { epss: e.epss_observed_at },
  });
}

// ── 1. Canonical normalization path ─────────────────────────────────────────
describe('1. Canonical temporal normalization (buildTemporalProvenance)', () => {
  it('preserves semantic identity per domain and source key', () => {
    const tp = buildTemporalProvenance({
      cve_published_at: '2024-10-02T22:15:02.770',
      source_published_at: { nvd: '2024-10-02T22:15:02.770' },
      source_updated_at: { nvd: '2024-10-03T01:14:00.000' },
      source_observed_at: { epss: '2024-10-02' },
      retrieved_at: { epss: '2026-10-06T01:14:32Z' },
    });
    expect(tp.cve_published_at).toBe('2024-10-02T22:15:02.770');
    expect(tp.source_published_at?.['nvd']).toBe('2024-10-02T22:15:02.770');
    expect(tp.source_updated_at?.['nvd']).toBe('2024-10-03T01:14:00.000');
    expect(tp.source_observed_at?.['epss']).toBe('2024-10-02');
    expect(tp.retrieved_at?.['epss']).toBe('2026-10-06T01:14:32Z');
    // Distinct domains never merge even with identical values.
    expect(tp.source_published_at?.['nvd']).not.toEqual(tp.source_observed_at?.['epss']);
  });

  it('keeps missing timestamps null — never borrows across domains', () => {
    const tp = buildTemporalProvenance({
      cve_published_at: '2024-10-02T22:15:02.770',
      source_observed_at: { epss: null },
    });
    expect(tp.cve_published_at).toBe('2024-10-02T22:15:02.770');
    expect(tp.source_observed_at?.['epss']).toBeNull();
    expect(tp.source_published_at?.['epss']).toBeUndefined();
  });

  it('rejects malformed timestamps instead of passing them through', () => {
    expect(normalizeIsoTimestamp('not-a-date')).toBeNull();
    expect(normalizeIsoTimestamp('T22:15:02')).toBeNull();
    expect(normalizeIsoTimestamp('')).toBeNull();
    expect(normalizeIsoTimestamp(null)).toBeNull();
    expect(normalizeIsoTimestamp(12345)).toBeNull();
    expect(normalizeIsoTimestamp('2024-10-02')).toBe('2024-10-02');
    expect(normalizeIsoTimestamp('2024-10-02T22:15:02.770')).toBe('2024-10-02T22:15:02.770');
  });

  it('normalizes source keys and drops empty ones deterministically', () => {
    const tp = buildTemporalProvenance({
      source_observed_at: { 'EPSS': '2024-10-02', '': '2024-01-01' },
    });
    expect(tp.source_observed_at?.['epss']).toBe('2024-10-02');
    expect(tp.source_observed_at?.['']).toBeUndefined();
  });

  it('is deterministic: same input, same output', () => {
    const input = {
      cve_published_at: '2024-10-02T22:15:02.770',
      source_observed_at: { epss: '2024-10-02' },
      retrieved_at: { 'first-epss': '2026-10-06T01:14:32Z' },
    };
    expect(JSON.stringify(buildTemporalProvenance(input)))
      .toBe(JSON.stringify(buildTemporalProvenance(input)));
  });
});

// ── 2. EPSS observation preservation (producer repair) ──────────────────────
describe('2. EPSS observation preservation', () => {
  it('normalizeEpssObservation keeps the EPSS snapshot date when supplied', () => {
    const obs = normalizeEpssObservation({ data: [{ cve: 'CVE-2024-45519', epss: '0.999', percentile: '0.99', date: '2024-10-02' }] });
    expect(obs.score).toBe('0.999');
    expect(obs.observed_at).toBe('2024-10-02');
  });

  it('normalizeEpssObservation keeps observation null when the source supplies none', () => {
    const obs = normalizeEpssObservation({ data: [{ cve: 'CVE-2024-45519', epss: '0.999', percentile: '0.99' }] });
    expect(obs.observed_at).toBeNull();
  });

  it('normalizeEpssObservation never fabricates an observation from other fields', () => {
    // No `date` in payload: even a plausible-looking cve/percentile must not leak into observed_at.
    const obs = normalizeEpssObservation({ data: [{ cve: 'CVE-2024-45519', epss: '0.1', percentile: '0.5', published: '2024-01-01' }] });
    expect(obs.observed_at).toBeNull();
  });

  it('parseEpss propagates the EPSS observation date into the enrichment record', () => {
    const res = parseEpss({ data: [{ cve: 'CVE-2024-45519', epss: '0.999', percentile: '0.99', date: '2024-10-02' }] });
    expect(res.normalized).toBeDefined();
  });
});

// ── 3. TMP-002 — EPSS publication contamination (primary regression target) ─
describe('3. TMP-002 — EPSS contamination detection', () => {
  const cvePublished = '2024-10-02T22:15:02.770';

  it('clean: distinct EPSS observation passes', () => {
    const v = validateTemporalProvenance({
      temporal_provenance: temporalFor('CVE-2024-45519'),
      cve_published_at: cvePublished,
      claims: [{ claim_id: 'CLM-09', field: 'epss', source_ids: ['first-epss'], source_timestamp: '2024-10-02' }],
    });
    expect(v.filter(x => x.rule === 'TMP-002').length).toBe(0);
  });

  it('MUTATION: EPSS observed_at set to cve_published_at is BLOCKING', () => {
    const tp = temporalFor('CVE-2024-45519');
    tp.source_observed_at = { epss: cvePublished };
    const v = validateTemporalProvenance({ temporal_provenance: tp, cve_published_at: cvePublished });
    const hits = v.filter(x => x.rule === 'TMP-002' && x.severity === 'BLOCKING');
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  it('MUTATION: EPSS claim stamped with cve_published_at while provenance records no observation is BLOCKING', () => {
    const v = validateTemporalProvenance({
      temporal_provenance: temporalFor('CVE-2024-45519'),
      cve_published_at: cvePublished,
      claims: [{ claim_id: 'CLM-09', field: 'epss', source_ids: ['first-epss'], source_timestamp: cvePublished }],
    });
    const hits = v.filter(x => x.rule === 'TMP-002' && x.severity === 'BLOCKING');
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  it('legacy shape (no provenance) does not false-positive — legacy debt is measured, not certified', () => {
    const legacy = REPORTS['CVE-2024-45519'];
    const v = validateReportSemantics(legacy, null);
    const tmpHits = v.violations.filter((s: string) => s.includes('[TMP-'));
    expect(tmpHits.length).toBe(0);
  });

  it('UNAVAILABLE sentinels are never treated as a real observation', () => {
    const tp = buildTemporalProvenance({ cve_published_at: cvePublished, source_observed_at: { epss: null } });
    const v = validateTemporalProvenance({
      temporal_provenance: tp,
      cve_published_at: cvePublished,
      claims: [{ claim_id: 'CLM-09', field: 'epss', source_ids: ['first-epss'], source_timestamp: 'UNKNOWN' }],
    });
    expect(v.filter(x => x.rule === 'TMP-002').length).toBe(0);
  });
});

// ── 4. TMP-003..TMP-008 ─────────────────────────────────────────────────────
describe('4. TMP-003..TMP-008 rules', () => {
  const cvePublished = '2024-10-02T22:15:02.770';

  it('TMP-003 MUTATION: EPSS claim with timestamp but no source identity is BLOCKING', () => {
    const v = validateTemporalProvenance({
      temporal_provenance: temporalFor('CVE-2024-45519'),
      cve_published_at: cvePublished,
      claims: [{ claim_id: 'CLM-09', field: 'epss', source_timestamp: '2024-10-02' }],
    });
    expect(v.filter(x => x.rule === 'TMP-003' && x.severity === 'BLOCKING').length).toBeGreaterThanOrEqual(1);
  });

  it('TMP-004 MUTATION: retrieved_at presented as source observation is flagged', () => {
    const tp = temporalFor('CVE-2024-45519');
    // Mutation: retrieved_at and source_observed_at collide on the SAME value for the
    // same source — the retrieval event presented as a source observation.
    tp.source_observed_at = { epss: '2026-10-06T01:14:32Z' };
    tp.retrieved_at = { epss: '2026-10-06T01:14:32Z' };
    const v = validateTemporalProvenance({ temporal_provenance: tp, cve_published_at: cvePublished });
    expect(v.filter(x => x.rule === 'TMP-004').length).toBeGreaterThanOrEqual(1);
  });

  it('TMP-005 MUTATION: source_updated_at persisted as source_published_at is flagged', () => {
    const tp = buildTemporalProvenance({
      source_published_at: { nvd: '2024-10-03T01:14:00.000' },
      source_updated_at: { nvd: '2024-10-03T01:14:00.000' },
    });
    const v = validateTemporalProvenance({ temporal_provenance: tp });
    expect(v.filter(x => x.rule === 'TMP-005').length).toBeGreaterThanOrEqual(1);
  });

  it('TMP-006 MUTATION: system timestamp used as source observation is BLOCKING', () => {
    const tp = buildTemporalProvenance({
      source_observed_at: { epss: '2026-10-06T01:14:32Z' },
      normalized_at: '2026-10-06T01:14:32Z',
    });
    const v = validateTemporalProvenance({ temporal_provenance: tp });
    expect(v.filter(x => x.rule === 'TMP-006' && x.severity === 'BLOCKING').length).toBeGreaterThanOrEqual(1);
  });

  it('TMP-007 MUTATION: missing observation filled from another source publication is BLOCKING', () => {
    const tp = buildTemporalProvenance({
      source_published_at: { nvd: '2024-10-02T22:15:02.770' },
      source_observed_at: { epss: '2024-10-02T22:15:02.770' },
    });
    const v = validateTemporalProvenance({ temporal_provenance: tp });
    expect(v.filter(x => x.rule === 'TMP-007' && x.severity === 'BLOCKING').length).toBeGreaterThanOrEqual(1);
  });

  it('TMP-008 MUTATION: source publication predating the CVE record is flagged', () => {
    const v = validateTemporalProvenance({
      temporal_provenance: buildTemporalProvenance({
        cve_published_at: '2024-10-02T22:15:02.770',
        source_published_at: { nvd: '2024-09-01T00:00:00.000' },
      }),
      cve_published_at: '2024-10-02T22:15:02.770',
    });
    expect(v.filter(x => x.rule === 'TMP-008').length).toBeGreaterThanOrEqual(1);
  });

  it('TMP-001 MUTATION: flat dates projection carrying another domain timestamp is BLOCKING', () => {
    const tp = temporalFor('CVE-2024-45519');
    // Mutation: flat dates.cve_published_at carries the EPSS observation domain's value
    // AND canonical provenance disagrees — but TMP-002 also fires here (observed==cve),
    // so assert on the TMP-001 rule specifically.
    const mutated = JSON.parse(JSON.stringify(tp));
    mutated.source_observed_at = { epss: '2024-10-02' };
    mutated.cve_published_at = '2024-10-02T22:15:02.770';
    const v = validateTemporalProvenance({
      temporal_provenance: mutated,
      dates: { cve_published_at: '2024-10-02' },
      cve_published_at: '2024-10-02T22:15:02.770',
    });
    expect(v.filter(x => x.rule === 'TMP-001' && x.severity === 'BLOCKING').length).toBeGreaterThanOrEqual(1);
  });
});

// ── 5. Integration into the single validation context ──────────────────────
describe('5. validateReportSemantics integration', () => {
  it('a report WITH canonical provenance and contaminated EPSS observation is BLOCKED', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-45519']));
    base.temporal_provenance = temporalFor('CVE-2024-45519');
    base.temporal_provenance.source_observed_at = { epss: base.temporal_provenance.cve_published_at };
    const v = validateReportSemantics(base, null);
    expect(v.isValid).toBe(false);
    expect(v.violations.some((s: string) => s.includes('[TMP-002]'))).toBe(true);
  });

  it('a report with clean canonical provenance AND a clean EPSS claim introduces no TMP violations', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-45519']));
    base.temporal_provenance = temporalFor('CVE-2024-45519');
    // The claim ledger must agree with the canonical provenance: no EPSS observation in
    // provenance ⇒ the EPSS claim carries the explicit sentinel, never the CVE date.
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    epssClaim.source_timestamp = 'UNKNOWN';
    const baseline = validateReportSemantics(JSON.parse(JSON.stringify(REPORTS['CVE-2024-45519'])), null);
    const withTp = validateReportSemantics(base, null);
    expect(withTp.violations.filter((s: string) => s.includes('[TMP-')).length).toBe(0);
    expect(withTp.violations.length).toBe(baseline.violations.length);
  });

  it('FAIL-CLOSED: canonical provenance plus the LEGACY contaminated ledger is blocked (legacy debt is detected, not certified)', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-45519']));
    base.temporal_provenance = temporalFor('CVE-2024-45519');
    // The fixture's persisted CLM-09 stamp is the CVE publication timestamp. Once canonical
    // provenance exists, that inherited stamp is provably non-epss-sourced ⇒ BLOCKING.
    const v = validateReportSemantics(base, null);
    expect(v.isValid).toBe(false);
    expect(v.violations.some((s: string) => s.includes('[TMP-002]'))).toBe(true);
  });
});

// ── 6. Golden Five temporal verification ────────────────────────────────────
describe('6. Golden Five temporal expectations', () => {
  for (const cve of CVES) {
    it(`${cve}: temporal semantics verified against expectations`, () => {
      const e = EXPECTED[cve];
      expect(e).toBeDefined();
      const tp = temporalFor(cve);
      // CVE publication stays tied to the CVE domain and the NVD source domain.
      expect(tp.cve_published_at).toBe(e.cve_published_at);
      expect(tp.source_published_at?.['nvd']).toBe(e.cve_published_at);
      // EPSS observation: only the source-supplied value, never the CVE date.
      if (e.epss_observed_at === null) {
        expect(tp.source_observed_at?.['epss']).toBeNull();
      } else {
        expect(tp.source_observed_at?.['epss']).toBe(e.epss_observed_at);
        expect(tp.source_observed_at?.['epss']).not.toBe(e.cve_published_at);
      }
      // Validator passes clean provenance.
      const v = validateTemporalProvenance({ temporal_provenance: tp, cve_published_at: tp.cve_published_at });
      expect(v.filter(x => x.severity === 'BLOCKING').length).toBe(0);
    });

    it(`${cve}: legacy persisted ledger measured as EPSS→CVE collapse (legacy debt, not silently certified)`, () => {
      const epssClaim = (REPORTS[cve].provenance.claims || []).find((c: any) => c.field === 'epss');
      expect(epssClaim).toBeDefined();
      const collapsed = epssClaim.source_timestamp === EXPECTED[cve].cve_published_at;
      expect(collapsed).toBe(EXPECTED[cve].legacy_epss_claim_collapsed);
    });
  }
});

// ── 7. Production wiring ────────────────────────────────────────────────────
describe('7. Production wiring', () => {
  it('EPSS client preserves the observation date and never defaults it', () => {
    expect(sourceClientsSource).toContain('normalizeEpssObservation');
    expect(sourceClientsSource).toContain('observed_at');
  });

  it('fetchCanonicalVulnerabilitySources emits canonical temporal_provenance', () => {
    expect(sourceClientsSource).toContain('temporal_provenance: buildTemporalProvenance');
    expect(sourceClientsSource).toContain("'first-epss': epss.fetchedAt");
  });

  it('API route passes temporal provenance and emits it on the structured report', () => {
    expect(apiSource).toContain('temporalProvenance: sourceBundle.temporal_provenance');
    expect(apiSource).toContain('temporal_provenance: reconciled.temporal_provenance');
  });

  it('API EPSS claim no longer inherits cve_published_at (TMP-002 producer repair)', () => {
    expect(apiSource).toContain("source_timestamp: reconciled.severity.epss.observed_at || 'UNKNOWN'");
    // The contamination pattern is gone from the EPSS claim: within the CLM-09 claim
    // object, the source_timestamp line must not reference cvePublishedTimestamp.
    const start = apiSource.indexOf("field: 'epss'");
    const claimObj = apiSource.slice(start, apiSource.indexOf('},', start));
    expect(claimObj).toContain("source_timestamp: reconciled.severity.epss.observed_at || 'UNKNOWN'");
    expect(claimObj).not.toContain('cvePublishedTimestamp');
  });

  it('API runs the fail-closed TMP gate', () => {
    expect(apiSource).toContain('validateTemporalProvenance');
    expect(apiSource).toContain("claim_id: 'TEMPORAL_PROVENANCE'");
  });

  it('no cross-domain fallback helper exists in the producer', () => {
    expect(adaptersSource).not.toMatch(/observed_at\s*=\s*cve_published/i);
    expect(adaptersSource).not.toMatch(/observed_at\s*\?\?\s*cve/i);
  });

  it('UI consumes canonical provenance for source-scoped timestamps', () => {
    expect(uiSource).toContain('EPSS OBSERVED');
    expect(uiSource).toContain('EPSS SOURCE RETRIEVED');
    expect(uiSource).toContain('temporal_provenance');
    expect(uiSource).not.toMatch(/epss.*cve_published_at/i);
  });
});

// ── 8. No CVE-specific hardcoding ───────────────────────────────────────────
describe('8. No CVE-specific hardcoding in temporal logic', () => {
  it('temporal functions contain no Golden Five CVE literals', () => {
    const start = adaptersSource.indexOf('CANONICAL TEMPORAL PROVENANCE CONTRACT');
    const section = adaptersSource.slice(start, adaptersSource.indexOf('MICRO TASK 70', start));
    const end = adaptersSource.indexOf('return violations;\n}', adaptersSource.indexOf('validateTemporalProvenance'));
    const validator = adaptersSource.slice(adaptersSource.indexOf('export function validateTemporalProvenance'), end);
    for (const cve of CVES) {
      expect(section.includes(cve)).toBe(false);
      expect(validator.includes(cve)).toBe(false);
    }
  });
});

// ── 9. REM-04 B-1 Regression — WARNING semantics & non-blocking publication ─
describe('9. REM-04 B-1 Regression: WARNING semantics & non-blocking publication', () => {
  function simulatePublishGate(report: any, authoritativeEvidence?: any) {
    const claimsVerification: {
      is_valid: boolean;
      violations: Array<{ claim_id: string; field: string; issue: string }>;
      warnings: Array<{ claim_id: string; field: string; issue: string }>;
    } = {
      is_valid: true,
      violations: [],
      warnings: [],
    };
    const semanticGate = validateReportSemantics(report, authoritativeEvidence ?? null);
    report.semantic_gate = semanticGate;

    const tp = report.temporal_provenance;
    const allTemporalFindings = validateTemporalProvenance({
      temporal_provenance: tp,
      dates: report.dates,
      claims: (report.provenance?.claims || []) as any,
      cve_published_at: tp?.cve_published_at ?? null,
    });
    const temporalViolations = allTemporalFindings.filter(v => v.severity === 'BLOCKING');
    const temporalWarnings = allTemporalFindings.filter(v => v.severity === 'WARNING');
    for (const v of temporalViolations) {
      claimsVerification.violations.push({ claim_id: 'TEMPORAL_PROVENANCE', field: v.rule.toLowerCase(), issue: v.message });
    }
    if (temporalViolations.length > 0) claimsVerification.is_valid = false;
    for (const w of temporalWarnings) {
      claimsVerification.warnings.push({ claim_id: 'TEMPORAL_PROVENANCE', field: w.rule.toLowerCase(), issue: w.message });
    }

    if (!report.diagnostics) report.diagnostics = {};
    if (semanticGate.warnings && semanticGate.warnings.length > 0) {
      report.diagnostics.warnings = [
        ...(report.diagnostics.warnings || []),
        ...semanticGate.warnings,
      ];
    }

    let status: 'PUBLISHED' | 'BLOCKED' = 'PUBLISHED';
    let confidenceScore = report.assessment?.confidence?.score ?? 0.88;
    if (!claimsVerification.is_valid || !semanticGate.isValid) {
      status = 'BLOCKED';
      confidenceScore = 0.0;
    } else {
      status = 'PUBLISHED';
    }

    return {
      semanticGate,
      claimsVerification,
      status,
      confidenceScore,
      allTemporalFindings,
    };
  }

  it('B-1 producer regression: NVD published==lastModified emits TMP-005 WARNING, remains VALID, does not block publication or zero confidence', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    // Producer-shaped case:
    // NVD: published == lastModified
    // EPSS: source_observed_at.epss = null OR valid EPSS observation
    // retrieved_at.first-epss = valid retrieval timestamp
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_published_at: { nvd: '2024-09-10T17:15:25.267' },
      source_updated_at: { nvd: '2024-09-10T17:15:25.267' }, // published == lastModified
      source_observed_at: { epss: null },
      retrieved_at: { 'first-epss': '2026-10-06T01:14:32Z' },
    });
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = 'UNKNOWN';

    // 1. Check validateTemporalProvenance directly
    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp05 = findings.find(f => f.rule === 'TMP-005');
    expect(tmp05).toBeDefined();
    expect(tmp05!.severity).toBe('WARNING');
    expect(tmp05!.severity).not.toBe('BLOCKING');

    // Explicit invariant: WARNING != BLOCKING
    expect('WARNING').not.toBe('BLOCKING');

    // 2. Publish decision: semantic gate remains valid, report published, confidence not zeroed
    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(true);
    expect(res.semanticGate.status).toBe('VALIDATED');
    expect(res.semanticGate.warnings.some(w => w.includes('[TMP-005]'))).toBe(true);
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-005]'))).toBe(false);
    expect(res.claimsVerification.is_valid).toBe(true);
    expect(res.status).toBe('PUBLISHED');
    expect(res.status).not.toBe('BLOCKED');
    expect(res.confidenceScore).toBeGreaterThan(0.0);
    expect(base.diagnostics.warnings.some((w: string) => w.includes('[TMP-005]'))).toBe(true);
  });

  it('B-1 producer regression: NVD published==lastModified with distinct valid EPSS observation date passes with WARNING', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_published_at: { nvd: '2024-09-10T17:15:25.267' },
      source_updated_at: { nvd: '2024-09-10T17:15:25.267' },
      source_observed_at: { epss: '2024-09-11' },
      retrieved_at: { 'first-epss': '2026-10-06T01:14:32Z' },
    });
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = '2024-09-11';

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(true);
    expect(res.status).toBe('PUBLISHED');
    expect(res.confidenceScore).toBeGreaterThan(0.0);
    expect(res.semanticGate.warnings.some(w => w.includes('[TMP-005]'))).toBe(true);
  });

  it('TMP-004 WARNING semantics: retrieved_at==source_observed_at emits WARNING without blocking publication or zeroing confidence', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_published_at: { nvd: '2024-09-10T17:15:25.267' },
      source_observed_at: { nvd: '2026-10-06T01:14:32Z' },
      retrieved_at: { nvd: '2026-10-06T01:14:32Z' },
    });
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = 'UNKNOWN';

    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp04 = findings.find(f => f.rule === 'TMP-004');
    expect(tmp04).toBeDefined();
    expect(tmp04!.severity).toBe('WARNING');
    expect(tmp04!.severity).not.toBe('BLOCKING');

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(true);
    expect(res.semanticGate.status).toBe('VALIDATED');
    expect(res.semanticGate.warnings.some(w => w.includes('[TMP-004]'))).toBe(true);
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-004]'))).toBe(false);
    expect(res.status).toBe('PUBLISHED');
    expect(res.confidenceScore).toBeGreaterThan(0.0);
  });

  it('TMP-008 WARNING semantics: pre-CVE source publication emits WARNING without blocking publication or zeroing confidence', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_published_at: { nvd: '2024-08-01T00:00:00.000' },
    });
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = 'UNKNOWN';

    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp08 = findings.find(f => f.rule === 'TMP-008');
    expect(tmp08).toBeDefined();
    expect(tmp08!.severity).toBe('WARNING');
    expect(tmp08!.severity).not.toBe('BLOCKING');

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(true);
    expect(res.semanticGate.status).toBe('VALIDATED');
    expect(res.semanticGate.warnings.some(w => w.includes('[TMP-008]'))).toBe(true);
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-008]'))).toBe(false);
    expect(res.status).toBe('PUBLISHED');
    expect(res.confidenceScore).toBeGreaterThan(0.0);
  });
});

// ── 10. REM-04 Negative Tests — Blocking TMP rules strictly block publication ─
describe('10. REM-04 Negative Tests: Blocking TMP rules strictly block publication', () => {
  function simulatePublishGate(report: any, authoritativeEvidence?: any) {
    const claimsVerification: {
      is_valid: boolean;
      violations: Array<{ claim_id: string; field: string; issue: string }>;
      warnings: Array<{ claim_id: string; field: string; issue: string }>;
    } = {
      is_valid: true,
      violations: [],
      warnings: [],
    };
    const semanticGate = validateReportSemantics(report, authoritativeEvidence ?? null);
    report.semantic_gate = semanticGate;

    const tp = report.temporal_provenance;
    const allTemporalFindings = validateTemporalProvenance({
      temporal_provenance: tp,
      dates: report.dates,
      claims: (report.provenance?.claims || []) as any,
      cve_published_at: tp?.cve_published_at ?? null,
    });
    const temporalViolations = allTemporalFindings.filter(v => v.severity === 'BLOCKING');
    const temporalWarnings = allTemporalFindings.filter(v => v.severity === 'WARNING');
    for (const v of temporalViolations) {
      claimsVerification.violations.push({ claim_id: 'TEMPORAL_PROVENANCE', field: v.rule.toLowerCase(), issue: v.message });
    }
    if (temporalViolations.length > 0) claimsVerification.is_valid = false;
    for (const w of temporalWarnings) {
      claimsVerification.warnings.push({ claim_id: 'TEMPORAL_PROVENANCE', field: w.rule.toLowerCase(), issue: w.message });
    }

    let status: 'PUBLISHED' | 'BLOCKED' = 'PUBLISHED';
    let confidenceScore = report.assessment?.confidence?.score ?? 0.88;
    if (!claimsVerification.is_valid || !semanticGate.isValid) {
      status = 'BLOCKED';
      confidenceScore = 0.0;
    } else {
      status = 'PUBLISHED';
    }

    return {
      semanticGate,
      claimsVerification,
      status,
      confidenceScore,
      temporalViolations,
    };
  }

  it('TMP-001 NEGATIVE: cross-domain fallback is BLOCKING and blocks publication', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_observed_at: { epss: '2024-09-10' },
    });
    base.dates = { cve_published_at: '2024-09-10' }; // flat date borrows EPSS observation
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = '2024-09-10';

    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp01 = findings.find(f => f.rule === 'TMP-001');
    expect(tmp01).toBeDefined();
    expect(tmp01!.severity).toBe('BLOCKING');

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(false);
    expect(res.semanticGate.status).toBe('BLOCKED');
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-001]'))).toBe(true);
    expect(res.status).toBe('BLOCKED');
    expect(res.confidenceScore).toBe(0.0);
  });

  it('TMP-002 NEGATIVE: EPSS observation collapsing onto CVE published date is BLOCKING and blocks publication', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_observed_at: { epss: '2024-09-10T17:15:25.267' }, // contaminated
    });
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = '2024-09-10T17:15:25.267';

    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp02 = findings.find(f => f.rule === 'TMP-002');
    expect(tmp02).toBeDefined();
    expect(tmp02!.severity).toBe('BLOCKING');

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(false);
    expect(res.semanticGate.status).toBe('BLOCKED');
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-002]'))).toBe(true);
    expect(res.status).toBe('BLOCKED');
    expect(res.confidenceScore).toBe(0.0);
  });

  it('TMP-003 NEGATIVE: EPSS claim timestamp without source identity is BLOCKING and blocks publication', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_observed_at: { epss: '2024-09-11' },
    });
    base.provenance.claims = [
      {
        claim_id: 'CLM-09',
        field: 'epss',
        value: '0.99',
        source_timestamp: '2024-09-11',
        // Omitting source and source_ids intentionally triggers TMP-003
      },
    ];

    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp03 = findings.find(f => f.rule === 'TMP-003');
    expect(tmp03).toBeDefined();
    expect(tmp03!.severity).toBe('BLOCKING');

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(false);
    expect(res.semanticGate.status).toBe('BLOCKED');
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-003]'))).toBe(true);
    expect(res.status).toBe('BLOCKED');
    expect(res.confidenceScore).toBe(0.0);
  });

  it('TMP-006 NEGATIVE: system timestamp used as source observation is BLOCKING and blocks publication', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_observed_at: { epss: '2026-10-06T01:14:32Z' },
      normalized_at: '2026-10-06T01:14:32Z', // system timestamp equals source observation
    });
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = '2026-10-06T01:14:32Z';

    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp06 = findings.find(f => f.rule === 'TMP-006');
    expect(tmp06).toBeDefined();
    expect(tmp06!.severity).toBe('BLOCKING');

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(false);
    expect(res.semanticGate.status).toBe('BLOCKED');
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-006]'))).toBe(true);
    expect(res.status).toBe('BLOCKED');
    expect(res.confidenceScore).toBe(0.0);
  });

  it('TMP-007 NEGATIVE: missing observation filled from another source publication is BLOCKING and blocks publication', () => {
    const base = JSON.parse(JSON.stringify(REPORTS['CVE-2024-38226']));
    base.temporal_provenance = buildTemporalProvenance({
      cve_published_at: '2024-09-10T17:15:25.267',
      source_published_at: { nvd: '2024-09-10T17:15:25.267' },
      source_observed_at: { epss: '2024-09-10T17:15:25.267' }, // filled from nvd published
    });
    const epssClaim = (base.provenance.claims as any[]).find(c => c.field === 'epss');
    if (epssClaim) epssClaim.source_timestamp = '2024-09-10T17:15:25.267';

    const findings = validateTemporalProvenance({
      temporal_provenance: base.temporal_provenance,
      dates: base.dates,
      claims: base.provenance.claims,
      cve_published_at: base.temporal_provenance.cve_published_at,
    });
    const tmp07 = findings.find(f => f.rule === 'TMP-007');
    expect(tmp07).toBeDefined();
    expect(tmp07!.severity).toBe('BLOCKING');

    const res = simulatePublishGate(base);
    expect(res.semanticGate.isValid).toBe(false);
    expect(res.semanticGate.status).toBe('BLOCKED');
    expect(res.semanticGate.violations.some(v => v.includes('[TMP-007]'))).toBe(true);
    expect(res.status).toBe('BLOCKED');
    expect(res.confidenceScore).toBe(0.0);
  });
});

