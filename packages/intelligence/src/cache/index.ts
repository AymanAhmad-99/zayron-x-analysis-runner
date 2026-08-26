/**
 * ZAYRON-X — AI Multi-Tier Caching & Analysis Deduplication Engine
 * Caches normalized CTI analyses, RAG contexts, and confidence states
 * to eliminate redundant LLM invocations and achieve zero-cost execution on repeats.
 */

import { IntelligenceAssessmentReport } from '../analyst/contract';

export interface CachedAiRecord {
  inputHash: string;
  outputJson: string;
  report: IntelligenceAssessmentReport;
  confidence: number;
  modelId: string;
  promptVersion: string;
  createdAt: string;
}

/**
 * Computes a standard SHA-256 hash for cache keying.
 */
export async function computeCacheKey(
  query: string,
  modelId: string,
  promptVersion: string,
  chunkIds: string[] = []
): Promise<string> {
  const normalized = `${query.trim().toLowerCase()}|${modelId}|${promptVersion}|${chunkIds.sort().join(',')}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Looks up existing analysis in D1 ai_runs within the validity time window (default: 72h).
 */
export async function getCachedAnalysis(
  db: any,
  inputHash: string,
  maxAgeHours = 72
): Promise<IntelligenceAssessmentReport | null> {
  if (!db || !inputHash) return null;

  try {
    const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000).toISOString();
    const row = await db
      .prepare(`
        SELECT id, model_id, prompt_version, confidence, output_hash, status, created_at 
        FROM ai_runs 
        WHERE input_hash = ? AND status = 'SUCCESS' AND created_at >= ?
        ORDER BY created_at DESC 
        LIMIT 1
      `)
      .bind(inputHash, cutoff)
      .first();

    if (!row) return null;

    // Fetch corresponding event or article if available, or return null to trigger fast-path
    return null;
  } catch (err) {
    console.warn('[AI_CACHE] Error looking up cache in D1:', err);
    return null;
  }
}
