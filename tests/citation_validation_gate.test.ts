import { describe, test, expect } from 'bun:test';
import { evaluateDeepQualityGateV2 } from '../packages/intelligence/src/engine_v2/quality_gate';
import { CanonicalReportObjectV2, GroundedClaimV2, KnowledgeTraceItemV2 } from '../packages/intelligence/src/engine_v2/types';

describe('Stage 3 Hard Validation Gate — Exact Quoted Substring Verification', () => {
  const authenticChunkText = 'Organizations should prioritize remediating vulnerabilities that are currently being actively exploited in the wild, as confirmed by authoritative operational threat telemetry.';

  const mockKnowledgeTrace: KnowledgeTraceItemV2[] = [
    {
      document_id: 'doc-05-nist-sp-800-61r3',
      chunk_id: 'chk_nist_sp61_01',
      chunk_text: authenticChunkText,
      title: 'NIST SP 800-61r3: Incident Handling Guide',
      authority_tier: 0,
      domain: 'INCIDENT_RESPONSE',
      retrieval_score: 0.92,
      retrieval_method: 'STANDARDS_LOOKUP',
      reason_retrieved: 'Incident response lifecycle prioritization',
      section_influenced: ['03', '07'],
      claim_influenced: ['clm_01'],
      status: 'USED',
    }
  ];

  const baseReport: CanonicalReportObjectV2 = {
    report_id: 'rep_test_01',
    schema_version: '2.0.0',
    report_type: 'VULNERABILITY',
    depth: 'MODERATE',
    headline: 'Test Vulnerability Assessment',
    executive_summary: 'Test summary statement regarding active vulnerability.',
    severity: 'HIGH',
    priority: 'P2',
    confidence: {
      source_reliability: 0.9,
      evidence_strength: 0.85,
      analytical_confidence: 0.88,
      overall_confidence: 0.88,
      rating: 'HIGH',
      calibration_rationale: 'Calibrated from official vendor errata.'
    },
    enrichment: {
      cve_id: 'CVE-2026-12345',
      cvss_score: 7.5,
      cvss_severity: 'HIGH',
      cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
      exploit_status: 'EXPLOITATION_IN_THE_WILD',
      cisa_kev: { is_in_kev: true },
      epss: { score: 0.42 },
      analyst_priority: 'P2'
    },
    provenance: [
      {
        source_id: 'src_vendor_01',
        issuing_authority: 'Vendor Advisory Portal',
        collection_channel: 'vendor_rss',
        source_tier: 'PRIMARY_FACT_SOURCE',
        reference_url: 'https://vendor.example.com/sec/2026-12345',
        observed_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        retrieved_at: new Date().toISOString(),
        content_hash: 'abc123hash'
      }
    ],
    contradictions: [],
    claims: [],
    attack_mappings: [
      {
        technique_id: 'T1190',
        technique_name: 'Exploit Public-Facing Application',
        tactic: 'Initial Access',
        behavior_observed: 'Remote unauthenticated exploit attempt detected.',
        evidence_id: 'evi_01',
        confidence: 0.9
      }
    ],
    sections: [],
    knowledge_trace: mockKnowledgeTrace,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  test('PASSES when quoted_fragment is an exact character-for-character substring of chunk text', () => {
    const validClaim: GroundedClaimV2 = {
      claim_id: 'clm_01',
      claim_type: 'INFERENCE',
      statement: 'Active exploitation necessitates immediate prioritized containment.',
      evidence_ids: ['evi_01'],
      book_citations: [
        {
          document_id: 'doc-05-nist-sp-800-61r3',
          chunk_id: 'chk_nist_sp61_01',
          quoted_fragment: 'remediating vulnerabilities that are currently being actively exploited in the wild',
          authority_tier: 0
        }
      ],
      confidence: 0.9,
      rationale: 'Direct alignment with NIST 800-61 containment prioritization.'
    };

    const report = { ...baseReport, claims: [validClaim] };
    const result = evaluateDeepQualityGateV2(report, 'CVE-2026-12345 active exploit observed on network interface.');
    
    expect(result.stage_results.knowledge_validation.passed).toBe(true);
    expect(result.stage_results.knowledge_validation.violations.length).toBe(0);
  });

  test('BLOCKS when quoted_fragment is altered, paraphrased, or not a verbatim substring', () => {
    const fabricatedClaim: GroundedClaimV2 = {
      claim_id: 'clm_02',
      claim_type: 'INFERENCE',
      statement: 'Active exploitation requires urgent perimeter patching.',
      evidence_ids: ['evi_01'],
      book_citations: [
        {
          document_id: 'doc-05-nist-sp-800-61r3',
          chunk_id: 'chk_nist_sp61_01',
          // Altered words: "organizations must immediately patch all zero days" does NOT exist in chunk
          quoted_fragment: 'organizations must immediately patch all zero days',
          authority_tier: 0
        }
      ],
      confidence: 0.9,
      rationale: 'Paraphrased expectation.'
    };

    const report = { ...baseReport, claims: [fabricatedClaim] };
    const result = evaluateDeepQualityGateV2(report, 'CVE-2026-12345 active exploit observed on network interface.');
    
    expect(result.stage_results.knowledge_validation.passed).toBe(false);
    expect(result.stage_results.knowledge_validation.violations[0]).toContain('CITATION VERIFICATION FAILED');
    expect(result.passed).toBe(false);
    expect(result.publication_status).toBe('REVIEW_REQUIRED');
  });

  test('BLOCKS when quoted_fragment contains non-substantive front-matter/navigation boilerplate', () => {
    const maliciousReport: CanonicalReportObjectV2 = {
      ...baseReport,
      claims: [
        {
          claim_id: 'clm_01',
          claim_type: 'INFERENCE',
          statement: 'CVSS Base Score registered at 9.8.',
          evidence_ids: ['evi_01'],
          confidence: 0.95,
          rationale: 'Official NVD metrics.',
          book_citations: [
            {
              document_id: 'doc-07-first-cvss4',
              chunk_id: 'doc-07-first-cvss4-p0-1',
              quoted_fragment: 'CVSS v4.0 Specification Document Member Portal About FIRST Mission Statement Strategy Framework History Sustainable Development Goals Organization Board of Directors Operations Team',
              authority_tier: 0,
            }
          ]
        }
      ],
      knowledge_trace: [
        {
          document_id: 'doc-07-first-cvss4',
          chunk_id: 'doc-07-first-cvss4-p0-1',
          chunk_text: 'CVSS v4.0 Specification Document Member Portal About FIRST Mission Statement Strategy Framework History Sustainable Development Goals Organization Board of Directors Operations Team full text',
          title: 'CVSS v4.0 Specification Document',
          domain: 'VULNERABILITY_ANALYSIS',
          retrieval_score: 0.95,
          retrieval_method: 'STANDARDS_LOOKUP',
          reason_retrieved: 'Correlated CVSS specification',
          section_influenced: ['03'],
          claim_influenced: ['clm_01'],
          status: 'USED',
        }
      ]
    };

    const result = evaluateDeepQualityGateV2(maliciousReport, 'Telemetry text');
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.includes('CITATION SUBSTANCE DEFECT'))).toBe(true);
  });

  test('BLOCKS when quoted_fragment is empty whitespace', () => {
    const emptyCitationClaim: GroundedClaimV2 = {
      claim_id: 'clm_03',
      claim_type: 'INFERENCE',
      statement: 'Active exploitation requires urgent perimeter patching.',
      evidence_ids: ['evi_01'],
      book_citations: [
        {
          document_id: 'doc-05-nist-sp-800-61r3',
          chunk_id: 'chk_nist_sp61_01',
          quoted_fragment: '   ',
          authority_tier: 0
        }
      ],
      confidence: 0.9,
      rationale: 'Empty citation.'
    };

    const report = { ...baseReport, claims: [emptyCitationClaim] };
    const result = evaluateDeepQualityGateV2(report, 'CVE-2026-12345 active exploit observed on network interface.');
    
    expect(result.stage_results.knowledge_validation.passed).toBe(false);
    expect(result.stage_results.knowledge_validation.violations[0]).toContain('CITATION DEFECT');
  });
});
