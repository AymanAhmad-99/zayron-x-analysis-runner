import {
  extractCves,
  extractIpv4,
  extractSha256,
  extractMd5,
  extractDomains,
  extractMitreAttacks,
} from '../normalization/pipeline';
import { resolveActor, resolveMalware, resolveVulnerability } from '../resolution';

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
        // Query Vectorize index
        const vecMatches = await env.VECTORIZE.query(queryVector, {
          topK: topK * 3, // Overfetch for hybrid re-ranking
          returnMetadata: 'all',
        });

        if (vecMatches?.matches && vecMatches.matches.length > 0) {
          for (const match of vecMatches.matches) {
            const meta = match.metadata || {};
            const chunkId = match.id || meta.chunk_id;
            const docId = meta.document_id || '';
            const section = meta.section || '';
            const text = meta.text || '';
            const authorityTier = Number(meta.authority_tier ?? 1);
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
              documentTitle: meta.document_title || docId,
              section,
              page: meta.page ? Number(meta.page) : undefined,
              text,
              authorityTier,
              score: Math.round(hybridScore * 1000) / 1000,
              semanticSimilarity: Math.round(similarity * 1000) / 1000,
              entityMatchScore: Math.round(entityMatchScore * 1000) / 1000,
              provenance: {
                sourceUrl: meta.source_url,
                publisher: meta.publisher,
                publicationDate: meta.publication_date,
                license: meta.license,
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
      const d1Chunks = await env.DB.prepare(
        `SELECT c.id as chunk_id, c.document_id, c.section, c.page, c.text, c.authority_tier,
                d.title as document_title, d.source_url, d.publisher, d.publication_date, d.license
         FROM knowledge_chunks c
         JOIN knowledge_documents d ON c.document_id = d.id
         ORDER BY c.authority_tier ASC LIMIT ?`
      ).bind(topK).all();

      for (const row of d1Chunks.results || []) {
        retrievedChunks.push({
          chunkId: row.chunk_id,
          documentId: row.document_id,
          documentTitle: row.document_title,
          section: row.section,
          page: row.page,
          text: row.text,
          authorityTier: row.authority_tier,
          score: getAuthorityTierWeight(row.authority_tier),
          semanticSimilarity: 0.75,
          entityMatchScore: 0.5,
          provenance: {
            sourceUrl: row.source_url,
            publisher: row.publisher,
            publicationDate: row.publication_date,
            license: row.license,
          },
        });
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
