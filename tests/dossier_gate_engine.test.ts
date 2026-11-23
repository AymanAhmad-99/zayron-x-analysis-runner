import { describe, expect, it } from 'vitest';
import { calculateConfidence, dossierIdentity, inputFingerprint, unknownClaims, validateClaim, type DossierClaim } from '../packages/intelligence/src/dossier';

const input={entity_id:'vulnerability:cve-2026-85046',evidence_id:'cisa-kev:cisa-kev-f92f4cef4bba9b8c69c1a34deeb825af:normalized:evidence:evidence',artifact_id:'cisa-kev-f92f4cef4bba9b8c69c1a34deeb825af',knowledge_ref:'knowledge:mitre-t1203-a051e98e29307635fae7e459',framework_version:'zayron-framework-v1',model_policy:'llama-primary-qwen-shadow-v1'};
const factors={source_authority:1,evidence_quality:1,specificity:1,recency:1,independence:1,corroboration:1,completeness:1,conflict_penalty:0};
describe('canonical dossier gate engine',()=>{
  it('calculates deterministic confidence independent of AI output',()=>{expect(calculateConfidence(factors).overall).toBe(1);expect(calculateConfidence(factors)).toEqual(calculateConfidence(factors));});
  it('keeps unknown propositions null-confidence',()=>{const c=unknownClaims(input.entity_id,['current active exploitation'])[0];expect(c.status).toBe('UNKNOWN');expect(c.confidence.overall).toBeNull();});
  it('rejects ungrounded claims',()=>{const c:DossierClaim={claim_id:'c',entity_id:input.entity_id,claim_text:'unsupported',classification:'ANALYTIC_INFERENCE',status:'VALIDATED',evidence_refs:['missing'],knowledge_refs:[],reasoning_basis:'test',grounding:'UNSUPPORTED',confidence:calculateConfidence(factors)};expect(validateClaim(c,new Set(),new Set())).toContain('UNSUPPORTED_REFERENCE');expect(validateClaim(c,new Set(),new Set())).toContain('UNSUPPORTED_CLAIM');});
  it('derives stable identities for replay',()=>{expect(inputFingerprint(input)).toBe(inputFingerprint({...input}));expect(dossierIdentity(input)).toBe(dossierIdentity({...input}));});
});
