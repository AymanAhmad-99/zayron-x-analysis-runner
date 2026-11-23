import { describe, expect, it } from 'bun:test';
import { executeShadowVectorizeRetrieval, clearChunkCache } from '../packages/intelligence/src/engine_v2/shadow_vectorize';

describe('ZAYRON-X — D1 Resolution & F9 Prevention Integrity Suite', () => {

  it('1. D1 rate limit (F9 event) is explicitly caught and surfaced in resolution_metrics', async () => {
    clearChunkCache();
    const mockEnv = {
      AI: {
        run: async () => ({ data: [new Array(768).fill(0.01)] }),
      },
      VECTORIZE: {
        query: async () => ({
          count: 1,
          matches: [
            {
              id: 'vec_chk_rate_limited_01',
              score: 0.85,
              metadata: {
                chunk_id: 'chk_rate_limited_01',
                document_id: 'doc-unknown',
                section: 'Unknown Section',
                authority_tier: 1,
              },
            },
          ],
        }),
      },
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => {
              throw new Error('D1_ERROR: Your account has exceeded D1\'s free tier daily row read limit');
            },
          }),
        }),
      },
    };

    const result = await executeShadowVectorizeRetrieval({
      query: 'Test query for F9 failure exposure',
      rawText: 'Test raw telemetry text.',
      env: mockEnv,
    });

    expect(result.resolution_metrics).toBeDefined();
    expect(result.resolution_metrics?.d1_rate_limited).toBe(true);
    expect(result.resolution_metrics?.d1_error).toContain('exceeded D1\'s free tier daily row read limit');
    expect(result.resolution_metrics?.f9_failure_count).toBeGreaterThan(0);

    const chunk = result.resolved_chunks[0];
    expect(chunk.resolution_status).toBe('INCOMPLETE');
    expect(chunk.resolution_source).toBe('FAILED');
    expect(chunk.d1_rate_limited).toBe(true);
    expect(chunk.rejection_reason).toContain('D1 row read limit (F9 event)');
  });

  it('2. Successful D1 lookup sets resolution_source to D1 and populates content_hash', async () => {
    clearChunkCache();
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
                document_id: 'doc_ref_17_nvd_cvss',
                section: 'CVSS v3.1 Specification',
                authority_tier: 1,
              },
            },
          ],
        }),
      },
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => ({
              results: [
                {
                  id: 'chk_valid_01',
                  document_id: 'doc_ref_17_nvd_cvss',
                  section: 'CVSS v3.1 Specification',
                  page: 15,
                  text: 'Base metric group represents intrinsic vulnerability characteristics.',
                  authority_tier: 1,
                  source_id: 'cve_nvd',
                },
              ],
            }),
          }),
        }),
      },
    };

    const result = await executeShadowVectorizeRetrieval({
      query: 'CVSS base metric scoring',
      rawText: 'Advisory CVE-2026-10101: Critical CVSS scoring.',
      env: mockEnv,
    });

    expect(result.resolution_metrics?.d1_resolved).toBe(1);
    expect(result.resolution_metrics?.f9_failure_count).toBe(0);

    const chunk = result.resolved_chunks[0];
    expect(chunk.resolution_status).toBe('RESOLVED');
    expect(chunk.resolution_source).toBe('D1');
    expect(chunk.content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(chunk.text).toContain('Base metric group represents');
  });

  it('3. D1 rate limit safely falls back to canonical corpus for registered reference chunks', async () => {
    clearChunkCache();
    const mockEnv = {
      AI: {
        run: async () => ({ data: [new Array(768).fill(0.01)] }),
      },
      VECTORIZE: {
        query: async () => ({
          count: 1,
          matches: [
            {
              id: 'vec_doc-04-nist-sp-800-86-p1-1',
              score: 0.88,
              metadata: {
                chunk_id: 'doc-04-nist-sp-800-86-p1-1',
                document_id: 'doc-04-nist-sp-800-86',
                section: 'Memory Acquisition',
                authority_tier: 1,
              },
            },
          ],
        }),
      },
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => {
              throw new Error('D1_ERROR: Your account has exceeded D1\'s free tier daily row read limit');
            },
          }),
        }),
      },
    };

    const result = await executeShadowVectorizeRetrieval({
      query: 'Memory acquisition order of volatility',
      rawText: 'Incident analysis with volatile memory dump.',
      env: mockEnv,
    });

    expect(result.resolution_metrics?.d1_rate_limited).toBe(true);
    expect(result.resolution_metrics?.canonical_hits).toBe(1);

    const chunk = result.resolved_chunks[0];
    expect(chunk.resolution_status).toBe('RESOLVED');
    expect(chunk.resolution_source).toBe('CANONICAL_CORPUS');
    expect(chunk.content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(chunk.text.length).toBeGreaterThan(50);
  });
});
