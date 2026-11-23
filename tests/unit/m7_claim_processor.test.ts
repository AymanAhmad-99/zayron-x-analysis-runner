/**
 * M7 — Deterministic Evidence-to-Claim Processor Tests
 *
 * 18 required scenarios, novel holdout artifact identities, synthetic
 * observations. No WannaCry/RedLine/etc. anchors anywhere.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  processEvidenceToClaims,
  runStaticAnalysis,
  buildProvenance,
  validateClaim,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  Observation,
  EvidenceRef,
  MalwareClaim,
  ExternalToolRunner,
  ToolAvailabilityReport,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m7_holdout_001';
const PROCESSED_AT = '2026-09-20T16:00:00.000Z';

// Novel holdout artifact identity.
function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m7_holdout',
    identity_key: `sha256:${'d7'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m7_holdout.bin'],
    hashes: { sha256: 'd7'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: PROCESSED_AT },
  };
}

function staticEvidence(): EvidenceRef[] {
  return [
    {
      evidence_id: 'ev_m7_static_test',
      source_id: 'src_static_analyzer',
      source_snapshot_id: RUN_ID,
      kind: 'STATIC',
      authority_tier: 'TIER_1',
      reliability: 'A',
      credibility: '2',
      retrieved_at: PROCESSED_AT,
    },
  ];
}

function makeObservation(partial: Partial<Observation> & { observation_id: string; attributes: Record<string, string | number | boolean | null> }): Observation {
  const evidence = partial.evidence_refs ?? staticEvidence();
  return {
    observation_id: partial.observation_id,
    analysis_run_id: partial.analysis_run_id ?? RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m7_holdout',
    source: partial.source ?? 'STATIC_ANALYSIS',
    observation_type: partial.observation_type ?? 'entropy',
    attributes: partial.attributes,
    observed_at: PROCESSED_AT,
    evidence_refs: evidence,
    provenance: partial.provenance ?? buildProvenance(evidence, PROCESSED_AT),
  };
}

// ── Real observation streams via existing analyzers ─────────────

function buildPe(fill: 'low_entropy' | 'high_entropy'): Uint8Array {
  const dosHeader = new Uint8Array(0x40);
  dosHeader[0] = 0x4d;
  dosHeader[1] = 0x5a;
  const peOff = 0x80;
  new DataView(dosHeader.buffer).setUint32(0x3c, peOff, true);
  const optSize = 112 + 16 * 8;
  const headerSize = peOff + 24 + optSize + 40;
  const pe = new Uint8Array(headerSize + 1024);
  pe.set(dosHeader, 0);
  pe[peOff] = 0x50; pe[peOff + 1] = 0x45;
  const pdv = new DataView(pe.buffer);
  pdv.setUint16(peOff + 4, 0x8664, true);
  pdv.setUint16(peOff + 6, 1, true);
  pdv.setUint16(peOff + 20, optSize, true);
  const opt = peOff + 24;
  pdv.setUint16(opt, 0x20b, true);
  pdv.setUint32(opt + 16, 0x1000, true);
  pe[opt + 2] = 14; pe[opt + 3] = 29;
  const st = opt + optSize;
  pe.subarray(st, st + 8).set(new TextEncoder().encode('.text'));
  pdv.setUint32(st + 8, 0x10, true);
  pdv.setUint32(st + 16, 0x200, true);
  pdv.setUint32(st + 20, headerSize, true);
  for (let i = headerSize; i < pe.length; i++) {
    if (fill === 'low_entropy') pe[i] = 0x43;
    else {
      // deterministic pseudo-random
      pe[i] = (i * 131 + 17) & 0xff;
    }
  }
  return pe;
}

function staticObs(bytes: Uint8Array): Observation[] {
  return runStaticAnalysis({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    rawBytes: bytes,
    analyzed_at: PROCESSED_AT,
  }).observations;
}

function stub(tool: 'yara-x' | 'floss' | 'capa' | 'lief', run: ExternalToolRunner['run']): ExternalToolRunner {
  return { descriptor: { tool_id: tool, display_name: tool, version: '3.0.0-stub' }, supported_formats: ['PE', 'ELF'], run };
}
const allAvail: ToolAvailabilityReport = {
  generated_at: PROCESSED_AT,
  environment: 'bun-test',
  tools: (['yara-x', 'floss', 'capa', 'lief'] as const).map((t) => ({ tool_id: t, available: true, version: '3.0.0-stub', probe: `${t} present` })),
};

function toolObs(bytes: Uint8Array, runners: ExternalToolRunner[]): Observation[] {
  return runStaticAnalysis({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    rawBytes: bytes,
    analyzed_at: PROCESSED_AT,
    tools: runners,
    toolAvailability: allAvail,
  }).observations.filter((o) => o.observation_type === 'tool_analysis');
}

const process = (observations: readonly Observation[], existing?: readonly MalwareClaim[]) =>
  processEvidenceToClaims({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    observations,
    existing_claims: existing,
    processed_at: PROCESSED_AT,
  });

// ── Tests ────────────────────────────────────────────────────────

describe('M7 — valid claim generation', () => {
  it('1. valid static observation produces a factual claim', () => {
    const obs = staticObs(buildPe('low_entropy'));
    const result = process(obs);
    // imports_exports + packing_indicators + embedded_objects are NO_RESULT on
    // this input → correctly rejected as non-positive (rule 2); the other 4
    // yield claims.
    expect(result.rejected_observations).toHaveLength(3);
    expect(result.new_claims.length).toBe(4);
    const binaryMeta = result.new_claims.find((c) => c.object_value.detected_format === 'PE');
    expect(binaryMeta).toBeDefined();
    expect(binaryMeta!.predicate).toBe('REPORTS_VALUE');
    expect(binaryMeta!.status).toBe('DERIVED');
    expect(binaryMeta!.object_value.architecture).toBe('x86_64');
    // provenance traceable to artifact/observation/source/evidence
    expect(binaryMeta!.provenance.evidence_refs.length).toBeGreaterThan(0);
    expect(binaryMeta!.provenance.source_ids).toContain('src_static_analyzer');
    expect(binaryMeta!.artifact_id).toBe('art_m7_holdout');
  });

  it('2. valid YARA observation produces a narrow match claim only', () => {
    const yaraRunner = stub('yara-x', () => ({
      status: 'OBSERVED',
      output: { kind: 'yara', matches: [{ rule: 'M7_Novel_Rule_XYZ', namespace: 'test', meta: {} }] },
    }));
    const result = process(toolObs(buildPe('low_entropy'), [yaraRunner]));
    expect(result.new_claims).toHaveLength(1);
    const claim = result.new_claims[0];
    expect(claim.predicate).toBe('REPORTS_VALUE');
    // M14.3.1: analyzer-executed findings are computed from the artifact
    // (DERIVED + STATIC), never SOURCE_REPORTED — that state is reserved for
    // values actually reported by an external source/report.
    expect(claim.status).toBe('DERIVED');
    expect(claim.object_value.match_0_rule).toBe('M7_Novel_Rule_XYZ');
    // narrow: no family/actor/campaign/behavior/technique content
    const json = JSON.stringify(claim).toLowerCase();
    for (const w of ['family', 'actor', 'campaign', 'attack', 't1486', 'mbc', 'behavior_claim']) {
      expect(json.includes(w)).toBe(false);
    }
  });

  it('3. FLOSS observation produces a narrow string-evidence claim', () => {
    const flossRunner = stub('floss', () => ({
      status: 'OBSERVED',
      output: { kind: 'floss', strings: { stack: [], decoded: ['https://m7.invalid/x'], tight: [] }, total_extracted: 1 },
    }));
    const result = process(toolObs(buildPe('low_entropy'), [flossRunner]));
    expect(result.new_claims).toHaveLength(1);
    // M14.3.1 provenance correction: FLOSS evidence is DERIVED, not SOURCE_REPORTED.
    expect(result.new_claims[0].status).toBe('DERIVED');
    expect(result.new_claims[0].object_value.decoded_string_count).toBe(1);
    expect(result.new_claims[0].predicate).toBe('REPORTS_VALUE');
  });

  it('4. capa result yields CAN_DO capability claim, never OBSERVED_DOING', () => {
    const capaRunner = stub('capa', () => ({
      status: 'OBSERVED',
      output: { kind: 'capa', capabilities: [{ name: 'write file', address: null, source_rule: null }] },
    }));
    const result = process(toolObs(buildPe('low_entropy'), [capaRunner]));
    expect(result.new_claims).toHaveLength(1);
    const claim = result.new_claims[0];
    expect(claim.predicate).toBe('EXHIBITS_CAPABILITY');
    expect(claim.status).toBe('CAN_DO');
    expect(claim.modality).toBe('CAN_DO');
    expect(validateClaim(claim)).toHaveLength(0);
    const json = JSON.stringify(result);
    expect(json).not.toContain('"OBSERVED_DOING"');
  });

  it('18. static metadata never produces behavioral claims', () => {
    const obs = staticObs(buildPe('high_entropy'));
    const result = process(obs);
    for (const c of result.new_claims) {
      expect(c.predicate).not.toBe('EXHIBITS_BEHAVIOR');
      expect(c.status).not.toBe('OBSERVED_DOING');
      const json = JSON.stringify(c).toLowerCase();
      for (const w of ['executed', 'persistence', 'c2', 'credential', 'ransomware', 'keylogging', 'process injection']) {
        expect(json.includes(w)).toBe(false);
      }
    }
  });
});

describe('M7 — non-positive statuses never become claims', () => {
  const cases: Array<[string, string]> = [
    ['NO_RESULT', '5. NO_RESULT'],
    ['UNAVAILABLE', '6. UNAVAILABLE'],
    ['UNSUPPORTED', '7. UNSUPPORTED'],
    ['ERROR', '8. ERROR'],
  ];
  for (const [status, label] of cases) {
    it(`${label} produces zero factual claims (explicit rejection)`, () => {
      const obs = makeObservation({
        observation_id: `obs_m7_${status.toLowerCase()}`,
        observation_type: 'entropy',
        attributes: { analysis_status: status, overall_entropy: 0.5 },
      });
      const result = process([obs]);
      expect(result.new_claims).toHaveLength(0);
      expect(result.rejected_observations).toHaveLength(1);
      expect(result.rejected_observations[0].reason_code).toBe('non_positive_status');
    });
  }
});

describe('M7 — safety rejections', () => {
  it('9. missing provenance/evidence → rejection, no claim', () => {
    const obs = makeObservation({
      observation_id: 'obs_m7_noproof',
      attributes: { analysis_status: 'OBSERVED' },
      evidence_refs: [],
      provenance: buildProvenance([], PROCESSED_AT),
    });
    const result = process([obs]);
    expect(result.new_claims).toHaveLength(0);
    expect(result.rejected_observations[0].reason_code).toBe('observation_missing_evidence');
  });

  it('10. observation/artifact mismatch → rejection, no claim', () => {
    const obs = makeObservation({
      observation_id: 'obs_m7_foreign',
      artifact_id: 'art_some_other_artifact',
      attributes: { analysis_status: 'OBSERVED' },
    });
    const result = process([obs]);
    expect(result.new_claims).toHaveLength(0);
    expect(result.rejected_observations[0].reason_code).toBe('observation_artifact_mismatch');
  });

  it('unsupported observation type is rejected explicitly, never fabricated', () => {
    const obs = makeObservation({
      observation_id: 'obs_m7_unknown_type',
      observation_type: 'sensor_network_flow',
      attributes: { analysis_status: 'OBSERVED' },
    });
    const result = process([obs]);
    expect(result.new_claims).toHaveLength(0);
    expect(result.rejected_observations[0].reason_code).toBe('unsupported_observation_type');
  });

  it('artifact identity missing → all observations rejected', () => {
    const result = processEvidenceToClaims({
      analysis_run_id: RUN_ID,
      artifact: { ...makeArtifact(), artifact_id: '' },
      observations: [makeObservation({ observation_id: 'obs_m7_x', attributes: { analysis_status: 'OBSERVED' } })],
      processed_at: PROCESSED_AT,
    });
    expect(result.new_claims).toHaveLength(0);
    expect(result.rejected_observations).toHaveLength(1);
    expect(result.rejected_observations[0].reason_code).toBe('artifact_identity_missing');
  });
});

describe('M7 — dedup and determinism', () => {
  it('11. duplicate observation (same evidence+content) produces no duplicate claim', () => {
    const obs = makeObservation({ observation_id: 'obs_m7_dup', attributes: { analysis_status: 'OBSERVED', overall_entropy: 0.5 } });
    const clone = { ...obs, observation_id: 'obs_m7_dup_clone' }; // same evidence + content, different id
    const result = process([obs, clone]);
    expect(result.new_claims).toHaveLength(1);
    expect(result.skipped_observations).toHaveLength(1);
    expect(result.skipped_observations[0].reason).toBe('duplicate_evidence_in_batch');
  });

  it('12. existing claim prevents duplicate claim (idempotent reprocessing)', () => {
    const obs = staticObs(buildPe('low_entropy'));
    const first = process(obs);
    expect(first.new_claims.length).toBeGreaterThan(0);
    const second = process(obs, first.new_claims);
    expect(second.new_claims).toHaveLength(0);
    expect(second.skipped_observations).toHaveLength(first.new_claims.length);
    expect(second.skipped_observations.every((s) => s.reason === 'duplicate_of_existing_claim')).toBe(true);
  });

  it('13. identical input produces deterministic output', () => {
    const obs = staticObs(buildPe('low_entropy')).concat(
      toolObs(buildPe('low_entropy'), [
        stub('yara-x', () => ({ status: 'OBSERVED', output: { kind: 'yara', matches: [] } })),
        stub('capa', () => ({ status: 'OBSERVED', output: { kind: 'capa', capabilities: [{ name: 'read file', address: null, source_rule: null }] } })),
      ])
    );
    const a = process(obs);
    const b = process(obs);
    expect(a).toEqual(b);
  });
});

describe('M7 — holdout and epistemic integrity', () => {
  it('14. novel holdout artifact works end-to-end without sample-specific logic', () => {
    const novel: Artifact = { ...makeArtifact(), artifact_id: 'art_m7_novel_zz9', identity_key: `sha256:${'ee'.repeat(32)}`, hashes: { sha256: 'ee'.repeat(32) } };
    const bytes = buildPe('high_entropy');
    const obs = runStaticAnalysis({
      analysis_run_id: 'ar_m7_novel',
      artifact: novel,
      rawBytes: bytes,
      analyzed_at: PROCESSED_AT,
    }).observations;
    const result = processEvidenceToClaims({
      analysis_run_id: 'ar_m7_novel',
      artifact: novel,
      observations: obs,
      processed_at: PROCESSED_AT,
    });
    // imports_exports + packing + embedded_objects are NO_RESULT on high entropy
    expect(result.rejected_observations).toHaveLength(3);
    expect(result.new_claims.length).toBeGreaterThan(0);
    for (const c of result.new_claims) expect(c.artifact_id).toBe('art_m7_novel_zz9');
  });

  it('15. no family/actor/campaign/ATT&CK/MBC claim leakage anywhere', () => {
    const obs = staticObs(buildPe('low_entropy')).concat(
      toolObs(buildPe('low_entropy'), [
        stub('yara-x', () => ({ status: 'OBSERVED', output: { kind: 'yara', matches: [{ rule: 'Rule_Q', namespace: null, meta: {} }] } })),
        stub('capa', () => ({ status: 'OBSERVED', output: { kind: 'capa', capabilities: [{ name: 'write file', address: null, source_rule: null }] } })),
      ])
    );
    const result = process(obs);
    const json = JSON.stringify(result).toLowerCase();
    for (const w of ['resolvedfamily', 'family_candidate', 'attribution', 'campaign', 'technique_id', 'mapping_provenance', '"malware_name"']) {
      expect(json.includes(w)).toBe(false);
    }
  });

  it('16. tool factual claims remain DERIVED (analyzer-computed; never upgraded to a stronger state)', () => {
    // M14.3.1: analyzer-executed findings are DERIVED + STATIC. The invariant
    // protected here is unchanged: tool claims are never upgraded beyond their
    // computed provenance (never OBSERVED, never OBSERVED_DOING).
    const yaraRunner = stub('yara-x', () => ({ status: 'OBSERVED', output: { kind: 'yara', matches: [{ rule: 'R', namespace: null, meta: {} }] } }));
    const result = process(toolObs(buildPe('low_entropy'), [yaraRunner]));
    expect(result.new_claims.every((c) => c.status === 'DERIVED')).toBe(true);
  });

  it('17. CAN_DO never becomes OBSERVED_DOING (validator-enforced boundary)', () => {
    const capaRunner = stub('capa', () => ({
      status: 'OBSERVED',
      output: { kind: 'capa', capabilities: [{ name: 'write file', address: null, source_rule: null }] },
    }));
    const result = process(toolObs(buildPe('low_entropy'), [capaRunner]));
    for (const c of result.new_claims) {
      expect(c.modality === 'OBSERVED_DOING').toBe(false);
      expect(validateClaim(c)).toHaveLength(0); // canonical validator agrees
    }
  });

  it('no sample-specific logic in processor source (comment-stripped scan)', () => {
    const src = readFileSync('packages/intelligence/src/malware/canonical/claimProcessor.ts', 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    for (const forbidden of ['CVE-', 'sha256 ===', 'family ===', 'malware ===', 'WannaCry', 'RedLine', 'Emotet', 'Ryuk', 'LockBit', 'Mirai', 'ATT&CK', 'MBC', 'actor', 'campaign']) {
      expect(src.includes(forbidden)).toBe(false);
    }
  });
});
