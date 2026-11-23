/**
 * M14.3.1 — Provenance Correction Tests
 *
 * Semantics protected (spec §2/§3): findings produced by EXECUTING an analyzer
 * against the artifact are computed/derived from the artifact itself —
 * epistemic status DERIVED with STATIC evidence. SOURCE_REPORTED is reserved
 * for values actually reported by an external source/report (e.g. acquisition
 * metadata); no analyzer may become SOURCE_REPORTED merely because it is
 * external software. The frozen M13 weight table (DERIVED: 1.0 vs
 * SOURCE_REPORTED: 0.5) makes this distinction materially significant.
 *
 * Synthetic fixtures, novel holdout identities only.
 */
import { describe, it, expect } from 'bun:test';

import { processEvidenceToClaims } from '../../packages/intelligence/src/malware/canonical/claimProcessor';
import { runExternalToolAnalysis } from '../../packages/intelligence/src/malware/canonical/toolBridge';
import { deriveSupportSemantics } from '../../packages/intelligence/src/malware/canonical/malwareProductionPipeline';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical/artifact';
import type { Observation } from '../../packages/intelligence/src/malware/canonical/observation';
import type { ToolId } from '../../packages/intelligence/src/malware/canonical/toolBridge';
import type { ExternalToolRunner } from '../../packages/intelligence/src/malware/canonical/toolBridge';

const ANALYSIS_RUN = 'ar_m1431_prov_holdout';
const PROCESSED_AT = '2026-09-21T00:00:00.000Z';
const SHA = 'aa11bb22cc33dd44ee55ff66001122334455667788990011223344556677889900aabb';

const ARTIFACT: Artifact = {
  artifact_id: 'art_m1431_prov_holdout',
  artifact_kind: 'malware_sample',
  identity_key: `sha256:${SHA}`,
  sha256: SHA,
  size_bytes: 512,
  created_at: PROCESSED_AT,
  source: { source_type: 'SYNTHETIC_FIXTURE', source_ref: 'holdout://m14.3.1/provenance' },
} as unknown as Artifact;

/**
 * Builds a real canonical Observation by routing a minimal per-tool OBSERVED
 * output through the actual M4 bridge (runExternalToolAnalysis) — the same
 * production path that will carry container evidence. No hand-built
 * observation shapes; semantics are whatever the bridge itself produces.
 */
function toolObs(tool: ToolId, status: 'OBSERVED' | 'NO_RESULT' | 'UNAVAILABLE' | 'ERROR' | 'UNSUPPORTED'): Observation {
  const run = runExternalToolAnalysis({
    analysis_run_id: ANALYSIS_RUN,
    artifact: ARTIFACT,
    detected_format: 'PE',
    rawBytes: new Uint8Array([0x4d, 0x5a, 0x00, 0x00]),
    analyzed_at: PROCESSED_AT,
    tools: [runner(tool, status)],
    toolAvailability: null,
  });
  const obs = run.observations.find((o) => o.attributes.tool_name === tool)!;
  return obs;
}

/** Minimal per-tool OBSERVED output satisfying each tool's ToolOutput variant. */
function toolOutput(tool: ToolId): unknown {
  switch (tool) {
    case 'yara-x':
      return { kind: 'yara', matches: [{ rule: 'M1431_Holdout_Rule', namespace: 'holdout', meta: {} }] };
    case 'floss':
      return { kind: 'floss', strings: { stack: [], decoded: ['https://m1431.invalid/x'], tight: [] }, total_extracted: 1 };
    case 'capa':
      return { kind: 'capa', capabilities: [{ name: 'holdout-capability', address: null, source_rule: null }] };
    case 'die':
      return { kind: 'die', detections: [{ type: 'compiler', value: 'HoldoutCompiler', method: null }] };
    case 'lief':
      return { kind: 'lief', metadata: { format: 'PE', architecture: 'x86_64', entry_point: '0x1400', image_base: '0x140000000' } };
  }
}

function runner(tool: ToolId, status: 'OBSERVED' | 'NO_RESULT' | 'UNAVAILABLE' | 'ERROR' | 'UNSUPPORTED' = 'OBSERVED'): ExternalToolRunner {
  return {
    descriptor: { tool_id: tool, display_name: `holdout-${tool}`, version: '9.9.9-holdout' },
    supported_formats: ['PE', 'ELF', 'MACH_O', 'UNSUPPORTED'],
    run: () => ({
      tool_id: tool,
      status,
      output: toolOutput(tool) as never,
      provenance: { producer_version: '9.9.9-holdout', runner_identity: 'container:zx-malware-analysis:1.0.0' },
    }),
  };
}

function processToolClaim(tool: ToolId, status: 'OBSERVED' | 'NO_RESULT' | 'UNAVAILABLE' | 'ERROR' | 'UNSUPPORTED' = 'OBSERVED') {
  const obs = toolObs(tool, status);
  const result = processEvidenceToClaims({
    analysis_run_id: ANALYSIS_RUN,
    artifact: ARTIFACT,
    observations: [obs],
    processed_at: PROCESSED_AT,
  });
  return result;
}

describe('M14.3.1 — provenance correction (t1–t5)', () => {
  for (const tool of ['lief', 'die', 'floss', 'yara-x', 'capa'] as const) {
    it(`t1–t5: ${tool} analyzer evidence is DERIVED + STATIC (never SOURCE_REPORTED)`, () => {
      const result = processToolClaim(tool);
      // Canonical EvidenceRefs carry producer identity as source_id (src_tool_<tool>,
      // with '-' sanitized to '_' — e.g. src_tool_yara_x).
      const claims = result.new_claims.filter((c) => c.evidence_refs.some((e) => e.source_id === `src_tool_${tool.replace(/-/g, '_')}`));

      if (tool === 'capa') {
        // capa keeps its distinct capability semantics (CAN_DO) — which is also
        // a computed-from-artifact state, never SOURCE_REPORTED.
        expect(claims.length).toBeGreaterThan(0);
        for (const c of claims) {
          expect(c.status).toBe('CAN_DO');
          expect(c.status).not.toBe('SOURCE_REPORTED');
          expect(c.evidence_refs.every((e) => e.kind === 'STATIC')).toBe(true);
        }
        return;
      }

      expect(claims.length).toBeGreaterThan(0);
      for (const c of claims) {
        expect(c.status).toBe('DERIVED');
        expect(c.status).not.toBe('SOURCE_REPORTED');
        expect(c.evidence_refs.every((e) => e.kind === 'STATIC')).toBe(true);
      }
    });
  }

  it('non-observed tool statuses never produce claims (unchanged M4/M7 boundary)', () => {
    for (const status of ['NO_RESULT', 'UNAVAILABLE', 'ERROR', 'UNSUPPORTED']) {
      const result = processToolClaim('floss', status);
      expect(result.new_claims.filter((c) => c.evidence_refs.some((e) => e.source_id === 'src_tool_floss'))).toHaveLength(0);
    }
  });

  it('support semantics for tool claims surface DERIVED basis and static-only limitation', () => {
    const result = processToolClaim('floss');
    const claim = result.new_claims.find((c) => c.evidence_refs.some((e) => e.source_id === 'src_tool_floss'))!;
    expect(claim.status).toBe('DERIVED');
    const semantics = deriveSupportSemantics({
      epistemic_states: [claim.status],
      evidence_kinds: claim.evidence_refs.map((e) => e.kind),
      evidence_ids: claim.evidence_refs.map((e) => e.evidence_id),
    });
    expect(semantics.metric).toBe('EVIDENCE_SUPPORT');
    expect(semantics.epistemic_status).toContain('DERIVED');
    expect(semantics.evidence_kind).toContain('STATIC');
    // Deterministic template must communicate static-only evidence support —
    // it must DISAVOW certainty/execution, never assert them.
    const interp = semantics.interpretation.toLowerCase();
    expect(interp).toContain('static');
    expect(interp).toContain('does not imply');
    expect(interp).not.toMatch(/100%|confirmed|absolute certainty\.?$|is certain/);
  });
});
