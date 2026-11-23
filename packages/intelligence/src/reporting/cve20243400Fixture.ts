/**
 * ZAYRON-X Canonical Vulnerability Fixtures
 * Production-grade canonical intelligence fixture for CVE-2024-3400 PAN-OS Command Injection.
 * Grounded in Layer 5 Canonical Knowledge Model, CISA KEV catalog, and Palo Alto Networks advisory.
 * Hardened for temporal accuracy, epistemic precision, and multidimensional confidence.
 */

import type { ReportCompositionInput } from './engine';

export const CANONICAL_CVE_2024_3400_FIXTURE: ReportCompositionInput = {
  reportId: 'rep_vuln_cve_2024_3400',
  domain: 'VULNERABILITY',
  tlp: 'TLP:CLEAR',
  identity: {
    entityId: 'cve-2024-3400',
    primaryName: 'CVE-2024-3400 PAN-OS Command Injection Vulnerability',
    aliases: ['PAN-SA-2024-0002'],
    externalIds: { CVE: 'CVE-2024-3400' },
  },
  executiveSummary: {
    whatHappened: 'Historical in-the-wild exploitation of a critical command injection flaw in Palo Alto Networks PAN-OS GlobalProtect was recorded in April 2024 by vendor advisories and CISA KEV.',
    whyItMatters: 'Unauthenticated remote code execution with root privileges on edge network firewalls.',
    affectedScope: 'PAN-OS 10.2, 11.0, and 11.1 with GlobalProtect gateway or portal enabled.',
    keyConclusion: 'Severe perimeter risk during the April 2024 disclosure window; current exploitation activity is unknown without fresh sensor telemetry.',
    immediateAction: 'Verify deployment of validated vendor hotfixes (10.2.9-h1, 11.0.4-h1, 11.1.2-h3) or disable telemetry daemon on unpatched gateways.',
  },
  intelligenceAssessment: {
    assessmentSummary: 'Historical exploitation is corroborated by Tier 0 national authority (CISA KEV) and primary vendor advisory. Current real-time exploitation status is UNKNOWN.',
    confidence: {
      level: 'HIGH',
      sourceReliability: 'TIER_0',
      evidenceDirectness: 'SOURCE_DERIVED',
      corroborationCount: 2,
      hasContradictions: false,
      basis: [
        'CISA KEV catalog listing (Tier 0)',
        'Vendor security advisory PAN-SA-2024-0002 (Tier 1)',
      ],
      reasoning: 'Corroborated by Tier 0 national authority and primary vendor for historical exploitation; attribution and current exploitation status remain bounded intelligence gaps.',
      dimensions: {
        historicalExploitation: 'HIGH',
        currentExploitationStatus: 'UNKNOWN',
        threatActorAttribution: 'UNKNOWN',
        vulnerabilityImpact: 'HIGH',
        mitigationEffectiveness: 'HIGH',
      },
    },
    supportingEvidenceRefs: ['ev_cisa_cve_2024_3400', 'ev_pan_advisory_3400'],
    competingHypotheses: [],
    assumptions: ['Target appliances have GlobalProtect interface exposed to WAN'],
    limitations: [
      'Current live exploitation activity cannot be verified without real-time perimeter sensor telemetry',
      'Definitive threat actor attribution has not been corroborated by government authorities',
    ],
    reasoning: 'Authoritative historical records confirm exploitation during the disclosure window, but do not provide an evidentiary basis for current activity claims.',
  },
  whatWeKnow: [
    {
      statementId: 'stmt_1',
      status: 'SOURCE_REPORTED',
      text: 'CISA records CVE-2024-3400 as a Known Exploited Vulnerability cataloged for in-the-wild exploitation.',
      evidenceRefs: ['ev_cisa_cve_2024_3400'],
    },
    {
      statementId: 'stmt_2',
      status: 'SOURCE_REPORTED',
      text: 'Palo Alto Networks released security advisory PAN-SA-2024-0002 confirming command injection exploitation in limited customer environments.',
      evidenceRefs: ['ev_pan_advisory_3400'],
    },
    {
      statementId: 'stmt_3',
      status: 'CORROBORATED',
      text: 'Historical exploitation during April 2024 is corroborated across government advisory and primary vendor telemetry.',
      evidenceRefs: ['ev_cisa_cve_2024_3400', 'ev_pan_advisory_3400'],
    },
  ],
  whatWeDoNotKnow: [
    {
      gapId: 'gap_current_exploitation',
      topic: 'Current Exploitation Status',
      reason: 'No contemporary edge sensor or honeypot telemetry ingested for recent operational windows.',
      evidenceNeeded: 'Live telemetry feeds, fresh honeypot captures, or recent incident response retrospectives.',
      impactOnAssessment: 'Current real-time threat activity cannot be confirmed or ruled out.',
    },
    {
      gapId: 'gap_actor_attribution',
      topic: 'Threat Actor Attribution',
      reason: 'Adversary operational security prevented definitive state or group attribution in public authoritative records.',
      evidenceNeeded: 'Corroborated incident response forensic artifacts and verified C2 overlap.',
      impactOnAssessment: 'Defensive patching remains prioritized regardless of adversary identity.',
    },
    {
      gapId: 'gap_exploit_weaponization',
      topic: 'Commercial / Autonomous Weaponization',
      reason: 'No public automated worming or widespread commercial exploit kit integration evidenced in primary sources.',
      evidenceNeeded: 'Exploit binary artifacts or scanner module captures.',
      impactOnAssessment: 'Exploitation assessed as targeted edge compromise rather than broad commodity scanning.',
    },
  ],
  timeline: [
    {
      timestamp: '2024-04-10T12:00:00Z',
      eventType: 'VENDOR_REPORTED_EXPLOITATION',
      description: 'Palo Alto Networks identifies exploitation of PAN-OS GlobalProtect in limited customer deployments.',
      evidenceRef: 'ev_pan_advisory_3400',
      sourceId: 'palo_alto_networks',
      epistemicStatus: 'SOURCE_REPORTED',
    },
    {
      timestamp: '2024-04-12T18:00:00Z',
      eventType: 'CISA_KEV_CATALOG_ADDITION',
      description: 'CISA adds CVE-2024-3400 to Known Exploited Vulnerabilities catalog with required remediation deadline.',
      evidenceRef: 'ev_cisa_cve_2024_3400',
      sourceId: 'cisa_kev',
      epistemicStatus: 'SOURCE_REPORTED',
    },
  ],
  relationships: [
    {
      relationshipId: 'rel_vuln_product',
      sourceEntityId: 'cve-2024-3400',
      sourceEntityType: 'vulnerability',
      relationshipType: 'AFFECTS',
      targetEntityId: 'prod_pan_os',
      targetEntityType: 'product',
      confidence: 'HIGH',
      evidenceRefs: ['ev_pan_advisory_3400'],
    },
  ],
  iocs: [],
  attackTechniques: [
    {
      techniqueId: 'T1190',
      techniqueName: 'Exploit Public-Facing Application',
      tactic: 'Initial Access',
      detectionOpportunity: 'Audit PAN-OS web server logs and monitor telemetry interface requests for anomalous URI parameters.',
      evidenceRefs: ['ev_pan_advisory_3400'],
      mappingProvenance: 'ANALYST_MAPPED',
    },
  ],
  actions: [
    {
      actionId: 'act_patch_cve_2024_3400',
      urgency: 'REQUIRED',
      title: 'Apply PAN-OS Security Hotfix',
      description: 'Upgrade PAN-OS to 10.2.9-h1, 11.0.4-h1, or 11.1.2-h3 immediately across all GlobalProtect gateways.',
      affectedDomain: 'VULNERABILITY',
      targetEntityId: 'cve-2024-3400',
      evidenceRefs: ['ev_pan_advisory_3400'],
      confidence: 'HIGH',
      guidanceType: 'SOURCE_DERIVED',
      mitigationStatus: 'CURRENT',
    },
    {
      actionId: 'act_disable_telemetry',
      urgency: 'RECOMMENDED',
      title: 'Disable Device Telemetry (Superseded Workaround)',
      description: 'Disabling PAN-OS device telemetry was an early temporary workaround superseded by official hotfix releases; it must not be treated as current recommended remediation.',
      affectedDomain: 'VULNERABILITY',
      targetEntityId: 'cve-2024-3400',
      evidenceRefs: ['ev_pan_advisory_3400'],
      confidence: 'HIGH',
      guidanceType: 'SOURCE_DERIVED',
      mitigationStatus: 'SUPERSEDED',
    },
  ],
  contradictions: [],
  evidenceStore: {
    ev_cisa_cve_2024_3400: {
      citationId: 'cit_1',
      evidenceId: 'ev_cisa_cve_2024_3400',
      sourceId: 'cisa_kev',
      authorityTier: 'TIER_0',
      statement: 'CVE-2024-3400 added to CISA KEV; listed under Known Exploited Vulnerabilities with active in-the-wild exploitation.',
      url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      publishedAt: '2024-04-12T18:00:00Z',
      retrievedAt: '2026-09-13T16:00:00Z',
    },
    ev_pan_advisory_3400: {
      citationId: 'cit_2',
      evidenceId: 'ev_pan_advisory_3400',
      sourceId: 'palo_alto_networks',
      authorityTier: 'TIER_1',
      statement: 'Palo Alto Networks advisory PAN-SA-2024-0002 detailing unauthenticated OS command injection in PAN-OS GlobalProtect.',
      url: 'https://security.paloaltonetworks.com/CVE-2024-3400',
      publishedAt: '2024-04-12T14:00:00Z',
      retrievedAt: '2026-09-13T16:00:00Z',
    },
  },
  domainDetails: {
    cvssScore: 10.0,
    exploitMaturity: 'OBSERVED_EXPLOITATION',
    isKev: true,
    exploitationTemporalStatus: 'HISTORICAL_EXPLOITATION_OBSERVED',
    knownExploitationPeriod: {
      firstKnownExploitation: '2024-04-10',
      latestAvailableExploitationEvidence: '2024-04-12',
    },
    weaponizationStatus: 'UNKNOWN',
  },
};

