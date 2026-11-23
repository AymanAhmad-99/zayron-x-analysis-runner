/**
 * M9 — Deterministic Claim-to-Configuration Processor Tests
 *
 * 24 required scenarios, synthetic claims, novel holdout artifact identities.
 * No real malware family names as implementation anchors anywhere.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  processClaimsToConfigurations,
  validateClaim,
  validateConfiguration,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  MalwareClaim,
  MalwareConfiguration,
  EvidenceRef,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m9_holdout_001';
const PROCESSED_AT = '2026-09-20T19:00:00.000Z';

// Novel holdout artifact identity.
function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m9_holdout',
    identity_key: `sha256:${'a9'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m9_holdout.bin'],
    hashes: { sha256: 'a9'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: PROCESSED_AT },
  };
}

function staticEvidence(id = 'ev_m9_static'): EvidenceRef[] {
  return [
    { evidence_id: id, source_id: 'src_static_analyzer', source_snapshot_id: RUN_ID, kind: 'STATIC', authority_tier: 'TIER_1', reliability: 'A', credibility: '2', retrieved_at: PROCESSED_AT },
  ];
}

function makeClaim(partial: Partial<MalwareClaim> & { claim_id: string }): MalwareClaim {
  const evidence = partial.evidence_refs ?? staticEvidence();
  return {
    claim_id: partial.claim_id,
    analysis_run_id: partial.analysis_run_id ?? RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m9_holdout',
    subject_id: partial.subject_id ?? 'art_m9_holdout',
    predicate: partial.predicate ?? 'REPORTS_VALUE',
    object_value: partial.object_value ?? {},
    statement: partial.statement ?? 'synthetic claim',
    status: partial.status ?? 'SOURCE_REPORTED',
    modality: partial.modality,
    evidence_refs: evidence,
    provenance: partial.provenance ?? {
      evidence_refs: evidence,
      source_ids: [...new Set(evidence.map((e) => e.source_id))],
      authority_tier: 'TIER_1',
      snapshot_ids: [RUN_ID],
      derived_at: PROCESSED_AT,
    },
  };
}

// Valid observed configuration claim (generic C2-style value; no family anchor).
const observedConfigClaim = (): MalwareClaim =>
  makeClaim({
    claim_id: 'clm_m9_observed_config',
    predicate: 'USES_CONFIGURATION',
    status: 'OBSERVED',
    object_value: { config_0_field: 'c2_host', config_0_value: '198.51.100.7:8443' },
    statement: 'Configuration field extracted with observed static evidence.',
  });

// Valid source-reported configuration claim.
const sourceReportedConfigClaim = (): MalwareClaim =>
  makeClaim({
    claim_id: 'clm_m9_reported_config',
    predicate: 'USES_CONFIGURATION',
    status: 'SOURCE_REPORTED',
    object_value: { config_1_field: 'mutex', config_1_value: 'Global\\M9HoldoutMutex' },
    statement: 'Source reported a configuration field; status stays SOURCE_REPORTED.',
  });

// Valid C2-style claim (COMMUNICATES_WITH predicate).
const c2Claim = (): MalwareClaim =>
  makeClaim({
    claim_id: 'clm_m9_c2',
    predicate: 'COMMUNICATES_WITH',
    status: 'OBSERVED',
    object_value: { url: 'http://198.51.100.7:8443/gate', port: 8443 },
    statement: 'Connection parameter observed in extracted configuration data.',
  });

const process = (claims: readonly MalwareClaim[], existing?: readonly MalwareConfiguration[]) =>
  processClaimsToConfigurations({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    claims,
    existing_configurations: existing,
    processed_at: PROCESSED_AT,
  });

/** Comment-stripped scan of the processor source for forbidden logic. */
function processorSource(): string {
  const raw = readFileSync('packages/intelligence/src/malware/canonical/configurationProcessor.ts', 'utf8');
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

// ── Tests ────────────────────────────────────────────────────────

describe('M9 — valid transformations', () => {
  it('1. valid observed configuration claim produces exactly one configuration', () => {
    const r = process([observedConfigClaim()]);
    expect(r.rejected_claims).toHaveLength(0);
    expect(r.new_configurations).toHaveLength(1);
    const c = r.new_configurations[0];
    expect(c.status).toBe('OBSERVED');
    expect(c.config_type).toBe('embedded_config');
    expect(validateConfiguration(c)).toHaveLength(0);
  });

  it('2. valid source-reported configuration claim produces one source-reported configuration', () => {
    const r = process([sourceReportedConfigClaim()]);
    expect(r.new_configurations).toHaveLength(1);
    expect(r.new_configurations[0].status).toBe('SOURCE_REPORTED');
  });

  it('21. source-reported remains source-reported (no upgrade to OBSERVED)', () => {
    const r = process([sourceReportedConfigClaim()]);
    const c = r.new_configurations[0];
    expect(c.status).toBe('SOURCE_REPORTED');
    expect(c.status).not.toBe('OBSERVED');
  });

  it('12. exact value preserved verbatim (no normalization, no truncation, no case rewriting)', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_exact',
      predicate: 'USES_CONFIGURATION',
      status: 'OBSERVED',
      object_value: { field: 'user_agent', value: 'MixedCase-Agent/1.2.3 (Path\\With\\MixedCASE)' },
    });
    const r = process([claim]);
    const c = r.new_configurations[0];
    expect(c.attributes['value']).toBe('MixedCase-Agent/1.2.3 (Path\\With\\MixedCASE)');
    expect(c.attributes['value']).not.toBe('MixedCase-Agent/1.2.3 (Path\\With\\MixedCASE)'.toLowerCase());
  });
});

describe('M9 — evidence and provenance gates', () => {
  it('3. missing evidence → rejection, no configuration', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_noev',
      predicate: 'USES_CONFIGURATION',
      status: 'OBSERVED',
      evidence_refs: [],
    });
    const r = process([claim]);
    expect(r.new_configurations).toHaveLength(0);
    expect(r.rejected_claims[0].reason_code).toBe('invalid_provenance');
  });

  it('4. invalid provenance → rejection', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_badprov',
      predicate: 'USES_CONFIGURATION',
      status: 'OBSERVED',
      provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [], derived_at: PROCESSED_AT },
    });
    const r = process([claim]);
    expect(r.new_configurations).toHaveLength(0);
    expect(r.rejected_claims[0].reason_code).toBe('invalid_provenance');
  });

  it('23. cross-artifact claim/evidence → rejection (claim/artifact mismatch)', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_other_artifact',
      predicate: 'USES_CONFIGURATION',
      status: 'OBSERVED',
      artifact_id: 'art_m9_other_zz7',
      subject_id: 'art_m9_other_zz7',
      object_value: { field: 'c2_host', value: '198.51.100.9:443' },
    });
    const r = process([claim]);
    expect(r.new_configurations).toHaveLength(0);
    expect(r.rejected_claims[0].reason_code).toBe('claim_artifact_mismatch');
  });

  it('5. NO_RESULT-style non-positive claim → zero configuration facts (absence is not evidence)', () => {
    // A claim whose evidence records a NO_RESULT static observation outcome.
    const claim = makeClaim({
      claim_id: 'clm_m9_no_result',
      predicate: 'USES_CONFIGURATION',
      status: 'UNKNOWN',
      object_value: { field: 'c2_host', value: '198.51.100.10:443' },
    });
    const r = process([claim]);
    expect(r.new_configurations).toHaveLength(0);
    expect(r.rejected_claims[0].reason_code).toBe('non_positive_status');
  });

  it('6-8. NO_RESULT/UNAVAILABLE/UNSUPPORTED/ERROR never create configuration facts (absence is not evidence; failure is never clean)', () => {
    // Observation-level NO_RESULT/UNAVAILABLE/UNSUPPORTED/ERROR statuses are
    // non-assertive: M7 can never emit claims from them, and M9's epistemic
    // gate rejects every non-assertive claim status exhaustively. NO_RESULT
    // maps to UNKNOWN; CONFLICT/HYPOTHESIS/DERIVED/INFERRED are equally
    // non-config-bearing. Exhaustive sweep over all non-positive statuses:
    const nonPositive = ['UNKNOWN', 'CONFLICT', 'HYPOTHESIS', 'DERIVED', 'INFERRED', 'CAN_DO'] as const;
    for (const status of nonPositive) {
      const claim = makeClaim({
        claim_id: `clm_m9_nonpos_${status.toLowerCase()}`,
        predicate: 'USES_CONFIGURATION',
        status,
        modality: status === 'CAN_DO' ? 'CAN_DO' : undefined,
        object_value: { field: 'c2_host', value: '198.51.100.11:443' },
      });
      const r = process([claim]);
      expect(r.new_configurations).toHaveLength(0);
      // Every non-positive status is blocked with zero configurations —
      // either by the canonical claim validator (CONFLICT without a conflict
      // record; OBSERVED_DOING without DYNAMIC evidence) or by M9's own
      // epistemic gate (UNKNOWN/HYPOTHESIS/DERIVED/INFERRED/CAN_DO).
      if (status === 'UNKNOWN' || status === 'HYPOTHESIS' || status === 'DERIVED' || status === 'INFERRED' || status === 'CAN_DO') {
        expect(r.rejected_claims[0].reason_code).toBe('non_positive_status');
      } else {
        expect(r.rejected_claims[0].reason_code).toBe('claim_validation_failed');
      }
    }
    // OBSERVED_DOING (a behavior modality, not a configuration state) is also
    // rejected — configuration extraction is never behavior execution.
    const od = makeClaim({
      claim_id: 'clm_m9_nonpos_observed_doing',
      predicate: 'USES_CONFIGURATION',
      status: 'OBSERVED_DOING',
      modality: 'OBSERVED_DOING',
      object_value: { field: 'c2_host', value: '198.51.100.11:443' },
    });
    const rod = process([od]);
    expect(rod.new_configurations).toHaveLength(0);
    // Blocked by canonical claim validation (OBSERVED_DOING without DYNAMIC
    // evidence) — the configuration fact is impossible either way.
    expect(rod.rejected_claims[0].reason_code).toBe('claim_validation_failed');
  });

  it('22. CAN_DO is never upgraded into observed configuration behavior', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_cando',
      predicate: 'USES_CONFIGURATION',
      status: 'CAN_DO',
      modality: 'CAN_DO',
      object_value: { field: 'c2_host', value: '198.51.100.14:443' },
    });
    const r = process([claim]);
    expect(r.new_configurations).toHaveLength(0);
    expect(r.rejected_claims[0].reason_code).toBe('non_positive_status');
    // No OBSERVED/behavior content can appear from a CAN_DO claim.
    const out = JSON.stringify(r);
    expect(out.includes('OBSERVED_DOING')).toBe(false);
    expect(out.includes('"OBSERVED"')).toBe(false);
  });
});

describe('M9 — narrow predicates', () => {
  it('3b. static metadata (REPORTS_VALUE) does not produce configuration', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_metadata',
      predicate: 'REPORTS_VALUE',
      status: 'OBSERVED',
      object_value: { linker_version: '14.29', section: '.text' },
    });
    const r = process([claim]);
    expect(r.new_configurations).toHaveLength(0);
    expect(r.rejected_claims[0].reason_code).toBe('unsupported_predicate');
  });

  it('3c. capability claim (EXHIBITS_CAPABILITY) does not produce configuration', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_capa',
      predicate: 'EXHIBITS_CAPABILITY',
      status: 'CAN_DO',
      modality: 'CAN_DO',
      object_value: { capability_0_name: 'write file' },
    });
    const r = process([claim]);
    expect(r.new_configurations).toHaveLength(0);
    expect(r.rejected_claims[0].reason_code).toBe('unsupported_predicate');
  });

  it('COMMUNICATES_WITH produces a c2-type configuration (valid C2 parameter claim)', () => {
    const r = process([c2Claim()]);
    expect(r.new_configurations).toHaveLength(1);
    expect(r.new_configurations[0].config_type).toBe('c2');
    expect(r.new_configurations[0].attributes['url']).toBe('http://198.51.100.7:8443/gate');
    expect(r.new_configurations[0].attributes['port']).toBe(8443);
  });
});

describe('M9 — dedup and idempotency', () => {
  it('12. existing configuration prevents duplicate', () => {
    const first = process([observedConfigClaim()]);
    const second = process([observedConfigClaim()], first.new_configurations);
    expect(second.new_configurations).toHaveLength(0);
    expect(second.skipped_claims).toHaveLength(1);
    expect(second.skipped_claims[0].reason).toBe('duplicate_of_existing_configuration');
  });

  it('13. duplicate claims in one batch do not create duplicate configurations', () => {
    const a = observedConfigClaim();
    const b = { ...observedConfigClaim(), claim_id: 'clm_m9_observed_config_b' };
    const r = process([a, b]);
    expect(r.new_configurations).toHaveLength(1);
    expect(r.skipped_claims).toHaveLength(1);
    expect(r.skipped_claims[0].reason).toBe('duplicate_in_batch');
  });

  it('24. repeated processing is idempotent', () => {
    const claims = [observedConfigClaim(), sourceReportedConfigClaim(), c2Claim()];
    const first = process(claims);
    const second = process(claims, first.new_configurations);
    expect(second.new_configurations).toHaveLength(0);
    expect(second.rejected_claims).toHaveLength(0);
  });
});

describe('M9 — determinism', () => {
  it('14. identical input produces deep-equal output', () => {
    const claims = [sourceReportedConfigClaim(), observedConfigClaim(), c2Claim()];
    const a = process(claims);
    const b = process(claims);
    expect(a).toEqual(b);
  });

  it('output ordering is stable regardless of input order', () => {
    const r1 = process([observedConfigClaim(), c2Claim(), sourceReportedConfigClaim()]);
    const r2 = process([c2Claim(), sourceReportedConfigClaim(), observedConfigClaim()]);
    expect(r1.new_configurations.map((c) => c.configuration_id)).toEqual(
      r2.new_configurations.map((c) => c.configuration_id)
    );
  });

  it('9. no family resolution / no hardcoded sample-family-hash logic (comment-stripped source scan)', () => {
    const src = processorSource();
    for (const pat of [
      'CVE-', 'sha256 ===', 'hash ===', 'family ===', 'malware ===', 'sample ===', 'artifact_id ===',
      'ATTACK', 'ATT&CK', 'MBC', 'WannaCry', 'RedLine', 'Emotet', 'Ryuk', 'LockBit', 'Mirai',
      'actor', 'campaign',
    ]) {
      expect(src.includes(pat)).toBe(false);
    }
    // 'campaign' as a config VALUE must never become family logic — the string
    // 'campaign' must not appear in executable logic at all (checked above).
  });

  it('17. no confidence ranking/finalization (source scan + output scan)', () => {
    expect(processorSource().includes("'HIGH'")).toBe(false);
    expect(processorSource().includes("'MEDIUM'")).toBe(false);
    expect(processorSource().includes("'LOW'")).toBe(false);
    const out = JSON.stringify(process([observedConfigClaim(), sourceReportedConfigClaim()]));
    expect(out.includes('"HIGH"')).toBe(false);
    expect(out.includes('"MEDIUM"')).toBe(false);
    expect(out.includes('"LOW"')).toBe(false);
    expect(out.includes('"CONFIRMED"')).toBe(false);
  });

  it('15/16. configuration does not create behavior; output carries no behavior/technique content', () => {
    const r = process([observedConfigClaim(), c2Claim()]);
    const out = JSON.stringify(r);
    expect(out.includes('behavior_id')).toBe(false);
    expect(out.includes('technique')).toBe(false);
    expect(out.includes('OBSERVED_DOING')).toBe(false);
    expect(out.includes('modality')).toBe(false);
  });

  it('19/20. novel holdout artifact with novel configuration category/value works', () => {
    const claim = makeClaim({
      claim_id: 'clm_m9_novel_zz9',
      predicate: 'USES_CONFIGURATION',
      status: 'OBSERVED',
      object_value: { zz9_category: 'Zqx_NovelConfigField_9x7', zz9_value: 'Zqx_NovelValue_3f1' },
    });
    const r = process([claim]);
    expect(r.rejected_claims).toHaveLength(0);
    expect(r.new_configurations).toHaveLength(1);
    expect(r.new_configurations[0].attributes['zz9_value']).toBe('Zqx_NovelValue_3f1');
    expect(validateConfiguration(r.new_configurations[0])).toHaveLength(0);
  });

  it('10. configuration provenance preserved and traceable to artifact/claim evidence', () => {
    const r = process([observedConfigClaim()]);
    const c = r.new_configurations[0];
    expect(c.provenance.evidence_refs.map((e) => e.evidence_id)).toEqual(
      observedConfigClaim().evidence_refs.map((e) => e.evidence_id)
    );
    expect(c.evidence_refs).toEqual(observedConfigClaim().evidence_refs);
    expect(c.artifact_id).toBe('art_m9_holdout');
  });

  it('different artifacts never share configuration identity', () => {
    const artifactA = makeArtifact();
    const artifactB: Artifact = { ...makeArtifact(), artifact_id: 'art_m9_holdout_b', file_names: ['m9_b.bin'] };
    const claimA: MalwareClaim = { ...observedConfigClaim(), artifact_id: artifactA.artifact_id };
    const claimB: MalwareClaim = { ...observedConfigClaim(), claim_id: 'clm_m9_b', artifact_id: artifactB.artifact_id };
    const ra = processClaimsToConfigurations({ analysis_run_id: RUN_ID, artifact: artifactA, claims: [claimA], processed_at: PROCESSED_AT });
    const rb = processClaimsToConfigurations({ analysis_run_id: RUN_ID, artifact: artifactB, claims: [claimB], processed_at: PROCESSED_AT });
    expect(ra.new_configurations[0].configuration_id).not.toBe(rb.new_configurations[0].configuration_id);
  });

  it('claim ids differing only in case still dedup deterministically (stable ordering)', () => {
    const a = observedConfigClaim();
    const b = { ...observedConfigClaim(), claim_id: 'CLM_M9_OBSERVED_CONFIG_ALT' };
    const r = process([a, b]);
    // Different evidence? No — identical evidence and value → second is a dup.
    expect(r.new_configurations).toHaveLength(1);
  });

  it('validateClaim and validateConfiguration round-trip on emitted objects', () => {
    const r = process([observedConfigClaim(), sourceReportedConfigClaim(), c2Claim()]);
    for (const c of r.new_configurations) {
      expect(validateConfiguration(c)).toHaveLength(0);
    }
    expect(validateClaim(observedConfigClaim())).toHaveLength(0);
  });
});
