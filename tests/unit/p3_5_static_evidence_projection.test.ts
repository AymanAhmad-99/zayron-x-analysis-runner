/**
 * P3.5 — Static evidence projection tests
 *
 * 1. indicator projection        (typed records, values, classes, coverage)
 * 2. indicator lineage           (observation/evidence/artifact/run, fail closed)
 * 3. static-candidate semantics  (no behaviour/C2/infrastructure promotion)
 * 4. embedded-object projection  (structure only, never a child artifact)
 * 5. parser failure visibility   (no evidence != parser failure)
 * 6. deterministic replay        (identical normalized evidence)
 * 7. budget single-source        (one budget source, no duplicated constants)
 */
import { describe, it, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  runStaticAnalysis,
  extractStringIndicators,
  scanEmbeddedObjects,
  parsePeOutcome,
  parseElfOutcome,
  projectStaticEvidence,
  projectStaticIndicatorSection,
  validateStaticIndicator,
  validateEmbeddedObject,
  computeEmbeddedObjectDigests,
  embeddedObjectDigestKey,
  STATIC_EXTRACTION_BUDGETS,
  CANONICAL_INDICATOR_TYPES,
  StaticEvidenceProjectionError,
  STATIC_ANALYZER_SOURCE_ID,
  findObservation,
} from '../../packages/intelligence/src/malware/canonical';
import type { Artifact, Observation } from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_p3_5_projection_001';
const SHA = 'c'.repeat(64);
const ANALYZED_AT = '2026-09-23T00:00:00.000Z';
const ARTIFACT_ID = 'art_p3_5_projection';

function makeArtifact(): Artifact {
  return {
    artifact_id: ARTIFACT_ID,
    identity_key: `sha256:${SHA}`,
    format_class: 'PE',
    file_names: ['p3_5_sample.bin'],
    hashes: { sha256: SHA } as Artifact['hashes'],
    file_size_bytes: undefined,
    mime_type: 'application/octet-stream',
    format_attributes: {},
    provenance: {
      evidence_refs: [],
      source_ids: [],
      authority_tier: 'TIER_2',
      snapshot_ids: [],
      derived_at: ANALYZED_AT,
    },
  };
}

/** Minimal valid PE32+ fixture (one section) with the payload inside .text. */
function buildPe(payload: string, trailing = new Uint8Array(0)): Uint8Array {
  const peOff = 0x40;
  const optSize = 112 + 16 * 8;
  const headerSize = peOff + 24 + optSize + 40;
  const text = new TextEncoder().encode(payload);
  const pe = new Uint8Array(headerSize + 0x400 + text.length + trailing.length);
  pe[0] = 0x4d;
  pe[1] = 0x5a;
  const dv = new DataView(pe.buffer);
  dv.setUint32(0x3c, peOff, true);
  pe[peOff] = 0x50;
  pe[peOff + 1] = 0x45;
  dv.setUint16(peOff + 4, 0x8664, true);
  dv.setUint16(peOff + 6, 1, true);
  dv.setUint32(peOff + 8, 0x678f0000, true);
  dv.setUint16(peOff + 20, optSize, true);
  const opt = peOff + 24;
  dv.setUint16(opt, 0x20b, true);
  dv.setUint32(opt + 16, 0x1000, true);
  pe[opt + 2] = 14;
  pe[opt + 3] = 29;
  const st = opt + optSize;
  const secOff = headerSize;
  const name = '.text';
  for (let j = 0; j < name.length; j++) pe[st + j] = name.charCodeAt(j);
  dv.setUint32(st + 8, 0x1000, true);
  dv.setUint32(st + 16, 0x400, true);
  dv.setUint32(st + 20, secOff, true);
  pe.fill(0x41, secOff, secOff + 0x400);
  pe.set(text, secOff + 16);
  if (trailing.length > 0) pe.set(trailing, pe.length - trailing.length);
  return pe;
}

function analyze(rawBytes: Uint8Array) {
  return runStaticAnalysis({ analysis_run_id: RUN_ID, artifact: makeArtifact(), rawBytes, analyzed_at: ANALYZED_AT });
}

const INDICATOR_TEXT = [
  'visit https://drop.example.com/stage2',
  'beacon.example.org',
  'operator@example.net',
  '198.51.100.7',
  '2001:db8::9',
  'Global\\P3GuardMutex',
  'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'C:\\Users\\Public\\stage2.exe',
  '/etc/ld.so.preload',
  'powershell.exe -nop -w hidden -enc SQBFAFgA',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo0MTIzNDU2Nzg5MA==',
].join(' padding text ');

describe('P3.5 — indicator projection', () => {
  it('projects every canonical indicator class into typed, fully-populated records', () => {
    const analysis = analyze(buildPe(INDICATOR_TEXT));
    const section = projectStaticEvidence({
      observations: analysis.observations,
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
    }).indicators;

    expect(section.count).toBe(section.indicators.length);
    expect(section.count).toBeGreaterThan(0);
    expect(section.observation_status).toBe('OBSERVED');
    expect(section.observation_id).not.toBeNull();
    expect(section.classes_present.length).toBeGreaterThan(5);
    for (const indicator of section.indicators) {
      expect(CANONICAL_INDICATOR_TYPES).toContain(indicator.indicator_type);
      expect(typeof indicator.value).toBe('string');
      expect(indicator.value.length).toBeGreaterThan(0);
      expect(['ascii', 'utf16le']).toContain(indicator.encoding);
      expect(indicator.epistemic_status).toBe('STATIC_CANDIDATE');
      expect(indicator.execution_confirmed).toBe(false);
      expect(indicator.source_tool).toBe('STATIC_ANALYSIS');
      expect(indicator.tool_version).toBe('1.0.0-static-canonical');
    }
    // Values are the observation's values, not a re-extraction.
    const observation = findObservation(analysis.observations, 'string_indicators')!;
    expect(observation.attributes.indicator_count).toBe(section.count);
    // Coverage + explicit caps come from the same observation.
    expect(section.coverage).toEqual({
      total_strings: observation.attributes.total_strings as number,
      ascii_strings: observation.attributes.ascii_strings as number,
      unicode_strings: observation.attributes.unicode_strings as number,
      scanned_capped: false,
      byte_scan_capped: false,
    });
  });

  it('carries full lineage on every indicator and fails closed without it', () => {
    const analysis = analyze(buildPe(INDICATOR_TEXT));
    const observation = findObservation(analysis.observations, 'string_indicators')!;
    const section = projectStaticIndicatorSection({ observation, artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID });

    const evidenceIds = new Set(observation.evidence_refs.map((r) => r.evidence_id));
    const observationIds = new Set([observation.observation_id]);
    for (const indicator of section.indicators) {
      expect(indicator.artifact_id).toBe(ARTIFACT_ID);
      expect(indicator.analysis_run_id).toBe(RUN_ID);
      expect(evidenceIds.has(indicator.evidence_id)).toBe(true);
      expect(observationIds.has(indicator.observation_id)).toBe(true);
      expect(validateStaticIndicator(indicator)).toEqual([]);
    }
    expect(section.source.evidence_ids.length).toBeGreaterThan(0);
    expect(section.source.source_tool).toBe('STATIC_ANALYSIS');

    // Fail closed: no evidence refs, foreign run, foreign artifact.
    const noRefs: Observation = { ...observation, evidence_refs: [], provenance: { ...observation.provenance, evidence_refs: [] } };
    expect(() => projectStaticIndicatorSection({ observation: noRefs, artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID }))
      .toThrow(StaticEvidenceProjectionError);
    expect(() => projectStaticIndicatorSection({ observation, artifact_id: ARTIFACT_ID, analysis_run_id: 'ar_other_run' }))
      .toThrow(StaticEvidenceProjectionError);
    expect(() => projectStaticIndicatorSection({ observation, artifact_id: 'art_other', analysis_run_id: RUN_ID }))
      .toThrow(StaticEvidenceProjectionError);
    expect(observation.evidence_refs[0].source_id).toBe(STATIC_ANALYZER_SOURCE_ID);
  });

  it('never promotes a static string to behaviour, C2, infrastructure or family', () => {
    const analysis = analyze(buildPe(INDICATOR_TEXT));
    const projected = projectStaticEvidence({
      observations: analysis.observations,
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
    });
    const json = JSON.stringify(projected).toLowerCase();
    for (const word of ['"c2"', 'infrastructure', 'family', 'observed_doing', 'credential', 'persistence', 'behavior']) {
      expect(json.includes(word)).toBe(false);
    }
    // The report-level projection is indicator evidence only.
    expect(projected.indicators.epistemic_status).toBe('STATIC_CANDIDATE');
    expect(projected.indicators.indicators.every((i) => i.execution_confirmed === false)).toBe(true);
  });
});

describe('P3.5 — embedded-object projection', () => {
  const trailing = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x41, 0x41, 0x55, 0x33, 0x21, 0x45, 0x41, 0x30, 0x36]);

  it('projects structural objects with location evidence and never as child artifacts', async () => {
    const rawBytes = buildPe('embedded object test', trailing);
    const analysis = analyze(rawBytes);
    const observation = findObservation(analysis.observations, 'embedded_objects')!;
    const digests = await computeEmbeddedObjectDigests({ observation, raw_bytes: rawBytes });
    const section = projectStaticEvidence({
      observations: analysis.observations,
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      digests,
    }).embedded_objects;

    expect(section.count).toBe(section.objects.length);
    expect(section.count).toBeGreaterThanOrEqual(2);
    const objectTypes = section.objects.map((o) => o.object_type);
    expect(objectTypes).toContain('ZIP_ARCHIVE');
    expect(objectTypes).toContain('COMPILED_AUTOIT_SCRIPT');
    for (const object of section.objects) {
      expect(validateEmbeddedObject(object)).toEqual([]);
      expect(object.extracted).toBe(false);
      expect(object.child_artifact_id).toBeNull();
      expect(object.parent_artifact_id).toBe(ARTIFACT_ID);
      expect(object.analysis_run_id).toBe(RUN_ID);
      expect(object.offset).toBeGreaterThan(0);
      expect(object.source_tool).toBe('STATIC_ANALYSIS');
      // A digest is only computed when the object's extent is known; an object
      // with a known extent must carry its sha256, and one without stays null.
      if (object.size_bytes !== null) {
        expect(object.digest?.algorithm).toBe('sha256');
        expect(object.digest?.value).toHaveLength(64);
      } else {
        expect(object.digest).toBeNull();
      }
    }
    // These magics sit outside any section/resource, so their extent is unknown
    // and no digest is computed (a partial digest is never produced).
    expect(section.objects.every((o) => o.digest === null)).toBe(true);

    // With a known extent the digest IS computed over the exact bytes and
    // surfaced as a sha256 content digest of the structural object.
    const sized: Observation = {
      ...observation,
      attributes: { ...observation.attributes, embedded_object_0_size: 8, embedded_object_0_host_offset: 1024 },
    };
    const objectOffset = Number(sized.attributes.embedded_object_0_host_offset);
    const key = embeddedObjectDigestKey(objectOffset, 8);
    const computed = await computeEmbeddedObjectDigests({ observation: sized, raw_bytes: rawBytes });
    const expected = createHash('sha256').update(rawBytes.subarray(objectOffset, objectOffset + 8)).digest('hex');
    expect(computed[key]).toBe(expected);
    const withDigest = projectStaticEvidence({
      observations: [sized],
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
      digests: computed,
    }).embedded_objects;
    expect(withDigest.objects[0].digest).toEqual({ algorithm: 'sha256', value: expected });
    expect(section.coverage.scanned_bytes).toBe(rawBytes.length);
  });

  it('leaves a digest null when it cannot be computed from the exact bytes', () => {
    const rawBytes = buildPe('embedded object test', trailing);
    const analysis = analyze(rawBytes);
    const section = projectStaticEvidence({
      observations: analysis.observations,
      artifact_id: ARTIFACT_ID,
      analysis_run_id: RUN_ID,
    }).embedded_objects;
    expect(section.objects.every((o) => o.digest === null)).toBe(true);
  });

  it('reports an explicit empty structure when no observation exists (never synthesised)', () => {
    const projected = projectStaticEvidence({ observations: [], artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID });
    expect(projected.indicators.observation_status).toBe('NO_OBSERVATION');
    expect(projected.indicators.count).toBe(0);
    expect(projected.embedded_objects.observation_status).toBe('NO_OBSERVATION');
    expect(projected.embedded_objects.objects).toEqual([]);
    expect(projected.indicators.source.analysis_run_id).toBe(RUN_ID);
  });
});

describe('P3.5 — parser failure visibility', () => {
  it('distinguishes no-data from parser failure at the parser boundary', () => {
    const notPe = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(parsePeOutcome(notPe).status).toBe('NO_DATA');
    expect(parsePeOutcome(notPe).value).toBeNull();

    const mzOnly = new Uint8Array(64);
    mzOnly[0] = 0x4d;
    mzOnly[1] = 0x5a;
    const peOutcome = parsePeOutcome(mzOnly);
    expect(peOutcome.status).toBe('INVALID_SCHEMA');
    expect(String(peOutcome.reason)).toContain('could not be parsed');

    const elfBroken = new Uint8Array(64);
    elfBroken.set([0x7f, 0x45, 0x4c, 0x46], 0);
    expect(parseElfOutcome(elfBroken).status).toBe('INVALID_SCHEMA');
    expect(parseElfOutcome(notPe).status).toBe('NO_DATA');
  });

  it('records the parser outcome on the observation instead of an empty result', () => {
    const mzOnly = new Uint8Array(64);
    mzOnly[0] = 0x4d;
    mzOnly[1] = 0x5a;
    const analysis = analyze(mzOnly);
    const meta = findObservation(analysis.observations, 'binary_metadata')!;
    expect(meta.attributes.analysis_status).toBe('ERROR');
    expect(meta.attributes.parse_outcome).toBe('INVALID_SCHEMA');
    expect(String(meta.attributes.reason)).toContain('could not be parsed');

    // A successfully parsed artifact announces OK.
    const ok = analyze(buildPe('parser ok'));
    expect(findObservation(ok.observations, 'binary_metadata')!.attributes.parse_outcome).toBe('OK');
  });

  it('surfaces the resource-walk layout outcome on the embedded-object observation', () => {
    const mzOnly = new Uint8Array(64);
    mzOnly[0] = 0x4d;
    mzOnly[1] = 0x5a;
    const embedded = findObservation(analyze(mzOnly).observations, 'embedded_objects')!;
    expect(embedded.attributes.pe_layout_outcome).toBe('INVALID_SCHEMA');
    const ok = findObservation(analyze(buildPe('layout ok')).observations, 'embedded_objects')!;
    expect(ok.attributes.pe_layout_outcome).toBe('OK');
  });
});

describe('P3.5 — deterministic replay and budget single source', () => {
  it('produces identical normalized projections for identical bytes', () => {
    const rawBytes = buildPe(INDICATOR_TEXT, new Uint8Array([0x41, 0x55, 0x33, 0x21, 0x45, 0x41, 0x30, 0x36]));
    const once = analyze(rawBytes);
    const twice = analyze(rawBytes);
    const project = (observations: Observation[]) =>
      JSON.stringify(projectStaticEvidence({ observations, artifact_id: ARTIFACT_ID, analysis_run_id: RUN_ID }));
    expect(project(once.observations)).toBe(project(twice.observations));
    expect(JSON.stringify(extractStringIndicators(rawBytes))).toBe(JSON.stringify(extractStringIndicators(rawBytes)));
    expect(JSON.stringify(scanEmbeddedObjects(rawBytes, true))).toBe(JSON.stringify(scanEmbeddedObjects(rawBytes, true)));
  });

  it('keeps every extraction cap in one authoritative budget source', () => {
    const source = readFileSync('packages/intelligence/src/malware/canonical/staticAnalysis.ts', 'utf8');
    // No duplicated/legacy budget constants may survive.
    for (const legacy of ['MAX_STRING_INDICATOR_ATTRS', 'MAX_EMBEDDED_SCAN_BYTES', 'MAX_SIGNATURE_HITS', 'MAX_INDICATORS_PER_CATEGORY', 'MAX_STRINGS_SCANNED', 'MAX_STRING_RUN_LEN', 'MAX_STRING_VALUE_LEN']) {
      expect(source.includes(legacy)).toBe(false);
    }
    expect(source.match(/STATIC_EXTRACTION_BUDGETS/g)!.length).toBeGreaterThanOrEqual(5);
    expect(Object.isFrozen(STATIC_EXTRACTION_BUDGETS)).toBe(true);

    // The single indicator budget is enforced and reported, not silently applied.
    const dense = new TextEncoder().encode(
      Array.from({ length: 400 }, (_, i) => `https://budget${i}.example.com/path`).join(' ')
    );
    const result = extractStringIndicators(dense);
    expect(result.indicators.length).toBeLessThanOrEqual(STATIC_EXTRACTION_BUDGETS.indicators);
    const urls = result.indicators.filter((i) => i.id === 'url');
    expect(urls.length).toBeLessThanOrEqual(STATIC_EXTRACTION_BUDGETS.indicators_per_class);
    expect(urls.length).toBe(STATIC_EXTRACTION_BUDGETS.indicators_per_class);
  });
});
