# ZAYRON-X — GROUND TRUTH INDEPENDENCE & CIRCULARITY AUDIT

**Audit Document**: `ZAYRON_X_GROUND_TRUTH_INDEPENDENCE`  
**Classification**: FORENSIC AUDIT V3  
**Auditor**: Independent Adversarial Intelligence Quality Auditor  
**Date**: September 2026  

---

## 1. THE CORE FORENSIC QUESTION

> **"Who decided that this knowledge chunk is relevant?"**

In an authentic, enterprise-grade information retrieval evaluation, the ground truth must be established independently of the system being evaluated (e.g. human expert annotation, external verified incident dossiers, or independent competition gold sets).

If the benchmark generator, the candidate generator, and the evaluator are tightly coupled or share programmatic assumptions, the benchmark suffers from **evaluator circularity**, rendering metrics like $MRR = 1.0$ and $Recall = 100\%$ mathematical tautologies rather than empirical performance indicators.

---

## 2. FORENSIC TRACE OF BENCHMARK & EVALUATOR CODE

Inspection of `scripts/generate_benchmark_cases.ts` and `validation/evaluator.ts` reveals the exact execution trace:

### Step 1: Programmatic Label Generation (`scripts/generate_benchmark_cases.ts`)
```typescript
// Lines 86-90: Synthetic loop generating ground truth
cases.push({
  case_id: `tc_vuln_${String(idx + 1).padStart(2, '0')}`,
  category: 'VULNERABILITY',
  ground_truth: {
    relevant_chunk_ids: [`chk_hae_heap_${idx}`, `chk_nist_sp800_${idx}`],
    irrelevant_chunk_ids: ['chk_amf_volatility_vad_01', 'chk_pma_ghidra_decomp_02'],
    acceptable_knowledge_domains: ['VULNERABILITY_ANALYSIS', 'EXPLOIT_ANALYSIS'],
    forbidden_knowledge_domains: ['MEMORY_FORENSICS', 'MALWARE_ANALYSIS'],
    expected_preconditions_met: true,
  }
});
```
**Forensic Finding**: The ground truth labels were not annotated by an independent third party or extracted from real incident outcomes. They were synthesized algorithmically by loop index strings (`chk_hae_heap_${idx}`).

---

### Step 2: The Evaluator Candidate Injection (`validation/evaluator.ts`)
```typescript
// Lines 199-204: Simulated candidate retrieval
const simulatedRetrievedIds = [
  ...bc.ground_truth.relevant_chunk_ids,
  ...bc.ground_truth.irrelevant_chunk_ids,
].slice(0, topK);
```
**Forensic Finding**: The evaluator did NOT query live Cloudflare Vectorize during this evaluation loop. Instead, it **constructed the retrieved candidate array by concatenating the benchmark case's own `relevant_chunk_ids` followed by `irrelevant_chunk_ids`**.

---

### Step 3: Metric Derivation Against Self-Injected Array
```typescript
// Lines 285-300: Computing P@K, R@K, MRR, nDCG
const retrievedRelevant = mockResolvedChunks.filter(c =>
  bc.ground_truth.relevant_chunk_ids.includes(c.chunk_id)
);
const pAtK = retrievedRelevant.length / topK;
const rAtK = retrievedRelevant.length / bc.ground_truth.relevant_chunk_ids.length;
```
**Forensic Finding**:
1. `retrievedRelevant` will **always** equal the 2 items from `relevant_chunk_ids` because they were explicitly placed into the array.
2. Because `relevant_chunk_ids` was prepended to `irrelevant_chunk_ids`, the first item at rank 1 is **always** relevant, guaranteeing $MRR = 1/1 = 1.000$.
3. Ranks 1 and 2 are always relevant, and ranks 3 and 4 are always irrelevant, guaranteeing $nDCG = 1.000$.
4. Precision is $2 / 5 = 40.0\%$ simply because 2 relevant items were provided in a 5-slot window.
5. Recall is $2 / 2 = 100.0\%$ simply because both items from the 2-item synthetic label were retrieved.

---

## 3. CLASSIFICATION OF CIRCULARITY

```text
+--------------------------------------------------------------------------+
|                  scripts/generate_benchmark_cases.ts                     |
|  Synthesizes case + labels: relevant_chunk_ids = [rel_1, rel_2]         |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                       validation/evaluator.ts                            |
|  Creates mock candidate list: [rel_1, rel_2, irr_1, irr_2]              |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                       validation/evaluator.ts                            |
|  Evaluates candidate list against [rel_1, rel_2]                         |
|  Result: MRR = 1.0, Recall = 100%, Precision = 40%, nDCG = 1.0           |
+--------------------------------------------------------------------------+
```

| Dimension | Observed State | Integrity Verdict |
| :--- | :--- | :--- |
| **Ground Truth Source** | Programmatic template script | **SYNTHETIC / DERIVED** |
| **Candidate Source** | Direct concatenation of ground truth fields | **CIRCULAR EVALUATOR LOGIC** |
| **Independence Level** | Zero external separation between labeler and candidate mock | **NON-INDEPENDENT** |
| **Live Vectorize Influence** | None in `evaluator.ts` benchmark loop (mocked) | **SIMULATION ONLY** |

---

## 4. IMPACT ON SYSTEM TRUST & CONCLUSION

1. **The Vectorize Engine itself is NOT defective**: Live queries executed via `scripts/verify_shadow_vectorize.ts` and `workers/api` connect to Cloudflare Vectorize and return real semantic embeddings and real vector IDs.
2. **The V2 Benchmark was a Mock Simulation**: The reported metrics ($P@5 = 40\%, R@5 = 100\%, MRR = 1.0, nDCG = 1.0$) were algebraic properties of the mock fixture array, not empirical observations of Cloudflare Vectorize's real cosine ranking against the 25,642-vector corpus.
3. **Remediation Requirement**: Future benchmark evaluations must feed live Vectorize query results directly into the scoring module, using genuine chunk IDs from `zayron-knowledge-index` without pre-populating candidates from the ground truth.
