import { describe, expect, it } from 'bun:test';
import { KNOWLEDGE_CHUNKS_CORPUS } from '../packages/intelligence/src/knowledge/corpus';
import { executeShadowVectorizeRetrieval } from '../packages/intelligence/src/engine_v2/shadow_vectorize';

describe('ZAYRON-X — DFIR Retrieval & Memory Forensics Integrity Suite', () => {

  it('1. Canonical corpus contains deep memory forensics chunks (AMF doc_ref_04_amf)', () => {
    const amfChunks = KNOWLEDGE_CHUNKS_CORPUS.filter(c => c.documentId === 'doc_ref_04_amf');
    expect(amfChunks.length).toBeGreaterThanOrEqual(6);

    const chunkIds = amfChunks.map(c => c.id);
    expect(chunkIds).toContain('chk_amf_01');
    expect(chunkIds).toContain('chk_amf_02');
    expect(chunkIds).toContain('chk_amf_03');
    expect(chunkIds).toContain('chk_amf_04');
    expect(chunkIds).toContain('chk_amf_05');
    expect(chunkIds).toContain('chk_amf_06');
  });

  it('2. Critical Windows kernel structures are represented in canonical DFIR chunks', () => {
    const allAmfText = KNOWLEDGE_CHUNKS_CORPUS
      .filter(c => c.documentId === 'doc_ref_04_amf')
      .map(c => c.text + ' ' + c.keyEntities.join(' '))
      .join('\n');

    expect(allAmfText).toContain('EPROCESS');
    expect(allAmfText).toContain('VadRoot');
    expect(allAmfText).toContain('SSDT');
    expect(allAmfText).toContain('Volatility');
    expect(allAmfText).toContain('Order of Volatility');
    expect(allAmfText).toContain('PAGE_EXECUTE_READWRITE');
    expect(allAmfText).toContain('ETHREAD');
  });

  it('3. Precondition Gate blocks AMF memory forensic chunks when memory dump is absent', async () => {
    const mockEnv = {
      AI: {
        run: async () => ({ data: [new Array(768).fill(0.01)] }),
      },
      VECTORIZE: {
        query: async () => ({
          count: 1,
          matches: [
            {
              id: 'vec_chk_amf_03',
              score: 0.91,
              metadata: {
                chunk_id: 'chk_amf_03',
                document_id: 'doc_ref_04_amf',
                section: 'VadRoot Traversal',
                authority_tier: 1,
                text: 'Traversing the VadRoot tree inspects MMVAD structures for memory ranges with executable protections.',
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

    // Telemetry without memory dump evidence
    const result = await executeShadowVectorizeRetrieval({
      query: 'Virtual Address Descriptor VAD tree traversal',
      rawText: 'Advisory: Web application SQL injection vulnerability reported.',
      env: mockEnv,
    });

    expect(result.resolved_chunks.length).toBe(1);
    const amf = result.resolved_chunks[0];
    expect(amf.preconditions_met).toBe(false);
    expect(amf.usage_status).toBe('CONSIDERED'); // Must NOT be USED
    expect(amf.failed_preconditions).toContain('LACKS_VOLATILE_MEMORY_OR_PROCESS_DUMP');
  });

  it('4. Precondition Gate promotes AMF chunks to USED when volatile memory telemetry is present', async () => {
    const mockEnv = {
      AI: {
        run: async () => ({ data: [new Array(768).fill(0.01)] }),
      },
      VECTORIZE: {
        query: async () => ({
          count: 1,
          matches: [
            {
              id: 'vec_chk_amf_03',
              score: 0.91,
              metadata: {
                chunk_id: 'chk_amf_03',
                document_id: 'doc_ref_04_amf',
                section: 'VadRoot Traversal',
                authority_tier: 1,
                text: 'Traversing the VadRoot tree inspects MMVAD structures for memory ranges with executable protections.',
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

    // Telemetry WITH volatile memory evidence
    const result = await executeShadowVectorizeRetrieval({
      query: 'Virtual Address Descriptor VAD tree traversal',
      rawText: 'Incident analysis of raw RAM memory dump using volatility showed suspicious unbacked allocation.',
      env: mockEnv,
    });

    expect(result.resolved_chunks.length).toBe(1);
    const amf = result.resolved_chunks[0];
    expect(amf.preconditions_met).toBe(true);
    expect(amf.usage_status).toBe('USED');
    expect(result.selected_chunks.length).toBe(1);
    expect(result.reasoning_context_snippet).toContain('VadRoot');
  });
});
