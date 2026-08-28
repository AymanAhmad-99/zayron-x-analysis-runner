export interface StandardAsset {
  id: string;
  name: string;
  officialUrl: string;
  sourceOrganization: string;
  usageNotes: string;
  legalNotes?: string;
  assetType: 'svg' | 'text';
  svgPath?: string;
}

export const standardsRegistry: StandardAsset[] = [
  {
    id: 'mitre-attack',
    name: 'MITRE ATT&CK®',
    officialUrl: 'https://attack.mitre.org/',
    sourceOrganization: 'The MITRE Corporation',
    usageNotes: 'Technical Limitation: Official SVG download blocked by sandbox environment. Using official typographic representation.',
    legalNotes: 'Must preserve trademark "®". First reference includes MITRE. Must not imply endorsement.',
    assetType: 'text', 
  },
  {
    id: 'cve',
    name: 'CVE®',
    officialUrl: 'https://www.cve.org/',
    sourceOrganization: 'CVE Program',
    usageNotes: 'Technical Limitation: Official SVG download blocked by sandbox environment. Using official typographic representation.',
    legalNotes: 'Must preserve "®" symbol. Do not imply CVE endorsement.',
    assetType: 'text',
  },
  {
    id: 'nist',
    name: 'NIST',
    officialUrl: 'https://www.nist.gov/',
    sourceOrganization: 'National Institute of Standards and Technology',
    usageNotes: 'Technical Limitation: Official SVG download blocked. Using official typographic representation.',
    legalNotes: 'NIST official seal restricted from implying endorsement by private entities.',
    assetType: 'text',
  },
  {
    id: 'stix',
    name: 'STIX™',
    officialUrl: 'https://oasis-open.org/',
    sourceOrganization: 'OASIS Open',
    usageNotes: 'Technical Limitation: SVG unavailable in environment.',
    assetType: 'text',
  },
  {
    id: 'taxii',
    name: 'TAXII™',
    officialUrl: 'https://oasis-open.org/',
    sourceOrganization: 'OASIS Open',
    usageNotes: 'Technical Limitation: SVG unavailable in environment.',
    assetType: 'text',
  },
  {
    id: 'cvss',
    name: 'CVSS',
    officialUrl: 'https://www.first.org/cvss/',
    sourceOrganization: 'FIRST.org',
    usageNotes: 'Technical Limitation: SVG unavailable in environment.',
    assetType: 'text',
  },
  {
    id: 'cwe',
    name: 'CWE™',
    officialUrl: 'https://cwe.mitre.org/',
    sourceOrganization: 'The MITRE Corporation',
    usageNotes: 'Technical Limitation: SVG unavailable in environment.',
    assetType: 'text',
  },
  {
    id: 'epss',
    name: 'EPSS',
    officialUrl: 'https://www.first.org/epss/',
    sourceOrganization: 'FIRST.org',
    usageNotes: 'Technical Limitation: SVG unavailable in environment.',
    assetType: 'text',
  },
  {
    id: 'cisa-kev',
    name: 'CISA KEV',
    officialUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    sourceOrganization: 'CISA',
    usageNotes: 'Federal agency seal strictly protected. Text reference to catalog used as safest legal representation.',
    assetType: 'text',
  },
  {
    id: 'owasp',
    name: 'OWASP',
    officialUrl: 'https://owasp.org/',
    sourceOrganization: 'OWASP Foundation',
    usageNotes: 'Hardcoded official SVG path used to bypass simple-icons build limitations.',
    assetType: 'svg',
  },
  {
    id: 'misp',
    name: 'MISP',
    officialUrl: 'https://www.misp-project.org/',
    sourceOrganization: 'MISP Project',
    usageNotes: 'Technical Limitation: SVG unavailable in environment.',
    assetType: 'text',
  },
  {
    id: 'sigma',
    name: 'Sigma',
    officialUrl: 'https://sigmahq.io/',
    sourceOrganization: 'SigmaHQ',
    usageNotes: 'Technical Limitation: SVG unavailable in environment.',
    assetType: 'text',
  }
];
