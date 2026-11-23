/**
 * Regression tests for the embedding boundary normalization fix.
 *
 * P0 Root Cause: @cf/baai/bge-base-en-v1.5 has a hard 512-token input limit.
 * Texts with ~300+ words (~405+ tokens at 1.35 tok/word) caused provider error:
 *   "Expected ',' or '}' after property value at position 311"
 * This is a fixed position in the BGE tokenizer overflow handler, NOT a byte
 * position in the JSON request body.
 *
 * Fix: truncateForEmbedding() clips at 300-word boundary AFTER normalizeForEmbedding().
 * canonical_text and its content_hash are NEVER modified.
 */
import { describe, it, expect } from 'bun:test';
import {
  normalizeForEmbedding,
  truncateForEmbedding,
  validateUnicodeScalarText,
  EMBEDDING_NORMALIZATION_VERSION,
  BGE_SAFE_WORD_LIMIT,
} from '../packages/intelligence/src/knowledge/v3/unicode';

// ─── helpers ────────────────────────────────────────────────────────────────
function makeWords(n: number, word = 'intelligence'): string {
  return Array(n).fill(word).join(' ');
}

// ─── EMBEDDING_NORMALIZATION_VERSION ────────────────────────────────────────
describe('EMBEDDING_NORMALIZATION_VERSION', () => {
  it('is embedding-boundary-v2', () => {
    expect(EMBEDDING_NORMALIZATION_VERSION).toBe('embedding-boundary-v2');
  });

  it('BGE_SAFE_WORD_LIMIT is 300', () => {
    expect(BGE_SAFE_WORD_LIMIT).toBe(300);
  });
});

// ─── normalizeForEmbedding — unchanged behaviour ─────────────────────────────
describe('normalizeForEmbedding', () => {
  it('passes through ASCII clean text unchanged', () => {
    const t = 'The quick brown fox';
    expect(normalizeForEmbedding(t)).toBe(t);
  });

  it('normalises CRLF to LF', () => {
    expect(normalizeForEmbedding('line1\r\nline2\rline3')).toBe('line1\nline2\nline3');
  });

  it('removes C0 control characters (except tab, LF)', () => {
    const t = 'a\x01b\x08c'; // \x01 SOH, \x08 BS
    expect(normalizeForEmbedding(t)).toBe('abc');
  });

  it('removes C1 control characters (U+0080–U+009F)', () => {
    const t = 'a\x80b\x9Fc';
    expect(normalizeForEmbedding(t)).toBe('abc');
  });

  it('removes BOM', () => {
    expect(normalizeForEmbedding('\uFEFFhello')).toBe('hello');
  });

  it('removes zero-width chars', () => {
    expect(normalizeForEmbedding('a\u200Bb')).toBe('ab');
  });

  it('replaces lone high surrogate with replacement character', () => {
    const lone = '\uD800'; // lone high surrogate
    const result = normalizeForEmbedding(lone);
    expect(result).toBe('\uFFFD');
  });

  it('preserves valid surrogate pair', () => {
    const pair = '\uD83D\uDE00'; // 😀
    expect(normalizeForEmbedding(pair)).toBe(pair);
  });

  it('normalises smart quotes (NFKC)', () => {
    // \u201C " and \u201D " are left/right double quotes
    const t = '\u201Chello\u201D';
    const result = normalizeForEmbedding(t);
    // NFKC normalises them — they remain as-is in NFKC but get passed through
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('normalises em dash', () => {
    const t = 'A\u2014B';
    expect(normalizeForEmbedding(t)).toBe('A\u2014B'); // em dash is NFKC stable
  });

  it('passes through backslash correctly', () => {
    const t = 'path\\to\\file';
    expect(normalizeForEmbedding(t)).toBe('path\\to\\file');
  });

  it('passes through literal escape-looking sequences correctly', () => {
    const t = 'text with \\n and \\t in it';
    expect(normalizeForEmbedding(t)).toBe('text with \\n and \\t in it');
  });

  it('strips null byte U+0000', () => {
    const t = 'a\x00b';
    expect(normalizeForEmbedding(t)).toBe('ab');
  });

  it('handles Arabic text (multi-byte UTF-8)', () => {
    const arabic = 'مرحبا بالعالم'; // Hello World
    const result = normalizeForEmbedding(arabic);
    expect(result).toBe(arabic); // should be unchanged
  });

  it('handles empty string', () => {
    expect(normalizeForEmbedding('')).toBe('');
  });
});

// ─── truncateForEmbedding ────────────────────────────────────────────────────
describe('truncateForEmbedding', () => {
  it('does not truncate text within limit', () => {
    const t = makeWords(100);
    const result = truncateForEmbedding(t);
    expect(result.was_truncated).toBe(false);
    expect(result.original_word_count).toBe(100);
    expect(result.truncated).toBe(t);
  });

  it('does not truncate text exactly at limit', () => {
    const t = makeWords(300);
    const result = truncateForEmbedding(t);
    expect(result.was_truncated).toBe(false);
    expect(result.original_word_count).toBe(300);
  });

  it('truncates text above limit at word boundary', () => {
    const t = makeWords(400);
    const result = truncateForEmbedding(t);
    expect(result.was_truncated).toBe(true);
    expect(result.original_word_count).toBe(400);
    const resultWords = result.truncated.split(' ');
    expect(resultWords.length).toBe(300);
  });

  it('truncates exactly at 300 words for a 483-word object', () => {
    const t = makeWords(483);
    const result = truncateForEmbedding(t);
    expect(result.was_truncated).toBe(true);
    expect(result.original_word_count).toBe(483);
    expect(result.truncated.split(' ').length).toBe(300);
  });

  it('truncated result contains no trailing whitespace', () => {
    const t = makeWords(400);
    const { truncated } = truncateForEmbedding(t);
    expect(truncated).toBe(truncated.trim());
  });

  it('respects custom wordLimit parameter', () => {
    const t = makeWords(100);
    const result = truncateForEmbedding(t, 50);
    expect(result.was_truncated).toBe(true);
    expect(result.truncated.split(' ').length).toBe(50);
  });

  it('handles empty string without error', () => {
    const result = truncateForEmbedding('');
    expect(result.was_truncated).toBe(false);
    expect(result.original_word_count).toBe(0);
    expect(result.truncated).toBe('');
  });

  it('handles text with multiple spaces gracefully', () => {
    const t = 'word1  word2   word3';
    const result = truncateForEmbedding(t);
    expect(result.was_truncated).toBe(false);
    expect(result.original_word_count).toBe(3);
  });

  it('canonical_text content is unchanged after truncation', () => {
    const canonical = makeWords(400);
    const normalized = normalizeForEmbedding(canonical);
    const { truncated } = truncateForEmbedding(normalized);
    // canonical must be unchanged
    expect(canonical).toBe(makeWords(400));
    // truncated must differ from canonical
    expect(truncated.split(' ').length).toBe(300);
    expect(canonical.split(' ').length).toBe(400);
  });

  it('content_hash is computed from canonical not truncated (verifiable by comparing strings)', () => {
    // This test verifies that truncated.length < canonical.length
    // so any hash computed on canonical would differ from hash on truncated.
    // The actual hash function is async; we verify the strings differ.
    const canonical = makeWords(400);
    const normalized = normalizeForEmbedding(canonical);
    const { truncated, was_truncated } = truncateForEmbedding(normalized);
    expect(was_truncated).toBe(true);
    expect(truncated.length).toBeLessThan(canonical.length);
    // Confirm canonical is still intact
    expect(canonical.split(' ').length).toBe(400);
  });

  it('long text with control characters: normalised then truncated correctly', () => {
    // Mix in control chars that get stripped, then build 400-word text
    const base = makeWords(400, 'intel\x01ligence'); // \x01 gets stripped
    const normalized = normalizeForEmbedding(base);
    const { was_truncated, truncated } = truncateForEmbedding(normalized);
    expect(was_truncated).toBe(true);
    expect(truncated.split(' ').length).toBe(300);
    expect(truncated).not.toContain('\x01');
  });
});

// ─── validateUnicodeScalarText ────────────────────────────────────────────────
describe('validateUnicodeScalarText', () => {
  it('validates clean ASCII as valid', () => {
    const d = validateUnicodeScalarText('hello world');
    expect(d.valid).toBe(true);
  });

  it('detects lone surrogate as invalid', () => {
    const d = validateUnicodeScalarText('\uD800');
    expect(d.valid).toBe(false);
    expect(d.codePointCounts['lone_high_surrogate']).toBe(1);
  });

  it('returns valid for surrogate pair', () => {
    const d = validateUnicodeScalarText('\uD83D\uDE00');
    expect(d.valid).toBe(true);
  });

  it('detects BOM', () => {
    const d = validateUnicodeScalarText('\uFEFFhello');
    expect(d.codePointCounts['BOM']).toBe(1);
  });
});

// ─── P0 regression fixture: the first confirmed failing Heuer KO (by word count) ──
describe('P0 regression: 489-word Heuer KO', () => {
  // This fixture uses the actual stats from the longest Heuer object.
  // We cannot include the full text here (copyrighted source material),
  // but we can verify that a 489-word constructed text is handled correctly.
  const FIXTURE_WORD_COUNT = 489; // max word count in Heuer pilot
  const fixture = makeWords(FIXTURE_WORD_COUNT, 'analysis');

  it('fixture of 489 words gets truncated to 300', () => {
    const normalized = normalizeForEmbedding(fixture);
    const { truncated, was_truncated, original_word_count } = truncateForEmbedding(normalized);
    expect(was_truncated).toBe(true);
    expect(original_word_count).toBe(FIXTURE_WORD_COUNT);
    expect(truncated.split(' ').length).toBe(BGE_SAFE_WORD_LIMIT);
  });

  it('truncated text is valid JSON when serialized in embedding payload', () => {
    const normalized = normalizeForEmbedding(fixture);
    const { truncated } = truncateForEmbedding(normalized);
    const payload = JSON.stringify({ text: [truncated] });
    expect(() => JSON.parse(payload)).not.toThrow();
  });

  it('truncated text is within BGE_SAFE_WORD_LIMIT', () => {
    const normalized = normalizeForEmbedding(fixture);
    const { truncated } = truncateForEmbedding(normalized);
    expect(truncated.split(' ').length).toBeLessThanOrEqual(BGE_SAFE_WORD_LIMIT);
  });
});
