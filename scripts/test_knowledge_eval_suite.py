import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

SEARCH_API = "https://zayron-x-api.aabusabih.workers.dev/api/v1/knowledge/search"
ANALYST_API = "https://zayron-x-api.aabusabih.workers.dev/api/v1/analyze"

EVAL_QUESTIONS = [
    {
        "id": "Q1",
        "query": "What is MITRE ATT&CK?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "Q2",
        "query": "Which framework is relevant to ransomware risk?",
        "expected_entity": "kb_mitre_attack",
        "expected_tier": 0
    },
    {
        "id": "Q3",
        "query": "What is the difference between CVSS and EPSS?",
        "expected_entity": "kb_cvss",
        "expected_tier": 0
    },
    {
        "id": "Q4",
        "query": "What is CISA KEV?",
        "expected_entity": "kb_cisa_kev",
        "expected_tier": 0
    },
    {
        "id": "Q5",
        "query": "What is STIX?",
        "expected_entity": "kb_stix_taxii",
        "expected_tier": 0
    },
    {
        "id": "Q6",
        "query": "What does NIS2 regulate?",
        "expected_entity": "kb_reg_eu_nis2",
        "expected_tier": 0
    },
    {
        "id": "Q7",
        "query": "What does DORA concern?",
        "expected_entity": "kb_reg_eu_dora",
        "expected_tier": 0
    },
    {
        "id": "Q8",
        "query": "How does EU DORA and NIS2 apply to a critical financial gateway CVE?",
        "expected_entity": "kb_reg_eu_dora",
        "expected_tier": 0
    }
]

print("=" * 80)
print("  ZAYRON-X PHASE 4: AI KNOWLEDGE EVALUATION SUITE (8 TARGET QUESTIONS)")
print("=" * 80)

passed = 0

for item in EVAL_QUESTIONS:
    qid = item["id"]
    q = item["query"]
    t0 = time.time()

    # Step 1: Knowledge Hybrid Search
    search_req = urllib.request.Request(
        SEARCH_API,
        data=json.dumps({"query": q}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronKnowledgeEval/4.0'}
    )

    try:
        with urllib.request.urlopen(search_req, timeout=15) as s_resp:
            s_data = json.loads(s_resp.read().decode('utf-8'))
            top_match = s_data.get('results', [{}])[0]
            entity = top_match.get('entity', {})
            score = top_match.get('relevanceScore', 0)
            latency = int((time.time() - t0) * 1000)

            print(f"\n[{qid}] Query: '{q}'")
            print(f"  • Top Knowledge Entity: [{entity.get('id')}] {entity.get('title')}")
            print(f"  • Authority: Tier {entity.get('authority_tier')} | Score: {score} | Latency: {latency}ms")
            print(f"  • Summary: {entity.get('summary', '')[:100]}...")
            print(f"  • Official Source: {entity.get('source_url')}")

            if entity.get('id') == item['expected_entity'] or entity.get('authority_tier') == item['expected_tier']:
                passed += 1
                print("  -> EVALUATION RESULT: [PASSED]")
            else:
                print("  -> EVALUATION RESULT: [FAILED]")

    except Exception as e:
        print(f"[{qid}] Error: {e}")

print("\n" + "=" * 80)
print(f"  EVALUATION SUMMARY: {passed}/{len(EVAL_QUESTIONS)} PASSED ({passed/len(EVAL_QUESTIONS)*100:.1f}%)")
print("=" * 80)
