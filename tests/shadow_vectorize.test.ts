import { describe, expect, test } from 'bun:test';
import { 
  executeShadowVectorizeRetrieval, 
  formatKnowledgeTracesFromShadowChunks,
  ResolvedChunkItem
} from '../packages/intelligence/src/engine_v2/shadow_vectorize';
import { evaluateDeepQualityGateV2 } from '../packages/intelligence/src/engine_v2/quality_gate';
import { compileCanonicalReportV2 } from '../packages/intelligence/src/engine_v2/compiler';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2';
import type { CanonicalReportObjectV2 } from '../packages/intelligence/src/engine_v2/types';

describe('ZAYRON-X — Real Knowledge Retrieval Shadow Engine Test Suite', () => {

  // Mock Vectorize and Workers AI environment
  function createMockEnv(overrides?: {
    matches?: any[];
    d1Chunks?: any[];
    failEmbedding?: boolean;
    failD1?: boolean;
  }) {
    const defaultMatches = [
      {
        id: 'vec_chk_nvd_cvss_01',
        score: 0.885,
        metadata: {
          chunk_id: 'chk_nvd_cvss_01',
          document_id: 'doc_ref_17_nvd_cvss',
          section: 'CVSS v3.1 Specification: Attack Vector & Complexity',
          authority_tier: 1,
        }
      },
      {
        id: 'vec_chk_amf_01',
        score: 0.842,
        metadata: {
          chunk_id: 'chk_amf_01',
          document_id: 'doc_ref_04_amf',
          section: 'Chapter 4: Process Memory & VAD Tree Analysis',
          authority_tier: 2,
        }
      },
      {
        id: 'vec_chk_pma_01',
        score: 0.810,
        metadata: {
          chunk_id: 'chk_pma_01',
          document_id: 'doc_ref_02_pma',
          section: 'Chapter 11: Malware Hooking and In-Memory Injection',
          authority_tier: 2,
        }
      }
    ];

    const defaultD1Chunks = [
      {
        id: 'chk_nvd_cvss_01',
        document_id: 'doc_ref_17_nvd_cvss',
        section: 'CVSS v3.1 Specification: Attack Vector & Complexity',
        page: 12,
        text: 'The Attack Vector (AV) metric reflects the context by which vulnerability exploitation is possible. A Network (N) value indicates remote exploitation without local access.',
        authority_tier: 1,
      },
      {
        id: 'chk_amf_01',
        document_id: 'doc_ref_04_amf',
        section: 'Chapter 4: Process Memory & VAD Tree Analysis',
        page: 104,
        text: 'Virtual Address Descriptors (VAD) identify memory regions allocated with executable permissions (PAGE_EXECUTE_READWRITE) used in reflective DLL injection.',
        authority_tier: 2,
      },
      {
        id: 'chk_pma_01',
        document_id: 'doc_ref_02_pma',
        section: 'Chapter 11: Malware Hooking and In-Memory Injection',
        page: 250,
        text: 'API-based process injection commonly leverages VirtualAllocEx, WriteProcessMemory, and CreateRemoteThread to execute arbitrary shellcode in foreign address spaces.',
        authority_tier: 2,
      }
    ];

    const matches = overrides?.matches ?? defaultMatches;
    const d1Chunks = overrides?.d1Chunks ?? defaultD1Chunks;

    return {
      AI: {
        run: async (model: string, input: any) => {
          if (overrides?.failEmbedding) throw new Error('AI embedding service timeout');
          // Return simulated 768-dimensional embedding vector
          const vec = Array.from({ length: 768 }, (_, i) => Math.sin(i * 0.1) * 0.05);
          return { data: [vec] };
        }
      },
      VECTORIZE: {
        query: async (vector: number[], options: any) => {
          return {
            matches,
            count: matches.length,
          };
        }
      },
      DB: {
        prepare: (query: string) => ({
          bind: (...args: any[]) => ({
            all: async () => {
              if (overrides?.failD1) throw new Error('D1 database connection error');
              const requestedIds = args;
              const filtered = d1Chunks.filter(c => requestedIds.includes(c.id));
              return { results: filtered, success: true };
            }
          })
        })
      }
    };
  }

  // ── TEST 1: Vectorize query actually executes in shadow mode ────────────────
  test('1. Vectorize query actually executes in shadow mode with 768d embedding and topK', async () => {
    const env = createMockEnv();
    const result = await executeShadowVectorizeRetrieval({
      query: 'HTTP header parsing buffer overflow in web server',
      rawText: 'Advisory CVE-2026-99999: Buffer overflow in HTTP header parser.',
      topK: 3,
      env,
    });

    expect(result.execution_mode).toBe('AUTHENTIC_VECTORIZE_D1');
    expect(result.vector_dimensions).toBe(768);
    expect(result.query_vector_preview.length).toBe(8);
    expect(result.returned_vector_ids.length).toBe(3);
    expect(result.returned_vector_ids[0]).toBe('vec_chk_nvd_cvss_01');
    expect(result.similarity_scores[0]).toBe(0.885);
  });

  // ── TEST 2: Retrieved vectors resolve to real chunks via D1 ──────────────────
  test('2. Retrieved vectors resolve to real D1 chunks with non-empty text', async () => {
    const env = createMockEnv();
    const result = await executeShadowVectorizeRetrieval({
      query: 'Vulnerability CVSS metrics',
      rawText: 'Advisory CVE-2026-99999: Buffer overflow in HTTP header parser.',
      topK: 3,
      env,
    });

    expect(result.resolved_chunks.length).toBe(3);
    const nvdChunk = result.resolved_chunks.find(c => c.chunk_id === 'chk_nvd_cvss_01');
    expect(nvdChunk).toBeDefined();
    expect(nvdChunk!.resolution_status).toBe('RESOLVED');
    expect(nvdChunk!.resolution_source).toBe('D1');
    expect(nvdChunk!.text).toContain('Attack Vector (AV) metric reflects');
  });

  // ── TEST 3: Selected chunks enter reasoning context ──────────────────────────
  test('3. Selected chunks enter reasoning context snippet', async () => {
    const env = createMockEnv();
    const result = await executeShadowVectorizeRetrieval({
      query: 'Vulnerability CVSS metrics',
      rawText: 'Advisory CVE-2026-99999: Buffer overflow in HTTP header parser.',
      topK: 3,
      env,
    });

    expect(result.selected_chunks.length).toBeGreaterThan(0);
    expect(result.reasoning_context_snippet).toContain('[KNOWLEDGE SOURCE: doc_ref_17_nvd_cvss');
    expect(result.reasoning_context_snippet).toContain('Attack Vector (AV) metric reflects');
  });

  // ── TEST 4: USED requires actual context inclusion ───────────────────────────
  test('4. USED status is only assigned when chunk text is resolved and included', async () => {
    const env = createMockEnv();
    const result = await executeShadowVectorizeRetrieval({
      query: 'Vulnerability metrics',
      rawText: 'Advisory CVE-2026-99999: Buffer overflow in HTTP header parser.',
      topK: 3,
      env,
    });

    for (const chunk of result.selected_chunks) {
      expect(chunk.usage_status).toBe('USED');
      expect(chunk.resolution_status).toBe('RESOLVED');
      expect(chunk.text.length).toBeGreaterThan(10);
      expect(result.reasoning_context_snippet).toContain(chunk.text.slice(0, 50));
    }
  });

  // ── TEST 5: USED requires claim/section influence ────────────────────────────
  test('5. Quality Gate rejects USED chunk that influences zero claims or sections', () => {
    const rep = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_test_01',
      channelTitle: 'Test Channel',
      messageId: 'msg_01',
      rawText: 'Red Hat Security Advisory CVE-2026-99999 CVSS Base Score 7.5.',
      publishedAt: new Date().toISOString(),
    }).report;

    // Inject ungrounded knowledge trace
    rep.knowledge_trace.push({
      document_id: 'doc_ref_17_nvd_cvss',
      chunk_id: 'chk_uninfluenced_01',
      title: 'NVD CVSS Reference',
      domain: 'VULNERABILITY_ANALYSIS' as any,
      retrieval_score: 0.90,
      retrieval_method: 'DOMAIN_PRECONDITION_SEMANTIC',
      reason_retrieved: 'Test',
      section_influenced: [], // EMPTY
      claim_influenced: [],   // EMPTY
      status: 'USED',         // FORGED
    });

    const qg = evaluateDeepQualityGateV2(rep, rep.raw_telemetry_snippet);
    expect(qg.passed).toBe(false);
    expect(qg.stage_results.knowledge_validation.violations).toContain(
      'UNGROUNDED KNOWLEDGE USAGE: Chunk chk_uninfluenced_01 marked USED but influences zero sections or claims.'
    );
  });

  // ── TEST 6: Irrelevant knowledge is rejected via preconditions ───────────────
  test('6. Irrelevant knowledge (AMF without memory telemetry) is rejected to CONSIDERED', async () => {
    const env = createMockEnv();
    const result = await executeShadowVectorizeRetrieval({
      query: 'Heap buffer overflow vulnerability in HTTP header parser',
      rawText: 'Pure vulnerability advisory CVE-2026-99999: Heap buffer overflow in HTTP header parser.',
      topK: 3,
      env,
    });

    const amfChunk = result.resolved_chunks.find(c => c.document_id === 'doc_ref_04_amf');
    expect(amfChunk).toBeDefined();
    expect(amfChunk!.preconditions_met).toBe(false);
    expect(amfChunk!.usage_status).toBe('CONSIDERED'); // NOT USED
    expect(amfChunk!.gate_reason).toContain('Lacks required memory dump');

    // Make sure AMF is NOT in selected_chunks
    const selectedAmf = result.selected_chunks.find(c => c.document_id === 'doc_ref_04_amf');
    expect(selectedAmf).toBeUndefined();
  });

  // ── TEST 7: Missing chunk text prevents USED (marked INCOMPLETE) ─────────────
  test('7. Missing chunk text in D1 prevents USED and marks chunk INCOMPLETE', async () => {
    // D1 returns empty results (text cannot be resolved)
    const env = createMockEnv({ d1Chunks: [] });
    const result = await executeShadowVectorizeRetrieval({
      query: 'Heap buffer overflow vulnerability',
      rawText: 'Advisory CVE-2026-99999: buffer overflow.',
      topK: 3,
      env,
    });

    for (const chunk of result.resolved_chunks) {
      expect(chunk.resolution_status).toBe('INCOMPLETE');
      expect(chunk.usage_status).toBe('CONSIDERED'); // Cannot be USED
    }
    expect(result.selected_chunks.length).toBe(0);
  });

  // ── TEST 8: Knowledge cannot become incident evidence ────────────────────────
  test('8. Knowledge reference text is not promoted to verified incident evidence', () => {
    const rawSignal = 'Vendor security advisory for CVE-2026-8888. Fixed in version 1.2.3.';
    const { report } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_vendor',
      channelTitle: 'Vendor Advisory',
      messageId: 'msg_888',
      rawText: rawSignal,
    });

    // Case evidence must only contain quotes from raw telemetry, never textbook quotes
    expect(report.evidence_items.length).toBeGreaterThan(0);
    for (const item of report.evidence_items) {
      expect(item.quoted_excerpt).toContain('CVE-2026-8888');
    }
  });

  // ── TEST 9: No ATT&CK mapping is created from knowledge alone ────────────────
  test('9. No ATT&CK technique mapping is derived from retrieved knowledge alone', async () => {
    const env = createMockEnv();
    const result = await executeShadowVectorizeRetrieval({
      query: 'Process injection techniques',
      rawText: 'General discussion: How adversaries inject code.',
      topK: 3,
      env,
    });

    const traces = formatKnowledgeTracesFromShadowChunks(result.resolved_chunks);
    const { report } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_discussion',
      channelTitle: 'Discussion Forum',
      messageId: 'msg_disc',
      rawText: 'General discussion: How adversaries inject code.',
      skipKnowledgeRetrieval: true,
    });
    report.knowledge_trace = traces;

    // ATT&CK mappings must be empty because rawText has no behavioral telemetry
    expect(report.attack_mappings.length).toBe(0);
  });

  // ── TEST 10: No severity decision is created from textbook knowledge alone ───
  test('10. No severity decision is overridden by textbook knowledge', () => {
    const { report } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_vendor',
      channelTitle: 'Vendor Advisory',
      messageId: 'msg_sev',
      rawText: 'Advisory CVE-2026-3333. CVSS Base Score: 5.1 (MEDIUM). Affected component: logging daemon.',
    });

    // Even if high-severity books are retrieved, severity remains MEDIUM
    expect(report.severity).toBe('MEDIUM');
    expect(report.enrichment.cvss_score).toBe(5.1);
  });

  // ── TEST 11: Quality Gate blocks fabricated retrieval metadata ───────────────
  test('11. Quality Gate blocks report with fabricated INCOMPLETE chunk marked USED', () => {
    const { report } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_vendor',
      channelTitle: 'Vendor Advisory',
      messageId: 'msg_fake_trace',
      rawText: 'Advisory CVE-2026-4444. CVSS Base Score: 6.0.',
    });

    report.knowledge_trace.push({
      document_id: 'doc_ref_17_nvd_cvss',
      chunk_id: 'chk_missing_text',
      title: 'NVD CVSS Reference',
      domain: 'VULNERABILITY_ANALYSIS' as any,
      retrieval_score: 0.95,
      retrieval_method: 'DOMAIN_PRECONDITION_SEMANTIC',
      reason_retrieved: 'Fabricated retrieval test',
      section_influenced: ['03 — TECHNICAL ANALYSIS'],
      claim_influenced: ['Test claim'],
      status: 'USED',
      resolution_status: 'INCOMPLETE' as any, // FORGED INCOMPLETE RESOLUTION
    });

    const qg = evaluateDeepQualityGateV2(report, report.raw_telemetry_snippet);
    expect(qg.passed).toBe(false);
    expect(qg.stage_results.knowledge_validation.violations).toContain(
      'INCOMPLETE KNOWLEDGE RETRIEVAL: Chunk chk_missing_text cannot be marked USED because chunk text failed resolution.'
    );
  });

});
