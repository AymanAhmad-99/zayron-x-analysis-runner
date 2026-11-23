import type { CoreClaim, CanonicalRecord, EvidenceBundle, AnalysisProfile } from './types';
import { analysisProfileRegistry } from './profiles';

/**
 * Universal Semantic & Temporal Consistency Engine
 * 
 * Validates cross-field contradictions across ANY intelligence domain without
 * hardcoding product or entity names.
 */
export interface SemanticConsistencyResult {
  valid: boolean;
  conflicts: string[];
}

export function validateSemanticConsistency(
  claims: CoreClaim[],
  canonical: CanonicalRecord,
  bundle: EvidenceBundle
): SemanticConsistencyResult {
  const conflicts: string[] = [];
  const profile = analysisProfileRegistry.get(canonical.domain);

  // 1. Group claims by predicate
  const claimsByPredicate = new Map<string, CoreClaim[]>();
  for (const claim of claims) {
    const p = claim.predicate.toLowerCase();
    if (!claimsByPredicate.has(p)) claimsByPredicate.set(p, []);
    claimsByPredicate.get(p)!.push(claim);
  }

  // 2. Binary Contradiction Detection across common intelligence dimensions
  const allClaimText = claims.map(c => `${c.predicate}: ${c.text} ${c.objectValue}`).join(' \n ').toLowerCase();

  // Condition A: Access Requirements Contradiction (Pre-auth vs Required Auth)
  const assertsUnauth = /\b(unauthenticated|no credentials required|pre-auth|zero privilege)\b/i.test(allClaimText);
  const assertsAuth = /\b(valid credentials required|authenticated user|authenticated session|operator privileges required|administrative credentials)\b/i.test(allClaimText);
  if (assertsUnauth && assertsAuth) {
    conflicts.push('Semantic Contradiction: Analysis simultaneously asserts unauthenticated access and mandatory authenticated credentials.');
  }

  // Condition B: Exploitation / Activity State Contradiction
  const assertsExploited = /\b(known exploited|active exploitation|observed in the wild|in-the-wild exploitation)\b/i.test(allClaimText);
  const assertsNoExploited = /\b(no evidence of exploitation|no in-the-wild exploitation evidence|unexploited in the wild)\b/i.test(allClaimText);
  if (assertsExploited && assertsNoExploited) {
    conflicts.push('Semantic Contradiction: Analysis simultaneously asserts confirmed active exploitation and absence of exploitation evidence.');
  }

  // Condition C: Impact / Consequence Scope Contradiction
  const assertsNoneImpact = /\b(no impact|zero risk|benign flaw|informational only)\b/i.test(allClaimText);
  const assertsSevereImpact = /\b(root privileges|arbitrary code execution|full compromise|system takeover)\b/i.test(allClaimText);
  if (assertsNoneImpact && assertsSevereImpact) {
    conflicts.push('Semantic Contradiction: Analysis claims both benign/zero impact and severe remote code execution.');
  }

  // Condition D: Temporal Contradiction
  for (const claim of claims) {
    if (claim.temporal?.validFrom && claim.temporal?.validUntil) {
      const from = new Date(claim.temporal.validFrom).getTime();
      const until = new Date(claim.temporal.validUntil).getTime();
      if (!isNaN(from) && !isNaN(until) && from > until) {
        conflicts.push(`Temporal Contradiction in claim ${claim.claimId}: validFrom (${claim.temporal.validFrom}) is later than validUntil (${claim.temporal.validUntil}).`);
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}
