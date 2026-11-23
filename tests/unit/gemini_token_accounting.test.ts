/**
 * AI cost control — Gemini token accounting.
 *
 * Pins the honesty boundary: Gemini traffic is bounded by a TOKEN VOLUME ceiling
 * and its raw provider-reported usage is aggregated, but no cost (neurons or USD)
 * is claimed for it, because no verified Gemini per-token price is recorded in
 * this repository.
 */
import { describe, expect, it } from 'bun:test';

import {
  DEFAULT_GEMINI_DAILY_TOKEN_LIMIT,
  accumulateGeminiTokenUsage,
  estimateNeurons,
  estimateNeuronsForProvider,
  isGeminiTokenLimitReached,
} from '../../packages/intelligence/src/budget';

describe('Gemini token accounting (no invented cost)', () => {
  it('aggregates provider-reported tokens and counts requests whose usage was absent', () => {
    const usage = accumulateGeminiTokenUsage([
      { prompt_tokens: 100, completion_tokens: 40 },
      { prompt_tokens: 10, completion_tokens: null },
      { prompt_tokens: null, completion_tokens: null },
    ]);

    expect(usage).toEqual({
      requests: 3,
      prompt_tokens: 110,
      completion_tokens: 40,
      total_tokens: 150,
      requests_without_usage: 1,
    });
  });

  it('an absent usage record is never silently counted as zero-cost work', () => {
    const usage = accumulateGeminiTokenUsage([{ prompt_tokens: null, completion_tokens: null }]);
    expect(usage.total_tokens).toBe(0);
    expect(usage.requests_without_usage).toBe(1);
  });

  it('handles an empty history deterministically', () => {
    expect(accumulateGeminiTokenUsage([])).toEqual({
      requests: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, requests_without_usage: 0,
    });
  });

  it('bounds Gemini by token volume, not by an invented price', () => {
    const belowCeiling = accumulateGeminiTokenUsage([{ prompt_tokens: 1000, completion_tokens: 500 }]);
    expect(isGeminiTokenLimitReached(belowCeiling)).toBe(false);
    expect(isGeminiTokenLimitReached(belowCeiling, 1400)).toBe(true);
    expect(isGeminiTokenLimitReached(belowCeiling, DEFAULT_GEMINI_DAILY_TOKEN_LIMIT)).toBe(false);

    const atCeiling = accumulateGeminiTokenUsage([
      { prompt_tokens: DEFAULT_GEMINI_DAILY_TOKEN_LIMIT, completion_tokens: 0 },
    ]);
    expect(isGeminiTokenLimitReached(atCeiling)).toBe(true);
  });

  it('refuses to express Gemini usage in Cloudflare neurons', () => {
    expect(estimateNeuronsForProvider('gemini', 'gemini-3.8-flash', 1000, 500)).toBeNull();
    expect(estimateNeuronsForProvider('cloudflare', '@cf/meta/llama-3.1-8b-instruct', 1000, 500)).toBe(
      estimateNeurons('@cf/meta/llama-3.1-8b-instruct', 1000, 500),
    );
  });
});
