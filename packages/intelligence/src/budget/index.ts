/**
 * ZAYRON-X — AI Budget & Circuit Breaker Engine
 * Enforces Cloudflare Workers AI cost budget, estimates neurons & tokens,
 * projects monthly consumption, and provides automatic circuit breaking.
 */

export type BudgetState = 'GREEN' | 'YELLOW' | 'RED' | 'CIRCUIT_BREAKER';

export interface BudgetStatus {
  state: BudgetState;
  daily_neurons_used: number;
  daily_neurons_limit: number;
  daily_percentage: number;
  daily_ai_calls: number;
  daily_cached_calls: number;
  monthly_neurons_projected: number;
  monthly_cost_estimated_usd: number;
  active_circuit_breaker: boolean;
  message: string;
  timestamp: string;
}

export interface BudgetConfig {
  dailyNeuronLimit: number;      // Default: 10,000 (Cloudflare free included daily neurons)
  monthlyNeuronTarget: number;   // Default: 300,000 neurons ($5 base paid budget target)
  yellowThreshold: number;       // 0.50 (50%)
  redThreshold: number;          // 0.80 (80%)
  circuitBreakerThreshold: number; // 0.95 (95%)
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  dailyNeuronLimit: 10000,
  monthlyNeuronTarget: 300000,
  yellowThreshold: 0.50,
  redThreshold: 0.80,
  circuitBreakerThreshold: 0.95,
};

/**
 * Estimates neurons consumed for an AI operation based on model and token counts.
 * Cloudflare Workers AI pricing:
 * - @cf/google/gemma-4-26b-a4b-it: ~0.0091 neurons per input token, ~0.0273 neurons
 *   per output token ($0.10/$0.30 per M tokens at $0.011 per 1,000 neurons) — the
 *   Phase 4A.2 primary strategic model.
 * - @cf/meta/llama-3.1-8b-instruct: ~0.025 neurons per input token, ~0.05 neurons per output token
 * - @cf/meta/llama-3.2-1b-instruct: ~0.005 neurons per input token, ~0.01 neurons per output token
 * - @cf/baai/bge-base-en-v1.5: ~0.001 neurons per input token
 */
export function estimateNeurons(modelId: string, promptTokens: number, completionTokens: number): number {
  if (modelId.includes('gemma-4-26b-a4b')) {
    return Math.ceil((promptTokens * 0.0091) + (completionTokens * 0.0273));
  }
  if (modelId.includes('llama-3.1-8b')) {
    return Math.ceil((promptTokens * 0.025) + (completionTokens * 0.05));
  }
  if (modelId.includes('llama-3.2-1b') || modelId.includes('llama-3.2-3b')) {
    return Math.ceil((promptTokens * 0.005) + (completionTokens * 0.01));
  }
  if (modelId.includes('bge-base')) {
    return Math.max(1, Math.ceil(promptTokens * 0.001));
  }
  return Math.ceil((promptTokens * 0.02) + (completionTokens * 0.04));
}

/**
 * Gemini provider-reported token usage.
 *
 * NO COST IS CLAIMED HERE, deliberately. Cloudflare's neuron accounting does not
 * apply to Gemini, and this repository records no verified per-token Gemini price,
 * so only the RAW provider-reported token counts are aggregated and bounded.
 * Absent counts stay absent (counted in `requests_without_usage`) rather than being
 * treated as zero, and no USD estimate is derived from them.
 */
export interface GeminiTokenUsage {
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** Records whose provider reported no usage at all. */
  requests_without_usage: number;
}

export interface GeminiTokenSample {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
}

/** Token-volume ceiling for Gemini traffic; a resource bound, not a price. */
export const DEFAULT_GEMINI_DAILY_TOKEN_LIMIT = 250_000;

export function accumulateGeminiTokenUsage(samples: readonly GeminiTokenSample[]): GeminiTokenUsage {
  let promptTokens = 0;
  let completionTokens = 0;
  let withoutUsage = 0;
  const list = samples ?? [];
  for (const sample of list) {
    const prompt = typeof sample?.prompt_tokens === 'number' ? sample.prompt_tokens : null;
    const completion = typeof sample?.completion_tokens === 'number' ? sample.completion_tokens : null;
    if (prompt === null && completion === null) {
      withoutUsage += 1;
      continue;
    }
    promptTokens += prompt ?? 0;
    completionTokens += completion ?? 0;
  }
  return {
    requests: list.length,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    requests_without_usage: withoutUsage,
  };
}

/**
 * Whether the aggregated Gemini token volume has reached its resource ceiling.
 * `dailyTokenLimit` is a volume bound; it is NOT a monetary budget.
 */
export function isGeminiTokenLimitReached(
  usage: GeminiTokenUsage,
  dailyTokenLimit: number = DEFAULT_GEMINI_DAILY_TOKEN_LIMIT,
): boolean {
  return usage.total_tokens >= dailyTokenLimit;
}

/**
 * Neuron accounting is Cloudflare-specific. For Gemini this returns `null` — the
 * absence of a cost figure is stated explicitly rather than filled with a guess
 * derived from Cloudflare's neuron rates.
 */
export function estimateNeuronsForProvider(
  provider: 'cloudflare' | 'gemini',
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  if (provider === 'gemini') return null;
  return estimateNeurons(modelId, promptTokens, completionTokens);
}

/**
 * Queries D1 to compute today's AI usage and determines budget state.
 */
export async function getBudgetStatus(db: any, config: BudgetConfig = DEFAULT_BUDGET_CONFIG): Promise<BudgetStatus> {
  const todayPrefix = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  
  let dailyAiCalls = 0;
  let dailyTokens = 0;
  let dailyNeuronsUsed = 0;
  let dailyCachedCalls = 0;

  try {
    const res = await db.prepare(`
      SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN prompt_tokens IS NOT NULL THEN prompt_tokens ELSE 0 END) as total_prompt_tokens,
        SUM(CASE WHEN completion_tokens IS NOT NULL THEN completion_tokens ELSE 0 END) as total_completion_tokens,
        SUM(CASE WHEN duration_ms < 10 THEN 1 ELSE 0 END) as cache_hits
      FROM ai_runs 
      WHERE created_at >= ?
    `).bind(`${todayPrefix}T00:00:00Z`).first();

    if (res) {
      dailyAiCalls = res.total_calls || 0;
      const pTokens = res.total_prompt_tokens || 0;
      const cTokens = res.total_completion_tokens || 0;
      dailyTokens = pTokens + cTokens;
      dailyCachedCalls = res.cache_hits || 0;
      // Estimate daily neurons
      dailyNeuronsUsed = estimateNeurons('@cf/meta/llama-3.1-8b-instruct', pTokens, cTokens);
    }
  } catch (err) {
    console.warn('[BUDGET] Error fetching daily metrics from D1:', err);
  }

  const dailyPercentage = Number(((dailyNeuronsUsed / config.dailyNeuronLimit) * 100).toFixed(1));
  const monthlyNeuronsProjected = Math.round(dailyNeuronsUsed * 30);
  
  // Cloudflare Paid Neurons: $0.011 per 1,000 Neurons ($0.000011/neuron) beyond free allocation
  const billableNeurons = Math.max(0, monthlyNeuronsProjected - (config.dailyNeuronLimit * 30));
  const monthlyCostEstimatedUsd = Number(((billableNeurons / 1000) * 0.011).toFixed(4));

  let state: BudgetState = 'GREEN';
  let activeCircuitBreaker = false;
  let message = 'AI budget within optimal green zone. Full inference capabilities enabled.';

  if (dailyPercentage >= config.circuitBreakerThreshold * 100) {
    state = 'CIRCUIT_BREAKER';
    activeCircuitBreaker = true;
    message = 'CRITICAL: Daily AI neuron ceiling reached (>=95%). Automated inference halted. Fallback to deterministic + cached intelligence.';
  } else if (dailyPercentage >= config.redThreshold * 100) {
    state = 'RED';
    message = 'WARNING: Daily AI budget near ceiling (>=80%). Automated Deep AI disabled. Only analyst queries and cached intelligence permitted.';
  } else if (dailyPercentage >= config.yellowThreshold * 100) {
    state = 'YELLOW';
    message = 'ELEVATED: Daily AI usage at >=50%. Deep AI restricted to CRITICAL/HIGH novel intelligence.';
  }

  return {
    state,
    daily_neurons_used: dailyNeuronsUsed,
    daily_neurons_limit: config.dailyNeuronLimit,
    daily_percentage: dailyPercentage,
    daily_ai_calls: dailyAiCalls,
    daily_cached_calls: dailyCachedCalls,
    monthly_neurons_projected: monthlyNeuronsProjected,
    monthly_cost_estimated_usd: monthlyCostEstimatedUsd,
    active_circuit_breaker: activeCircuitBreaker,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validates if an AI workflow is allowed under current budget state.
 */
export function isWorkflowPermitted(state: BudgetState, workflow: string, severity?: string): boolean {
  if (state === 'CIRCUIT_BREAKER') {
    return false; // No automated LLM allowed
  }
  if (state === 'RED') {
    // Only explicit analyst copilot queries or confirmed CRITICAL severity allowed
    return workflow === 'copilot_query' || severity === 'CRITICAL';
  }
  if (state === 'YELLOW') {
    // Allow CRITICAL, HIGH, or analyst queries
    return workflow === 'copilot_query' || severity === 'CRITICAL' || severity === 'HIGH';
  }
  return true; // GREEN: all permitted
}
