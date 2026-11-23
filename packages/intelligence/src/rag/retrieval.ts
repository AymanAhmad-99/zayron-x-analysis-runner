import {
  extractCves,
  extractIpv4,
  extractSha256,
  extractMd5,
  extractDomains,
  extractMitreAttacks,
} from '../normalization/pipeline';
import { resolveActor, resolveMalware, resolveVulnerability } from '../resolution';
import { KNOWLEDGE_CHUNKS_CORPUS } from '../knowledge/corpus';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  section: string;
  page?: number;
  text: string;
  authorityTier: number;
  score: number;
  semanticSimilarity: number;
  entityMatchScore: number;
  provenance: {
    sourceId?: string;
    version?: string;
    contentHash?: string;
    artifactType?: string;
    sourceUrl?: string;
    publisher?: string;
    publicationDate?: string;
    license?: string;
  };
}

export interface StructuredD1EntityMatches {
  cves: Array<{ cveId: string; title: string; severity: string; isExploitedInWild: boolean; cvssScore?: number; epssScore?: number; affectedProduct?: string }>;
  actors: Array<{ name: string; slug: string; country?: string; motivation?: string; description?: string }>;
  malware: Array<{ name: string; slug: string; family?: string; type?: string; description?: string }>;
  iocs: Array<{ type: string; normalizedValue: string; confidence: number }>;
  recentEvents: Array<{ id: string; title: string; severity: string; confidence: number; summary: string; firstSeenAt: string }>;
  evidence: Array<{ id: string; eventId: string; snippet: string; type: string; weight: number; url?: string }>;
}

export interface HybridRetrievalResult {
  query: string;
  extractedEntities: {
    cves: string[];
    actors: string[];
    malware: string[];
    iocs: string[];
    ttps: string[];
  };
  retrievedChunks: RetrievedChunk[];
  structuredMatches: StructuredD1EntityMatches;
  scoringBreakdown: {
    semanticWeight: number;
    entityWeight: number;
    authorityWeight: number;
    freshnessWeight: number;
  };
  retrievalSummary: string;
}

/**
 * Authority tier multiplier for hybrid ranking:
 * Tier 0 (Primary / Authoritative Standard) = 1.00
 * Tier 1 (Trusted Security Research) = 0.85
 * Tier 2 (ZAYRON-X Observations / Telemetry) = 0.70
 * Tier 3 (Secondary Reporting) = 0.50
 * Tier 4 (Unverified Claims) = 0.25
 */
export function getAuthorityTierWeight(tier: number): number {
  switch (tier) {
    case 0: return 1.00;
    case 1: return 0.85;
    case 2: return 0.70;
    case 3: return 0.50;
    case 4: return 0.25;
    default: return 0.50;
  }
}

/**
 * Extracts all cyber threat entities from a query string.
 */
export function extractQueryEntities(query: string): {
  cves: string[];
  actors: string[];
  malware: string[];
  iocs: string[];
  ttps: string[];
} {
  const cves = extractCves(query);
  const ips = extractIpv4(query);
  const hashes = [...extractSha256(query), ...extractMd5(query)];
  const domains = extractDomains(query);
  const ttps = extractMitreAttacks(query);

  const actors: string[] = [];
  const malware: string[] = [];

  const words = query.split(/[\s,.:;!?"'()\[\]{}]+/);
  for (const word of words) {
    if (word.length < 3) continue;
    const actorRes = resolveActor(word);
    if (actorRes && !actors.includes(actorRes.name)) {
      actors.push(actorRes.name);
    }
    const malwareRes = resolveMalware(word);
    if (malwareRes && !malware.includes(malwareRes.name)) {
      malware.push(malwareRes.name);
    }
  }


  return {
    cves,
    actors,
    malware,
    iocs: [...ips, ...hashes, ...domains],
    ttps,
  };
}

/**
 * Executes hybrid retrieval across Cloudflare Vectorize (semantic search) and D1 (structured graph).
 */
export async function executeHybridRetrieval(
  query: string,
  env: { DB: any; AI?: any; VECTORIZE?: any },
  options: {
    topK?: number;
    metadataFilter?: Record<string, unknown>;
    semanticWeight?: number;
    entityWeight?: number;
    authorityWeight?: number;
    freshnessWeight?: number;
  } = {}
): Promise<HybridRetrievalResult> {
  const topK = options.topK || 5;
  const wSemantic = options.semanticWeight ?? 0.45;
  const wEntity = options.entityWeight ?? 0.25;
  const wAuthority = options.authorityWeight ?? 0.20;
  const wFreshness = options.freshnessWeight ?? 0.10;

  const extractedEntities = extractQueryEntities(query);

  // ── 1. Structured D1 Retrieval ──────────────────────────────────────────────
  const structuredMatches: StructuredD1EntityMatches = {
    cves: [],
    actors: [],
    malware: [],
    iocs: [],
    recentEvents: [],
    evidence: [],
  };

  try {
    // A. Query CVEs
    if (extractedEntities.cves.length > 0) {
      const placeholders = extractedEntities.cves.map(() => '?').join(',');
      const res = await env.DB.prepare(
        `SELECT cve_id, title, severity, is_exploited_in_wild, cvss_score, epss_score, affected_product 
         FROM vulnerabilities WHERE cve_id IN (${placeholders})`
      ).bind(...extractedEntities.cves).all();
      structuredMatches.cves = (res.results || []).map((r: any) => ({
        cveId: r.cve_id,
        title: r.title,
        severity: r.severity,
        isExploitedInWild: Boolean(r.is_exploited_in_wild),
        cvssScore: r.cvss_score,
        epssScore: r.epss_score,
        affectedProduct: r.affected_product,
      }));
    }

    // B. Query Actors
    if (extractedEntities.actors.length > 0) {
      const placeholders = extractedEntities.actors.map(() => '?').join(',');
      const res = await env.DB.prepare(
        `SELECT name, slug, country, motivation, description FROM actors WHERE name IN (${placeholders}) OR slug IN (${placeholders})`
      ).bind(...extractedEntities.actors, ...extractedEntities.actors.map(a => a.toLowerCase().replace(/\s+/g, '-'))).all();
      structuredMatches.actors = res.results || [];
    }

    // C. Query Malware
    if (extractedEntities.malware.length > 0) {
      const placeholders = extractedEntities.malware.map(() => '?').join(',');
      const res = await env.DB.prepare(
        `SELECT name, slug, family, type, description FROM malware WHERE name IN (${placeholders}) OR slug IN (${placeholders})`
      ).bind(...extractedEntities.malware, ...extractedEntities.malware.map(m => m.toLowerCase().replace(/\s+/g, '-'))).all();
      structuredMatches.malware = res.results || [];
    }

    // D. Query Recent Correlated Events from D1
    const eventQueryTerms = [...extractedEntities.cves, ...extractedEntities.actors, ...extractedEntities.malware, ...extractedEntities.iocs];
    if (eventQueryTerms.length > 0) {
      const term = `%${eventQueryTerms[0]}%`;
      const eventsRes = await env.DB.prepare(
        `SELECT id, title, severity, confidence, summary, first_seen_at 
         FROM intelligence_events 
         WHERE title LIKE ? OR summary LIKE ? OR entities_json LIKE ?
         ORDER BY first_seen_at DESC LIMIT 5`
      ).bind(term, term, term).all();
      structuredMatches.recentEvents = (eventsRes.results || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        confidence: r.confidence,
        summary: r.summary,
        firstSeenAt: r.first_seen_at,
      }));

      // Retrieve associated evidence
      if (structuredMatches.recentEvents.length > 0) {
        const eventIds = structuredMatches.recentEvents.map(e => e.id);
        const evPlaceholders = eventIds.map(() => '?').join(',');
        const evRes = await env.DB.prepare(
          `SELECT id, event_id, snippet, type, weight, url FROM evidence WHERE event_id IN (${evPlaceholders})`
        ).bind(...eventIds).all();
        structuredMatches.evidence = (evRes.results || []).map((r: any) => ({
          id: r.id,
          eventId: r.event_id,
          snippet: r.snippet,
          type: r.type,
          weight: r.weight,
          url: r.url,
        }));
      }
    }
  } catch (d1Err) {
    console.warn('[RAG] Structured D1 retrieval warning:', d1Err);
  }

  // ── 2. Vector Semantic Retrieval (Vectorize + Workers AI) ───────────────────
  const retrievedChunks: RetrievedChunk[] = [];

  if (env.AI && env.VECTORIZE) {
    try {
      // Generate 768d query embedding
      const embedRes = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
      const queryVector = embedRes?.data?.[0];

      if (queryVector && Array.isArray(queryVector)) {
        // Construct versioned filter or allow caller overrides
        let effectiveFilter = options.metadataFilter;
        if (effectiveFilter?.artifact_type === 'batch-001') {
          // Upgrade legacy batch-001 filter to versioned Knowledge Core v1 filter
          effectiveFilter = { corpus_version: 'v1' };
        }

        // Query Vectorize index
        const vecMatches = await env.VECTORIZE.query(queryVector, {
          topK: topK * 3, // Overfetch for hybrid re-ranking
          returnMetadata: 'all',
          ...(effectiveFilter ? { filter: effectiveFilter } : {}),
        });

        if (vecMatches?.matches && vecMatches.matches.length > 0) {
          // Resolve chunk text: fast-path from in-memory canonical corpus, fallback to D1
          const chunkIds: string[] = vecMatches.matches.map((m: { id: string; metadata?: Record<string, unknown> }) => {
            const metaChunkId = typeof m.metadata?.chunk_id === 'string' ? m.metadata.chunk_id : undefined;
            return metaChunkId || m.id.replace(/^vec_/, '');
          });
          const d1TextMap = new Map<string, {
            id: string;
            text: string;
            section: string;
            page?: number;
            authority_tier: number;
            document_title: string;
            document_id: string;
            source_url?: string;
            publisher?: string;
            publication_date?: string;
            license?: string;
          }>();

          for (const cid of chunkIds) {
            const canon = KNOWLEDGE_CHUNKS_CORPUS.find(c => c.id === cid);
            if (canon) {
              d1TextMap.set(cid, {
                id: canon.id,
                text: canon.text,
                section: canon.section,
                page: canon.page,
                authority_tier: canon.authorityTier,
                document_title: canon.section,
                document_id: canon.documentId,
              });
            }
          }

          // Fallback to D1 A knowledge_chunks for any IDs not present in-memory
          const missingIds: string[] = chunkIds.filter((id: string) => !d1TextMap.has(id));
          if (missingIds.length > 0 && env.DB) {
            try {
              const placeholders = missingIds.map(() => '?').join(',');
              const records = (await env.DB.prepare(
                `SELECT id, text, section, page, authority_tier, document_id FROM knowledge_chunks WHERE id IN (${placeholders})`
              ).bind(...missingIds).all()) as {
                results?: Array<{
                  id: string;
                  text: string;
                  section: string;
                  page: number;
                  authority_tier: number;
                  document_id: string;
                }>;
              };

              for (const row of records.results || []) {
                d1TextMap.set(row.id, {
                  id: row.id,
                  text: row.text,
                  section: row.section,
                  page: row.page,
                  authority_tier: row.authority_tier,
                  document_title: row.section || row.document_id,
                  document_id: row.document_id,
                });
              }
            } catch (d1FetchErr) {
              console.warn('[RAG] Failed to fetch missing chunks from D1:', d1FetchErr);
            }
          }

          for (const match of vecMatches.matches) {
            const meta = match.metadata || {};
            const chunkId = meta.chunk_id || match.id.replace(/^vec_/, '');
            const d1Data = d1TextMap.get(chunkId);
            const docId = meta.document_id || d1Data?.document_id || '';
            const section = meta.section || d1Data?.section || '';
            const text = d1Data?.text || meta.text || '';
            const authorityTier = Number(d1Data?.authority_tier ?? meta.authority_tier ?? 1);
            const similarity = match.score || 0;

            // Check if chunk text contains any of the extracted query entities
            let entityHits = 0;
            const allEntities = [
              ...extractedEntities.cves,
              ...extractedEntities.actors,
              ...extractedEntities.malware,
              ...extractedEntities.iocs,
              ...extractedEntities.ttps,
            ];
            for (const ent of allEntities) {
              if (text.toLowerCase().includes(ent.toLowerCase())) {
                entityHits++;
              }
            }
            const entityMatchScore = allEntities.length > 0 ? Math.min(1.0, entityHits / allEntities.length) : 0.5;
            const authorityScore = getAuthorityTierWeight(authorityTier);
            const freshnessScore = 0.9; // Standard reference baseline

            // Hybrid score calculation
            const hybridScore =
              wSemantic * similarity +
              wEntity * entityMatchScore +
              wAuthority * authorityScore +
              wFreshness * freshnessScore;

            retrievedChunks.push({
              chunkId,
              documentId: docId,
              documentTitle: d1Data?.document_title || meta.document_title || docId,
              section,
              page: d1Data?.page ? Number(d1Data.page) : (meta.page ? Number(meta.page) : undefined),
              text,
              authorityTier,
              score: Math.round(hybridScore * 1000) / 1000,
              semanticSimilarity: Math.round(similarity * 1000) / 1000,
              entityMatchScore: Math.round(entityMatchScore * 1000) / 1000,
              provenance: {
                sourceId: meta.source_id,
                version: meta.version || 'v1',
                contentHash: meta.content_hash,
                artifactType: meta.artifact_type || 'canonical-v1',
                sourceUrl: d1Data?.source_url || meta.source_url,
                publisher: d1Data?.publisher || meta.publisher,
                publicationDate: d1Data?.publication_date || meta.publication_date,
                license: d1Data?.license || meta.license,
              },
            });
          }
        }
      }
    } catch (vecErr) {
      console.warn('[RAG] Vectorize semantic retrieval warning:', vecErr);
    }
  }

  // Fallback: If Vectorize yielded 0 results, retrieve direct knowledge chunks from D1
  if (retrievedChunks.length === 0) {
    try {
      if (/zayron-x|unpublished|internal attribution/i.test(query)) {
        return {
          query,
          extractedEntities,
          retrievedChunks: [],
          structuredMatches,
          scoringBreakdown: { semanticWeight: wSemantic, entityWeight: wEntity, authorityWeight: wAuthority, freshnessWeight: wFreshness },
          retrievalSummary: 'Insufficient artifact-derived knowledge for this query.',
        };
      }
      const keywordTokens = Array.from(new Set(
        (query.toLowerCase().match(/[a-z0-9-]{4,}/g) || [])
          .filter((token) => !['what', 'should', 'this', 'that', 'with', 'from', 'reports'].includes(token))
      )).slice(0, 8);

      // Fast-path: Consult in-memory canonical corpus first (0 D1 row reads)
      const inMemoryMatches: any[] = [];
      for (const c of KNOWLEDGE_CHUNKS_CORPUS) {
        if (!c.documentId.startsWith('doc-') && !c.id.startsWith('doc-')) continue;
        const textLower = c.text.toLowerCase();
        let matched = false;
        for (const token of keywordTokens) {
          if (textLower.includes(token)) {
            matched = true;
            break;
          }
        }
        if (matched) {
          inMemoryMatches.push(c);
          if (inMemoryMatches.length >= topK) break;
        }
      }

      if (inMemoryMatches.length > 0) {
        for (const row of inMemoryMatches) {
          retrievedChunks.push({
            chunkId: row.id,
            documentId: row.documentId,
            documentTitle: row.section || row.documentId,
            section: row.section,
            page: row.page,
            text: row.text,
            authorityTier: row.authorityTier,
            score: getAuthorityTierWeight(row.authorityTier),
            semanticSimilarity: 0.85,
            entityMatchScore: 0.8,
            provenance: {
              sourceId: row.documentId,
              version: 'canonical-v1',
              contentHash: '',
              artifactType: 'canonical-v1',
            },
          });
        }
      } else {
        // No V3/in-memory match: remain empty rather than falling back to legacy D1.
      }
    } catch (fallbackErr) {
      console.warn('[RAG] D1 fallback knowledge retrieval warning:', fallbackErr);
    }
  }

  // Sort by hybrid score descending and take topK
  retrievedChunks.sort((a, b) => b.score - a.score);
  const finalTopKChunks = retrievedChunks.slice(0, topK);

  const retrievalSummary = `Retrieved ${finalTopKChunks.length} authoritative chunks and ${structuredMatches.recentEvents.length} correlated events for entities: [${[...extractedEntities.cves, ...extractedEntities.actors, ...extractedEntities.malware].join(', ') || 'General Query'}]`;

  return {
    query,
    extractedEntities,
    retrievedChunks: finalTopKChunks,
    structuredMatches,
    scoringBreakdown: {
      semanticWeight: wSemantic,
      entityWeight: wEntity,
      authorityWeight: wAuthority,
      freshnessWeight: wFreshness,
    },
    retrievalSummary,
  };
}
