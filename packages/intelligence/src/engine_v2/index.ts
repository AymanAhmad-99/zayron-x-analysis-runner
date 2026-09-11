/**
 * ZAYRON-X — DEEP INTELLIGENCE ANALYSIS ENGINE v2
 * Master Entry Point & Pipeline Orchestrator
 */

import { enrichAuthoritativeData } from './enrichment';
import { executePreconditionGatedRetrieval } from './knowledge_router';
import { generateStructuredClaims, validateClaims } from './claims';
import { detectContradictions } from './contradictions';
import { compileCanonicalReportV2 } from './compiler';
import { evaluateDeepQualityGateV2, DeepQualityGateResultV2 } from './quality_gate';
import {
  CanonicalReportObjectV2,
  SourceProvenanceItemV2,
  ConfidenceMatrixV2,
  AttackMappingItemV2,
  ThreatSeverityV2,
} from './types';
import { CANONICAL_ACTORS, CANONICAL_MALWARE } from '../resolution/index';

export * from './types';
export * from './enrichment';
export * from './knowledge_router';
export * from './claims';
export * from './contradictions';
export * from './compiler';
export * from './quality_gate';
export * from './shadow_vectorize';
export * from './causality';
export type {
  GroundedCitationInput,
  GeminiReasoningRequest,
  GeminiReasoningResponse,
} from './gemini_reasoner';
export {
  INSUFFICIENT_GROUNDING_SENTENCE,
  buildGeminiReasoningPrompt,
  executeGeminiReasoningSynthesis,
} from './gemini_reasoner';

export interface DeepAnalysisRequestV2 {
  sourceId: string;
  telegramId?: string | null;
  handle?: string | null;
  channelTitle: string;
  messageId: string;
  rawText: string;
  sourceUrl?: string;
  publishedAt?: string;
  sourceTrust?: number;
  authorityTier?: number;
  skipKnowledgeRetrieval?: boolean;
  externalKnowledgeTrace?: import('./types').KnowledgeTraceItemV2[];
}

/**
 * Calculates a multi-dimensional, calibrated confidence matrix.
 */
function calculateCalibratedConfidenceMatrix(params: {
  sourceTrust: number;
  rawTextLength: number;
  hasCve: boolean;
  hasIndicators: boolean;
  hasCorroboration: boolean;
  hasEnrichment?: boolean;
  hasKnowledge?: boolean;
}): ConfidenceMatrixV2 {
  const sourceReliability = Math.max(0.1, Math.min(1.0, params.sourceTrust));
  
  let evidenceScore = 0.20;
  if (params.hasCve) evidenceScore += 0.25;
  if (params.hasIndicators) evidenceScore += 0.25;
  if (params.hasEnrichment) evidenceScore += 0.15;
  if (params.hasKnowledge) evidenceScore += 0.10;
  if (params.rawTextLength > 200) evidenceScore += 0.05;
  const evidenceStrength = Math.max(0.2, Math.min(0.95, evidenceScore));

  const analyticalConfidence = Math.max(
    0.3,
    Math.min(0.95, (sourceReliability * 0.4) + (evidenceStrength * 0.4) + (params.hasCorroboration ? 0.15 : 0.05))
  );

  let rawOverall = (sourceReliability * 0.35) + (evidenceStrength * 0.35) + (analyticalConfidence * 0.30);
  // Cap at 0.70 if evidence strength is low (< 0.50), preventing premature VERY_HIGH ratings
  if (evidenceStrength < 0.50 && rawOverall > 0.70) {
    rawOverall = 0.70;
  }
  const overallConfidence = Math.round(rawOverall * 100) / 100;

  let rating: ConfidenceMatrixV2['rating'] = 'LOW';
  if (overallConfidence >= 0.85) rating = 'VERY_HIGH';
  else if (overallConfidence >= 0.70) rating = 'HIGH';
  else if (overallConfidence >= 0.50) rating = 'MODERATE';
  else if (overallConfidence >= 0.35) rating = 'LOW';
  else rating = 'INSUFFICIENT_EVIDENCE';

  const rationale = `Calculated across Source Reliability (${sourceReliability.toFixed(2)}), Evidence Strength (${evidenceStrength.toFixed(2)}), and Analytical Confidence (${analyticalConfidence.toFixed(2)}).`;

  return {
    source_reliability: sourceReliability,
    evidence_strength: evidenceStrength,
    analytical_confidence: analyticalConfidence,
    overall_confidence: overallConfidence,
    rating,
    calibration_rationale: rationale,
  };
}

/**
 * Executes the complete Deep Intelligence Analysis Engine v2 pipeline.
 */
export function executeDeepIntelligenceAnalysisV2(
  request: DeepAnalysisRequestV2
): {
  report: CanonicalReportObjectV2;
  qualityGate: DeepQualityGateResultV2;
} {
  const rawText = request.rawText.trim();
  const timestamp = request.publishedAt || new Date().toISOString();

  // 1. Compute Deterministic Content Hash
  let hash = 0;
  for (let i = 0; i < rawText.length; i++) {
    hash = (hash << 5) - hash + rawText.charCodeAt(i);
    hash |= 0;
  }
  const contentHash = Math.abs(hash).toString(16).padStart(16, '0') + rawText.length.toString(16).padStart(4, '0');
  const intelId = `intel_${contentHash.slice(0, 16)}`;
  const evidenceId = `evi_${contentHash.slice(0, 12)}`;

  // 2. Entity & Indicator Extraction
  const cveMatches = rawText.match(/\b(CVE-\d{4}-\d{4,7})\b/gi) || [];
  const uniqueCves = Array.from(new Set(cveMatches.map(c => c.toUpperCase())));

  const ipMatches = rawText.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g) || [];
  const publicIps = Array.from(new Set(ipMatches)).filter(ip => !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.'));

  const shaMatches = rawText.match(/\b[a-f0-9]{64}\b/gi) || [];
  const uniqueShas = Array.from(new Set(shaMatches.map(s => s.toLowerCase())));

  const indicators = [
    ...publicIps.map(ip => ({ type: 'ipv4', value: ip })),
    ...uniqueShas.map(sha => ({ type: 'sha256', value: sha })),
  ];

  // 3. Advisory Metadata & Issuing Authority Parsing
  let vendor: string | null = null;
  if (/\b(redhat|red\s*hat)\b/i.test(rawText)) vendor = 'Red Hat';
  else if (/\b(microsoft|msrc)\b/i.test(rawText)) vendor = 'Microsoft';
  else if (/\b(debian)\b/i.test(rawText)) vendor = 'Debian';
  else if (/\b(ubuntu|canonical)\b/i.test(rawText)) vendor = 'Ubuntu';
  else if (/\b(cisa)\b/i.test(rawText)) vendor = 'CISA';
  else if (/\b(sonicwall)\b/i.test(rawText)) vendor = 'SonicWall';
  else if (/\b(palo\s*alto(?:\s*networks)?)\b/i.test(rawText)) vendor = 'Palo Alto Networks';
  else if (/\b(cisco)\b/i.test(rawText)) vendor = 'Cisco';

  const cvssMatch = rawText.match(/CVSS(?:\s*v[34](?:\.[01])?)?(?:\s*Base)?\s*Score:\s*([0-9.]+)(?:\s*\((LOW|MEDIUM|HIGH|CRITICAL)\))?/i);
  const cvssScore = cvssMatch ? parseFloat(cvssMatch[1]) : null;
  const cvssVectorMatch = rawText.match(/\b(CVSS:[34]\.[01]\/[A-Z0-9:\/]+)\b/i);
  const cvssVector = cvssVectorMatch ? cvssVectorMatch[1] : null;

  const pkgMatch = rawText.match(/(?:A flaw was found in|flaw in|vulnerability in|package)\s+([a-zA-Z0-9_\-\.\/]+)/i);
  const affectedProduct = pkgMatch ? pkgMatch[1].replace(/[\.,]$/, '').trim() : null;

  const urlMatches = rawText.match(/https?:\/\/[^\s\)]+/gi) || [];
  const referenceUrls = Array.from(new Set(urlMatches));

  // 4. Actor & Malware Entity Resolution
  const extractedActors: Array<{ name: string; canonical_id?: string; aliases?: string[]; country?: string; motivation?: string }> = [];
  for (const actor of CANONICAL_ACTORS) {
    const actorRegex = new RegExp(`\\b(${actor.name}|${actor.aliases.map(a => a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'i');
    if (actorRegex.test(rawText)) {
      extractedActors.push({
        name: actor.name,
        canonical_id: actor.id,
        aliases: actor.aliases,
        country: actor.country,
        motivation: actor.motivation,
      });
    }
  }

  const extractedMalware: Array<{ name: string; canonical_id?: string; family?: string }> = [];
  for (const mw of CANONICAL_MALWARE) {
    const mwRegex = new RegExp(`\\b(${mw.name}|${mw.aliases.map(a => a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'i');
    if (mwRegex.test(rawText)) {
      extractedMalware.push({
        name: mw.name,
        canonical_id: mw.id,
        family: mw.family,
      });
    }
  }

  const affirmativeActorTelemetry = rawText.split('\n').some(line => {
    const isNegated = /\b(no evidence|not attributed|unknown|unresolved|does not attribute|neither|unconfirmed)\b/i.test(line);
    const mentionsActor = /\b(apt\d+|unc\d+|threat actor|adversary group|lazarus|sandworm|volt typhoon|lockbit|blackcat)\b/i.test(line);
    return mentionsActor && !isNegated;
  });

  const attributedActors = affirmativeActorTelemetry ? extractedActors : [];

  // 5. Authoritative Enrichment & Archetype Classification
  const isVuln = uniqueCves.length > 0;
  const isRansomware = /\b(ransomware|double extortion|encryptor|ransom note|leak site)\b/i.test(rawText) ||
                       extractedMalware.some(m => m.family?.toLowerCase().includes('ransomware') || m.name.toLowerCase().includes('lockbit'));
  const isMalw = extractedMalware.length > 0 || /\b(malware|trojan|stealer|botnet|rat)\b/i.test(rawText);
  const isThreatActor = attributedActors.length > 0 && !isVuln && !isRansomware;
  const isCampaign = /\b(campaign|operation\s+[a-z0-9_\-]+|targeted espionage)\b/i.test(rawText) && !isVuln;
  const isIncident = /\b(volatile memory|memory dump|incident report|intrusion in|active intrusion)\b/i.test(rawText) && !isVuln;

  let reportType: CanonicalReportObjectV2['report_type'] = 'GENERAL_CTI';
  if (isVuln) {
    reportType = 'VULNERABILITY';
  } else if (isRansomware) {
    reportType = 'RANSOMWARE';
  } else if (isThreatActor) {
    reportType = 'THREAT_ACTOR';
  } else if (isCampaign) {
    reportType = 'CAMPAIGN';
  } else if (isMalw) {
    reportType = 'MALWARE';
  } else if (isIncident) {
    reportType = 'INCIDENT_TELEMETRY';
  }

  const enrichment = enrichAuthoritativeData({
    rawText,
    cveId: uniqueCves[0] || null,
    extractedCvssScore: cvssScore,
    extractedCvssSeverity: null,
    extractedCvssVector: cvssVector,
    referenceUrls,
  });

  // 6. Source Provenance Setup (Strict Separation)
  const issuingAuthority = vendor || request.channelTitle || 'Unknown Source';
  const collectionChannel = request.handle ? `@${request.handle}` : request.channelTitle;

  const provenanceItem: SourceProvenanceItemV2 = {
    source_id: request.sourceId,
    issuing_authority: issuingAuthority,
    collection_channel: collectionChannel,
    source_tier: vendor ? 'PRIMARY_FACT_SOURCE' : 'COMMUNITY_DISCOVERY',
    reference_url: referenceUrls[0] || request.sourceUrl || null,
    observed_at: timestamp,
    published_at: timestamp,
    retrieved_at: new Date().toISOString(),
    content_hash: contentHash,
  };

  // 7. Calibrated Multi-Dimensional Confidence
  const hasEnrichment = !!enrichment.cvss_score || !!enrichment.cvss_vector || enrichment.cisa_kev.is_in_kev;
  const confidence = calculateCalibratedConfidenceMatrix({
    sourceTrust: request.sourceTrust || (vendor ? 0.95 : 0.70),
    rawTextLength: rawText.length,
    hasCve: uniqueCves.length > 0,
    hasIndicators: indicators.length > 0,
    hasCorroboration: referenceUrls.length > 1,
    hasEnrichment,
    hasKnowledge: (request.externalKnowledgeTrace || []).length > 0,
  });

  // 8. Domain-Aware Knowledge Retrieval (Precondition Gated)
  const knowledgeResult = request.externalKnowledgeTrace && request.externalKnowledgeTrace.length > 0
    ? {
        domains: ['VULNERABILITY_ANALYSIS' as any],
        knowledge_trace: request.externalKnowledgeTrace,
        used_books: Array.from(new Set(request.externalKnowledgeTrace.filter(k => k.status === 'USED').map(k => k.title || k.document_id))),
      }
    : executePreconditionGatedRetrieval({
        rawText,
        title: rawText.split('\n')[0],
        cves: uniqueCves,
        actors: extractedActors.map(a => a.name),
        malware: extractedMalware.length > 0 ? extractedMalware : (isMalw ? [{ name: 'Malware Sample' }] as any : []),
        indicators,
        skipRetrieval: request.skipKnowledgeRetrieval,
      });

  // 9. ATT&CK Mapping Gate (Strictly Evidence-Grounded)
  const attackMappings: AttackMappingItemV2[] = [];

  // T1190 Gate: Requires explicit web/server telemetry
  const hasWebEvidence = /\b(web\s*server|http\s*daemon|nginx|apache|iis|public-facing|ingress\s*port)\b/i.test(rawText);
  if (hasWebEvidence) {
    attackMappings.push({
      technique_id: 'T1190',
      technique_name: 'Exploit Public-Facing Application',
      tactic: 'Initial Access',
      behavior_observed: 'Advisory documents attack surface exposed via public web/server ingress.',
      evidence_id: evidenceId,
      confidence: 0.85,
    });
  }

  // T1055 Gate: Requires process injection telemetry
  const hasProcessInjectionEvidence = /\b(process\s*injection|process\s*hollowing|dll\s*injection|createremotethread)\b/i.test(rawText);
  if (hasProcessInjectionEvidence) {
    attackMappings.push({
      technique_id: 'T1055',
      technique_name: 'Process Injection',
      tactic: 'Defense Evasion / Privilege Escalation',
      behavior_observed: 'Observed memory injection behavior targeting host process memory.',
      evidence_id: evidenceId,
      confidence: 0.90,
    });
  }

  // 10. Structured Claims Generation & Validation
  const claims = generateStructuredClaims({
    rawText,
    title: rawText.split('\n')[0],
    evidenceId,
    sourceId: request.sourceId,
    enrichment,
    knowledgeTrace: knowledgeResult.knowledge_trace,
    issuingAuthority,
    collectionChannel,
    entities: {
      cves: uniqueCves.map(c => ({ cve_id: c })),
      actors: attributedActors,
      malware: extractedMalware.length > 0 ? extractedMalware : (isMalw ? [{ name: 'Malware' }] : []),
      techniques: attackMappings.map(m => ({ id: m.technique_id, name: m.technique_name })),
      indicators,
    },
    confidenceScore: confidence.overall_confidence,
    timestamp,
  });

  const claimValidation = validateClaims(claims);
  if (!claimValidation.valid) {
    console.warn('[Engine v2] Claim validation warnings:', claimValidation.violations);
  }

  // 10. Contradiction Detection
  const contradictions = detectContradictions({
    rawText,
    issuingAuthority,
    collectionChannel,
    enrichment,
  });

  // 11. Headline and Executive Summary
  const firstLine = rawText.split('\n')[0].replace(/^[#*>\-\s]+/, '').slice(0, 100).trim();
  const headline = enrichment.cve_id
    ? `${enrichment.cve_id}: ${firstLine || 'Vulnerability Advisory'}`
    : (firstLine || 'Cyber Threat Intelligence Telemetry');

  const executiveSummary = rawText.length > 250 ? rawText.slice(0, 250) + '...' : rawText;

  // 12. Canonical 10-Section Report Compilation
  const finalSeverity: ThreatSeverityV2 = enrichment.cvss_severity || 'MEDIUM';
  const compiledReport = compileCanonicalReportV2({
    reportId: intelId,
    reportType,
    rawText,
    headline,
    executiveSummary,
    severity: finalSeverity,
    priority: enrichment.analyst_priority,
    confidence,
    enrichment,
    provenance: [provenanceItem],
    contradictions,
    claims,
    attackMappings,
    knowledgeTrace: knowledgeResult.knowledge_trace,
    evidenceSnippet: rawText.slice(0, 300),
    evidenceId,
    sourceId: request.sourceId,
    indicators,
    affectedProduct,
    rootCause: null,
    generatedAt: timestamp,
  });

  // 13. Multi-Stage Quality Gate Evaluation
  const qualityGate = evaluateDeepQualityGateV2(compiledReport, rawText);
  compiledReport.quality_gate_passed = qualityGate.passed;
  compiledReport.quality_gate_violations = qualityGate.violations;

  return {
    report: compiledReport,
    qualityGate,
  };
}
