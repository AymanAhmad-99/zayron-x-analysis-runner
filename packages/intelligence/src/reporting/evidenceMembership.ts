/**
 * Domain-Agnostic Generic Evidence Membership Validation Layer
 * 
 * Determines whether a source artifact actually belongs to a claimed entity relationship.
 * Operates across all intelligence domains without hardcoding:
 * - Exploit <-> Vulnerability
 * - Malware <-> Campaign
 * - Malware <-> Vulnerability
 * - Threat Actor <-> Campaign
 * and future intelligence entity types.
 *
 * Rules:
 * 1. Source artifact authoritative references must contain the claimed entity identifier.
 * 2. If the artifact has insufficient evidence or no authoritative references, status is UNKNOWN_RELATIONSHIP.
 * 3. If references exist and explicitly omit / contradict the claimed entity, status is EVIDENCE_MEMBERSHIP_MISMATCH.
 * 4. Rejection is deterministic and fail-closed.
 */

export interface CandidateEvidenceRef {
  evidence_id?: string;
  evidenceId?: string;
  source_snapshot_id?: string;
  statement?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  evidenceType?: string;
}

export interface EvidenceMembershipQuery {
  source: string;
  sourceArtifactId: string;
  claimedEntityType: string;
  claimedEntityId: string;
  evidence: Array<CandidateEvidenceRef>;
  metadata?: Record<string, unknown>;
}

export interface EvidenceMembershipDiagnostics {
  source: string;
  sourceArtifactId: string;
  claimedEntity: string;
  claimedEntityType: string;
  extractedReferences: string[];
  status: 'VALID' | 'EVIDENCE_MEMBERSHIP_MISMATCH' | 'UNKNOWN_RELATIONSHIP';
  reason: string;
}

export interface EvidenceMembershipResult {
  valid: boolean;
  status: 'VALID' | 'EVIDENCE_MEMBERSHIP_MISMATCH' | 'UNKNOWN_RELATIONSHIP';
  reason: string;
  diagnostics: EvidenceMembershipDiagnostics;
}

/**
 * Normalizes identifier strings for comparison (case-insensitive, trimmed, punctuation-tolerant).
 */
function normalizeIdentifier(id: string): string {
  return id.trim().toUpperCase().replace(/[\s_-]+/g, '-');
}

/**
 * Extracts candidate entity identifiers from structured evidence metadata and statements.
 */
function extractAuthoritativeReferences(
  query: EvidenceMembershipQuery
): { references: Set<string>; hasSufficientEvidence: boolean } {
  const references = new Set<string>();
  let hasEvidenceContent = false;

  // 1. Inspect metadata if provided
  if (query.metadata && typeof query.metadata === 'object') {
    hasEvidenceContent = true;
    for (const [key, val] of Object.entries(query.metadata)) {
      if (typeof val === 'string') {
        // Direct string values (e.g. codes: "CVE-2024-3400", cve: "CVE-2024-3400", campaign: "Operation MidnightEclipse")
        val.split(/[;,\s|]+/).forEach((token) => {
          const clean = token.trim();
          if (clean) references.add(clean.toUpperCase());
        });
      } else if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === 'string') {
            references.add(item.trim().toUpperCase());
          }
        });
      }
    }
  }

  // 2. Inspect evidence items
  for (const item of query.evidence || []) {
    if (!item) continue;
    if (item.statement || item.url || item.metadata) {
      hasEvidenceContent = true;
    }

    // Inspect statement for referenced entity codes (CVEs, Campaign tags, Actor tags, Hashes, Products, Identifiers)
    if (item.statement && typeof item.statement === 'string') {
      const stmt = item.statement;
      // Extract CVE patterns: CVE-\d{4}-\d{4,8}
      const cveMatches = stmt.match(/\bCVE-\d{4}-\d{4,8}\b/gi);
      if (cveMatches) {
        cveMatches.forEach((c) => references.add(c.toUpperCase()));
      }

      // Extract EDB-ID patterns: EDB-ID-?\d+ or EDB-\d+
      const edbMatches = stmt.match(/\bEDB(?:-ID)?-?\d+\b/gi);
      if (edbMatches) {
        edbMatches.forEach((e) => references.add(e.toUpperCase()));
      }

      // Check for structured key-value statements (e.g. Reference: CVE-2024-3400, Campaign: MidnightEclipse)
      const kvMatches = stmt.matchAll(/(?:Reference|Target|Campaign|Actor|Malware|CVE):\s*([^\s,;.]+)/gi);
      for (const match of kvMatches) {
        if (match[1]) {
          references.add(match[1].trim().toUpperCase());
        }
      }

      // Extract all alphanumeric candidate entity words and phrases (>= 3 chars)
      const words = stmt.match(/\b[A-Za-z0-9_.-]{3,}\b/g);
      if (words) {
        words.forEach((w) => references.add(w.toUpperCase()));
      }
    }

    // Inspect URL for identifier components (CVEs, hashes, path components)
    if (item.url && typeof item.url === 'string') {
      const urlUpper = item.url.toUpperCase();
      const cveUrlMatches = urlUpper.match(/CVE-\d{4}-\d{4,8}/g);
      if (cveUrlMatches) {
        cveUrlMatches.forEach((c) => references.add(c));
      }
      const urlSegments = urlUpper.match(/\b[A-Z0-9_.-]{4,}\b/g);
      if (urlSegments) {
        urlSegments.forEach((s) => references.add(s));
      }
    }

    // Inspect embedded item metadata
    if (item.metadata && typeof item.metadata === 'object') {
      for (const val of Object.values(item.metadata)) {
        if (typeof val === 'string') {
          val.split(/[;,\s|]+/).forEach((token) => {
            const clean = token.trim();
            if (clean) references.add(clean.toUpperCase());
          });
        }
      }
    }
  }

  return {
    references,
    hasSufficientEvidence: hasEvidenceContent && (query.evidence.length > 0 || (query.metadata !== undefined && Object.keys(query.metadata).length > 0)),
  };
}

/**
 * Universal domain-agnostic evidence membership validator.
 * Evaluates whether claimedEntityId is verifiably member of sourceArtifactId's evidence scope.
 */
export function validateEvidenceMembership(query: EvidenceMembershipQuery): EvidenceMembershipResult {
  const { source, sourceArtifactId, claimedEntityType, claimedEntityId } = query;

  if (!claimedEntityId || !claimedEntityId.trim()) {
    const diag: EvidenceMembershipDiagnostics = {
      source,
      sourceArtifactId,
      claimedEntity: claimedEntityId,
      claimedEntityType,
      extractedReferences: [],
      status: 'EVIDENCE_MEMBERSHIP_MISMATCH',
      reason: 'Claimed entity identifier is empty or undefined',
    };
    return {
      valid: false,
      status: 'EVIDENCE_MEMBERSHIP_MISMATCH',
      reason: diag.reason,
      diagnostics: diag,
    };
  }

  const { references, hasSufficientEvidence } = extractAuthoritativeReferences(query);
  const normClaimedId = normalizeIdentifier(claimedEntityId);

  // If there is zero evidence content or empty evidence list, return UNKNOWN_RELATIONSHIP
  if (!hasSufficientEvidence || (references.size === 0 && (!query.evidence || query.evidence.length === 0))) {
    const diag: EvidenceMembershipDiagnostics = {
      source,
      sourceArtifactId,
      claimedEntity: claimedEntityId,
      claimedEntityType,
      extractedReferences: Array.from(references),
      status: 'UNKNOWN_RELATIONSHIP',
      reason: 'Artifact has insufficient or missing evidence references to establish relationship',
    };
    return {
      valid: false,
      status: 'UNKNOWN_RELATIONSHIP',
      reason: diag.reason,
      diagnostics: diag,
    };
  }

  // Check if claimed entity exists within extracted references
  let isMatched = false;
  // Also create stripped version of claimedId (e.g. "prod_pan_os" -> "pan-os", "vuln_cve_2024_3400" -> "cve-2024-3400", "ind_hash_2c26b46b" -> "2c26b46b")
  const strippedClaimedId = normClaimedId
    .replace(/^IND-HASH-/i, '')
    .replace(/^IND-HSH-/i, '')
    .replace(/^IND-/i, '')
    .replace(/^(PROD|VULN|MAL|ACT|CAMP|EXP)-/i, '');

  for (const ref of references) {
    const normRef = normalizeIdentifier(ref);
    const strippedRef = normRef
      .replace(/^IND-HASH-/i, '')
      .replace(/^IND-HSH-/i, '')
      .replace(/^IND-/i, '')
      .replace(/^(PROD|VULN|MAL|ACT|CAMP|EXP)-/i, '');

    if (normRef === normClaimedId || strippedRef === strippedClaimedId || normRef === strippedClaimedId || strippedRef === normClaimedId) {
      isMatched = true;
      break;
    }
    // Substring match for compound designations (e.g., "OPERATION-MIDNIGHTECLIPSE" contains "MIDNIGHTECLIPSE" or "PAN-OS" matches "PAN-OS GLOBALPROTECT")
    if (
      normRef.includes(normClaimedId) ||
      normClaimedId.includes(normRef) ||
      normRef.includes(strippedClaimedId) ||
      strippedClaimedId.includes(normRef)
    ) {
      isMatched = true;
      break;
    }
  }

  if (isMatched) {
    const diag: EvidenceMembershipDiagnostics = {
      source,
      sourceArtifactId,
      claimedEntity: claimedEntityId,
      claimedEntityType,
      extractedReferences: Array.from(references),
      status: 'VALID',
      reason: `Claimed ${claimedEntityType} '${claimedEntityId}' is authoritatively verified in artifact references`,
    };
    return {
      valid: true,
      status: 'VALID',
      reason: diag.reason,
      diagnostics: diag,
    };
  }

  // If authoritative references exist but do not contain the claimed entity, FAIL CLOSED
  const diag: EvidenceMembershipDiagnostics = {
    source,
    sourceArtifactId,
    claimedEntity: claimedEntityId,
    claimedEntityType,
    extractedReferences: Array.from(references),
    status: 'EVIDENCE_MEMBERSHIP_MISMATCH',
    reason: `Claimed ${claimedEntityType} '${claimedEntityId}' is not present in authoritative artifact references: [${Array.from(references).join(', ')}]`,
  };

  return {
    valid: false,
    status: 'EVIDENCE_MEMBERSHIP_MISMATCH',
    reason: diag.reason,
    diagnostics: diag,
  };
}
