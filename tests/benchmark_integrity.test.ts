/**
 * ZAYRON-X — FORENSIC BENCHMARK INTEGRITY & EVIDENCE AUDIT V3 TEST SUITE
 * Adversarial audit of benchmark circularity, metric derivations, sample sizes, and hidden evaluation.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { computeChunkContentHash } from '../packages/intelligence/src/engine_v2/shadow_vectorize';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';
import { buildClaimAttributionGraph } from '../packages/intelligence/src/engine_v2/causality';

describe('Z.X.INTELLIGENCE — Forensic Benchmark Integrity & Evidence Audit V3', () => {
  const benchmarkPath = resolve(process.cwd(), 'validation/benchmark_cases.json');
  const resultsPath = resolve(process.cwd(), 'validation/validation-results.json');
  const hiddenPath = resolve(process.cwd(), 'validation/hidden_benchmark_cases.json');
  const evaluatorCode = readFileSync(resolve(process.cwd(), 'validation/evaluator.ts'), 'utf-8');

  it('1. Circularity Audit: Proves evaluator synthesized candidates from ground truth labels', () => {
    // Audit line 199-202 in evaluator.ts:
    // const simulatedRetrievedIds = [...bc.ground_truth.relevant_chunk_ids, ...bc.ground_truth.irrelevant_chunk_ids].slice(0, topK);
    const hasConcatenation = evaluatorCode.includes('bc.ground_truth.relevant_chunk_ids') &&
      evaluatorCode.includes('bc.ground_truth.irrelevant_chunk_ids') &&
      evaluatorCode.includes('simulatedRetrievedIds');

    expect(hasConcatenation).toBe(true);

    // Forensic deduction:
    // Because relevant_chunk_ids is placed first in the array, relevant chunks ALWAYS occupy index 0 and 1!
    // This mathematically forces MRR to be 1.0 and nDCG to be 1.0 regardless of actual retrieval model capability!
  });

  it('2. Sample Size Discrepancy Audit: Explains why reported D1 sample was n=400 instead of n=500', () => {
    const cases = JSON.parse(readFileSync(benchmarkPath, 'utf-8'));
    expect(cases.length).toBe(100);

    let totalSynthesizedCandidates = 0;
    for (const c of cases) {
      const candidates = [...c.ground_truth.relevant_chunk_ids, ...c.ground_truth.irrelevant_chunk_ids].slice(0, 5);
      totalSynthesizedCandidates += candidates.length;
    }

    // Each case had exactly 2 relevant chunks + 2 irrelevant chunks = 4 chunks
    // 4 chunks * 100 cases = EXACTLY 400 chunks!
    expect(totalSynthesizedCandidates).toBe(400);

    const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));
    expect(results.metrics.chunk_resolution_rate.sample_size).toBe(400);
    // Forensically proven: The 5th slot of Top-K=5 was completely empty in all 100 cases!
  });

  it('3. Mathematical Derivation Proof: Recomputes Precision@5 and Recall@5 algebraically', () => {
    const cases = JSON.parse(readFileSync(benchmarkPath, 'utf-8'));
    const topK = 5;

    let sumPrecision = 0;
    let sumRecall = 0;

    for (const c of cases) {
      const retrieved = [...c.ground_truth.relevant_chunk_ids, ...c.ground_truth.irrelevant_chunk_ids].slice(0, topK);
      const relevant = c.ground_truth.relevant_chunk_ids;

      const retrievedRelevant = retrieved.filter((id: string) => relevant.includes(id));
      const pAtK = retrievedRelevant.length / topK; // 2 / 5 = 0.40
      const rAtK = retrievedRelevant.length / relevant.length; // 2 / 2 = 1.00

      sumPrecision += pAtK;
      sumRecall += rAtK;
    }

    const avgPrecision = Math.round((sumPrecision / cases.length) * 100) / 100;
    const avgRecall = Math.round((sumRecall / cases.length) * 100) / 100;

    expect(avgPrecision).toBe(0.40);
    expect(avgRecall).toBe(1.00);

    // Forensically proven: Precision was 40% because 2 out of 5 slots were relevant,
    // and Recall was 100% because the artificial ground truth only had 2 items and both were prepended!
  });

  it('4. Structural vs Semantic Claim Attribution Audit: Detects heuristic attachment', () => {
    const analysis = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_audit_clm_01',
      channelTitle: 'SonicWall Advisory',
      messageId: 'msg_audit_01',
      rawText: 'Advisory: CVE-2024-40766 SonicWall SonicOS buffer overflow flaw. CVSS Base Score: 9.3.',
    });

    const report = analysis.report;
    const graph = buildClaimAttributionGraph({ report });

    // Structural graph verification
    expect(graph.edges.length).toBeGreaterThan(0);

    // Forensic check: Fact claims (CVSS score, CVE ID) have evidence_ids from rawText regex,
    // but knowledge_ids were heuristically tagged via string matching (e.g. 'cvss', 'epss').
    const cvssClaim = report.claims.find(c => c.statement.includes('CVSS Base Score'));
    expect(cvssClaim).toBeDefined();
    expect(cvssClaim?.evidence_ids.length).toBeGreaterThan(0);

    // Claim confidence is heuristic, not a calibrated Bayesian probability
    expect(cvssClaim?.confidence).toBe(0.95);
  });

  it('5. Provenance Cryptographic Tampering Audit: Any text modification invalidates hash', () => {
    const originalText = 'Authentic chunk text from The Art of Memory Forensics Chapter 4.';
    const validHash = computeChunkContentHash(originalText);

    // Tamper single character
    const tamperedText = 'Authentic chunk text from The Art of Memory Forensics Chapter 5.';
    const tamperedHash = computeChunkContentHash(tamperedText);

    expect(tamperedHash).not.toBe(validHash);
    expect(validHash).toBe('c6a91af1ace4690d0d3dd95b73131d39caf12ee5634375a7f4c95a3d2701f995');
  });

  it('6. Hidden Benchmark Evaluation: Evaluates unexposed cases without circular mock concatenation', () => {
    expect(existsSync(hiddenPath)).toBe(true);
    const hiddenCases = JSON.parse(readFileSync(hiddenPath, 'utf-8'));
    expect(hiddenCases.length).toBeGreaterThanOrEqual(6);

    // Test each hidden case through real pipeline
    for (const hc of hiddenCases) {
      const res = executeDeepIntelligenceAnalysisV2({
        sourceId: `eval_${hc.case_id}`,
        channelTitle: hc.issuing_authority,
        messageId: `msg_${hc.case_id}`,
        rawText: hc.raw_text,
      });

      expect(res.report).toBeDefined();
      expect(res.report.sections.length).toBe(10);
      expect(res.qualityGate).toBeDefined();

      // Check precondition enforcement on adversarial negative case (hid_case_06)
      if (hc.case_id === 'hid_case_06') {
        const usedChunks = res.report.knowledge_trace.filter(k => k.status === 'USED');
        // Pure host registry event without memory, binary, or network observables must NOT use deep forensic books
        const leakedForensics = usedChunks.some(u =>
          u.document_id.includes('amf') || u.document_id.includes('pma') || u.document_id.includes('nsm')
        );
        expect(leakedForensics).toBe(false);
      }
    }
  });
});
