/**
 * ZAYRON-X — INDEPENDENT RETRIEVAL & CLAIM ATTRIBUTION VALIDATION V2 TEST SUITE
 * Proves retrieval quality, chunk provenance, knowledge usage, and causal claim attribution.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { executeShadowVectorizeRetrieval, computeChunkContentHash, ResolvedChunkItem } from '../packages/intelligence/src/engine_v2/shadow_vectorize';
import { buildClaimAttributionGraph, executeCounterfactualCausalityTest } from '../packages/intelligence/src/engine_v2/causality';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';
import { evaluateDeepQualityGateV2 } from '../packages/intelligence/src/engine_v2/quality_gate';
import { runIndependentEvaluation } from '../validation/evaluator';

describe('Z.X.INTELLIGENCE — Independent Retrieval & Claim Attribution Validation V2', () => {
  const benchmarkPath = resolve(process.cwd(), 'validation/benchmark_cases.json');

  it('1. Golden Benchmark contains exactly 100 curated cases with valid ground truth', () => {
    expect(existsSync(benchmarkPath)).toBe(true);
    const raw = readFileSync(benchmarkPath, 'utf-8');
    const cases = JSON.parse(raw);

    expect(cases.length).toBe(100);

    const vulnCases = cases.filter((c: any) => c.category === 'VULNERABILITY');
    const malwCases = cases.filter((c: any) => c.category === 'MALWARE');
    const netCases = cases.filter((c: any) => c.category === 'NETWORK_SECURITY');
    const memCases = cases.filter((c: any) => c.category === 'MEMORY_FORENSICS');
    const actorCases = cases.filter((c: any) => c.category === 'THREAT_ACTOR');

    expect(vulnCases.length).toBe(25);
    expect(malwCases.length).toBe(25);
    expect(netCases.length).toBe(20);
    expect(memCases.length).toBe(15);
    expect(actorCases.length).toBe(15);

    // Assert that all memory cases are explicitly marked SYNTHETIC CONTROLLED TEST
    memCases.forEach((mc: any) => {
      expect(mc.is_synthetic).toBe(true);
      expect(mc.title).toContain('SYNTHETIC CONTROLLED TEST');
    });

    // Assert that real cases are not disguised as synthetic
    vulnCases.forEach((vc: any) => expect(vc.is_synthetic).toBe(false));
  });

  it('2. Cryptographic SHA-256 chunk provenance is computed directly from chunk text', () => {
    const chunkText = 'Root cause analysis requires memory layout inspection of the heap metadata structure.';
    const hash = computeChunkContentHash(chunkText);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // Valid SHA-256 hex string
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);

    // Idempotency: exact same text yields exact same hash
    const hash2 = computeChunkContentHash(chunkText);
    expect(hash2).toBe(hash);

    // Empty text yields safe empty sentinel
    expect(computeChunkContentHash('')).toBe('EMPTY_CHUNK_HASH');
  });

  it('3. Precondition Gate blocks AMF memory forensic chunks when memory dump is absent', async () => {
    const mockEnv = {
      AI: {
        run: async () => ({ data: [new Array(768).fill(0.05)] }),
      },
      VECTORIZE: {
        query: async () => ({
          count: 2,
          matches: [
            {
              id: 'vec_chk_amf_01',
              score: 0.92,
              metadata: {
                chunk_id: 'chk_amf_01',
                document_id: 'The Art of Memory Forensics',
                section: 'Kernel Pool Tags',
                authority_tier: 1,
                text: 'Inspect kernel pool tags to identify hidden or unlinked process structures.',
              },
            },
            {
              id: 'vec_chk_cve_02',
              score: 0.88,
              metadata: {
                chunk_id: 'chk_cve_02',
                document_id: 'NIST SP 800-61',
                section: 'Vulnerability Remediation',
                authority_tier: 1,
                text: 'Prioritize patch testing and boundary isolation.',
              },
            },
          ],
        }),
      },
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ results: [] }),
          }),
        }),
      },
    };

    // Raw text with CVE only, no memory dump evidence
    const result = await executeShadowVectorizeRetrieval({
      query: 'SonicOS buffer overflow CVE-2024-40766 patch',
      rawText: 'SonicWall released patch for CVE-2024-40766 affecting firewall appliances.',
      env: mockEnv,
    });

    expect(result.resolved_chunks.length).toBe(2);

    const amfChunk = result.resolved_chunks.find(c => c.document_id === 'The Art of Memory Forensics');
    expect(amfChunk).toBeDefined();
    expect(amfChunk?.preconditions_met).toBe(false);
    expect(amfChunk?.usage_status).toBe('CONSIDERED'); // Gated, not USED
    expect(amfChunk?.failed_preconditions).toContain('LACKS_VOLATILE_MEMORY_OR_PROCESS_DUMP');

    // Selected chunks for reasoning context must ONLY contain chunks with status USED
    expect(result.selected_chunks.every(sc => sc.usage_status === 'USED')).toBe(true);
    expect(result.selected_chunks.some(sc => sc.document_id === 'The Art of Memory Forensics')).toBe(false);
  });

  it('4. State Machine transitions are recorded with triggers, timestamps, and reasons', async () => {
    const mockEnv = {
      AI: {
        run: async () => ({ data: [new Array(768).fill(0.01)] }),
      },
      VECTORIZE: {
        query: async () => ({
          count: 1,
          matches: [
            {
              id: 'vec_chk_valid_01',
              score: 0.89,
              metadata: {
                chunk_id: 'chk_valid_01',
                document_id: 'Enterprise Threat Modeling',
                section: 'Attack Surface',
                authority_tier: 1,
                text: 'Evaluate internet-facing services and firewall policies.',
              },
            },
          ],
        }),
      },
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ results: [] }),
          }),
        }),
      },
    };

    const res = await executeShadowVectorizeRetrieval({
      query: 'External attack surface assessment',
      rawText: 'Telemetry indicates public internet ingress scan on ports 80 and 443.',
      env: mockEnv,
    });

    const chunk = res.resolved_chunks[0];
    expect(chunk.state_transitions.length).toBeGreaterThanOrEqual(2);

    const first = chunk.state_transitions[0];
    expect(first.from_state).toBe('INDEXED');
    expect(first.to_state).toBe('RETRIEVED');
    expect(first.trigger).toBe('VECTORIZE_SIMILARITY_MATCH');

    const second = chunk.state_transitions[1];
    expect(second.from_state).toBe('RETRIEVED');
    expect(second.to_state).toBe('CONSIDERED');
    expect(second.trigger).toBe('PRECONDITION_EVALUATION');
  });

  it('5. Claim Attribution Graph accurately traces: EVIDENCE -> CLAIM -> CHUNK -> CONTEXT -> SECTION', () => {
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_test_attr_01',
      channelTitle: 'SonicWall Security Advisory',
      messageId: 'msg_9921',
      rawText: 'SonicWall advisory: Critical buffer overflow vulnerability CVE-2024-40766 in SonicOS management interface. CVSS Base Score: 9.3 (CRITICAL). Exploit exists in the wild.',
    });

    const graph = buildClaimAttributionGraph({ report: analysis.report });

    expect(graph.nodes.evidence.length).toBeGreaterThan(0);
    expect(graph.nodes.claims.length).toBeGreaterThan(0);
    expect(graph.nodes.sections.length).toBe(10); // 10 Canonical sections

    // Every edge links evidence_id -> claim_id -> chunk_id -> context_id -> report_section_ids
    for (const edge of graph.edges) {
      expect(edge.evidence_id).toBeDefined();
      expect(edge.claim_id).toBeDefined();
      expect(edge.chunk_id).toBeDefined();
      expect(edge.context_id).toBeDefined();
      expect(edge.report_section_ids.length).toBeGreaterThan(0);
    }
  });

  it('6. Counterfactual Causality Engine calculates Knowledge Causality Score (Run A, B, C)', () => {
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_causality_test',
      channelTitle: 'Threat Intelligence Lab',
      messageId: 'msg_causality_01',
      rawText: 'Advisory: CVE-2024-40766 memory corruption flaw. CVSS Base Score: 9.3. High risk of exploitation.',
    });

    const targetChunk: ResolvedChunkItem = {
      provenance: {
        query_id: 'q_1',
        retrieval_id: 'r_1',
        query_text: 'query',
        embedding_model: '@cf/baai/bge-base-en-v1.5',
        embedding_dimensions: 768,
        pooling_method: 'mean',
        vectorize_index: 'zayron-knowledge-index',
        top_k: 5,
        vector_id: 'vec_hae_01',
        similarity_score: 0.91,
        chunk_id: 'chk_hae_01',
        document_id: 'Hacking: The Art of Exploitation',
        document_title: 'Hacking: The Art of Exploitation',
        section: 'Heap Exploitation',
        authority_tier: 1,
        source: 'canonical-v1',
        chunk_text: 'Heap corruption vulnerabilities exploit inline metadata to overwrite function pointers.',
        content_hash: computeChunkContentHash('Heap corruption vulnerabilities exploit inline metadata to overwrite function pointers.'),
        ingestion_version: 'v1',
        embedding_version: 'v1',
      },
      vector_id: 'vec_hae_01',
      chunk_id: 'chk_hae_01',
      document_id: 'Hacking: The Art of Exploitation',
      section: 'Heap Exploitation',
      similarity_score: 0.91,
      authority_tier: 1,
      text: 'Heap corruption vulnerabilities exploit inline metadata to overwrite function pointers.',
      content_hash: computeChunkContentHash('Heap corruption vulnerabilities exploit inline metadata to overwrite function pointers.'),
      resolution_status: 'RESOLVED',
      resolution_source: 'D1',
      preconditions_met: true,
      preconditions_passed: ['VULNERABILITY_TELEMETRY'],
      failed_preconditions: [],
      usage_status: 'USED',
      state_transitions: [],
    };

    const irrelevantChunk: ResolvedChunkItem = {
      ...targetChunk,
      chunk_id: 'chk_amf_unrelated',
      document_id: 'The Art of Memory Forensics',
      section: 'VAD Tree Traversal',
      text: 'Traversing the Virtual Address Descriptor tree to locate unbacked memory allocations.',
    };

    const causality = executeCounterfactualCausalityTest({
      chunk: targetChunk,
      irrelevantChunk,
      baselineReport: analysis.report,
    });

    expect(causality.run_a).toBeDefined();
    expect(causality.run_b).toBeDefined();
    expect(causality.run_c).toBeDefined();

    // Run B (Ablation) should have fewer knowledge-informed claims than Run A
    expect(causality.run_b.knowledge_informed_claim_count).toBeLessThan(causality.run_a.knowledge_informed_claim_count);

    // Run C (Substitution) should reject irrelevant knowledge injection
    expect(causality.metrics.substitution_rejection_success).toBe(true);

    // Causality score should indicate strong or moderate causality
    expect(causality.metrics.causality_score).toBeGreaterThanOrEqual(0.60);
    expect(causality.causally_grounded).toBe(true);
  });

  it('7. Independent Evaluator completes 100-case benchmark and validates all acceptance criteria', () => {
    const report = runIndependentEvaluation();

    expect(report.benchmark_cases_count).toBe(100);
    expect(report.production_modified).toBe(false);

    // Metric assertions
    expect(report.metrics.vectorize_execution.status).toBe('PASS');
    expect(report.metrics.provenance_completeness.status).toBe('PASS');
    expect(report.metrics.chunk_resolution_rate.status).toBe('PASS');
    expect(report.metrics.precondition_accuracy.status).toBe('PASS');
    expect(report.metrics.claim_attribution_rate.status).toBe('PASS');
    expect(report.metrics.irrelevant_knowledge_usage_rate.value).toBe('0.0%');
    expect(report.metrics.unsupported_knowledge_claims.value).toBe('0');
    expect(report.metrics.reproducibility.value).toBe('100%');

    // Classification assertion
    expect(report.classification).toBe('VECTORIZE READY FOR SHADOW');
    expect(report.weighted_scores.total_composite_score).toBeGreaterThanOrEqual(95.0);
  });
});
