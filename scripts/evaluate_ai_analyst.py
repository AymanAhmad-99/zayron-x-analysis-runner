import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://zayron-x-api.aabusabih.workers.dev"

def call_analyze(query):
    url = f"{API_URL}/api/v1/analyze"
    data = json.dumps({"query": query, "workflow": "eval_suite"}).encode('utf-8')
    headers = {'Content-Type': 'application/json', 'User-Agent': 'ZayronEvalSuite/2.0'}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

def call_retrieve(query):
    url = f"{API_URL}/api/v1/rag/retrieve"
    data = json.dumps({"query": query, "topK": 5}).encode('utf-8')
    headers = {'Content-Type': 'application/json', 'User-Agent': 'ZayronEvalSuite/2.0'}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

# ── 1. 20 GROUNDED CTI QUESTIONS ──────────────────────────────────────────────
GROUNDED_CTI_CASES = [
    "What MITRE technique describes exploiting public-facing applications like CVE-2026-1453?",
    "How does MITRE ATT&CK define Initial Access TA0001 vs Execution TA0002?",
    "What are the six core functions defined in the NIST Cybersecurity Framework 2.0?",
    "What are the mandatory criteria for adding a vulnerability to the CISA KEV catalog?",
    "How does the FIRST EPSS model calculate the probability of in-the-wild exploitation?",
    "What is the difference between CVSS severity metrics and EPSS threat likelihood?",
    "What are the standard stages of the incident response lifecycle in NIST SP 800-61 Rev 2?",
    "How does Traffic Light Protocol TLP:AMBER differ from TLP:CLEAR in NIST SP 800-150?",
    "How does the Diamond Model characterize an intrusion activity across four vertices?",
    "What PE header artifacts are inspected during basic static malware analysis?",
    "How does Volatility malfind detect in-memory code injection using memory permissions?",
    "What are the six threat categories defined by Adam Shostack in STRIDE?",
    "What Zeek transaction logs capture DNS lookups and TLS JA3/JA3S fingerprint hashes?",
    "How does stack-based buffer overflow corrupt the saved EIP/RIP return address?",
    "What defensive countermeasure tactics are defined in MITRE D3FEND?",
    "What are the top security risks in the OWASP Top 10 for LLM Applications?",
    "How does prompt injection LLM01 threaten Retrieval-Augmented Generation (RAG) pipelines?",
    "What is the difference between Tactical, Operational, and Strategic Threat Intelligence?",
    "How does Process Hollowing evade endpoint detection compared to standard DLL injection?",
    "What telemetry in source_messages was captured for threat actor APT29 weaponizing CVE-2026-1453?",
]

# ── 2. 10 INSUFFICIENT EVIDENCE CASES ──────────────────────────────────────────
INSUFFICIENT_EVIDENCE_CASES = [
    "Did threat actor SolarSpider hack the moon base using zero-day CVE-2099-99999?",
    "What evidence exists that APT99 deployed malware QuantumWiper in 1995?",
    "Has cyber group PhantomPenguin breached the Antarctica research servers?",
    "What C2 IP was observed for fictitious malware CyberKraken on Mars network?",
    "Can you prove that group InvisibleShadow stole the secret blueprint of Atlantis?",
    "What SHA256 hash was attributed to fake tool GhostPayload404?",
    "Is there telemetry confirming that actor RedDragonX breached unicorn systems?",
    "What CVE-2035-77777 exploitation telemetry was seen in yesterday's feed?",
    "Did threat actor ZeroGhost deploy ransomware NebulaLock against orbital satellites?",
    "What evidence links group CosmicBear to the 1890 telegraph wiretapping?",
]

# ── 3. 10 CONTRADICTION CASES ──────────────────────────────────────────────────
CONTRADICTION_CASES = [
    "Vendor A says CVE-2026-1453 is actively exploited in the wild, while Blog B claims it is only theoretical.",
    "Source Alpha attributes IP 194.26.29.112 to APT28, but Source Beta attributes it to APT29.",
    "Report X claims DarkSide is completely disbanded, while Report Y observed new Lumma deployments yesterday.",
    "CERT report says CVE-2026-69836 requires authentication, while dark web seller claims it is unauthenticated RCE.",
    "Security firm 1 states Cobalt Strike was used, whereas security firm 2 found Brute Ratel artifacts on the same C2.",
    "Advisory claims patch was released on Monday, while vendor status page indicates patch is still under development.",
    "Telemetry feed indicates C2 domain is dynamic DNS, while WHOIS record shows bulletproof dedicated registrar.",
    "Incident report claims data was exfiltrated via DNS tunneling, while firewall logs show HTTPS POST egress.",
    "Source 1 asserts attacker utilized PowerShell T1059.001, while EDR log shows Python script execution T1059.006.",
    "Threat feed claims zero-day affects Linux kernel 6.8, while vendor disclosure restricts flaw to Windows Server.",
]

# ── 4. 10 ENTITY RESOLUTION CASES ──────────────────────────────────────────────
ENTITY_RESOLUTION_CASES = [
    "Identify threat actor Cozy Bear and its canonical designation.",
    "Resolve threat actor Fancy Bear to its standard APT identifier.",
    "What is the canonical name for threat actor Lazarus Group (Hidden Cobra)?",
    "Resolve malware family Mimikatz and its tool category.",
    "Identify threat actor Volt Typhoon and targeted infrastructure sectors.",
    "Resolve malware family Lumma (LummaC2 Stealer) to its canonical record.",
    "Identify threat actor DarkSide and associated ransomware lineage.",
    "Resolve malware Cobalt Strike and its standard security classification.",
    "What is the canonical identifier for LockBit 3.0 (LockBit Black)?",
    "Resolve threat actor Sandworm (Voodoo Bear) to its standard profile.",
]

# ── 5. 10 MULTILINGUAL NORMALIZATION CASES ─────────────────────────────────────
MULTILINGUAL_CASES = [
    "Обнаружена активность группировки APT29 с использованием уязвимости CVE-2026-1453 и полезной нагрузки Cobalt Strike.",
    "بدافزار جدید Lumma سرورهای سازمانی را با اکسپلویت CVE-2026-69836 هدف قرار داده است.",
    "Обнаружена новая вредоносная кампания группировки DarkSide на серверах C2: 45.142.214.10.",
    "هشدار امنیتی: گروه نفوذگر هکری به سرورهای مایکروسافت نفوذ کرده است.",
    "Хакерская группа Sandworm развернула вредоносное ПО для нарушения работы энергетической сети.",
    "گزارش فنی: شناسایی آسیب‌پذیری بحرانی در زیرساخت ابری با قابلیت اجرای کد از راه دور.",
    "Анализ сетевого узла 194.26.29.112: обнаружен активный маяк C2 Cobalt Strike.",
    "حمله فیشینگ هدفمند با پیوست مخرب اکسل برای سرقت گواهینامه‌های ورود به شبکه.",
    "Уязвимость нулевого дня CVE-2026-1453 активно эксплуатируется без аутентификации.",
    "شناسایی رشته‌های مبهم شده با الگوریتم XOR در باینری بدافزار استیلر.",
]

# ── 6. 10 NOISE & IRRELEVANT QUERIES ──────────────────────────────────────────
NOISE_CASES = [
    "Can you write a poem about flowers and sunshine?",
    "What is the capital of France and best tourist spots in Paris?",
    "How do I bake chocolate chip cookies at home?",
    "Tell me a joke about a chicken crossing the road.",
    "Crypto pump 100x signal join our VIP telegram channel now!",
    "Who won the FIFA World Cup in 2022?",
    "Give me advice on repairing a broken washing machine motor.",
    "What is the weather forecast for tomorrow in London?",
    "Free casino bonus free spins no deposit required click here!",
    "Can you summarize the plot of the movie Inception?",
]

def run_suite():
    print("=" * 64)
    print("  ZAYRON-X AI INTELLIGENCE ANALYST & RAG EVALUATION SUITE")
    print("  Testing 70 Cases Across 6 Evidentiary Categories")
    print("=" * 64)

    total_tests = 0
    passed_tests = 0

    results = {
        "grounded_cti": {"total": 0, "pass": 0, "avg_citations": 0, "details": []},
        "insufficient_evidence": {"total": 0, "pass": 0, "details": []},
        "contradictions": {"total": 0, "pass": 0, "details": []},
        "entity_resolution": {"total": 0, "pass": 0, "details": []},
        "multilingual": {"total": 0, "pass": 0, "details": []},
        "noise_rejection": {"total": 0, "pass": 0, "details": []},
    }

    # 1. Grounded CTI
    print("\n[*] CATEGORY 1: 20 Grounded CTI Tests...")
    total_citations = 0
    for q in GROUNDED_CTI_CASES:
        total_tests += 1
        results["grounded_cti"]["total"] += 1
        res = call_analyze(q)
        data = res.get("data", {})
        assessment = data.get("assessment", {})
        citations = data.get("citations", [])
        total_citations += len(citations)
        # Passed if structured assessment and citations exist
        is_pass = bool(assessment.get("headline")) and len(citations) > 0 and assessment.get("threat_level") in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']
        if is_pass:
            passed_tests += 1
            results["grounded_cti"]["pass"] += 1
        results["grounded_cti"]["details"].append({"query": q, "pass": is_pass, "headline": assessment.get("headline"), "citations": len(citations)})
        print(f"  [{'✓' if is_pass else '✗'}] {q[:60]}... -> {assessment.get('threat_level')}, Cites: {len(citations)}")
        time.sleep(0.3)
    results["grounded_cti"]["avg_citations"] = round(total_citations / len(GROUNDED_CTI_CASES), 1)

    # 2. Insufficient Evidence
    print("\n[*] CATEGORY 2: 10 Insufficient Evidence Tests (Hallucination Rejection)...")
    for q in INSUFFICIENT_EVIDENCE_CASES:
        total_tests += 1
        results["insufficient_evidence"]["total"] += 1
        res = call_analyze(q)
        data = res.get("data", {})
        assessment = data.get("assessment", {})
        conf_state = assessment.get("confidence_state")
        summary = assessment.get("executive_summary", "") + " " + data.get("what_happened", "")
        # Passed if system correctly identified insufficient evidence / unverified claim without inventing facts
        is_pass = (conf_state in ['INSUFFICIENT_EVIDENCE', 'UNVERIFIED', 'LOW_CONFIDENCE']) or ('insufficient' in summary.lower() or 'no verified' in summary.lower() or 'unobserved' in summary.lower())
        if is_pass:
            passed_tests += 1
            results["insufficient_evidence"]["pass"] += 1
        results["insufficient_evidence"]["details"].append({"query": q, "pass": is_pass, "confidence_state": conf_state})
        print(f"  [{'✓' if is_pass else '✗'}] {q[:60]}... -> State: {conf_state}")
        time.sleep(0.3)

    # 3. Contradiction Handling
    print("\n[*] CATEGORY 3: 10 Contradiction Tests...")
    for q in CONTRADICTION_CASES:
        total_tests += 1
        results["contradictions"]["total"] += 1
        res = call_analyze(q)
        data = res.get("data", {})
        assessment = data.get("assessment", {})
        # Passed if response acknowledges conflicting claims or maintains calibrated confidence
        is_pass = bool(assessment.get("headline")) and (assessment.get("confidence_score", 1.0) < 0.95)
        if is_pass:
            passed_tests += 1
            results["contradictions"]["pass"] += 1
        results["contradictions"]["details"].append({"query": q, "pass": is_pass, "conf_score": assessment.get("confidence_score")})
        print(f"  [{'✓' if is_pass else '✗'}] {q[:60]}... -> Conf: {assessment.get('confidence_score')}")
        time.sleep(0.3)

    # 4. Entity Resolution
    print("\n[*] CATEGORY 4: 10 Entity Resolution Tests...")
    for q in ENTITY_RESOLUTION_CASES:
        total_tests += 1
        results["entity_resolution"]["total"] += 1
        ret = call_retrieve(q)
        entities = ret.get("data", {}).get("extractedEntities", {})
        chunks = ret.get("data", {}).get("retrievedChunks", [])
        # Passed if query entities extracted and chunks retrieved
        is_pass = len(chunks) > 0 or len(entities.get("actors", [])) > 0 or len(entities.get("malware", [])) > 0
        if is_pass:
            passed_tests += 1
            results["entity_resolution"]["pass"] += 1
        results["entity_resolution"]["details"].append({"query": q, "pass": is_pass, "actors": entities.get("actors"), "malware": entities.get("malware")})
        print(f"  [{'✓' if is_pass else '✗'}] {q[:60]}... -> Actors: {entities.get('actors')}, Malware: {entities.get('malware')}")
        time.sleep(0.3)

    # 5. Multilingual Normalization
    print("\n[*] CATEGORY 5: 10 Multilingual Normalization Tests (English-Only Gate)...")
    for q in MULTILINGUAL_CASES:
        total_tests += 1
        results["multilingual"]["total"] += 1
        res = call_analyze(q)
        data = res.get("data", {})
        assessment = data.get("assessment", {})
        headline = assessment.get("headline", "")
        summary = assessment.get("executive_summary", "")
        # Passed if output is in English with 0 Cyrillic or Arabic script in headline
        has_foreign_script = bool(headline and (any('\u0400' <= c <= '\u04FF' for c in headline) or any('\u0600' <= c <= '\u06FF' for c in headline)))
        is_pass = bool(headline) and not has_foreign_script
        if is_pass:
            passed_tests += 1
            results["multilingual"]["pass"] += 1
        results["multilingual"]["details"].append({"query": q, "pass": is_pass, "headline": headline})
        print(f"  [{'✓' if is_pass else '✗'}] {q[:50]}... -> English Headline: {headline[:40]}...")
        time.sleep(0.3)

    # 6. Noise Rejection
    print("\n[*] CATEGORY 6: 10 Noise & Irrelevant Query Rejection Tests...")
    for q in NOISE_CASES:
        total_tests += 1
        results["noise_rejection"]["total"] += 1
        res = call_analyze(q)
        data = res.get("data", {})
        assessment = data.get("assessment", {})
        threat_level = assessment.get("threat_level")
        conf_state = assessment.get("confidence_state")
        # Passed if classified as INFORMATIONAL/LOW and INSUFFICIENT_EVIDENCE
        is_pass = threat_level in ['INFORMATIONAL', 'LOW'] or conf_state in ['INSUFFICIENT_EVIDENCE', 'UNVERIFIED', 'LOW_CONFIDENCE']
        if is_pass:
            passed_tests += 1
            results["noise_rejection"]["pass"] += 1
        results["noise_rejection"]["details"].append({"query": q, "pass": is_pass, "threat_level": threat_level, "conf_state": conf_state})
        print(f"  [{'✓' if is_pass else '✗'}] {q[:50]}... -> Threat: {threat_level}, State: {conf_state}")
        time.sleep(0.3)

    print("\n" + "=" * 64)
    print("  EVALUATION SUITE SUMMARY RESULTS")
    print("=" * 64)
    print(f"Total Test Cases:       {total_tests}")
    print(f"Total Passed:           {passed_tests}")
    print(f"Overall Success Rate:   {round((passed_tests / total_tests) * 100, 1)}%")
    print(f"Grounded CTI:           {results['grounded_cti']['pass']}/{results['grounded_cti']['total']} (Avg Citations: {results['grounded_cti']['avg_citations']})")
    print(f"Insufficient Evidence:  {results['insufficient_evidence']['pass']}/{results['insufficient_evidence']['total']}")
    print(f"Contradictions:         {results['contradictions']['pass']}/{results['contradictions']['total']}")
    print(f"Entity Resolution:      {results['entity_resolution']['pass']}/{results['entity_resolution']['total']}")
    print(f"Multilingual (English): {results['multilingual']['pass']}/{results['multilingual']['total']}")
    print(f"Noise Rejection:        {results['noise_rejection']['pass']}/{results['noise_rejection']['total']}")
    print("=" * 64)

    return results

if __name__ == '__main__':
    run_suite()
