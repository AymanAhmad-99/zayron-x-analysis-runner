# ZAYRON-X — FORENSIC METRIC RECALCULATION & MATHEMATICAL CONSISTENCY AUDIT

**Audit Document**: `ZAYRON_X_METRIC_RECALCULATION`  
**Classification**: FORENSIC AUDIT V3  
**Auditor**: Independent Adversarial Intelligence Quality Auditor  
**Date**: September 2026  

---

## 1. EXECUTIVE SUMMARY

This document provides a line-by-line mathematical forensic audit of the metrics reported in the V2 Independent Validation Report. Every reported metric was independently recomputed from raw code logic and data structures in `validation/benchmark_cases.json` and `validation/evaluator.ts`.

---

## 2. REPORTED VS RECALCULATED METRIC COMPARISON

| Metric | Reported Value (V2) | Recalculated Value (V3) | Discrepancy Type | Root Cause Analysis |
| :--- | :---: | :---: | :--- | :--- |
| **Precision@5** | 40.0% ($n=100$) | **40.0%** ($n=100$) | **DERIVED ARTIFACT** | Exactly 2 relevant chunks placed in a Top-K=5 array ($2 / 5 = 0.40$). |
| **Recall@5** | 100.0% ($n=100$) | **100.0%** ($n=100$) | **CIRCULAR ARTIFACT** | Both relevant chunks from the 2-item synthetic label were injected ($2 / 2 = 1.00$). |
| **MRR** | 1.000 ($n=100$) | **1.000** ($n=100$) | **CIRCULAR ARTIFACT** | Relevant chunks always occupied index 0 and 1; first rank was identically 1 in all 100 cases. |
| **nDCG@5** | 1.000 ($n=100$) | **1.000** ($n=100$) | **CIRCULAR ARTIFACT** | Actual ranking $[1, 1, 0, 0]$ matched ideal ranking $[1, 1, 0, 0]$ identically. |
| **D1 Resolution Sample** | $n = 400$ chunks | **$n = 400$ chunks** | **ARRAY BOUND ARTIFACT** | 4 chunks per case (2 rel + 2 irr) $\times 100$ cases $= 400$. Slot 5 was empty! |
| **Precondition Accuracy**| 100.0% ($n=100$) | **100.0%** ($n=100$) | **CONTROLLED LOGIC** | Tested against programmatic synthetic cases where evidence strictly matched/failed regex. |
| **Irrelevant Knowledge** | 0.0% ($n=100$) | **0.0%** ($n=100$) | **VERIFIED GATING** | Regex precondition filter successfully quarantined cross-domain chunks to `CONSIDERED`. |
| **Causal Influence** | 75.0% ($n=20$) | **75.0%** ($n=20$) | **SEMI-SYNTHETIC** | Target chunk excised in Run B, reducing knowledge-informed claim count from Run A. |

---

## 3. DEEP DIVE: WHY D1 CHUNK RESOLUTION SAMPLE WAS $n = 400$ INSTEAD OF $n = 500$

In a benchmark of $N = 100$ cases with a requested `topK = 5`, one logically expects $100 \times 5 = 500$ candidate slots.

### Forensic Finding:
Inspection of `validation/evaluator.ts` lines 199–202 reveals:
```typescript
const simulatedRetrievedIds = [
  ...bc.ground_truth.relevant_chunk_ids, // Length = 2
  ...bc.ground_truth.irrelevant_chunk_ids, // Length = 2
].slice(0, topK); // Slices first 5 items from an array of length 4!
```
Because `2 + 2 = 4`, the array `simulatedRetrievedIds` had a length of **exactly 4** for every single case:
$$\text{Total Chunks Evaluated} = 100 \text{ cases} \times 4 \text{ chunks} = 400 \text{ chunks}$$
Slot 5 was never populated. The evaluator resolved 400 out of 400 mock chunks, explaining the exact provenance of the $n = 400$ sample size.

---

## 4. MATHEMATICAL FORMULATION OF $MRR = 1.0$ AND $nDCG = 1.0$

### A. Mean Reciprocal Rank ($MRR$)
$$MRR = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
In `evaluator.ts`, `simulatedRetrievedIds[0]` was always `relevant_chunk_ids[0]`.
$$\text{rank}_i = 1 \quad \forall i \in [1, 100]$$
$$MRR = \frac{1}{100} \sum_{i=1}^{100} \frac{1}{1} = 1.000$$

### B. Normalized Discounted Cumulative Gain ($nDCG@5$)
The relevance vector for every case was:
$$\mathbf{rel} = [1, 1, 0, 0]$$
$$\text{DCG}@5 = \frac{2^1 - 1}{\log_2(1 + 1)} + \frac{2^1 - 1}{\log_2(2 + 1)} = \frac{1}{1} + \frac{1}{1.58496} = 1.6309$$
The ideal ranking $\mathbf{rel}^*$ for 2 relevant items is also $[1, 1, 0, 0]$:
$$\text{IDCG}@5 = 1.6309$$
$$nDCG@5 = \frac{\text{DCG}@5}{\text{IDCG}@5} = \frac{1.6309}{1.6309} = 1.000$$

---

## 5. RECALL 100% / PRECISION 40% EXPLANATION

- **Precision@5 = 40%**: The mock array contained 2 relevant chunks out of 5 slots: $\frac{2}{5} = 0.40$.
- **Recall@5 = 100%**: The benchmark ground truth was artificially defined as containing only those 2 specific synthetic chunks (`chk_hae_heap_${idx}`, `chk_nist_sp800_${idx}`). Because both were prepended to the candidate list, 2 out of 2 were retrieved: $\frac{2}{2} = 1.00$.
- **Corpus Reality**: In the full 25,642-vector corpus, there are likely 10 to 50 additional chunks (e.g. from NIST SP 800-61, MITRE ATT&CK, or vendor specs) that would be semantically relevant to a SonicWall or OpenSSH advisory. The artificial 2-item ground truth definition created an artificially constrained recall denominator.
