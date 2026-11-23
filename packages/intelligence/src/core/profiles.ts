import type { AnalysisProfile, IntelligenceDomain } from './types';

/**
 * Registry of domain-specific schemas & analysis profiles.
 * New domains (e.g. cloud security, supply chain, OT/ICS) can be registered
 * without modifying any validation or execution logic.
 */
class AnalysisProfileRegistry {
  private profiles: Map<IntelligenceDomain, AnalysisProfile> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public register(profile: AnalysisProfile): void {
    this.profiles.set(profile.domain, profile);
  }

  public get(domain: IntelligenceDomain): AnalysisProfile {
    const profile = this.profiles.get(domain);
    if (!profile) {
      throw new Error(`No analysis profile registered for intelligence domain: "${domain}"`);
    }
    return profile;
  }

  private registerDefaults(): void {
    // 1. Vulnerability Profile
    this.register({
      domain: 'vulnerability',
      fields: [
        { name: 'identity', factType: 'IDENTITY', required: true, allowInference: false },
        { name: 'severity', factType: 'SEVERITY', required: true, allowInference: false },
        { name: 'metric', factType: 'METRIC', required: false, allowInference: false },
        { name: 'affectedTarget', factType: 'AFFECTED_TARGET', required: true, allowInference: false },
        { name: 'fixedTarget', factType: 'FIX_TARGET', required: false, allowInference: false, defaultFallback: 'UNKNOWN' },
        { name: 'exploitationStatus', factType: 'EXPLOITATION_STATUS', required: true, allowInference: false },
        { name: 'mechanism', factType: 'CAPABILITY', required: true, allowInference: true, defaultFallback: 'UNKNOWN' },
      ],
      allowedRelationships: ['AFFECTS', 'EXPLOITS', 'MITIGATED_BY', 'RELATED_TO'],
      criticalFacts: ['identity', 'severity', 'affectedTarget', 'exploitationStatus'],
    });

    // 2. Malware Profile
    this.register({
      domain: 'malware',
      fields: [
        { name: 'family', factType: 'IDENTITY', required: true, allowInference: false },
        { name: 'classification', factType: 'CLASSIFICATION', required: true, allowInference: false },
        { name: 'capabilities', factType: 'CAPABILITY', required: true, allowInference: true, defaultFallback: 'NOT_ESTABLISHED' },
        { name: 'infrastructure', factType: 'INFRASTRUCTURE', required: false, allowInference: false, defaultFallback: 'NOT_ESTABLISHED' },
        { name: 'indicators', factType: 'INDICATOR', required: false, allowInference: false },
      ],
      allowedRelationships: ['COMMUNICATES_WITH', 'DROPS', 'USES', 'DELIVERS', 'ATTRIBUTED_TO'],
      criticalFacts: ['family', 'classification'],
    });

    // 3. Ransomware Profile
    this.register({
      domain: 'ransomware',
      fields: [
        { name: 'family', factType: 'IDENTITY', required: true, allowInference: false },
        { name: 'encryptionMechanism', factType: 'CAPABILITY', required: true, allowInference: true, defaultFallback: 'UNKNOWN' },
        { name: 'victimology', factType: 'AFFECTED_TARGET', required: false, allowInference: true, defaultFallback: 'NOT_ESTABLISHED' },
        { name: 'extortionInfrastructure', factType: 'INFRASTRUCTURE', required: false, allowInference: false, defaultFallback: 'NOT_ESTABLISHED' },
        { name: 'indicators', factType: 'INDICATOR', required: false, allowInference: false },
      ],
      allowedRelationships: ['TARGETS', 'COMMUNICATES_WITH', 'USES', 'DEPLOYS'],
      criticalFacts: ['family'],
    });

    // 4. Threat Actor Profile
    this.register({
      domain: 'threat_actor',
      fields: [
        { name: 'identifier', factType: 'IDENTITY', required: true, allowInference: false },
        { name: 'aliases', factType: 'IDENTITY', required: false, allowInference: false },
        { name: 'motivation', factType: 'CLASSIFICATION', required: false, allowInference: true, defaultFallback: 'UNKNOWN' },
        { name: 'targeting', factType: 'AFFECTED_TARGET', required: false, allowInference: true, defaultFallback: 'NOT_ESTABLISHED' },
        { name: 'attributionConfidence', factType: 'ATTRIBUTION', required: true, allowInference: false },
      ],
      allowedRelationships: ['ATTRIBUTED_TO', 'TARGETS', 'USES', 'DEPLOYS', 'HOSTED_ON'],
      criticalFacts: ['identifier', 'attributionConfidence'],
    });

    // 5. Campaign Profile
    this.register({
      domain: 'campaign',
      fields: [
        { name: 'campaignName', factType: 'IDENTITY', required: true, allowInference: false },
        { name: 'temporalWindow', factType: 'TEMPORAL', required: true, allowInference: false },
        { name: 'objectives', factType: 'CAPABILITY', required: false, allowInference: true, defaultFallback: 'UNKNOWN' },
        { name: 'targetedSectors', factType: 'AFFECTED_TARGET', required: false, allowInference: true, defaultFallback: 'NOT_ESTABLISHED' },
      ],
      allowedRelationships: ['ATTRIBUTED_TO', 'TARGETS', 'USES', 'DEPLOYS'],
      criticalFacts: ['campaignName', 'temporalWindow'],
    });

    // 6. Exploit Profile
    this.register({
      domain: 'exploit',
      fields: [
        { name: 'exploitName', factType: 'IDENTITY', required: true, allowInference: false },
        { name: 'targetedVulnerability', factType: 'AFFECTED_TARGET', required: true, allowInference: false },
        { name: 'weaponizationStatus', factType: 'EXPLOITATION_STATUS', required: true, allowInference: false },
      ],
      allowedRelationships: ['EXPLOITS', 'TARGETS', 'MITIGATED_BY'],
      criticalFacts: ['exploitName', 'targetedVulnerability'],
    });

    // 7. IOC Profile
    this.register({
      domain: 'ioc',
      fields: [
        { name: 'indicatorValue', factType: 'INDICATOR', required: true, allowInference: false },
        { name: 'indicatorType', factType: 'CLASSIFICATION', required: true, allowInference: false },
        { name: 'confidence', factType: 'METRIC', required: true, allowInference: false },
      ],
      allowedRelationships: ['COMMUNICATES_WITH', 'HOSTED_ON', 'RELATED_TO'],
      criticalFacts: ['indicatorValue', 'indicatorType'],
    });
  }
}

export const analysisProfileRegistry = new AnalysisProfileRegistry();
