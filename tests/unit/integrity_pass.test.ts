import { describe, it, expect } from 'bun:test';
import {
  calculateQualityMetrics,
  verifyMetricsConsistency,
  verifyClaimsLedger,
} from '../../packages/intelligence/src/sources/adapters';

// ── INTEGRITY RULE 1: One source of truth for claim counts ──────────────────
describe('Integrity Rule 1 — exhaustive epistemic accounting', () => {
  it('classifies every epistemic state explicitly; classes sum to total_claims', () => {
    const claims = [
      { truth_type: 'SOURCE_FACT', verification_status: 'VERIFIED' },
      { truth_type: 'SOURCE_DERIVED', verification_status: 'VERIFIED' },
      { truth_type: 'KNOWLEDGE_SUPPORTED_INFERENCE', verification_status: 'VERIFIED' },
      { truth_type: 'MODEL_INFERENCE' },
      { truth_type: 'SUPPORTED_INFERENCE' }, // must no longer be silently ignored
      { truth_type: 'UNKNOWN' },
      { truth_type: 'NOT_AVAILABLE' },
      { truth_type: 'CONFLICT' },
    ];

    const m = calculateQualityMetrics(claims);
    expect(m.total_claims).toBe(8);
    expect(m.source_fact_claims).toBe(1);
    expect(m.derived_claims).toBe(2); // SOURCE_DERIVED + KNOWLEDGE_SUPPORTED_INFERENCE
    expect(m.inference_claims).toBe(2); // MODEL_INFERENCE + SUPPORTED_INFERENCE (KSI counts as derived/supported)
    expect(m.unknown_claims).toBe(1); // UNKNOWN only — NOT_AVAILABLE is its own exclusive class
    expect(m.not_available_claims).toBe(1);
    expect(m.conflict_claims).toBe(1);
    expect(m.unclassified_claims).toBe(0);
    // Contract preserved: KSI counts as supported
    expect(m.supported_claims).toBe(3);
    expect(m.validated_claims).toBe(3);
    // Core invariant: mutually exclusive classes sum to total
    expect(
      m.source_fact_claims + m.derived_claims + m.inference_claims +
      m.unknown_claims + m.conflict_claims + m.not_available_claims
    ).toBe(m.total_claims);
    expect(verifyMetricsConsistency(m)).toEqual([]);
  });

  it('flags an unclassifiable epistemic state instead of silently absorbing it', () => {
    const m = calculateQualityMetrics([
      { truth_type: 'SOURCE_FACT' },
      { truth_type: 'BRAND_NEW_STATE' } as any,
    ]);
    expect(m.unclassified_claims).toBe(1);
    expect(verifyMetricsConsistency(m).length).toBeGreaterThan(0);
  });

  it('rejects inconsistent metrics via the fail-closed consistency gate', () => {
    const broken = {
      source_coverage_ratio: 1, unknown_ratio: 0, inference_ratio: 0,
      conflict_count: 0, total_claims: 31, supported_claims: 27,
      source_fact_claims: 20, derived_claims: 2, inference_claims: 3,
      unknown_claims: 1, conflict_claims: 0, not_available_claims: 1,
      validated_claims: 31,
    };
    expect(verifyMetricsConsistency(broken).length).toBeGreaterThan(0);
  });
});

// ── INTEGRITY RULE 2: Evidence ID / source binding ──────────────────────────
describe('Integrity Rule 2 — claim/evidence source binding', () => {
  const evidenceIndex = new Map<string, { source?: string; source_id?: string }>([
    ['evi_x_kev', { source: 'CISA KEV', source_id: 'cisa-kev' }],
    ['evi_x_advisory', { source: 'Vendor Advisory', source_id: 'vendor-advisory' }],
  ]);

  it('FAILS a vendor-advisory claim that binds CISA KEV evidence (cross-source)', () => {
    const claims = [{
      id: 'CLM-30', claim_id: 'CLM-30', field: 'technical_mechanism',
      value: 'unauthenticated access', truth_type: 'SOURCE_FACT', confidence: 1.0,
      source: 'Vendor Advisory', source_ids: ['vendor-advisory'], evidence_scope: 'CVE' as const,
      verification_status: 'VERIFIED' as const, evidence_ids: ['evi_x_kev'],
    }];

    const result = verifyClaimsLedger(claims as any, 'CVE-2026-85706', null, evidenceIndex);
    expect(result.is_valid).toBe(false);
    expect(result.violations.some(v => v.issue.includes('Evidence/source mismatch'))).toBe(true);
  });

  it('PASSES a vendor-advisory claim bound to vendor-advisory evidence (correct lineage)', () => {
    const claims = [{
      id: 'CLM-05', claim_id: 'CLM-05', field: 'fixed_versions',
      value: '19.3.2', truth_type: 'SOURCE_FACT', confidence: 1.0,
      source: 'Vendor Advisory Bulletin', source_ids: ['vendor-advisory'], evidence_scope: 'PRODUCT' as const,
      verification_status: 'VERIFIED' as const, evidence_ids: ['evi_x_advisory'],
    }];

    const result = verifyClaimsLedger(claims as any, 'CVE-2026-85706', null, evidenceIndex);
    expect(result.is_valid).toBe(true);
    expect(result.verified_claims).toBe(1);
  });

  it('FAILS a claim referencing evidence that does not exist', () => {
    const claims = [{
      id: 'CLM-10', claim_id: 'CLM-10', field: 'exploitation',
      value: 'Active exploitation', truth_type: 'SOURCE_FACT', confidence: 1.0,
      source: 'CISA KEV', source_ids: ['cisa-kev'], evidence_scope: 'CVE' as const,
      verification_status: 'VERIFIED' as const, evidence_ids: ['evi_x_ghost'],
    }];

    const result = verifyClaimsLedger(claims as any, 'CVE-2026-85706', null, evidenceIndex);
    expect(result.is_valid).toBe(false);
    expect(result.violations.some(v => v.issue.includes("does not exist in the evidence index"))).toBe(true);
  });
});
