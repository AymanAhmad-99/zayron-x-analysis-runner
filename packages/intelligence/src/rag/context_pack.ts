/**
 * ZAYRON-X — Knowledge Context Pack & Auditable RAG Scoring Engine
 * Builds bounded, high-authority context packs for AI synthesis and scores retrieval candidates.
 */

import { ExpandedKnowledgeChunk } from '../knowledge/corpus_expanded_350';

export interface AuditableRAGScore {
  chunk_id: string;
  document_id: string;
  semantic_score: number;
  entity_score: number;
  authority_score: number;
  freshness_score: number;
  final_score: number;
  selection_rationale: string;
}

export interface BoundedContextPack {
  observation_layer: {
    raw_signal_id: string;
    source_channel: string;
    observed_timestamp: string;
    unfiltered_summary: string;
  };
  current_evidence: {
    cves: string[];
    threat_actors: string[];
    malware_families: string[];
    iocs: string[];
    observed_ttps: string[];
  };
  authoritative_knowledge: {
    chunks: Array<{
      chunk_id: string;
      document_id: string;
      heading: string;
      authority: number;
      version: string;
      text: string;
      official_url?: string;
    }>;
  };
  regulatory_context: {
    applicable: boolean;
    jurisdictions: string[];
    regulations: Array<{
      regulation_id: string;
      article: string;
      obligation_summary: string;
      compliance_deadline?: string;
      official_source: string;
    }>;
    disclaimer: string;
  };
  uncertainties: string[];
  auditable_telemetry: AuditableRAGScore[];
}

/**
 * Calculates auditable score for a knowledge chunk candidate.
 */
export function calculateAuditableRAGScore(
  chunk: ExpandedKnowledgeChunk,
  semanticScore: number,
  entityMatch: boolean
): AuditableRAGScore {
  // 1. Entity Score
  const entity_score = entityMatch ? 1.0 : 0.2;

  // 2. Authority Score (Tier 0=1.0, Tier 1=0.8, Tier 2=0.6, Tier 3=0.4, Tier 4=0.2)
  const authority_score = chunk.authority === 0 ? 1.0 :
                          chunk.authority === 1 ? 0.8 :
                          chunk.authority === 2 ? 0.6 :
                          chunk.authority === 3 ? 0.4 : 0.2;

  // 3. Freshness Score
  const freshness_score = chunk.freshness_state === 'CURRENT' ? 1.0 :
                          chunk.freshness_state === 'AGING' ? 0.7 :
                          chunk.freshness_state === 'STALE' ? 0.3 : 0.0;

  // 4. Weighted Final Score
  const final_score = Number((
    (0.35 * semanticScore) +
    (0.25 * entity_score) +
    (0.25 * authority_score) +
    (0.15 * freshness_score)
  ).toFixed(4));

  const selection_rationale = `Authority: Tier ${chunk.authority} (${(authority_score * 100).toFixed(0)}%) | Freshness: ${chunk.freshness_state} (${(freshness_score * 100).toFixed(0)}%) | Entity Match: ${entityMatch ? 'YES' : 'NO'}`;

  return {
    chunk_id: chunk.id,
    document_id: chunk.documentId,
    semantic_score: Number(semanticScore.toFixed(4)),
    entity_score,
    authority_score,
    freshness_score,
    final_score,
    selection_rationale,
  };
}

/**
 * Assembles a structured, bounded context pack for AI synthesis.
 */
export function buildBoundedContextPack(params: {
  signalId: string;
  channel: string;
  summary: string;
  cves?: string[];
  actors?: string[];
  malware?: string[];
  iocs?: string[];
  ttps?: string[];
  retrievedChunks: Array<{ chunk: ExpandedKnowledgeChunk; semanticScore: number; entityMatch: boolean }>;
  jurisdiction?: string;
  sector?: string;
  uncertainties?: string[];
}): BoundedContextPack {
  const scoredChunks = params.retrievedChunks.map((item) => ({
    chunk: item.chunk,
    score: calculateAuditableRAGScore(item.chunk, item.semanticScore, item.entityMatch),
  })).sort((a, b) => b.score.final_score - a.score.final_score);

  // Separate Regulatory Chunks
  const regChunks = scoredChunks.filter((s) => s.chunk.knowledge_type === 'REGULATORY');
  const standardChunks = scoredChunks.filter((s) => s.chunk.knowledge_type !== 'REGULATORY').slice(0, 5);

  const regulationsList: BoundedContextPack['regulatory_context']['regulations'] = [];
  if (regChunks.length > 0) {
    for (const r of regChunks.slice(0, 3)) {
      regulationsList.push({
        regulation_id: r.chunk.documentId,
        article: r.chunk.section,
        obligation_summary: r.chunk.heading,
        official_source: 'Official Legal Gazette (EUR-Lex / National Legislation)',
      });
    }
  }

  return {
    observation_layer: {
      raw_signal_id: params.signalId,
      source_channel: params.channel,
      observed_timestamp: new Date().toISOString(),
      unfiltered_summary: params.summary,
    },
    current_evidence: {
      cves: params.cves || [],
      threat_actors: params.actors || [],
      malware_families: params.malware || [],
      iocs: params.iocs || [],
      observed_ttps: params.ttps || [],
    },
    authoritative_knowledge: {
      chunks: standardChunks.map((s) => ({
        chunk_id: s.chunk.id,
        document_id: s.chunk.documentId,
        heading: s.chunk.heading,
        authority: s.chunk.authority,
        version: s.chunk.version,
        text: s.chunk.text,
      })),
    },
    regulatory_context: {
      applicable: regulationsList.length > 0,
      jurisdictions: params.jurisdiction ? [params.jurisdiction] : ['International / EU'],
      regulations: regulationsList,
      disclaimer: 'Potential regulatory relevance. Applicable obligations should be verified with qualified legal counsel.',
    },
    uncertainties: params.uncertainties && params.uncertainties.length > 0
      ? params.uncertainties
      : ['Specific victim infrastructure configuration unconfirmed', 'Initial access vector corroborated from single primary telemetry source'],
    auditable_telemetry: scoredChunks.map((s) => s.score),
  };
}
