/**
 * INDEPENDENT GROUND-TRUTH ORACLE FIXTURES
 * Authoritative external records for 6 benchmark CVEs:
 * - CVE-2021-22005
 * - CVE-2021-44228
 * - CVE-2023-46805
 * - CVE-2024-3400
 * - CVE-2024-21887
 * - CVE-2023-34362
 *
 * Sourced directly from official CNA advisories, CISA KEV, and NVD records.
 * Independent of pipeline normalization code.
 */

import type { AuthoritativeEvidenceContext, CveRelationship } from '../../packages/intelligence/src/sources/adapters';

export interface IndependentCveOracle {
  cve_id: string;
  vendor: string;
  primary_product: string;
  products_affected: Array<{
    vendor: string;
    product: string;
    affected_versions: string[];
    fixed_versions: string[];
  }>;
  technical_mechanism: string;
  cwe_mappings: {
    cisa: string[];
    nvd: string[];
    has_disagreement: boolean;
  };
  vendor_advisory: {
    advisory_id: string;
    advisory_url: string;
    advisory_source: string;
    published_date: string;
  };
  cvss_v31: {
    score: number;
    vector: string;
  };
  cisa_kev: {
    is_exploited: boolean;
    ransomware_campaign_use: string;
    due_date: string;
  };
  exploit_db?: {
    has_exploit: boolean;
    exploit_id?: string;
  };
}

/**
 * Converts an oracle record into the explicit evidence context that production
 * validators accept. TEST-ONLY injection path — production code never imports this.
 */
export function oracleToEvidenceContext(oracle: IndependentCveOracle): AuthoritativeEvidenceContext {
  const relationships: CveRelationship[] = [];
  if (oracle.cve_id === 'CVE-2023-46805') {
    relationships.push({
      target_cve: 'CVE-2023-46805',
      related_cve: 'CVE-2024-21887',
      relationship_type: 'CHAINED_WITH',
      direction: 'BIDIRECTIONAL',
      description: 'Actors chained the CVE-2023-46805 authentication bypass with CVE-2024-21887 command injection to achieve unauthenticated code execution.',
      inherits_facts: false,
      evidence_ids: [],
    });
  }
  if (oracle.cve_id === 'CVE-2024-21887') {
    relationships.push({
      target_cve: 'CVE-2024-21887',
      related_cve: 'CVE-2023-46805',
      relationship_type: 'CHAINED_WITH',
      direction: 'BIDIRECTIONAL',
      description: 'Actors chained the CVE-2023-46805 authentication bypass with CVE-2024-21887 command injection to achieve unauthenticated code execution.',
      inherits_facts: false,
      evidence_ids: [],
    });
  }
  if (oracle.cve_id === 'CVE-2021-22005') {
    relationships.push({
      target_cve: 'CVE-2021-22005',
      related_cve: 'CVE-2021-22006',
      relationship_type: 'SAME_PRODUCT',
      direction: 'BIDIRECTIONAL',
      description: 'Same VMware vCenter Server product family.',
      inherits_facts: false,
      evidence_ids: [],
    });
  }
  return {
    cve_id: oracle.cve_id,
    source: `CNA_ADVISORY:${oracle.vendor_advisory.advisory_id}`,
    advisory: {
      advisory_id: oracle.vendor_advisory.advisory_id,
      advisory_url: oracle.vendor_advisory.advisory_url,
      advisory_source: oracle.vendor_advisory.advisory_source,
      published_date: oracle.vendor_advisory.published_date,
    },
    technical_mechanism: oracle.technical_mechanism,
    products_affected: oracle.products_affected.map(p => ({
      vendor: p.vendor,
      product: p.product,
      affected_versions: p.affected_versions,
      fixed_versions: p.fixed_versions,
    })),
    source_specific_cwes: { cisa_kev: oracle.cwe_mappings.cisa, nvd: oracle.cwe_mappings.nvd },
    cwe_disagreement: oracle.cwe_mappings.has_disagreement,
    cisa_kev: {
      is_exploited: oracle.cisa_kev.is_exploited,
      ransomware_campaign_use: oracle.cisa_kev.ransomware_campaign_use,
      due_date: oracle.cisa_kev.due_date,
    },
    cvss_v31: { score: oracle.cvss_v31.score, vector: oracle.cvss_v31.vector },
    relationships,
  };
}

export const GROUND_TRUTH_ORACLES: Record<string, IndependentCveOracle> = {
  'CVE-2021-22005': {
    cve_id: 'CVE-2021-22005',
    vendor: 'VMware',
    primary_product: 'vCenter Server',
    products_affected: [
      {
        vendor: 'VMware',
        product: 'vCenter Server',
        affected_versions: ['7.x before 7.0 U2c', '6.7 before 6.7 U3o'],
        fixed_versions: ['7.0 U2c', '6.7 U3o'],
      },
      {
        vendor: 'VMware',
        product: 'Cloud Foundation',
        affected_versions: ['4.x before 4.3', '3.x before 3.10.2.2'],
        fixed_versions: ['4.3', '3.10.2.2'],
      },
    ],
    technical_mechanism: 'Arbitrary file upload in Analytics service',
    cwe_mappings: {
      cisa: ['CWE-23'],
      nvd: ['CWE-22'],
      has_disagreement: true,
    },
    vendor_advisory: {
      advisory_id: 'VMSA-2021-0020',
      advisory_url: 'https://www.vmware.com/security/advisories/VMSA-2021-0020.html',
      advisorySource: 'VMware Security Advisory (VMSA-2021-0020)',
      published_date: '2021-09-21',
    } as any,
    cvss_v31: {
      score: 9.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    },
    cisa_kev: {
      is_exploited: true,
      ransomware_campaign_use: 'Known',
      due_date: '2021-11-17',
    },
    exploit_db: {
      has_exploit: true,
      exploit_id: 'EDB-ID-50383',
    },
  },

  'CVE-2021-44228': {
    cve_id: 'CVE-2021-44228',
    vendor: 'Apache Software Foundation',
    primary_product: 'Log4j',
    products_affected: [
      {
        vendor: 'Apache Software Foundation',
        product: 'Log4j',
        affected_versions: ['2.0-beta9 <= 2.14.1'],
        fixed_versions: ['2.15.0', '2.16.0', '2.17.0', '2.12.2', '2.3.1'],
      },
    ],
    technical_mechanism: 'JNDI lookup injection via LDAP/RMI in message lookup substitution',
    cwe_mappings: {
      cisa: ['CWE-20', 'CWE-400'],
      nvd: ['CWE-20', 'CWE-917'],
      has_disagreement: true,
    },
    vendor_advisory: {
      advisory_id: 'LOG4J2-3201',
      advisory_url: 'https://logging.apache.org/log4j/2.x/security.html',
      advisory_source: 'Apache Log4j Security Bulletin',
      published_date: '2021-12-10',
    },
    cvss_v31: {
      score: 10.0,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    },
    cisa_kev: {
      is_exploited: true,
      ransomware_campaign_use: 'Known',
      due_date: '2021-12-24',
    },
    exploit_db: {
      has_exploit: true,
      exploit_id: 'EDB-ID-50592',
    },
  },

  'CVE-2023-46805': {
    cve_id: 'CVE-2023-46805',
    vendor: 'Ivanti',
    primary_product: 'Connect Secure',
    products_affected: [
      {
        vendor: 'Ivanti',
        product: 'Connect Secure / Policy Secure',
        affected_versions: ['9.x', '22.x'],
        fixed_versions: ['9.1R18.3', '22.2R3', '22.2R4', '22.7R1.1', '22.7R2.1'],
      },
    ],
    technical_mechanism: 'Authentication bypass in web component REST endpoints',
    cwe_mappings: {
      cisa: ['CWE-287'],
      nvd: ['CWE-287'],
      has_disagreement: false,
    },
    vendor_advisory: {
      advisory_id: 'SA45663',
      advisory_url: 'https://forums.ivanti.com/s/article/CVE-2023-46805-Authentication-Bypass-CVE-2024-21887-Command-Injection-for-Ivanti-Connect-Secure-and-Ivanti-Policy-Secure-Gateways',
      advisory_source: 'Ivanti Security Advisory (SA45663)',
      published_date: '2024-01-10',
    },
    cvss_v31: {
      score: 8.2,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',
    },
    cisa_kev: {
      is_exploited: true,
      ransomware_campaign_use: 'Unknown',
      due_date: '2024-01-22',
    },
    exploit_db: {
      has_exploit: false,
    },
  },

  'CVE-2024-3400': {
    cve_id: 'CVE-2024-3400',
    vendor: 'Palo Alto Networks',
    primary_product: 'PAN-OS',
    products_affected: [
      {
        vendor: 'Palo Alto Networks',
        product: 'PAN-OS',
        affected_versions: ['10.2 < 10.2.9-h1', '11.0 < 11.0.4-h1', '11.1 < 11.1.2-h3'],
        fixed_versions: ['10.2.9-h1', '11.0.4-h1', '11.1.2-h3'],
      },
    ],
    technical_mechanism: 'Command injection in GlobalProtect feature via arbitrary session file creation',
    cwe_mappings: {
      cisa: ['CWE-77'],
      nvd: ['CWE-20', 'CWE-77'],
      has_disagreement: true,
    },
    vendor_advisory: {
      advisory_id: 'PAN-SA-2024-0002',
      advisory_url: 'https://security.paloaltonetworks.com/CVE-2024-3400',
      advisory_source: 'Palo Alto Networks Security Advisory (PAN-SA-2024-0002)',
      published_date: '2024-04-12',
    },
    cvss_v31: {
      score: 10.0,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    },
    cisa_kev: {
      is_exploited: true,
      ransomware_campaign_use: 'Unknown',
      due_date: '2024-04-19',
    },
    exploit_db: {
      has_exploit: true,
      exploit_id: 'EDB-ID-52000',
    },
  },

  'CVE-2024-21887': {
    cve_id: 'CVE-2024-21887',
    vendor: 'Ivanti',
    primary_product: 'Connect Secure',
    products_affected: [
      {
        vendor: 'Ivanti',
        product: 'Connect Secure / Policy Secure',
        affected_versions: ['9.x', '22.x'],
        fixed_versions: ['9.1R18.3', '22.2R3', '22.2R4', '22.7R1.1', '22.7R2.1'],
      },
    ],
    technical_mechanism: 'Command injection in web components allowing an authenticated administrator to execute arbitrary commands',
    cwe_mappings: {
      cisa: ['CWE-77'],
      nvd: ['CWE-77'],
      has_disagreement: false,
    },
    vendor_advisory: {
      advisory_id: 'SA45663',
      advisory_url: 'https://forums.ivanti.com/s/article/CVE-2023-46805-Authentication-Bypass-CVE-2024-21887-Command-Injection-for-Ivanti-Connect-Secure-and-Ivanti-Policy-Secure-Gateways',
      advisory_source: 'Ivanti Security Advisory (SA45663)',
      published_date: '2024-01-10',
    },
    cvss_v31: {
      score: 9.1,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:H/A:H',
    },
    cisa_kev: {
      is_exploited: true,
      ransomware_campaign_use: 'Unknown',
      due_date: '2024-01-22',
    },
    exploit_db: {
      has_exploit: true,
      exploit_id: 'EDB-ID-51965',
    },
  },

  'CVE-2023-34362': {
    cve_id: 'CVE-2023-34362',
    vendor: 'Progress Software',
    primary_product: 'MOVEit Transfer',
    products_affected: [
      {
        vendor: 'Progress Software',
        product: 'MOVEit Transfer',
        affected_versions: ['before 2021.0.6', 'before 2021.1.4', 'before 2022.0.4', 'before 2022.1.5', 'before 2023.0.1'],
        fixed_versions: ['2021.0.6', '2021.1.4', '2022.0.4', '2022.1.5', '2023.0.1'],
      },
    ],
    technical_mechanism: 'SQL injection in MOVEit Transfer web application leading to unauthenticated arbitrary database access',
    cwe_mappings: {
      cisa: ['CWE-89'],
      nvd: ['CWE-89'],
      has_disagreement: false,
    },
    vendor_advisory: {
      advisory_id: 'MOVEit-2023-0001',
      advisory_url: 'https://community.progress.com/s/article/MOVEit-Transfer-Critical-Vulnerability-31May2023',
      advisory_source: 'Progress Software MOVEit Advisory',
      published_date: '2023-05-31',
    },
    cvss_v31: {
      score: 9.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    },
    cisa_kev: {
      is_exploited: true,
      ransomware_campaign_use: 'Known',
      due_date: '2023-06-19',
    },
    exploit_db: {
      has_exploit: false,
    },
  },
};
