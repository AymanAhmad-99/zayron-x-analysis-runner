/**
 * M18.1E — MalShare provenance must survive into the canonical report.
 *
 * Proves that MalShare acquisition context (source, source_query,
 * source_selector, source_added_utc, source_sha256) is preserved through
 * `CanonicalAcquisitionContext` → `buildAcquisition` → the canonical report and
 * its public projection, with the MalShare artifact identity
 * (`art_mls_<sha16>`) matching the job artifact id.
 *
 * Crucially proves:
 *  - source = 'MALSHARE'
 *  - source_sha256 = SHA
 *  - source_added_utc = ADDED_UTC (preserved as source-added window)
 *  - source_first_seen_utc = null (NEVER fabricated)
 *  - first_seen = null (NEVER derived from source_added_utc)
 */
import { describe, it, expect, beforeAll } from 'bun:test';

import {
  materializeCanonicalReport,
  acquisitionContextFromCanonicalRecord,
  type MaterializeReportInput,
} from '../../packages/intelligence/src/malware/canonical/reportMaterialization';
import type { ContainerToolResult } from '../../packages/intelligence/src/malware/canonical/executor/containerToolExecutor';

let SHA = '';
let ARTIFACT_ID = '';
const RUN_ID = 'ar_mls_holdout_001';
const RUNNER = 'gh-runner-181';
const ANALYZED_AT = '2026-10-02T06:00:00.000Z';
const ADDED_UTC = '2026-10-02T03:04:05.000Z';

const FIXTURE_BYTES = peBytes();

beforeAll(async () => {
  const digest = await crypto.subtle.digest('SHA-256', FIXTURE_BYTES as unknown as ArrayBuffer);
  SHA = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  ARTIFACT_ID = `art_mls_${SHA.slice(0, 16)}`;
});

function peBytes(size = 4096): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x4d;
  bytes[1] = 0x5a;
  bytes[2] = 0x90;
  bytes[3] = 0x00;
  const text = 'Mozilla/5.0 http://holdout.invalid/mls 198.51.100.25 GetProcAddress';
  for (let i = 0; i < text.length; i++) bytes[512 + i] = text.charCodeAt(i);
  return bytes;
}

function provenance(tool_id: string): ContainerToolResult['provenance'] {
  return {
    tool_id: tool_id as never,
    tool_version: `${tool_id}-1.0.0`,
    analysis_run_id: RUN_ID,
    artifact_id: ARTIFACT_ID,
    input_sha256: SHA,
    runner_identity: RUNNER,
    ruleset_version: null,
    ruleset_digest: 'UNKNOWN',
    tool_binary_digest: 'UNKNOWN',
  };
}

function containerResults(): ContainerToolResult[] {
  return [
    {
      tool_id: 'lief',
      tool_version: 'lief-1.0.0',
      status: 'OBSERVED',
      output: { kind: 'lief', metadata: { format: 'PE', architecture: 'x86-64', entrypoint: 4096 } },
      note: null,
      provenance: provenance('lief'),
    },
    {
      tool_id: 'yara-x',
      tool_version: 'yara-x-1.0.0',
      status: 'NO_RESULT',
      output: null,
      note: 'no rule matched',
      provenance: provenance('yara-x'),
    },
  ];
}

function baseInput(over: Partial<MaterializeReportInput> = {}): MaterializeReportInput {
  return {
    job: {
      job_id: `job_mls_${SHA.slice(0, 16)}`,
      analysis_run_id: RUN_ID,
      artifact_id: ARTIFACT_ID,
      sha256: SHA,
      toolchain_version: 'toolchain-1.0.0',
    },
    rawBytes: FIXTURE_BYTES,
    container_results: containerResults(),
    runner_identity: RUNNER,
    acquisition_context: acquisitionContextFromCanonicalRecord({
      sha256: SHA,
      acquisition_source_sample_id: `https://malshare.com/sample.php?hash=${SHA}`,
      sample_identity_file_names: ['sample.exe'],
      sample_identity_size_bytes: FIXTURE_BYTES.length,
      source: 'MALSHARE',
      source_query: 'getlist',
      source_selector: 'recent_24h',
      source_added_utc: ADDED_UTC,
      source_sha256: SHA,
    }),
    analyzed_at: ANALYZED_AT,
    generated_at: ANALYZED_AT,
    extractions: null,
    ...over,
  };
}

describe('M18.1E — MalShare Materialization & Provenance Preservation', () => {
  it('preserves source=MALSHARE, source_added_utc, and source_sha256 without fabricating first_seen', async () => {
    const r = await materializeCanonicalReport(baseInput());
    if (r.status !== 'MATERIALIZED') {
      throw new Error(`expected MATERIALIZED, got ${r.status}: ${JSON.stringify(r).slice(0, 400)}`);
    }

    const report = r.report;
    expect(report.sha256).toBe(SHA);
    expect(report.artifact_id).toBe(ARTIFACT_ID);

    // 1. Acquisition block on canonical report
    expect(report.acquisition.source).toBe('MALSHARE');
    expect(report.acquisition.source_sample_id).toBe(`https://malshare.com/sample.php?hash=${SHA}`);
    expect(report.acquisition.acquisition_status).toBe('ACQUIRED');
    expect(report.acquisition.source_query).toBe('getlist');
    expect(report.acquisition.source_selector).toBe('recent_24h');
    expect(report.acquisition.source_sha256).toBe(SHA);
    expect(report.acquisition.source_added_utc).toBe(ADDED_UTC);

    // CRITICAL: MalShare source_added_utc is NEVER promoted to first_seen
    expect(report.acquisition.source_first_seen_utc).toBeNull();
    expect(report.acquisition.first_seen).toBeNull();

    // 2. Public report projection verification
    const pub = r.public_payload.acquisition as Record<string, unknown>;
    expect(pub.source).toBe('MALSHARE');
    expect(pub.source_query).toBe('getlist');
    expect(pub.source_selector).toBe('recent_24h');
    expect(pub.source_sha256).toBe(SHA);
    expect(pub.source_added_utc).toBe(ADDED_UTC);
    expect(pub.source_first_seen_utc).toBeNull();
    expect(pub.raw_sample_publicly_exposed).toBe(false);
  });

  it('fails closed when the recorded source sha256 disagrees with the job', async () => {
    const mismatchSha = '9'.repeat(64);
    const r = await materializeCanonicalReport(
      baseInput({
        acquisition_context: acquisitionContextFromCanonicalRecord({
          sha256: SHA,
          acquisition_source_sample_id: `https://malshare.com/sample.php?hash=${SHA}`,
          sample_identity_file_names: ['sample.exe'],
          sample_identity_size_bytes: FIXTURE_BYTES.length,
          source: 'MALSHARE',
          source_query: 'getlist',
          source_selector: 'recent_24h',
          source_added_utc: ADDED_UTC,
          source_sha256: mismatchSha, // Disagrees with job.sha256
        }),
      })
    );

    expect(r.status).toBe('REJECTED');
    if (r.status === 'REJECTED') {
      expect(r.code).toBe('acquisition_context_mismatch');
    }
  });

  it('fails closed when job artifact_id does not match the derived MalShare artifact identity', async () => {
    const wrongArtifactId = 'art_gmf_wrong_prefix';
    const wrongProvenance = (tool_id: string): ContainerToolResult['provenance'] => ({
      tool_id: tool_id as never,
      tool_version: `${tool_id}-1.0.0`,
      analysis_run_id: RUN_ID,
      artifact_id: wrongArtifactId,
      input_sha256: SHA,
      runner_identity: RUNNER,
      ruleset_version: null,
      ruleset_digest: 'UNKNOWN',
      tool_binary_digest: 'UNKNOWN',
    });
    const r = await materializeCanonicalReport(
      baseInput({
        job: {
          job_id: `job_mls_${SHA.slice(0, 16)}`,
          analysis_run_id: RUN_ID,
          artifact_id: wrongArtifactId, // wrong identity
          sha256: SHA,
          toolchain_version: 'toolchain-1.0.0',
        },
        container_results: [
          {
            tool_id: 'lief',
            tool_version: 'lief-1.0.0',
            status: 'OBSERVED',
            output: { kind: 'lief', metadata: { format: 'PE', architecture: 'x86-64', entrypoint: 4096 } },
            note: null,
            provenance: wrongProvenance('lief'),
          },
          {
            tool_id: 'yara-x',
            tool_version: 'yara-x-1.0.0',
            status: 'NO_RESULT',
            output: null,
            note: 'no rule matched',
            provenance: wrongProvenance('yara-x'),
          },
        ],
      })
    );

    expect(r.status).toBe('REJECTED');
    if (r.status === 'REJECTED') {
      expect(r.code).toBe('artifact_identity_mismatch');
    }
  });
});
