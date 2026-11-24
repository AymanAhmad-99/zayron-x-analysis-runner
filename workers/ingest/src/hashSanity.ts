/**
 * IOC / hash sanity gate (Gate 3A.3).
 *
 * WHY THIS EXISTS
 * The live corpus contained `CVE-2026-1453`, whose narrative asserted a Cobalt
 * Strike payload with the SHA-256 of the EMPTY STRING
 * (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
 * That value is a real digest — of nothing — so it passes a naive
 * `looks-like-a-hash` check while carrying no artefact identity at all. The same
 * is true of the empty MD5/SHA-1 digests and of all-zero / single-character
 * strings. Those values must never be persisted as indicators and never count as
 * evidence.
 *
 * The gate is deliberately a PURE predicate: callers decide whether to drop the
 * value or reject the whole record.
 */

/** Digests of the empty string and structurally degenerate values. */
export const DEGENERATE_HASHES: ReadonlySet<string> = new Set([
  // SHA-256("")
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  // MD5("")
  'd41d8cd98f00b204e9800998ecf8427e',
  // SHA-1("")
  'da39a3ee5e6b4b0d3255bfef95601890afd80709',
  // SHA-512("")
  'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
]);

const HEX_ONLY = /^[0-9a-f]+$/i;

/**
 * True when a value cannot identify an artefact.
 *
 * Covers: non-strings, empty/whitespace, non-hex, all-same-character strings
 * (`0000…`, `ffff…`, `aaaa…`), the documented empty-string digests, and strings
 * shorter than 32 hex characters (not an MD5/SHA family digest).
 */
export function isDegenerateHash(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (DEGENERATE_HASHES.has(normalized)) return true;
  // Not hexadecimal at all: it is not a digest, so it cannot identify an artefact.
  if (!HEX_ONLY.test(normalized)) return true;
  if (normalized.length < 32) return true;
  // A digest made of one repeated nibble carries no entropy.
  if (/^(.)\1+$/.test(normalized)) return true;
  return false;
}

/** Keep only sane hashes, preserving order and case of the original values. */
export function filterSaneHashes(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || isDegenerateHash(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * True when free text asserts a degenerate hash — used to reject a record whose
 * "evidence" is structurally impossible rather than merely unlikely.
 */
export function containsDegenerateHash(text: unknown): boolean {
  if (typeof text !== 'string' || !text) return false;
  for (const hash of DEGENERATE_HASHES) {
    if (text.toLowerCase().includes(hash)) return true;
  }
  // Any 32+ hex run made of a single repeated character.
  const runs = text.match(/\b[0-9a-f]{32,}\b/gi) || [];
  return runs.some((run) => /^(.)\1+$/i.test(run));
}
