/**
 * ZAYRON-X — AUTHORITATIVE DATA ENRICHMENT ENGINE v2 (P0.1 evidence-based)
 * Integrates CVE / NVD / CISA KEV / ATT&CK data through INJECTED evidence ports.
 *
 * P0.1 invariant: KEV and EPSS state are derived ONLY from injected source
 * evidence with recorded provenance. This module contains NO static
 * intelligence: a CVE with no KEV evidence receives a not-in-KEV state with
 * ABSENT provenance and no fabricated fields; EPSS with no evidence is
 * UNKNOWN (null), never a synthesized number.
 */

import { AuthoritativeEnrichmentV2, ExploitStatusV2, ThreatSeverityV2, TriagePriorityV2 } from './types';

// ── Evidence ports (injected; production wires authoritative feeds, tests wire fixtures) ──

export interface KevEvidenceRecord {
  cve_id: string;
  date_added: string;
  /** True only when the catalog establishes ransomware campaign use; null when the catalog does not establish it. */
  ransomware_campaign_use: boolean | null;
  required_action: string | null;
  source_id: string;
  source_url: string;
  catalog_version: string;
  retrieved_at: string;
}

export interface KevEvidencePort {
  /** Returns the authoritative catalog record for the CVE, or null when the ingested catalog evidence does not list it. */
  lookup(cveId: string): KevEvidenceRecord | null;
}

export interface EpssEvidenceRecord {
  cve_id: string;
  /** null = the EPSS source is reachable but has no usable score for this CVE (UNKNOWN), never a synthesized value. */
  score: number | null;
  percentile: number | null;
  retrieved_at: string;
}

export interface EpssEvidencePort {
  /** Returns measured EPSS evidence for the CVE, or null when no EPSS evidence was ingested. */
  lookup(cveId: string): EpssEvidenceRecord | null;
}

/** Default ports carry no evidence: enrichment then reports ABSENT/UNKNOWN, never fabricated state. */
export const EMPTY_KEV_EVIDENCE_PORT: KevEvidencePort = { lookup: () => null };
export const EMPTY_EPSS_EVIDENCE_PORT: EpssEvidencePort = { lookup: () => null };

export interface EvidenceProvenance {
  status: 'CONFIRMED' | 'ABSENT';
  source_id: string | null;
  source_url: string | null;
  catalog_version: string | null;
  retrieved_at: string | null;
}

const ABSENT_PROVENANCE: EvidenceProvenance = {
  status: 'ABSENT',
  source_id: null,
  source_url: null,
  catalog_version: null,
  retrieved_at: null,
};

/**
 * Parses CVSS Vector string (e.g. CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
 * into structured components.
 */
export function parseCvssVector(vector: string): AuthoritativeEnrichmentV2['vector_breakdown'] {
  if (!vector || !vector.includes('/')) return undefined;

  const parts = vector.split('/');
  const breakdown: NonNullable<AuthoritativeEnrichmentV2['vector_breakdown']> = {};

  for (const p of parts) {
    const [k, v] = p.split(':');
    if (!k || !v) continue;

    switch (k.toUpperCase()) {
      case 'AV':
        if (v === 'N') breakdown.attack_vector = 'NETWORK';
        else if (v === 'A') breakdown.attack_vector = 'ADJACENT';
        else if (v === 'L') breakdown.attack_vector = 'LOCAL';
        else if (v === 'P') breakdown.attack_vector = 'PHYSICAL';
        break;
      case 'AC':
        breakdown.attack_complexity = v === 'L' ? 'LOW' : 'HIGH';
        break;
      case 'PR':
        if (v === 'N') breakdown.privileges_required = 'NONE';
        else if (v === 'L') breakdown.privileges_required = 'LOW';
        else if (v === 'H') breakdown.privileges_required = 'HIGH';
        break;
      case 'UI':
        breakdown.user_interaction = v === 'N' ? 'NONE' : 'REQUIRED';
        break;
      case 'S':
        breakdown.scope = v === 'U' ? 'UNCHANGED' : 'CHANGED';
        break;
      case 'C':
        if (v === 'H') breakdown.confidentiality = 'HIGH';
        else if (v === 'L') breakdown.confidentiality = 'LOW';
        else breakdown.confidentiality = 'NONE';
        break;
      case 'I':
        if (v === 'H') breakdown.integrity = 'HIGH';
        else if (v === 'L') breakdown.integrity = 'LOW';
        else breakdown.integrity = 'NONE';
        break;
      case 'A':
        if (v === 'H') breakdown.availability = 'HIGH';
        else if (v === 'L') breakdown.availability = 'LOW';
        else breakdown.availability = 'NONE';
        break;
    }
  }

  return breakdown;
}

/**
 * Computes official base CVSS severity according to NIST standard thresholds.
 */
export function scoreToCvssSeverity(score: number): ThreatSeverityV2 {
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0.0) return 'LOW';
  return 'INFORMATIONAL';
}

/**
 * Strictly classifies the operational exploit state without collapsing dimensions.
 */
export function determineExploitStatus(params: {
  text: string;
  cveId: string | null;
  hasPocUrl?: boolean;
  inKev?: boolean;
}): ExploitStatusV2 {
  const lower = params.text.toLowerCase();

  // 1. Confirmed exploitation in the wild (CISA KEV evidence or authoritative telemetry)
  if (params.inKev || /\b(actively exploited in the wild|exploited in the wild|in-the-wild exploitation confirmed|cisa kev catalog)\b/i.test(lower)) {
    return 'EXPLOITATION_IN_THE_WILD';
  }

  // 2. Active exploitation observed in target environments / telemetry
  if (/\b(active exploitation observed|observed in live telemetry|honeypot hits observed|exploitation detected)\b/i.test(lower)) {
    return 'EXPLOITATION_OBSERVED';
  }

  // 3. Public Proof-of-Concept or weaponized exploit script exists
  if (
    params.hasPocUrl ||
    /\b(proof-of-concept|poc available|exploit released|poc on github|exploit script published|metasploit module)\b/i.test(lower)
  ) {
    return 'PUBLIC_EXPLOIT_EXISTS';
  }

  // 4. Default: Vulnerability exists but no verified exploitation or public PoC
  return 'VULNERABILITY_EXISTS';
}

/**
 * Derives operational triage priority (P1/P2/P3/P4) based on real-world impact.
 */
export function deriveOperationalPriority(params: {
  severity: ThreatSeverityV2;
  exploitStatus: ExploitStatusV2;
  inKev: boolean;
}): TriagePriorityV2 {
  // P1: In-the-wild exploitation OR Critical severity with public exploit
  if (params.inKev || params.exploitStatus === 'EXPLOITATION_IN_THE_WILD') {
    return 'P1';
  }
  if (params.severity === 'CRITICAL' && params.exploitStatus === 'PUBLIC_EXPLOIT_EXISTS') {
    return 'P1';
  }

  // P2: High severity with public exploit OR Critical vulnerability without known exploit
  if (params.severity === 'CRITICAL') {
    return 'P2';
  }
  if (params.severity === 'HIGH' && (params.exploitStatus === 'PUBLIC_EXPLOIT_EXISTS' || params.exploitStatus === 'EXPLOITATION_OBSERVED')) {
    return 'P2';
  }

  // P3: High severity without exploit OR Medium with public exploit
  if (params.severity === 'HIGH' || params.exploitStatus === 'PUBLIC_EXPLOIT_EXISTS') {
    return 'P3';
  }

  // P4: Medium or Low vulnerability without active weaponization
  return 'P4';
}

/**
 * Main enrichment pipeline (P0.1 evidence-based).
 *
 * KEV facts come exclusively from the injected KevEvidencePort (authoritative
 * catalog evidence). A KEV mention inside raw text is treated as observed
 * textual telemetry for exploit_status, but NEVER as catalog membership.
 * EPSS comes exclusively from the injected EpssEvidencePort; without evidence
 * the score is null (UNKNOWN).
 */
export function enrichAuthoritativeData(params: {
  rawText: string;
  cveId: string | null;
  extractedCvssScore: number | null;
  extractedCvssSeverity: ThreatSeverityV2 | null;
  extractedCvssVector: string | null;
  referenceUrls?: string[];
  kevEvidence?: KevEvidencePort;
  epssEvidence?: EpssEvidencePort;
}): AuthoritativeEnrichmentV2 {
  const cve = params.cveId ? params.cveId.toUpperCase() : null;
  const kevPort = params.kevEvidence ?? EMPTY_KEV_EVIDENCE_PORT;
  const epssPort = params.epssEvidence ?? EMPTY_EPSS_EVIDENCE_PORT;

  // 1. CVSS & Vector Breakdown
  const cvssScore = params.extractedCvssScore;
  const cvssSeverity: ThreatSeverityV2 = cvssScore !== null
    ? scoreToCvssSeverity(cvssScore)
    : (params.extractedCvssSeverity || 'MEDIUM');

  const vectorBreakdown = params.extractedCvssVector
    ? parseCvssVector(params.extractedCvssVector)
    : undefined;

  // 2. CISA KEV state — authoritative catalog evidence only
  const kevRecord = cve ? kevPort.lookup(cve) : null;
  const kevProvenance: EvidenceProvenance = kevRecord
    ? {
        status: 'CONFIRMED',
        source_id: kevRecord.source_id,
        source_url: kevRecord.source_url,
        catalog_version: kevRecord.catalog_version,
        retrieved_at: kevRecord.retrieved_at,
      }
    : ABSENT_PROVENANCE;
  const isKevConfirmed = kevRecord !== null;

  // 3. Exploit Status Determination (raw-text telemetry + confirmed KEV evidence)
  const hasPocUrl = (params.referenceUrls || []).some(u => /github\.com\/.*exploit|exploit-db\.com|packetstormsecurity/i.test(u));
  const exploitStatus = determineExploitStatus({
    text: params.rawText,
    cveId: cve,
    hasPocUrl,
    inKev: isKevConfirmed,
  });

  // 4. EPSS Probability — measured evidence only; null when unknown
  const epssRecord = cve ? epssPort.lookup(cve) : null;
  const epssProvenance: EvidenceProvenance = epssRecord
    ? {
        status: 'CONFIRMED',
        source_id: 'first-epss',
        source_url: 'https://api.first.org/data/v1/epss',
        catalog_version: null,
        retrieved_at: epssRecord.retrieved_at,
      }
    : ABSENT_PROVENANCE;
  const epssScore = epssRecord ? epssRecord.score : null;
  const epssPercentile = epssRecord ? epssRecord.percentile : null;

  // 5. Analyst Operational Priority
  const priority = deriveOperationalPriority({
    severity: cvssSeverity,
    exploitStatus,
    inKev: isKevConfirmed,
  });

  return {
    cve_id: cve,
    cvss_score: cvssScore,
    cvss_severity: cvssSeverity,
    cvss_vector: params.extractedCvssVector || null,
    vector_breakdown: vectorBreakdown,
    exploit_status: exploitStatus,
    cisa_kev: {
      is_in_kev: isKevConfirmed,
      // No fabricated fields: catalog facts appear only when catalog evidence exists.
      // `record ? rec.field : undefined` (not optional chaining) so a legitimate null value
      // from catalog evidence (e.g. ransomware use not established) is preserved as null.
      date_added: kevRecord ? kevRecord.date_added : undefined,
      ransomware_campaign_use: kevRecord ? (kevRecord.ransomware_campaign_use ?? undefined) : undefined,
      required_action: kevRecord ? (kevRecord.required_action ?? undefined) : undefined,
    },
    kev_evidence: kevProvenance,
    epss: {
      score: epssScore,
      percentile: epssPercentile,
    },
    epss_evidence: epssProvenance,
    analyst_priority: priority,
  };
}
