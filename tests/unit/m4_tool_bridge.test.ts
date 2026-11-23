/**
 * M4 — External Analyzer Tool Bridge Tests
 *
 * Coverage per M4 spec:
 *  - tool detection: none of yara-x/floss/capa/lief is installed in this
 *    environment, so integration is proven via stub runners; unavailability is
 *    proven via the canonical empty availability report
 *  - unavailable-tool behavior (UNAVAILABLE, never clean)
 *  - YARA-X integration semantics (match ≠ family confirmation)
 *  - FLOSS integration semantics (string ≠ behavior)
 *  - capa integration semantics (capability = CAN_DO, never OBSERVED_DOING)
 *  - LIEF metadata
 *  - provenance on every tool observation (STATIC evidence only)
 *  - static-only epistemic separation (no ATT&CK/MBC, no family resolution,
 *    no behaviors/claims emitted by the bridge)
 *  - M3 regression guard: omitting tools/availability reproduces M3 output
 */
import { describe, it, expect } from 'bun:test';

import {
  runStaticAnalysis,
  runExternalToolAnalysis,
  createEmptyAvailabilityReport,
  detectFormat,
  KNOWN_TOOL_IDS,
  TOOL_BRIDGE_VERSION,
} from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  ExternalToolRunner,
  ToolAvailabilityReport,
  ToolRunOutcome,
  ToolExecutionContext,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m4_test_001';
const ANALYZED_AT = '2026-09-20T12:00:00.000Z';

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m4_test',
    identity_key: `sha256:${'a'.repeat(64)}`,
    format_class: 'PE',
    file_names: ['m4_test_sample.exe'],
    hashes: { sha256: 'a'.repeat(64) },
    file_size_bytes: undefined,
    mime_type: 'application/x-dosexec',
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

// Minimal deterministic PE32+ fixture (same builder approach as M3 tests).
function buildPe(): Uint8Array {
  const dosHeader = new Uint8Array(0x40);
  dosHeader[0] = 0x4d;
  dosHeader[1] = 0x5a;
  const peOff = 0x80;
  new DataView(dosHeader.buffer).setUint32(0x3c, peOff, true);

  const optSize = 112 + 16 * 8;
  const numSections = 1;
  const headerSize = peOff + 24 + optSize + numSections * 40;
  const pe = new Uint8Array(headerSize + 512);
  pe.set(dosHeader, 0);
  pe[peOff] = 0x50; pe[peOff + 1] = 0x45;
  const pdv = new DataView(pe.buffer);
  pdv.setUint16(peOff + 4, 0x8664, true);
  pdv.setUint16(peOff + 6, numSections, true);
  pdv.setUint16(peOff + 20, optSize, true);
  const opt = peOff + 24;
  pdv.setUint16(opt, 0x20b, true);
  pdv.setUint32(opt + 16, 0x1000, true);
  pe[opt + 2] = 14; pe[opt + 3] = 29;
  pdv.setUint32(opt + 112 + 4 * 8, 0, true); // no certificate directory
  const st = opt + optSize;
  const name = pe.subarray(st, st + 8);
  name.set(new TextEncoder().encode('.text'));
  pdv.setUint32(st + 8, 0x10, true); // virtual size
  pdv.setUint32(st + 16, 0x200, true); // raw size
  pdv.setUint32(st + 20, headerSize, true); // raw offset
  for (let i = headerSize; i < pe.length; i++) pe[i] = 0x41; // printable filler
  return pe;
}

function buildElf(): Uint8Array {
  const b = new Uint8Array(256);
  b.set([0x7f, 0x45, 0x4c, 0x46], 0);
  b[4] = 2; // ELF64
  b[5] = 1; // little-endian
  const dv = new DataView(b.buffer);
  dv.setUint16(16, 2, true); // ET_EXEC
  dv.setUint16(18, 62, true); // x86_64
  dv.setBigUint64(24, 0x1000n, true); // entry
  dv.setUint16(60, 64, true); // shentsize
  dv.setUint16(62, 0, true); // shnum
  return b;
}

// ── Availability helpers ─────────────────────────────────────────

function unavailableReport(): ToolAvailabilityReport {
  return createEmptyAvailabilityReport(ANALYZED_AT, 'bun-test-node');
}

function availableReport(toolIds: Array<'yara-x' | 'floss' | 'capa' | 'lief'>, version = '1.2.3-stub'): ToolAvailabilityReport {
  return {
    generated_at: ANALYZED_AT,
    environment: 'bun-test-node',
    tools: KNOWN_TOOL_IDS.map((t) => ({
      tool_id: t,
      available: toolIds.includes(t),
      version: toolIds.includes(t) ? version : null,
      probe: toolIds.includes(t) ? `stub runner registered for ${t}` : `${t} not found`,
    })),
  };
}

// ── Stub runners ─────────────────────────────────────────────────

function stubRunner(
  tool: 'yara-x' | 'floss' | 'capa' | 'lief',
  run: (ctx: ToolExecutionContext) => ToolRunOutcome
): ExternalToolRunner {
  return {
    descriptor: { tool_id: tool, display_name: tool, version: '1.2.3-stub' },
    supported_formats: ['PE', 'ELF'],
    run,
  };
}

const yaraRunner = stubRunner('yara-x', () => ({
  status: 'OBSERVED',
  output: {
    kind: 'yara',
    matches: [
      { rule: 'Suspicious_URL_String', namespace: 'strings', meta: { author: 'test' } },
      { rule: 'FamilyNamed_Rule', namespace: 'families', meta: {} },
    ],
  },
}));

const flossRunner = stubRunner('floss', () => ({
  status: 'OBSERVED',
  output: {
    kind: 'floss',
    strings: { stack: ['stk1'], decoded: ['https://evil.example.invalid/gate'], tight: ['t1'] },
    total_extracted: 3,
  },
}));

const capaRunner = stubRunner('capa', () => ({
  status: 'OBSERVED',
  output: {
    kind: 'capa',
    capabilities: [{ name: 'write file', address: '0x1000', source_rule: 'write-file-rule' }],
  },
}));

const liefRunner = stubRunner('lief', () => ({
  status: 'OBSERVED',
  output: { kind: 'lief', metadata: { format: 'PE', entrypoint: 4096, nx: true } },
}));

function runTools(artifact: Artifact, bytes: Uint8Array, tools: ExternalToolRunner[], availability: ToolAvailabilityReport | null) {
  return runStaticAnalysis({
    analysis_run_id: RUN_ID,
    artifact,
    rawBytes: bytes,
    analyzed_at: ANALYZED_AT,
    tools,
    toolAvailability: availability,
  });
}

const toolObs = (result: { observations: Array<{ observation_type: string }> }) =>
  result.observations.filter((o) => o.observation_type === 'tool_analysis');

const allAttrs = (result: { observations: Array<{ attributes: Record<string, unknown> }> }): Record<string, unknown> =>
  Object.assign({}, ...result.observations.map((o) => o.attributes));

// ── Tests ────────────────────────────────────────────────────────

describe('M4 tool bridge — tool detection / availability', () => {
  it('environment probe: none of yara-x/floss/capa/lief is installed (canonical empty report)', () => {
    const report = unavailableReport();
    expect(report.tools.map((t) => t.tool_id).sort()).toEqual([...KNOWN_TOOL_IDS].sort());
    for (const t of report.tools) {
      expect(t.available).toBe(false);
      expect(t.probe.length).toBeGreaterThan(0);
    }
  });

  it('unavailable tools emit one UNAVAILABLE observation each — never clean', () => {
    const result = runTools(makeArtifact(), buildPe(), [], unavailableReport());
    const obs = toolObs(result);
    expect(obs).toHaveLength(KNOWN_TOOL_IDS.length); // every canonical tool id emits one observation
    for (const o of obs) {
      expect(o.attributes.analysis_status).toBe('UNAVAILABLE');
      expect(o.attributes.absence_meaning).toContain('NOT a clean result');
      expect(typeof o.attributes.tool_name).toBe('string');
    }
    expect(JSON.stringify(result)).not.toContain('"clean"');
    expect(JSON.stringify(result)).not.toContain("'clean'");
  });

  it('tool reported available but no runner registered → UNAVAILABLE', () => {
    const result = runTools(makeArtifact(), buildPe(), [], availableReport(['yara-x']));
    const obs = toolObs(result).filter((o) => o.attributes.tool_name === 'yara-x');
    expect(obs).toHaveLength(1);
    expect(obs[0].attributes.analysis_status).toBe('UNAVAILABLE');
    expect(obs[0].attributes.reason).toContain('no runner is registered');
  });
});

describe('M4 tool bridge — YARA-X semantics', () => {
  it('YARA match becomes STATIC evidence with tool name/version and non-family epistemic note', () => {
    const result = runTools(makeArtifact(), buildPe(), [yaraRunner], availableReport(['yara-x']));
    const obs = toolObs(result).filter((o) => o.attributes.tool_name === 'yara-x');
    expect(obs).toHaveLength(1);
    expect(obs[0].attributes.analysis_status).toBe('OBSERVED');
    expect(obs[0].attributes.tool_version).toBe('1.2.3-stub');
    expect(obs[0].attributes.match_count).toBe(2);
    expect(obs[0].attributes.match_0_rule).toBe('Suspicious_URL_String');
    expect(String(obs[0].attributes.epistemic_note)).toContain('NOT malware-family confirmation, resolution');
    // kind STATIC on the citing evidence
    const yaraEvidence = result.evidence_refs.filter((e) => e.source_id === 'src_tool_yara_x');
    expect(yaraEvidence).toHaveLength(1);
    expect(yaraEvidence[0].kind).toBe('STATIC');
  });

  it('a family-named YARA rule does NOT create a FamilyCandidate or resolve a family', () => {
    const result = runTools(makeArtifact(), buildPe(), [yaraRunner], availableReport(['yara-x']));
    const json = JSON.stringify(result);
    expect(json).not.toContain('family_candidate');
    expect(json).not.toContain('resolution_state');
    expect(json).not.toContain('resolvedFamily');
  });
});

describe('M4 tool bridge — FLOSS / capa / LIEF semantics', () => {
  it('FLOSS strings are recorded as static text recovery, never behavior', () => {
    const result = runTools(makeArtifact(), buildPe(), [flossRunner], availableReport(['floss']));
    const obs = toolObs(result).filter((o) => o.attributes.tool_name === 'floss');
    expect(obs).toHaveLength(1);
    expect(obs[0].attributes.decoded_string_count).toBe(1);
    expect(obs[0].attributes.decoded_0).toBe('https://evil.example.invalid/gate');
    expect(String(obs[0].attributes.epistemic_note)).toContain('NOT behavior evidence');
  });

  it('capa capabilities are CAN_DO static candidates — never OBSERVED_DOING, no Behaviors emitted', () => {
    const result = runTools(makeArtifact(), buildPe(), [capaRunner], availableReport(['capa']));
    const obs = toolObs(result).filter((o) => o.attributes.tool_name === 'capa');
    expect(obs).toHaveLength(1);
    expect(obs[0].attributes.capability_count).toBe(1);
    expect(obs[0].attributes.capability_0_name).toBe('write file');
    expect(String(obs[0].attributes.epistemic_note)).toContain('CAN_DO');
    const json = JSON.stringify(result);
    // No attribute asserts the OBSERVED_DOING modality value (the epistemic NOTE
    // mentioning it is documentation, not an assertion).
    expect(Object.values(allAttrs(result)).some((v) => v === 'OBSERVED_DOING')).toBe(false);
    expect(json).not.toContain('"behaviors"');
    expect(json).not.toContain('"claims"');
  });

  it('LIEF metadata extracts on supported format with tool identity', () => {
    const result = runTools(makeArtifact(), buildPe(), [liefRunner], availableReport(['lief']));
    const obs = toolObs(result).filter((o) => o.attributes.tool_name === 'lief');
    expect(obs).toHaveLength(1);
    expect(obs[0].attributes.analysis_status).toBe('OBSERVED');
    expect(obs[0].attributes.format).toBe('PE');
    expect(obs[0].attributes.entrypoint).toBe(4096);
  });
});

describe('M4 tool bridge — failure, format scope, provenance', () => {
  it('tool failure → ERROR observation, never clean', () => {
    const failing = stubRunner('yara-x', () => {
      throw new Error('yara scan crashed');
    });
    const result = runTools(makeArtifact(), buildPe(), [failing], availableReport(['yara-x']));
    const obs = toolObs(result).filter((o) => o.attributes.tool_name === 'yara-x');
    expect(obs).toHaveLength(1);
    expect(obs[0].attributes.analysis_status).toBe('ERROR');
    expect(obs[0].attributes.reason).toContain('yara scan crashed');
    expect(obs[0].attributes.failure_meaning).toContain('NOT a clean result');
  });

  it('binary analyzers are not forced onto unsupported formats (no tool pass, UNSUPPORTED preserved)', () => {
    const bytes = new Uint8Array(64).map((_, i) => (i * 7 + 3) & 0xff);
    expect(detectFormat(bytes)).toBe('UNSUPPORTED');
    const result = runTools(makeArtifact(), bytes, [yaraRunner, flossRunner, capaRunner, liefRunner], availableReport(['yara-x', 'floss', 'capa', 'lief']));
    expect(toolObs(result)).toHaveLength(0);
    const identity = result.observations.find((o) => o.observation_type === 'static_identity');
    expect(identity?.attributes.analysis_status).toBe('UNSUPPORTED');
  });

  it('provenance: every tool observation carries run/artifact ids, STATIC evidence, tool source', () => {
    // All four tools registered + available → four OBSERVED tool observations.
    const result = runTools(
      makeArtifact(),
      buildPe(),
      [yaraRunner, flossRunner, capaRunner, liefRunner],
      availableReport(['yara-x', 'floss', 'capa', 'lief'])
    );
    const obs = toolObs(result);
    expect(obs).toHaveLength(KNOWN_TOOL_IDS.length); // 4 registered runners + unregistered tools UNAVAILABLE
    for (const o of obs) {
      expect(o.analysis_run_id).toBe(RUN_ID);
      expect(o.artifact_id).toBe(makeArtifact().artifact_id);
      expect(o.source).toBe('STATIC_ANALYSIS');
      expect(o.evidence_refs).toHaveLength(1);
      expect(o.evidence_refs[0].kind).toBe('STATIC');
      expect(o.evidence_refs[0].source_id.startsWith('src_tool_')).toBe(true);
      expect(o.provenance.source_ids).toContain(o.evidence_refs[0].source_id);
      expect(o.provenance.evidence_refs).toHaveLength(1);
    }
  });

  it('no ATT&CK/MBC mapping is emitted by any tool result', () => {
    const result = runTools(
      makeArtifact(),
      buildPe(),
      [yaraRunner, flossRunner, capaRunner, liefRunner],
      availableReport(['yara-x', 'floss', 'capa', 'lief'])
    );
    const json = JSON.stringify(result);
    expect(json).not.toContain('T1486');
    expect(json).not.toContain('technique_id');
    expect(json).not.toContain('mapping_provenance');
    expect(json).not.toContain('mbc');
  });

  it('tool observation ids are deterministic for identical inputs', () => {
    const a = runExternalToolAnalysis({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      detected_format: 'PE',
      rawBytes: buildPe(),
      analyzed_at: ANALYZED_AT,
      tools: [yaraRunner],
      toolAvailability: availableReport(['yara-x']),
    });
    const b = runExternalToolAnalysis({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      detected_format: 'PE',
      rawBytes: buildPe(),
      analyzed_at: ANALYZED_AT,
      tools: [yaraRunner],
      toolAvailability: availableReport(['yara-x']),
    });
    expect(a.observations.map((o) => o.observation_id)).toEqual(b.observations.map((o) => o.observation_id));
  });
});

describe('M4 tool bridge — M3 regression guard', () => {
  it('omitting tools/toolAvailability reproduces the M3 deterministic-only output (no tool observations)', () => {
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      rawBytes: buildPe(),
      analyzed_at: ANALYZED_AT,
    });
    expect(toolObs(result)).toHaveLength(0);
    expect(result.observations.length).toBeGreaterThan(0);
    expect(result.status).toBe('OBSERVED');
  });

  it('bridge version is pinned', () => {
    expect(TOOL_BRIDGE_VERSION).toBe('1.0.0-toolbridge-canonical');
  });
});

describe('M16.3.9 — FLOSS bounded static mode reaches the canonical layer', () => {
  const boundedFloss = stubRunner('floss', () => ({
    status: 'OBSERVED',
    output: {
      kind: 'floss',
      mode: 'static_only_bounded',
      strings: { stack: [], decoded: [], tight: [], static: ['http://gate.example.invalid', 'AUTOIT_EVENT'] },
      total_extracted: 2,
    },
  }));

  it('preserves static-string evidence as attributes instead of reading as empty', () => {
    const result = runTools(makeArtifact(), buildPe(), [boundedFloss], availableReport(['floss']));
    const obs = toolObs(result).filter((o) => o.attributes.tool_name === 'floss');
    expect(obs).toHaveLength(1);
    expect(obs[0].attributes.analysis_status).toBe('OBSERVED');
    expect(obs[0].attributes.static_string_count).toBe(2);
    expect(obs[0].attributes.static_0).toBe('http://gate.example.invalid');
    expect(obs[0].attributes.static_1).toBe('AUTOIT_EVENT');
    expect(obs[0].attributes.floss_mode).toBe('static_only_bounded');
    // The emulation phases are empty by construction — never fabricated.
    expect(obs[0].attributes.stack_string_count).toBe(0);
    expect(obs[0].attributes.decoded_string_count).toBe(0);
    expect(obs[0].attributes.tight_string_count).toBe(0);
  });
});
