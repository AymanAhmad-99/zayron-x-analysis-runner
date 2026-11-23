import {
  AuthorityTier,
  AdmiraltyReliability,
  SourceSnapshot,
  RawAcquisitionResult,
  AdapterNormalizationResult,
  CandidateEvidence,
  CandidateEntity,
  CandidateClaim,
  CandidateRelationship,
  LicenseComplianceStatus,
} from './contracts';

export interface CisaKevVulnerabilityEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: 'Known' | 'Unknown';
  notes?: string;
  cwes?: string[];
}

export interface CisaKevFeedPayload {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: CisaKevVulnerabilityEntry[];
}

/**
 * Deterministic cryptographic hashing utility (SHA-256)
 */
export async function computeSha256Hex(data: Uint8Array | string): Promise<string> {
  // Copy into a fresh Uint8Array backed by an ArrayBuffer: WebCrypto's `BufferSource`
  // rejects views whose backing store may be a SharedArrayBuffer.
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node.js fallback
  const { createHash } = await import('crypto');
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Universal CVE Normalization: strict uppercase CVE-YYYY-NNNN+
 */
export function normalizeCveId(rawCve: string): string {
  const trimmed = rawCve.trim().toUpperCase();
  const match = trimmed.match(/^CVE-[0-9]{4}-[0-9]{4,}$/);
  if (!match) {
    throw new Error(`Invalid CVE identifier format: '${rawCve}'`);
  }
  return match[0];
}

/**
 * CISA Known Exploited Vulnerabilities (KEV) Adapter
 * Strictly adheres to the finalized ZAYRON-X SourceAdapter Contract.
 */
export class CisaKevAdapter {
  public readonly sourceId = 'src_cisa_kev';
  public readonly authorityTier: AuthorityTier = 'TIER_0';
  public readonly defaultReliability: AdmiraltyReliability = 'A';
  public readonly parserVersion = '1.0.0-cisa-kev';

  /**
   * Evaluates licensing restrictions for CISA KEV data
   */
  public evaluateLicense(): LicenseComplianceStatus {
    // CISA KEV is official US Government work in public domain (17 U.S.C. § 105)
    return 'INGEST_ALLOWED';
  }

  /**
   * Parses raw byte stream into structured CISA KEV payload
   */
  public parse(rawBytes: Uint8Array): CisaKevFeedPayload {
    const text = new TextDecoder('utf-8').decode(rawBytes);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`PARSE_FAILED: Malformed CISA KEV JSON: ${e.message}`);
    }

    if (!json || typeof json !== 'object' || !Array.isArray(json.vulnerabilities)) {
      throw new Error('SCHEMA_UNKNOWN: Missing mandatory vulnerabilities array in CISA KEV feed');
    }

    return json as CisaKevFeedPayload;
  }

  /**
   * Normalizes parsed CISA KEV records into candidate entities, claims, and evidence.
   * Strictly enforces the Non-Inference boundary:
   * - No CVSS inference
   * - No EPSS inference
   * - No threat actor inference
   * - No exploit maturity inference
   */
  public async normalize(
    parsed: CisaKevFeedPayload,
    snapshot: SourceSnapshot
  ): Promise<AdapterNormalizationResult> {
    const entities: CandidateEntity[] = [];
    const evidence: CandidateEvidence[] = [];
    const claims: CandidateClaim[] = [];
    const relationships: CandidateRelationship[] = [];

    for (const entry of parsed.vulnerabilities) {
      const normalizedCve = normalizeCveId(entry.cveID);
      const canonicalId = `vuln_${normalizedCve.toLowerCase().replace(/-/g, '_')}`;

      // 1. Evidence Extraction (Layer 1)
      const evidenceStatement = `CISA KEV listing: ${entry.vulnerabilityName}. ${entry.shortDescription}. Required Action: ${entry.requiredAction}. Due Date: ${entry.dueDate}. Ransomware Use: ${entry.knownRansomwareCampaignUse}.`;
      const evidenceUrl = entry.notes?.split(';')[0]?.trim() || `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?cve=${normalizedCve}`;
      const evidenceId = await computeSha256Hex(`${snapshot.snapshot_id}:${normalizedCve}:${evidenceUrl}`);

      const evidenceItem: CandidateEvidence = {
        evidence_id: evidenceId,
        source_snapshot_id: snapshot.snapshot_id,
        evidence_type: 'GOVERNMENT_ASSERTION',
        statement: evidenceStatement,
        url: evidenceUrl,
        published_at: entry.dateAdded ? `${entry.dateAdded}T00:00:00.000Z` : undefined,
        retrieved_at: snapshot.retrieved_at,
        reliability: 'A',
        credibility: '1',
        entity_scope: [canonicalId],
      };
      evidence.push(evidenceItem);

      // 2. Vulnerability Entity Mapping (Layer 2)
      const entity: CandidateEntity = {
        canonical_id: canonicalId,
        entity_type: 'Vulnerability',
        primary_name: normalizedCve,
        aliases: [entry.vulnerabilityName].filter(Boolean),
        external_ids: {
          cve: normalizedCve,
        },
        first_seen: entry.dateAdded ? `${entry.dateAdded}T00:00:00.000Z` : undefined,
        properties: {
          vendor_project: entry.vendorProject?.trim(),
          product: entry.product?.trim(),
          vulnerability_name: entry.vulnerabilityName?.trim(),
          kev_status: true,
          kev_date_added: entry.dateAdded,
          kev_due_date: entry.dueDate,
          kev_required_action: entry.requiredAction,
          known_ransomware_campaign_use: entry.knownRansomwareCampaignUse === 'Known' ? 'KNOWN' : 'UNKNOWN',
        },
      };
      entities.push(entity);

      // 3. Factual Exploitation Status Claim (Layer 4)
      const claimId = await computeSha256Hex(`${canonicalId}:HAS_EXPLOITATION_STATUS:ACTIVE_IN_WILD`);
      const activeClaim: CandidateClaim = {
        claim_id: claimId,
        domain: 'vulnerability',
        subject_id: canonicalId,
        predicate: 'HAS_EXPLOITATION_STATUS',
        object_value: 'ACTIVE_IN_WILD',
        statement: `CISA officially lists ${normalizedCve} in the Known Exploited Vulnerabilities Catalog as of ${entry.dateAdded}.`,
        status: 'CONFIRMED',
        evidence_refs: [evidenceId],
        confidence: 'HIGH',
      };
      claims.push(activeClaim);

      // 4. Ransomware Campaign Use Claim (If explicitly stated by CISA)
      if (entry.knownRansomwareCampaignUse === 'Known') {
        const rClaimId = await computeSha256Hex(`${canonicalId}:HAS_RANSOMWARE_CAMPAIGN_USE:KNOWN`);
        const ransomwareClaim: CandidateClaim = {
          claim_id: rClaimId,
          domain: 'vulnerability',
          subject_id: canonicalId,
          predicate: 'HAS_RANSOMWARE_CAMPAIGN_USE',
          object_value: 'KNOWN',
          statement: `CISA indicates that ${normalizedCve} is known to be used in ransomware campaigns.`,
          status: 'CONFIRMED',
          evidence_refs: [evidenceId],
          confidence: 'HIGH',
        };
        claims.push(ransomwareClaim);
      }
    }

    return {
      entities,
      evidence,
      relationships,
      claims,
      raw_record_count: parsed.vulnerabilities.length,
    };
  }
}
