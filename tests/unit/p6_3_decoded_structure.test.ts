/**
 * Phase 6.3 — structural intelligence of the VERIFIED decoded artifact
 * (focused tests).
 *
 * Locks the phase-6.3 contract end to end:
 *   (1) extraction is DETERMINISTIC: identical verified bytes ⇒ byte-equal
 *       section, including every record identity;
 *   (2) every record is TYPED and carries the EXACT value;
 *   (3) every record carries provenance (artifact id, run id, source evidence
 *       id, observation id, extraction method, extractor version);
 *   (4) the section is BOUND to this report's decoded child artifact — a
 *       foreign artifact, a foreign run, the extraction parent or the analyzed
 *       sample itself is rejected;
 *   (5) malformed input is rejected with deterministic codes (fail closed);
 *   (6) no unsupported inference: behavior/family/campaign/actor/C2/
 *       infrastructure/ATT&CK/MBC fields reject the whole section, and the
 *       extractor emits none of them;
 *   (7) the stored-report READ GATE accepts a valid section and rejects a
 *       tampered one — the SAME validator the write path runs.
 */

import { describe, it, expect } from 'bun:test';

import {
  AUTOIT_DECODER_METHOD,
  AUTOIT_DECODER_VERIFICATION,
  AUTOIT_DECODER_VERSION,
  AUTOIT_EXTRACTION_LAYER_VERSION,
  AUTOIT_EXTRACTION_METHOD,
  AUTOIT_RESOURCE_MAGIC,
  type ContainerDecodeRecord,
  type ContainerExtractionRecord,
  type DerivedArtifact,
} from '../../packages/intelligence/src/malware/canonical/autoItResourceExtractor';
import {
  DECODED_ARTIFACT_ORIGIN,
} from '../../packages/intelligence/src/malware/canonical/autoItResourceExtractor';
import {
  DECODED_INDICATOR_TYPES,
  DECODED_REPRESENTATION_DETECTION_METHOD,
  DECODED_REPRESENTATION_DETECTOR_VERSION,
  DECODED_REPRESENTATION_TOKENIZED,
  detectDecodedRepresentation,
  DECODED_STRUCTURE_EXTRACTOR_VERSION,
  DECODED_STRUCTURE_FORBIDDEN_KEYS,
  DECODED_STRUCTURE_INFERENCE_BOUNDARY,
  DECODED_STRUCTURE_LAYER_VERSION,
  DECODED_STRUCTURE_METHOD,
  buildDecodedStructureSection,
  emptyDecodedStructureSection,
  validateDecodedStructureSection,
  type DecodedStructureSection,
} from '../../packages/intelligence/src/malware/canonical/decodedStructuralIntelligence';
import { materializeCanonicalReport } from '../../packages/intelligence/src/malware/canonical/reportMaterialization';
import { validateStoredMalwareReport } from '../../packages/intelligence/src/malware/canonical/storedReportValidation';
import { CURRENT_MALWARE_REPORT_CONTRACT_VERSION } from '../../packages/intelligence/src/malware/canonical/reportContract';

const RUN_ID = 'ar-p63-test-0001';
const OTHER_RUN_ID = 'ar-p63-test-0002';
const OTHER_ARTIFACT_ID = 'art_gmf_p63test0000000002';
const AT = '2026-09-23T00:00:00.000Z';

const MAGIC_BYTES = new Uint8Array([...AUTOIT_RESOURCE_MAGIC].map((c) => c.charCodeAt(0)));
const EXTENT_OFFSET = 0x400;
const EXTENT_SIZE = 96;

/**
 * The decoded script this phase extracts structure from. It is synthetic, but
 * it is shaped like a decoded AutoIt script (directives, a function, a
 * variable, a constant, a call, paths, a URL, an embedded base64 run) so every
 * typed category the phase claims is exercised by the real pipeline.
 */
const SCRIPT_TEXT = [
  '#Region ;*** Start AutoIt3 ***',
  '#Include <Array.au3>',
  'Global Const $S_ENDPOINT = "http://update.example.com/ping"',
  '$sTarget = "192.0.2.44"',
  'Func DoWork($sArg, $iPort)',
  '    Local $sCmd = "cmd.exe /c whoami"',
  '    $sKey = "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater"',
  '    $sPath = "C:\\Users\\Public\\AppData\\updater.exe"',
  '    $sNix = "/etc/passwd"',
  '    $sBlob = "QmFzZTY0UGF5bG9hZEJsb2JGb3JQaGFzZTYzVGVzdFB1cnBvc2VzT25seTEyMzQ1Ng=="',
  '    ConsoleWrite($S_ENDPOINT & $sArg)',
  '    Return $iPort',
  'EndFunc',
  '#EndRegion',
  '',
].join('\r\n');

const SCRIPT_BYTES = new TextEncoder().encode(SCRIPT_TEXT);

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/** A REAL PE32 image whose .rsrc section holds one RCDATA resource. */
function buildPeWithAutoItResource(payload: Uint8Array): { bytes: Uint8Array; extent_offset: number; extent_size: number } {
  const SEC_RVA = 0x2000;
  const SEC_PTR = 0x400;
  const blobSize = 16 + 8 + 24 + 24 + 16 + payload.length;
  const bytes = new Uint8Array(SEC_PTR + blobSize);
  const dv = new DataView(bytes.buffer);
  bytes[0] = 0x4d;
  bytes[1] = 0x5a;
  dv.setUint32(0x3c, 0x40, true);
  const pe = 0x40;
  bytes[pe] = 0x50;
  bytes[pe + 1] = 0x45;
  dv.setUint16(pe + 4, 0x14c, true);
  dv.setUint16(pe + 6, 2, true);
  dv.setUint16(pe + 20, 224, true);
  const opt = pe + 24;
  dv.setUint16(opt, 0x10b, true);
  const dd = opt + 96;
  dv.setUint32(dd + 16, SEC_RVA, true);
  dv.setUint32(dd + 20, blobSize, true);
  const st = opt + 224;
  const textName = '.text';
  for (let i = 0; i < textName.length; i += 1) bytes[st + i] = textName.charCodeAt(i);
  dv.setUint32(st + 8, 0x200, true);
  dv.setUint32(st + 12, 0x1000, true);
  dv.setUint32(st + 16, 0x200, true);
  dv.setUint32(st + 20, 0x200, true);
  const rs = st + 40;
  const rsrcName = '.rsrc';
  for (let i = 0; i < rsrcName.length; i += 1) bytes[rs + i] = rsrcName.charCodeAt(i);
  dv.setUint32(rs + 8, blobSize, true);
  dv.setUint32(rs + 12, SEC_RVA, true);
  dv.setUint32(rs + 16, blobSize, true);
  dv.setUint32(rs + 20, SEC_PTR, true);
  const b = SEC_PTR;
  const l1Entry = 16;
  const l1Dir = 24;
  const l2Dir = 48;
  const dataEntry = 72;
  const payloadOff = 88;
  dv.setUint16(b + 14, 1, true);
  dv.setUint32(b + l1Entry, 10, true);
  dv.setUint32(b + l1Entry + 4, 0x80000000 | l1Dir, true);
  dv.setUint16(b + l1Dir + 14, 1, true);
  dv.setUint32(b + l1Dir + 16, 1, true);
  dv.setUint32(b + l1Dir + 20, 0x80000000 | l2Dir, true);
  dv.setUint16(b + l2Dir + 14, 1, true);
  dv.setUint32(b + l2Dir + 16, 1033, true);
  dv.setUint32(b + l2Dir + 20, dataEntry, true);
  dv.setUint32(b + dataEntry, SEC_RVA + payloadOff, true);
  dv.setUint32(b + dataEntry + 4, payload.length, true);
  bytes.set(payload, b + payloadOff);
  return { bytes, extent_offset: b + payloadOff, extent_size: payload.length };
}

const toolResults = (artifactId: string, sha: string) =>
  ['lief', 'floss', 'die', 'yara-x', 'capa', 'magika'].map((tool_id) => ({
    tool_id,
    tool_version: null,
    status: 'UNAVAILABLE' as const,
    output: null,
    note: 'the analysis plane was unavailable for this structural test',
    provenance: {
      tool_id,
      tool_version: null,
      analysis_run_id: RUN_ID,
      artifact_id: artifactId,
      input_sha256: sha,
      runner_identity: 'p63-test',
      ruleset_version: null,
      ruleset_digest: null,
      tool_binary_digest: null,
    },
  }));

async function extractionRecord(bytes: Uint8Array, offset: number, size: number): Promise<ContainerExtractionRecord> {
  const payload = bytes.slice(offset, offset + size);
  return {
    status: 'EXTRACTED',
    error_class: null,
    note: null,
    extractor_version: AUTOIT_EXTRACTION_LAYER_VERSION,
    extraction_method: AUTOIT_EXTRACTION_METHOD,
    parent_sha256: await sha256Hex(bytes),
    host_offset: offset,
    size_bytes: size,
    resource_type: 'RCDATA',
    resource_id: 1,
    magic_offset: offset,
    output_sha256: await sha256Hex(payload),
    output_size_bytes: size,
    output_b64: b64(payload),
    duration_ms: 3,
  };
}

/** The plane's decode record for the synthetic decoded script. */
async function decodeRecord(over: Partial<ContainerDecodeRecord> = {}): Promise<ContainerDecodeRecord> {
  return {
    status: 'DECODED',
    note: null,
    decoder_method: AUTOIT_DECODER_METHOD,
    decoder_version: AUTOIT_DECODER_VERSION,
    verification: AUTOIT_DECODER_VERIFICATION,
    output_sha256: await sha256Hex(SCRIPT_BYTES),
    output_size_bytes: SCRIPT_BYTES.length,
    output_b64: b64(SCRIPT_BYTES),
    output_name: 'script',
    records: [{ marker: '>>>AUTOIT SCRIPT<<<', declared_crc32: 1 }],
    duration_ms: 5,
    ...over,
  };
}

/**
 * Materialize a REAL report through the canonical pipeline: a PE with one
 * RCDATA extent, its verified extraction, and a verified decode of that extent.
 */
async function materializeFixture(options: { with_decode?: boolean } = {}) {
  const withDecode = options.with_decode ?? true;
  const containerPayload = new Uint8Array([...MAGIC_BYTES, ...new Array(88).fill(0x42)]);
  const { bytes, extent_offset, extent_size } = buildPeWithAutoItResource(containerPayload);
  const sha = await sha256Hex(bytes);
  const artifactId = `art_gmf_${sha.slice(0, 16)}`;
  const materialization = await materializeCanonicalReport({
    job: { job_id: 'job_p63_read', analysis_run_id: RUN_ID, artifact_id: artifactId, sha256: sha, toolchain_version: null },
    rawBytes: bytes,
    container_results: toolResults(artifactId, sha),
    container_extractions: [await extractionRecord(bytes, extent_offset, extent_size)],
    container_decodings: withDecode ? [await decodeRecord()] : [],
    runner_identity: 'p63-test',
    acquisition_context: { source_sample_id: 'p63_holdout', file_names: ['p63_holdout.bin'], size_bytes: bytes.length },
    mapping_catalog: [],
    analyzed_at: AT,
    generated_at: AT,
  });
  if (materialization.status !== 'MATERIALIZED') {
    throw new Error(`fixture did not materialize: ${materialization.code} ${materialization.detail}`);
  }
  const payload = materialization.public_payload as Record<string, any>;
  const decodedChild: DerivedArtifact | null =
    payload.detection_artifacts.derived_artifacts.find(
      (d: DerivedArtifact) => d.origin === DECODED_ARTIFACT_ORIGIN,
    ) ?? null;
  return { materialization, payload, decodedChild, scriptBytes: SCRIPT_BYTES };
}

function gate(p: Record<string, any>): string[] {
  return validateStoredMalwareReport({ stored_id: String(p.report_id), stored_sha256: p.sha256, payload: p });
}

// ── 1. deterministic extraction ─────────────────────────────────────────

describe('phase 6.3 — deterministic extraction', () => {
  it('1. identical verified bytes produce a byte-identical section (twice, and across runs)', async () => {
    const first = await materializeFixture();
    const second = await materializeFixture();
    const a = first.payload.decoded_structure as DecodedStructureSection;
    const b = second.payload.decoded_structure as DecodedStructureSection;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.deterministic_identity).toBe(b.deterministic_identity);
    expect(a.status).toBe('OBSERVED');
    expect(a.artifact_id).toBe(`art_${await sha256Hex(SCRIPT_BYTES)}`);
    expect(a.decoded_sha256).toBe(await sha256Hex(SCRIPT_BYTES));
    expect(a.decoded_size_bytes).toBe(SCRIPT_BYTES.length);
    expect(a.projection_version).toBe(DECODED_STRUCTURE_LAYER_VERSION);
    expect(a.extraction_method).toBe(DECODED_STRUCTURE_METHOD);
    expect(a.extractor_version).toBe(DECODED_STRUCTURE_EXTRACTOR_VERSION);
  });

  it('2. the section is a pure function of (bytes, decoded child, run): re-extraction is identical', async () => {
    const { decodedChild, payload } = await materializeFixture();
    const again = buildDecodedStructureSection({
      bytes: SCRIPT_BYTES,
      decoded_child: decodedChild,
      analysis_run_id: RUN_ID,
    });
    expect(JSON.stringify(again)).toBe(JSON.stringify(payload.decoded_structure));
  });

  it('3. different bytes produce a different section identity (content-addressed)', () => {
    const other = new Uint8Array(SCRIPT_BYTES);
    other[0] = 0x23;
    const child = {
      artifact_id: `art_${'1'.repeat(64)}`,
      origin: DECODED_ARTIFACT_ORIGIN,
      hashes: { sha256: '1'.repeat(64) },
      parent_artifact_id: `art_${'2'.repeat(64)}`,
      parent_sha256: '2'.repeat(64),
      analysis_run_id: RUN_ID,
      evidence_ids: ['ev_static_p63'],
      observation_id: 'obs_static_p63_embedded_objects',
      decode: { state: 'DECODED' },
      file_size_bytes: other.length,
    } as unknown as DerivedArtifact;
    const section = buildDecodedStructureSection({ bytes: other, decoded_child: child, analysis_run_id: RUN_ID });
    const base = emptyDecodedStructureSection({ analysis_run_id: RUN_ID, reason: 'x' });
    expect(section.status).toBe('OBSERVED');
    expect(section.deterministic_identity).not.toBe(base.deterministic_identity);
    expect(section.deterministic_identity.startsWith('dss_')).toBe(true);
  });

  it('4. without a verified decode the section is an explicit NOT_APPLICABLE statement', async () => {
    const { payload } = await materializeFixture({ with_decode: false });
    const section = payload.decoded_structure as DecodedStructureSection;
    expect(section.status).toBe('NOT_APPLICABLE');
    expect(section.artifact_id).toBeNull();
    expect(section.decoded_sha256).toBeNull();
    expect(section.counts).toEqual({ observations: 0, indicators: 0, embedded_data: 0 });
    expect(section.status_reason.length).toBeGreaterThan(0);
    // Absence is stated, never fabricated — and the row still satisfies the
    // contract because the section is PRESENT.
    expect(validateDecodedStructureSection(section, { artifact_id: payload.artifact_id, analysis_run_id: RUN_ID })).toEqual([]);
  });
});

// ── 2. typed indicators, exact values ───────────────────────────────────

describe('phase 6.3 — typed indicators', () => {
  it('5. every indicator carries a closed-set type, the exact value and an encoding', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    expect(section.counts.indicators).toBe(section.indicators.length);
    expect(section.indicators.length).toBeGreaterThan(0);
    for (const indicator of section.indicators) {
      expect(DECODED_INDICATOR_TYPES).toContain(indicator.indicator_type);
      expect(typeof indicator.value).toBe('string');
      expect(indicator.value.length).toBeGreaterThan(0);
      expect(['ascii', 'utf16le']).toContain(indicator.encoding);
      expect(indicator.epistemic_status).toBe('STATIC_CANDIDATE');
      expect(indicator.execution_confirmed).toBe(false);
    }
  });

  it('6. the decoded script structure is represented by typed indicators', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const byType = new Map<string, string[]>();
    for (const i of section.indicators) {
      byType.set(i.indicator_type, [...(byType.get(i.indicator_type) ?? []), i.value]);
    }
    expect(byType.get('AUTOIT_INCLUDE_DIRECTIVE')).toContain('Array.au3');
    expect(byType.get('AUTOIT_FUNCTION_DEFINITION')).toContain('DoWork');
    expect(byType.get('AUTOIT_CONSTANT')).toContain('$S_ENDPOINT');
    expect(byType.get('AUTOIT_FUNCTION_CALL') ?? []).toContain('ConsoleWrite');
    // Values are the EXACT extracted runs (never trimmed or repaired), so a
    // run that is followed by a quote keeps that quote.
    expect(byType.get('URL')?.some((v) => v.startsWith('http://update.example.com/ping'))).toBe(true);
    expect(byType.get('DOMAIN')).toContain('update.example.com');
    expect(byType.get('IPV4')).toContain('192.0.2.44');
    expect(byType.get('REGISTRY_PATH')?.[0]).toContain('HKEY_LOCAL_MACHINE');
    expect(byType.get('WINDOWS_PATH')?.[0]).toContain('C:\\Users\\Public');
    expect(byType.get('UNIX_PATH')?.some((v) => v.startsWith('/etc/passwd'))).toBe(true);
    expect(byType.get('COMMAND_FRAGMENT')?.[0]).toContain('cmd.exe');
    expect(byType.get('ENCODED_BLOB_BASE64')?.length).toBeGreaterThan(0);
    expect(byType.get('AUTOIT_VARIABLE')?.length).toBeGreaterThan(0);
  });

  it('7. structure observations carry exact aggregate counts, and embedded data is typed', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const measures = new Map(section.observations.map((o) => [o.subject, o.value]));
    expect(measures.get('byte_length')).toBe(SCRIPT_BYTES.length);
    expect(measures.get('function_definition_count')).toBe(1);
    expect(measures.get('include_directive_count')).toBe(1);
    expect(measures.get('constant_assignment_count')).toBe(1);
    expect(Number(measures.get('variable_reference_count'))).toBeGreaterThan(0);
    expect(measures.get('line_count')).toBeGreaterThan(0);
    for (const record of section.embedded_data) {
      expect(['ENCODED_BLOB_BASE64', 'ENCODED_BLOB_HEX', 'NESTED_PE', 'ZIP_ARCHIVE', 'GZIP_STREAM', 'ZLIB_STREAM', 'COMPILED_AUTOIT_SCRIPT', 'AUTOIT_SCRIPT_MARKER']).toContain(record.data_type);
      expect(record.offset === null || record.offset < SCRIPT_BYTES.length).toBe(true);
    }
    expect(section.embedded_data.some((e) => e.data_type === 'ENCODED_BLOB_BASE64')).toBe(true);
  });
});

// ── 3. provenance and binding ───────────────────────────────────────────

describe('phase 6.3 — provenance and artifact/run binding', () => {
  it('8. every record carries artifact id, run id, evidence id, observation id, method and version', async () => {
    const { payload, decodedChild } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    expect(decodedChild).not.toBeNull();
    expect(section.artifact_id).toBe(decodedChild!.artifact_id);
    expect(section.parent_artifact_id).toBe(decodedChild!.parent_artifact_id);
    const lineage = new Set(decodedChild!.evidence_ids);
    for (const record of [...section.observations, ...section.indicators, ...section.embedded_data]) {
      expect(record.artifact_id).toBe(decodedChild!.artifact_id);
      expect(record.analysis_run_id).toBe(RUN_ID);
      expect(lineage.has(record.source_evidence_id)).toBe(true);
      expect(record.observation_id).toBe(decodedChild!.observation_id);
      expect(record.extraction_method).toBe(DECODED_STRUCTURE_METHOD);
      expect(record.extractor_version).toBe(DECODED_STRUCTURE_EXTRACTOR_VERSION);
    }
    expect(section.source.evidence_ids.length).toBeGreaterThan(0);
    expect(section.source.observation_id).toBe(decodedChild!.observation_id);
    expect(section.source.artifact_id).toBe(decodedChild!.artifact_id);
  });

  it('9. the section validates against its own report and is grounded there', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const context = {
      artifact_id: payload.artifact_id,
      analysis_run_id: RUN_ID,
      derived_artifacts: payload.detection_artifacts.derived_artifacts,
    };
    expect(validateDecodedStructureSection(section, context)).toEqual([]);
    expect(payload.detection_artifacts.derived_artifacts.map((d: DerivedArtifact) => d.artifact_id)).toContain(
      section.artifact_id,
    );
    expect(payload.grounding.all_statements_grounded).toBe(true);
    expect(payload.grounding.ai_generated_facts).toBe(0);
  });

  it('10. a section built from a foreign run or a non-decode artifact fails closed', async () => {
    const { payload, decodedChild } = await materializeFixture();
    const parentExtraction = payload.detection_artifacts.derived_artifacts.find(
      (d: DerivedArtifact) => d.origin !== DECODED_ARTIFACT_ORIGIN,
    ) as DerivedArtifact;
    const foreignRun = buildDecodedStructureSection({
      bytes: SCRIPT_BYTES,
      decoded_child: decodedChild,
      analysis_run_id: OTHER_RUN_ID,
    });
    expect(foreignRun.status).toBe('NOT_APPLICABLE');
    const notADecode = buildDecodedStructureSection({
      bytes: SCRIPT_BYTES,
      decoded_child: parentExtraction,
      analysis_run_id: RUN_ID,
    });
    expect(notADecode.status).toBe('NOT_APPLICABLE');
    const wrongSize = buildDecodedStructureSection({
      bytes: SCRIPT_BYTES.slice(0, 16),
      decoded_child: decodedChild,
      analysis_run_id: RUN_ID,
    });
    expect(wrongSize.status).toBe('NOT_APPLICABLE');
    const noBytes = buildDecodedStructureSection({ bytes: null, decoded_child: decodedChild, analysis_run_id: RUN_ID });
    expect(noBytes.status).toBe('NOT_APPLICABLE');
  });

  it('11. a section naming another artifact, another run or the analyzed sample is rejected', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const context = {
      artifact_id: payload.artifact_id,
      analysis_run_id: RUN_ID,
      derived_artifacts: payload.detection_artifacts.derived_artifacts,
    };
    expect(
      validateDecodedStructureSection({ ...section, analysis_run_id: OTHER_RUN_ID }, context),
    ).toContain(`decoded_structure:foreign_analysis_run:${OTHER_RUN_ID}`);
    expect(
      validateDecodedStructureSection({ ...section, artifact_id: OTHER_ARTIFACT_ID }, context),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/^decoded_structure:artifact_id_not_content_addressed/)]));
    expect(
      validateDecodedStructureSection({ ...section, artifact_id: payload.artifact_id, decoded_sha256: payload.sha256 }, context),
    ).toContain('decoded_structure:analyzed_sample_promoted');
    expect(
      validateDecodedStructureSection({ ...section, parent_artifact_id: OTHER_ARTIFACT_ID }, context),
    ).toContain('decoded_structure:parent_artifact_mismatch');
    expect(
      validateDecodedStructureSection(
        { ...section, source: { ...section.source, evidence_ids: ['ev_static_foreign'] } },
        context,
      ),
    ).toContain('decoded_structure:evidence_not_in_artifact_lineage:ev_static_foreign');
    expect(
      validateDecodedStructureSection(
        { ...section, artifact_id: `art_${'f'.repeat(64)}`, decoded_sha256: 'f'.repeat(64) },
        context,
      ),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/^decoded_structure:artifact_not_a_derived_artifact/)]));
    // A record that borrows another artifact/run is rejected too.
    const borrowed = JSON.parse(JSON.stringify(section));
    borrowed.indicators[0].artifact_id = OTHER_ARTIFACT_ID;
    expect(validateDecodedStructureSection(borrowed, context)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:record_artifact_mismatch/)]),
    );
  });
});

// ── 4. malformed input (fail closed) ────────────────────────────────────

describe('phase 6.3 — malformed input', () => {
  it('12. structurally malformed sections are rejected with deterministic codes', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const context = {
      artifact_id: payload.artifact_id,
      analysis_run_id: RUN_ID,
      derived_artifacts: payload.detection_artifacts.derived_artifacts,
    };
    expect(validateDecodedStructureSection(null, context)).toEqual(['decoded_structure:not_an_object']);
    expect(validateDecodedStructureSection('decoded', context)).toEqual(['decoded_structure:not_an_object']);
    expect(validateDecodedStructureSection({ ...section, status: 'TRUSTED' }, context)).toContain(
      'decoded_structure:status_unknown:TRUSTED',
    );
    expect(validateDecodedStructureSection({ ...section, status_reason: '' }, context)).toContain(
      'decoded_structure:status_reason_absent',
    );
    expect(validateDecodedStructureSection({ ...section, projection_version: '9.9.9' }, context)).toContain(
      'decoded_structure:projection_version:9.9.9',
    );
    expect(validateDecodedStructureSection({ ...section, extractor_version: 'x' }, context)).toContain(
      'decoded_structure:extractor_version:x',
    );
    expect(validateDecodedStructureSection({ ...section, epistemic_status: 'OBSERVED_DOING' }, context)).toContain(
      'decoded_structure:epistemic_status:OBSERVED_DOING',
    );
    expect(validateDecodedStructureSection({ ...section, execution_confirmed: true }, context)).toContain(
      'decoded_structure:execution_confirmed',
    );
    expect(validateDecodedStructureSection({ ...section, inference_boundary: '' }, context)).toContain(
      'decoded_structure:inference_boundary_absent',
    );
    expect(validateDecodedStructureSection({ ...section, counts: { observations: 0, indicators: 0, embedded_data: 0 } }, context)).toEqual(
      expect.arrayContaining([
        'decoded_structure:observation_count_mismatch',
        'decoded_structure:indicator_count_mismatch',
      ]),
    );
    expect(validateDecodedStructureSection({ ...section, unexpected_extension: 1 }, context)).toContain(
      'decoded_structure:unsupported_field:unexpected_extension',
    );
    // A NOT_APPLICABLE section that still carries records or an artifact is a
    // contradiction, not a statement of absence.
    expect(
      validateDecodedStructureSection({ ...section, status: 'NOT_APPLICABLE' }, context),
    ).toEqual(expect.arrayContaining(['decoded_structure:not_applicable_with_artifact', 'decoded_structure:not_applicable_with_records']));
  });

  it('13. a tampered value, type, encoding, identity or extent is rejected', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const context = {
      artifact_id: payload.artifact_id,
      analysis_run_id: RUN_ID,
      derived_artifacts: payload.detection_artifacts.derived_artifacts,
    };
    const mutate = (fn: (copy: any) => void) => {
      const copy = JSON.parse(JSON.stringify(section));
      fn(copy);
      return validateDecodedStructureSection(copy, context);
    };
    expect(mutate((c) => { c.indicators[0].value = `${c.indicators[0].value}_tampered`; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:nondeterministic_indicator_identity/)])
    );
    expect(mutate((c) => { c.indicators[0].indicator_type = 'NOT_A_TYPE'; })).toContain(
      'decoded_structure:indicator_type_unknown:NOT_A_TYPE',
    );
    expect(mutate((c) => { c.indicators[0].encoding = 'utf32le'; })).toContain(
      'decoded_structure:indicator_encoding_unknown:utf32le',
    );
    expect(mutate((c) => { c.indicators[0].indicator_id = 'dsi_deadbeefdeadbeef'; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:nondeterministic_indicator_identity/)])
    );
    expect(mutate((c) => { c.observations[0].value = 999999; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:nondeterministic_observation_identity/)])
    );
    expect(mutate((c) => { c.embedded_data[0].offset = 10_000_000; })).toContain(
      'decoded_structure:embedded_offset_out_of_bounds',
    );
    expect(mutate((c) => { c.embedded_data[0].data_type = 'NOT_A_TYPE'; })).toContain(
      'decoded_structure:embedded_data_type_unknown:NOT_A_TYPE',
    );
    expect(mutate((c) => { c.deterministic_identity = 'dss_0000000000000000'; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:nondeterministic_section_identity/)])
    );
    expect(mutate((c) => { c.coverage.bytes_scanned = -1; })).toContain('decoded_structure:bytes_scanned_invalid');
    expect(mutate((c) => { c.coverage.bytes_scanned = SCRIPT_BYTES.length; delete c.indicators; })).toEqual(
      expect.arrayContaining(['decoded_structure:indicator_count_mismatch']),
    );
    expect(mutate((c) => { c.indicators[0].value = 'x'.repeat(257); })).toContain(
      'decoded_structure:indicator_value_unbounded',
    );
    expect(mutate((c) => { c.indicators[0].epistemic_status = 'DERIVED'; })).toContain(
      'decoded_structure:record_epistemic_status_invalid',
    );
  });
});

// ── 5. no unsupported inference ─────────────────────────────────────────

describe('phase 6.3 — no unsupported inference', () => {
  it('14. the extractor emits no behavior, family, campaign, actor, C2, infrastructure or technique field', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const keys = new Set<string>();
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        keys.add(key);
        walk(child);
      }
    };
    walk(section);
    for (const forbidden of DECODED_STRUCTURE_FORBIDDEN_KEYS) {
      expect(keys.has(forbidden)).toBe(false);
    }
    expect(section.inference_boundary).toBe(DECODED_STRUCTURE_INFERENCE_BOUNDARY);
    // Nothing in the section promotes a semantic claim elsewhere in the report.
    expect(payload.behaviors.items).toEqual([]);
    expect(payload.family.resolution_state).toBe('UNRESOLVED');
    expect(payload.infrastructure.items).toEqual([]);
    expect(payload.attack_mbc.items).toEqual([]);
  });

  it('15. injecting an inference field rejects the WHOLE section (at any depth)', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    const context = {
      artifact_id: payload.artifact_id,
      analysis_run_id: RUN_ID,
      derived_artifacts: payload.detection_artifacts.derived_artifacts,
    };
    expect(validateDecodedStructureSection({ ...section, malware_family: 'ExampleFamily' }, context)).toContain(
      'decoded_structure:unsupported_inference_field:malware_family',
    );
    const nested = JSON.parse(JSON.stringify(section));
    nested.indicators[0].c2 = 'http://update.example.com/ping';
    expect(validateDecodedStructureSection(nested, context)).toContain(
      'decoded_structure:unsupported_inference_field:indicators[0].c2',
    );
    const deep = JSON.parse(JSON.stringify(section));
    deep.observations[0].attack_technique = 'T1071';
    expect(validateDecodedStructureSection(deep, context)).toContain(
      'decoded_structure:unsupported_inference_field:observations[0].attack_technique',
    );
    expect(validateDecodedStructureSection({ ...section, inference_boundary: 'this script steals credentials' }, context)).toContain(
      'decoded_structure:inference_boundary_absent',
    );
  });
});

// ── 6. the read gate ────────────────────────────────────────────────────

describe('phase 6.3 — read gate', () => {
  it('16. the stored row carrying the section is servable, and the contract requires it', async () => {
    const { materialization, payload } = await materializeFixture();
    const stored = { ...payload, overall_status: 'SUCCEEDED', tool_results: materialization.tool_results };
    expect(payload.report_version).toBe(CURRENT_MALWARE_REPORT_CONTRACT_VERSION);
    expect(gate(stored)).toEqual([]);
    expect(materialization.summary.decoded_structure_status).toBe('OBSERVED');
    expect(materialization.summary.decoded_structure_indicators).toBeGreaterThan(0);

    const withoutSection = JSON.parse(JSON.stringify(stored));
    delete withoutSection.decoded_structure;
    expect(gate(withoutSection)).toContain(
      `contract:missing_required_section:${CURRENT_MALWARE_REPORT_CONTRACT_VERSION}:decoded_structure`,
    );

    const withoutCounts = JSON.parse(JSON.stringify(stored));
    delete withoutCounts.decoded_structure.counts;
    expect(gate(withoutCounts)).toContain(
      `contract:missing_required_field:${CURRENT_MALWARE_REPORT_CONTRACT_VERSION}:decoded_structure.counts`,
    );
  });

  it('17. the read gate rejects a tampered or foreign-binding section', async () => {
    const { materialization, payload } = await materializeFixture();
    const stored = { ...payload, overall_status: 'SUCCEEDED', tool_results: materialization.tool_results };
    const mutate = (fn: (copy: any) => void) => {
      const copy = JSON.parse(JSON.stringify(stored));
      fn(copy);
      return gate(copy);
    };
    expect(mutate((c) => { c.decoded_structure.analysis_run_id = OTHER_RUN_ID; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:foreign_analysis_run/)]),
    );
    expect(mutate((c) => { c.decoded_structure.indicators[0].value = 'tampered'; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:nondeterministic_indicator_identity/)]),
    );
    expect(mutate((c) => { c.decoded_structure.attack = [{ technique_id: 'T1055' }]; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:unsupported_inference/)]),
    );
    expect(mutate((c) => { c.decoded_structure.source.evidence_ids = ['ev_foreign']; })).toEqual(
      expect.arrayContaining([expect.stringMatching(/^decoded_structure:evidence_not_in_artifact_lineage/)]),
    );
    // Removing the decoded child leaves the section describing an artifact the
    // report does not carry: the row is not servable.
    expect(
      mutate((c) => {
        c.detection_artifacts.derived_artifacts = c.detection_artifacts.derived_artifacts.filter(
          (d: DerivedArtifact) => d.origin !== DECODED_ARTIFACT_ORIGIN,
        );
      }),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/^decoded_structure:artifact_not_a_derived_artifact/)]));
  });

  it('18. a run with no verified decode still publishes a servable, explicit section', async () => {
    const { materialization, payload } = await materializeFixture({ with_decode: false });
    const stored = { ...payload, overall_status: 'SUCCEEDED', tool_results: materialization.tool_results };
    expect((payload.decoded_structure as DecodedStructureSection).status).toBe('NOT_APPLICABLE');
    expect(gate(stored)).toEqual([]);
  });
});

// ── 8. phase 6.3.2 — deterministic representation detection (fail closed) ──

describe('phase 6.3.2 — TOKENIZED_PAYLOAD representation detection', () => {
  /** The REAL verified token-stream shape: length-prefixed UTF-16LE records. */
  function tokenStream(count: number): Uint8Array {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < count; i += 1) {
      const text = `TK${i}TOKEN`;
      const content = new Uint8Array(text.length * 2);
      for (let j = 0; j < text.length; j += 1) {
        content[j * 2] = text.charCodeAt(j);
        // odd position NUL for ASCII text
      }
      const head = new Uint8Array(4);
      new DataView(head.buffer).setUint32(0, content.length, true);
      chunks.push(head, content, new Uint8Array([0x0a]));
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
    return out;
  }

  function childFor(bytes: Uint8Array, run: string): DerivedArtifact {
    return {
      artifact_id: `art_${'3'.repeat(64)}`,
      origin: DECODED_ARTIFACT_ORIGIN,
      hashes: { sha256: '3'.repeat(64) },
      parent_artifact_id: `art_${'4'.repeat(64)}`,
      parent_sha256: '4'.repeat(64),
      analysis_run_id: run,
      evidence_ids: ['ev_static_p63_tok'],
      observation_id: 'obs_static_p63_tok',
      decode: { state: 'DECODED' },
      file_size_bytes: bytes.length,
    } as unknown as DerivedArtifact;
  }

  it('8.1 tokenized payload is detected and source extraction is skipped', async () => {
    const tok = tokenStream(64); // 64 token records + '$' binary byte inside one
    // sprinkle binary '$' bytes that must NOT become AUTOIT_VARIABLE indicators
    tok[10] = 0x24;
    tok[11] = 0x24;
    const child = childFor(tok, RUN_ID);
    const section = buildDecodedStructureSection({ bytes: tok, decoded_child: child, analysis_run_id: RUN_ID });
    expect(section.status).toBe('OBSERVED');
    expect(section.counts.indicators).toBe(0);
    expect(section.indicators).toEqual([]);
    expect(section.embedded_data).toEqual([]);
    // Phase 6.4: the tokenized branch carries the representation observation
    // plus the inner_decoder_state observation, so the count is 2.
    expect(section.counts.observations).toBe(2);
    expect(section.observations.map((o) => o.subject)).toEqual(['representation', 'inner_decoder_state']);
    const rep = section.observations[0]!;
    expect(rep.subject).toBe('representation');
    expect(rep.value).toBe(DECODED_REPRESENTATION_TOKENIZED);
    expect(rep.representation).toBe(DECODED_REPRESENTATION_TOKENIZED);
    expect(rep.detection_method).toBe(DECODED_REPRESENTATION_DETECTION_METHOD);
    expect(rep.detector_version).toBe(DECODED_REPRESENTATION_DETECTOR_VERSION);
    expect(rep.artifact_id).toBe(child.artifact_id);
    expect(rep.analysis_run_id).toBe(RUN_ID);
    expect(rep.source_evidence_id).toBe('ev_static_p63_tok');
    // line_count must NOT be emitted as a source-line count for tokenized payloads
    expect(section.observations.find((o) => o.subject === 'line_count')).toBeUndefined();
    expect(section.coverage.caps_applied).toContain('tokenized_payload_source_extraction_skipped');
  });

  it('8.2 plaintext source fixture still runs the existing source extractor', async () => {
    const { payload } = await materializeFixture();
    const section = payload.decoded_structure as DecodedStructureSection;
    expect(detectDecodedRepresentation(SCRIPT_BYTES).representation).not.toBe(DECODED_REPRESENTATION_TOKENIZED);
    expect(section.status).toBe('OBSERVED');
    // the plaintext path keeps its full source-structure extraction
    expect(section.observations.find((o) => o.subject === 'line_count')).toBeDefined();
    expect(section.observations.find((o) => o.subject === 'function_definition_count')!.value).toBeGreaterThan(0);
    expect(section.observations.find((o) => o.subject === 'representation')).toBeUndefined();
  });

  it('8.3 binary $ bytes cannot become AUTOIT_VARIABLE indicators on a tokenized payload', () => {
    const tok = tokenStream(64);
    // fill a token's content bytes with '$' so even positions are printable
    for (let i = 8; i < 20; i += 1) tok[i] = 0x24;
    const child = childFor(tok, RUN_ID);
    const section = buildDecodedStructureSection({ bytes: tok, decoded_child: child, analysis_run_id: RUN_ID });
    expect(section.indicators).toEqual([]);
    expect(section.indicators.find((i) => i.indicator_type === 'AUTOIT_VARIABLE')).toBeUndefined();
  });

  it('8.4 the representation record identity is deterministic and recomputable', async () => {
    const tok = tokenStream(64);
    const child = childFor(tok, RUN_ID);
    const a = buildDecodedStructureSection({ bytes: tok, decoded_child: child, analysis_run_id: RUN_ID });
    const b = buildDecodedStructureSection({ bytes: tok, decoded_child: child, analysis_run_id: RUN_ID });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.deterministic_identity).toBe(b.deterministic_identity);
  });

  it('8.5 a foreign run is rejected before representation classification', () => {
    const tok = tokenStream(64);
    const child = childFor(tok, OTHER_RUN_ID);
    const section = buildDecodedStructureSection({ bytes: tok, decoded_child: child, analysis_run_id: RUN_ID });
    expect(section.status).toBe('NOT_APPLICABLE');
    expect(section.observations).toEqual([]);
  });

  it('8.6 a malformed representation record fails closed at the read gate', async () => {
    const { payload } = await materializeFixture();
    const section = JSON.parse(JSON.stringify(payload.decoded_structure));
    section.observations.push({ ...section.observations[0], subject: 'representation', value: 'SOMETHING_ELSE', representation: 'GUESS', structure_id: 'dso_forged' });
    section.counts.observations = section.observations.length;
    const errors = validateDecodedStructureSection(section, {
      artifact_id: payload.analyzed_artifact.artifact_id,
      analysis_run_id: RUN_ID,
      derived_artifacts: payload.detection_artifacts.derived_artifacts,
    });
    expect(errors.some((e) => e.includes('representation_unknown'))).toBe(true);
    expect(errors.some((e) => e.includes('nondeterministic_observation_identity'))).toBe(true);
  });

  it('8.7 the real phase-6.2 decode shape classifies as TOKENIZED_PAYLOAD', () => {
    // Byte-level reproduction of the verified decoded artifact's structure:
    // length-prefixed UTF-16LE records with sparse NULs (the live sample has
    // ~982 hits in its first 64 KiB and ZERO literal 'Func' tokens).
    const tok = tokenStream(512);
    const detection = detectDecodedRepresentation(tok);
    expect(detection.representation).toBe(DECODED_REPRESENTATION_TOKENIZED);
    expect(detection.detection_method).toBe(DECODED_REPRESENTATION_DETECTION_METHOD);
    expect(detection.detector_version).toBe(DECODED_REPRESENTATION_DETECTOR_VERSION);
    expect(detection.token_record_hits).toBeGreaterThan(0);
    expect(detection.source_marker_hits).toBe(0);
    // plaintext never trips the detector
    const plain = detectDecodedRepresentation(SCRIPT_BYTES);
    expect(plain.representation).not.toBe(DECODED_REPRESENTATION_TOKENIZED);
  });
});
