import type {
  UnifiedEnrichmentRecord,
} from '../../packages/intelligence/src/sources/adapters';

export interface CanonicalSourceFixture {
  name: string;
  description: string;
  cveId: string;
  cisaKev?: any;
  vulnrichment?: UnifiedEnrichmentRecord | null;
  osv?: UnifiedEnrichmentRecord | null;
  ghsa?: UnifiedEnrichmentRecord | null;
  nvdCpe?: any;
  epss?: { score: string; percentile: string } | null;
  authoritativeEvidence?: any;
}

// 1. NVD + CNA + KEV
export const FIXTURE_NVD_CNA_KEV: CanonicalSourceFixture = {
  name: 'NVD + CNA + KEV',
  description: 'Enterprise appliance with authoritative vendor CNA advisory, NVD CPE ranges, and CISA KEV active exploitation',
  cveId: 'CVE-2024-3400',
  cisaKev: {
    cveID: 'CVE-2024-3400',
    vendorProject: 'Palo Alto Networks',
    product: 'PAN-OS',
    vulnerabilityName: 'Palo Alto Networks PAN-OS Command Injection Vulnerability',
    dateAdded: '2024-04-12',
    shortDescription: 'Palo Alto Networks PAN-OS contains a command injection vulnerability in GlobalProtect gateway.',
    requiredAction: 'Apply mitigations per vendor instructions or discontinue use.',
    dueDate: '2024-04-19',
    knownRansomwareCampaignUse: 'Known',
    notes: 'https://security.paloaltonetworks.com/CVE-2024-3400',
    cwes: ['CWE-77'],
  },
  nvdCpe: {
    cpes: ['cpe:2.3:o:paloaltonetworks:pan-os:10.2.0:*:*:*:*:*:*:*', 'cpe:2.3:o:paloaltonetworks:pan-os:11.0.0:*:*:*:*:*:*:*'],
    vendor: 'paloaltonetworks',
    product: 'pan-os',
    affectedRanges: ['>= 10.2.0 < 10.2.9-h1', '>= 11.0.0 < 11.0.4-h1'],
    productScopedRanges: { 'pan-os': ['>= 10.2.0 < 10.2.9-h1', '>= 11.0.0 < 11.0.4-h1'] },
    productScopes: [{ vendor: 'paloaltonetworks', product: 'pan-os', affected_versions: ['>= 10.2.0 < 10.2.9-h1', '>= 11.0.0 < 11.0.4-h1'] }],
    references: [{ url: 'https://security.paloaltonetworks.com/CVE-2024-3400', tags: ['Vendor Advisory'] }],
    cweIds: ['CWE-77'],
    cvss: { score: '10.0', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', version: '3.1', source: 'NVD', source_type: 'NVD' },
    cvssAssessments: [
      { score: '10.0', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', version: '3.1', source: 'NVD', source_type: 'NVD', type: 'Primary' },
    ],
  },
  authoritativeEvidence: {
    source: 'paloalto-advisory',
    products_affected: [{ vendor: 'Palo Alto Networks', product: 'PAN-OS', affected_versions: ['10.2.0 < 10.2.9-h1', '11.0.0 < 11.0.4-h1'] }],
    vendor_advisory_url: 'https://security.paloaltonetworks.com/CVE-2024-3400',
    advisory_id: 'PAN-SA-2024-0002',
    fixed_versions: ['10.2.9-h1', '11.0.4-h1'],
    published_date: '2024-04-12',
    technical_mechanism: 'Command injection via crafted telemetry packet',
  },
};

// 2. NVD + EPSS
export const FIXTURE_NVD_EPSS: CanonicalSourceFixture = {
  name: 'NVD + EPSS',
  description: 'Public vulnerability with NVD CVSS scoring and FIRST EPSS probability metrics without active KEV exploitation',
  cveId: 'CVE-2023-99901',
  nvdCpe: {
    cpes: ['cpe:2.3:a:openweb:portal:2.1.0:*:*:*:*:*:*:*'],
    vendor: 'openweb',
    product: 'portal',
    affectedRanges: ['>= 2.0.0 < 2.1.4'],
    productScopedRanges: { portal: ['>= 2.0.0 < 2.1.4'] },
    productScopes: [{ vendor: 'openweb', product: 'portal', affected_versions: ['>= 2.0.0 < 2.1.4'] }],
    references: [{ url: 'https://openweb.example.com/security/adv-01', tags: ['Third Party Advisory'] }],
    cweIds: ['CWE-89'],
    cvss: { score: '7.5', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', version: '3.1', source: 'NVD', source_type: 'NVD' },
    cvssAssessments: [
      { score: '7.5', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', version: '3.1', source: 'NVD', source_type: 'NVD', type: 'Primary' },
    ],
  },
  epss: {
    score: '0.89240',
    percentile: '0.98750',
  },
};

// 3. NVD + OSV
export const FIXTURE_NVD_OSV: CanonicalSourceFixture = {
  name: 'NVD + OSV',
  description: 'Python ecosystem vulnerability with NVD classification and OSV package ranges, git commits, and aliases',
  cveId: 'CVE-2023-99902',
  nvdCpe: {
    cpes: ['cpe:2.3:a:python_requests_project:requests:2.20.0:*:*:*:*:*:*:*'],
    vendor: 'python_requests_project',
    product: 'requests',
    affectedRanges: ['< 2.31.0'],
    productScopedRanges: { requests: ['< 2.31.0'] },
    productScopes: [{ vendor: 'python_requests_project', product: 'requests', affected_versions: ['< 2.31.0'] }],
    references: [{ url: 'https://github.com/psf/requests/pull/1234', tags: ['Patch'] }],
    cweIds: ['CWE-200'],
    cvss: { score: '6.5', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N', version: '3.1', source: 'NVD', source_type: 'NVD' },
  },
  osv: {
    source: 'osv',
    source_record_id: 'PYSEC-2023-99902',
    package: 'requests',
    ecosystem: 'PyPI',
    affected_versions: ['introduced:0', 'last_affected:2.30.0', '2.28.0', '2.29.0'],
    fixed_versions: ['2.31.0'],
    aliases: ['CVE-2023-99902', 'GHSA-j8r2-6x86-q33q'],
    references: ['https://github.com/psf/requests/commit/abcdef1234567890'],
  },
};

// 4. NVD + GHSA
export const FIXTURE_NVD_GHSA: CanonicalSourceFixture = {
  name: 'NVD + GHSA',
  description: 'Node.js npm vulnerability with NVD CVSS and GitHub Advisory Database vulnerable ranges and patched release',
  cveId: 'CVE-2023-99903',
  nvdCpe: {
    cpes: ['cpe:2.3:a:lodash:lodash:4.17.20:*:*:*:*:*:*:*'],
    vendor: 'lodash',
    product: 'lodash',
    affectedRanges: ['< 4.17.21'],
    productScopedRanges: { lodash: ['< 4.17.21'] },
    productScopes: [{ vendor: 'lodash', product: 'lodash', affected_versions: ['< 4.17.21'] }],
    references: [{ url: 'https://github.com/lodash/lodash/issues/5000', tags: ['Issue Tracking'] }],
    cweIds: ['CWE-1321'],
    cvss: { score: '7.3', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:L', version: '3.1', source: 'NVD', source_type: 'NVD' },
  },
  ghsa: {
    source: 'github-advisory',
    source_record_id: 'GHSA-35jh-r3h4-6jhm',
    package: 'lodash',
    ecosystem: 'npm',
    affected_versions: ['< 4.17.21'],
    fixed_versions: ['4.17.21'],
    cvss: { score: '7.4', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:L', source: 'GHSA' },
    cwe_ids: ['CWE-1321'],
    references: ['https://github.com/advisories/GHSA-35jh-r3h4-6jhm'],
    aliases: ['CVE-2023-99903', 'GHSA-35jh-r3h4-6jhm'],
  },
};

// 5. NVD + MITRE (CISA Vulnrichment / ADP)
export const FIXTURE_NVD_MITRE: CanonicalSourceFixture = {
  name: 'NVD + MITRE',
  description: 'Enterprise server flaw with NVD CPE metrics and CISA ADP Vulnrichment SSVC decision tree & CNA solutions',
  cveId: 'CVE-2023-99904',
  nvdCpe: {
    cpes: ['cpe:2.3:a:apache:struts:2.5.0:*:*:*:*:*:*:*'],
    vendor: 'apache',
    product: 'struts',
    affectedRanges: ['>= 2.5.0 < 2.5.33'],
    productScopedRanges: { struts: ['>= 2.5.0 < 2.5.33'] },
    productScopes: [{ vendor: 'apache', product: 'struts', affected_versions: ['>= 2.5.0 < 2.5.33'] }],
    references: [{ url: 'https://struts.apache.org/announce-2023', tags: ['Vendor Advisory'] }],
    cweIds: ['CWE-78'],
    cvss: { score: '9.8', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1', source: 'NVD', source_type: 'NVD' },
  },
  vulnrichment: {
    source: 'cisa-vulnrichment',
    source_record_id: 'CVE-2023-99904',
    vendor: 'Apache Software Foundation',
    product: 'Struts',
    cwe_ids: ['CWE-78'],
    cvss: { score: '9.8', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1', source: 'CISA-ADP' },
    ssvc: {
      exploitation: 'poc',
      automatable: 'yes',
      technical_impact: 'total',
    },
    fixed_versions: ['2.5.33'],
    references: ['https://github.com/cisagov/vulnrichment'],
  },
};

// 6. Multi-Source Conflict Case
export const FIXTURE_MULTI_SOURCE_CONFLICT: CanonicalSourceFixture = {
  name: 'Multi-Source Conflict Case',
  description: 'Vulnerability with explicit CVSS conflicts (CNA vs NVD vs CISA-ADP) and CWE disagreement (CISA CWE-23 vs NVD CWE-22)',
  cveId: 'CVE-2021-22005',
  cisaKev: {
    cveID: 'CVE-2021-22005',
    vendorProject: 'VMware',
    product: 'vCenter Server',
    vulnerabilityName: 'VMware vCenter Server File Upload Vulnerability',
    shortDescription: 'VMware vCenter Server contains an arbitrary file upload vulnerability via path traversal.',
    dateAdded: '2021-11-03',
    dueDate: '2021-11-17',
    cwes: ['CWE-23'], // CISA says CWE-23 (Relative Path Traversal)
  },
  nvdCpe: {
    cpes: ['cpe:2.3:a:vmware:vcenter_server:7.0:*:*:*:*:*:*:*'],
    vendor: 'vmware',
    product: 'vcenter_server',
    affectedRanges: ['7.0 < 7.0 U2c'],
    productScopedRanges: { vcenter_server: ['7.0 < 7.0 U2c'] },
    productScopes: [{ vendor: 'vmware', product: 'vcenter_server', affected_versions: ['7.0 < 7.0 U2c'] }],
    references: [{ url: 'https://kb.vmware.com/s/article/85777', tags: ['Vendor Advisory'] }],
    cweIds: ['CWE-22'], // NVD says CWE-22 (Improper Limitation of a Pathname)
    cvss: { score: '9.8', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1', source: 'NVD', source_type: 'NVD' },
    cvssAssessments: [
      { score: '9.8', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1', source: 'NVD', source_type: 'NVD', type: 'Primary', severity: 'CRITICAL' },
      { score: '8.1', vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1', source: 'cve@vmware.com', source_type: 'CNA', type: 'Secondary', severity: 'HIGH' },
    ],
  },
  vulnrichment: {
    source: 'cisa-vulnrichment',
    source_record_id: 'CVE-2021-22005',
    cwe_ids: ['CWE-23'],
    cvss: { score: '8.1', vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1', source: 'CISA-ADP' },
    ssvc: {
      exploitation: 'active',
      automatable: 'yes',
      technical_impact: 'total',
    },
    references: ['https://github.com/cisagov/vulnrichment'],
  },
};
