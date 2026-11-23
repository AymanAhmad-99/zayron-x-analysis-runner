/**
 * ZAYRON-X — REAL KNOWLEDGE RETRIEVAL SHADOW ENGINE (V2 HARDENED)
 * Two-stage authentic Vectorize retrieval + D1 chunk resolution + cryptographic provenance + state machine
 */

import { createHash } from 'crypto';
import { AnalyticalDomainV2, KnowledgeTraceItemV2 } from './types';
import { KNOWLEDGE_CHUNKS_CORPUS } from '../knowledge/corpus';

export interface CachedChunk {
  id: string;
  document_id: string;
  document_title: string;
  section: string;
  page?: number;
  text: string;
  authority_tier: number;
  source_id: string;
  source_url?: string;
}

const CHUNK_CACHE = new Map<string, CachedChunk>();
const MAX_CACHE_SIZE = 2000;

function getCachedChunk(id: string): CachedChunk | undefined {
  return CHUNK_CACHE.get(id);
}

function setCachedChunk(id: string, chunk: CachedChunk) {
  CHUNK_CACHE.set(id, chunk);
}

export function clearChunkCache(): void {
  CHUNK_CACHE.clear();
}



const CANONICAL_CORPUS_MAP = new Map<string, CachedChunk>();
for (const c of KNOWLEDGE_CHUNKS_CORPUS) {
  CANONICAL_CORPUS_MAP.set(c.id, {
    id: c.id,
    document_id: c.documentId,
    document_title: c.section,
    section: c.section,
    page: c.page,
    text: c.text,
    authority_tier: c.authorityTier,
    source_id: 'canonical_corpus_v1',
  });
}

export interface VectorizeEnv {
  AI?: any;
  VECTORIZE?: any;
  DB?: any;
}

export interface ShadowRetrievalParams {
  query: string;
  rawText: string;
  cves?: string[];
  malware?: string[];
  indicators?: Array<{ type: string; value: string }>;
  topK?: number;
  metadataFilter?: Record<string, any>;
  env: VectorizeEnv;
  queryId?: string;
  retrievalId?: string;
}

export interface ProvenanceMetadata {
  query_id: string;
  retrieval_id: string;
  query_text: string;
  embedding_model: string;
  embedding_dimensions: number;
  pooling_method: string;
  vectorize_index: string;
  top_k: number;
  vector_id: string;
  similarity_score: number;
  chunk_id: string;
  document_id: string;
  document_title: string;
  section: string;
  page?: number;
  knowledge_type: string;
  authority_tier: number;
  source: string;
  source_url?: string;
  chunk_text: string;
  content_hash: string;
  ingestion_version: string;
  embedding_version: string;
}

export interface StateTransitionRecord {
  from_state: string;
  to_state: string;
  timestamp: string;
  trigger: string;
  reason: string;
}

export interface ResolvedChunkItem {
  provenance: ProvenanceMetadata;
  vector_id: string;
  chunk_id: string;
  document_id: string;
  section: string;
  page?: number;
  similarity_score: number;
  authority_tier: number;
  text: string;
  content_hash: string;
  resolution_status: 'RESOLVED' | 'INCOMPLETE';
  resolution_source: 'D1' | 'CACHE' | 'CANONICAL_CORPUS' | 'METADATA' | 'FAILED';
  d1_rate_limited?: boolean;
  preconditions_met: boolean;
  preconditions_passed: string[];
  failed_preconditions: string[];
  gate_reason?: string;
  usage_status: 'RETRIEVED' | 'CONSIDERED' | 'USED';
  used_reason?: string;
  rejection_reason?: string;
  context_id?: string;
  claim_ids?: string[];
  report_section_ids?: string[];
  state_transitions: StateTransitionRecord[];
  section_influenced?: string[];
  claim_influenced?: string[];
}

export interface ShadowResolutionMetrics {
  chunks_requested: number;
  cache_hits: number;
  canonical_hits: number;
  d1_attempted: number;
  d1_resolved: number;
  metadata_resolved: number;
  failed: number;
  d1_rate_limited: boolean;
  d1_error?: string;
  f9_failure_count: number;
}

export interface ShadowRetrievalResult {
  query_id: string;
  retrieval_id: string;
  query: string;
  query_vector_preview: number[];
  vector_dimensions: number;
  vectorize_index: string;
  top_k_requested: number;
  returned_vector_ids: string[];
  similarity_scores: number[];
  matched_chunk_ids: string[];
  resolved_chunks: ResolvedChunkItem[];
  selected_chunks: ResolvedChunkItem[];
  reasoning_context_snippet: string;
  execution_mode: 'AUTHENTIC_VECTORIZE_D1' | 'FALLBACK_D1_ONLY' | 'UNAVAILABLE';
  resolution_metrics?: ShadowResolutionMetrics;
  error?: string;
}

/**
 * Computes deterministic SHA-256 content hash directly from verbatim chunk text.
 */
export function computeChunkContentHash(text: string): string {
  if (!text || text.length === 0) return 'EMPTY_CHUNK_HASH';
  return createHash('sha256').update(text.trim()).digest('hex');
}

/**
 * Evaluates domain telemetry preconditions with machine-readable trace of passed/failed gates.
 */
function evaluateChunkPreconditions(
  documentId: string,
  rawTelemetryText: string
): { met: boolean; passed: string[]; failed: string[]; reason?: string } {
  const passed: string[] = [];
  const failed: string[] = [];
  const docLower = documentId.toLowerCase();

  // 1. The Art of Memory Forensics (AMF)
  if (docLower === 'doc_ref_04_amf' || docLower.includes('amf') || docLower.includes('memory forensics') || docLower.includes('800-86')) {
    const hasMemEvidence = /\b(memory dump|volatility|vad|in-memory|process hollowing|reflective dll|raw ram|lsass dump)\b/i.test(rawTelemetryText);
    if (hasMemEvidence) {
      passed.push('MEMORY_TELEMETRY_OBSERVED');
    } else {
      failed.push('LACKS_VOLATILE_MEMORY_OR_PROCESS_DUMP');
      return { met: false, passed, failed, reason: 'Lacks required memory dump or live process telemetry.' };
    }
  }

  // 2. Practical Malware Analysis (PMA)
  if (docLower === 'doc_ref_02_pma' || docLower.includes('pma') || docLower.includes('malware analysis')) {
    const hasMalwareEvidence = /\b(pe header|iat|disassembly|x86|x64|binary payload|imphash|unpacking|dynamic analysis|malware|trojan|ransomware|stealer)\b/i.test(rawTelemetryText);
    if (hasMalwareEvidence) {
      passed.push('MALWARE_BINARY_TELEMETRY_OBSERVED');
    } else {
      failed.push('LACKS_BINARY_SAMPLE_OR_DISASSEMBLY');
      return { met: false, passed, failed, reason: 'Lacks required binary sample, disassembly, or malware execution telemetry.' };
    }
  }

  // 3. Network Security Monitoring (NSM)
  if (docLower === 'doc_ref_03_nsm' || docLower === 'doc_ref_03_pnsm' || docLower.includes('nsm') || docLower.includes('network security monitoring') || docLower.includes('800-150')) {
    const hasNetworkEvidence = /\b(pcap|wireshark|zeek|suricata|netflow|tcpdump|tls handshake|packet capture|bro|c2 ip|c2 beacon|network connection|dns query)\b/i.test(rawTelemetryText) ||
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/.test(rawTelemetryText);
    if (hasNetworkEvidence) {
      passed.push('NETWORK_FLOW_OR_INDICATOR_OBSERVED');
    } else {
      failed.push('LACKS_NETWORK_PCAP_OR_IP_INDICATORS');
      return { met: false, passed, failed, reason: 'Lacks required PCAP or network telemetry.' };
    }
  }

  // 4. Vulnerability Management Standards (NVD, CVSS, CISA KEV, EPSS)
  if (documentId.includes('cvss') || documentId.includes('cisa') || documentId.includes('kev') || documentId.includes('epss') || documentId.includes('nvd')) {
    const hasCveOrVuln = /\b(cve-\d{4}-\d{4,7}|vulnerability|flaw|cvss|exploitability|security advisory)\b/i.test(rawTelemetryText);
    if (hasCveOrVuln) {
      passed.push('VULNERABILITY_CONTEXT_OBSERVED');
    } else {
      failed.push('LACKS_VULNERABILITY_IDENTIFIER_OR_FLAW_CONTEXT');
      return { met: false, passed, failed, reason: 'Lacks required vulnerability context or CVE identifier.' };
    }
  }

  passed.push('GENERAL_RELEVANCE_ACCEPTED');
  return { met: true, passed, failed };
}

/**
 * Executes authentic Vectorize search and resolves full chunk content from D1
 * with cryptographically verifiable provenance and machine-auditable state machine.
 */
export async function executeShadowVectorizeRetrieval(
  params: ShadowRetrievalParams
): Promise<ShadowRetrievalResult> {
  const { query, rawText, topK = 5, env } = params;
  const top_k_requested = topK;
  const vectorize_index = 'zayron-knowledge-index';
  const query_id = params.queryId || `qry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const retrieval_id = params.retrievalId || `ret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = new Date().toISOString();

  if (!env.VECTORIZE || !env.AI) {
    return {
      query_id,
      retrieval_id,
      query,
      query_vector_preview: [],
      vector_dimensions: 0,
      vectorize_index,
      top_k_requested,
      returned_vector_ids: [],
      similarity_scores: [],
      matched_chunk_ids: [],
      resolved_chunks: [],
      selected_chunks: [],
      reasoning_context_snippet: '',
      execution_mode: 'UNAVAILABLE',
      error: 'Workers AI or Vectorize binding unavailable in current environment.',
    };
  }

  try {
    // 1. Generate 768d query embedding using Cloudflare Workers AI
    const embedRes = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
    const queryVector: number[] = embedRes?.data?.[0];

    if (!queryVector || !Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('Failed to generate 768d query embedding from Workers AI.');
    }

    const vector_dimensions = queryVector.length;
    const query_vector_preview = queryVector.slice(0, 8);

    // 2. Query Cloudflare Vectorize Index
    const vecMatches = await env.VECTORIZE.query(queryVector, {
      topK: top_k_requested * 2, // Overfetch for precondition filtering
      returnMetadata: 'all',
      ...(params.metadataFilter ? { filter: params.metadataFilter } : {}),
    });

    const matches = vecMatches?.matches || [];
    const returned_vector_ids = matches.map((m: any) => m.id);
    const similarity_scores = matches.map((m: any) => Math.round((m.score || 0) * 1000) / 1000);
    const matched_chunk_ids = matches.map((m: any) => m.metadata?.chunk_id || m.id.replace(/^vec_/, ''));

    // 3. Resolve Full Chunk Content (LRU Cache -> D1 Direct -> Canonical Corpus -> Metadata)
    const resolved_chunks: ResolvedChunkItem[] = [];
    const resolution_metrics: ShadowResolutionMetrics = {
      chunks_requested: matches.length,
      cache_hits: 0,
      canonical_hits: 0,
      d1_attempted: 0,
      d1_resolved: 0,
      metadata_resolved: 0,
      failed: 0,
      d1_rate_limited: false,
      d1_error: undefined,
      f9_failure_count: 0,
    };

    // Shadow retrieval resolves chunk text through real D1 (batched IN query) with
    // canonical-corpus fallback. D1 is the live knowledge store; rate-limit errors are
    // caught, surfaced (F9), and resolution degrades to CANONICAL_CORPUS.
    const d1Map = new Map<string, any>();
    if (env.DB && matched_chunk_ids.length > 0) {
      const uniqueIds = Array.from(new Set(matched_chunk_ids));
      try {
        resolution_metrics.d1_attempted = uniqueIds.length;
        const placeholders = uniqueIds.map(() => '?').join(', ');
        const stmt = env.DB.prepare(
          `SELECT id, document_id, section, page, text, authority_tier, source_id FROM knowledge_chunks WHERE id IN (${placeholders})`
        );
        const queryResult = await stmt.bind(...uniqueIds).all();
        for (const row of (queryResult?.results || []) as any[]) {
          if (row && row.id) d1Map.set(String(row.id), row);
        }
      } catch (d1Err: any) {
        // F9 event: D1 failure must be explicit, never silent. Resolution continues
        // through fallbacks so retrieval remains useful during rate-limit windows.
        resolution_metrics.d1_rate_limited = true;
        resolution_metrics.d1_error = String(d1Err?.message || d1Err || 'D1 resolution failed');
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const vId = m.id;
      const cId = m.metadata?.chunk_id || vId.replace(/^vec_/, '');
      const meta = m.metadata || {};

      let resolvedDocId = meta.document_id || 'UNKNOWN_DOC';
      let resolvedDocTitle = meta.document_title || resolvedDocId;
      let resolvedSection = meta.section || 'General Reference';
      let resolvedPage = meta.page ? Number(meta.page) : undefined;
      let resolvedAuthTier = Number(meta.authority_tier || 1);
      let resolvedSourceUrl = meta.source_url || undefined;
      let resolvedSourceId = meta.source_id || 'corpus_v1';
      let text = '';
      let resolution_status: 'RESOLVED' | 'INCOMPLETE' = 'INCOMPLETE';
      let resolution_source: 'D1' | 'CACHE' | 'CANONICAL_CORPUS' | 'METADATA' | 'FAILED' = 'FAILED';

      const canonical = CANONICAL_CORPUS_MAP.get(cId);
      // Fail-closed guarantee: when D1 is reachable and returns NO rows for the batch,
      // unregistered chunks stay INCOMPLETE — fallback must not silently paper over a
      // D1 whose contents diverge from the canonical corpus. A D1 rate-limit/error is
      // different: resolution degrades to canonical corpus explicitly (F9 surfaced).
      const d1ServedEmpty = !resolution_metrics.d1_rate_limited
        && resolution_metrics.d1_attempted > 0 && d1Map.size === 0;
      const d1Row = d1Map.get(cId);

      if (d1Row && d1Row.text && d1Row.text.trim().length > 0) {
        text = d1Row.text.trim();
        resolvedDocId = d1Row.document_id || resolvedDocId;
        resolvedDocTitle = d1Row.section || resolvedDocTitle;
        resolvedSection = d1Row.section || resolvedSection;
        resolvedPage = d1Row.page !== null && d1Row.page !== undefined ? Number(d1Row.page) : resolvedPage;
        resolvedAuthTier = d1Row.authority_tier !== undefined ? Number(d1Row.authority_tier) : resolvedAuthTier;
        resolvedSourceId = d1Row.source_id || resolvedSourceId;
        resolution_status = 'RESOLVED';
        resolution_source = 'D1';
        resolution_metrics.d1_resolved++;
      } else if (!d1ServedEmpty && canonical && canonical.text && canonical.text.trim().length > 0) {
        text = canonical.text.trim();
        resolvedDocId = canonical.document_id || resolvedDocId;
        resolvedDocTitle = canonical.document_title || resolvedDocTitle;
        resolvedSection = canonical.section || resolvedSection;
        resolvedPage = canonical.page !== undefined ? canonical.page : resolvedPage;
        resolvedAuthTier = canonical.authority_tier;
        resolvedSourceId = canonical.source_id;
        resolution_status = 'RESOLVED';
        resolution_source = 'CANONICAL_CORPUS';
        resolution_metrics.canonical_hits++;
      } else if (meta.text && meta.text.trim().length > 0) {
        text = meta.text.trim();
        resolution_status = 'RESOLVED';
        resolution_source = 'METADATA';
        resolution_metrics.metadata_resolved++;
      } else {
        resolution_status = 'INCOMPLETE';
        resolution_source = 'FAILED';
        resolution_metrics.failed++;
        resolution_metrics.f9_failure_count++;
      }

      const score = similarity_scores[i];
      const content_hash = computeChunkContentHash(text);

      // State Machine Record
      const state_transitions: StateTransitionRecord[] = [
        {
          from_state: 'INDEXED',
          to_state: 'RETRIEVED',
          timestamp,
          trigger: 'VECTORIZE_SIMILARITY_MATCH',
          reason: `Vector match returned with cosine similarity score ${score}`,
        }
      ];

      // Precondition Evaluation
      const precond = evaluateChunkPreconditions(resolvedDocId, rawText);

      state_transitions.push({
        from_state: 'RETRIEVED',
        to_state: 'CONSIDERED',
        timestamp,
        trigger: 'PRECONDITION_EVALUATION',
        reason: precond.met
          ? `Telemetry satisfied preconditions: [${precond.passed.join(', ')}]`
          : `Telemetry failed preconditions: [${precond.failed.join(', ')}]. ${precond.reason || ''}`,
      });

      let usage_status: 'RETRIEVED' | 'CONSIDERED' | 'USED' = 'CONSIDERED';
      let used_reason: string | undefined = undefined;
      let rejection_reason: string | undefined = undefined;
      const context_id = `ctx_${retrieval_id}_${cId}`;
      const claim_ids = [`clm_${cId.slice(0, 8)}`];
      const report_section_ids = ['03', '04'];

      // 1. Minimum Cosine Similarity Threshold
      const MIN_SIMILARITY_THRESHOLD = 0.65;

      // 2. Entity Relevance Sanity Check beyond raw cosine similarity
      const extractedCves = (params.cves && params.cves.length > 0)
        ? params.cves.map(c => c.toUpperCase())
        : (rawText.match(/\b(CVE-\d{4}-\d{4,7})\b/gi) || []).map(c => c.toUpperCase());

      const pkgMatch = rawText.match(/(?:A flaw was found in|flaw in|vulnerability in|package)\s+([a-zA-Z0-9_\-\.\/]+)/i);
      const affectedProduct = pkgMatch ? pkgMatch[1].replace(/[\.,]$/, '').toLowerCase() : null;

      const chunkCveMatches = (text.match(/\b(CVE-\d{4}-\d{4,7})\b/gi) || []).map(c => c.toUpperCase());
      const isEntityCatalogRecord = resolvedDocId.includes('cisa-kev') || resolvedDocId.includes('doc-cisa-kev') || cId.includes('cisa-kev') || (chunkCveMatches.length > 0 && text.trim().startsWith('{'));

      let entityRelevancePassed = true;
      let entityRelevanceReason: string | undefined = undefined;

      if (isEntityCatalogRecord && extractedCves.length > 0) {
        const hasSharedCve = chunkCveMatches.some(c => extractedCves.includes(c));
        const textLower = text.toLowerCase();
        const hasSharedProduct = affectedProduct && affectedProduct.length > 2 && textLower.includes(affectedProduct);

        if (!hasSharedCve && !hasSharedProduct) {
          entityRelevancePassed = false;
          entityRelevanceReason = 'no shared CVE/product identifier despite semantic similarity';
        }
      }

      // 3. Malware / Threat Actor Entity Relevance Check
      const malwareEntityMatch = text.match(/\[([^\]]+)\]\(https:\/\/attack\.mitre\.org\/(?:software|groups)\/([S|G]\d+)\)/i);
      if (malwareEntityMatch && entityRelevancePassed) {
        const chunkEntityName = malwareEntityMatch[1].toLowerCase().replace(/\s+/g, '');
        const rawMalwareMentions = (params.malware && params.malware.length > 0)
          ? params.malware.map(m => m.toLowerCase().replace(/\s+/g, ''))
          : (rawText.match(/\b(lumma\s*stealer|lumma|redline|agent\s*tesla|icedid|qakbot|cobalt\s*strike|darkgate|asyncrat|amadey|badhatch|lockbit|blackcat)\b/gi) || [])
              .map(m => m.toLowerCase().replace(/\s+/g, ''));

        if (rawMalwareMentions.length > 0) {
          const hasSharedMalware = rawMalwareMentions.some(m =>
            chunkEntityName.includes(m) || m.includes(chunkEntityName)
          );
          if (!hasSharedMalware) {
            entityRelevancePassed = false;
            entityRelevanceReason = `no shared malware/entity identifier despite semantic similarity (chunk describes ${malwareEntityMatch[1]} [${malwareEntityMatch[2]}])`;
          }
        }
      }

      if (resolution_status === 'RESOLVED') {
        if (score < MIN_SIMILARITY_THRESHOLD) {
          rejection_reason = `Cosine similarity score ${score} below minimum threshold ${MIN_SIMILARITY_THRESHOLD}`;
        } else if (!entityRelevancePassed) {
          rejection_reason = entityRelevanceReason;
        } else if (precond.met) {
          usage_status = 'USED';
          used_reason = `Directly supports technical analysis and threat context with verified methodology from ${resolvedDocTitle}.`;
          state_transitions.push({
            from_state: 'CONSIDERED',
            to_state: 'USED',
            timestamp,
            trigger: 'REASONING_CONTEXT_INCLUSION',
            reason: used_reason,
          });
        } else {
          rejection_reason = precond.reason;
        }
      } else {
        rejection_reason = resolution_metrics.d1_rate_limited
          ? 'Chunk text could not be resolved due to D1 row read limit (F9 event); marked INCOMPLETE.'
          : 'Chunk text could not be resolved from any tier; marked INCOMPLETE.';
      }

      const provenance: ProvenanceMetadata = {
        query_id,
        retrieval_id,
        query_text: query,
        embedding_model: '@cf/baai/bge-base-en-v1.5',
        embedding_dimensions: vector_dimensions,
        pooling_method: 'mean',
        vectorize_index,
        top_k: top_k_requested,
        vector_id: vId,
        similarity_score: score,
        chunk_id: cId,
        document_id: resolvedDocId,
        document_title: resolvedDocTitle,
        section: resolvedSection,
        page: resolvedPage,
        knowledge_type: 'METHODOLOGY_REFERENCE',
        authority_tier: resolvedAuthTier,
        source: resolvedSourceId,
        source_url: resolvedSourceUrl,
        chunk_text: text,
        content_hash,
        ingestion_version: 'v1',
        embedding_version: 'v1',
      };

      resolved_chunks.push({
        provenance,
        vector_id: vId,
        chunk_id: cId,
        document_id: resolvedDocId,
        section: resolvedSection,
        page: resolvedPage,
        similarity_score: score,
        authority_tier: resolvedAuthTier,
        text,
        content_hash,
        resolution_status,
        resolution_source,
        d1_rate_limited: resolution_metrics.d1_rate_limited,
        preconditions_met: precond.met,
        preconditions_passed: precond.passed,
        failed_preconditions: precond.failed,
        gate_reason: precond.reason,
        usage_status,
        used_reason,
        rejection_reason,
        context_id: usage_status === 'USED' ? context_id : undefined,
        claim_ids: usage_status === 'USED' ? claim_ids : undefined,
        report_section_ids: usage_status === 'USED' ? report_section_ids : undefined,
        state_transitions,
        section_influenced: usage_status === 'USED' ? ['03 — TECHNICAL ANALYSIS', '04 — THREAT & EXPLOITATION CONTEXT'] : [],
        claim_influenced: usage_status === 'USED' ? ['Technical vulnerability mechanics and threat assessment'] : [],
      });
    }

    // 4. Select Chunks for Reasoning Context (Strictly USED status only)
    const selected_chunks = resolved_chunks
      .filter(c => c.usage_status === 'USED' && c.resolution_status === 'RESOLVED')
      .slice(0, top_k_requested);

    const contextLines: string[] = [];
    for (const sc of selected_chunks) {
      contextLines.push(
        `[KNOWLEDGE SOURCE: ${sc.document_id} | SECTION: ${sc.section} | SHA256: ${sc.content_hash.slice(0, 16)} | SIMILARITY: ${sc.similarity_score}]\n${sc.text.slice(0, 1000)}`
      );
    }
    const reasoning_context_snippet = contextLines.join('\n\n---\n\n');

    return {
      query_id,
      retrieval_id,
      query,
      query_vector_preview,
      vector_dimensions,
      vectorize_index,
      top_k_requested,
      returned_vector_ids,
      similarity_scores,
      matched_chunk_ids,
      resolved_chunks,
      selected_chunks,
      reasoning_context_snippet,
      execution_mode: 'AUTHENTIC_VECTORIZE_D1',
      resolution_metrics,
    };
  } catch (err: any) {
    return {
      query_id,
      retrieval_id,
      query,
      query_vector_preview: [],
      vector_dimensions: 0,
      vectorize_index,
      top_k_requested,
      returned_vector_ids: [],
      similarity_scores: [],
      matched_chunk_ids: [],
      resolved_chunks: [],
      selected_chunks: [],
      reasoning_context_snippet: '',
      execution_mode: 'UNAVAILABLE',
      error: err.message,
    };
  }
}

/**
 * Converts resolved chunks into Canonical KnowledgeTraceItemV2 objects with full state provenance.
 */
export function formatKnowledgeTracesFromShadowChunks(
  chunks: ResolvedChunkItem[]
): KnowledgeTraceItemV2[] {
  return chunks.map(c => ({
    document_id: c.document_id,
    chunk_id: c.chunk_id,
    title: c.section,
    domain: 'VULNERABILITY_ANALYSIS' as any,
    retrieval_score: c.similarity_score,
    retrieval_method: 'DOMAIN_PRECONDITION_SEMANTIC',
    reason_retrieved: `Vectorize semantic retrieval (cosine similarity: ${c.similarity_score}, hash: ${c.content_hash.slice(0, 12)})`,
    section_influenced: c.section_influenced || [],
    claim_influenced: c.claim_influenced || [],
    status: c.usage_status === 'USED' ? 'USED' : 'CONSIDERED_NOT_USED',
    rejection_reason: c.gate_reason || c.rejection_reason,
  }));
}
