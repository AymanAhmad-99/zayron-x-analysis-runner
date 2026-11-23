/**
 * ZAYRON-X Golden Report Fixtures
 * Deterministic synthetic datasets modeling:
 * 1. Vulnerability (CVE-2024-3400 PAN-OS)
 * 2. Exploit (PoC -> Weaponized progression)
 * 3. Malware (Agent Tesla artifact)
 * 4. Threat Actor (APT29 / Midnight Blizzard)
 * 5. Campaign (Operation CloudPulse)
 * 6. Ransomware (LockBit 3.0 Extortion)
 * 7. Indicator (ThreatFox C2 IP with Warninglist)
 * 8. ATT&CK Technique (T1059.001 PowerShell)
 */

import type { ReportCompositionInput } from '../../packages/intelligence/src/reporting/engine';

export const GOLDEN_VULNERABILITY_FIXTURE: ReportCompositionInput = {
  reportId: 'rep_vuln_cve_2024_3400',
  domain: 'VULNERABILITY',
  identity: {
    entityId: 'cve-2024-3400',
    primaryName: 'CVE-2024-3400 PAN-OS Command Injection Vulnerability',
    aliases: ['PAN-SA-2024-0002'],
    externalIds: { CVE: 'CVE-2024-3400' },
  },
  executiveSummary: {
    whatHappened: 'A critical command injection vulnerability in Palo Alto Networks PAN-OS GlobalProtect gateway is actively exploited in the wild.',
    whyItMatters: 'Unauthenticated remote code execution with root privileges on edge network firewalls.',
    affectedScope: 'PAN-OS 10.2, 11.0, and 11.1 with GlobalProtect gateway or portal enabled.',
    keyConclusion: 'Immediate remote compromise risk for exposed perimeter firewalls.',
    immediateAction: 'Apply vendor hotfixes or disable device telemetry as interim mitigation.',
  },
  intelligenceAssessment: {
    assessmentSummary: 'Active exploitation confirmed by CISA KEV and vendor advisories. Exploitation is weaponized against edge appliances.',
    confidence: {
      level: 'HIGH',
      sourceReliability: 'TIER_0',
      evidenceDirectness: 'DIRECT_OBSERVATION',
      corroborationCount: 3,
      hasContradictions: false,
      basis: ['CISA KEV catalog listing', 'Vendor security advisory PAN-SA-2024-0002', 'Independent lab telemetry'],
      reasoning: 'Corroborated by Tier 0 national authority and primary vendor.',
    },
    supportingEvidenceRefs: ['ev_cisa_cve_2024_3400', 'ev_pan_advisory_3400'],
    competingHypotheses: [],
    assumptions: ['Target appliances have GlobalProtect interface exposed to WAN'],
    limitations: ['Full actor attribution remains unconfirmed by government sources'],
    reasoning: 'Direct evidence of in-the-wild exploitation satisfies high-confidence threshold.',
  },
  whatWeKnow: [
    {
      statementId: 'stmt_1',
      status: 'OBSERVED',
      text: 'Exploitation of CVE-2024-3400 observed in the wild.',
      evidenceRefs: ['ev_cisa_cve_2024_3400'],
    },
    {
      statementId: 'stmt_2',
      status: 'REPORTED',
      text: 'Palo Alto Networks released hotfix advisory PAN-SA-2024-0002.',
      evidenceRefs: ['ev_pan_advisory_3400'],
    },
  ],
  whatWeDoNotKnow: [
    {
      gapId: 'gap_actor_attribution',
      topic: 'Threat Actor Attribution',
      reason: 'Adversary operational security prevented definitive state attribution.',
      evidenceNeeded: 'Corroborated incident response telemetry or forensic artifacts.',
      impactOnAssessment: 'Low impact on immediate defensive patching prioritization.',
    },
  ],
  timeline: [
    {
      timestamp: '2024-04-10T12:00:00Z',
      eventType: 'FIRST_OBSERVED_EXPLOITATION',
      description: 'Vendor detects active exploitation in customer environments.',
      evidenceRef: 'ev_pan_advisory_3400',
      sourceId: 'palo_alto_networks',
    },
    {
      timestamp: '2024-04-12T18:00:00Z',
      eventType: 'CISA_KEV_CATALOG_ADDITION',
      description: 'CISA adds CVE-2024-3400 to Known Exploited Vulnerabilities catalog.',
      evidenceRef: 'ev_cisa_cve_2024_3400',
      sourceId: 'cisa_kev',
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
      detectionOpportunity: 'Monitor web server access logs for anomalous POST requests to /ssl-vpn/ hipreport.esp',
      evidenceRefs: ['ev_pan_advisory_3400'],
      mappingProvenance: 'ANALYST_MAPPED',
    },
  ],
  actions: [
    {
      actionId: 'act_patch_cve_2024_3400',
      urgency: 'REQUIRED',
      title: 'Apply PAN-OS Security Hotfix',
      description: 'Upgrade PAN-OS to 10.2.9-h1, 11.0.4-h1, or 11.1.2-h3 immediately.',
      affectedDomain: 'VULNERABILITY',
      targetEntityId: 'cve-2024-3400',
      evidenceRefs: ['ev_pan_advisory_3400'],
      confidence: 'HIGH',
    },
  ],
  contradictions: [],
  evidenceStore: {
    ev_cisa_cve_2024_3400: {
      citationId: 'cit_1',
      evidenceId: 'ev_cisa_cve_2024_3400',
      sourceId: 'cisa_kev',
      authorityTier: 'TIER_0',
      statement: 'CVE-2024-3400 added to CISA KEV; confirmed active exploitation in the wild.',
      url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      retrievedAt: '2024-04-12T19:00:00Z',
    },
    ev_pan_advisory_3400: {
      citationId: 'cit_2',
      evidenceId: 'ev_pan_advisory_3400',
      sourceId: 'palo_alto_networks',
      authorityTier: 'TIER_1',
      statement: 'Palo Alto Networks security advisory for command injection in PAN-OS GlobalProtect.',
      url: 'https://security.paloaltonetworks.com/CVE-2024-3400',
      retrievedAt: '2024-04-12T14:00:00Z',
    },
  },
  domainDetails: {
    cvssScore: 10.0,
    exploitMaturity: 'OBSERVED_EXPLOITATION',
    isKev: true,
  },
};

export const GOLDEN_EXPLOIT_FIXTURE: ReportCompositionInput = {
  reportId: 'rep_exploit_cve_2024_21887',
  domain: 'EXPLOIT',
  identity: {
    entityId: 'exploit-cve-2024-21887',
    primaryName: 'Ivanti Connect Secure Command Injection Exploit',
    aliases: ['CVE-2024-21887-PoC'],
  },
  executiveSummary: {
    whatHappened: 'Public proof-of-concept exploit published enabling unauthenticated command execution.',
    whyItMatters: 'Enables complete system compromise of Ivanti Connect Secure VPN appliances.',
    affectedScope: 'Ivanti Connect Secure and Policy Secure gateways.',
    keyConclusion: 'Public exploit functional capability confirmed.',
    immediateAction: 'Apply vendor mitigation configuration XML immediately.',
  },
  intelligenceAssessment: {
    assessmentSummary: 'Functional public exploit code is widely available and reproducible in lab environments.',
    confidence: {
      level: 'HIGH',
      sourceReliability: 'TIER_2',
      evidenceDirectness: 'DIRECT_OBSERVATION',
      corroborationCount: 2,
      hasContradictions: false,
      basis: ['GitHub public exploit code repository', 'Lab dynamic test reproduction'],
      reasoning: 'Exploit code verified directly in analyst lab.',
    },
    supportingEvidenceRefs: ['ev_exploit_gh_repo'],
    reasoning: 'Direct code review and dynamic testing prove functional capability.',
  },
  whatWeKnow: [
    {
      statementId: 'stmt_exp_1',
      status: 'OBSERVED',
      text: 'Proof-of-concept Python script successfully executes arbitrary shell commands.',
      evidenceRefs: ['ev_exploit_gh_repo'],
    },
  ],
  whatWeDoNotKnow: [
    {
      gapId: 'gap_exploit_weaponization',
      topic: 'Commercial Weaponization',
      reason: 'No automated worm or widespread botnet integration observed.',
      evidenceNeeded: 'Honeypot telemetry or automated scanning logs.',
      impactOnAssessment: 'Exploitation remains manual or targeted.',
    },
  ],
  timeline: [
    {
      timestamp: '2024-01-15T10:00:00Z',
      eventType: 'PUBLIC_POC_RELEASED',
      description: 'Security researcher publishes working exploit script.',
      evidenceRef: 'ev_exploit_gh_repo',
      sourceId: 'github_research',
    },
  ],
  actions: [
    {
      actionId: 'act_mitigate_ivanti',
      urgency: 'REQUIRED',
      title: 'Import Mitigation XML',
      description: 'Apply the vendor mitigation file to block vulnerable URI endpoints.',
      affectedDomain: 'EXPLOIT',
      targetEntityId: 'exploit-cve-2024-21887',
      evidenceRefs: ['ev_exploit_gh_repo'],
      confidence: 'HIGH',
    },
  ],
  evidenceStore: {
    ev_exploit_gh_repo: {
      citationId: 'cit_gh_1',
      evidenceId: 'ev_exploit_gh_repo',
      sourceId: 'github_research',
      authorityTier: 'TIER_2',
      statement: 'Functional Python PoC demonstrating command injection via SAML endpoint.',
      retrievedAt: '2024-01-16T00:00:00Z',
    },
  },
  domainDetails: {
    exploitMaturity: 'PUBLIC_EXPLOIT',
    preconditions: ['Network reachability to web management interface'],
  },
};

export const GOLDEN_MALWARE_FIXTURE: ReportCompositionInput = {
  reportId: 'rep_malware_agent_tesla',
  domain: 'MALWARE',
  identity: {
    entityId: 'malware-agent-tesla',
    primaryName: 'Agent Tesla Infostealer',
    aliases: ['AgentTesla', 'Negasteal'],
  },
  executiveSummary: {
    whatHappened: 'Agent Tesla infostealer artifact analyzed with credential harvesting and keylogging capabilities.',
    whyItMatters: 'Extracts credentials from browsers, email clients, and FTP applications.',
    affectedScope: 'Windows endpoints.',
    keyConclusion: 'Active infostealer payload communicating with remote SMTP C2 server.',
    immediateAction: 'Block identified C2 IP address and hunt for hash across endpoint telemetry.',
  },
  intelligenceAssessment: {
    assessmentSummary: 'Sample exhibits signature Agent Tesla compilation and configuration structure.',
    confidence: {
      level: 'HIGH',
      sourceReliability: 'TIER_2',
      evidenceDirectness: 'DIRECT_OBSERVATION',
      corroborationCount: 2,
      hasContradictions: false,
      basis: ['MalwareBazaar sample metadata', 'Static binary analysis'],
      reasoning: 'Cryptographic hash and binary strings match canonical family signatures.',
    },
    supportingEvidenceRefs: ['ev_mb_sample_tesla'],
    reasoning: 'Sample analysis confirms infostealer behaviors.',
  },
  whatWeKnow: [
    {
      statementId: 'stmt_mal_1',
      status: 'OBSERVED',
      text: 'Sample matches SHA256 7b52009b64fd0a2a49e6d8a939753077792b0554f776c14101e434c44f346b0a.',
      evidenceRefs: ['ev_mb_sample_tesla'],
    },
  ],
  whatWeDoNotKnow: [
    {
      gapId: 'gap_threat_actor_link',
      topic: 'Threat Actor Association',
      reason: 'Agent Tesla is a commodity malware sold on criminal forums, used by hundreds of independent actors.',
      evidenceNeeded: 'Dedicated campaign telemetry or unique infrastructure overlap.',
      impactOnAssessment: 'Attribution to specific APT is impossible and unjustified.',
    },
  ],
  timeline: [
    {
      timestamp: '2026-03-01T08:00:00Z',
      eventType: 'SAMPLE_FIRST_SEEN',
      description: 'Sample uploaded to MalwareBazaar repository.',
      evidenceRef: 'ev_mb_sample_tesla',
      sourceId: 'malwarebazaar',
    },
  ],
  iocs: [
    {
      iocType: 'sha256',
      value: '7b52009b64fd0a2a49e6d8a939753077792b0554f776c14101e434c44f346b0a',
      confidence: 'HIGH',
      evidenceRefs: ['ev_mb_sample_tesla'],
    },
    {
      iocType: 'ip:port',
      value: '198.51.100.44:587',
      confidence: 'HIGH',
      evidenceRefs: ['ev_mb_sample_tesla'],
    },
  ],
  actions: [
    {
      actionId: 'act_block_tesla_ioc',
      urgency: 'REQUIRED',
      title: 'Block Agent Tesla C2 IP',
      description: 'Add 198.51.100.44 to perimeter firewall drop rules.',
      affectedDomain: 'MALWARE',
      targetEntityId: 'malware-agent-tesla',
      evidenceRefs: ['ev_mb_sample_tesla'],
      confidence: 'HIGH',
      scope: 'SAMPLE-SPECIFIC',
    },
  ],
  evidenceStore: {
    ev_mb_sample_tesla: {
      citationId: 'cit_mb_1',
      evidenceId: 'ev_mb_sample_tesla',
      sourceId: 'malwarebazaar',
      authorityTier: 'TIER_2',
      statement: 'MalwareBazaar sample record for Agent Tesla infostealer payload.',
      retrievedAt: '2026-03-01T09:00:00Z',
    },
  },
  domainDetails: {
    malwareFamily: 'Agent Tesla',
  },
};

export const GOLDEN_THREAT_ACTOR_FIXTURE: ReportCompositionInput = {
  reportId: 'rep_actor_apt29',
  domain: 'THREAT_ACTOR',
  identity: {
    entityId: 'actor-apt29',
    primaryName: 'APT29 (Midnight Blizzard)',
    aliases: ['Nobelium', 'Cozy Bear'],
  },
  executiveSummary: {
    whatHappened: 'Tracked cyber espionage group conducting identity token compromise and cloud tenant targeting.',
    whyItMatters: 'Targets government, diplomatic, and defense entities for persistent espionage.',
    affectedScope: 'Global enterprise cloud environments.',
    keyConclusion: 'Highly capable state-sponsored threat group with advanced operational discipline.',
    immediateAction: 'Audit tenant federation configurations and enforce FIDO2 phishing-resistant MFA.',
  },
  intelligenceAssessment: {
    assessmentSummary: 'ZAYRON-X assesses with High Confidence that APT29 remains focused on cloud persistence.',
    confidence: {
      level: 'HIGH',
      sourceReliability: 'TIER_1',
      evidenceDirectness: 'DIRECT_OBSERVATION',
      corroborationCount: 3,
      hasContradictions: false,
      basis: ['Microsoft Security Research reports', 'CISA advisory on SVR operations', 'Mandiant M-Trends'],
      reasoning: 'Direct corroboration across multiple Tier 0 and Tier 1 industry leaders.',
    },
    supportingEvidenceRefs: ['ev_msft_apt29', 'ev_cisa_svr'],
    reasoning: 'Attribution backed by cryptographic artifact overlap and tenant token forgery.',
  },
  whatWeKnow: [
    {
      statementId: 'stmt_act_1',
      status: 'OBSERVED',
      text: 'Adversary leveraged password spraying against non-MFA service accounts.',
      evidenceRefs: ['ev_msft_apt29'],
    },
  ],
  whatWeDoNotKnow: [
    {
      gapId: 'gap_future_targets',
      topic: 'Specific Sector Targeting List',
      reason: 'Operations are conducted stealthily with dynamic cloud infrastructure.',
      evidenceNeeded: 'Expanded cloud provider telemetry.',
      impactOnAssessment: 'Broad defensive posture required across all tenants.',
    },
  ],
  timeline: [
    {
      timestamp: '2024-01-12T00:00:00Z',
      eventType: 'TENANT_INTRUSION_DETECTED',
      description: 'Unauthorized access detected via compromised test tenant account.',
      evidenceRef: 'ev_msft_apt29',
      sourceId: 'microsoft_security',
    },
  ],
  actions: [
    {
      actionId: 'act_audit_cloud_mfa',
      urgency: 'REQUIRED',
      title: 'Enforce Phishing-Resistant MFA',
      description: 'Require hardware token authentication for all administrative cloud accounts.',
      affectedDomain: 'THREAT_ACTOR',
      targetEntityId: 'actor-apt29',
      evidenceRefs: ['ev_msft_apt29'],
      confidence: 'HIGH',
    },
  ],
  evidenceStore: {
    ev_msft_apt29: {
      citationId: 'cit_msft_1',
      evidenceId: 'ev_msft_apt29',
      sourceId: 'microsoft_security',
      authorityTier: 'TIER_1',
      statement: 'Microsoft Threat Intelligence report on Midnight Blizzard cloud operations.',
      retrievedAt: '2024-01-20T00:00:00Z',
    },
    ev_cisa_svr: {
      citationId: 'cit_cisa_svr',
      evidenceId: 'ev_cisa_svr',
      sourceId: 'cisa_advisories',
      authorityTier: 'TIER_0',
      statement: 'CISA joint cybersecurity advisory on Russian SVR cyber operations.',
      retrievedAt: '2024-01-25T00:00:00Z',
    },
  },
  domainDetails: {
    actorMotivations: ['State Espionage', 'Strategic Intelligence Gathering'],
  },
};
