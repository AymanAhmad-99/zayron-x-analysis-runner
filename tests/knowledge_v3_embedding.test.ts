import { describe, expect, it } from 'vitest';
import { generateEmbedding } from '../packages/intelligence/src/knowledge/v3/embedding';
import { reciprocalRankFusion } from '../packages/intelligence/src/knowledge/v3/retrieval';
describe('knowledge v3 embedding and retrieval contracts',()=>{
 it('embeds canonical text only and validates 768 dimensions',async()=>{let seen:any;const r=await generateEmbedding({run:async(m,i)=>{seen={m,i};return {data:[Array(768).fill(.1)]}}},'ko:test','canonical source text');expect(r.dimension).toBe(768);expect(seen.i).toEqual({text:['canonical source text']});});
 it('rejects invalid provider payloads',async()=>{await expect(generateEmbedding({run:async()=>({data:[Array(3).fill(0)]})},'ko:test','text')).rejects.toThrow('DIMENSION_MISMATCH');});
 it('fuses deterministic semantic and lexical rankings',()=>{const a={object_id:'a',document_id:'d',section:'s',page_start:null,page_end:null,knowledge_type:'METHOD',canonical_text:'a',content_hash:'a'};const b={...a,object_id:'b',content_hash:'b'};const out=reciprocalRankFusion([{...a,vector_score:.9},{...b,vector_score:.8}],[{...b,lexical_rank:1},{...a,lexical_rank:2}],60,2);expect(out[0].rrf_score).toBeGreaterThan(0);expect(out.map(x=>x.final_rank)).toEqual([1,2]);});
});
