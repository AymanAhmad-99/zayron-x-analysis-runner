import type { CanonicalRecord } from './types';

export type ResolutionStatus = 'RESOLVED' | 'POSSIBLE' | 'AMBIGUOUS' | 'UNRESOLVED';

export interface EntityResolutionResult {
  status: ResolutionStatus;
  canonicalId?: string;
  matchedAlias?: string;
  confidence: number;
  reason: string;
}

/**
 * Deterministic Domain-Agnostic Entity Resolution
 * 
 * Resolves candidate entity names against canonical records using:
 * 1. Exact Canonical Match (RESOLVED)
 * 2. Normalized Canonical Match (RESOLVED)
 * 3. Declared Alias Match (RESOLVED)
 * 4. Multi-match ambiguity (AMBIGUOUS)
 * 5. Partial/Fuzzy Match without evidence grounding (POSSIBLE or UNRESOLVED)
 * 
 * Does NOT force uncertain aliases into canonical identity.
 */
export function resolveCanonicalEntity(
  candidate: string,
  records: CanonicalRecord[]
): EntityResolutionResult {
  const normCandidate = candidate.trim().toLowerCase();
  if (!normCandidate) {
    return {
      status: 'UNRESOLVED',
      confidence: 0,
      reason: 'Empty candidate identifier.',
    };
  }

  // 1. Exact Canonical ID or Primary Identifier Match
  const exactMatches = records.filter(
    r => r.objectId.toLowerCase() === normCandidate || r.primaryIdentifier.toLowerCase() === normCandidate
  );
  if (exactMatches.length === 1) {
    return {
      status: 'RESOLVED',
      canonicalId: exactMatches[0].objectId,
      matchedAlias: exactMatches[0].primaryIdentifier,
      confidence: 1.0,
      reason: 'Exact match with canonical identifier.',
    };
  } else if (exactMatches.length > 1) {
    return {
      status: 'AMBIGUOUS',
      confidence: 0.5,
      reason: `Multiple canonical records match primary identifier "${candidate}".`,
    };
  }

  // 2. Declared Alias Match
  const aliasMatches: Array<{ record: CanonicalRecord; alias: string }> = [];
  for (const record of records) {
    for (const alias of record.aliases || []) {
      if (alias.toLowerCase() === normCandidate) {
        aliasMatches.push({ record, alias });
      }
    }
  }

  if (aliasMatches.length === 1) {
    return {
      status: 'RESOLVED',
      canonicalId: aliasMatches[0].record.objectId,
      matchedAlias: aliasMatches[0].alias,
      confidence: 0.95,
      reason: `Matched declared canonical alias "${aliasMatches[0].alias}".`,
    };
  } else if (aliasMatches.length > 1) {
    return {
      status: 'AMBIGUOUS',
      confidence: 0.4,
      reason: `Candidate alias matches multiple distinct canonical entities: [${aliasMatches.map(m => m.record.primaryIdentifier).join(', ')}].`,
    };
  }

  // 3. Substring / Lexical Containment (Without full alias declaration, return POSSIBLE or UNRESOLVED)
  const partialMatches = records.filter(
    r => normCandidate.includes(r.primaryIdentifier.toLowerCase()) || r.primaryIdentifier.toLowerCase().includes(normCandidate)
  );

  if (partialMatches.length === 1 && normCandidate.length >= 4) {
    return {
      status: 'POSSIBLE',
      canonicalId: partialMatches[0].objectId,
      matchedAlias: partialMatches[0].primaryIdentifier,
      confidence: 0.6,
      reason: 'Partial lexical containment; requires additional corroborating evidence.',
    };
  }

  return {
    status: 'UNRESOLVED',
    confidence: 0.0,
    reason: `Candidate "${candidate}" could not be resolved to any canonical entity or declared alias.`,
  };
}
