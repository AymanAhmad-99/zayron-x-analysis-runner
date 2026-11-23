/**
 * ZAYRON-X — CONTRADICTION & DISCREPANCY RESOLUTION ENGINE v2
 * Detects conflicting statements across heterogeneous sources and applies
 * the Authoritative Source Hierarchy without averaging or suppressing disputes.
 */

import { ContradictionRecordV2, ThreatSeverityV2, AuthoritativeEnrichmentV2 } from './types';

export function detectContradictions(params: {
  rawText: string;
  issuingAuthority: string;
  collectionChannel: string;
  enrichment: AuthoritativeEnrichmentV2;
}): ContradictionRecordV2[] {
  const records: ContradictionRecordV2[] = [];
  const text = params.rawText;
  let contraIdx = 1;

  // ── 1. CVSS Severity Discrepancy (Vendor Score vs. Aggregator Headline) ──
  // Check if text claims "Critical" or "0-day" while official CVSS is Medium or Low
  const claimsCriticalOr0Day = /\b(critical\s*severity|critical\s*rce|zero-day|0-day|catastrophic)\b/i.test(text);
  if (
    params.enrichment.cvss_score !== null &&
    params.enrichment.cvss_score < 7.0 &&
    claimsCriticalOr0Day
  ) {
    records.push({
      contradiction_id: `contra_${String(contraIdx++).padStart(2, '0')}`,
      topic: 'Severity & CVSS Rating Divergence',
      source_a: {
        authority: params.issuingAuthority || 'Vendor PSIRT Specification',
        tier: 1,
        claim: `CVSS Base Score registered as ${params.enrichment.cvss_score} (${params.enrichment.cvss_severity}).`,
      },
      source_b: {
        authority: params.collectionChannel || 'Community Feed / Aggregator',
        tier: 3,
        claim: 'Aggregator headline framed advisory as Critical / Zero-Day threat.',
      },
      resolution_status: 'SUPERSEDED_BY_PRIMARY',
      analyst_note:
        'Vendor authoritative CVSS base score takes precedence over aggregator headlines. Severity inflation suppressed in official metrics while noting community concern.',
    });
  }

  // ── 2. Exploitation Status Discrepancy ──
  // Vendor says "no known exploit" but community says "actively exploited"
  const claimsVendorNoExploit = /\b(no\s*known\s*exploitation|no\s*evidence\s*of\s*exploitation|vendor\s*reports\s*no\s*exploit)\b/i.test(text);
  const claimsCommunityExploited = /\b(under\s*active\s*exploitation|actively\s*exploited|in\s*the\s*wild|exploited\s*by\s*threat\s*actors)\b/i.test(text);

  if (claimsVendorNoExploit && (claimsCommunityExploited || params.enrichment.cisa_kev.is_in_kev)) {
    records.push({
      contradiction_id: `contra_${String(contraIdx++).padStart(2, '0')}`,
      topic: 'Exploitation-In-The-Wild Divergence',
      source_a: {
        authority: params.issuingAuthority || 'Vendor Advisory Bulletin',
        tier: 1,
        claim: 'Vendor bulletin states no known active exploitation at publication.',
      },
      source_b: {
        authority: params.enrichment.cisa_kev.is_in_kev ? 'CISA KEV Catalog' : 'Threat Intelligence Community',
        tier: params.enrichment.cisa_kev.is_in_kev ? 0 : 3,
        claim: params.enrichment.cisa_kev.is_in_kev
          ? 'Confirmed entry in CISA Known Exploited Vulnerabilities catalog.'
          : 'Community telemetry asserts active in-the-wild exploitation attempts.',
      },
      resolution_status: params.enrichment.cisa_kev.is_in_kev ? 'SUPERSEDED_BY_PRIMARY' : 'EVIDENTIARY_DISPUTE',
      analyst_note: params.enrichment.cisa_kev.is_in_kev
        ? 'CISA KEV confirmation overrides initial vendor release notes. Exploit status classified as active in the wild.'
        : 'Discrepancy preserved: Vendor denies known exploitation, while community reporting claims active weaponization. Verification pending telemetry corroboration.',
    });
  }

  return records;
}
