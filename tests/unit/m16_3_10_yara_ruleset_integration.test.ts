/**
 * M16.3.10 — YARA-X vendored ruleset integration (canonical bridge)
 *
 * Proves that the M4 tool bridge surfaces the YARA-X engine version and the
 * pinned ruleset provenance as first-class observation attributes, and that a
 * NO_MATCH result stays NO_RESULT (never OBSERVED, never clean). The epistemic
 * boundary is unchanged: a YARA match remains a STATIC indicator only.
 *
 * The runner is a deterministic stub — no container round-trip.
 */
import { describe, it, expect } from 'bun:test';

import { runExternalToolAnalysis } from '../../packages/intelligence/src/malware/canonical';
import type {
  Artifact,
  ExternalToolRunner,
  ToolAvailabilityReport,
  ToolOutput,
} from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m16_3_10_yara';
const ANALYZED_AT = '2026-09-27T00:00:00.000Z';
const RULESET = {
  source: 'github.com/Neo23x0/signature-base',
  commit: '94a1c48d7ab499879287ff611dfe7f9c56376030',
  version: 'signature-base@94a1c48d7ab499879287ff611dfe7f9c56376030',
  file_count: '717',
  manifest_sha256: '8a8dc006f98488da56bb585cd5dabb790a5ce22887d9344a5d4ca99d44291c47',
  source_digest: '2afaaf34fb88432c4552b6bac0eb7ef0f41c35993df35ddb78f72061b2cfbdba',
};

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_m16_3_10',
    identity_key: `sha256:${'b'.repeat(64)}`,
    format_class: 'PE',
    file_names: ['specimen.exe'],
    hashes: { sha256: 'b'.repeat(64) },
    file_size_bytes: 1435648,
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

function availability(): ToolAvailabilityReport {
  return {
    generated_at: ANALYZED_AT,
    environment: 'test',
    tools: [{ tool_id: 'yara-x', available: true, version: '1.20.0', probe: 'yr 1.20.0' }],
  };
}

function yaraRunner(output: ToolOutput, status: 'OBSERVED' | 'NO_RESULT', note?: string): ExternalToolRunner {
  return {
    descriptor: { tool_id: 'yara-x', display_name: 'yara-x', version: '1.20.0' },
    supported_formats: ['PE', 'ELF', 'MACH_O'],
    run: () => ({ status, output, note }),
  };
}

function yaraAttrs(runner: ExternalToolRunner) {
  const result = runExternalToolAnalysis({
    analysis_run_id: RUN_ID,
    artifact: makeArtifact(),
    detected_format: 'PE',
    rawBytes: new Uint8Array([0x4d, 0x5a]),
    analyzed_at: ANALYZED_AT,
    tools: [runner],
    toolAvailability: availability(),
  });
  const obs = result.observations.find((o) => o.attributes.tool_name === 'yara-x');
  if (!obs) throw new Error('no yara-x observation');
  return { obs, result };
}

describe('M16.3.10 — YARA-X ruleset provenance surfaces in the canonical bridge', () => {
  it('a match is OBSERVED and carries engine version + ruleset provenance', () => {
    const output: ToolOutput = {
      kind: 'yara',
      engine_version: '1.20.0',
      ruleset: RULESET,
      matches: [{ rule: 'ZX_Test_Rule', namespace: null, meta: {} }],
    };
    const { obs } = yaraAttrs(yaraRunner(output, 'OBSERVED'));
    expect(obs.attributes.analysis_status).toBe('OBSERVED');
    expect(obs.attributes.match_count).toBe(1);
    expect(obs.attributes.match_0_rule).toBe('ZX_Test_Rule');
    expect(obs.attributes.yara_engine_version).toBe('1.20.0');
    expect(obs.attributes.yara_ruleset_source).toBe(RULESET.source);
    expect(obs.attributes.yara_ruleset_commit).toBe(RULESET.commit);
    expect(obs.attributes.yara_ruleset_file_count).toBe('717');
    expect(obs.attributes.yara_ruleset_manifest_sha256).toBe(RULESET.manifest_sha256);
    expect(obs.attributes.yara_ruleset_source_digest).toBe(RULESET.source_digest);
  });

  it('NO_MATCH stays NO_RESULT (never OBSERVED) while still carrying provenance', () => {
    const output: ToolOutput = { kind: 'yara', engine_version: '1.20.0', ruleset: RULESET, matches: [] };
    const { obs } = yaraAttrs(yaraRunner(output, 'NO_RESULT', 'NO_MATCH'));
    expect(obs.attributes.analysis_status).toBe('NO_RESULT');
    expect(obs.attributes.match_count).toBe(0);
    expect(obs.attributes.tool_note).toBe('NO_MATCH');
    expect(obs.attributes.yara_ruleset_commit).toBe(RULESET.commit);
  });

  it('a match is STATIC evidence only — no family/ATT&CK/MBC is emitted here', () => {
    const output: ToolOutput = {
      kind: 'yara',
      engine_version: '1.20.0',
      ruleset: RULESET,
      matches: [{ rule: 'ZX_Test_Rule', namespace: null, meta: {} }],
    };
    const { obs, result } = yaraAttrs(yaraRunner(output, 'OBSERVED'));
    expect(obs.provenance.evidence_refs.every((r) => r.kind === 'STATIC')).toBe(true);
    expect(Object.keys(obs.attributes).some((k) => /attack|mbc|family/i.test(k))).toBe(false);
    expect(result.observations.every((o) => o.source === 'STATIC_ANALYSIS')).toBe(true);
  });
});
