/**
 * ZAYRON-X Global Public Sanitization Layer
 * 
 * Enforces uncompromising data and presentation hygiene across all published intelligence products:
 * 1. Strips internal database, chunk, vector, evidence, and ledger identifiers.
 * 2. Purges internal pipeline telemetry (e.g. INGESTION, NORMALIZATION, D1, RAG coefficients).
 * 3. Strips forbidden UI placeholder boilerplate ("In Setup", "Coming Soon").
 * 4. Eliminates icon serialization artifacts and raw SVG element text leaks.
 * 5. Cleans raw social noise (#hashtags, t.me channels) and redundant title prefixes.
 */

// Matches raw Unicode emojis
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;

// Internal pipeline terms forbidden in public articles
const FORBIDDEN_INTERNAL_PATTERNS = [
  /\b(chunk|chunkId|retrievedKnowledgeChunks?)\b/gi,
  /\b(vector|Vectorize|vectorId|embeddings?)\b/gi,
  /\b(evidence_ledger|ledgerId|evidenceRecords?)\b/gi,
  /\b(D1\s*(database|metadata|identifier)?)\b/gi,
  /\b(Cloudflare\s*Edge\s*Telemetry)\b/gi,
  /\b(Source\s*Trust\s*Weight:\s*[\d.]+)\b/gi,
  /\b(raw\s*signal\s*cryptographic\s*hash:?)\b/gi,
  /\b(ingest(ion)?\s*pipeline\s*verification:?)\b/gi,
  /\b(signal\s*ingested,\s*deduplicated,\s*and\s*normalized)\b/gi,
  /\b(authority\s*tier\s*\d+)\b/gi,
  /\b(In\s*Setup)\b/gi,
  /\b(Coming\s*Soon)\b/gi,
  /<svg[\s\S]*?<\/svg>/gi,
  /<path[\s\S]*?>/gi,
  /\b(lucide|feather)[:-][a-z0-9-]+/gi,
];

// Internal ID patterns that must never appear in public narrative
const INTERNAL_ID_REGEX = /\b(evi_[a-zA-Z0-9_-]{6,}|chunk-[a-zA-Z0-9_-]{6,}|doc-[a-zA-Z0-9_-]{6,}|ledger_[a-zA-Z0-9_-]{6,}|art_[a-zA-Z0-9_-]{6,}|evt_[a-zA-Z0-9_-]{6,})\b/g;

/**
 * Strips all internal metadata, pipeline references, and leaking artifacts from public text.
 */
export function sanitizePublicText(input?: string | null): string {
  if (!input) return '';

  let text = input;

  // 1. Remove literal SVG tags or icon serialization
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<path[^>]*\/?>/gi, '');

  // 2. Remove internal IDs
  text = text.replace(INTERNAL_ID_REGEX, '');

  // 3. Remove forbidden phrases and telemetry leakage
  for (const pattern of FORBIDDEN_INTERNAL_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // 4. Clean stray markdown backtick residues left by stripped IDs: `` -> ''
  text = text.replace(/`\s*`/g, '').replace(/\|\s*`\s*`\s*\|/g, '| - |');

  // 5. Clean emojis
  text = text.replace(EMOJI_REGEX, '');

  // 6. Clean excess spaces and empty bullet items
  text = text
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (trimmed === '-' || trimmed === '*' || trimmed === '-  .' || trimmed === '- `.`') return false;
      return true;
    })
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return text;
}

/**
 * Asserts whether a text string contains ANY forbidden public leakage.
 * Used in publication gates.
 */
export function detectPublicLeakage(input?: string | null): { passed: boolean; violations: string[] } {
  if (!input) return { passed: true, violations: [] };

  const violations: string[] = [];

  if (/<svg[\s\S]*?<\/svg>/i.test(input) || /<path[^>]*>/i.test(input)) {
    violations.push('Literal SVG / XML markup leaked into text');
  }

  if (INTERNAL_ID_REGEX.test(input)) {
    violations.push('Internal entity/chunk/ledger ID leaked (e.g. evi_*, chunk-*, doc-*)');
  }

  if (/\bIn Setup\b/i.test(input)) {
    violations.push('Forbidden placeholder "In Setup" found');
  }

  if (/\bComing Soon\b/i.test(input)) {
    violations.push('Forbidden placeholder "Coming Soon" found');
  }

  if (/\b(evidence_ledger|chunkId|authorityTier|Vectorize)\b/i.test(input)) {
    violations.push('Internal storage/RAG architecture terminology leaked');
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
