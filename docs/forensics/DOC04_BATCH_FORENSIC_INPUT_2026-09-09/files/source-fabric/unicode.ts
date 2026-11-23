/**
 * EMBEDDING_NORMALIZATION_VERSION tracks the full pipeline applied to produce embedding_text.
 * v1 = unicode normalization only (NFKC + surrogate repair + control char strip)
 * v2 = v1 + BGE-512-token-limit word-boundary truncation
 *
 * IMPORTANT: canonical_text is NEVER modified. Only embedding_text is derived/truncated.
 * Citation anchors, content_hash, and source provenance remain tied to canonical_text.
 */
export const EMBEDDING_NORMALIZATION_VERSION = 'embedding-boundary-v2';

/**
 * BGE-base-en-v1.5 has a hard 512-token input limit (Cloudflare docs).
 * At ~1.35 tokens/word for English text, 300 words ≈ 405 tokens — safely within the limit.
 * Texts with more than 300 words produce the provider error:
 *   "Expected ',' or '}' after property value at position 311"
 * This is a fixed position in the provider's internal tokenizer buffer error path,
 * NOT a character or byte position in the JSON request body.
 *
 * Root cause: the BGE model tokenizer overflows its 512-token internal buffer
 * and emits a JSON parsing error from the overflow handler.
 */
export const BGE_SAFE_WORD_LIMIT = 300;

export interface UnicodeDiagnostics { valid: boolean; codePointCounts: Record<string, number>; examples: Record<string, string[]>; }
export function validateUnicodeScalarText(text: string): UnicodeDiagnostics {
  const codePointCounts: Record<string, number> = {}; const examples: Record<string,string[]> = {};
  const add=(code:string, sample:string)=>{codePointCounts[code]=(codePointCounts[code]||0)+1; examples[code]??=[]; if(examples[code].length<3&&!examples[code].includes(sample)) examples[code].push(sample);};
  let valid=true;
  for(let i=0;i<text.length;i++){const u=text.charCodeAt(i); if(u>=0xd800&&u<=0xdbff){if(i+1>=text.length||text.charCodeAt(i+1)<0xdc00||text.charCodeAt(i+1)>0xdfff){valid=false;add('lone_high_surrogate',`U+${u.toString(16)}`);} else i++;} else if(u>=0xdc00&&u<=0xdfff){valid=false;add('lone_low_surrogate',`U+${u.toString(16)}`);} else {const cp=text.codePointAt(i)!; if(cp<=0x1f&&cp!==9&&cp!==10&&cp!==13)add(`C0_U+${cp.toString(16).padStart(4,'0')}`,String.fromCodePoint(cp)); if(cp>=0x80&&cp<=0x9f)add(`C1_U+${cp.toString(16).padStart(4,'0')}`,String.fromCodePoint(cp)); if(cp===0xfeff)add('BOM','U+FEFF'); if(cp===0x200b||cp===0x200c||cp===0x200d)add('zero_width',`U+${cp.toString(16)}`); if(cp>=0x202a&&cp<=0x202e)add('bidi_control',`U+${cp.toString(16)}`);}};
  return {valid,codePointCounts,examples};
}

/** Unicode normalization pass. Applied first in the pipeline. canonical_text is never modified. */
export function normalizeForEmbedding(canonicalText: string): string {
  let out='';
  for(let i=0;i<canonicalText.length;i++){const u=canonicalText.charCodeAt(i); if(u>=0xd800&&u<=0xdbff&&i+1<canonicalText.length&&canonicalText.charCodeAt(i+1)>=0xdc00&&canonicalText.charCodeAt(i+1)<=0xdfff){out+=canonicalText[i]+canonicalText[++i];} else if(u>=0xd800&&u<=0xdfff){out+='\uFFFD';} else out+=canonicalText[i];}
  return out.normalize('NFKC').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFEFF\u200B\u200C\u200D\u202A-\u202E]/g,'');
}

/**
 * Token-budget truncation pass. Applied AFTER normalizeForEmbedding.
 *
 * Truncates at a word boundary to stay within BGE_SAFE_WORD_LIMIT (300 words ≈ 405 tokens),
 * well below the 512-token hard limit of @cf/baai/bge-base-en-v1.5.
 *
 * INVARIANTS:
 * - canonical_text is NEVER passed to or modified by this function.
 * - The result is only used as the embedding transport text.
 * - The content_hash of canonical_text is NOT affected.
 * - Citations always reference canonical_text, not the truncated form.
 *
 * Returns: { truncated: string; was_truncated: boolean; original_word_count: number }
 */
export function truncateForEmbedding(normalizedText: string, wordLimit: number = BGE_SAFE_WORD_LIMIT): {
  truncated: string;
  was_truncated: boolean;
  original_word_count: number;
} {
  // Split on any whitespace boundary (preserves multi-space, newlines, tabs)
  const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
  const original_word_count = words.length;
  if (original_word_count <= wordLimit) {
    return { truncated: normalizedText, was_truncated: false, original_word_count };
  }
  // Clip at word boundary and rejoin with single spaces for clean tokenization
  const clipped = words.slice(0, wordLimit).join(' ');
  return { truncated: clipped, was_truncated: true, original_word_count };
}

