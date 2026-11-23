/**
 * Micro77 independent oracle. Facts are recorded from the cited authoritative
 * records, independently of ZAYRON-X adapters and generated reports.
 */
export const MICRO77_ORACLE = {
  cve_id: 'CVE-2024-6387',
  cna: 'Red Hat, Inc.',
  vendor: 'OpenSSH Project / Red Hat, Inc.',
  products: [{
    vendor: 'OpenSSH Project',
    product: 'OpenSSH server (sshd)',
    affected_versions: ['8.5p1 through 9.7p1'],
    fixed_versions: ['9.8p1'],
    platform_scope: 'glibc-based Linux systems; downstream vendor packages may have independent fixed builds',
  }, {
    vendor: 'Red Hat, Inc.',
    product: 'Red Hat Enterprise Linux and related products',
    affected_versions: 'Product-specific package status; consult Red Hat errata',
    fixed_versions: 'Product-specific package builds; not flattened into upstream OpenSSH version',
  }],
  technical_mechanism: 'Signal-handler race condition in sshd (regreSSHion), allowing an unauthenticated remote attacker to trigger unsafe signal handling during authentication timeout.',
  root_cause: 'Race condition in signal handling',
  attack_surface: 'Network-exposed SSH server authentication service',
  impact: 'Potential remote code execution as root on vulnerable glibc-based systems; exploitability is highly timing/architecture dependent.',
  cwe: { nvd: ['CWE-362'], cna: ['CWE-364'], disagreement: true },
  cvss: { version: '3.1', score: 8.1, vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H' },
  advisory: {
    id: 'RHSA-2024:4312 / Red Hat CVE record',
    url: 'https://access.redhat.com/security/cve/CVE-2024-6387',
    published_at: '2024-07-01',
  },
  cve_record: {
    url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-6387',
    published_at: '2024-07-01',
    modified_at: '2026-06-17',
  },
  cisa_kev: { status: 'NOT_LISTED', date_added: null, due_date: null },
  epss: { source: 'FIRST EPSS API', value: 'NOT_FROZEN_IN_ORACLE', url: 'https://api.first.org/data/v1/epss?cve=CVE-2024-6387' },
  public_exploit: { status: 'PRESENT', source: 'Exploit-DB', exploit_id: '52269', url: 'https://www.exploit-db.com/exploits/52269' },
  attack: { status: 'UNKNOWN', reason: 'No direct CVE-specific MITRE ATT&CK mapping was identified in the authoritative records reviewed.' },
  related_cves: [{ cve_id: 'CVE-2006-5051', relationship_type: 'REGRESSION_OF', inherits_facts: false, source_url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-6387' }],
  sources: [
    { name: 'NVD', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-6387', publication_date: '2024-07-01' },
    { name: 'CVE.org', url: 'https://www.cve.org/CVERecord?id=CVE-2024-6387', publication_date: '2024-07-01' },
    { name: 'Red Hat', url: 'https://access.redhat.com/security/cve/CVE-2024-6387', publication_date: '2024-07-01' },
    { name: 'Exploit-DB', url: 'https://www.exploit-db.com/exploits/52269', publication_date: null },
    { name: 'FIRST EPSS', url: 'https://api.first.org/data/v1/epss?cve=CVE-2024-6387', publication_date: null },
  ],
} as const;

export default MICRO77_ORACLE;
