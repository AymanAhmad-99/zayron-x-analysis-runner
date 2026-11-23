import { describe, it, expect, beforeEach } from 'bun:test';
import {
  WORKERS_AI_CVE_MODEL,
  __resetAIProviderCircuits,
  runGroundedCveAnalysis,
  type GroundedCveAnalysisInput,
} from '@zayron/intelligence';

describe('GROUNDED CVE ANALYSIS — MODEL ADAPTER CONTRACT (@cf/qwen/qwen3.8-27b)', () => {
  // The provider circuit breaker is isolate-level state; reset it so each case is independent.
  beforeEach(() => {
    __resetAIProviderCircuits();
  });

  const BASE_INPUT: Omit<GroundedCveAnalysisInput, 'aiBinding'> = {
    cveId: 'CVE-2023-22527',
    vendor: 'Atlassian',
    product: 'Confluence Data Center and Server',
    vulnerabilityName: 'Atlassian Confluence Template Injection',
    description: 'Template injection vulnerability leading to remote code execution.',
    cweDetails: [{ id: 'CWE-74', name: 'Improper Neutralization of Special Elements' }],
    cvssScore: '9.8',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    isKev: true,
    attackVector: 'NETWORK',
    privilegesRequired: 'NONE',
    userInteraction: 'NONE',
    affectedVersions: ['>= 8.0.0 < 8.5.4'],
    fixedVersions: ['8.5.4'],
    ransomwareCampaignUse: 'Known',
  };

  it('strictly targets @cf/qwen/qwen3.8-27b with explicit configuration', async () => {
    expect(WORKERS_AI_CVE_MODEL).toBe('@cf/qwen/qwen3.8-27b');

    let invokedModel = '';
    let invokedOptions: any = null;
    let callCount = 0;

    const mockAi = {
      run: async (model: string, options: any) => {
        callCount++;
        invokedModel = model;
        invokedOptions = options;
        return {
          response: JSON.stringify({
            vulnerability_type: 'Template Injection',
            root_cause: 'OGNL expression injection during template evaluation',
            attack_surface: 'Network-accessible Confluence web application endpoints',
            prerequisites: 'Network reachability without prior authentication',
            authentication_required: false,
            privileges_required: 'none',
            user_interaction: 'none',
            attack_vector: 'NETWORK',
            technical_impact: 'Total compromise of host process execution context',
            affected_versions: '>= 8.0.0 < 8.5.4',
            fixed_versions: '8.5.4',
            exploitation_context: 'Active in-the-wild exploitation cataloged in CISA KEV',
            attack_exposure: 'Internet-facing and internal server instances',
            observable_behaviors: 'Anomalous HTTP POST requests targeting setup or template endpoints',
            defensive_signals: 'Monitor web application access logs and child process creation from confluence user',
            detection_confidence: 'HIGH',
            executive_assessment: 'Critical unauthenticated remote code execution vulnerability actively exploited in Confluence Data Center.',
            technical_assessment: 'Adversaries submit malicious OGNL expressions evaluated by the template engine, achieving code execution without credentials.',
            confidence_basis: 'Directly grounded in CISA KEV and NVD CVSS telemetry',
            uncertainties: ['Specific secondary payload variants deployed by uncategorized actors'],
          }),
          usage: {
            prompt_tokens: 412,
            completion_tokens: 285,
            total_tokens: 697,
          },
        };
      },
    };

    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      aiBinding: mockAi,
    });

    // 1. Exact model verified
    expect(invokedModel).toBe('@cf/qwen/qwen3.8-27b');
    expect(result.model).toBe('@cf/qwen/qwen3.8-27b');

    // 2. Cost guard: Exactly ONE call per CVE
    expect(callCount).toBe(1);

    // 3. Max completion budget bounded to 1200
    expect(invokedOptions.max_tokens).toBe(1200);
    expect(invokedOptions.temperature).toBe(0.1);

    // 4. Output validation
    expect(result.status).toBe('PASS');
    expect(result.fallback_used).toBe(false);
    expect(result.input_tokens).toBe(412);
    expect(result.output_tokens).toBe(285);
    expect(result.analysis?.executive_assessment).toContain('Critical unauthenticated');
    expect(result.analysis?.root_cause).toContain('OGNL expression injection');
  });

  it('parses OpenAI-compatible choices format correctly', async () => {
    const mockAi = {
      run: async () => ({
        choices: [
          {
            message: {
              content: '```json\n{"executive_assessment": "Assessed by Qwen.", "root_cause": "Flaw", "attack_vector": "NETWORK"}\n```',
            },
          },
        ],
        usage: { prompt_tokens: 300, completion_tokens: 150 },
      }),
    };

    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      aiBinding: mockAi,
    });

    expect(result.status).toBe('PASS');
    expect(result.analysis?.executive_assessment).toBe('Assessed by Qwen.');
    expect(result.analysis?.root_cause).toBe('Flaw');
  });

  it('fails safely without a provider transition and without retrying when model throws an exception', async () => {
    let callCount = 0;
    const mockAi = {
      run: async () => {
        callCount++;
        throw new Error('5028: Rate limited or unavailable');
      },
    };

    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      aiBinding: mockAi,
    });

    expect(callCount).toBe(1); // Cost guard: strictly NO retry loops
    expect(result.status).toBe('FAIL');
    // fallback_used means "the primary failed and execution transitioned to the secondary
    // provider". No Gemini key is configured here, so no transition can occur.
    expect(result.fallback_used).toBe(false);
    expect(result.error_code).toContain('5028');
    expect(result.analysis).toBeNull();
  });

  it('fails safely and flags JSON_PARSE_ERROR when model returns malformed non-JSON prose', async () => {
    const mockAi = {
      run: async () => ({
        response: 'This is an unparseable model response without JSON formatting.',
      }),
    };

    const result = await runGroundedCveAnalysis({
      ...BASE_INPUT,
      aiBinding: mockAi,
    });

    expect(result.status).toBe('FAIL');
    // The provider call succeeded; only the output was unparseable, so no transition occurred.
    expect(result.fallback_used).toBe(false);
    expect(result.error_code).toBe('JSON_PARSE_ERROR');
    expect(result.analysis).toBeNull();
  });
});
