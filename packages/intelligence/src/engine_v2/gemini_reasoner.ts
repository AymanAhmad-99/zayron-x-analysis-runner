/**
 * ZAYRON-X — GEMINI REASONING CLIENT (L9 ANALYTICAL SYNTHESIS)
 * 
 * Architectural Contract:
 * 1. HARD BOUNDARY: This module NEVER touches Cloudflare Vectorize, NEVER generates embeddings,
 *    and NEVER writes to any database. It receives already-retrieved, verified GroundedCitation
 *    objects and graph correlation paths as structured input.
 * 2. STRICT GROUNDING: Gemini may only reference exact quoted fragments from supplied citations.
 * 3. FALLBACK: If citations or evidence are insufficient, it outputs exactly:
 *    "Insufficient grounding for deeper analytical synthesis".
 * 4. BAN REPETITIVE BOILERPLATE: Bans generic boilerplate and enforces case-specific synthesis.
 */

export interface GroundedCitationInput {
  document_id: string;
  chunk_id: string;
  quoted_fragment: string;
  title?: string;
  section?: string;
}

export interface GraphCorrelationInput {
  entity_id: string;
  historical_entity_id: string;
  relationship_type: string;
  observed_interval: string;
  shared_infrastructure?: string[];
  summary: string;
}

export interface GeminiReasoningRequest {
  entity: {
    id: string;
    type: 'VULNERABILITY' | 'MALWARE' | 'THREAT_ACTOR' | 'GENERAL_CTI';
    name?: string;
    cvss_score?: number | null;
    affected_product?: string | null;
    raw_telemetry: string;
  };
  citations: GroundedCitationInput[];
  graphCorrelation?: GraphCorrelationInput | null;
  apiKey?: string;
}

export interface GeminiReasoningResponse {
  analytical_paragraph: string;
  correlation_narrative?: string;
  citations_referenced: string[];
  status: 'SYNTHESIZED' | 'INSUFFICIENT_GROUNDING' | 'FALLBACK';
  model_id: string;
  duration_ms: number;
}

export const INSUFFICIENT_GROUNDING_SENTENCE = "Insufficient grounding for deeper analytical synthesis";

/**
 * Builds the strict, grounded system instruction for Gemini.
 */
export function buildGeminiReasoningPrompt(request: GeminiReasoningRequest): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are the Lead Intelligence Analyst for Z.X.Intelligence.
Your task is to synthesize a single, rigorous analytical paragraph explaining WHY this specific entity matters based STRICTLY on the supplied book grounding citations and graph correlation path.

MANDATORY RULES:
1. You may only make claims directly supported by the supplied citations and graph path.
2. Every substantive analytical assertion must cite or directly align with the supplied quoted_fragment strings.
3. If the supplied evidence or citations are insufficient to explain significance with authoritative grounding, you must output exactly:
"${INSUFFICIENT_GROUNDING_SENTENCE}"
and nothing else.
4. Do not use generic security advice language (e.g. "apply patches immediately", "audit your network perimeter", "remain vigilant").
5. Do not invent new CVEs, actors, techniques, or dates not present in the input.
6. Keep the analytical paragraph concise (3-5 dense, analyst-grade sentences).`;

  const citationsSummary = request.citations.length > 0
    ? request.citations.map((c, i) => `[Citation ${i + 1}] (${c.document_id} / ${c.chunk_id}): "${c.quoted_fragment}"`).join('\n')
    : 'NO RETRIEVED CITATIONS PROVIDED.';

  const graphSummary = request.graphCorrelation
    ? `Graph Correlation: ${request.graphCorrelation.entity_id} connects to historical entity ${request.graphCorrelation.historical_entity_id} via [${request.graphCorrelation.relationship_type}] (observed ${request.graphCorrelation.observed_interval}). Shared infrastructure: ${request.graphCorrelation.shared_infrastructure?.join(', ') || 'None'}. Path Summary: ${request.graphCorrelation.summary}`
    : 'No historical graph correlation observed.';

  const userPrompt = `ANALYTICAL SYNTHESIS REQUEST:
Target Entity: ${request.entity.name || request.entity.id} (${request.entity.type})
CVSS Base Score: ${request.entity.cvss_score !== null && request.entity.cvss_score !== undefined ? request.entity.cvss_score : 'N/A'}
Affected Product: ${request.entity.affected_product || 'N/A'}

Raw Telemetry Excerpt:
"${request.entity.raw_telemetry.slice(0, 500)}"

Supplied Verified Book Citations:
${citationsSummary}

${graphSummary}

Provide your synthesis in JSON format:
{
  "analytical_paragraph": "string (Dense analytical synthesis or exact fallback sentence)",
  "correlation_narrative": "string (Optional narrative if graph path exists, or null)",
  "citations_referenced": ["chunk_id_1", "chunk_id_2"]
}`;

  return { systemInstruction, userPrompt };
}

/**
 * Executes Gemini Analytical Synthesis with strict citation grounding.
 */
export async function executeGeminiReasoningSynthesis(
  request: GeminiReasoningRequest
): Promise<GeminiReasoningResponse> {
  const start = Date.now();
  const MODEL_ID = 'gemini-1.5-pro';

  // If no citations are supplied and no graph correlation exists, return immediate fallback without burning quota
  if (request.citations.length === 0 && !request.graphCorrelation) {
    return {
      analytical_paragraph: INSUFFICIENT_GROUNDING_SENTENCE,
      citations_referenced: [],
      status: 'INSUFFICIENT_GROUNDING',
      model_id: MODEL_ID,
      duration_ms: Date.now() - start,
    };
  }

  const apiKey = request.apiKey || (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.GEMINI_API_KEY);
  if (!apiKey) {
    // Graceful offline fallback: synthesize deterministic analytical paragraph based strictly on citations
    const firstCit = request.citations[0];
    const fallbackText = firstCit
      ? `Analysis confirms threat characteristics aligning with authoritative methodology from ${firstCit.document_id} (${firstCit.chunk_id}): "${firstCit.quoted_fragment}".`
      : INSUFFICIENT_GROUNDING_SENTENCE;

    return {
      analytical_paragraph: fallbackText,
      citations_referenced: firstCit ? [firstCit.chunk_id] : [],
      status: 'FALLBACK',
      model_id: 'local_grounded_fallback',
      duration_ms: Date.now() - start,
    };
  }

  const { systemInstruction, userPrompt } = buildGeminiReasoningPrompt(request);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`[Gemini Reasoner] API call failed with status ${res.status}:`, await res.text());
      return {
        analytical_paragraph: INSUFFICIENT_GROUNDING_SENTENCE,
        citations_referenced: [],
        status: 'FALLBACK',
        model_id: MODEL_ID,
        duration_ms: Date.now() - start,
      };
    }

    const data = await res.json() as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(rawText);

    const paragraph = (parsed.analytical_paragraph || '').trim();
    const correlationNarrative = parsed.correlation_narrative ? parsed.correlation_narrative.trim() : undefined;
    const citationsReferenced = Array.isArray(parsed.citations_referenced) ? parsed.citations_referenced : [];

    // Verify fallback sentence
    if (paragraph.includes(INSUFFICIENT_GROUNDING_SENTENCE)) {
      return {
        analytical_paragraph: INSUFFICIENT_GROUNDING_SENTENCE,
        citations_referenced: [],
        status: 'INSUFFICIENT_GROUNDING',
        model_id: MODEL_ID,
        duration_ms: Date.now() - start,
      };
    }

    return {
      analytical_paragraph: paragraph,
      correlation_narrative: correlationNarrative,
      citations_referenced: citationsReferenced,
      status: 'SYNTHESIZED',
      model_id: MODEL_ID,
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    console.warn('[Gemini Reasoner] Execution error:', err.message);
    return {
      analytical_paragraph: INSUFFICIENT_GROUNDING_SENTENCE,
      citations_referenced: [],
      status: 'FALLBACK',
      model_id: MODEL_ID,
      duration_ms: Date.now() - start,
    };
  }
}
