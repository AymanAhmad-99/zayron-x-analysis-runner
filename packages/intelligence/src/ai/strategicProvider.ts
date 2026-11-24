/**
 * Phase 4B — the ONE Workers AI provider boundary for strategic synthesis.
 *
 * BOTH strategic workloads (CVE `ai_analyst_assessment.v3` and malware
 * `malware_strategic_brief.v1`) must run the identical provider policy, so it
 * lives here instead of being re-implemented per domain:
 *
 *   1. PRIMARY   `@cf/google/gemma-4-26b-a4b-it` via `env.AI` — edge-native,
 *                thinking disabled, provider-side strict `json_schema`.
 *   2. FALLBACK  `@cf/ibm-granite/granite-4.0-h-micro` on a transient primary
 *                failure (`json_object` dialect).
 *   3. OPTIONAL  Gemini, ONLY when explicitly enabled AND authenticated, and
 *                only after BOTH Workers AI models failed.
 *
 * Nothing here knows what the JSON means: the caller supplies the schema and
 * owns the semantic gate.
 */

export const CLOUDFLARE_STRATEGIC_MODEL = '@cf/google/gemma-4-26b-a4b-it';
export const CLOUDFLARE_STRATEGIC_FALLBACK_MODEL = '@cf/ibm-granite/granite-4.0-h-micro';
const GEMINI_TIMEOUT_MS = 45_000;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface StrategicProviderEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_STRATEGIC_FALLBACK?: string;
  AI?: { run(model: string, options: any): Promise<any> };
}

export type StrategicGenResult =
  | { ok: true; text: string; model: string; input_tokens: number | null; output_tokens: number | null }
  | { ok: false; error: string; model: string };

export interface StructuredGenerationRequest {
  systemPrompt: string;
  userContent: string;
  /** JSON Schema sent to models that support `json_schema` (gemma). */
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
}

export function geminiFallbackEnabled(env: StrategicProviderEnv): boolean {
  return String(env.GEMINI_STRATEGIC_FALLBACK || '').trim().toLowerCase() === 'true'
    && typeof env.GEMINI_API_KEY === 'string'
    && env.GEMINI_API_KEY.trim().length > 0;
}

export function hasStrategicProvider(env: StrategicProviderEnv): boolean {
  return Boolean(env.AI) || geminiFallbackEnabled(env);
}

/**
 * Extract completion text from every Workers AI text-generation shape:
 *   - `{ response: "<json string>" }`            (classic text-generation)
 *   - `{ response: { ... } }`                    (JSON response_format parsed)
 *   - `{ choices: [{ message: { content } }] }`  (chat-completions / gemma)
 *   - `{ output_text: "..." }`
 */
export function extractWorkersAIText(response: any): string {
  const direct = response?.response;
  if (typeof direct === 'string' && direct.trim()) return direct;
  if (direct && typeof direct === 'object') return JSON.stringify(direct);
  const outputText = response?.output_text;
  if (typeof outputText === 'string' && outputText.trim()) return outputText;
  const message = response?.choices?.[0]?.message ?? response?.choices?.[0];
  const content = message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  if (Array.isArray(content)) {
    const joined = content.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('');
    if (joined.trim()) return joined;
  }
  if (typeof response?.result?.response === 'string' && response.result.response.trim()) {
    return response.result.response;
  }
  return '';
}

const isGemma = (model: string): boolean => model.includes('gemma');

async function callWorkersAI(
  ai: NonNullable<StrategicProviderEnv['AI']>,
  model: string,
  request: StructuredGenerationRequest,
): Promise<StrategicGenResult> {
  try {
    const response = await ai.run(model, {
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userContent },
      ],
      ...(isGemma(model)
        // Gemma answers in the OpenAI chat-completions shape and emits a visible
        // reasoning trace by default. Thinking is off for these bounded
        // extractions: reasoning tokens are paid Neurons and add no grounding.
        ? { chat_template_kwargs: { enable_thinking: false } }
        : {}),
      response_format: isGemma(model)
        ? {
            type: 'json_schema',
            json_schema: {
              name: request.schemaName,
              description: 'ZAYRON-X grounded strategic synthesis',
              schema: request.schema,
              strict: true,
            },
          }
        : { type: 'json_object' },
      max_tokens: request.maxTokens ?? 1400,
      temperature: 0.1,
    });
    const text = extractWorkersAIText(response);
    if (!text.trim()) {
      let diag = '';
      try {
        diag = Object.keys(response || {}).join(',');
      } catch { /* non-object response */ }
      return { ok: false, model, error: `WORKERS_AI_EMPTY_RESPONSE:${diag || 'UNKNOWN_SHAPE'}` };
    }
    return {
      ok: true,
      text,
      model,
      input_tokens: typeof response?.usage?.prompt_tokens === 'number' ? response.usage.prompt_tokens : null,
      output_tokens: typeof response?.usage?.completion_tokens === 'number' ? response.usage.completion_tokens : null,
    };
  } catch (error) {
    return {
      ok: false,
      model,
      error: `WORKERS_AI_ERROR:${String((error as Error)?.message || error).slice(0, 120)}`,
    };
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  request: StructuredGenerationRequest,
  fetchFn: typeof fetch,
): Promise<StrategicGenResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const response = await fetchFn(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: request.userContent }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: request.maxTokens ?? 2400,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json() as any;
        detail = ` ${String(body?.error?.status || '')} ${String(body?.error?.message || '').slice(0, 160)}`.trim();
      } catch { /* status-only classification */ }
      return { ok: false, model, error: `GEMINI_HTTP_${response.status}${detail ? `:${detail}` : ''}` };
    }
    const payload = await response.json() as any;
    const text = (payload?.candidates?.[0]?.content?.parts || [])
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
    const usage = payload?.usageMetadata || {};
    return {
      ok: true,
      text,
      model,
      input_tokens: typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : null,
      output_tokens: typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null,
    };
  } catch (error) {
    return {
      ok: false,
      model,
      error: (error as Error)?.name === 'AbortError' ? 'GEMINI_TIMEOUT' : 'GEMINI_TRANSPORT_ERROR',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One structured generation across the provider chain, in policy order:
 * primary Workers AI → ultra-light Workers AI fallback → optional Gemini.
 */
export async function generateStructuredText(
  env: StrategicProviderEnv,
  request: StructuredGenerationRequest,
  fetchFn: typeof fetch = fetch,
): Promise<{ result: StrategicGenResult; provider_errors: string[] }> {
  const providerErrors: string[] = [];

  if (env.AI) {
    const primary = await callWorkersAI(env.AI, CLOUDFLARE_STRATEGIC_MODEL, request);
    if (primary.ok) return { result: primary, provider_errors: providerErrors };
    providerErrors.push(`PRIMARY:${primary.error}`);

    const fallback = await callWorkersAI(env.AI, CLOUDFLARE_STRATEGIC_FALLBACK_MODEL, request);
    if (fallback.ok) return { result: fallback, provider_errors: providerErrors };
    providerErrors.push(`FALLBACK:${fallback.error}`);
  }

  if (geminiFallbackEnabled(env)) {
    const model = (typeof env.GEMINI_MODEL === 'string' && env.GEMINI_MODEL.trim()) || 'gemini-3.8-flash';
    const gemini = await callGemini(String(env.GEMINI_API_KEY).trim(), model, request, fetchFn);
    if (gemini.ok) return { result: gemini, provider_errors: providerErrors };
    providerErrors.push(`GEMINI:${gemini.error}`);
  }

  return {
    result: {
      ok: false,
      model: env.AI ? CLOUDFLARE_STRATEGIC_MODEL : 'NO_PROVIDER',
      error: providerErrors.join(';') || 'NO_PROVIDER_AVAILABLE',
    },
    provider_errors: providerErrors,
  };
}
