import { describe, it, expect } from 'bun:test';
import { 
  buildGeminiReasoningPrompt, 
  executeGeminiReasoningSynthesis,
  INSUFFICIENT_GROUNDING_SENTENCE 
} from '../packages/intelligence/src/engine_v2/gemini_reasoner';

describe('Gemini Reasoning Client Architectural Boundary & Grounding Suite (Mandates Part 2 & 3)', () => {
  it('1. Architectural Boundary: module has zero imports from vectorize, d1, or Workers AI', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('packages/intelligence/src/engine_v2/gemini_reasoner.ts', 'utf8');
    
    expect(content.includes('env.VECTORIZE')).toBe(false);
    expect(content.includes('VectorizeIndex')).toBe(false);
    expect(content.includes('@cf/baai/bge-base-en-v1.5')).toBe(false);
    expect(content.includes('knowledge_chunks')).toBe(false);
    expect(content.includes('env.DB')).toBe(false);
  });

  it('2. Immediate Fallback: outputs exact insufficient grounding sentence when no citations are provided without burning quota', async () => {
    const res = await executeGeminiReasoningSynthesis({
      entity: {
        id: 'CVE-2024-9999',
        type: 'VULNERABILITY',
        raw_telemetry: 'Sample vulnerability without book citations',
      },
      citations: [],
      graphCorrelation: null,
    });

    expect(res.status).toBe('INSUFFICIENT_GROUNDING');
    expect(res.analytical_paragraph).toBe(INSUFFICIENT_GROUNDING_SENTENCE);
    expect(res.citations_referenced.length).toBe(0);
  });

  it('3. Prompt Contract: correctly injects verified book citations and graph correlation path', () => {
    const { systemInstruction, userPrompt } = buildGeminiReasoningPrompt({
      entity: {
        id: 'CVE-2024-0553',
        type: 'VULNERABILITY',
        name: 'OpenSSL Memory Corruption',
        cvss_score: 9.8,
        affected_product: 'openssl',
        raw_telemetry: 'Critical TLS memory corruption flaw in openssl',
      },
      citations: [
        {
          document_id: 'doc-07-first-cvss4',
          chunk_id: 'doc-07-first-cvss4-p1-18',
          quoted_fragment: 'This metric reflects the context by which vulnerability exploitation is possible.',
        }
      ],
      graphCorrelation: {
        entity_id: 'CVE-2024-0553',
        historical_entity_id: 'CAMP-2024-01',
        relationship_type: 'SHARED_INFRASTRUCTURE',
        observed_interval: '2 months ago',
        shared_infrastructure: ['185.220.101.5'],
        summary: 'Target infrastructure aligns with previous campaign activity.',
      }
    });

    expect(systemInstruction.includes(INSUFFICIENT_GROUNDING_SENTENCE)).toBe(true);
    expect(systemInstruction.includes('Do not use generic security advice language')).toBe(true);
    expect(userPrompt.includes('doc-07-first-cvss4-p1-18')).toBe(true);
    expect(userPrompt.includes('This metric reflects the context by which vulnerability exploitation is possible.')).toBe(true);
    expect(userPrompt.includes('SHARED_INFRASTRUCTURE')).toBe(true);
    expect(userPrompt.includes('185.220.101.5')).toBe(true);
  });
});
