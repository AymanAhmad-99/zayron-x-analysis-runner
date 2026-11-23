import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeClaimMetrics,
  calculateQualityMetrics,
  formatClaimMetricBasis,
  verifyClaimMetricConsistency,
} from '../../packages/intelligence/src/sources/adapters';

import goldenFive from '../fixtures/phase1_golden_five_reports.json';
import persistedFixture from '../fixtures/phase2_golden_five_reconciliation.json';

const REPORTS = (goldenFive as any).reports as Record<string, any>;
const PERSISTED = (persistedFixture as any).reports as Record<string, any>;
const CVES = Object.keys(REPORTS);
/** The forensic-audit supported counts (per-report), which the UI previously masked with a
 *  hardcoded 27. These are the authoritative expectations for the Golden Five. */
const EXPECTED_SUPPORTED: Record<string, number> = {
  'CVE-2022-23227': 18,
  'CVE-2024-20767': 24,
  'CVE-2024-45519': 26,
  'CVE-2024-38226': 23,
  'CVE-2024-43572': 24,
};

const claimsOf = (cve: string) => REPORTS[cve].provenance.claims as any[];
const clone = (x: any) => JSON.parse(JSON.stringify(x));
const SUPPORTING = ['SOURCE_FACT', 'SOURCE_DERIVED', 'KNOWLEDGE_SUPPORTED_INFERENCE'];

const apiSource = readFileSync(join(import.meta.dir, '..', '..', 'workers', 'api', 'src', 'index.ts'), 'utf8');
const uiSource = readFileSync(join(import.meta.dir, '..', '..', 'apps', 'web', 'app', 'components', 'VulnerabilityDetail.tsx'), 'utf8');
const adaptersSource = readFileSync(join(import.meta.dir, '..', '..', 'packages', 'intelligence', 'src', 'sources', 'adapters.ts'), 'utf8');

describe('PHASE 2 — CANONICAL CLAIM-COUNT RECONCILIATION', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ONE canonical computation (INV-C01, INV-C02, INV-C03)
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Canonical ClaimMetrics computation', () => {
    it('exists exactly once in the intelligence package (INV-C01)', () => {
      const defs = adaptersSource.match(/export function computeClaimMetrics\(/g) || [];
      expect(defs.length).toBe(1);
    });

    it('is deterministic: identical input yields identical metrics', () => {
      for (const cve of CVES) {
        const a = computeClaimMetrics(claimsOf(cve));
        const b = computeClaimMetrics(claimsOf(cve));
        expect(b).toEqual(a);
      }
    });

    it('SUPPORTED = SOURCE_FACT + SOURCE_DERIVED + KNOWLEDGE_SUPPORTED_INFERENCE (INV-C02)', () => {
      for (const cve of CVES) {
        const claims = claimsOf(cve);
        const m = computeClaimMetrics(claims);
        const manual = claims.filter((c: any) => SUPPORTING.includes(c.truth_type)).length;
        expect(m.supported_claims).toBe(manual);
        expect(m.total_claims).toBe(claims.length);
      }
    });

    it('VALIDATED is the verification result and stays semantically DISTINCT from supported (INV-C03)', () => {
      for (const cve of CVES) {
        const claims = claimsOf(cve);
        const m = computeClaimMetrics(claims);
        expect(m.validated_claims).toBe(claims.filter((c: any) => c.verification_status === 'VERIFIED').length);
      }
      // A ledger where the two semantics differ must not be normalised together.
      const divergent = [
        { truth_type: 'SOURCE_FACT', verification_status: 'UNSUPPORTED' },
        { truth_type: 'UNKNOWN', verification_status: 'VERIFIED' },
      ];
      const m = computeClaimMetrics(divergent);
      expect(m.supported_claims).toBe(1);
      expect(m.validated_claims).toBe(1);
      expect(m.total_claims).toBe(2);
    });

    it('accounts exhaustively: every truth_type bucket + unclassified === total', () => {
      for (const cve of CVES) {
        const m = computeClaimMetrics(claimsOf(cve));
        const bucketSum = Object.values(m.by_truth_type).reduce((a, b) => a + b, 0);
        expect(bucketSum + m.unclassified_claims).toBe(m.total_claims);
        expect(m.unclassified_claims).toBe(0);
      }
    });

    it('never silently absorbs an unknown truth_type into a real class', () => {
      const m = computeClaimMetrics([
        { truth_type: 'SOURCE_FACT', verification_status: 'VERIFIED' },
        { truth_type: 'TOTALLY_UNKNOWN_TYPE', verification_status: 'VERIFIED' },
      ]);
      expect(m.unclassified_claims).toBe(1);
      expect(m.supported_claims).toBe(1); // the bogus type is NOT counted as support
      expect(m.total_claims).toBe(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Legacy projection is a pure function of the canonical metric (INV-C05)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. calculateQualityMetrics is a compatibility projection only', () => {
    it('derives every field from ClaimMetrics — no independent counting', () => {
      for (const cve of CVES) {
        const claims = claimsOf(cve);
        const m = computeClaimMetrics(claims);
        const qm = calculateQualityMetrics(claims);
        expect(qm.total_claims).toBe(m.total_claims);
        expect(qm.supported_claims).toBe(m.supported_claims);
        expect(qm.validated_claims).toBe(m.validated_claims);
        expect(qm.source_fact_claims).toBe(m.by_truth_type.SOURCE_FACT);
        expect(qm.derived_claims).toBe(m.by_truth_type.SOURCE_DERIVED + m.by_truth_type.KNOWLEDGE_SUPPORTED_INFERENCE);
        expect(qm.inference_claims).toBe(m.by_truth_type.MODEL_INFERENCE + m.by_truth_type.SUPPORTED_INFERENCE);
        expect(qm.conflict_claims).toBe(m.by_truth_type.CONFLICT);
        expect(qm.unknown_claims).toBe(m.by_truth_type.UNKNOWN);
        expect(qm.not_available_claims).toBe(m.by_truth_type.NOT_AVAILABLE);
        expect(qm.unclassified_claims).toBe(0);
      }
    });

    it('produces identical output for the SAME canonical input (no drift between surfaces)', () => {
      for (const cve of CVES) {
        expect(calculateQualityMetrics(claimsOf(cve))).toEqual(calculateQualityMetrics(clone(claimsOf(cve))));
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Canonical basis formatter is byte-identical to persisted reports
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. formatClaimMetricBasis (confidence basis)', () => {
    it('reproduces the persisted confidence basis fragment for every Golden Five report', () => {
      for (const cve of CVES) {
        const fragment = formatClaimMetricBasis(computeClaimMetrics(claimsOf(cve)));
        const basis = PERSISTED[cve].persisted_confidence.basis as string;
        expect(basis).toContain(fragment);
      }
    });

    it('reads counts from the canonical object and performs no independent arithmetic', () => {
      const m = computeClaimMetrics([{ truth_type: 'SOURCE_FACT', verification_status: 'VERIFIED' }, { truth_type: 'UNKNOWN' }]);
      expect(formatClaimMetricBasis(m)).toBe('1/2 evidence-supported claims (1 source facts, 0 inference, 1/2 passed verification)');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Deterministic rejection of inconsistent metrics (INV-C09) — COUNT-V1..V6
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Claim-metric reconciliation gate', () => {
    const canonical = (): ReturnType<typeof computeClaimMetrics> => computeClaimMetrics(claimsOf('CVE-2024-20767'));
    const consistent = () => ({
      canonical: canonical(),
      report_supported: canonical().supported_claims,
      report_validated: canonical().validated_claims,
      confidence_supported: canonical().supported_claims,
      ledger_total: canonical().total_claims,
    });

    it('passes when every surface agrees', () => {
      expect(verifyClaimMetricConsistency(consistent())).toEqual([]);
    });

    it('COUNT-V1 — report supported count differing from canonical is rejected', () => {
      const v = verifyClaimMetricConsistency({ ...consistent(), report_supported: canonical().supported_claims + 1 });
      expect(v.length).toBe(1);
      expect(v[0]).toContain('report supported count');
    });

    it('COUNT-V2 — confidence supported count differing from canonical is rejected', () => {
      const v = verifyClaimMetricConsistency({ ...consistent(), confidence_supported: canonical().supported_claims - 1 });
      expect(v.some(x => x.includes('confidence supported count'))).toBe(true);
    });

    it('COUNT-V3 — ledger total differing from canonical is rejected', () => {
      const v = verifyClaimMetricConsistency({ ...consistent(), ledger_total: canonical().total_claims + 5 });
      expect(v.some(x => x.includes('ledger total count'))).toBe(true);
    });

    it('COUNT-V4 — report validated count differing from canonical is rejected', () => {
      const v = verifyClaimMetricConsistency({ ...consistent(), report_validated: canonical().validated_claims - 1 });
      expect(v.some(x => x.includes('report validated count'))).toBe(true);
    });

    it('COUNT-V5 — absent surfaces are skipped, never assumed equal and never defaulted', () => {
      const v = verifyClaimMetricConsistency({ canonical: canonical() });
      expect(v).toEqual([]);
      // Absence must NOT be treated as agreement with an invented number.
      expect(verifyClaimMetricConsistency({ canonical: canonical(), report_supported: undefined })).toEqual([]);
      expect(verifyClaimMetricConsistency({ canonical: canonical(), report_supported: 27 }).length).toBe(1);
    });

    it('COUNT-V6 — validated != supported is NOT normalised away (each surface checks its own semantics)', () => {
      const c = canonical();
      expect(c.validated_claims).not.toBe(c.supported_claims);
      // Both semantics agree with their own correct surfaces → consistent.
      expect(verifyClaimMetricConsistency({
        canonical: c,
        report_supported: c.supported_claims,
        report_validated: c.validated_claims,
      })).toEqual([]);
    });

    it('rejects a canonical whose ledger_row_count diverges from total_claims', () => {
      const c = canonical();
      const mutated = { ...c, ledger_row_count: c.total_claims + 1 };
      expect(verifyClaimMetricConsistency({ canonical: mutated }).length).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Mutation probes (BEFORE disagreed / AFTER detected)
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Mutation probes on real Golden Five structures', () => {
    it('BEFORE: the legacy hardcoded UI projection (27) contradicted the canonical count', () => {
      const c = computeClaimMetrics(claimsOf('CVE-2024-20767'));
      expect(c.supported_claims).toBe(24);
      const legacyDisplay = 27;
      const v = verifyClaimMetricConsistency({ canonical: c, report_supported: legacyDisplay });
      expect(v.length).toBe(1); // exactly the historical defect — now detected
    });

    it('AFTER: each mutated surface is detected deterministically', () => {
      for (const cve of CVES) {
        const c = computeClaimMetrics(claimsOf(cve));
        const base = { canonical: c, report_supported: c.supported_claims, confidence_supported: c.supported_claims, ledger_total: c.total_claims };
        expect(verifyClaimMetricConsistency(base)).toEqual([]);
        expect(verifyClaimMetricConsistency({ ...base, report_supported: c.supported_claims + 1 }).length).toBeGreaterThan(0);
        expect(verifyClaimMetricConsistency({ ...base, confidence_supported: c.supported_claims + 2 }).length).toBeGreaterThan(0);
        expect(verifyClaimMetricConsistency({ ...base, ledger_total: c.total_claims - 1 }).length).toBeGreaterThan(0);
      }
    });

    it('mutating the canonical claim set changes the metric (the metric is not a constant)', () => {
      const claims = clone(claimsOf('CVE-2022-23227'));
      const before = computeClaimMetrics(claims);
      claims[0].truth_type = 'UNKNOWN';
      const after = computeClaimMetrics(claims);
      expect(after.supported_claims).toBe(before.supported_claims - 1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Golden Five cross-surface reconciliation (INV-C04..C07, GATE-13)
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Golden Five — report, ledger and confidence all agree with canonical', () => {
    for (const cve of CVES) {
      it(`${cve}: canonical metrics reconcile with persisted surfaces`, () => {
        const c = computeClaimMetrics(claimsOf(cve));
        const p = PERSISTED[cve];

        // Report projection (quality_metrics)
        expect(p.persisted_quality_metrics.supported_claims).toBe(c.supported_claims);
        expect(p.persisted_quality_metrics.total_claims).toBe(c.total_claims);
        expect(p.persisted_quality_metrics.validated_claims).toBe(c.validated_claims);

        // Ledger (claims_verification)
        expect(p.persisted_claims_verification.total_claims).toBe(c.total_claims);
        expect(p.persisted_claims_verification.verified_count).toBe(c.validated_claims);

        // Confidence consumed the canonical supported count (INV-C04)
        const ac = p.persisted_confidence.analysis_confidence;
        const derived = Number((c.supported_claims / c.total_claims).toFixed(2));
        expect(ac === 0.5 || ac === derived).toBe(true);

        // The metric matches the forensic-audit expectation, not the masked constant.
        expect(c.supported_claims).toBe(EXPECTED_SUPPORTED[cve]);
        expect(p.legacy_ui_displayed_supported).toBe(27);
      });
    }

    it('all five reports exercise the SAME canonical contract (INV-C10)', () => {
      const values = CVES.map(cve => computeClaimMetrics(claimsOf(cve)).supported_claims);
      expect(values).toEqual([18, 24, 26, 23, 24]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Source wiring — consumers use canonical, no magic fallbacks (INV-C04..C08)
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. Wiring of canonical metrics into API and UI', () => {
    it('API computes the canonical metric once from the authoritative ledger', () => {
      expect(apiSource.match(/const claimMetrics = computeClaimMetrics\(/g)?.length).toBe(1);
    });

    it('API confidence basis consumes the canonical formatter (no duplicated template)', () => {
      expect(apiSource).toContain('${formatClaimMetricBasis(claimMetrics)}');
      expect(apiSource).not.toContain('evidence-supported claims (${qualityMetrics.source_fact_claims}');
    });

    it('API analysis confidence consumes the canonical supported count (INV-C04)', () => {
      expect(apiSource).toContain('claimMetrics.supported_claims / claimMetrics.total_claims');
      expect(apiSource).not.toContain('qualityMetrics.supported_claims / qualityMetrics.total_claims');
    });

    it('API publishes a fail-closed count-reconciliation gate (INV-C09)', () => {
      expect(apiSource).toContain('verifyClaimMetricConsistency({');
      expect(apiSource).toContain("claim_id: 'CLAIM_METRICS'");
    });

    it('API persists and projects the canonical metric (INV-C06)', () => {
      expect(apiSource).toContain('claim_metrics: claimMetrics');
      expect(apiSource).toContain('claim_metrics: claimMetrics,');
      expect(apiSource).toContain('storedBreakdown.claim_metrics = readClaimMetrics');
    });

    it('UI consumes the canonical metric and contains NO magic count fallback (INV-C07, INV-C08)', () => {
      expect(uiSource).toContain('claim_metrics');
      expect(uiSource).toContain('supportedClaims');
      expect(uiSource).not.toContain('?? 27');
      expect(uiSource).not.toContain('?? 31');
      expect(uiSource).not.toContain('|| 31');
      expect(uiSource).not.toContain('cv.supported_claims');
    });
  });
});
