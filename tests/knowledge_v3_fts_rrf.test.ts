import { describe, expect, it } from 'bun:test';
import { reciprocalRankFusion, type V3Candidate } from '../packages/intelligence/src/knowledge/v3/retrieval';

describe('Knowledge v3 Reciprocal Rank Fusion (RRF)', () => {
  const makeCandidate = (id: string, text: string): V3Candidate => ({
    object_id: id,
    document_id: 'doc-01-heuer-psychology',
    section: 'Document',
    page_start: null,
    page_end: null,
    knowledge_type: 'METHOD',
    canonical_text: text,
    content_hash: 'hash-' + id,
  });

  it('computes exact RRF scores with k=60', () => {
    const a = makeCandidate('ko:a', 'canonical text A');
    const b = makeCandidate('ko:b', 'canonical text B');

    // a is #1 in semantic, #2 in lexical
    // b is #2 in semantic, #1 in lexical
    const semantic = [
      { ...a, vector_score: 0.85 },
      { ...b, vector_score: 0.75 },
    ];
    const lexical = [
      { ...b, lexical_score: 12.5 },
      { ...a, lexical_score: 8.2 },
    ];

    const fused = reciprocalRankFusion(semantic, lexical, 60, 5);

    // Expected scores:
    // a: 1/(60+1) + 1/(60+2) = 1/61 + 1/62 = 0.01639344 + 0.01612903 = 0.03252247
    // b: 1/(60+2) + 1/(60+1) = 1/62 + 1/61 = 0.03252247
    // Equal score -> tie-breaker by object_id: 'ko:a' < 'ko:b'
    expect(fused.length).toBe(2);
    expect(fused[0].object_id).toBe('ko:a');
    expect(fused[1].object_id).toBe('ko:b');
    expect(fused[0].final_rank).toBe(1);
    expect(fused[1].final_rank).toBe(2);
    expect(fused[0].rrf_score).toBeCloseTo(0.032522, 5);
  });

  it('boosts candidates appearing in both modalities over single-modality candidates', () => {
    const a = makeCandidate('ko:both', 'analysis of competing hypotheses');
    const b = makeCandidate('ko:dense_only', 'competing alternatives');
    const c = makeCandidate('ko:lex_only', 'hypotheses testing');

    const semantic = [
      { ...b, vector_score: 0.90 }, // rank 1 dense
      { ...a, vector_score: 0.80 }, // rank 2 dense
    ];
    const lexical = [
      { ...c, lexical_score: 15.0 }, // rank 1 lexical
      { ...a, lexical_score: 10.0 }, // rank 2 lexical
    ];

    const fused = reciprocalRankFusion(semantic, lexical, 60, 5);

    // a score: 1/(60+2) + 1/(60+2) = 2/62 ≈ 0.032258
    // b score: 1/(60+1) = 1/61 ≈ 0.016393
    // c score: 1/(60+1) = 1/61 ≈ 0.016393
    // Candidate 'a' should win top rank because it was corroborated by BOTH modalities
    expect(fused[0].object_id).toBe('ko:both');
    expect(fused[0].final_rank).toBe(1);
    expect(fused[0].rrf_score).toBeGreaterThan(fused[1].rrf_score!);
  });

  it('handles candidate present only in dense retrieval', () => {
    const a = makeCandidate('ko:dense', 'dense concept');
    const fused = reciprocalRankFusion([{ ...a, vector_score: 0.7 }], [], 60, 5);
    expect(fused.length).toBe(1);
    expect(fused[0].object_id).toBe('ko:dense');
    expect(fused[0].rrf_score).toBeCloseTo(1 / 61, 5);
  });

  it('handles candidate present only in lexical retrieval', () => {
    const a = makeCandidate('ko:lexical', 'lexical keyword');
    const fused = reciprocalRankFusion([], [{ ...a, lexical_score: 5.0 }], 60, 5);
    expect(fused.length).toBe(1);
    expect(fused[0].object_id).toBe('ko:lexical');
    expect(fused[0].rrf_score).toBeCloseTo(1 / 61, 5);
  });
});
