/**
 * M11 — Deterministic Infrastructure Correlation Engine Tests
 *
 * 28 required scenarios, synthetic values, novel holdout identities.
 * No real actor/campaign/family names anywhere.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import { correlateInfrastructure } from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  Observation,
  MalwareClaim,
  MalwareConfiguration,
  InfrastructureRelationship,
  EvidenceRef,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m11_holdout_001';
const AT = '2026-09-20T21:00:00.000Z';

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m11_holdout',
    identity_key: `sha256:${'c5'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m11_holdout.bin'],
    hashes: { sha256: 'c5'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: AT },
  };
}

function evidence(id: string, kind: 'STATIC' | 'DYNAMIC' | 'RESEARCH' = 'STATIC'): EvidenceRef[] {
  return [
    { evidence_id: id, source_id: 'src_m11_analyzer', source_snapshot_id: RUN_ID, kind, authority_tier: 'TIER_1', reliability: 'A', credibility: '2', retrieved_at: AT },
  ];
}

function prov(refs: EvidenceRef[]) {
  return {
    evidence_refs: refs,
    source_ids: [...new Set(refs.map((e) => e.source_id))],
    authority_tier: 'TIER_1' as const,
    snapshot_ids: [RUN_ID],
    derived_at: AT,
  };
}

function makeClaim(partial: Partial<MalwareClaim> & { claim_id: string }): MalwareClaim {
  const ev = partial.evidence_refs ?? evidence(`ev_${partial.claim_id}`);
  return {
    claim_id: partial.claim_id,
    analysis_run_id: RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m11_holdout',
    subject_id: 'art_m11_holdout',
    predicate: partial.predicate ?? 'COMMUNICATES_WITH',
    object_value: partial.object_value ?? {},
    statement: 'synthetic claim',
    status: partial.status ?? 'SOURCE_REPORTED',
    evidence_refs: ev,
    provenance: partial.provenance ?? prov(ev),
  };
}

function makeConfig(partial: Partial<MalwareConfiguration> & { configuration_id: string }): MalwareConfiguration {
  const ev = partial.evidence_refs ?? evidence(`ev_${partial.configuration_id}`);
  return {
    configuration_id: partial.configuration_id,
    analysis_run_id: RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m11_holdout',
    config_type: partial.config_type ?? 'embedded_config',
    attributes: partial.attributes ?? {},
    status: partial.status ?? 'DERIVED',
    evidence_refs: ev,
    provenance: partial.provenance ?? prov(ev),
  };
}

const corr = (
  inputs: { claims?: MalwareClaim[]; configurations?: MalwareConfiguration[]; observations?: Observation[] },
  existing?: InfrastructureRelationship[]
) =>
  correlateInfrastructure({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    ...inputs,
    existing_relationships: existing,
    correlated_at: AT,
  });

function processorSource(): string {
  return readFileSync('packages/intelligence/src/malware/canonical/infrastructureCorrelation.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

// ── Tests ────────────────────────────────────────────────────────

describe('M11 — basic correlation', () => {
  it('1. valid domain evidence → infrastructure relationship', () => {
    const r = corr({ configurations: [makeConfig({ configuration_id: 'cfg_dom', attributes: { c2_domain: 'Zqx_Holdout_9x7.example' } })] });
    expect(r.rejected_inputs).toHaveLength(0);
    expect(r.new_relationships).toHaveLength(1);
    expect(r.new_relationships[0].indicator_type).toBe('OTHER');
    expect(r.new_relationships[0].indicator_value).toBe('Zqx_Holdout_9x7.example');
  });

  it('2. valid ip evidence → infrastructure relationship', () => {
    const r = corr({ claims: [makeClaim({ claim_id: 'clm_ip', object_value: { host: '198.51.100.7' } })] });
    expect(r.new_relationships).toHaveLength(1);
    expect(r.new_relationships[0].indicator_type).toBe('IPV4');
    expect(r.new_relationships[0].role).toBe('C2'); // COMMUNICATES_WITH claim
  });

  it('3. valid url evidence → infrastructure relationship', () => {
    const r = corr({ configurations: [makeConfig({ configuration_id: 'cfg_url', attributes: { gate: 'http://198.51.100.7:8443/gate' } })] });
    expect(r.new_relationships).toHaveLength(1);
    expect(r.new_relationships[0].indicator_type).toBe('URL');
  });

  it('4. mutex/pipe/value evidence → relationship via the existing OTHER vocabulary', () => {
    const r = corr({
      configurations: [makeConfig({ configuration_id: 'cfg_mutex', attributes: { mutex: 'Global\\M11HoldoutMutex', pipe: '\\\\.\\pipe\\M11Pipe' } })],
    });
    expect(r.new_relationships).toHaveLength(2);
    expect(r.new_relationships.every((x) => x.indicator_type === 'OTHER')).toBe(true);
  });
});

describe('M11 — evidence and ownership gates', () => {
  it('5. missing evidence → rejection', () => {
    const r = corr({ claims: [makeClaim({ claim_id: 'clm_noev', evidence_refs: [] })] });
    expect(r.new_relationships).toHaveLength(0);
    expect(r.rejected_inputs[0].reason_code).toBe('no_evidence');
  });

  it('6. invalid provenance → rejection', () => {
    const r = corr({
      claims: [makeClaim({ claim_id: 'clm_badprov', provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [], derived_at: AT } })],
    });
    expect(r.rejected_inputs[0].reason_code).toBe('invalid_provenance');
  });

  it('7/28. artifact mismatch → rejection (foreign evidence never attached)', () => {
    const foreignClaim = makeClaim({ claim_id: 'clm_foreign', artifact_id: 'art_m11_other_zz3' });
    const r = corr({ claims: [foreignClaim] });
    expect(r.rejected_inputs[0].reason_code).toBe('input_artifact_mismatch');
    expect(r.new_relationships).toHaveLength(0);
    const foreignCfg = makeConfig({ configuration_id: 'cfg_foreign', artifact_id: 'art_m11_other_zz3' });
    const r2 = corr({ configurations: [foreignCfg] });
    expect(r2.rejected_inputs[0].reason_code).toBe('input_artifact_mismatch');
  });

  it('non-positive status → rejection (absence never becomes infrastructure)', () => {
    const r = corr({ claims: [makeClaim({ claim_id: 'clm_unknown', status: 'UNKNOWN' })] });
    expect(r.rejected_inputs[0].reason_code).toBe('non_positive_status');
    const r2 = corr({ claims: [makeClaim({ claim_id: 'clm_cando', status: 'CAN_DO' })] });
    expect(r2.rejected_inputs[0].reason_code).toBe('non_positive_status');
  });

  it('no supported value → rejection (no empty relationships)', () => {
    const r = corr({ claims: [makeClaim({ claim_id: 'clm_empty', object_value: { count: 3, flag: true } })] });
    expect(r.rejected_inputs[0].reason_code).toBe('no_supported_value');
  });
});

describe('M11 — value fidelity', () => {
  it('8. exact-value preservation (no defang/case/port/path/encoding rewrite)', () => {
    const value = 'HtTp://Zqx-Holdout.EXAMPLE:8443/Gate_Path?Q=1';
    const r = corr({ configurations: [makeConfig({ configuration_id: 'cfg_exact', attributes: { url: value } })] });
    expect(r.new_relationships[0].indicator_value).toBe(value);
    expect(r.new_relationships[0].indicator_value).not.toBe(value.toLowerCase());
  });
});

describe('M11 — dedup and idempotency', () => {
  const domClaim = () => makeClaim({ claim_id: 'clm_dom', object_value: { domain: 'Zqx_Shared.example' } });

  it('9. existing relationship prevents duplicate', () => {
    const first = corr({ claims: [domClaim()] });
    const second = corr({ claims: [domClaim()] }, first.new_relationships);
    expect(second.new_relationships).toHaveLength(0);
    expect(second.skipped_inputs).toHaveLength(1);
    expect(second.skipped_inputs[0].reason).toBe('duplicate_of_existing_relationship');
  });

  it('10. duplicate evidence does not create duplicate relationship (same evidence via two claims)', () => {
    const a = domClaim();
    const b = { ...domClaim(), claim_id: 'clm_dom_b' };
    const r = corr({ claims: [a, b] });
    expect(r.new_relationships).toHaveLength(1);
    expect(r.skipped_inputs.some((s) => s.reason === 'duplicate_in_batch')).toBe(true);
  });

  it('27. repeated processing is idempotent', () => {
    const inputs = {
      claims: [domClaim(), makeClaim({ claim_id: 'clm_ip2', object_value: { host: '198.51.100.9' } })],
      configurations: [makeConfig({ configuration_id: 'cfg_m', attributes: { mutex: 'M11Mutex' } })],
    };
    const first = corr(inputs);
    const second = corr(inputs, first.new_relationships);
    expect(second.new_relationships).toHaveLength(0);
    expect(second.rejected_inputs).toHaveLength(0);
  });
});

describe('M11 — determinism', () => {
  const inputs = () => ({
    claims: [makeClaim({ claim_id: 'clm_a', object_value: { host: '198.51.100.11' } })],
    configurations: [makeConfig({ configuration_id: 'cfg_a', attributes: { domain: 'Zqx_Order.example' } })],
  });

  it('11/12. deterministic identity and shuffled input order → equivalent result', () => {
    const r1 = corr(inputs());
    const r2 = corr(inputs());
    expect(r1).toEqual(r2);
    const shuffled = corr({
      configurations: [makeConfig({ configuration_id: 'cfg_a', attributes: { domain: 'Zqx_Order.example' } })],
      claims: [makeClaim({ claim_id: 'clm_a', object_value: { host: '198.51.100.11' } })],
    });
    expect(shuffled.new_relationships.map((x) => x.infrastructure_id))
      .toEqual(r1.new_relationships.map((x) => x.infrastructure_id));
  });

  it('no caller mutation', () => {
    const claims = [makeClaim({ claim_id: 'clm_mut', object_value: { host: '198.51.100.12' } })];
    const before = JSON.stringify(claims);
    corr({ claims });
    expect(JSON.stringify(claims)).toBe(before);
  });
});

describe('M11 — cross-artifact sharing', () => {
  const shared = 'Zqx_Shared_Inf.example';
  const artifactA = makeArtifact();
  const artifactB: Artifact = { ...makeArtifact(), artifact_id: 'art_m11_holdout_b', file_names: ['b.bin'] };
  const claimA = () => makeClaim({ claim_id: 'clm_a', object_value: { domain: shared } });
  const claimB = () => makeClaim({ claim_id: 'clm_b', artifact_id: 'art_m11_holdout_b', object_value: { domain: shared } });

  it('13. two artifacts sharing exact infrastructure → each carries its own relationship with the same exact value', () => {
    const ra = correlateInfrastructure({ analysis_run_id: RUN_ID, artifact: artifactA, claims: [claimA()], correlated_at: AT });
    const rb = correlateInfrastructure({ analysis_run_id: RUN_ID, artifact: artifactB, claims: [claimB()], correlated_at: AT });
    expect(ra.new_relationships).toHaveLength(1);
    expect(rb.new_relationships).toHaveLength(1);
    expect(ra.new_relationships[0].indicator_value).toBe(shared);
    expect(rb.new_relationships[0].indicator_value).toBe(shared);
    // Distinct edges per artifact — no fabricated cross-artifact node type.
    expect(ra.new_relationships[0].infrastructure_id).not.toBe(rb.new_relationships[0].infrastructure_id);
  });

  it('14/15/16. shared infrastructure creates no family/actor/campaign attribution', () => {
    const out = JSON.stringify(corr({ claims: [claimA()] }));
    expect(out.includes('family')).toBe(false);
    expect(out.includes('actor')).toBe(false);
    expect(out.includes('campaign')).toBe(false);
    expect(out.includes('attribution')).toBe(false);
  });
});

describe('M11 — boundaries', () => {
  it('17. fuzzy/substring similarity does not correlate (exact-match identity only)', () => {
    const first = corr({ claims: [makeClaim({ claim_id: 'clm_x1', object_value: { domain: 'Zqx_Base.example' } })] });
    // Superset/similar-but-distinct value gets its own identity — and the
    // relationship identity is value-exact, so no correlation occurred.
    const second = corr({ claims: [makeClaim({ claim_id: 'clm_x2', object_value: { domain: 'Zqx_Base.example.evil' } })] }, first.new_relationships);
    // A distinct value is never correlated with the original — it forms its
    // own identity (exact-match only, no similarity merge).
    expect(second.skipped_inputs).toHaveLength(0);
    // Identical value through different evidence is a legitimately distinct
    // relationship identity (rule 14 includes evidence identity) — but it is
    // a NEW relationship, never a fuzzy merge of the first.
    const third = corr({ claims: [makeClaim({ claim_id: 'clm_x3', object_value: { domain: 'Zqx_Base.example' } })] }, first.new_relationships);
    expect(third.new_relationships).toHaveLength(1);
    expect(third.new_relationships[0].infrastructure_id).not.toBe(first.new_relationships[0].infrastructure_id);
  });

  it('18-21. family result / behaviors / claims / observations are never modified (engine returns relationships only)', () => {
    const r = corr({
      claims: [makeClaim({ claim_id: 'clm_f', object_value: { host: '198.51.100.13' } })],
    });
    const out = JSON.stringify(r);
    expect(out.includes('resolved_family')).toBe(false);
    expect(out.includes('family_candidate')).toBe(false);
    expect(out.includes('behavior_id')).toBe(false);
    expect(out.includes('claim_id')).toBe(false);
    expect(out.includes('observation_id')).toBe(false);
    expect(out.includes('modality')).toBe(false);
  });

  it('22. no confidence/reputation score anywhere', () => {
    const out = JSON.stringify(corr({ claims: [makeClaim({ claim_id: 'clm_s', object_value: { host: '198.51.100.14' } })] }));
    expect(out.includes('"HIGH"')).toBe(false);
    expect(out.includes('reputation')).toBe(false);
    expect(out.includes('risk_score')).toBe(false);
  });

  it('23/24. no external lookup + no hardcoded intelligence (comment-stripped source scan)', () => {
    const src = processorSource();
    for (const pat of [
      'CVE-', 'sha256 ===', 'hash ===', 'family ===', 'malware ===', 'sample ===', 'artifact_id ===',
      'domain ===', 'ip ===', 'url ===', 'actor', 'campaign', 'WannaCry', 'RedLine', 'Emotet', 'Ryuk',
      'LockBit', 'Mirai', 'ATT&CK', 'MBC', "'HIGH'", "'MEDIUM'", "'LOW'",
      'fetch(', 'Date.now', 'Math.random', 'randomUUID', 'whois', 'database', 'queue',
    ]) {
      expect(src.includes(pat)).toBe(false);
    }
  });

  it('25/26. novel holdout artifact + novel values work without hardcoded mapping', () => {
    const r = corr({
      configurations: [makeConfig({
        configuration_id: 'cfg_zz9',
        attributes: { zqx_domain: 'Zqx_Novel_3f1.invalid', zqx_host: '203.0.113.77', zqx_url: 'http://203.0.113.77/zqx' },
      })],
    });
    expect(r.rejected_inputs).toHaveLength(0);
    expect(r.new_relationships).toHaveLength(3);
    expect(r.new_relationships.map((x) => x.indicator_type).sort()).toEqual(['IPV4', 'OTHER', 'URL']);
  });
});
