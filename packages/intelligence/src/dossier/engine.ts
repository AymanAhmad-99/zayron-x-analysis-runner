export const CONFIDENCE_METHOD = 'zayron-deterministic-v1';
export type ClaimClass = 'CONFIRMED_FACT'|'SOURCE_DERIVED'|'KNOWLEDGE_DERIVED'|'ANALYTIC_INFERENCE'|'RECOMMENDATION'|'UNKNOWN';
export type Grounding = 'DIRECTLY_SUPPORTED'|'PARTIALLY_SUPPORTED'|'INFERENCE'|'UNSUPPORTED';

export interface ConfidenceFactors { source_authority:number; evidence_quality:number; specificity:number; recency:number; independence:number; corroboration:number; completeness:number; conflict_penalty:number; }
export interface ConfidenceResult { method:string; overall:number|null; band:'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN'; factors:ConfidenceFactors; evidence:number|null; exploit:number|null; impact:number|null; attribution:number|null; }
export interface DossierClaim { claim_id:string; entity_id:string; claim_text:string; classification:ClaimClass; status:'VALIDATED'|'UNKNOWN'; evidence_refs:string[]; knowledge_refs:string[]; reasoning_basis:string; grounding:Grounding; confidence:ConfidenceResult; }
export interface DossierInput { entity_id:string; evidence_id:string; artifact_id:string; knowledge_ref:string; framework_version:string; model_policy:string; }

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function calculateConfidence(f:ConfidenceFactors, unknown=false):ConfidenceResult {
  if (unknown) return { method:CONFIDENCE_METHOD, overall:null, band:'UNKNOWN', factors:f, evidence:null, exploit:null, impact:null, attribution:null };
  const overall=clamp(f.source_authority*.2+f.evidence_quality*.2+f.specificity*.2+f.recency*.1+f.independence*.1+f.corroboration*.1+f.completeness*.1-f.conflict_penalty);
  return { method:CONFIDENCE_METHOD, overall, band:overall>=.75?'HIGH':overall>=.45?'MEDIUM':'LOW', factors:f, evidence:overall, exploit:null, impact:overall, attribution:null };
}
export function stableId(prefix:string, input:string):string { let h=2166136261; for(const c of input){h=Math.imul(h^c.charCodeAt(0),16777619)} return `${prefix}:${(h>>>0).toString(16).padStart(8,'0')}`; }
export function inputFingerprint(i:DossierInput):string { return stableId('input',JSON.stringify(i)); }
export function validateClaim(c:DossierClaim, evidence:Set<string>, knowledge:Set<string>):string[] {
  const errors:string[]=[];
  if(!c.claim_id||!c.entity_id||!c.claim_text||!c.reasoning_basis) errors.push('MISSING_PROVENANCE');
  if(c.classification==='UNKNOWN'){ if(c.confidence.overall!==null) errors.push('UNKNOWN_CONFIDENCE_NOT_NULL'); return errors; }
  if(!c.evidence_refs.length&&!c.knowledge_refs.length) errors.push('NO_BASIS');
  if(c.evidence_refs.some(x=>!evidence.has(x))||c.knowledge_refs.some(x=>!knowledge.has(x))) errors.push('UNSUPPORTED_REFERENCE');
  if(c.grounding==='UNSUPPORTED') errors.push('UNSUPPORTED_CLAIM');
  return errors;
}
export function dossierIdentity(i:DossierInput):string { return stableId('dossier',inputFingerprint(i)); }
export function revisionIdentity(dossierId:string,i:DossierInput):string { return stableId('revision',`${dossierId}:${inputFingerprint(i)}`); }
export function unknownClaims(entity_id:string, propositions:string[]):DossierClaim[] { return propositions.map(p=>({claim_id:stableId('claim',`${entity_id}:unknown:${p}`),entity_id,claim_text:`${p} is not established by the supplied evidence.`,classification:'UNKNOWN',status:'UNKNOWN',evidence_refs:[],knowledge_refs:[],reasoning_basis:'Required evidence is absent; absence is not treated as low confidence.',grounding:'DIRECTLY_SUPPORTED',confidence:calculateConfidence({source_authority:0,evidence_quality:0,specificity:0,recency:0,independence:0,corroboration:0,completeness:0,conflict_penalty:0},true)})); }
