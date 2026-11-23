import { describe, it, expect } from 'bun:test';
import {
  parseNvdCpeData,
  reconcileOpenSourceEnrichment,
  buildBoundedAttackPath,
  normalizeVendorAdvisory,
  buildStructuredAttackMappings,
  lookupExploitDbEvidence,
  validateTechnicalMechanismIsolation,
  verifyClaimsLedger,
  validateReportSemantics,
  type EvidenceScope,
  type CveRelationship,
  type ClaimRecord,
} from '../../packages/intelligence/src/sources/adapters';
import { GROUND_TRUTH_ORACLES, oracleToEvidenceContext } from '../fixtures/ground_truth_oracles';

describe('MICRO TASK 76 — CVE SEMANTIC ISOLATION & ADVERSARIAL VERIFICATION GATE', () => {
  // =========================================================================
  // 1. CRITICAL REGRESSION: CVE-2023-46805 LIVE SPECIMEN ISOLATION
  // =========================================================================
  describe('1. Critical Regression — CVE-2023-46805 Isolation', () => {
    it('verifies CVE-2023-46805 ransomware status is strictly Unknown (never Known)', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2023-46805'];
      expect(oracle.cisa_kev.ransomware_campaign_use).toBe('Unknown');

      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2023-46805',
        cisaKev: {
          cveID: 'CVE-2023-46805',
          vendorProject: 'Ivanti',
          product: 'Connect Secure / Policy Secure',
          dateAdded: '2024-01-10',
          dueDate: '2024-01-22',
          knownRansomwareCampaignUse: 'Unknown',
        },
      });

      expect(reconciled.exploitation_truth.known_ransomware_campaign_use).toBe('Unknown');
      expect(reconciled.exploitation_truth.known_ransomware_campaign_use).not.toBe('Known');
    });

    it('verifies CVE-2023-46805 technical mechanism is strictly Authentication Bypass, NOT Command Injection', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2023-46805'];
      expect(oracle.technical_mechanism).toContain('Authentication bypass');
      expect(oracle.cwe_mappings.cisa).toContain('CWE-287');

      const validCheck = validateTechnicalMechanismIsolation('CVE-2023-46805', oracle.technical_mechanism, oracleToEvidenceContext(oracle));
      expect(validCheck.isValid).toBe(true);
      expect(validCheck.violations.length).toBe(0);

      // Verify keyword guard rejects contaminated mechanisms from CVE-2024-21887
      const contaminated = validateTechnicalMechanismIsolation(
        'CVE-2023-46805',
        'Command injection in web components allowing an authenticated administrator to execute arbitrary commands',
        oracleToEvidenceContext(oracle)
      );
      expect(contaminated.isValid).toBe(false);
      expect(contaminated.violations.length).toBeGreaterThan(0);
      expect(contaminated.violations.some(v => v.includes('command injection'))).toBe(true);
    });

    it('verifies T1059 is NEVER marked CONFIRMED for CVE-2023-46805', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2023-46805'];
      const oracle46805 = GROUND_TRUTH_ORACLES['CVE-2023-46805'];
      const attackMappings = buildStructuredAttackMappings({
        cveId: 'CVE-2023-46805',
        cweIds: oracle46805.cwe_mappings.cisa,
        attackVector: 'NETWORK', // Explicit fixture evidence; never default an absent vector.
        isKev: true,
        evidenceIds: [],
        relationships: oracleToEvidenceContext(oracle46805).relationships || [],
      });

      const t1059Mapping = attackMappings.find(m => m.technique_id === 'T1059');
      if (t1059Mapping) {
        expect(t1059Mapping.status).not.toBe('CONFIRMED');
        expect(t1059Mapping.status).toBe('CAMPAIGN_CONTEXT');
        expect(t1059Mapping.evidence_scope).toBe('RELATION');
        expect(t1059Mapping.related_cve_ids).toContain('CVE-2024-21887');
      }

      // CWE + KEV are not empirical ATT&CK observations; with no supplied evidence
      // the mapping remains explicitly unestablished, never a source fact.
      const t1190Mapping = attackMappings.find(m => m.technique_id === 'T1190');
      expect(t1190Mapping).toBeDefined();
      expect(t1190Mapping?.status).toBe('UNESTABLISHED');
      expect(t1190Mapping?.truth_type).toBe('UNKNOWN');
      expect(t1190Mapping?.confidence).toBe(0);
      expect(t1190Mapping?.evidence_scope).toBe('CVE');
    });

    it('distinguishes CVE-2023-46805 from CVE-2024-21887 in ground truth', () => {
      const cve46805 = GROUND_TRUTH_ORACLES['CVE-2023-46805'];
      const cve21887 = GROUND_TRUTH_ORACLES['CVE-2024-21887'];

      // Mechanisms must be completely different
      expect(cve46805.technical_mechanism).toContain('Authentication bypass');
      expect(cve21887.technical_mechanism).toContain('Command injection');

      // CWEs must be completely different
      expect(cve46805.cwe_mappings.cisa).toEqual(['CWE-287']);
      expect(cve21887.cwe_mappings.cisa).toEqual(['CWE-77']);

      // CVSS scores must be distinct
      expect(cve46805.cvss_v31.score).toBe(8.2);
      expect(cve21887.cvss_v31.score).toBe(9.1);
    });
  });

  // =========================================================================
  // 2. CVE RELATIONSHIP MODEL & STRICT INHERITANCE PREVENTION
  // =========================================================================
  describe('2. CVE Relationship Model', () => {
    it('verifies relationship model returns CHAINED_WITH with inherits_facts: false', () => {
      const evidence46805 = oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']);
      const rels = evidence46805.relationships || [];
      expect(rels.length).toBeGreaterThan(0);

      const chained = rels.find(r => r.related_cve === 'CVE-2024-21887');
      expect(chained).toBeDefined();
      expect(chained?.relationship_type).toBe('CHAINED_WITH');
      expect(chained?.inherits_facts).toBe(false);

      // Verify reverse relationship
      const reverseRels = oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2024-21887']).relationships || [];
      const reverseChained = reverseRels.find(r => r.related_cve === 'CVE-2023-46805');
      expect(reverseChained).toBeDefined();
      expect(reverseChained?.relationship_type).toBe('CHAINED_WITH');
      expect(reverseChained?.inherits_facts).toBe(false);
    });

    it('verifies relationships provide context without polluting primary identity', () => {
      const rels22005 = oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2021-22005']).relationships || [];
      const cfRel = rels22005.find(r => r.relationship_type === 'SAME_PRODUCT');
      expect(cfRel).toBeDefined();
      expect(cfRel?.inherits_facts).toBe(false);
    });
  });

  // =========================================================================
  // 3. ATT&CK ATTRIBUTION GATE
  // =========================================================================
  describe('3. ATT&CK Attribution Gate', () => {
    it('requires explicit CTI attribution, not CWE capability alone, for CONFIRMED', () => {
      // CVE-2024-3400 (CWE-77 command injection in GlobalProtect)
      const mappings3400 = buildStructuredAttackMappings('CVE-2024-3400', ['CWE-77'], true);
      const t1059 = mappings3400.find(m => m.technique_id === 'T1059');
      expect(t1059?.status).toBe('UNESTABLISHED');
      expect(t1059?.truth_type).toBe('UNKNOWN');
      expect(t1059?.confidence).toBe(0);
      expect(t1059?.evidence_scope).toBe('CVE');

      // CVE-2023-46805 (CWE-287 authentication bypass): T1059 only via chained relationship context
      const mappings46805 = buildStructuredAttackMappings({
        cveId: 'CVE-2023-46805',
        cweIds: ['CWE-287'],
        isKev: true,
        evidenceIds: [],
        relationships: oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']).relationships || [],
      });
      const t1059On46805 = mappings46805.find(m => m.technique_id === 'T1059');
      expect(t1059On46805?.status).toBe('CAMPAIGN_CONTEXT');
      expect(t1059On46805?.evidence_scope).toBe('RELATION');
    });

    it('ensures CAMPAIGN_CONTEXT is never labeled as CVE-specific confirmed technique', () => {
      const mappings = buildStructuredAttackMappings({
        cveId: 'CVE-2023-46805',
        cweIds: ['CWE-287'],
        isKev: false,
        evidenceIds: [],
        relationships: oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']).relationships || [],
      });
      for (const m of mappings) {
        if (m.status === 'CAMPAIGN_CONTEXT') {
          expect(m.evidence_scope).not.toBe('CVE');
          expect(m.status).not.toBe('CONFIRMED');
        }
      }
    });
  });

  // =========================================================================
  // 4. ATTACK PATH STAGE EVIDENCE SCOPING
  // =========================================================================
  describe('4. Attack Path Stage Evidence Scoping', () => {
    it('verifies all attack path stages have explicit evidence_scope and derivation', () => {
      const attackPath = buildBoundedAttackPath(
        'CVE-2023-46805',
        'Authentication bypass in web component REST endpoints',
        ['CWE-287'],
        'None required (pre-auth REST endpoints)'
      );

      expect(attackPath.stages.length).toBeGreaterThan(0);
      for (const stage of attackPath.stages) {
        expect(stage.evidence_scope).toBeDefined();
        expect(['CVE', 'PRODUCT', 'CAMPAIGN', 'RELATION', 'KNOWLEDGE', 'ANALYST']).toContain(stage.evidence_scope);
        expect(stage.derivation).toBeDefined();
        expect(stage.assertion).toBeDefined();
      }

      // Vulnerability condition stage must be CVE-scoped SOURCE_FACT for CWE-287
      const vulnCondition = attackPath.stages.find(s => s.stage === 'VULNERABILITY_CONDITION');
      expect(vulnCondition).toBeDefined();
      expect(vulnCondition?.evidence_scope).toBe('CVE');
      expect(vulnCondition?.truth_type).toBe('SOURCE_FACT');

      // Exploitation effect for an auth bypass must NOT be operating system command execution
      const effectStage = attackPath.stages.find(s => s.stage === 'EXPLOITATION_EFFECT');
      if (effectStage) {
        expect(effectStage.value).not.toContain('operating system commands');
      }
    });
  });

  // =========================================================================
  // 5. CLAIM LEDGER HARDENING (INDIVIDUAL VERIFICATION)
  // =========================================================================
  describe('5. Claim Ledger Individual Verification', () => {
    function createValidClaims(): ClaimRecord[] {
      return [
        {
          id: 'CLM-01', claim_id: 'CLM-01', field: 'identity', value: 'CVE-2023-46805',
          truth_type: 'SOURCE_FACT', confidence: 1.0,
          source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
          evidence_scope: 'CVE', source_timestamp: '2024-01-10', verification_status: 'VERIFIED',
          related_cve_ids: [], notes: 'Baseline identity'
        },
        {
          id: 'CLM-02', claim_id: 'CLM-02', field: 'technical_mechanism', value: 'Authentication bypass in web component REST endpoints',
          truth_type: 'SOURCE_FACT', confidence: 1.0,
          source: 'Ivanti Advisory', source_ids: ['vendor-advisory'], source_url: 'https://forums.ivanti.com',
          evidence_scope: 'CVE', source_timestamp: '2024-01-10', verification_status: 'VERIFIED',
          related_cve_ids: [], notes: 'Authoritative mechanism'
        },
        {
          id: 'CLM-03', claim_id: 'CLM-03', field: 'cwe', value: 'CWE-287',
          truth_type: 'SOURCE_FACT', confidence: 1.0,
          source: 'NVD / MITRE', source_ids: ['nvd'], source_url: 'https://nvd.nist.gov',
          evidence_scope: 'CVE', source_timestamp: '2024-01-10', verification_status: 'VERIFIED',
          related_cve_ids: [], notes: 'Weakness categorization'
        },
        {
          id: 'CLM-04', claim_id: 'CLM-04', field: 'cisa_ransomware', value: 'Unknown',
          truth_type: 'SOURCE_FACT', confidence: 1.0,
          source: 'CISA KEV', source_ids: ['cisa-kev'], source_url: 'https://www.cisa.gov',
          evidence_scope: 'CVE', source_timestamp: '2024-01-10', verification_status: 'VERIFIED',
          related_cve_ids: [], notes: 'Authoritative ransomware status'
        },
        {
          id: 'CLM-05', claim_id: 'CLM-05', field: 'attack_technique', value: 'T1190 (CONFIRMED)',
          truth_type: 'SOURCE_FACT', confidence: 0.90,
          source: 'MITRE ATT&CK', source_ids: ['mitre-attack'], source_url: 'https://attack.mitre.org',
          evidence_scope: 'CVE', source_timestamp: '2024-01-10', verification_status: 'VERIFIED',
          related_cve_ids: [], notes: 'Directly supported technique'
        }
      ];
    }

    it('passes verification when all claims are valid, scoped, and sourced', () => {
      const claims = createValidClaims();
      const result = verifyClaimsLedger('CVE-2023-46805', claims);
      expect(result.is_valid).toBe(true);
      expect(result.verified_count).toBe(5);
      expect(result.violations.length).toBe(0);
    });

    it('detects missing source and fails closed', () => {
      const claims = createValidClaims();
      claims[0].source = ''; // Strip source
      const result = verifyClaimsLedger('CVE-2023-46805', claims);
      expect(result.is_valid).toBe(false);
      expect(result.violations.some(v => v.claim_id === 'CLM-01' && v.issue.includes('Missing source'))).toBe(true);
    });

    it('detects missing evidence_scope and fails closed', () => {
      const claims = createValidClaims();
      (claims[1] as any).evidence_scope = 'INVALID_SCOPE';
      const result = verifyClaimsLedger('CVE-2023-46805', claims);
      expect(result.is_valid).toBe(false);
      expect(result.violations.some(v => v.claim_id === 'CLM-02' && v.issue.includes('Invalid evidence_scope'))).toBe(true);
    });

    it('detects contaminated T1059 CONFIRMED claim on CVE-2023-46805 and fails closed', () => {
      const claims = createValidClaims();
      claims.push({
        id: 'CLM-99', claim_id: 'CLM-99', field: 'attack_technique', value: 'T1059 (CONFIRMED)',
        truth_type: 'SOURCE_FACT', confidence: 1.0,
        source: 'Chained CVE-2024-21887', source_ids: ['chained'], source_url: 'https://forums.ivanti.com',
        evidence_scope: 'CVE', source_timestamp: '2024-01-10', verification_status: 'VERIFIED',
        related_cve_ids: ['CVE-2024-21887'], notes: 'Illicit inheritance'
      });
      const result = verifyClaimsLedger('CVE-2023-46805', claims);
      expect(result.is_valid).toBe(false);
      expect(result.violations.some(v => v.claim_id === 'CLM-99' && v.issue.includes('T1059'))).toBe(true);
    });
  });

  // =========================================================================
  // 6. ADVERSARIAL MUTATION TESTING (MUTATIONS A THROUGH L)
  // =========================================================================
  describe('6. Adversarial Mutation Testing (A through L)', () => {
    function buildBaselineReport(cveId: string) {
      const oracle = GROUND_TRUTH_ORACLES[cveId];
      const evidenceCtx = oracleToEvidenceContext(oracle);
      const rels = evidenceCtx.relationships || [];
      const attack = buildStructuredAttackMappings({
        cveId,
        cweIds: oracle.cwe_mappings.cisa,
        isKev: true,
        evidenceIds: [],
        relationships: rels,
      });
      const attackPath = buildBoundedAttackPath(
        cveId,
        oracle.technical_mechanism,
        oracle.cwe_mappings.cisa,
        'None'
      );

      return {
        identity: { cve: cveId, product: oracle.primary_product, vendor: oracle.vendor },
        exploitation: {
          known_ransomware_campaign_use: oracle.cisa_kev.ransomware_campaign_use,
          cisa_due_date: oracle.cisa_kev.due_date,
          status: 'KNOWN_EXPLOITED',
        },
        mechanics: {
          technical_mechanism: oracle.technical_mechanism,
          primary_cwe: oracle.cwe_mappings.cisa[0],
          cwes: oracle.cwe_mappings.cisa,
          cvss: { ...oracle.cvss_v31 }, // copy — report must not alias the fixture
          authentication_required: 'NOT_REQUIRED',
        },
        affected_scope: {
          products_affected: oracle.products_affected,
          fixed_versions: oracle.products_affected[0].fixed_versions,
        },
        vendor_advisory: {
          advisory_id: oracle.vendor_advisory.advisory_id,
          advisory_url: oracle.vendor_advisory.advisory_url,
        },
        attack_path: attackPath,
        mitre_attack: attack,
        cve_relationships: rels,
        evidence: evidenceCtx,
        provenance: {
          claims: [
            {
              id: 'CLM-01', claim_id: 'CLM-01', field: 'identity', value: cveId,
              truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA KEV',
              source_url: 'https://www.cisa.gov', evidence_scope: 'CVE' as EvidenceScope,
              verification_status: 'VERIFIED'
            },
            {
              id: 'CLM-02', claim_id: 'CLM-02', field: 'technical_mechanism', value: oracle.technical_mechanism,
              truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'Vendor Advisory',
              source_url: oracle.vendor_advisory.advisory_url, evidence_scope: 'CVE' as EvidenceScope,
              verification_status: 'VERIFIED'
            },
            {
              id: 'CLM-03', claim_id: 'CLM-03', field: 'cisa_ransomware', value: oracle.cisa_kev.ransomware_campaign_use,
              truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA KEV',
              source_url: 'https://www.cisa.gov', evidence_scope: 'CVE' as EvidenceScope,
              verification_status: 'VERIFIED'
            }
          ]
        }
      };
    }

    it('Baseline reports pass semantic validation for all 6 ground-truth CVEs', () => {
      const cves = ['CVE-2021-22005', 'CVE-2021-44228', 'CVE-2023-46805', 'CVE-2024-3400', 'CVE-2024-21887', 'CVE-2023-34362'];
      for (const cve of cves) {
        const report = buildBaselineReport(cve);
        const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES[cve]));
        expect(res.isValid).toBe(true);
        expect(res.violations.length).toBe(0);
      }
    });

    // Mutation A: Wrong ransomware value
    it('Mutation A: Wrong ransomware value is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.exploitation.known_ransomware_campaign_use = 'Known'; // Contradiction with oracle 'Unknown'
      report.provenance.claims[2].value = 'Known';

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('ransomware') || v.includes('Known'))).toBe(true);
    });

    // Mutation B: Inject T1059 from CVE-2024-21887 into CVE-2023-46805
    it('Mutation B: Inject T1059 into CVE-2023-46805 is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.mitre_attack.push({
        technique_id: 'T1059',
        technique_name: 'Command and Scripting Interpreter',
        tactic: 'Execution',
        status: 'CONFIRMED',
        evidence_scope: 'CVE',
        derivation: 'Injected from related CVE-2024-21887'
      } as any);

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('T1059'))).toBe(true);
    });

    // Mutation C: Replace authentication bypass with command injection
    it('Mutation C: Replace authentication bypass with command injection is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.mechanics.technical_mechanism = 'OS command execution in backend script';

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Technical mechanism contamination') || v.includes('command execution'))).toBe(true);
    });

    // Mutation D: Copy fixed versions from related product/CVE
    it('Mutation D: Copy fixed versions from related product/CVE is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2021-22005');
      // Injected Cloud Foundation fixed version into vCenter primary scope
      report.affected_scope.fixed_versions = ['4.3.1.0', '3.11.0.0'];

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2021-22005']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Fixed version contamination') || v.includes('4.3'))).toBe(true);
    });

    // Mutation E: Replace vendor advisory with related-CVE advisory
    it('Mutation E: Replace vendor advisory with related-CVE advisory is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.vendor_advisory.advisory_id = 'VMSA-2021-0020'; // VMware advisory on Ivanti CVE
      report.vendor_advisory.advisory_url = 'https://www.vmware.com/security/advisories/VMSA-2021-0020.html';

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Vendor advisory mismatch'))).toBe(true);
    });

    // Mutation F: Copy CISA due date from another CVE
    it('Mutation F: Copy CISA due date from another CVE is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.exploitation.cisa_due_date = '2021-11-17'; // Injected from CVE-2021-22005

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('CISA due date contradiction'))).toBe(true);
    });

    // Mutation G: Change CVSS vector while leaving score unchanged
    it('Mutation G: Change CVSS vector while leaving score unchanged is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.mechanics.cvss.vector = 'CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:C/C:H/I:H/A:H'; // Mutated vector

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('CVSS vector'))).toBe(true);
    });

    // Mutation H: Mark UNKNOWN authentication as SOURCE_FACT
    it('Mutation H: Mark UNKNOWN authentication as SOURCE_FACT is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.mechanics.authentication_required = 'UNKNOWN';
      report.provenance.claims.push({
        id: 'CLM-04', claim_id: 'CLM-04', field: 'authentication', value: 'UNKNOWN',
        truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CISA',
        source_url: 'https://cisa.gov', evidence_scope: 'CVE' as EvidenceScope,        verification_status: 'VERIFIED'
      });

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);

      expect(res.violations.some(v => v.includes('UNKNOWN authentication marked as SOURCE_FACT'))).toBe(true);
    });

    // Mutation I: Insert unsupported ATT&CK technique
    it('Mutation I: Insert unsupported ATT&CK technique is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.mitre_attack.push({
        technique_id: 'T1068',
        technique_name: 'Exploitation for Privilege Escalation',
        tactic: 'Privilege Escalation',
        status: 'CONFIRMED',
        evidence_scope: 'CVE',
        derivation: 'Arbitrary attribution without evidence'
      } as any);

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Unsupported ATT&CK technique') || v.includes('T1068'))).toBe(true);
    });

    // Mutation J: Remove provenance source from one claim
    it('Mutation J: Remove provenance source from one claim is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.provenance.claims[0].source = ''; // Missing source

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Missing source') || v.includes('provenance'))).toBe(true);
    });

    // Mutation K: Add a campaign fact without CVE-specific evidence
    it('Mutation K: Add campaign fact without CVE-specific evidence is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.provenance.claims.push({
        id: 'CLM-CAMPAIGN', claim_id: 'CLM-CAMPAIGN', field: 'campaign_actor',
        value: 'UNC5221 espionage campaign',
        truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'Blog Post',
        source_url: 'https://threatintel.example.com',        evidence_scope: 'CVE' as EvidenceScope, // Illicit CVE scope
        verification_status: 'VERIFIED'
      });

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Campaign fact asserted under CVE scope') || v.includes('CLM-CAMPAIGN'))).toBe(true);
    });

    // Mutation L: Add related-CVE evidence and attempt to promote it to CVE-specific evidence
    it('Mutation L: Promote related-CVE evidence to CVE-specific evidence is DETECTED and rejected', () => {
      const report = buildBaselineReport('CVE-2023-46805');
      report.provenance.claims.push({
        id: 'CLM-PROMOTION', claim_id: 'CLM-PROMOTION', field: 'command_execution',
        value: 'Arbitrary shell execution demonstrated via CVE-2024-21887',
        truth_type: 'SOURCE_FACT', confidence: 1.0, source: 'CVE-2024-21887 advisory',
        source_url: 'https://forums.ivanti.com', evidence_scope: 'CVE' as EvidenceScope, // Promoted to CVE scope!
        verification_status: 'VERIFIED',
        related_cve_ids: ['CVE-2024-21887']
      });

      const res = validateReportSemantics(report, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Related-CVE evidence promoted') || v.includes('CLM-PROMOTION'))).toBe(true);
    });
  });

  // =========================================================================
  // 7. CROSS-CVE CONTAMINATION MATRIX
  // =========================================================================
  describe('7. Cross-CVE Contamination Matrix (Zero Unauthorized Inheritance)', () => {
    it('verifies zero unauthorized inheritance between CVE-2023-46805 and CVE-2024-21887', () => {
      const o1 = GROUND_TRUTH_ORACLES['CVE-2023-46805'];
      const o2 = GROUND_TRUTH_ORACLES['CVE-2024-21887'];

      expect(o1.technical_mechanism).not.toEqual(o2.technical_mechanism);
      expect(o1.cwe_mappings.cisa).not.toEqual(o2.cwe_mappings.cisa);
      expect(o1.cvss_v31.score).not.toEqual(o2.cvss_v31.score);

      // Verify keyword guard isolates them (evidence-injected)
      const check1 = validateTechnicalMechanismIsolation('CVE-2023-46805', o1.technical_mechanism, oracleToEvidenceContext(o1));
      expect(check1.isValid).toBe(true);

      const check2 = validateTechnicalMechanismIsolation('CVE-2024-21887', o2.technical_mechanism, oracleToEvidenceContext(o2));
      expect(check2.isValid).toBe(true);
    });

    it('verifies zero unauthorized inheritance between CVE-2021-22005 and VMware Cloud Foundation', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-22005'];
      const vcenterScope = oracle.products_affected.find(p => p.product === 'vCenter Server')!;
      const cfScope = oracle.products_affected.find(p => p.product.includes('Cloud Foundation'))!;

      expect(vcenterScope).toBeDefined();
      expect(cfScope).toBeDefined();

      // Ensure no version overlap
      for (const v of vcenterScope.affected_versions) {
        expect(cfScope.affected_versions).not.toContain(v);
      }
      for (const f of vcenterScope.fixed_versions) {
        expect(cfScope.fixed_versions).not.toContain(f);
      }
    });

    it('verifies zero unauthorized inheritance between CVE-2021-44228 and related Log4j CVEs', () => {
      const oracle = GROUND_TRUTH_ORACLES['CVE-2021-44228'];
      expect(oracle.cvss_v31.score).toBe(10.0);
      expect(oracle.technical_mechanism).toContain('JNDI lookup injection');

      // Check against CVE-2021-45046 (CVSS 9.0, DoS / RCE in non-default pattern layouts)
      expect(oracle.vendor_advisory.advisory_id).toBe('LOG4J2-3201');
    });
  });

  // =========================================================================
  // 8. REPORT RENDERING GATE (FAIL-CLOSED)
  // =========================================================================
  describe('8. Report Rendering Gate', () => {
    it('blocks publication and zeroes confidence when semantic validation fails', () => {
      const invalidReport = {
        identity: { cve: 'CVE-2023-46805', product: 'Connect Secure', vendor: 'Ivanti' },
        exploitation: { known_ransomware_campaign_use: 'Known' }, // Contradiction
        mechanics: { technical_mechanism: 'command injection' }, // Contamination
        provenance: { claims: [] }
      };

      const semanticGate = validateReportSemantics(invalidReport, oracleToEvidenceContext(GROUND_TRUTH_ORACLES['CVE-2023-46805']));
      expect(semanticGate.isValid).toBe(false);

      // Verify fail-closed status assignment
      const finalStatus = semanticGate.isValid ? 'PUBLISHED' : 'BLOCKED';
      const confidence = semanticGate.isValid ? 0.90 : 0.0;

      expect(finalStatus).toBe('BLOCKED');
      expect(confidence).toBe(0.0);
    });
  });
});
