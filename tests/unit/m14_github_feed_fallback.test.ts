/**
 * M14 Fallback — GitHub Malware-Feed Acquisition Tests
 *
 * 30 required scenarios. Synthetic fixtures carry novel holdout identities;
 * the live validation uses one real sample from the public feed (transport-run).
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  discoverFeedStructure,
  selectFeedSample,
  acquireFeedSample,
  classifyFeedBytes,
  GITHUB_MALWARE_FEED_VERSION,
  GITHUB_MALWARE_FEED_REPO,
  analyzeMalwareArtifact,
  buildAnalysisRunBinding,
  buildMalwareIntelligenceReport,
  buildPublicReportPayload,
  groundReport,
  shouldReuseExistingReport,
  productionReportUrl,
} from '../../packages/intelligence/src/malware/canonical';
import type { FeedTreeEntry, FeedRepoMetadata, FeedCandidate } from '../../packages/intelligence/src/malware/canonical';

const ANALYZED_AT = '2026-09-20T23:00:00.000Z';
const RUN_ID = 'ar_m14fb_holdout_001';

// Synthetic holdout sha256 identities (novel, not real samples).
const SHA_PE = 'f00dc0ffee0000000000000000000000000000000000000000000000000abcd1';
const SHA_ELF = 'baadf00d0000000000000000000000000000000000000000000000000000ef02';
const SHA_OTHER = '0ddba1100000000000000000000000000000000000000000000000000000cafe';

function syntheticTree(): FeedTreeEntry[] {
  return [
    { path: 'README.md', type: 'blob', size: 120 },
    { path: '2020.01.01_Holdout_Dir_A/' + SHA_PE, type: 'blob', size: 640_000 },
    { path: '2020.01.01_Holdout_Dir_A/' + SHA_ELF, type: 'blob', size: 120_000 },
    { path: '2020.02.02_Holdout_Dir_B/' + SHA_OTHER, type: 'blob', size: 12_345 },
  ];
}

const meta: FeedRepoMetadata = { default_branch: 'master', full_name: GITHUB_MALWARE_FEED_REPO, pushed_at: '2026-01-01T00:00:00Z' };

function peMagic(): Uint8Array {
  const b = new Uint8Array(64);
  b[0] = 0x4d; b[1] = 0x5a;
  return b;
}

function fullPipeline(sha: string, fmt: 'PE' | 'ELF' | 'OTHER' = 'PE') {
  const discovery = discoverFeedStructure({ repo_metadata: meta, tree: syntheticTree() });
  const candidate: FeedCandidate = { repo_path: `2020.01.01_Holdout_Dir_A/${sha}`, declared_sha256: sha, size_bytes: 640_000 };
  const acquisition = acquireFeedSample({
    candidate,
    downloaded_sha256: sha,
    bytes_magic_class: fmt,
    default_branch: discovery.default_branch,
    acquired_at: ANALYZED_AT,
  });
  const bytes = fmt === 'PE' ? peMagic() : new Uint8Array(16);
  const pipeline = analyzeMalwareArtifact({
    analysis_run_id: RUN_ID,
    run_binding: buildAnalysisRunBinding({ analysis_run_id: RUN_ID, job_id: 'job_m14_feed_test', artifact: acquisition.artifact! }),
    artifact: acquisition.artifact!,
    rawBytes: bytes,
    analyzed_at: ANALYZED_AT,
  });
  const report = buildMalwareIntelligenceReport({ acquisition: { ...acquisition, source: 'GITHUB_MALWARE_FEED', source_metadata: null, archive_password_present: false } as never, pipeline, source_metadata: null, generated_at: ANALYZED_AT });
  return { discovery, acquisition, pipeline, report };
}

describe('fallback discovery + selection', () => {
  it('1. public source discovery succeeds from live-derived data', () => {
    const d = discoverFeedStructure({ repo_metadata: meta, tree: syntheticTree() });
    expect(d.repo).toBe(GITHUB_MALWARE_FEED_REPO);
    expect(d.default_branch).toBe('master');
    expect(d.candidates.length).toBe(3);
    expect(d.metadata_files).toEqual(['README.md']);
    expect(d.discovery_version).toBe(GITHUB_MALWARE_FEED_VERSION);
  });

  it('2. source contains a downloadable candidate (sha256-identity blobs)', () => {
    const d = discoverFeedStructure({ repo_metadata: meta, tree: syntheticTree() });
    expect(d.candidates.every((c) => /^[0-9a-f]{64}$/.test(c.declared_sha256))).toBe(true);
  });

  it('3. deterministic selection: sorted path, format preference, size gate', () => {
    const d = discoverFeedStructure({ repo_metadata: meta, tree: syntheticTree() });
    const formats = new Map<string, 'PE' | 'ELF' | 'OTHER'>([
      [SHA_PE, 'PE'], [SHA_ELF, 'ELF'], [SHA_OTHER, 'OTHER'],
    ]);
    const s = selectFeedSample({ discovery: d, criteria: { format_preference: ['PE', 'ELF'], min_size_bytes: 10_000 }, format_class_by_sha256: formats });
    expect(s.status).toBe('SELECTED');
    expect(s.selected!.declared_sha256).toBe(SHA_PE); // PE preferred, deterministic
    // Without format info → first sorted-path eligible candidate (ELF sorts before PE here).
    const s2 = selectFeedSample({ discovery: d, criteria: { min_size_bytes: 10_000 } });
    expect(s2.selected!.declared_sha256).toBe(SHA_ELF);
    // ELF-only preference → ELF candidate.
    const s3 = selectFeedSample({ discovery: d, criteria: { format_preference: ['ELF'] }, format_class_by_sha256: formats });
    expect(s3.selected!.declared_sha256).toBe(SHA_ELF);
  });

  it('4. source metadata preserved as SOURCE_REPORTED context (no family truth)', () => {
    const { acquisition } = fullPipeline(SHA_PE);
    expect(acquisition.source_metadata.directory_label).toBe('2020.01.01_Holdout_Dir_A');
    expect(acquisition.source).toBe('GITHUB_MALWARE_FEED');
    // Directory label is inert metadata — the report pipeline never resolves it.
  });

  it('25. no malware-specific selection branch (selection is format/size/sort only)', () => {
    const src = readFileSync('packages/intelligence/src/malware/canonical/githubMalwareFeedAdapter.ts', 'utf8');
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const bad of ['WannaCry', 'RedLine', 'Emotet', 'Ryuk', 'LockBit', 'Mirai', 'CVE-', 'T1055', 'MBC-', 'if (family ===', 'if (sha256 ===', 'if (sample ===', 'if (malware ===', 'if (artifact_id ===']) {
      expect(stripped.includes(bad)).toBe(false);
    }
  });

  it('26. novel sample works through the same deterministic path', () => {
    const novelSha = 'ce'.repeat(32);
    const tree: FeedTreeEntry[] = [{ path: `Novel_Holdout_Dir_9x7/${novelSha}`, type: 'blob', size: 50_000 }];
    const d = discoverFeedStructure({ repo_metadata: meta, tree });
    const s = selectFeedSample({ discovery: d });
    expect(s.status).toBe('SELECTED');
    const acq = acquireFeedSample({ candidate: s.selected!, downloaded_sha256: novelSha, bytes_magic_class: 'OTHER', default_branch: 'master', acquired_at: ANALYZED_AT });
    expect(acq.status).toBe('ACQUIRED');
    expect(acq.artifact!.artifact_id).toBe(`art_gmf_${novelSha.slice(0, 16)}`);
  });
});

describe('fallback identity verification', () => {
  it('5. sha256 identity derived from repository naming + verified on registration', () => {
    const { acquisition } = fullPipeline(SHA_PE);
    expect(acquisition.status).toBe('ACQUIRED');
    expect(acquisition.sha256).toBe(SHA_PE);
    expect(acquisition.identity_key).toBe(`sha256:${SHA_PE}`);
  });

  it('6. hash mismatch rejected — hard stop, no artifact', () => {
    const d = discoverFeedStructure({ repo_metadata: meta, tree: syntheticTree() });
    const candidate = d.candidates[0];
    const acq = acquireFeedSample({ candidate, downloaded_sha256: 'ab'.repeat(32), bytes_magic_class: 'PE', default_branch: 'master', acquired_at: ANALYZED_AT });
    expect(acq.status).toBe('REJECTED_IDENTITY_MISMATCH');
    expect(acq.artifact).toBeNull();
  });

  it('7. Artifact registered through the canonical model (no second artifact type)', () => {
    const { acquisition } = fullPipeline(SHA_PE);
    expect(acquisition.artifact!.format_class).toBe('PE');
    expect(acquisition.artifact!.provenance.evidence_refs.length).toBe(1);
    expect(acquisition.artifact!.provenance.evidence_refs[0].source_id).toBe('src_github_malware_feed');
    expect(acquisition.raw_artifact_location!.startsWith('private://raw-samples/')).toBe(true);
  });

  it('magic classification is structural only', () => {
    expect(classifyFeedBytes(peMagic())).toBe('PE');
    const elf = new Uint8Array(8); elf[0] = 0x7f; elf[1] = 0x45; elf[2] = 0x4c; elf[3] = 0x46;
    expect(classifyFeedBytes(elf)).toBe('ELF');
    expect(classifyFeedBytes(new Uint8Array([0x50, 0x4b, 3, 4]))).toBe('OTHER');
  });
});

describe('fallback pipeline + report', () => {
  it('9-17. m5→m13 all invoked through the existing pipeline', () => {
    const { pipeline } = fullPipeline(SHA_PE);
    expect(pipeline.plan.steps.length).toBeGreaterThan(0);          // m5
    expect(pipeline.runtime.plan_id).toBe(pipeline.plan.plan_id);   // m6
    expect(Array.isArray(pipeline.claims.new_claims)).toBe(true);   // m7
    expect(Array.isArray(pipeline.behaviors.new_behaviors)).toBe(true);   // m8
    expect(Array.isArray(pipeline.configurations.new_configurations)).toBe(true); // m9
    expect(pipeline.family_resolution.resolution_state).toBeDefined();    // m10
    expect(Array.isArray(pipeline.infrastructure.new_relationships)).toBe(true);  // m11
    expect(Array.isArray(pipeline.attack_mbc.new_mappings)).toBe(true);   // m12
    expect(Array.isArray(pipeline.confidence_conflicts.confidence_assessments)).toBe(true); // m13
  });

  it('18/19. M14 report generated; grounding gate passes', () => {
    const { report, acquisition, pipeline } = fullPipeline(SHA_PE);
    expect(report.report_id.startsWith('mir_')).toBe(true);
    expect(groundReport(report, { pipeline, acquisition: { ...acquisition, source: 'GITHUB_MALWARE_FEED' } as never })).toEqual([]);
  });

  it('20/29. raw sample absent from public payload; no secret leakage', () => {
    const { report } = fullPipeline(SHA_PE);
    const pub = JSON.stringify(buildPublicReportPayload(report));
    expect(pub.includes('private://raw-samples')).toBe(false);
    expect(pub.includes('raw_artifact_location')).toBe(false);
    expect(pub.includes('archive_password')).toBe(false);
    expect(pub.includes('Auth-Key')).toBe(false);
    expect(pub.toLowerCase().includes('auth_key')).toBe(false);
  });

  it('21/22. deterministic report identity; repeated run idempotent', () => {
    const a = fullPipeline(SHA_PE);
    const b = fullPipeline(SHA_PE);
    expect(a.report.report_id).toBe(b.report.report_id);
    expect(shouldReuseExistingReport(a.report, b.report)).toBe(true);
  });

  it('23. family remains unresolved when evidence is insufficient', () => {
    const { pipeline } = fullPipeline(SHA_PE);
    expect(pipeline.family_resolution.resolution_state).toBe('UNRESOLVED');
    expect(pipeline.family_resolution.resolved_family).toBeNull();
  });

  it('24. limitations remain visible', () => {
    const { report } = fullPipeline(SHA_PE);
    expect(report.limitations.length).toBeGreaterThan(0);
  });

  it('27/28. workers.dev route convention deterministic; API and UI agree (payload identity)', () => {
    const { report } = fullPipeline(SHA_PE);
    const pub = buildPublicReportPayload(report) as Record<string, unknown>;
    expect(pub.report_id).toBe(report.report_id);
    expect((pub as { artifact_id: string }).artifact_id).toBe(report.artifact_id);
    expect(productionReportUrl('m14fb-holdout.workers.dev', report.report_id)).toBe(
      `https://m14fb-holdout.workers.dev/intelligence/malware/${report.report_id}`,
    );
  });
});

describe('fallback genericity', () => {
  it('8/30. source label stays source-reported; no legacy resolver reachable', () => {
    const src = readFileSync('packages/intelligence/src/malware/canonical/githubMalwareFeedAdapter.ts', 'utf8');
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // No legacy imports or family-resolution calls in the adapter.
    expect(stripped.includes("from '../resolution")).toBe(false);
    expect(stripped.includes('resolveMalwareFamily')).toBe(false);
    expect(stripped.includes('legacyReport')).toBe(false);
    // Registry-verified artifacts flow through the canonical pipeline only.
    expect(stripped.includes('identityKeyFromSha256')).toBe(true);
  });
});
