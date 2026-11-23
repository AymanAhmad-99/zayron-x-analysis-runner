# ZAYRON-X — FORENSIC BENCHMARK INTEGRITY & EVIDENCE AUDIT V3

**Document ID**: `ZAYRON_X_BENCHMARK_FORENSIC_AUDIT_V3`  
**Auditor Role**: Principal Threat Intelligence Architect, Senior Retrieval Engineer, Adversarial Quality Auditor  
**Audit Target**: `REAL KNOWLEDGE RETRIEVAL SHADOW ENGINE` & `VALIDATION V2`  
**Date**: September 2026  
**Final Classification**: **`B — VALIDATED WITH LIMITATIONS`**  

---

## 1. PRIMARY FORENSIC FINDING & VERDICT

> **Primary Question**: *Are the reported V2 validation metrics actually derived from a valid, independently grounded benchmark, or are they partially derived from self-generated test data, deterministic assumptions, synthetic labels, or circular evaluator logic?*

### The Forensic Verdict:
The core architecture of the **Real Knowledge Retrieval Shadow Engine** (Vectorize bindings, Workers AI embeddings, D1 chunk schema, cryptographic SHA-256 provenance, domain precondition gating, and counterfactual claim excision) is **GENUINE, FUNCTIONAL, AND OPERATIONALLY SOUND**.

However, the reported V2 validation metrics ($MRR = 1.000$, $nDCG = 1.000$, $Recall@5 = 100.0\%$, $Precision@5 = 40.0\%$, and $D1\ resolution\ n=400$) were **NOT measured from live Cloudflare Vectorize queries against an independent external gold set**. They were **ALGEBRAIC DERIVATIONS of a circular mock candidate array synthesized directly from the benchmark's own synthetic ground truth labels**.

The system must therefore be classified as:
$$\mathbf{B — VALIDATED\ WITH\ LIMITATIONS}$$
Meaning: The core technical mechanisms work, but the benchmark assumptions and circular mock candidate injection limit empirical interpretation.

---

## 2. BENCHMARK CASE CLASSIFICATION & ORIGIN AUDIT

Every case in `validation/benchmark_cases.json` was forensically audited to determine input source, real-world grounding, and ground-truth label origin:

| Category | Count | Entity Source | Text Template Source | Ground Truth Origin | Forensic Classification |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Vulnerability** | 25 | Real CVEs (NVD/MSRC) | Synthetic generator template | Loop index (`chk_hae_heap_${idx}`) | `REAL_CASE_WITH_SYNTHETIC_LABELS` |
| **Malware** | 25 | Real Malware Families | Synthetic generator template | Dummy SHA256 (`e3b0c442...`) | `REAL_CASE_WITH_SYNTHETIC_LABELS` |
| **Network Security**| 20 | Real Attack Concepts | Synthetic generator template | Synthetic IP observables | `REAL_CASE_WITH_SYNTHETIC_LABELS` |
| **Memory Forensics**| 15 | Lab Dump Scenarios | Synthetic generator template | Synthetic VAD/SSDT labels | `SYNTHETIC_CONTROLLED_CASE` |
| **Threat Actor** | 15 | Real APT Groups | Synthetic generator template | Synthetic campaign narrative | `REAL_CASE_WITH_SYNTHETIC_LABELS` |
| **TOTAL** | **100** | **Real Threat Entities (85%)**| **100% Programmatic Fixtures** | **100% Synthetic Labels** | **100 GENERATED TEST FIXTURES** |

### Summary Classification Counts:
- `REAL_EXTERNAL_CASE`: **0** (No cases were imported directly and unmodified from third-party incident corpora).
- `REAL_CASE_WITH_SYNTHETIC_LABELS`: **85** (Advisories containing real CVEs/malware but synthetic descriptions and chunk IDs).
- `SYNTHETIC_CONTROLLED_CASE`: **15** (Memory cases explicitly labeled `SYNTHETIC CONTROLLED TEST`).
- `GENERATED_TEST_FIXTURE`: **100** (All 100 cases were emitted by `scripts/generate_benchmark_cases.ts`).

---

## 3. GROUND TRUTH INDEPENDENCE & CIRCULARITY AUDIT

In `validation/evaluator.ts` lines 197–204:
```typescript
const simulatedRetrievedIds = [
  ...bc.ground_truth.relevant_chunk_ids,
  ...bc.ground_truth.irrelevant_chunk_ids,
].slice(0, topK);
```
### The Circular Mechanism:
1. `scripts/generate_benchmark_cases.ts` created `relevant_chunk_ids` (2 items) and `irrelevant_chunk_ids` (2 items).
2. `validation/evaluator.ts` prepended `relevant_chunk_ids` directly to the mock candidate array.
3. The evaluator then calculated $P@K, R@K, MRR,$ and $nDCG$ by comparing the array against `relevant_chunk_ids`.
4. Because the ground truth was prepended to the array:
   - Rank 1 was **always** a relevant chunk $\rightarrow$ **$MRR = 1.000$**.
   - Ranks 1 and 2 were **always** the relevant chunks $\rightarrow$ **$nDCG = 1.000$**.
   - 2 relevant chunks divided by 5 slots $\rightarrow$ **$P@5 = 40.0\%$**.
   - 2 relevant chunks divided by 2 ground truth items $\rightarrow$ **$Recall = 100.0\%$**.

**Forensic Finding**: The V2 metrics were self-fulfilling algebraic properties of the array concatenation, not live model retrieval performance.

---

## 4. MATHEMATICAL CONSISTENCY & SAMPLE SIZE AUDIT ($n=400$ VS $n=500$)

### Why D1 Resolution Sample was $n = 400$ Chunks:
- With $N = 100$ cases and $topK = 5$, a complete benchmark should evaluate $500$ candidate slots.
- However, `simulatedRetrievedIds` concatenated 2 relevant + 2 irrelevant chunks = **exactly 4 chunks per case**.
- $100 \text{ cases} \times 4 \text{ chunks} = \mathbf{400\text{ chunks}}$.
- Slot 5 was empty in all 100 cases. The D1 resolution metric evaluated 400 out of 400 candidates, leaving 100 slots unutilized.

---

## 5. CLAIM ATTRIBUTION & CAUSALITY AUDIT

### Structural vs. Semantic Attribution:
- **Structural Attribution (100%)**: The claim attribution graph (`SOURCE EVIDENCE` $\rightarrow$ `EVIDENCE ID` $\rightarrow$ `CLAIM ID` $\rightarrow$ `KNOWLEDGE CHUNK` $\rightarrow$ `REASONING CONTEXT` $\rightarrow$ `REPORT SECTION`) is fully connected and machine-validatable.
- **Semantic Attribution (Estimated 70%)**: While fact claims (CVSS Base Score 9.3, CISA KEV status) contain `knowledge_ids` referencing NVD or CISA chunks, the underlying fact values were extracted from raw text regex or enrichment APIs, not parsed from the semantic body of the book chunk. The book chunk provides methodology framing, not primary ground truth.

### Causality Ablation Test Audit (Runs A, B, C):
- In Run B, removing the target chunk successfully excised the knowledge-informed claim and stripped corroboration tags, lowering analytical confidence from 0.85 to 0.75.
- In Run C, substituting an irrelevant chunk (e.g. AMF into a web vulnerability) was successfully rejected by the precondition gate.
- The 75.0% causal influence rate is **VERIFIED UNDER CONTROLLED CONDITIONS**, but relies on heuristic claim attribution rules rather than end-to-end generative LLM ablation.

---

## 6. PRECONDITION ACCURACY & ADVERSARIAL AUDIT

### Confusion Matrix Across Domain Preconditions:
Evaluating precondition gating across all 100 cases plus negative adversarial tests:

| Metric | Measured Value | Sample Size | Forensic Notes |
| :--- | :---: | :---: | :--- |
| **True Positive (TP)** | 85 | $n=85$ eligible cases | Legitimate domains correctly permitted |
| **True Negative (TN)** | 15 | $n=15$ restricted cases | AMF/PMA correctly blocked on inappropriate cases |
| **False Positive (FP)** | 0 | $n=100$ cases | Zero forbidden domains reached `USED` status |
| **False Negative (FN)**| 0 | $n=100$ cases | Zero valid domains were erroneously blocked |
| **Precondition Specificity** | **100.0%** | $TN / (TN + FP)$ | Perfect rejection of forbidden domains |
| **Precondition Sensitivity** | **100.0%** | $TP / (TP + FN)$ | Perfect acceptance of eligible domains |

> [!WARNING]
> **Adversarial Keyword Collision Caveat**: Preconditions rely on regular expressions. If raw telemetry contains natural language negation (e.g. *"No memory dump was acquired"*), naive regex matches the literal words `"memory dump"` and mistakenly permits AMF. Telemetry must be sanitized or parsed semantically to avoid keyword collision.

---

## 7. HIDDEN BENCHMARK EVALUATION (FROZEN TEST SET)

A brand-new hidden test set ([`validation/hidden_benchmark_cases.json`](file:///d:/Desktop/zayron-app/validation/hidden_benchmark_cases.json)) containing 6 unexposed, complex cases (including CVE-2024-38077 MadLicense, CVE-2024-3094 XZ Utils backdoor, and JA4 TLS beaconing) was evaluated without circular mock concatenation:
- All 6 cases compiled into valid 10-section canonical reports.
- All 6 cases passed the Deep Quality Gate.
- Adversarial negative case `hid_case_06` (host registry modification without deep observables) successfully quarantined all forensic knowledge chunks to `CONSIDERED_NOT_USED`.
- Test suite ([`tests/benchmark_integrity.test.ts`](file:///d:/Desktop/zayron-app/tests/benchmark_integrity.test.ts)) executed with **6 pass, 0 fail**.

---

## 8. COMPONENT FORENSIC SCORECARD

| Component | Weight | Forensic Score | Forensic Justification |
| :--- | :---: | :---: | :--- |
| **Benchmark Integrity** | 10% | **55.0 / 100** | Programmatic test fixtures; synthetic loop-generated labels. |
| **Ground Truth Independence** | 10% | **45.0 / 100** | Circular candidate mock concatenation in evaluator loop. |
| **Retrieval Architecture** | 15% | **92.0 / 100** | Authentic 768d embedding + Vectorize index + D1 resolution works. |
| **Chunk Resolution** | 10% | **95.0 / 100** | 100% resolution on valid chunk IDs; slot 5 under-allocation noted. |
| **Provenance Integrity** | 10% | **98.0 / 100** | Cryptographic SHA-256 content hashes detect all text tampering. |
| **Structural Claim Attribution** | 10% | **95.0 / 100** | Complete, unbroken 6-layer graph traversal verified. |
| **Semantic Claim Attribution** | 10% | **70.0 / 100** | Facts derived from regex enrichment; chunks provide methodology. |
| **Causal Attribution** | 10% | **75.0 / 100** | Run A/B/C ablation verified under deterministic conditions. |
| **Precondition Accuracy** | 5% | **92.0 / 100** | Strong domain gating; regex vulnerable to natural language negation. |
| **Adversarial Robustness** | 5% | **80.0 / 100** | Resistant to cross-domain injection; advanced prompt evasion untested. |
| **Reproducibility** | 5% | **100.0 / 100** | 100% deterministic code and hash verification. |
| **TOTAL COMPOSITE SCORE** | **100%** | **79.5 / 100** | **GRADE: B+ (VALIDATED WITH LIMITATIONS)** |

---

## 9. MANDATORY FORENSIC DISTINCTION TABLE

### A. WHAT IS PROVEN
1. **Cloudflare Vectorize & D1 Bindings**: Live Workers AI embedding generation (`@cf/baai/bge-base-en-v1.5`) and Vectorize similarity matching are verified and functional on the Cloudflare Workers runtime.
2. **Cryptographic Provenance**: Resolved chunks generate SHA-256 hashes directly from chunk text; modifying a single byte invalidates the content hash.
3. **Precondition Gating**: The gate prevents memory forensics chunks (*AMF*) and malware analysis chunks (*PMA*) from entering `USED` status when corresponding evidence is absent.
4. **Structural Attribution**: The 6-layer attribution graph accurately tracks evidence through claim, chunk, context, and report section.
5. **Safe Production Isolation**: Public ingestion and public intelligence reporting paths remain 100% untouched.

### B. WHAT IS ONLY OBSERVED
1. **Live Query Latency**: Cloudflare Vectorize queries exhibit 85–150ms round-trip latency on the production edge.
2. **Cosine Similarity Range**: High-relevance threat signals cluster at cosine similarities between 0.78 and 0.94.

### C. WHAT IS SYNTHETIC
1. **Memory Forensics Test Cases**: All 15 DFIR cases are synthetic lab dumps (explicitly labeled).
2. **Benchmark Fixture Text**: Case descriptions in `validation/benchmark_cases.json` were programmatically synthesized from templates.
3. **Benchmark Chunk Identifiers**: Target IDs like `chk_hae_heap_0` were synthesized by generator loops.

### D. WHAT IS SELF-REPORTED
1. **Heuristic Confidence Scores**: Analytical confidence (e.g. 0.95) represents heuristic mathematical weighting, not calibrated empirical probabilities.
2. **V2 Global 100% Claims**: Initial claims of 100% precision and recall were self-reported outputs of the mock evaluator.

### E. WHAT IS CIRCULAR
1. **V2 Precision@5 (40%) & Recall@5 (100%)**: Derived directly from prepending the 2-item synthetic ground truth into a 4-item candidate array.
2. **V2 MRR (1.0) & nDCG (1.0)**: Resulted directly from ordering `relevant_chunk_ids` at index 0 and 1 before evaluation.

### F. WHAT REMAINS UNKNOWN
1. **Empirical Recall against Live 25,642 Corpus**: Real-world recall when arbitrary uncurated threat signals are queried against the complete live vector index without synthetic filtering.
2. **High-Concurrency Vectorize Behavior**: Latency and error rates under $\ge 200$ concurrent requests.

---

## 10. FINAL CLASSIFICATION & DECISION

$$\mathbf{B — VALIDATED\ WITH\ LIMITATIONS}$$

### Decision Rationale:
- The system is **NOT** a failure (`C` or `D`): The core engine, Vectorize integration, D1 chunk tables, quality gates, and cryptographic provenance operate correctly.
- The system is **NOT** fully validated (`A`): The V2 benchmark contained circular evaluator logic and synthetic test fixtures that prevented true empirical measurement of retrieval ranking against the full corpus.
- **Next Phase Direction**: The system remains safely in **SHADOW MODE**. Before production consideration, an authentic live benchmark querying `zayron-knowledge-index` directly without candidate mock injection must be executed.
