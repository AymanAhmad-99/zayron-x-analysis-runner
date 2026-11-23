/**
 * M2 — Canonical Malware Adapter Emission Tests (holdout contract)
 *
 * Proves the MalwareBazaar and ThreatFox adapters emit the canonical domain
 * model with the mandatory invariants:
 *  1. No canonical Malware entity creation inside either adapter.
 *  2. No per-family hardcoded rules.
 *  3. No hash-specific production logic.
 *  4. No direct ATT&CK mapping.
 *  5. No inferred behavior from family names.
 *  6. No HIGH/MEDIUM/LOW hardcoded confidence.
 *  7. Every emitted assertive object has provenance.
 *  8. Every object belongs to an ingestion-stage scope.
 *  9. Source-reported labels remain SOURCE_REPORTED / UNRESOLVED candidates.
 */
import { describe, it, expect } from 'bun:test';

import { MalwareBazaarAdapter, type MalwareBazaarPayload } from '../../packages/intelligence/src/ingestion/malwareBazaarAdapter';
import { ThreatFoxAdapter, type ThreatFoxPayload } from '../../packages/intelligence/src/ingestion/threatFoxAdapter';
import type { SourceSnapshot } from '../../packages/intelligence/src/ingestion/contracts';

const SHA_A = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
const SHA_B = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function snap(id: string, sourceId: string, adapterParserVersion = 'x'): SourceSnapshot {
  return {
    snapshot_id: id,
    source_id: sourceId,
    retrieved_at: '2026-09-20T12:00:00Z',
    content_hash: `hash-${id}`,
    content_type: 'application/json',
    object_count: 1,
    parser_version: adapterParserVersion,
    raw_storage_reference: `r2://test/${id}.json`,
    acquisition_status: 'NEW',
  };
}

// ── A novel family label never seen in any fixture, policy, or codebase ──
const NOVEL_FAMILY = 'Zqx_NeverSeenFamily_9x7';

function mbPayload(records: Array<Record<string, unknown>>): MalwareBazaarPayload {
  return { query_status: 'ok', data: records as MalwareBazaarPayload['data'] };
}

function tfPayload(records: Array<Record<string, unknown>>): ThreatFoxPayload {
  return { query_status: 'ok', data: records as ThreatFoxPayload['data'] };
}

// ── MalwareBazaar ────────────────────────────────────────────────

describe('M2 MalwareBazaarAdapter canonical emission', () => {
  it('emits Artifact + Observation + EvidenceRef provenance for a sample', async () => {
    const adapter = new MalwareBazaarAdapter();
    const payload = mbPayload([
      {
        sha256_hash: SHA_A,
        file_name: 'novel_sample.exe',
        file_size: 1234,
        signature: NOVEL_FAMILY,
        tags: ['tag1'],
        first_seen: '2026-09-19T00:00:00Z',
      },
    ]);
    const s = snap('mb-m2-1', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    expect(canonical.scope.scope_id).toBe('stage_mb-m2-1');
    expect(canonical.artifacts).toHaveLength(1);
    const art = canonical.artifacts[0];
    expect(art.artifact_id).toBe(`art_${SHA_A}`);
    expect(art.identity_key).toBe(`sha256:${SHA_A}`);
    expect(art.hashes.sha256).toBe(SHA_A);
    expect(art.file_names).toContain('novel_sample.exe');
    expect(art.provenance.evidence_refs.length).toBeGreaterThan(0);
    expect(art.provenance.evidence_refs[0].kind).toBe('RESEARCH');
    expect(art.provenance.evidence_refs[0].authority_tier).toBe('TIER_2');

    expect(canonical.observations).toHaveLength(1);
    const obs = canonical.observations[0];
    expect(obs.source).toBe('SOURCE_SUBMISSION');
    expect(obs.observation_type).toBe('sample_submission');
    expect(obs.evidence_refs).toEqual(art.provenance.evidence_refs);
    expect(obs.analysis_run_id).toBe(canonical.scope.scope_id);
  });

  it('INVARIANT 1+9: a NOVEL family label stays an UNRESOLVED SOURCE_REPORTED FamilyCandidate — never a resolved family or Malware entity', async () => {
    const adapter = new MalwareBazaarAdapter();
    const payload = mbPayload([{ sha256_hash: SHA_A, signature: NOVEL_FAMILY }]);
    const s = snap('mb-m2-novel', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    // FamilyCandidate exists
    expect(canonical.family_candidates).toHaveLength(1);
    const cand = canonical.family_candidates[0];
    expect(cand.candidate_family).toBe(NOVEL_FAMILY);
    expect(cand.resolution_state).toBe('UNRESOLVED');
    expect(cand.signals[0].status).toBe('SOURCE_REPORTED');
    expect(cand.signals[0].signal_type).toBe('malwarebazaar_signature');
    expect(cand.source_ids).toEqual(['src_malwarebazaar']);

    // No resolved-family concept exists anywhere in the emission
    const payloadJson = JSON.stringify(canonical);
    expect(payloadJson).not.toContain('mal_mb_');
    expect(payloadJson).not.toContain('CLASSIFIED_AS');
    expect(payloadJson).not.toContain('resolvedFamily');
    expect(payloadJson).not.toContain('canonical_malware');
  });

  it('INVARIANT 5+6: a family label alone creates no behavior/capability claims and no hardcoded HIGH/MEDIUM/LOW confidence', async () => {
    const adapter = new MalwareBazaarAdapter();
    const payload = mbPayload([{ sha256_hash: SHA_A, signature: NOVEL_FAMILY, tags: ['ransomware-like-label'] }]);
    const s = snap('mb-m2-behav', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    const json = JSON.stringify(canonical);
    // No behavior claims emitted at all from a label
    expect(json).not.toContain('behavior');
    expect(json).not.toContain('capability');
    expect(json).not.toContain('ATT&CK');
    expect(json).not.toContain('"T1');
    // Confidence is a structured input, not a bare constant
    const cand = canonical.family_candidates[0];
    expect(cand.confidence.signals.length).toBeGreaterThan(0);
    expect(cand.confidence.signals[0].basis).toContain('unverified');
    expect(cand.confidence.uncertainty.unassessed_dimensions).toContain('family_resolution');
  });

  it('INVARIANT 7: observations and candidates carry provenance on every assertive object', async () => {
    const adapter = new MalwareBazaarAdapter();
    const payload = mbPayload([
      { sha256_hash: SHA_A, signature: NOVEL_FAMILY },
      { sha256_hash: SHA_B, signature: 'AnotherLabel_Xx' },
    ]);
    const s = snap('mb-m2-prov', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    for (const a of canonical.artifacts) {
      expect(a.provenance.evidence_refs.length).toBeGreaterThan(0);
      expect(a.provenance.derived_at).toBeTruthy();
    }
    for (const o of canonical.observations) {
      expect(o.provenance.evidence_refs.length).toBeGreaterThan(0);
    }
    for (const c of canonical.family_candidates) {
      expect(c.provenance.evidence_refs.length).toBeGreaterThan(0);
      expect(c.signals.every((sig) => sig.provenance.evidence_refs.length > 0)).toBe(true);
    }
  });

  it('CONFLICT PRESERVATION: two different family labels for the same hash stay two UNRESOLVED candidates — no silent overwrite', async () => {
    const adapter = new MalwareBazaarAdapter();
    const payload = mbPayload([
      { sha256_hash: SHA_A, signature: 'LabelOne_ConflictTest' },
      { sha256_hash: SHA_A, signature: 'LabelTwo_ConflictTest' },
    ]);
    const s = snap('mb-m2-conflict', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    // One artifact, two distinct unresolved candidates
    expect(canonical.artifacts).toHaveLength(1);
    const labels = canonical.family_candidates.map((c) => c.candidate_family).sort();
    expect(labels).toEqual(['LabelOne_ConflictTest', 'LabelTwo_ConflictTest']);
    expect(canonical.family_candidates.every((c) => c.resolution_state === 'UNRESOLVED')).toBe(true);
    // Neither candidate is discarded or merged into the other
    expect(canonical.family_candidates.every((c) => c.signals.length >= 1)).toBe(true);
  });

  it('INVARIANT 3: identical hash with different labels does not force identical family (IOC identity ≠ family identity)', async () => {
    const adapter = new MalwareBazaarAdapter();
    const payload = mbPayload([
      { sha256_hash: SHA_A, signature: 'FamilyFromSourceP' },
      { sha256_hash: SHA_A.toUpperCase(), signature: 'FamilyFromSourceQ' }, // same artifact, upper-case input
    ]);
    const s = snap('mb-m2-ioc', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    expect(canonical.artifacts).toHaveLength(1); // same artifact identity
    expect(canonical.family_candidates).toHaveLength(2); // two competing labels preserved
  });

  it('legacy normalize() projection is family-free (no Malware entities, no CLASSIFIED_AS)', async () => {
    const adapter = new MalwareBazaarAdapter();
    const payload = mbPayload([{ sha256_hash: SHA_A, signature: NOVEL_FAMILY, file_name: 'a.exe' }]);
    const s = snap('mb-m2-legacy', adapter.sourceId, adapter.parserVersion);
    const legacy = await adapter.normalize(payload, s);

    expect(legacy.entities.every((e) => e.entity_type !== 'Malware')).toBe(true);
    expect(legacy.claims).toHaveLength(0);
    expect(legacy.relationships).toHaveLength(0);
    expect(JSON.stringify(legacy)).not.toContain('mal_mb_');
    expect(JSON.stringify(legacy)).not.toContain('CLASSIFIED_AS');
  });
});

// ── ThreatFox ────────────────────────────────────────────────────

describe('M2 ThreatFoxAdapter canonical emission', () => {
  it('emits infrastructure Observation + EvidenceRef with DYNAMIC-kind evidence', async () => {
    const adapter = new ThreatFoxAdapter();
    const payload = tfPayload([
      {
        id: 'tf-m2-1',
        ioc: '203.0.113.10:8443',
        ioc_type: 'ip:port',
        threat_type: 'botnet_cc',
        malware: 'win.novel_m2_family',
        first_seen: '2026-09-19T00:00:00Z',
        last_seen: '2026-09-19T01:00:00Z',
      },
    ]);
    const s = snap('tf-m2-1', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    expect(canonical.artifacts).toHaveLength(0); // no sample artifact — infrastructure source
    expect(canonical.observations).toHaveLength(1);
    const obs = canonical.observations[0];
    expect(obs.observation_type).toBe('infrastructure_report');
    expect(obs.source).toBe('SENSOR_TELEMETRY');
    expect(obs.evidence_refs[0].kind).toBe('DYNAMIC');
    expect(obs.attributes.normalized_value).toBe('203.0.113.10');
    expect(obs.attributes.valid_until).toBeTruthy();

    // Infrastructure relationship present with SOURCE_REPORTED status
    expect(canonical.infrastructure_relationships).toHaveLength(1);
    expect(canonical.infrastructure_relationships[0].status).toBe('SOURCE_REPORTED');
    expect(canonical.infrastructure_relationships[0].evidence_kind).toBe('DYNAMIC');
  });

  it('INVARIANT 1+9: ThreatFox malware label becomes a source-scoped UNRESOLVED FamilyCandidate — no Malware entity, IOC identity not merged with family', async () => {
    const adapter = new ThreatFoxAdapter();
    const payload = tfPayload([
      {
        id: 'tf-m2-2',
        ioc: 'malicious-novel.example.com',
        ioc_type: 'domain',
        threat_type: 'botnet_cc',
        malware: 'win.never_seen_family',
      },
    ]);
    const s = snap('tf-m2-2', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    expect(canonical.family_candidates).toHaveLength(1);
    const cand = canonical.family_candidates[0];
    expect(cand.candidate_family).toBe('win.never_seen_family');
    expect(cand.resolution_state).toBe('UNRESOLVED');
    expect(cand.source_ids).toEqual(['src_threatfox']);
    expect(cand.analysis_run_id).toBe(canonical.scope.scope_id);

    const json = JSON.stringify(canonical);
    expect(json).not.toContain('mal_tf_');
    expect(json).not.toContain('entity_type');
    // The IOC indicator id and the family candidate id are distinct objects
    expect(cand.artifact_id).toBe('ind_dom_malicious_novel_example_com');
    expect(cand.family_candidate_id).not.toBe(cand.artifact_id);
  });

  it('NO ATTRIBUTION: actor-name tags stay inert observation text — no ThreatActor/Campaign objects or ATTRIBUTED_TO edges', async () => {
    const adapter = new ThreatFoxAdapter();
    const payload = tfPayload([
      {
        id: 'tf-m2-actor',
        ioc: '198.51.100.55:443',
        ioc_type: 'ip:port',
        threat_type: 'botnet_cc',
        malware: 'win.chapaev',
        malware_printable: 'Chapaev APT',
        tags: ['apt29', 'cozybear', 'russia'],
      },
    ]);
    const s = snap('tf-m2-actor', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    const json = JSON.stringify(canonical);
    expect(json).not.toContain('ThreatActor');
    expect(json).not.toContain('ATTRIBUTED_TO');
    // The raw tag text is preserved as inert observation attributes
    expect(JSON.stringify(canonical.observations[0].attributes.tags)).toContain('apt29');
  });

  it('INVARIANT 8: every emitted object references the ingestion-stage scope, not a fabricated run', async () => {
    const adapter = new ThreatFoxAdapter();
    const payload = tfPayload([
      { id: 'tf-m2-scope', ioc: '203.0.113.99:80', ioc_type: 'ip:port', threat_type: 'botnet_cc', malware: 'win.x' },
    ]);
    const s = snap('tf-m2-scope', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    expect(canonical.scope.scope_id.startsWith('stage_')).toBe(true);
    for (const o of canonical.observations) {
      expect(o.analysis_run_id).toBe(canonical.scope.scope_id);
    }
    for (const c of canonical.family_candidates) {
      expect(c.analysis_run_id).toBe(canonical.scope.scope_id);
    }
    for (const r of canonical.infrastructure_relationships) {
      expect(r.analysis_run_id).toBe(canonical.scope.scope_id);
    }
  });

  it('fail-closed: invalid IOCs produce no canonical objects', async () => {
    const adapter = new ThreatFoxAdapter();
    const payload = tfPayload([
      { id: 'tf-bad-1', ioc: '999.999.999.999:80', ioc_type: 'ip:port', malware: 'win.x' },
      { id: 'tf-bad-2', ioc: 'not_a_hash', ioc_type: 'sha256_hash', malware: 'win.x' },
      { id: 'tf-good-1', ioc: '203.0.113.5:443', ioc_type: 'ip:port', threat_type: 'botnet_cc', malware: 'win.ok' },
    ]);
    const s = snap('tf-m2-bad', adapter.sourceId, adapter.parserVersion);
    const canonical = await adapter.normalizeCanonical(payload, s);

    expect(canonical.observations).toHaveLength(1);
    expect(canonical.observations[0].attributes.canonical_id).toBe('ind_ip_203_0_113_5');
  });
});
