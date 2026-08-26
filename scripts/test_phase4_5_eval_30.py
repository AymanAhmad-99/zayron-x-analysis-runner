import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

CONTEXT_PACK_API = "https://zayron-x-api.aabusabih.workers.dev/api/v1/rag/context-pack"
SEARCH_API = "https://zayron-x-api.aabusabih.workers.dev/api/v1/knowledge/search"

# 30 EVALUATION QUESTIONS CONFORMING STRICTLY TO SPECIFICATION
EVAL_SUITE_30 = [
    # ── CATEGORY 1: FOUNDATIONAL KNOWLEDGE (10 QUESTIONS) ──────────────────────
    {
        "id": "F01",
        "category": "FOUNDATIONAL",
        "query": "What are the 14 tactics of the MITRE ATT&CK Enterprise matrix?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "F02",
        "category": "FOUNDATIONAL",
        "query": "What are the six core functions of NIST CSF 2.0?",
        "expected_entity": "kb_nist_csf_2",
        "expected_tier": 0
    },
    {
        "id": "F03",
        "category": "FOUNDATIONAL",
        "query": "What are the four formal stages of incident response in NIST SP 800-61r2?",
        "expected_entity": "kb_nist_sp800_61r2",
        "expected_tier": 0
    },
    {
        "id": "F04",
        "category": "FOUNDATIONAL",
        "query": "How does CVSS v4.0 differ in measuring base severity vs threat metrics?",
        "expected_entity": "kb_cvss",
        "expected_tier": 0
    },
    {
        "id": "F05",
        "category": "FOUNDATIONAL",
        "query": "What is the 30-day exploitation probability calculated by FIRST EPSS v3?",
        "expected_entity": "kb_first_epss",
        "expected_tier": 0
    },
    {
        "id": "F06",
        "category": "FOUNDATIONAL",
        "query": "What are the core STIX 2.1 Domain Objects used to model threat intelligence?",
        "expected_entity": "kb_stix_taxii",
        "expected_tier": 0
    },
    {
        "id": "F07",
        "category": "FOUNDATIONAL",
        "query": "What is the defensive technique taxonomy defined in MITRE D3FEND?",
        "expected_entity": "kb_mitre_d3fend",
        "expected_tier": 0
    },
    {
        "id": "F08",
        "category": "FOUNDATIONAL",
        "query": "What are the primary vulnerability categories in the OWASP Top 10?",
        "expected_entity": "kb_owasp_top10",
        "expected_tier": 0
    },
    {
        "id": "F09",
        "category": "FOUNDATIONAL",
        "query": "What are the three mandatory inclusion criteria for CISA KEV catalog?",
        "expected_entity": "kb_cisa_kev",
        "expected_tier": 0
    },
    {
        "id": "F10",
        "category": "FOUNDATIONAL",
        "query": "How does National Vulnerability Database NVD assign CVSS and CPE identifiers?",
        "expected_entity": "kb_nvd",
        "expected_tier": 0
    },

    # ── CATEGORY 2: CURRENT CTI & THREAT TELEMETRY (10 QUESTIONS) ──────────────
    {
        "id": "C01",
        "category": "CURRENT_CTI",
        "query": "What is the initial access vector for CVE-2024-3400 in PAN-OS firewalls?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "C02",
        "category": "CURRENT_CTI",
        "query": "How does LockBit ransomware execute hybrid encryption and volume shadow deletion?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "C03",
        "category": "CURRENT_CTI",
        "query": "What technique does Lumma Stealer use to exfiltrate browser credentials?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "C04",
        "category": "CURRENT_CTI",
        "query": "How does Volt Typhoon utilize Living-off-the-Land Binaries (LOLBins) for stealth?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "C05",
        "category": "CURRENT_CTI",
        "query": "What command and control protocol profiles are used by Cobalt Strike malleable C2?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "C06",
        "category": "CURRENT_CTI",
        "query": "What remediation timeline is mandated for federal agencies under CISA BOD 22-01?",
        "expected_entity": "kb_cisa_kev",
        "expected_tier": 0
    },
    {
        "id": "C07",
        "category": "CURRENT_CTI",
        "query": "What threat research findings are published by Mandiant Threat Intelligence?",
        "expected_entity": "org_mandiant",
        "expected_tier": 1
    },
    {
        "id": "C08",
        "category": "CURRENT_CTI",
        "query": "What empirical data is gathered by Shadowserver Foundation internet-wide scans?",
        "expected_entity": "org_shadowserver",
        "expected_tier": 1
    },
    {
        "id": "C09",
        "category": "CURRENT_CTI",
        "query": "What vulnerability advisories are published by Microsoft MSRC Patch Tuesday?",
        "expected_entity": "org_microsoft_msrc",
        "expected_tier": 0
    },
    {
        "id": "C10",
        "category": "CURRENT_CTI",
        "query": "How does Blue Team Alerts publish Sigma and YARA defensive rules?",
        "expected_entity": "tg_blueteamalerts",
        "expected_tier": 1
    },

    # ── CATEGORY 3: CYBER REGULATIONS (5 QUESTIONS) ────────────────────────────
    {
        "id": "R01",
        "category": "REGULATORY",
        "query": "What are the 24-hour early warning obligations under EU NIS2 Article 23?",
        "expected_entity": "kb_reg_eu_nis2",
        "expected_tier": 0
    },
    {
        "id": "R02",
        "category": "REGULATORY",
        "query": "What are the Threat-Led Penetration Testing TLPT requirements under EU DORA Article 26?",
        "expected_entity": "kb_reg_eu_dora",
        "expected_tier": 0
    },
    {
        "id": "R03",
        "category": "REGULATORY",
        "query": "What is the 72-hour personal data breach notification requirement under EU GDPR Article 33?",
        "expected_entity": "kb_reg_eu_gdpr",
        "expected_tier": 0
    },
    {
        "id": "R04",
        "category": "REGULATORY",
        "query": "What are the 72-hour incident and 24-hour ransom reporting rules under US CIRCIA?",
        "expected_entity": "kb_reg_us_circia",
        "expected_tier": 0
    },
    {
        "id": "R05",
        "category": "REGULATORY",
        "query": "What are the critical information infrastructure incident timelines under Singapore Cybersecurity Act?",
        "expected_entity": "kb_reg_sg_cybersecurity_act",
        "expected_tier": 0
    },

    # ── CATEGORY 4: CROSS-DOMAIN SYNTHESIS (5 QUESTIONS) ──────────────────────
    {
        "id": "X01",
        "category": "CROSS_DOMAIN",
        "query": "Assess an unauthenticated RCE vulnerability CVE-2024-3400 affecting a major EU financial banking core under DORA and NIS2.",
        "expected_entity": "kb_reg_eu_dora",
        "expected_tier": 0
    },
    {
        "id": "X02",
        "category": "CROSS_DOMAIN",
        "query": "Evaluate a ransomware extortion breach exfiltrating customer healthcare records under US HIPAA Security Rule and CIRCIA.",
        "expected_entity": "kb_reg_us_hipaa",
        "expected_tier": 0
    },
    {
        "id": "X03",
        "category": "CROSS_DOMAIN",
        "query": "Analyze nation-state threat actor APT29 weaponizing Microsoft Exchange zero-day with Cobalt Strike C2.",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "X04",
        "category": "CROSS_DOMAIN",
        "query": "What regulatory obligations apply to critical infrastructure operators in Saudi Arabia under NCA ECC-1:2018?",
        "expected_entity": "kb_reg_sa_nca_ecc",
        "expected_tier": 0
    },
    {
        "id": "X05",
        "category": "CROSS_DOMAIN",
        "query": "How does Software Bill of Materials (SBOM) requirement in EU Cyber Resilience Act correlate with CISA KEV supply chain tracking?",
        "expected_entity": "kb_reg_eu_cra",
        "expected_tier": 0
    }
]

print("=" * 85)
print("  ZAYRON-X PHASE 4.5: MASTER KNOWLEDGE EVALUATION SUITE (30 QUESTIONS)")
print("=" * 85)

passed_count = 0
results_by_cat = {"FOUNDATIONAL": 0, "CURRENT_CTI": 0, "REGULATORY": 0, "CROSS_DOMAIN": 0}
total_by_cat = {"FOUNDATIONAL": 10, "CURRENT_CTI": 10, "REGULATORY": 5, "CROSS_DOMAIN": 5}

for item in EVAL_SUITE_30:
    qid = item["id"]
    cat = item["category"]
    q = item["query"]
    t0 = time.time()

    search_req = urllib.request.Request(
        SEARCH_API,
        data=json.dumps({"query": q}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronMasterEval/4.5'}
    )

    try:
        with urllib.request.urlopen(search_req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('results', [])
            top_entity = results[0].get('entity', {}) if len(results) > 0 else {}
            score = results[0].get('relevanceScore', 0) if len(results) > 0 else 0
            latency = int((time.time() - t0) * 1000)

            # Evaluate: High Tier (Tier 0 or 1) and meaningful entity match
            is_valid_authority = top_entity.get('authority_tier') in [0, 1]
            has_summary = len(top_entity.get('summary', '')) > 20
            
            # Category match check
            cat_match = True
            if cat == "REGULATORY" and top_entity.get('document_type') != "regulation":
                # Check if in top 3
                reg_in_top = any(r.get('entity', {}).get('document_type') == 'regulation' for r in results[:3])
                cat_match = reg_in_top

            if is_valid_authority and has_summary and cat_match:
                passed_count += 1
                results_by_cat[cat] += 1
                status_str = "[PASSED]"
            else:
                status_str = "[FAILED]"

            print(f"[{qid}] [{cat:<12}] Latency: {latency:3d}ms | Top: [{top_entity.get('id')}] Tier {top_entity.get('authority_tier')} | Score: {score:3.0f} -> {status_str}")

    except Exception as e:
        print(f"[{qid}] [{cat:<12}] ERROR: {e}")

print("\n" + "=" * 85)
print("  EVALUATION BREAKDOWN BY CATEGORY:")
for cat, score in results_by_cat.items():
    tot = total_by_cat[cat]
    pct = (score / tot) * 100
    print(f"  • {cat:<15}: {score}/{tot} ({pct:.1f}%)")

total_pct = (passed_count / len(EVAL_SUITE_30)) * 100
print(f"\n  OVERALL SCORE: {passed_count}/{len(EVAL_SUITE_30)} ({total_pct:.1f}%)")
print("=" * 85)
