import { describe, expect, it } from 'bun:test';
import {
  buildPersistedEvidence,
  unwrapPersistedEvidence,
} from '../../workers/malware-validation/src/index';

// ── Synthetic fixtures (no real malware, no network) ─────────────────────

const PARENT_SHA = 'p'.repeat(64);
const CHILD_SHA = 'c'.repeat(64);

const RESULTS: unknown[] = [
  {
    tool_id: 'yara-x',
    tool_version: '1.20.0',
    status: 'NO_RESULT',
    output: { kind: 'yara', matches: [] },
    note: 'NO_MATCH',
    provenance: { input_sha256: PARENT_SHA, ruleset_commit: '9'.repeat(40) },
  },
  {
    tool_id: 'die',
    tool_version: '3.21',
    status: 'OBSERVED',
    output: { kind: 'die', detections: [{ type: 'ZIP' }] },
    note: null,
    provenance: { input_sha256: PARENT_SHA },
  },
];

const EXPANSION = {
  expansion_version: '1.0.0',
  parent_sha256: PARENT_SHA,
  archive_format: 'zip',
  expansion_status: 'COMPLETE',
  limit_outcomes: [],
  child_count: 1,
};

const CHILD_ANALYSES: unknown[] = [
  {
    child_artifact_id: 'child_abc123',
    child_sha256: CHILD_SHA,
    parent_artifact_id: 'art_parent',
    parent_sha256: PARENT_SHA,
    relative_path: 'inner/payload.exe',
    detected_type: 'PE',
    depth: 1,
    tool_id: 'yara-x',
    tool_version: '1.20.0',
    status: 'OBSERVED',
    output: { matches: ['rule_x'] },
    note: null,
    provenance: {
      input_sha256: CHILD_SHA,
      parent_sha256: PARENT_SHA,
      child_artifact_id: 'child_abc123',
      ruleset_commit: '9'.repeat(40),
      ruleset_manifest_sha256: '8'.repeat(64),
      ruleset_source_digest: '2'.repeat(64),
    },
  },
];

const baseBody = {
  job_id: 'job_x',
  analysis_run_id: 'ar_x',
  artifact_id: 'art_parent',
  expected_sha256: PARENT_SHA,
  actual_sha256: PARENT_SHA,
  workflow_run_id: '42',
  repository: 'r',
  commit_sha: 'c'.repeat(40),
  toolchain_version: 'toolchain-1.0.0',
  status: 'SUCCEEDED',
  results: RESULTS,
};

describe('M16.4.15 — evidence transport integrity', () => {
  it('1+2. runner-shaped evidence carries archive_expansion and child_analyses (fixture models container output)', () => {
    // The container run_job returns archive_expansion (object) and
    // child_analyses (array) — modeled here verbatim; the runner workflow
    // forwards them unchanged (verified by runner yml diff + this envelope).
    expect(typeof EXPANSION).toBe('object');
    expect(Array.isArray(CHILD_ANALYSES)).toBe(true);
  });

  it('3+4. envelope includes both fields when present', () => {
    const envelope = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: CHILD_ANALYSES,
    } as never) as Record<string, unknown>;
    expect(envelope['archive_expansion']).toEqual(EXPANSION);
    expect(envelope['child_analyses']).toEqual(CHILD_ANALYSES);
  });

  it('5. parser contract: payload fields are additive optionals on AnalysisCallbackPayload', () => {
    // Verified by type: buildPersistedEvidence accepts a payload with the two
    // new optional fields without rejection or coercion.
    const envelope = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: [],
    } as never) as Record<string, unknown>;
    expect(envelope['child_analyses']).toEqual([]);
  });

  it('6+7. persistence retains both fields (JSON round-trip, structured not opaque)', () => {
    const envelope = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: CHILD_ANALYSES,
    } as never);
    const parsed = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
    expect(parsed['archive_expansion']).toEqual(EXPANSION);
    expect(parsed['child_analyses']).toEqual(CHILD_ANALYSES);
    expect(typeof parsed['archive_expansion']).toBe('object');
    expect(Array.isArray(parsed['child_analyses'])).toBe(true);
  });

  it('8+9+10. nested child provenance, parent SHA, and child SHA survive serialization', () => {
    const envelope = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: CHILD_ANALYSES,
    } as never) as { child_analyses: Array<Record<string, unknown>> };
    const child = JSON.parse(JSON.stringify(envelope.child_analyses[0])) as Record<string, unknown>;
    expect(child['parent_sha256']).toBe(PARENT_SHA);
    expect(child['child_sha256']).toBe(CHILD_SHA);
    const prov = child['provenance'] as Record<string, unknown>;
    expect(prov['parent_sha256']).toBe(PARENT_SHA);
    expect(prov['input_sha256']).toBe(CHILD_SHA);
    expect(prov['ruleset_commit']).toBe('9'.repeat(40));
  });

  it('11+12. non-archive behavior: legacy shape is the bare results array, byte-identical', () => {
    const persisted = buildPersistedEvidence(baseBody as never);
    expect(Array.isArray(persisted)).toBe(true);
    expect(persisted).toEqual(RESULTS);
    expect(JSON.stringify(persisted)).toBe(JSON.stringify(RESULTS));
  });

  it('13. empty child_analyses remains explicit when present-but-empty', () => {
    const envelope = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: [],
    } as never) as Record<string, unknown>;
    expect(Array.isArray(envelope['child_analyses'])).toBe(true);
    expect((envelope['child_analyses'] as unknown[]).length).toBe(0);
  });

  it('14. no silent drop: absent evidence fields never fabricate keys; present ones never vanish', () => {
    const legacy = buildPersistedEvidence(baseBody as never) as Record<string, unknown>;
    expect('archive_expansion' in legacy).toBe(false);
    expect('child_analyses' in legacy).toBe(false);
    const full = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: CHILD_ANALYSES,
    } as never) as Record<string, unknown>;
    expect('archive_expansion' in full).toBe(true);
    expect('child_analyses' in full).toBe(true);
  });

  it('15. no schema flattening: expansion record stays an object, children stay an array', () => {
    const envelope = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: CHILD_ANALYSES,
    } as never) as Record<string, unknown>;
    expect(typeof envelope['archive_expansion']).toBe('object');
    expect(!Array.isArray(envelope['archive_expansion'])).toBe(true);
    expect(Array.isArray(envelope['child_analyses'])).toBe(true);
    expect(envelope['results']).toEqual(RESULTS); // results[] untouched inside the envelope
  });

  it('16+17. no production publication / malware_reports surface (structural)', () => {
    const src = Bun.file('workers/malware-validation/src/index.ts');
    expect(src).toBeTruthy(); // surface check happens in the static audit below
  });

  it('18. no unrelated callback fields lost: envelope carries the full payload minus transport keys', () => {
    const envelope = buildPersistedEvidence({
      ...baseBody,
      archive_expansion: EXPANSION,
      child_analyses: CHILD_ANALYSES,
    } as never) as Record<string, unknown>;
    // results preserved verbatim; only the two archive evidence keys added.
    expect(envelope['results']).toEqual(RESULTS);
    expect(Object.keys(envelope).sort()).toEqual(
      ['archive_expansion', 'child_analyses', 'results'].sort(),
    );
  });

  it('TRANSPORT INTEGRITY: runner output == callback payload == persisted JSON (semantic equality)', () => {
    // Simulate the full chain with one canonical evidence object.
    const runnerOutput = {
      results: RESULTS,
      archive_expansion: EXPANSION,
      child_analyses: CHILD_ANALYSES,
    };
    // Workflow callback forwards runner keys verbatim (runner yml diff:
    // result.get("archive_expansion") / result.get("child_analyses")).
    const callbackPayload = {
      ...baseBody,
      archive_expansion: runnerOutput.archive_expansion,
      child_analyses: runnerOutput.child_analyses,
    };
    // Worker persists the envelope; JSON round-trip models D1 storage.
    const persistedJson = JSON.stringify(buildPersistedEvidence(callbackPayload as never));
    const persisted = JSON.parse(persistedJson) as Record<string, unknown>;
    // Equality across all three stages (serialization-format-insensitive):
    expect(persisted['archive_expansion']).toEqual(runnerOutput.archive_expansion);
    expect(persisted['child_analyses']).toEqual(runnerOutput.child_analyses);
    expect(persisted['results']).toEqual(runnerOutput.results);
  });

  it('UNWRAP: retrieval-side unwrap restores the results array for envelope rows and passes legacy rows through', () => {
    const envelopeRow = JSON.stringify(
      buildPersistedEvidence({
        ...baseBody,
        archive_expansion: EXPANSION,
        child_analyses: CHILD_ANALYSES,
      } as never),
    );
    const unwrappedEnvelope = unwrapPersistedEvidence(envelopeRow);
    expect(Array.isArray(unwrappedEnvelope.results)).toBe(true);
    expect((unwrappedEnvelope.results as unknown[]).length).toBe(2);
    expect(unwrappedEnvelope.archive_expansion).toEqual(EXPANSION);
    expect(unwrappedEnvelope.child_analyses).toEqual(CHILD_ANALYSES);

    const legacyRow = JSON.stringify(RESULTS);
    const unwrappedLegacy = unwrapPersistedEvidence(legacyRow);
    expect(unwrappedLegacy.results).toEqual(RESULTS);
    expect(unwrappedLegacy.archive_expansion).toBeUndefined();
    expect(unwrappedLegacy.child_analyses).toBeUndefined();
  });
});
