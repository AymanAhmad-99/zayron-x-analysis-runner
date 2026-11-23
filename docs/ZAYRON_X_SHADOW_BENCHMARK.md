# ZAYRON-X — INDEPENDENT GOLDEN RETRIEVAL BENCHMARK

**Document ID**: `ZAYRON_X_SHADOW_BENCHMARK_V2`  
**Dataset Path**: `validation/benchmark_cases.json`  
**Total Sample Size**: $N = 100$ cases  
**Status**: ACTIVE & MACHINE-AUDITABLE  
**Audit Standard**: Zero-Fabrication, Independent Ground Truth, No Self-Certification  

---

## 1. BENCHMARK COMPOSITION & DOMAIN BALANCE

The benchmark establishes 100 curated threat intelligence cases across 5 essential domains to evaluate semantic retrieval, precondition gating, chunk resolution, and causal claim attribution:

| Domain Category | Sample Size ($n$) | Source Nature | Synthetic Status | Primary Preconditions |
| :--- | :---: | :--- | :--- | :--- |
| **Vulnerability Analysis** | $n = 25$ | Real CVE Advisories (NVD, MSRC, CISA, RedHat, etc.) | Real-World Empirical | CVE Identifier, Exploit Metrics |
| **Malware Analysis** | $n = 25$ | Real Malware Telemetry (Qakbot, LummaC2, Cobalt Strike, etc.) | Real-World Empirical | Executable Hash / Binary Payload |
| **Network Security** | $n = 20$ | Real Network Sensor Logs (DNS Tunneling, Kerberoast, Zeek) | Real-World Empirical | PCAP / Network Flow Observables |
| **Memory Forensics** | $n = 15$ | Controlled Volatility / VAD Memory Dumps | **SYNTHETIC CONTROLLED TEST** | Physical Memory Dump (.DMP) |
| **Threat Actor / Campaign** | $n = 15$ | Real CTI Briefings (APT28, APT29, Lazarus, Volt Typhoon) | Real-World Empirical | Verified Actor / Campaign Nexus |
| **Total Benchmark** | **$N = 100$** | **Balanced Enterprise Threat Surface** | **Controlled & Transparent** | **Domain-Specific Telemetry** |

> [!IMPORTANT]
> In accordance with Rule 2 and Phase 6 rules: All 15 Memory Forensics test cases are strictly labelled `SYNTHETIC CONTROLLED TEST` to avoid disguising synthetic lab artifacts as live incidents.

---

## 2. GROUND TRUTH SPECIFICATION

For every benchmark case, the ground truth explicitly predefines:
1. `relevant_chunk_ids`: Exact canonical knowledge chunks that substantively advance technical analysis.
2. `irrelevant_chunk_ids`: Adversarial or cross-domain chunks designed to test filter resistance.
3. `acceptable_knowledge_domains`: Authorized analytical categories eligible for reasoning context inclusion.
4. `forbidden_knowledge_domains`: Disallowed domains (e.g. Memory Forensics applied to a network advisory).
5. `expected_preconditions_met`: Boolean state asserting whether raw telemetry meets admission criteria.
6. `expected_claim_topics`: Key evidentiary propositions that must be supported in the final report.

---

## 3. INFORMATION RETRIEVAL FORMULATION

The independent evaluator computes standard information retrieval metrics without trusting generator assertions:

### Precision@K ($P@K$)
$$P@K = \frac{|\text{Retrieved Chunks} \cap \text{Relevant Chunks}|}{K}$$

### Recall@K ($R@K$)
$$R@K = \frac{|\text{Retrieved Chunks} \cap \text{Relevant Chunks}|}{|\text{Relevant Chunks}|}$$

### Mean Reciprocal Rank ($MRR$)
$$MRR = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
Where $\text{rank}_i$ is the rank position of the first relevant chunk.

### Normalized Discounted Cumulative Gain ($nDCG@K$)
$$DCG@K = \sum_{i=1}^K \frac{2^{rel_i} - 1}{\log_2(i + 1)}, \quad nDCG@K = \frac{DCG@K}{IDCG@K}$$

---

## 4. PRECONDITION & ADVERSARIAL TEST GATES

The benchmark contains explicit negative and adversarial test gates:
- **Negative Gate 1 (Vulnerability vs AMF)**: Supplying a pure CVE advisory with no memory dump must gate *Art of Memory Forensics* (`chk_amf_*`) to `CONSIDERED_NOT_USED` or reject it.
- **Negative Gate 2 (Host Event vs PMA)**: Supplying an uncompiled script or pure IP telemetry must not trigger raw disassembler methodology from *Practical Malware Analysis* (`chk_pma_*`).
- **Negative Gate 3 (Network vs Host-only)**: Supplying an isolated workstation registry event must gate network protocol inspection (*Attacking Network Protocols*).
- **Negative Gate 4 (Unattributed Signal vs Threat Actor)**: Absence of explicit campaign indicators must force the report to register an explicit `UNKNOWN` claim rather than attributing to a favorite threat actor.
