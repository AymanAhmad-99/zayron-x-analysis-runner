import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://zayron-x-api.aabusabih.workers.dev"

def test_endpoint(name, path, method="GET", payload=None):
    print(f"\n{'='*64}\n  TEST: {name}\n{'='*64}")
    url = f"{API_URL}{path}"
    data = json.dumps(payload).encode('utf-8') if payload else None
    headers = {'Content-Type': 'application/json', 'User-Agent': 'ZayronAnalystTester/2.0'}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            print(f"[✓] Status {resp.status}")
            return body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"[✗] HTTP {e.code}: {err_body}")
        return None
    except Exception as e:
        print(f"[✗] Error: {e}")
        return None

# 1. Test Knowledge Corpus Manifest Endpoint
corpus = test_endpoint("1. Knowledge Corpus Manifest", "/api/v1/knowledge/corpus")
if corpus:
    print(f"Total References: {corpus.get('total_references')}")
    print(f"Total Chunks: {corpus.get('total_corpus_chunks')}")

# 2. Test Hybrid RAG Retrieval (Vectorize + D1)
retrieval = test_endpoint(
    "2. Hybrid RAG Retrieval for T1190 / Initial Access",
    "/api/v1/rag/retrieve",
    method="POST",
    payload={"query": "How does MITRE ATT&CK define Initial Access and T1190 exploitation?", "topK": 3}
)
if retrieval:
    chunks = retrieval.get('data', {}).get('retrievedChunks', [])
    print(f"Retrieved {len(chunks)} chunks:")
    for c in chunks:
        print(f"  * [{c.get('documentTitle')}] (Score: {c.get('score')}, Sim: {c.get('semanticSimilarity')}): {c.get('section')}")

# 3. Test Full AI Intelligence Analyst Analysis
analyst = test_endpoint(
    "3. Full Evidence-Grounded Intelligence Assessment",
    "/api/v1/analyze",
    method="POST",
    payload={
        "query": "CRITICAL ADVISORY: Threat actor APT29 weaponizing CVE-2026-1453 with Cobalt Strike payload on C2 IP 194.26.29.112.",
        "workflow": "ai_intelligence_analyst"
    }
)
if analyst:
    data = analyst.get('data', {})
    assessment = data.get('assessment', {})
    print(f"Headline:         {assessment.get('headline')}")
    print(f"Threat Level:     {assessment.get('threat_level')}")
    print(f"Confidence Score: {assessment.get('confidence_score')} ({assessment.get('confidence_state')})")
    print(f"Executive Summary:{assessment.get('executive_summary')}")
    print(f"Actors:           {data.get('actors')}")
    print(f"Vulnerabilities:  {data.get('vulnerabilities')}")
    print(f"Malware:          {data.get('malware')}")
    print(f"Citations:        {len(data.get('citations', []))} authoritative citations attached")
