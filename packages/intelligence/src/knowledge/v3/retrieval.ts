export interface V3Candidate {
  object_id: string;
  document_id: string;
  section: string;
  page_start: number | null;
  page_end: number | null;
  knowledge_type: string;
  canonical_text: string;
  content_hash: string;
  vector_score?: number;
  lexical_rank?: number;
  lexical_score?: number;
  rrf_score?: number;
  rerank_score?: number | null;
  final_rank?: number;
}

export function reciprocalRankFusion(
  semantic: V3Candidate[],
  lexical: V3Candidate[],
  k = 60,
  topK = 5
): V3Candidate[] {
  const map = new Map<string, V3Candidate>();
  for (const [i, c] of semantic.entries()) {
    map.set(c.object_id, { ...c, rrf_score: (c.rrf_score || 0) + 1 / (k + i + 1) });
  }
  for (const [i, c] of lexical.entries()) {
    const old = map.get(c.object_id);
    map.set(c.object_id, {
      ...(old || c),
      ...(!old ? c : {}),
      lexical_rank: i + 1,
      lexical_score: c.lexical_score,
      rrf_score: (old?.rrf_score || 0) + 1 / (k + i + 1),
    });
  }
  return [...map.values()]
    .sort((a, b) => (b.rrf_score || 0) - (a.rrf_score || 0) || a.object_id.localeCompare(b.object_id))
    .slice(0, topK)
    .map((x, i) => ({ ...x, final_rank: i + 1, rerank_score: null }));
}

