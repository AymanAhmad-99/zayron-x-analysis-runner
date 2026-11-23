import type { SourceDefinition, AuthorityTier, IntelligenceDomain, CanonicalFactType } from './types';

/**
 * Domain-Agnostic Source Registry & Fact-Aware Authority Governance
 * 
 * Replaces hardcoded hostname checks with a structured, metadata-driven registry.
 */
class SourceRegistry {
  private sources: Map<string, SourceDefinition> = new Map();

  constructor() {
    this.registerDefaultSources();
  }

  public register(source: SourceDefinition): void {
    this.sources.set(source.sourceId, source);
  }

  public get(sourceId: string): SourceDefinition | undefined {
    return this.sources.get(sourceId);
  }

  public findByDomain(hostname: string): SourceDefinition | undefined {
    const cleanHost = hostname.toLowerCase().replace(/^www\./, '');
    for (const source of this.sources.values()) {
      if (source.domain && (cleanHost === source.domain || cleanHost.endsWith(`.${source.domain}`))) {
        return source;
      }
    }
    return undefined;
  }

  public isAuthorizedForFact(sourceId: string, factType: CanonicalFactType): boolean {
    const source = this.get(sourceId);
    if (!source) return false;
    return source.supportedFactTypes.includes(factType);
  }

  public areSourcesIndependent(sourceId1: string, sourceId2: string): boolean {
    const s1 = this.get(sourceId1);
    const s2 = this.get(sourceId2);
    if (!s1 || !s2) return false;
    if (s1.sourceId === s2.sourceId) return false;
    if (s1.independenceGroup && s2.independenceGroup && s1.independenceGroup === s2.independenceGroup) {
      return false; // Same ownership or syndicated group
    }
    return true;
  }

  private registerDefaultSources(): void {
    // Primary Vendor Advisories
    this.register({
      sourceId: 'vendor_advisory_generic',
      name: 'Vendor Security Advisory',
      domain: 'vendor',
      authorityTier: 'PRIMARY_VENDOR',
      supportedDomains: ['vulnerability', 'malware', 'exploit'],
      supportedFactTypes: ['AFFECTED_TARGET', 'FIX_TARGET', 'SEVERITY', 'IDENTITY', 'CLASSIFICATION'],
      trustScore: 0.95,
      isAuthoritative: true,
      independenceGroup: 'vendor',
      admiraltyReliability: 'A',
    });

    // CISA Known Exploited Vulnerabilities
    this.register({
      sourceId: 'cisa_kev',
      name: 'CISA Known Exploited Vulnerabilities Catalog',
      domain: 'cisa.gov',
      authorityTier: 'GOVERNMENT_REGULATOR',
      supportedDomains: ['vulnerability', 'ransomware', 'campaign'],
      supportedFactTypes: ['EXPLOITATION_STATUS', 'IDENTITY', 'TEMPORAL'],
      trustScore: 0.99,
      isAuthoritative: true,
      independenceGroup: 'us_cisa',
      admiraltyReliability: 'A',
    });

    // NVD (NIST)
    this.register({
      sourceId: 'nvd_nist',
      name: 'National Vulnerability Database (NVD)',
      domain: 'nvd.nist.gov',
      authorityTier: 'GOVERNMENT_REGULATOR',
      supportedDomains: ['vulnerability'],
      supportedFactTypes: ['IDENTITY', 'METRIC', 'SEVERITY', 'CLASSIFICATION'],
      trustScore: 0.95,
      isAuthoritative: true,
    });

    // CVE Program (CVE.org)
    this.register({
      sourceId: 'cve_program',
      name: 'CVE Program Record',
      domain: 'cve.org',
      authorityTier: 'AUTHORITATIVE_CATALOG',
      supportedDomains: ['vulnerability'],
      supportedFactTypes: ['IDENTITY', 'CLASSIFICATION', 'AFFECTED_TARGET'],
      trustScore: 0.98,
      isAuthoritative: true,
    });

    // FIRST EPSS
    this.register({
      sourceId: 'first_epss',
      name: 'FIRST Exploit Prediction Scoring System (EPSS)',
      domain: 'first.org',
      authorityTier: 'TRUSTED_RESEARCH',
      supportedDomains: ['vulnerability', 'exploit'],
      supportedFactTypes: ['METRIC'], // EPSS is probabilistic metric, NOT exploitation status
      trustScore: 0.85,
      isAuthoritative: false,
    });

    // MITRE ATT&CK
    this.register({
      sourceId: 'mitre_attack',
      name: 'MITRE ATT&CK Framework',
      domain: 'attack.mitre.org',
      authorityTier: 'AUTHORITATIVE_CATALOG',
      supportedDomains: ['threat_actor', 'malware', 'campaign', 'technique'],
      supportedFactTypes: ['IDENTITY', 'CAPABILITY', 'ATTRIBUTION'],
      trustScore: 0.95,
      isAuthoritative: true,
    });

    // Threat Intelligence / Security Research Firms
    this.register({
      sourceId: 'trusted_security_research',
      name: 'Authoritative Threat Research',
      domain: 'research',
      authorityTier: 'TRUSTED_RESEARCH',
      supportedDomains: ['malware', 'ransomware', 'threat_actor', 'campaign', 'infrastructure', 'ioc'],
      supportedFactTypes: ['CAPABILITY', 'INFRASTRUCTURE', 'INDICATOR', 'ATTRIBUTION', 'EXPLOITATION_STATUS'],
      trustScore: 0.90,
      isAuthoritative: true,
    });
  }
}

export const sourceRegistry = new SourceRegistry();
