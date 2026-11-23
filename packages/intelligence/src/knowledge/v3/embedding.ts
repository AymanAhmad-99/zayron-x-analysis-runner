export const HEUER_EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
import { EMBEDDING_NORMALIZATION_VERSION, normalizeForEmbedding, truncateForEmbedding } from './unicode';
export const HEUER_EMBEDDING_VERSION = 'knowledge-v3-embedding-v1';
export interface EmbeddingResult { embedding:number[]; model:string; dimension:number; content_hash:string; object_id:string; version:string; was_truncated:boolean; original_word_count:number; }
const hash = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function generateEmbedding(ai:{run:(model:string,input:{text:string[]})=>Promise<any>}, objectId:string, canonicalText:string):Promise<EmbeddingResult> {
  if (!canonicalText.trim()) throw new Error('INVALID_INPUT:EMPTY_CANONICAL_TEXT');
  // 1. Hash the canonical text BEFORE any transformation — this preserves provenance integrity.
  const content_hash = await hash(canonicalText);
  // 2. Unicode normalization (surrogate repair + NFKC + control char strip).
  const normalized = normalizeForEmbedding(canonicalText);
  // 3. Token-budget truncation — clips at word boundary to stay within BGE 512-token limit.
  //    canonical_text and its hash are NOT affected.
  const { truncated: embedding_text, was_truncated, original_word_count } = truncateForEmbedding(normalized);
  // 4. Invoke Workers AI embedding model.
  const response = await ai.run(HEUER_EMBEDDING_MODEL,{text:[embedding_text]});
  const embedding = response?.data?.[0];
  if (!Array.isArray(embedding)) throw new Error('PAYLOAD_INVALID:EXPECTED_DATA_VECTOR');
  if (embedding.length!==768) throw new Error(`DIMENSION_MISMATCH:EXPECTED_768_GOT_${embedding.length}`);
  return {embedding,model:HEUER_EMBEDDING_MODEL,dimension:embedding.length,content_hash,object_id:objectId,version:`${HEUER_EMBEDDING_VERSION}:${EMBEDDING_NORMALIZATION_VERSION}`,was_truncated,original_word_count};
}
