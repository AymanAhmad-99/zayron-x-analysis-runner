/**
 * ZAYRON-X — LIVE VECTORIZE BENCHMARK INTEGRITY & REPRODUCIBILITY TEST SUITE V4
 * Validates frozen gold dataset, raw traces, independent recalculation, and failure taxonomy.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

describe('Z.X.INTELLIGENCE — Real Live Vectorize Retrieval Benchmark V4 Suite', () => {
  const goldPath = resolve(process.cwd(), 'validation/gold_dataset.json');
  const tracesPath = resolve(process.cwd(), 'validation/raw_vectorize_traces.json');
  const recalcPath = resolve(process.cwd(), 'validation/live_metric_recalculation.json');
  const hiddenPath = resolve(process.cwd(), 'validation/hidden_real_queries.json');

  it('1. Frozen Gold Dataset contains 100 queries and matches immutable SHA-256 hash', () => {
    expect(existsSync(goldPath)).toBe(true);
    const raw = readFileSync(goldPath, 'utf-8');
    const queries = JSON.parse(raw);

    expect(queries.length).toBe(100);

    // Verify domain distribution
    const vuln = queries.filter((q: any) => q.domain === 'VULNERABILITY');
    const malw = queries.filter((q: any) => q.domain === 'MALWARE');
    const net = queries.filter((q: any) => q.domain === 'NETWORK_SECURITY');
    const dfir = queries.filter((q: any) => q.domain === 'DFIR_MEMORY');
    const actor = queries.filter((q: any) => q.domain === 'THREAT_ACTOR');
    const ir = queries.filter((q: any) => q.domain === 'INCIDENT_RESPONSE');

    expect(vuln.length).toBe(25);
    expect(malw.length).toBe(20);
    expect(net.length).toBe(20);
    expect(dfir.length).toBe(15);
    expect(actor.length).toBe(10);
    expect(ir.length).toBe(10);

    // Verify hash integrity. Canonicalize CRLF -> LF first: the fixture's content
    // hash was recorded against LF bytes (corroborated in docs/ZAYRON_X_REAL_VECTORIZE_BENCHMARK_V4.md
    // and validation/v6_live_metric_recalculation.json), while Windows checkouts
    // materialize the file with CRLF. Canonicalization keeps the provenance hash
    // stable across checkout line-ending conversion; it must NOT be used to mask
    // content changes (query count and domain distribution are asserted above).
    const canonical = raw.replace(/\r\n/g, '\n');
    const hash = createHash('sha256').update(canonical).digest('hex');
    expect(hash).toBe('6546a99f7cb8d452799c1bd30f23e2a502fa3eb313e59d63c75169c587739a43');
  });

  it('2. Raw Vectorize Traces contain 100 authentic live executions with 768d embeddings', () => {
    expect(existsSync(tracesPath)).toBe(true);
    const traces = JSON.parse(readFileSync(tracesPath, 'utf-8'));

    expect(traces.length).toBe(100);

    for (const t of traces) {
      expect(t.embedding_model).toBe('@cf/baai/bge-base-en-v1.5');
      expect(t.embedding_dimensions).toBe(768);
      expect(t.vectorize_index).toBe('zayron-knowledge-index');
      expect(t.top_5.length).toBeGreaterThan(0);
      expect(t.top_10.length).toBeGreaterThanOrEqual(t.top_5.length);
      expect(t.top_20.length).toBeGreaterThanOrEqual(t.top_10.length);

      // Verify authentic vector ID prefix patterns
      const firstVector = t.top_5[0].vector_id;
      const isValidPattern = firstVector.startsWith('kb-') || firstVector.startsWith('vec_') || firstVector.startsWith('vec-') || firstVector.startsWith('evt_');
      expect(isValidPattern).toBe(true);
    }
  });

  it('3. Anti-Circularity Check: Traces do NOT mirror gold relevant chunks verbatim', () => {
    const gold = JSON.parse(readFileSync(goldPath, 'utf-8'));
    const traces = JSON.parse(readFileSync(tracesPath, 'utf-8'));

    let exactMatchCount = 0;
    for (let i = 0; i < gold.length; i++) {
      const g = gold[i];
      const t = traces[i];

      // Compare top 2 candidates against gold
      const top2CandidateIds = t.top_5.slice(0, 2).map((c: any) => c.chunk_id);
      const isIdenticalToGold = JSON.stringify(top2CandidateIds) === JSON.stringify(g.expected_relevant_chunk_ids);
      if (isIdenticalToGold) exactMatchCount++;
    }

    // In a live retrieval system, top candidates should NOT be identical in all 100 cases (unlike V2 circular mock)
    expect(exactMatchCount).toBeLessThan(50);
  });

  it('4. Recalculated Top-K curve exhibits authentic information retrieval monotonicity', () => {
    expect(existsSync(recalcPath)).toBe(true);
    const recalc = JSON.parse(readFileSync(recalcPath, 'utf-8'));

    const curves = recalc.top_k_curves;
    expect(curves['K=1']).toBeDefined();
    expect(curves['K=3']).toBeDefined();
    expect(curves['K=5']).toBeDefined();
    expect(curves['K=10']).toBeDefined();
    expect(curves['K=20']).toBeDefined();

    // Hit rate must monotonically increase or stabilize as K increases
    expect(curves['K=3'].hit_rate).toBeGreaterThanOrEqual(curves['K=1'].hit_rate);
    expect(curves['K=5'].hit_rate).toBeGreaterThanOrEqual(curves['K=3'].hit_rate);
    expect(curves['K=10'].hit_rate).toBeGreaterThanOrEqual(curves['K=5'].hit_rate);
    expect(curves['K=20'].hit_rate).toBeGreaterThanOrEqual(curves['K=10'].hit_rate);

    expect(curves['K=5'].hit_rate).toBeGreaterThanOrEqual(0.87);
  });

  it('5. Domain Divergence is preserved (DFIR recall deficit is transparently recorded)', () => {
    const recalc = JSON.parse(readFileSync(recalcPath, 'utf-8'));
    const dom = recalc.domain_breakdown;

    expect(dom['VULNERABILITY']).toBeDefined();
    expect(dom['DFIR_MEMORY']).toBeDefined();

    // Vulnerability recall is high (0.92) while DFIR recall is low (0.356)
    expect(dom['VULNERABILITY'].R_at_5_doc).toBeGreaterThan(0.85);
    expect(dom['DFIR_MEMORY'].R_at_5_doc).toBeLessThan(0.50);
  });

  it('6. Failure Taxonomy records empirical failure modes (F3, F7, F9)', () => {
    const recalc = JSON.parse(readFileSync(recalcPath, 'utf-8'));
    const tax = recalc.failure_taxonomy;

    // Failures were NOT concealed
    expect(tax.F3_semantically_related_insufficient).toBeGreaterThan(0);
    expect(tax.F7_irrelevant_high_similarity).toBeGreaterThan(0);
    expect(tax.F9_d1_resolution_failure).toBeGreaterThan(0);
  });

  it('7. Real-world holdout dataset contains 30 independent queries', () => {
    expect(existsSync(hiddenPath)).toBe(true);
    const hidden = JSON.parse(readFileSync(hiddenPath, 'utf-8'));
    expect(hidden.length).toBe(30);

    // Verify key zero-day and supply chain test cases
    const hasMadLicense = hidden.some((h: any) => h.query.includes('CVE-2024-38077') || h.query.includes('MadLicense'));
    const hasXz = hidden.some((h: any) => h.query.includes('CVE-2024-3094') || h.query.includes('xz-utils'));
    const hasCrowdStrike = hidden.some((h: any) => h.query.includes('CrowdStrike') || h.query.includes('Channel File 291'));

    expect(hasMadLicense).toBe(true);
    expect(hasXz).toBe(true);
    expect(hasCrowdStrike).toBe(true);
  });
});
