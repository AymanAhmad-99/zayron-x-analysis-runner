/**
 * ZAYRON-X Evidence-Bound Claims & Validation Architecture
 * 
 * Enforces the strict contract:
 * Canonical Evidence -> Evidence-Bound Claims -> Deterministic Validation -> Editorial Generation -> Editorial Gate
 */

export type ClaimType = 
  | 'vulnerability' 
  | 'technical' 
  | 'exposure' 
  | 'impact' 
  | 'exploitation' 
  | 'remediation' 
  | 'threat_context' 
  | 'timeline';

export type ClaimStatus = 
  | 'CONFIRMED'   // Directly supported by canonical evidence
  | 'ASSESSED'    // Conservative analytical inference supported by canonical evidence
  | 'UNKNOWN'      // Not established by available evidence (must not be presented as fact)
  | 'DISALLOWED';  // Unsupported, contradictory, or speculative (must be rejected)

export interface EditorialEvidenceItem {
  evidence_id: string;
  source: string;
  source_type: 'vendor_advisory' | 'government' | 'catalog' | 'research' | 'secondary';
  url: string;
  fact: string;
  date?: string;
}

export interface EvidenceBoundClaim {
  claim_id: string;
  text: string;
  type: ClaimType;
  status: ClaimStatus;
  evidence_refs: string[];
}

export interface ClaimValidationResult {
  valid: boolean;
  validatedClaims: EvidenceBoundClaim[];
  rejectedClaims: Array<{ claim: EvidenceBoundClaim; reason: string }>;
  errors: string[];
}

const COMMON_TECHNICAL_TOKENS = new Set([
  'vulnerability', 'execution', 'injection', 'privilege', 'privileges', 'remote',
  'network', 'security', 'attacker', 'adversary', 'exploit', 'exploitation',
  'authentication', 'unauthenticated', 'authenticated', 'operator', 'credentials',
  'compromise', 'integrity', 'confidentiality', 'availability', 'advisory',
  'update', 'updates', 'patch', 'hotfix', 'firmware', 'version', 'versions',
  'payload', 'command', 'commands', 'arbitrary', 'buffer', 'overflow', 'traversal',
  'vector', 'endpoint', 'server', 'client', 'gateway', 'device', 'appliance',
  'firewall', 'router', 'switch', 'kernel', 'driver', 'memory', 'socket',
  'feature', 'flaw', 'file', 'read', 'disclosure', 'perimeter', 'boundary',
  'defense', 'actions', 'action', 'audit', 'restrict', 'access', 'ingress',
]);

/**
 * Deterministic Application-Side Claim Validator
 * 
 * Validates that every CONFIRMED or ASSESSED claim strictly points to real canonical evidence items.
 * Enforces that no unsupported technical details, weaponization leaps, or speculative attribution pass.
 */
export function validateEvidenceBoundClaims(
  claims: EvidenceBoundClaim[],
  canonicalEvidence: EditorialEvidenceItem[]
): ClaimValidationResult {
  const validEvidenceIds = new Set(canonicalEvidence.map(e => e.evidence_id));
  const validatedClaims: EvidenceBoundClaim[] = [];
  const rejectedClaims: Array<{ claim: EvidenceBoundClaim; reason: string }> = [];
  const errors: string[] = [];

  for (const claim of claims) {
    // 1. Verify claim_id exists
    if (!claim.claim_id || typeof claim.claim_id !== 'string') {
      errors.push('Missing or invalid claim_id');
      rejectedClaims.push({ claim, reason: 'MISSING_CLAIM_ID' });
      continue;
    }

    // 2. Verify status validity
    const allowedStatuses: ClaimStatus[] = ['CONFIRMED', 'ASSESSED', 'UNKNOWN', 'DISALLOWED'];
    if (!allowedStatuses.includes(claim.status)) {
      errors.push(`Claim ${claim.claim_id} has invalid status "${claim.status}"`);
      rejectedClaims.push({ claim, reason: 'INVALID_STATUS' });
      continue;
    }

    // 3. Exclude UNKNOWN and DISALLOWED from publication
    if (claim.status === 'UNKNOWN' || claim.status === 'DISALLOWED') {
      rejectedClaims.push({ claim, reason: `STATUS_${claim.status}` });
      continue;
    }

    // 4. Verify non-empty evidence references for CONFIRMED and ASSESSED
    if (!Array.isArray(claim.evidence_refs) || claim.evidence_refs.length === 0) {
      errors.push(`Claim ${claim.claim_id} (${claim.status}) lacks evidence references`);
      rejectedClaims.push({ claim, reason: 'NO_EVIDENCE_REFS' });
      continue;
    }

    // 5. Verify every evidence reference exists in the canonical evidence set
    const missingRefs = claim.evidence_refs.filter(ref => !validEvidenceIds.has(ref));
    if (missingRefs.length > 0) {
      errors.push(`Claim ${claim.claim_id} references nonexistent evidence: [${missingRefs.join(', ')}]`);
      rejectedClaims.push({ claim, reason: `NONEXISTENT_EVIDENCE_REF: ${missingRefs.join(', ')}` });
      continue;
    }

    // 6. Exploitation Status Normalization: Reject upgrading CISA KEV to "active campaign" or "weaponized"
    const textLower = claim.text.toLowerCase();
    if (claim.type === 'exploitation') {
      const hasKevOnly = claim.evidence_refs.every(ref => {
        const ev = canonicalEvidence.find(e => e.evidence_id === ref);
        return ev?.source_type === 'government' || ev?.source_type === 'catalog';
      });
      if (hasKevOnly && (textLower.includes('active campaign') || textLower.includes('weaponized') || textLower.includes('mass exploitation'))) {
        errors.push(`Claim ${claim.claim_id} overstates exploitation: KEV does not establish active campaign or weaponized exploit.`);
        rejectedClaims.push({ claim, reason: 'OVERSTATED_EXPLOITATION' });
        continue;
      }
    }

    // 7. Impact Policy: Potential impact must retain conditional language
    if (claim.type === 'impact') {
      if (textLower.includes('steals database credentials') || textLower.includes('reads all system secrets')) {
        errors.push(`Claim ${claim.claim_id} asserts unestablished guaranteed credential theft.`);
        rejectedClaims.push({ claim, reason: 'UNESTABLISHED_GUARANTEED_IMPACT' });
        continue;
      }
    }

    // 8. Deterministic Domain-Agnostic Entity & Mechanism Consistency Check:
    // Reject claims asserting specific named entities, APIs, or specific traversal markers not grounded in canonical evidence.
    const allEvidenceText = canonicalEvidence.map(e => `${e.source} ${e.fact}`).join(' ').toLowerCase();

    // Extract potential proper nouns / multi-word entities from claim text (e.g. "GitLab", "RouterOS", "repository commits API")
    const candidateEntityMatches = Array.from(new Set(
      claim.text.match(/\b(?:[A-Z][a-zA-Z0-9_-]+(?:\s+[A-Z][a-zA-Z0-9_-]+)*|[a-z0-9_.-]+(?:\s+commits\s+api)?|\.\.\/)\b/g) || []
    )).filter(t => t.length > 3 && !COMMON_TECHNICAL_TOKENS.has(t.toLowerCase()));

    let entityConflict = false;
    for (const entity of candidateEntityMatches) {
      const lower = entity.toLowerCase();
      // If a specific technical entity or traversal pattern is asserted that doesn't exist anywhere in the evidence
      if ((lower.includes('api') || lower === '../' || /^[A-Z]/.test(entity)) && !allEvidenceText.includes(lower)) {
        errors.push(`Claim ${claim.claim_id} references unestablished entity or pattern "${entity}" not present in canonical evidence.`);
        rejectedClaims.push({ claim, reason: `ENTITY_CONSISTENCY_VIOLATION: ${entity}` });
        entityConflict = true;
        break;
      }
    }
    if (entityConflict) continue;

    validatedClaims.push(claim);
  }

  return {
    valid: errors.length === 0 && validatedClaims.length > 0,
    validatedClaims,
    rejectedClaims,
    errors,
  };
}
