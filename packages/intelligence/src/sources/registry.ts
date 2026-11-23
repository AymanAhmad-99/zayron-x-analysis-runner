export type SourceType = 'vendor_advisory' | 'government' | 'catalog' | 'research' | 'secondary';
export type AuthorityClass = 'AUTHORITATIVE_PRIMARY' | 'AUTHORITATIVE_GOVERNMENT' | 'STANDARDIZED_DATABASE' | 'RESEARCH_ORGANIZATION' | 'COMMUNITY_ADVISORY' | 'SECONDARY' | 'UNVERIFIED';
export type SourceCapability = 'CVE' | 'KEV' | 'CVSS' | 'CWE' | 'CPE' | 'versions' | 'exploitation' | 'vendor_advisory' | 'package_advisory' | 'patch_information' | 'references' | 'EPSS';

export interface SourceDefinition {
  id: string;
  name: string;
  sourceType: SourceType;
  authorityClass: AuthorityClass;
  domainPatterns: string[];
  capabilities: SourceCapability[];
  sectors: string[];
  ecosystems: string[];
  ingestionMethod: 'api' | 'rss' | 'feed' | 'adapter' | 'manual';
  updateFrequency: 'continuous' | 'daily' | 'weekly' | 'on_demand';
  enabled: boolean;
}

export const VULNERABILITY_SOURCE_REGISTRY: readonly SourceDefinition[] = [
  { id: 'cisa-kev', name: 'CISA Known Exploited Vulnerabilities', sourceType: 'catalog', authorityClass: 'AUTHORITATIVE_GOVERNMENT', domainPatterns: ['cisa.gov'], capabilities: ['CVE', 'KEV', 'exploitation', 'patch_information'], sectors: ['government', 'critical_infrastructure'], ecosystems: [], ingestionMethod: 'feed', updateFrequency: 'daily', enabled: true },
  { id: 'cve-program', name: 'CVE Program', sourceType: 'government', authorityClass: 'AUTHORITATIVE_GOVERNMENT', domainPatterns: ['cve.org', 'cveawg.mitre.org'], capabilities: ['CVE', 'references'], sectors: [], ecosystems: [], ingestionMethod: 'api', updateFrequency: 'daily', enabled: true },
  { id: 'nvd', name: 'NIST National Vulnerability Database', sourceType: 'government', authorityClass: 'STANDARDIZED_DATABASE', domainPatterns: ['nvd.nist.gov'], capabilities: ['CVE', 'CVSS', 'CWE', 'CPE', 'references'], sectors: [], ecosystems: [], ingestionMethod: 'api', updateFrequency: 'daily', enabled: true },
  { id: 'github-advisory', name: 'GitHub Advisory Database', sourceType: 'research', authorityClass: 'COMMUNITY_ADVISORY', domainPatterns: ['github.com'], capabilities: ['CVE', 'package_advisory', 'versions', 'references'], sectors: ['technology', 'software'], ecosystems: ['npm', 'pypi', 'maven', 'nuget', 'go', 'rust', 'rubygems'], ingestionMethod: 'api', updateFrequency: 'daily', enabled: true },
  { id: 'osv', name: 'OSV.dev', sourceType: 'research', authorityClass: 'RESEARCH_ORGANIZATION', domainPatterns: ['osv.dev'], capabilities: ['CVE', 'package_advisory', 'versions', 'references'], sectors: ['technology', 'software'], ecosystems: ['npm', 'pypi', 'maven', 'nuget', 'go', 'rust', 'rubygems', 'php'], ingestionMethod: 'api', updateFrequency: 'daily', enabled: true },
  { id: 'epss', name: 'FIRST EPSS', sourceType: 'research', authorityClass: 'RESEARCH_ORGANIZATION', domainPatterns: ['first.org'], capabilities: ['CVE', 'EPSS'], sectors: [], ecosystems: [], ingestionMethod: 'api', updateFrequency: 'daily', enabled: true },
  { id: 'exploit-db', name: 'OffSec Exploit Database', sourceType: 'research', authorityClass: 'RESEARCH_ORGANIZATION', domainPatterns: ['exploit-db.com', 'gitlab.com/exploit-database'], capabilities: ['CVE', 'references'], sectors: ['technology', 'security_research'], ecosystems: [], ingestionMethod: 'adapter', updateFrequency: 'daily', enabled: true },
];

export function sourceForUrl(url: string): SourceDefinition | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return VULNERABILITY_SOURCE_REGISTRY.find(s => s.domainPatterns.some(d => host === d || host.endsWith(`.${d}`)));
  } catch { return undefined; }
}

export function sourceIdentityMatches(source: Pick<SourceDefinition, 'name' | 'domainPatterns'>, url: string): boolean {
  const resolved = sourceForUrl(url);
  return !!resolved && source.domainPatterns.some(d => resolved.domainPatterns.includes(d));
}
