import type {
  CoreClaim,
  EvidenceBundle,
  CanonicalRecord,
  CoreValidationResult,
  ClaimVerificationStatus,
} from './types';

/**
 * Universal Claim & Evidence Membership Engine
 * 
 * ZERO domain-specific product names, CVEs, malware names, actor names, or contamination blocklists.
 * 
 * Employs deterministic membership resolution:
 * 1. Canonical Exact Match
 * 2. Normalized Exact Match
 * 3. Declared Canonical Alias Match
 * 4. Evidence-Supported Lexical Match
 * 5. Temporal Scope Consistency
 */
export function validateClaimAgainstEvidence(
  claim: CoreClaim,
  context: {
    canonical: CanonicalRecord;
    bundle: EvidenceBundle;
  }
): {
  status: ClaimVerificationStatus;
  reasons: string[];
  matchedCanonicalFields: string[];
  matchedEvidenceIds: string[];
} {
  const reasons: string[] = [];
  const matchedCanonicalFields: string[] = [];
  const matchedEvidenceIds: string[] = [];

  // 1. Subject Resolution against Canonical Record
  const normSubject = claim.subject.trim().toLowerCase();
  const canonicalId = context.canonical.primaryIdentifier.toLowerCase();
  const canonicalAliases = (context.canonical.aliases || []).map(a => a.toLowerCase());

  const isSubjectCanonical = 
    normSubject === canonicalId ||
    canonicalAliases.includes(normSubject) ||
    normSubject.includes(canonicalId);

  if (isSubjectCanonical) {
    matchedCanonicalFields.push('primaryIdentifier');
  }

  // 2. Validate Evidence References Existence
  if (!claim.evidenceRefs || claim.evidenceRefs.length === 0) {
    if (claim.status === 'CONFIRMED') {
      return {
        status: 'UNSUPPORTED',
        reasons: ['Claim marked CONFIRMED but provides no supporting evidence references.'],
        matchedCanonicalFields,
        matchedEvidenceIds,
      };
    }
  }

  const bundleEvidenceMap = new Map(context.bundle.items.map(e => [e.evidenceId, e]));
  const validRefs: string[] = [];
  for (const ref of claim.evidenceRefs || []) {
    if (bundleEvidenceMap.has(ref)) {
      validRefs.push(ref);
      matchedEvidenceIds.push(ref);
    } else {
      reasons.push(`Claim references nonexistent evidence ID: "${ref}".`);
    }
  }

  if (claim.evidenceRefs && claim.evidenceRefs.length > 0 && validRefs.length === 0) {
    return {
      status: 'UNSUPPORTED',
      reasons: reasons.length ? reasons : ['None of the supplied evidence references exist in the bundle.'],
      matchedCanonicalFields,
      matchedEvidenceIds,
    };
  }

  // 3. Evidence-Supported Lexical Match (Evidence Corpus Containment)
  // Check that key terms in claim.objectValue or claim.text are grounded in evidence statements or canonical facts.
  const claimTextLower = `${claim.text} ${claim.objectValue}`.toLowerCase();
  
  // Aggregate all authoritative evidence statements
  const evidenceCorpus = context.bundle.items.map(e => e.statement).join(' ').toLowerCase();
  const canonicalCorpus = Object.values(context.canonical.canonicalFacts)
    .map(f => String(f.value))
    .join(' ')
    .toLowerCase();
  const fullAuthoritativeCorpus = `${canonicalCorpus} ${evidenceCorpus}`;

  // Extract candidate named entities (capitalized phrases or alphanumeric terms >= 4 chars)
  const candidateTerms = Array.from(new Set(
    (claim.text.match(/\b[A-Za-z0-9_.-]{4,}\b/g) || [])
      .map(t => t.toLowerCase())
      .filter(t => !COMMON_ENGLISH_STOPWORDS.has(t))
  ));

  const unsupportedSignificantTerms: string[] = [];
  for (const term of candidateTerms) {
    // If the term is not in the authoritative corpus and looks like a specific entity/identifier
    if (!fullAuthoritativeCorpus.includes(term) && !isCommonTechnicalToken(term)) {
      unsupportedSignificantTerms.push(term);
    }
  }

  if (unsupportedSignificantTerms.length > 2) {
    return {
      status: 'UNSUPPORTED',
      reasons: [
        `Claim introduces ungrounded external entities or terminology: [${unsupportedSignificantTerms.slice(0, 5).join(', ')}].`
      ],
      matchedCanonicalFields,
      matchedEvidenceIds,
    };
  } else if (unsupportedSignificantTerms.length > 0) {
    return {
      status: 'PARTIALLY_SUPPORTED',
      reasons: [
        `Claim partially supported, but contains unverified peripheral terms: [${unsupportedSignificantTerms.join(', ')}].`
      ],
      matchedCanonicalFields,
      matchedEvidenceIds,
    };
  }

  // 4. Temporal consistency check
  if (claim.temporal?.observedAt && context.canonical.metadata?.publishedAt) {
    const claimDate = new Date(claim.temporal.observedAt).getTime();
    const canonDate = new Date(String(context.canonical.metadata.publishedAt)).getTime();
    if (!isNaN(claimDate) && !isNaN(canonDate)) {
      // If a historical observation (e.g. 2 years prior) claims current observation
      const diffYears = (canonDate - claimDate) / (1000 * 60 * 60 * 24 * 365);
      if (diffYears > 3) {
        return {
          status: 'AMBIGUOUS',
          reasons: ['Claim temporal scope significantly predates canonical record publication window.'],
          matchedCanonicalFields,
          matchedEvidenceIds,
        };
      }
    }
  }

  return {
    status: 'SUPPORTED',
    reasons: [],
    matchedCanonicalFields,
    matchedEvidenceIds,
  };
}

/**
 * Universal Fact Integrity Validator:
 * Deterministically checks AI claims against Canonical Truth.
 * Canonical truth ALWAYS wins.
 */
export function validateCanonicalFactIntegrity(
  claim: CoreClaim,
  canonical: CanonicalRecord
): { conflict: boolean; conflictingFactName?: string; canonicalValue?: unknown } {
  const normPredicate = claim.predicate.toLowerCase();

  for (const [name, fact] of Object.entries(canonical.canonicalFacts)) {
    const factNameLower = name.toLowerCase();
    if (normPredicate === factNameLower || normPredicate.includes(factNameLower)) {
      const canonicalValStr = String(fact.value).toLowerCase().trim();
      const claimValStr = claim.objectValue.toLowerCase().trim();

      // If both represent specific discrete values (e.g. scores, severity, status, identifiers)
      if (canonicalValStr !== claimValStr && !claimValStr.includes(canonicalValStr)) {
        return {
          conflict: true,
          conflictingFactName: name,
          canonicalValue: fact.value,
        };
      }
    }
  }

  return { conflict: false };
}

/**
 * Validates a complete set of claims for an intelligence object.
 */
export function validateIntelligenceClaims(
  claims: CoreClaim[],
  context: { canonical: CanonicalRecord; bundle: EvidenceBundle }
): CoreValidationResult {
  const supportedClaims: CoreClaim[] = [];
  const partiallySupportedClaims: Array<{ claim: CoreClaim; notes: string }> = [];
  const unsupportedClaims: Array<{ claim: CoreClaim; reason: string }> = [];
  const contradictedClaims: Array<{ claim: CoreClaim; conflictWith: string }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const claim of claims) {
    // 1. Fact integrity against canonical truth
    const factCheck = validateCanonicalFactIntegrity(claim, context.canonical);
    if (factCheck.conflict) {
      contradictedClaims.push({
        claim,
        conflictWith: `Canonical fact "${factCheck.conflictingFactName}" has value "${factCheck.canonicalValue}", contradicting claim value "${claim.objectValue}".`,
      });
      errors.push(`Canonical Truth Conflict: Claim ${claim.claimId} contradicted by canonical fact "${factCheck.conflictingFactName}".`);
      continue;
    }

    // 2. Evidence membership validation
    const membership = validateClaimAgainstEvidence(claim, context);
    if (membership.status === 'SUPPORTED') {
      supportedClaims.push(claim);
    } else if (membership.status === 'PARTIALLY_SUPPORTED') {
      partiallySupportedClaims.push({ claim, notes: membership.reasons.join('; ') });
      warnings.push(`Claim ${claim.claimId} PARTIALLY_SUPPORTED: ${membership.reasons.join('; ')}`);
    } else if (membership.status === 'CONTRADICTED') {
      contradictedClaims.push({ claim, conflictWith: membership.reasons.join('; ') });
      errors.push(`Claim ${claim.claimId} CONTRADICTED: ${membership.reasons.join('; ')}`);
    } else {
      unsupportedClaims.push({ claim, reason: membership.reasons.join('; ') });
      errors.push(`Claim ${claim.claimId} ${membership.status}: ${membership.reasons.join('; ')}`);
    }
  }

  return {
    valid: errors.length === 0 && (supportedClaims.length > 0 || partiallySupportedClaims.length > 0),
    supportedClaims,
    partiallySupportedClaims,
    unsupportedClaims,
    contradictedClaims,
    errors,
    warnings,
  };
}

const COMMON_ENGLISH_STOPWORDS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'because',
  'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during',
  'inside', 'into', 'near', 'outside', 'over', 'through', 'throughout', 'under',
  'underneath', 'upon', 'with', 'within', 'without', 'which', 'where', 'while',
  'this', 'that', 'these', 'those', 'there', 'their', 'theirs', 'other', 'another',
  'such', 'more', 'most', 'some', 'any', 'each', 'every', 'either', 'neither',
  'both', 'many', 'much', 'several', 'only', 'same', 'have', 'having', 'been',
  'will', 'would', 'shall', 'should', 'could', 'might', 'must', 'allow', 'allows',
  'allowed', 'enables', 'result', 'resulting', 'creates', 'leading', 'system',
  'software', 'component', 'components', 'application', 'service', 'interface',
]);

function isCommonTechnicalToken(term: string): boolean {
  const common = [
    'vulnerability', 'execution', 'injection', 'privilege', 'privileges', 'remote',
    'network', 'security', 'attacker', 'adversary', 'exploit', 'exploitation',
    'authentication', 'unauthenticated', 'authenticated', 'operator', 'credentials',
    'compromise', 'integrity', 'confidentiality', 'availability', 'advisory',
    'update', 'updates', 'patch', 'hotfix', 'firmware', 'version', 'versions',
    'payload', 'command', 'commands', 'arbitrary', 'buffer', 'overflow', 'traversal',
    'vector', 'endpoint', 'server', 'client', 'gateway', 'device', 'appliance',
    'firewall', 'router', 'switch', 'kernel', 'driver', 'memory', 'socket',
    'malware', 'trojan', 'ransomware', 'backdoor', 'loader', 'dropper', 'stealer',
    'beacon', 'implant', 'c2', 'telemetry', 'campaign', 'actor', 'threat',
    'hash', 'domain', 'ip', 'ipv4', 'ipv6', 'url', 'sha256', 'md5',
  ];
  return common.includes(term);
}
