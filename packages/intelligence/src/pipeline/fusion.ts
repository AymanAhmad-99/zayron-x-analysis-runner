/**
 * Z.X.INTELLIGENCE — MULTI-SOURCE FUSION & CORRELATION CORE
 * 
 * Fuses telemetry across heterogeneous sources (Telegram, CVEs, Vendor Advisories, Research)
 * into unified, evidence-grounded Intelligence Cases.
 * Detects inter-source contradictions, evaluates source independence vs syndication,
 * and maintains complete claim-to-source traceability.
 */

import { UnifiedIngestionEvent } from './adapters';
import {
  CanonicalIntelligenceObject,
  CanonicalEvidenceItem,
  CanonicalSourceReference,
  CanonicalEntities,
  CanonicalIndicator,
  calculateConfidenceVector,
  evaluatePublicationGate,
  extractCanonicalEntities,
  classifyIntelligenceSignal,
  canonicalIntelligenceType,
  evaluateSignalQuality,
  ThreatSeverity,
  TriagePriority,
  CURRENT_AI_MODEL,
  CURRENT_AI_MODEL_VERSION,
  CURRENT_PROMPT_VERSION,
  SCHEMA_VERSION,
} from './canonical';

export interface SourceConflictRecord {
  conflict_id: string;
  topic: string;
  source_a: { id: string; name: string; claim: string; timestamp: string; authority_tier: number };
  source_b: { id: string; name: string; claim: string; timestamp: string; authority_tier: number };
  conflict_type: 'SEVERITY_DISPARITY' | 'EXPLOITATION_STATUS_DISAGREEMENT' | 'ATTRIBUTION_CONFLICT' | 'AFFECTED_SCOPE_DISPUTE';
  status: 'UNRESOLVED_DISPUTE' | 'SUPERSEDED_BY_AUTHORITY' | 'EVIDENTIARY_DISPUTE';
  analyst_note: string;
}

export interface FusionResult {
  action: 'CREATED_NEW_CASE' | 'CORROBORATED_EXISTING_CASE' | 'CONFLICT_DETECTED';
  case_id: string;
  report: CanonicalIntelligenceObject;
  sources_count: number;
  conflicts: SourceConflictRecord[];
  is_syndicated_lead: boolean;
}

/**
 * Checks whether an incoming Unified Ingestion Event correlates with an existing Canonical Case.
 * Matching dimensions:
 * 1. Exact CVE match
 * 2. Cryptographic indicator match (SHA256, specific C2 IP/domain)
 * 3. Exact Actor + Malware combination
 * 4. High title / lexical token overlap
 */
export function correlateEventWithExistingCase(
  event: UnifiedIngestionEvent,
  entities: {
    cves: Array<{ cve_id: string }>;
    actors: Array<{ name: string }>;
    malware: Array<{ name: string }>;
    indicators: CanonicalIndicator[];
  },
  existingReport: CanonicalIntelligenceObject
): { isCorrelated: boolean; matchType?: string; confidenceBonus: number } {
  // 1. Exact CVE Correlation
  for (const cve of entities.cves) {
    if (existingReport.entities.cves.some(c => c.cve_id.toUpperCase() === cve.cve_id.toUpperCase())) {
      return { isCorrelated: true, matchType: 'EXACT_CVE', confidenceBonus: 0.10 };
    }
  }

  // 2. Cryptographic Indicator Correlation (SHA256, C2 IP, specific domain)
  for (const ind of entities.indicators) {
    if (ind.type === 'sha256' || ind.type === 'ipv4' || ind.type === 'domain') {
      if (existingReport.indicators.some(i => i.type === ind.type && i.value.toLowerCase() === ind.value.toLowerCase())) {
        return { isCorrelated: true, matchType: 'EXACT_INDICATOR', confidenceBonus: 0.08 };
      }
    }
  }

  // 3. Actor + Malware Couple Correlation
  if (entities.actors.length > 0 && entities.malware.length > 0) {
    const actorMatch = existingReport.entities.actors.some(a => entities.actors.some(ea => ea.name.toLowerCase() === a.name.toLowerCase()));
    const malwareMatch = existingReport.entities.malware.some(m => entities.malware.some(em => em.name.toLowerCase() === m.name.toLowerCase()));
    if (actorMatch && malwareMatch) {
      return { isCorrelated: true, matchType: 'ACTOR_MALWARE_COUPLE', confidenceBonus: 0.07 };
    }
  }

  // 4. Vendor Advisory ID Correlation
  if (event.source_type === 'VENDOR_ADVISORY' && event.metadata?.vendor_data?.advisory_id) {
    if (existingReport.body.includes(event.metadata.vendor_data.advisory_id)) {
      return { isCorrelated: true, matchType: 'VENDOR_ADVISORY_ID', confidenceBonus: 0.12 };
    }
  }

  return { isCorrelated: false, confidenceBonus: 0.0 };
}

/**
 * Detects conflicts / contradictions between two reporting sources.
 */
export function detectInterSourceConflicts(
  eventA: {
    sourceId: string;
    sourceName: string;
    severity: string;
    exploitationStatus?: string;
    actors: string[];
    timestamp: string;
    authorityTier: number;
  },
  eventB: {
    sourceId: string;
    sourceName: string;
    severity: string;
    exploitationStatus?: string;
    actors: string[];
    timestamp: string;
    authorityTier: number;
  }
): SourceConflictRecord[] {
  const conflicts: SourceConflictRecord[] = [];

  // Severity Disparity (e.g. Critical vs Low)
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, informational: 0, unknown: 0 };
  const rankA = rank[eventA.severity.toLowerCase()] || 0;
  const rankB = rank[eventB.severity.toLowerCase()] || 0;

  if (Math.abs(rankA - rankB) >= 2) {
    conflicts.push({
      conflict_id: `conf_sev_${Date.now()}`,
      topic: 'Severity Rating Disparity',
      source_a: {
        id: eventA.sourceId,
        name: eventA.sourceName,
        claim: `Assesses severity as ${eventA.severity.toUpperCase()}`,
        timestamp: eventA.timestamp,
        authority_tier: eventA.authorityTier,
      },
      source_b: {
        id: eventB.sourceId,
        name: eventB.sourceName,
        claim: `Assesses severity as ${eventB.severity.toUpperCase()}`,
        timestamp: eventB.timestamp,
        authority_tier: eventB.authorityTier,
      },
      conflict_type: 'SEVERITY_DISPARITY',
      status: 'UNRESOLVED_DISPUTE',
      analyst_note: `Significant disagreement on severity tier between ${eventA.sourceName} (Tier ${eventA.authorityTier}) and ${eventB.sourceName} (Tier ${eventB.authorityTier}). Preserving both assessments for analyst evaluation.`,
    });
  }

  // Threat Actor Attribution Disagreement
  if (eventA.actors.length > 0 && eventB.actors.length > 0) {
    const overlap = eventA.actors.some(a => eventB.actors.some(b => a.toLowerCase() === b.toLowerCase()));
    if (!overlap) {
      conflicts.push({
        conflict_id: `conf_actor_${Date.now()}`,
        topic: 'Threat Actor Attribution Disagreement',
        source_a: {
          id: eventA.sourceId,
          name: eventA.sourceName,
          claim: `Attributes to ${eventA.actors.join(', ')}`,
          timestamp: eventA.timestamp,
          authority_tier: eventA.authorityTier,
        },
        source_b: {
          id: eventB.sourceId,
          name: eventB.sourceName,
          claim: `Attributes to ${eventB.actors.join(', ')}`,
          timestamp: eventB.timestamp,
          authority_tier: eventB.authorityTier,
        },
        conflict_type: 'ATTRIBUTION_CONFLICT',
        status: 'UNRESOLVED_DISPUTE',
        analyst_note: `Attribution disagreement between sources. Retaining as disputed attribution without forced resolution.`,
      });
    }
  }

  return conflicts;
}

/**
 * Fuses an incoming Unified Ingestion Event into a new Canonical Intelligence Object
 * or enriches an existing Canonical Case if correlated.
 */
export function fuseEventIntoCase(
  event: UnifiedIngestionEvent,
  existingReports: CanonicalIntelligenceObject[]
): FusionResult {
  // 1. Extract Entities & Identifiers
  const entities = extractCanonicalEntities(event.content);
  // Augment with structured CVE data if available
  if (event.metadata.cve_data?.cve_id && !entities.cves.some(c => c.cve_id.toUpperCase() === event.metadata.cve_data!.cve_id.toUpperCase())) {
    entities.cves.push({
      cve_id: event.metadata.cve_data.cve_id.toUpperCase(),
      status: event.metadata.is_authoritative ? 'CONFIRMED' : 'OBSERVED',
      severity: typeof event.metadata.cve_data.cvss?.score === 'number' && event.metadata.cve_data.cvss.score >= 9.0 ? 'CRITICAL' : 'HIGH',
    });
  }

  // 2. Classify Event
  const classification = classifyIntelligenceSignal(event.content, event.title);

  // 3. Compute Initial Severity
  let severity: ThreatSeverity = 'MEDIUM';
  if (
    event.metadata.cve_data?.cvss?.score &&
    typeof event.metadata.cve_data.cvss.score === 'number' &&
    event.metadata.cve_data.cvss.score >= 9.0
  ) {
    severity = 'CRITICAL';
  } else if (entities.cves.length > 0 && /rce|remote code execution|zero-day|0-day|in the wild|actively exploited/i.test(event.content)) {
    severity = 'CRITICAL';
  } else if (entities.cves.length > 0 || entities.malware.length > 0 || /exploit|privilege escalation|critical/i.test(event.content)) {
    severity = 'HIGH';
  } else if (/informational|advisory|guide|research|release/i.test(event.content)) {
    severity = 'LOW';
  }
  const priority: TriagePriority = severity === 'CRITICAL' ? 'P1' : severity === 'HIGH' ? 'P2' : 'P3';

  // 4. Multi-Source Correlation Check against Existing Cases
  let correlatedReport: CanonicalIntelligenceObject | null = null;
  let correlationBonus = 0;
  let matchReason = '';

  for (const existing of existingReports) {
    const corr = correlateEventWithExistingCase(event, entities, existing);
    if (corr.isCorrelated) {
      correlatedReport = existing;
      correlationBonus = corr.confidenceBonus;
      matchReason = corr.matchType || 'MULTI_SOURCE_CORRELATION';
      break;
    }
  }

  // Handle Source Independence:
  // If the source is syndicated (e.g. "via @cveNotify"), do not award independent confirmation bonus!
  const isSyndicated = Boolean(event.metadata.is_syndicated);
  if (isSyndicated) {
    correlationBonus = 0;
  }

  // CASE A: Corroboration with Existing Case (ONE CASE, Multiple Sources)
  if (correlatedReport) {
    // Detect Conflicts
    const conflicts = detectInterSourceConflicts(
      {
        sourceId: correlatedReport.source_id,
        sourceName: correlatedReport.source_title,
        severity: correlatedReport.severity,
        actors: correlatedReport.entities.actors.map(a => a.name),
        timestamp: correlatedReport.created_at,
        authorityTier: correlatedReport.source_references[0]?.authority_tier || 2,
      },
      {
        sourceId: event.source_id,
        sourceName: event.source_name,
        severity,
        actors: entities.actors.map(a => a.name),
        timestamp: event.published_at,
        authorityTier: event.metadata.authority_tier || 2,
      }
    );

    // Create New Grounded Evidence Item for the Corroborating Source
    const newEvidence: CanonicalEvidenceItem = {
      evidence_id: `evi_${event.content_hash.slice(0, 12)}`,
      intelligence_id: correlatedReport.intelligence_id,
      claim: event.title,
      evidence_type: `${event.source_type}_TELEMETRY`,
      source_message_id: event.external_id,
      source_id: event.source_id,
      quoted_excerpt: event.content.slice(0, 250),
      source_timestamp: event.published_at,
      source_url: event.external_url || '',
      confidence: Math.min(1.0, event.metadata.source_trust_score || 0.85),
      created_at: new Date().toISOString(),
    };

    // New Source Reference
    const newSourceRef: CanonicalSourceReference = {
      source_id: event.source_id,
      handle: event.metadata.channel_username || null,
      title: event.source_name,
      url: event.external_url || null,
      message_id: event.external_id,
      published_at: event.published_at,
      authority_tier: event.metadata.authority_tier || 2,
    };

    // Calculate Updated Confidence with Corroboration Bonus
    const updatedConfidenceScore = Math.min(
      0.99,
      Math.round((correlatedReport.confidence.overall_confidence + correlationBonus) * 100) / 100
    );
    const updatedConfidence = calculateConfidenceVector(
      Math.max(correlatedReport.confidence.source_reliability, event.metadata.source_trust_score || 0.85),
      Math.max(correlatedReport.confidence.content_confidence, 0.85),
      Math.max(correlatedReport.confidence.entity_confidence, entities.cves.length > 0 ? 0.95 : 0.80)
    );
    updatedConfidence.overall_confidence = updatedConfidenceScore;
    if (updatedConfidenceScore >= 0.85) updatedConfidence.rating = 'VERY_HIGH';
    else if (updatedConfidenceScore >= 0.70) updatedConfidence.rating = 'HIGH';

    // Merge Entities
    for (const cve of entities.cves) {
      if (!correlatedReport.entities.cves.some(c => c.cve_id === cve.cve_id)) {
        correlatedReport.entities.cves.push(cve);
      }
    }
    for (const ind of entities.indicators) {
      if (!correlatedReport.indicators.some(i => i.type === ind.type && i.value === ind.value)) {
        correlatedReport.indicators.push(ind);
      }
    }

    // Attach Evidence and Provenance
    correlatedReport.evidence.push(newEvidence);
    correlatedReport.source_references.push(newSourceRef);
    correlatedReport.confidence = updatedConfidence;
    correlatedReport.updated_at = new Date().toISOString();

    return {
      action: conflicts.length > 0 ? 'CONFLICT_DETECTED' : 'CORROBORATED_EXISTING_CASE',
      case_id: correlatedReport.intelligence_id,
      report: correlatedReport,
      sources_count: correlatedReport.source_references.length,
      conflicts,
      is_syndicated_lead: isSyndicated,
    };
  }

  // CASE B: New Canonical Case Creation
  const intelId = `intel_${event.content_hash.slice(0, 16)}`;
  const confidence = calculateConfidenceVector(
    event.metadata.source_trust_score || 0.85,
    event.content.length > 200 ? 0.90 : 0.75,
    entities.cves.length > 0 ? 0.95 : entities.indicators.length > 0 ? 0.85 : 0.70
  );

  const evidenceItem: CanonicalEvidenceItem = {
    evidence_id: `evi_${event.content_hash.slice(0, 12)}`,
    intelligence_id: intelId,
    claim: event.title,
    evidence_type: `${event.source_type}_OBSERVATION`,
    source_message_id: event.external_id,
    source_id: event.source_id,
    quoted_excerpt: event.content.slice(0, 250),
    source_timestamp: event.published_at,
    source_url: event.external_url || '',
    confidence: confidence.overall_confidence,
    created_at: new Date().toISOString(),
  };

  const sourceRef: CanonicalSourceReference = {
    source_id: event.source_id,
    handle: event.metadata.channel_username || null,
    title: event.source_name,
    url: event.external_url || null,
    message_id: event.external_id,
    published_at: event.published_at,
    authority_tier: event.metadata.authority_tier || 2,
  };

  const newReport: CanonicalIntelligenceObject = {
    intelligence_id: intelId,
    schema_version: SCHEMA_VERSION,
    source_id: event.source_id,
    telegram_source_id: event.source_type === 'TELEGRAM' ? event.external_id : null,
    source_handle: event.metadata.channel_username || null,
    source_title: event.source_name,
    source_category: classification.primaryCategory,
    source_language: event.language || 'en',
    source_region: event.region || 'GLOBAL',
    message_id: event.external_id,
    message_timestamp: event.published_at,
    ingested_at: event.ingested_at,
    processed_at: new Date().toISOString(),
    title: event.title,
    summary: event.content.length > 300 ? event.content.slice(0, 300) + '...' : event.content,
    body: event.content,
    intelligence_type: canonicalIntelligenceType(classification.primaryCategory),
    categories: classification.categories,
    subcategories: classification.subcategories,
    severity,
    priority,
    confidence,
    entities: {
      actors: entities.actors,
      malware: entities.malware,
      cves: entities.cves,
      campaigns: [],
      tools: [],
      techniques: entities.techniques,
      victims: [],
      organizations: event.metadata.vendor_data?.vendor_name ? [event.metadata.vendor_data.vendor_name] : [],
      regions: ['GLOBAL'],
    },
    indicators: entities.indicators,
    evidence: [evidenceItem],
    citations: [event.external_url || event.source_name],
    source_references: [sourceRef],
    ai_analysis: {
      threat_summary: event.content.slice(0, 250),
      why_it_matters: `Telemetry from ${event.source_name} indicates actionable risk along the ${classification.primaryCategory.toLowerCase()} vector. Verification across operational controls advised.`,
      threat_type: classification.primaryCategory,
      recommended_actions: [
        'Inspect SIEM and perimeter firewalls for matching indicators',
        'Review vendor advisories and patch release notes',
        'Isolate endpoints exhibiting correlated anomalous behaviors',
      ],
      timeline: [
        { event: `Source observation recorded via ${event.source_type}`, timestamp: event.published_at },
        { event: 'Canonical ingestion, normalization, and quality gate validation', timestamp: new Date().toISOString() },
      ],
      epistemic_status: event.metadata.is_authoritative ? 'OBSERVED' : 'REPORTED',
    },
    ai_model: CURRENT_AI_MODEL,
    ai_model_version: CURRENT_AI_MODEL_VERSION,
    ai_prompt_version: CURRENT_PROMPT_VERSION,
    deduplication_key: `${event.source_id}:${event.external_id}:${event.content_hash.slice(0, 16)}`,
    content_hash: event.content_hash,
    status: 'PUBLISHED',
    publication_status: 'PUBLISHED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Evaluate Publication Gate
  const pubGate = evaluatePublicationGate(newReport);
  if (!pubGate.passed) {
    newReport.status = 'REVIEW_REQUIRED';
    newReport.publication_status = 'REVIEW_REQUIRED';
  }

  return {
    action: 'CREATED_NEW_CASE',
    case_id: intelId,
    report: newReport,
    sources_count: 1,
    conflicts: [],
    is_syndicated_lead: isSyndicated,
  };
}
