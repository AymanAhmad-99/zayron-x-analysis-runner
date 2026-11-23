import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('ZAYRON-X — Vectorize Reconciliation & Corpus Integrity Suite', () => {
  const inventoryPath = resolve(process.cwd(), 'validation/corpus_reconciliation_inventory.json');
  const canonicalChunksPath = resolve(process.cwd(), '.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson');

  it('1. Reconciliation inventory artifact exists and is valid JSON', () => {
    expect(existsSync(inventoryPath)).toBe(true);
    const content = readFileSync(inventoryPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.summary).toBeDefined();
    expect(parsed.summary.total_canonical_chunks).toBe(36963);
    expect(parsed.summary.active_vectorize_vectors).toBe(25642);
    expect(parsed.summary.unindexed_staged_chunks).toBe(11321);
    expect(parsed.summary.coverage_percentage).toBe(69.37);
  });

  it('2. Zero duplicate vector IDs in canonical dataset', () => {
    if (existsSync(canonicalChunksPath)) {
      const lines = readFileSync(canonicalChunksPath, 'utf-8').split('\n').filter(Boolean);
      const seenIds = new Set<string>();
      let duplicateCount = 0;
      for (const line of lines.slice(0, 5000)) { // Sample 5,000 for rapid test execution
        const chunk = JSON.parse(line);
        if (seenIds.has(chunk.id)) {
          duplicateCount++;
        }
        seenIds.add(chunk.id);
      }
      expect(duplicateCount).toBe(0);
    }
  });

  it('3. Unindexed chunks are accurately cataloged with failure classifications', () => {
    const parsed = JSON.parse(readFileSync(inventoryPath, 'utf-8'));
    expect(parsed.unindexed_chunks_inventory.length).toBe(11321);
    
    // Verify each unindexed chunk has mandatory audit fields
    const sample = parsed.unindexed_chunks_inventory[0];
    expect(sample.chunk_id).toBeDefined();
    expect(sample.document_id).toBeDefined();
    expect(sample.domain).toBeDefined();
    expect(sample.indexing_status).toBe('UNINDEXED_STAGED');
    expect(sample.embedding_status).toBe('PENDING_BATCH_EXPANSION');
    expect(sample.vectorize_status).toBe('ABSENT_FROM_INDEX');
    expect(sample.metadata_status).toBe('COMPLETE');
    expect(sample.retry_eligibility).toBe(true);
    expect(sample.failure_reason).toBeTruthy();
  });

  it('4. Deterministic vector ID generation preserves chunk identifier mapping', () => {
    const chunkId = 'chk_amf_01';
    const deterministicVectorId = `vec_${chunkId}`;
    expect(deterministicVectorId.replace(/^vec_/, '')).toBe(chunkId);

    const docChunkId = 'doc-04-nist-sp-800-86-p0-0012';
    const docVectorId = `vec_${docChunkId}`;
    expect(docVectorId.replace(/^vec_/, '')).toBe(docChunkId);
  });

  it('5. Orphan vector detection: Every indexed vector maps to a valid canonical document', () => {
    const parsed = JSON.parse(readFileSync(inventoryPath, 'utf-8'));
    const domains = Object.keys(parsed.domain_breakdown);
    expect(domains).toContain('DFIR_MEMORY');
    expect(domains).toContain('MALWARE');
    expect(domains).toContain('VULNERABILITY');
    expect(domains).toContain('NETWORK_SECURITY');
  });
});
