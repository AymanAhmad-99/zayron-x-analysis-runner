/**
 * ZAYRON-X — Knowledge Center Query & Hybrid Search Engine
 * Provides structured entity filtering, exact keyword matching, and RAG retrieval.
 */

import { MASTER_KNOWLEDGE_ENTITIES_115, KnowledgeEntity } from './master_manifest';

export interface KnowledgeFilterOptions {
  document_type?: string;
  topic?: string;
  authority_tier?: number;
  jurisdiction?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface KnowledgeSearchResult {
  entity: KnowledgeEntity;
  relevanceScore: number;
  matchType: 'EXACT_ID' | 'KEYWORD' | 'SEMANTIC';
}

/**
 * Filters knowledge entities by structured metadata attributes.
 */
export function filterKnowledgeEntities(
  options: KnowledgeFilterOptions = {},
  entities: KnowledgeEntity[] = MASTER_KNOWLEDGE_ENTITIES_115
): { data: KnowledgeEntity[]; total: number } {
  let filtered = [...entities];

  if (options.document_type) {
    const dt = options.document_type.toLowerCase();
    filtered = filtered.filter((e) => e.document_type.toLowerCase() === dt);
  }

  if (options.topic) {
    const t = options.topic.toLowerCase();
    filtered = filtered.filter((e) => e.topic.toLowerCase().includes(t) || e.tags.some((tag) => tag.toLowerCase().includes(t)));
  }

  if (options.authority_tier !== undefined && options.authority_tier !== null) {
    filtered = filtered.filter((e) => e.authority_tier === Number(options.authority_tier));
  }

  if (options.jurisdiction) {
    const j = options.jurisdiction.toLowerCase();
    filtered = filtered.filter((e) => e.jurisdiction?.toLowerCase().includes(j));
  }

  if (options.status) {
    const st = options.status.toUpperCase();
    filtered = filtered.filter((e) => e.status === st);
  }

  const total = filtered.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  const data = filtered.slice(offset, offset + limit);

  return { data, total };
}

/**
 * Retrieves a single knowledge entity by canonical ID.
 */
export function getKnowledgeById(
  id: string,
  entities: KnowledgeEntity[] = MASTER_KNOWLEDGE_ENTITIES_115
): KnowledgeEntity | null {
  const cleanId = id.trim().toLowerCase();
  return entities.find((e) => e.id.toLowerCase() === cleanId) || null;
}

/**
 * Executes hybrid exact + keyword search over the Knowledge Center corpus.
 */
export function searchKnowledgeCorpus(
  query: string,
  entities: KnowledgeEntity[] = MASTER_KNOWLEDGE_ENTITIES_115
): KnowledgeSearchResult[] {
  if (!query || query.trim().length === 0) {
    return entities.slice(0, 20).map((e) => ({
      entity: e,
      relevanceScore: 1.0,
      matchType: 'KEYWORD',
    }));
  }

  const cleanQuery = query.toLowerCase().trim();
  const tokens = cleanQuery.split(/\s+/).filter((t) => t.length > 1);
  const results: KnowledgeSearchResult[] = [];

  for (const entity of entities) {
    let score = 0;
    let matchType: 'EXACT_ID' | 'KEYWORD' | 'SEMANTIC' = 'KEYWORD';

    // 1. Exact ID Match
    if (entity.id.toLowerCase() === cleanQuery || entity.id.toLowerCase().includes(cleanQuery)) {
      score += 100;
      matchType = 'EXACT_ID';
    }

    // 2. Title Match
    if (entity.title.toLowerCase().includes(cleanQuery)) {
      score += 50;
    } else {
      for (const t of tokens) {
        if (entity.title.toLowerCase().includes(t)) score += 15;
      }
    }

    // 3. Topic & Tags Match
    if (entity.topic.toLowerCase().includes(cleanQuery)) score += 30;
    for (const tag of entity.tags) {
      if (tag.toLowerCase() === cleanQuery) score += 25;
      else if (tag.toLowerCase().includes(cleanQuery)) score += 10;
    }

    // 4. Summary & What It Covers Match
    for (const t of tokens) {
      if (entity.summary.toLowerCase().includes(t)) score += 5;
      if (entity.what_it_covers.toLowerCase().includes(t)) score += 5;
    }

    // 5. Authority Tier Prioritization (Tier 0 & 1 rank higher)
    if (entity.authority_tier === 0) score += 10;
    else if (entity.authority_tier === 1) score += 5;

    if (score > 0) {
      results.push({
        entity,
        relevanceScore: score,
        matchType,
      });
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
