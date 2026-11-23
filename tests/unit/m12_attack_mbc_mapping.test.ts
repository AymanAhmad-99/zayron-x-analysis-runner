/**
 * M12 — Deterministic ATT&CK/MBC Mapping Engine Tests
 *
 * 30 required scenarios, synthetic behaviors and synthetic catalogs only.
 * All technique ids are test-catalog fixtures — never engine hardcoding.
 * No real malware-family logic anywhere.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  mapBehaviorsToAttackMbc,
  validateBehavior,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  Behavior,
  MappingCatalogEntry,
  CanonicalTechniqueMapping,
  EvidenceRef,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m12_holdout_001';
const AT = '2026-09-20T22:00:00.000Z';

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m12_holdout',
    identity_key: `sha256:${'d9'.repeat(32)}`,
    format_class: 'PE',
    file_names: ['m12_holdout.bin'],
    hashes: { sha256: 'd9'.repeat(32) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
    format_attributes: {},
    provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_2', snapshot_ids: [], derived_at: AT },
  };
}

function staticEvidence(id = 'ev_m12_static'): EvidenceRef[] {
  return [
    { evidence_id: id, source_id: 'src_m12_static', source_snapshot_id: RUN_ID, kind: 'STATIC', authority_tier: 'TIER_1', reliability: 'A', credibility: '2', retrieved_at: AT },
  ];
}

function dynamicEvidence(id = 'ev_m12_dynamic'): EvidenceRef[] {
  return [
    { evidence_id: id, source_id: 'src_m12_sandbox', source_snapshot_id: RUN_ID, kind: 'DYNAMIC', authority_tier: 'TIER_1', reliability: 'A', credibility: '2', retrieved_at: AT },
  ];
}

function makeBehavior(partial: Partial<Behavior> & { behavior_id: string }): Behavior {
  const refs = partial.evidence_refs ?? staticEvidence();
  const modality = partial.modality ?? 'CAN_DO';
  const kinds = partial.evidence_kinds ?? [...new Set(refs.map((e) => e.kind))];
  return {
    behavior_id: partial.behavior_id,
    analysis_run_id: RUN_ID,
    artifact_id: partial.artifact_id ?? 'art_m12_holdout',
    name: partial.name ?? 'write file',
    category: partial.category ?? 'capability',
    description: 'synthetic behavior',
    status: partial.status ?? modality,
    modality,
    evidence_refs: refs,
    evidence_kinds: kinds,
    claim_ids: partial.claim_ids ?? [`clm_${partial.behavior_id}`],
    technique_mappings: [],
    provenance: partial.provenance ?? {
      evidence_refs: refs,
      source_ids: [...new Set(refs.map((e) => e.source_id))],
      authority_tier: 'TIER_1',
      snapshot_ids: [RUN_ID],
      derived_at: AT,
    },
  };
}

const canDoBehavior = () => makeBehavior({ behavior_id: 'beh_cando', category: 'capability', modality: 'CAN_DO', status: 'CAN_DO' });
const observedBehavior = () =>
  makeBehavior({
    behavior_id: 'beh_observed',
    category: 'behavior',
    modality: 'OBSERVED_DOING',
    status: 'OBSERVED_DOING',
    evidence_refs: dynamicEvidence(),
    evidence_kinds: ['DYNAMIC'],
  });

// Test-owned catalog — technique ids exist ONLY here (test fixtures).
const catalog = (overrides?: Partial<MappingCatalogEntry>[]): MappingCatalogEntry[] => {
  const base: MappingCatalogEntry[] = [
    {
      catalog_entry_id: 'cat_att_1',
      framework: 'ATTACK',
      technique_id: 'ZqxT0001.001', // novel holdout ATT&CK-style id (test fixture only)
      technique_name: 'Zqx File Write',
      tactic: 'Zqx Impact',
      supported_behavior_category: 'capability',
      required_evidence_kinds: ['STATIC'],
      applicable_modalities: ['CAN_DO', 'OBSERVED_DOING'],
    },
    {
      catalog_entry_id: 'cat_mbc_1',
      framework: 'MBC',
      technique_id: 'ZqxB0002', // novel holdout MBC-style id (test fixture only)
      technique_name: 'Zqx File System Behavior',
      supported_behavior_category: 'capability',
      required_evidence_kinds: ['STATIC'],
      applicable_modalities: ['CAN_DO', 'OBSERVED_DOING'],
    },
    {
      catalog_entry_id: 'cat_att_2',
      framework: 'ATTACK',
      technique_id: 'ZqxT0003',
      technique_name: 'Zqx Observed Action',
      supported_behavior_category: 'behavior',
      required_evidence_kinds: ['DYNAMIC'],
      applicable_modalities: ['OBSERVED_DOING'],
    },
  ];
  return overrides ?? base;
};

const map = (
  behaviors: readonly Behavior[],
  cat: MappingCatalogEntry[] = catalog(),
  existing?: CanonicalTechniqueMapping[]
) =>
  mapBehaviorsToAttackMbc({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    behaviors,
    mapping_catalog: cat,
    existing_mappings: existing,
    mapped_at: AT,
  });

function processorSource(): string {
  return readFileSync('packages/intelligence/src/malware/canonical/attackMbcMapping.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

// ── Tests ────────────────────────────────────────────────────────

describe('M12 — basic mapping', () => {
  it('1. explicit catalog match → ATTACK mapping', () => {
    const r = map([canDoBehavior()]);
    const att = r.new_mappings.find((m) => m.framework === 'ATTACK');
    expect(att).toBeDefined();
    expect(att!.technique_id).toBe('ZqxT0001.001');
    expect(att!.mapping_provenance).toBe('DERIVED');
    expect(att!.catalog_entry_id).toBe('cat_att_1');
  });

  it('2. explicit catalog match → MBC mapping', () => {
    const r = map([canDoBehavior()]);
    const mbc = r.new_mappings.find((m) => m.framework === 'MBC');
    expect(mbc).toBeDefined();
    expect(mbc!.technique_id).toBe('ZqxB0002');
    expect(mbc!.catalog_entry_id).toBe('cat_mbc_1');
  });

  it('3. same behavior → both frameworks when both catalog entries exist', () => {
    const r = map([canDoBehavior()]);
    expect(r.new_mappings).toHaveLength(2);
    expect(new Set(r.new_mappings.map((m) => m.framework))).toEqual(new Set(['ATTACK', 'MBC']));
  });

  it('9. OBSERVED_DOING with valid dynamic evidence maps correctly, modality preserved', () => {
    const r = map([observedBehavior()]);
    const m = r.new_mappings.find((x) => x.behavior_id === 'beh_observed')!;
    expect(m.status).toBe('OBSERVED_DOING');
    expect(m.evidence_refs.every((e) => e.kind === 'DYNAMIC')).toBe(true);
  });

  it('4/9. no catalog match → no mapping (abstention)', () => {
    const r = map([makeBehavior({ behavior_id: 'beh_nocat', category: 'zqx_unknown_category' })]);
    expect(r.new_mappings).toHaveLength(0);
    expect(r.skipped_behaviors[0].reason).toBe('no_matching_catalog_entry');
  });
});

describe('M12 — evidence, provenance, ownership gates', () => {
  it('5. missing behavior evidence → rejection', () => {
    const b = makeBehavior({ behavior_id: 'beh_noev', evidence_refs: [] });
    const r = map([b]);
    expect(r.new_mappings).toHaveLength(0);
    // Zero mapping either way — the behavior is blocked by the provenance gate
    // (empty refs → invalid provenance) before claim validation runs.
    expect(['invalid_provenance', 'behavior_validation_failed']).toContain(r.rejected_behaviors[0].reason_code);
  });

  it('6. invalid behavior provenance → rejection', () => {
    const b = makeBehavior({
      behavior_id: 'beh_badprov',
      provenance: { evidence_refs: [], source_ids: [], authority_tier: 'TIER_1', snapshot_ids: [], derived_at: AT },
    });
    const r = map([b]);
    expect(r.rejected_behaviors[0].reason_code).toBe('invalid_provenance');
  });

  it('7. foreign-artifact behavior → rejection', () => {
    const b = makeBehavior({ behavior_id: 'beh_foreign', artifact_id: 'art_m12_other_zz4' });
    const r = map([b]);
    expect(r.rejected_behaviors[0].reason_code).toBe('behavior_artifact_mismatch');
    expect(r.new_mappings).toHaveLength(0);
  });

  it('invalid catalog entries rejected explicitly (unsupported framework, missing id/category)', () => {
    const r = map([canDoBehavior()], [
      { catalog_entry_id: 'c_bad1', framework: 'SANS' as never, technique_id: 'X', supported_behavior_category: 'capability', required_evidence_kinds: ['STATIC'], applicable_modalities: ['CAN_DO'] },
      { catalog_entry_id: '', framework: 'ATTACK', technique_id: 'X', supported_behavior_category: 'capability', required_evidence_kinds: [], applicable_modalities: ['CAN_DO'] },
      { catalog_entry_id: 'c_bad3', framework: 'MBC', technique_id: '', supported_behavior_category: 'capability', required_evidence_kinds: [], applicable_modalities: ['CAN_DO'] },
      { catalog_entry_id: 'c_bad4', framework: 'MBC', technique_id: 'X', supported_behavior_category: '', required_evidence_kinds: [], applicable_modalities: ['CAN_DO'] },
    ]);
    expect(r.rejected_catalog_entries.map((e) => e.reason_code).sort())
      .toEqual(['catalog_category_missing', 'catalog_identity_missing', 'catalog_technique_id_missing', 'unsupported_framework']);
  });
});

describe('M12 — epistemic boundaries', () => {
  it('8. CAN_DO behavior never becomes OBSERVED_DOING because of mapping', () => {
    const r = map([canDoBehavior()]);
    for (const m of r.new_mappings) expect(m.status).toBe('CAN_DO');
    const out = JSON.stringify(r);
    expect(out.includes('OBSERVED_DOING')).toBe(false);
  });

  it('10. static-only behavior does not gain dynamic semantics', () => {
    const r = map([canDoBehavior()]);
    // The DYNAMIC-required catalog entry must not apply to static-only behavior.
    expect(r.new_mappings.every((m) => m.catalog_entry_id !== 'cat_att_2')).toBe(true);
    expect(r.new_mappings.every((m) => m.evidence_refs.every((e) => e.kind !== 'DYNAMIC'))).toBe(true);
  });

  it('11. raw observation cannot bypass the behavior layer', () => {
    // M12's input surface has no observation→mapping path; observations are
    // only ownership-validated. A non-empty catalog cannot map them.
    const r = mapBehaviorsToAttackMbc({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      behaviors: [],
      mapping_catalog: catalog(),
      observations: [{ observation_id: 'obs_x', artifact_id: 'art_m12_holdout' } as never],
      mapped_at: AT,
    });
    expect(r.new_mappings).toHaveLength(0);
  });

  it('12. configuration cannot bypass the behavior layer (no config input surface)', () => {
    const r = map([canDoBehavior()], catalog());
    expect(r.new_mappings.every((m) => m.behavior_id.startsWith('beh_'))).toBe(true);
  });

  it('13. family label cannot bypass the behavior layer (no family input surface)', () => {
    const out = JSON.stringify(map([canDoBehavior()]));
    expect(out.includes('family')).toBe(false);
    expect(out.includes('candidate')).toBe(false);
  });
});

describe('M12 — additive-only mapping', () => {
  it('14-16. mapping does not create behavior/evidence and does not alter the behavior', () => {
    const b = canDoBehavior();
    const before = JSON.stringify(b);
    const r = map([b]);
    expect(JSON.stringify(b)).toBe(before);
    const out = JSON.stringify(r);
    expect(out.includes('"category"')).toBe(false);
    expect(out.includes('"claim_ids"')).toBe(false);
    expect(out.includes('"description"')).toBe(false);
  });

  it('17. mapping provenance includes sample evidence AND catalog knowledge provenance', () => {
    const r = map([canDoBehavior()]);
    const m = r.new_mappings[0];
    expect(m.evidence_refs.map((e) => e.evidence_id)).toContain('ev_m12_static');
    expect(m.catalog_entry_id).toBe('cat_att_1');
    expect(m.provenance.evidence_refs.map((e) => e.evidence_id)).toContain('ev_m12_static');
  });
});

describe('M12 — dedup and idempotency', () => {
  it('18. duplicate identical mapping deduplicates (existing + batch)', () => {
    const first = map([canDoBehavior()]);
    const second = map([canDoBehavior()], catalog(), first.new_mappings);
    expect(second.new_mappings).toHaveLength(0);
    expect(second.skipped_behaviors[0].reason).toBe('duplicate_of_existing_mapping');
    // Batch-internal duplicates (same behavior supplied twice).
    const b = canDoBehavior();
    const batch = map([b, { ...b }]);
    expect(batch.new_mappings).toHaveLength(2); // two distinct catalog entries, deduped per entry
  });

  it('19. same mapping id with genuinely different behavior/evidence remains distinct', () => {
    const a = map([canDoBehavior()]);
    const b = map([makeBehavior({ behavior_id: 'beh_other', category: 'capability', evidence_refs: staticEvidence('ev_m12_other') })]);
    expect(a.new_mappings.map((m) => m.mapping_id).sort()).not.toEqual(b.new_mappings.map((m) => m.mapping_id).sort());
  });

  it('30. repeated execution is idempotent', () => {
    const behaviors = [canDoBehavior(), observedBehavior()];
    const first = map(behaviors);
    const second = map(behaviors, catalog(), first.new_mappings);
    expect(second.new_mappings).toHaveLength(0);
    expect(second.rejected_behaviors).toHaveLength(0);
  });
});

describe('M12 — determinism', () => {
  it('20. shuffled behavior/catalog input is deterministic', () => {
    const cat = catalog();
    const r1 = map([canDoBehavior(), observedBehavior()], [...cat].reverse());
    const r2 = map([observedBehavior(), canDoBehavior()], cat);
    expect(r1.new_mappings.map((m) => m.mapping_id)).toEqual(r2.new_mappings.map((m) => m.mapping_id));
  });

  it('21. deterministic mapping identity (no timestamp/random input)', () => {
    const r1 = map([canDoBehavior()]);
    const r2 = map([canDoBehavior()]);
    expect(r1).toEqual(r2);
    const r3 = map([makeBehavior({ behavior_id: 'beh_other', evidence_refs: staticEvidence('ev_m12_zz') })]);
    expect(r3.new_mappings[0].mapping_id).not.toBe(r1.new_mappings[0].mapping_id);
  });
});

describe('M12 — catalog discipline', () => {
  it('22. unsupported framework is rejected', () => {
    const r = map([canDoBehavior()], [
      { catalog_entry_id: 'c_x', framework: 'LOLBAS' as never, technique_id: 'X1', supported_behavior_category: 'capability', required_evidence_kinds: ['STATIC'], applicable_modalities: ['CAN_DO'] },
    ]);
    expect(r.rejected_catalog_entries[0].reason_code).toBe('unsupported_framework');
    expect(r.new_mappings).toHaveLength(0);
  });

  it('23. fabricated technique id is impossible — only catalog ids flow through', () => {
    // Engine asked to map a behavior whose category no catalog entry covers:
    const r = map([makeBehavior({ behavior_id: 'beh_none', category: 'no_such_category' })]);
    expect(r.new_mappings).toHaveLength(0);
    // And the engine's output ids are always exactly the catalog's own ids:
    const r2 = map([canDoBehavior()]);
    expect(r2.new_mappings.every((m) => ['ZqxT0001.001', 'ZqxB0002'].includes(m.technique_id))).toBe(true);
  });

  it('24. multiple matching catalog entries produce explicit mappings — no arbitrary winner', () => {
    const cat = [
      ...catalog()!,
      {
        catalog_entry_id: 'cat_att_1b',
        framework: 'ATTACK' as const,
        technique_id: 'ZqxT0004',
        technique_name: 'Zqx Alternate View',
        supported_behavior_category: 'capability',
        required_evidence_kinds: ['STATIC' as const],
        applicable_modalities: ['CAN_DO' as const],
      },
    ];
    const r = map([canDoBehavior()], cat);
    const att = r.new_mappings.filter((m) => m.framework === 'ATTACK');
    expect(att).toHaveLength(2); // both preserved explicitly
    expect(att.map((m) => m.catalog_entry_id).sort()).toEqual(['cat_att_1', 'cat_att_1b']);
  });

  it('28/29. novel holdout ATT&CK/MBC ids work when supplied only through the test catalog', () => {
    const r = map([canDoBehavior()], [
      { catalog_entry_id: 'cat_novel_a', framework: 'ATTACK', technique_id: 'ZqxT9999.999', supported_behavior_category: 'capability', required_evidence_kinds: ['STATIC'], applicable_modalities: ['CAN_DO'] },
      { catalog_entry_id: 'cat_novel_b', framework: 'MBC', technique_id: 'ZqxB8888', supported_behavior_category: 'capability', required_evidence_kinds: ['STATIC'], applicable_modalities: ['CAN_DO'] },
    ]);
    expect(r.new_mappings.map((m) => m.technique_id).sort()).toEqual(['ZqxB8888', 'ZqxT9999.999']);
  });
});

describe('M12 — boundaries and genericity', () => {
  it('25. no confidence score anywhere', () => {
    const out = JSON.stringify(map([canDoBehavior(), observedBehavior()]));
    expect(out.includes('"HIGH"')).toBe(false);
    expect(out.includes('confidence')).toBe(false);
    expect(out.includes('score')).toBe(false);
  });

  it('26. no family/actor/campaign attribution', () => {
    const out = JSON.stringify(map([canDoBehavior()]));
    expect(out.includes('family')).toBe(false);
    expect(out.includes('actor')).toBe(false);
    expect(out.includes('campaign')).toBe(false);
  });

  it('27. novel holdout behavior works without hardcoded mapping logic', () => {
    const r = map([makeBehavior({ behavior_id: 'beh_zqx_novel_9x7', name: 'Zqx_Novel_Action', category: 'capability' })]);
    expect(r.rejected_behaviors).toHaveLength(0);
    expect(r.new_mappings.length).toBeGreaterThan(0);
  });

  it('validateBehavior still enforced on emitted-roundtrip behaviors', () => {
    expect(validateBehavior(canDoBehavior())).toHaveLength(0);
    expect(validateBehavior(observedBehavior())).toHaveLength(0);
  });

  it('no hardcoded framework intelligence (comment-stripped source scan)', () => {
    const src = processorSource();
    for (const pat of [
      'CVE-', 'T1000', 'T1001', 'T1055', 'T1056', 'T1082', 'T1486', 'MBC-',
      'WannaCry', 'RedLine', 'Emotet', 'Ryuk', 'LockBit', 'Mirai',
      'sha256 ===', 'family ===', 'malware ===', 'sample ===', 'artifact_id ===',
      'actor', 'campaign', "'HIGH'", "'MEDIUM'", "'LOW'",
      'fetch(', 'Date.now', 'Math.random', 'randomUUID',
    ]) {
      expect(src.includes(pat)).toBe(false);
    }
  });
});
