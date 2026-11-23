/**
 * ZAYRON-X — Event Correlation & Multi-Source Corroboration Engine
 * Governs the epistemic transition from:
 * SOURCE -> OBSERVATION -> CANONICAL EVENT -> EVIDENCE PACK -> REPORT
 * Eliminates duplicate news, detects inter-source conflicts, and calculates deterministic corroboration confidence.
 */

import { ContradictionRecord } from '../analyst/contract';
import { calculateAnalyticalConfidence } from '../analyst/confidence';

export interface ExtractedSignalEntities {
  cves: string[];
  ipv4s: string[];
  sha256s: string[];
  actors: string[];
  malware: string[];
  ttps: string[];
}

export interface IncomingSignalObservation {
  sourceId: string;
  sourceName: string;
  sourceTrustScore: number;
  sourceAuthorityTier: number;
  externalMessageId: string;
  contentHash: string;
  normalizedTitle: string;
  normalizedSummary: string;
  severity: string;
  entities: ExtractedSignalEntities;
  sourceUrl?: string;
  publishedAt: string;
}

export interface ExistingCanonicalEvent {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity: string;
  confidence: number;
  status: string;
  contentHash: string;
  firstSeenAt: string;
  lastUpdatedAt: string;
  entitiesJson: string | Record<string, any>;
  evidenceCount?: number;
}

export interface CorroborationAnalysis {
  isMatch: boolean;
  matchReason?: 'EXACT_CVE' | 'CRYPTOGRAPHIC_IOC' | 'ACTOR_MALWARE_COUPLE' | 'HIGH_SEMANTIC_OVERLAP';
  existingEventId?: string;
  newConfidenceScore: number;
  newConfidenceState: string;
  hasConflict: boolean;
  conflicts: ContradictionRecord[];
  updatedSeverity: string;
  revisionReason?: string;
}

/**
 * Checks if an incoming threat observation matches an existing active canonical event.
 */
export function matchCanonicalEvent(
  signal: IncomingSignalObservation,
  recentEvents: ExistingCanonicalEvent[]
): {
  matchedEvent: ExistingCanonicalEvent | null;
  matchReason?: 'EXACT_CVE' | 'CRYPTOGRAPHIC_IOC' | 'ACTOR_MALWARE_COUPLE' | 'HIGH_SEMANTIC_OVERLAP';
} {
  for (const event of recentEvents) {
    let eventEntities: ExtractedSignalEntities = { cves: [], ipv4s: [], sha256s: [], actors: [], malware: [], ttps: [] };
    try {
      if (typeof event.entitiesJson === 'string') {
        eventEntities = JSON.parse(event.entitiesJson);
      } else if (event.entitiesJson) {
        eventEntities = event.entitiesJson as ExtractedSignalEntities;
      }
    } catch {
      // Fallback
    }

    // 1. Exact CVE match (Highest fidelity anchor)
    if (signal.entities.cves.length > 0 && eventEntities.cves?.length > 0) {
      const commonCves = signal.entities.cves.filter(c => eventEntities.cves.includes(c));
      if (commonCves.length > 0) {
        return { matchedEvent: event, matchReason: 'EXACT_CVE' };
      }
    }

    // 2. Cryptographic IOC overlap (SHA-256 match)
    if (signal.entities.sha256s.length > 0 && eventEntities.sha256s?.length > 0) {
      const commonHashes = signal.entities.sha256s.filter(h => eventEntities.sha256s.includes(h));
      if (commonHashes.length > 0) {
        return { matchedEvent: event, matchReason: 'CRYPTOGRAPHIC_IOC' };
      }
    }

    // 3. Shared Threat Actor + Malware combination
    if (
      signal.entities.actors.length > 0 && 
      signal.entities.malware.length > 0 &&
      eventEntities.actors?.length > 0 &&
      eventEntities.malware?.length > 0
    ) {
      const actorMatch = signal.entities.actors.some(a => eventEntities.actors.includes(a));
      const malwareMatch = signal.entities.malware.some(m => eventEntities.malware.includes(m));
      if (actorMatch && malwareMatch) {
        return { matchedEvent: event, matchReason: 'ACTOR_MALWARE_COUPLE' };
      }
    }
  }

  return { matchedEvent: null };
}

/**
 * Detects epistemic conflicts between an existing canonical event and a new source observation.
 */
export function detectSourceConflicts(
  existingEvent: ExistingCanonicalEvent,
  signal: IncomingSignalObservation,
  existingSources: Array<{ sourceId: string; authorityTier: number }> = []
): { hasConflict: boolean; conflicts: ContradictionRecord[] } {
  const conflicts: ContradictionRecord[] = [];

  let eventEntities: ExtractedSignalEntities = { cves: [], ipv4s: [], sha256s: [], actors: [], malware: [], ttps: [] };
  try {
    if (typeof existingEvent.entitiesJson === 'string') {
      eventEntities = JSON.parse(existingEvent.entitiesJson);
    } else if (existingEvent.entitiesJson && typeof existingEvent.entitiesJson === 'object') {
      eventEntities = existingEvent.entitiesJson as ExtractedSignalEntities;
    }
  } catch {
    // Fallback
  }

  // Check attribution conflict: differing threat actors
  if (
    signal.entities.actors.length > 0 &&
    eventEntities.actors &&
    eventEntities.actors.length > 0 &&
    !signal.entities.actors.some(a => eventEntities.actors.includes(a))
  ) {
    conflicts.push({
      contradictionId: `contra_${Date.now()}_actor`,
      topic: 'Threat Actor Attribution Disagreement',
      sourceA: {
        id: existingEvent.id,
        name: 'Prior Canonical Observations',
        tier: 2,
        claim: `Attributed to ${eventEntities.actors.join(', ')}`,
      },
      sourceB: {
        id: signal.sourceId,
        name: signal.sourceName,
        tier: (signal as any).sourceTier || 2,
        claim: `Attributes to ${signal.entities.actors.join(', ')}`,
      },
      resolutionStatus: 'UNRESOLVED_CONFLICT',
      analystNote: 'Differing threat actor attributions detected between reports.',
    });
  }

  // Check severity disparity (e.g. Critical vs Low)
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
  const existingRank = severityRank[existingEvent.severity.toLowerCase()] || 0;
  const newRank = severityRank[signal.severity.toLowerCase()] || 0;

  if (Math.abs(existingRank - newRank) >= 2) {
    conflicts.push({
      contradictionId: `contra_${Date.now()}_sev`,
      topic: 'Severity Rating Disparity',
      sourceA: {
        id: existingEvent.id,
        name: 'Prior Canonical Observations',
        tier: 2,
        claim: `Classified as ${existingEvent.severity.toUpperCase()}`,
      },
      sourceB: {
        id: signal.sourceId,
        name: signal.sourceName,
        tier: (signal as any).sourceTier || 2,
        claim: `Assesses as ${signal.severity.toUpperCase()}`,
      },
      resolutionStatus: 'UNRESOLVED_CONFLICT',
      analystNote: 'Significant disparity between assessed severity levels.',
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Re-evaluates canonical event confidence following multi-source corroboration.
 */
export function evaluateCorroboration(
  existingEvent: ExistingCanonicalEvent,
  signal: IncomingSignalObservation,
  allSourceTiers: number[]
): CorroborationAnalysis {
  const matchInfo = matchCanonicalEvent(signal, [existingEvent]);
  if (!matchInfo.matchedEvent) {
    return {
      isMatch: false,
      newConfidenceScore: existingEvent.confidence,
      newConfidenceState: existingEvent.status,
      hasConflict: false,
      conflicts: [],
      updatedSeverity: existingEvent.severity,
    };
  }

  // Detect conflicts
  const conflictAnalysis = detectSourceConflicts(existingEvent, signal);

  // Re-calculate confidence using deterministic formula
  const uniqueTiers = Array.from(new Set([...allSourceTiers, signal.sourceAuthorityTier]));
  const sourceCount = allSourceTiers.length + 1;
  const independentCount = Math.max(1, sourceCount);

  let eventEntities: ExtractedSignalEntities = { cves: [], ipv4s: [], sha256s: [], actors: [], malware: [], ttps: [] };
  try {
    if (typeof existingEvent.entitiesJson === 'string') {
      eventEntities = JSON.parse(existingEvent.entitiesJson);
    } else if (existingEvent.entitiesJson) {
      eventEntities = existingEvent.entitiesJson as ExtractedSignalEntities;
    }
  } catch {
    // Fallback
  }

  const hasCve = (eventEntities.cves?.length || 0) > 0 || signal.entities.cves.length > 0;
  const hasCrypto = (eventEntities.sha256s?.length || 0) > 0 || signal.entities.sha256s.length > 0;
  const hasAuth = uniqueTiers.includes(0);

  const confidenceCalc = calculateAnalyticalConfidence({
    sourceTiers: uniqueTiers,
    sourceCount,
    independentSourceCount: independentCount,
    evidenceWeights: [0.85, 0.90],
    contradictions: conflictAnalysis.conflicts,
    hasAuthoritativeStandard: hasAuth,
    hasCryptographicEvidence: hasCrypto,
    hasDirectCveOrWildExploit: hasCve,
  });

  // Severity resolution: prefer higher severity if evidence supports it
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
  const existingRank = severityRank[existingEvent.severity.toLowerCase()] || 0;
  const newRank = severityRank[signal.severity.toLowerCase()] || 0;
  const updatedSeverity = newRank > existingRank ? signal.severity : existingEvent.severity;

  let revisionReason = `Corroborated by independent observation from ${signal.sourceName}`;
  if (conflictAnalysis.hasConflict) {
    revisionReason = `Corroborated with conflicting claims from ${signal.sourceName}`;
  } else if (signal.sourceAuthorityTier === 0) {
    revisionReason = `Primary authoritative confirmation from ${signal.sourceName}`;
  }

  return {
    isMatch: true,
    matchReason: matchInfo.matchReason,
    existingEventId: existingEvent.id,
    newConfidenceScore: confidenceCalc.score,
    newConfidenceState: confidenceCalc.state,
    hasConflict: conflictAnalysis.hasConflict,
    conflicts: conflictAnalysis.conflicts,
    updatedSeverity,
    revisionReason,
  };
}
