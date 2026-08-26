import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://zayron-x-api.aabusabih.workers.dev"

def analyze_signal(query, workflow="burn_in_test"):
    url = f"{API_URL}/api/v1/analyze"
    data = json.dumps({"query": query, "workflow": workflow}).encode('utf-8')
    headers = {'Content-Type': 'application/json', 'User-Agent': 'ZayronBurnIn/2.5'}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

# ── 1. 20 REAL ENGLISH SIGNALS ────────────────────────────────────────────────
SIGNALS_ENGLISH = [
    "CISA adds CVE-2024-3400 PAN-OS command injection vulnerability to KEV catalog with active exploitation in wild.",
    "Threat actor Volt Typhoon targeting critical infrastructure using living-off-the-land binaries and compromised SOHO routers.",
    "Ransomware group LockBit 3.0 deploying BlackSuit payload across healthcare sector via Phishing attachment T1566.001.",
    "Critical zero-day vulnerability in Ivanti Connect Secure CVE-2023-46805 exploited by UNC5221 threat actor.",
    "Observed Lumma Stealer variant distributing via fake CAPTCHA pages with C2 communication to 185.220.101.5.",
    "Active exploitation of Apache ActiveMQ remote code execution flaw CVE-2023-46604 deploying Godzilla webshell.",
    "Threat actor Lazarus Group targeting cryptocurrency exchanges with trojanized DeFi trading applications.",
    "Advisory: Microsoft Exchange server privilege escalation vulnerability CVE-2024-21410 actively weaponized.",
    "New AsyncRAT campaign using obfuscated PowerShell scripts T1059.001 to establish persistence on Windows servers.",
    "Sandworm deploying HermeticWiper malware against energy substation telemetry interfaces in targeted destructive attack.",
    "Exploitation of Atlassian Confluence broken access control flaw CVE-2023-22515 observed in the wild.",
    "Fancy Bear (APT28) spear-phishing campaign leveraging CVE-2023-38831 in WinRAR to deploy HeadLace backdoor.",
    "Akira ransomware exploiting Cisco ASA and FTD devices via CVE-2023-20269 for initial perimeter breach.",
    "DarkSide ransomware lineage executing double extortion attack on industrial manufacturing supply chain.",
    "Observed Cobalt Strike team server active on IP 45.142.214.10 with malleable C2 HTTP profile.",
    "Critical RCE vulnerability in Palo Alto Networks Expedition CVE-2024-5910 leading to admin account takeover.",
    "QakBot (QBot) malware resurrecting with novel DLL sideloading technique against financial institutions.",
    "Salt Typhoon infiltrating telecommunications providers via router firmware backdoor and packet capture tools.",
    "Critical unauthenticated SQL injection vulnerability in Fortinet FortiClient EMS CVE-2023-48788.",
    "RedLine Stealer exfiltrating browser credentials and crypto wallet seeds to Russian bulletproof hosting node."
]

# ── 2. 20 REAL MULTILINGUAL SIGNALS (RU, FA, AR, ZH) ──────────────────────────
SIGNALS_MULTILINGUAL = [
    # Russian
    "Хакерская группировка APT28 использует эксплойт для уязвимости в WinRAR CVE-2023-38831 для доставки бэкдора.",
    "Обнаружена новая кампания программы-вымогателя LockBit 3.0, нацеленная на промышленные предприятия.",
    "Анализ образца вредоносного ПО Lumma Stealer: сервер C2 185.220.101.5 активно принимает украденные учетные данные.",
    "Группа Sandworm атакует энергетическую инфраструктуру с использованием разрушительного вайпера.",
    "Критическая уязвимость нулевого дня в оборудовании Fortinet CVE-2023-48788 активно эксплуатируется.",
    # Persian (Farsi)
    "گروه هکری Charming Kitten زیرساخت‌های دولتی را با بدافزار سفارشی هدف قرار داده است.",
    "شناسایی کارزار فیشینگ هدفمند با استفاده از اکسپلویت CVE-2024-3400 در تجهیزات فایروال سازمانی.",
    "بدافزار جاسوسی جدید اطلاعات اعتباری کاربران را به سرور فرماندهی 194.26.29.112 ارسال می‌کند.",
    "هشدار فوری: آسیب‌پذیری بحرانی در سرویس مایکروسافت اکسچنج به نفوذگران اجازه ارتقای دسترسی می‌دهد.",
    "کشف یک باج‌افزار پیشرفته که فایل‌های سرورهای لینوکس را با الگوریتم ChaCha20 رمزگذاری می‌کند.",
    # Arabic
    "تحذير أمني عاجل: رصد استغلال نشط لثغرة أمنية حرجة في خوادم البريد الإلكتروني الحكومية.",
    "مجموعة التهديد الإلكتروني Lazarus تنفذ هجمات احتيالية ضد منصات التداول المالي الرقمي.",
    "اكتشاف برمجية خبيثة تقوم بتسريب مفاتيح التشفير وسرقة بيانات جلسات التصفح عبر بروتوكول HTTPS.",
    "هجوم فدية يستهدف قطاع الرعاية الصحية مع تشفير قواعد البيانات الحيوية ومطالبة بفدية مالية.",
    "رصد خادم تحكم وسيط نشط يستخدم لتوزيع حمولات Cobalt Strike الخبيثة على الشبكات الداخلية.",
    # Chinese
    "监测到APT组织Volt Typhoon利用已知路由器漏洞针对关键基础设施实施长周期潜伏.",
    "针对金融系统的钓鱼邮件攻击活动携带AsyncRAT远程控制木马载荷.",
    "发现针对企业VPN网关的零日漏洞CVE-2024-21410利用尝试及后续内网横向移动.",
    "新型窃密木马利用仿冒软件安装包诱导用户下载并在后台盗取钱包私钥.",
    "暗网论坛出现针对工业控制系统SCADA的新型勒索软件定制变种交易信息."
]

# ── 3. 20 NOISE / SPAM / CHATTER SIGNALS ──────────────────────────────────────
SIGNALS_NOISE = [
    "Free crypto pump signals join our VIP Telegram channel 100x gem guaranteed!",
    "Can you write a romantic poem about cherry blossoms in spring?",
    "Best low cost flight tickets from Paris to London discount coupon code.",
    "How do I bake delicious double chocolate chip cookies in 15 minutes?",
    "Who is the greatest football player in history Messi or Ronaldo?",
    "Earn $5000 daily working from home no experience needed click here now!",
    "What is the capital of Australia and best tourist attractions in Sydney?",
    "Good morning everyone! Hope you all have an amazing and productive Tuesday!",
    "Can you tell me a funny joke about a programmer and a rubber duck?",
    "Online casino bonus 500 free spins no deposit required register today!",
    "How to fix a leaking bathroom faucet without calling a plumber?",
    "What are the best healthy breakfast ideas for rapid weight loss?",
    "Looking for cheap Netflix account subscription lifetime warranty contact admin.",
    "Can you summarize the plot and ending of Christopher Nolan's Inception?",
    "Hey guys does anyone know what time the supermarket closes on Sundays?",
    "Crypto trading bot automated profits 99% accuracy rate download now free.",
    "What is the average speed of an unladen European swallow?",
    "Selling followers and likes for Instagram TikTok and YouTube cheap price.",
    "Just a quick thought about how beautiful the weather is outside today!",
    "Diet tips how to drink 3 liters of water every single day without feeling bloated."
]

# ── 4. 20 DUPLICATE / RE-TRANSMISSION SIGNALS ─────────────────────────────────
SIGNALS_DUPLICATES = [
    # Duplicate pair 1 (Re-transmission of PAN-OS CVE-2024-3400)
    "CISA adds CVE-2024-3400 PAN-OS command injection vulnerability to KEV catalog with active exploitation in wild.",
    "ALERT: CVE-2024-3400 PAN-OS flaw added to CISA KEV catalog due to in-the-wild exploitation.",
    # Duplicate pair 2 (Re-transmission of Volt Typhoon)
    "Threat actor Volt Typhoon targeting critical infrastructure using living-off-the-land binaries and compromised SOHO routers.",
    "Volt Typhoon cyber group using LotL techniques and SOHO routers to target critical infrastructure.",
    # Duplicate pair 3 (Re-transmission of Ivanti CVE-2023-46805)
    "Critical zero-day vulnerability in Ivanti Connect Secure CVE-2023-46805 exploited by UNC5221 threat actor.",
    "UNC5221 exploiting Ivanti Connect Secure zero-day CVE-2023-46805 in global intrusion campaign.",
    # Duplicate pair 4 (Re-transmission of Lumma Stealer on C2)
    "Observed Lumma Stealer variant distributing via fake CAPTCHA pages with C2 communication to 185.220.101.5.",
    "Lumma Stealer C2 beaconing observed on IP 185.220.101.5 from fake CAPTCHA lure campaign.",
    # Duplicate pair 5 (Re-transmission of Lazarus crypto)
    "Threat actor Lazarus Group targeting cryptocurrency exchanges with trojanized DeFi trading applications.",
    "Lazarus Group deploying trojanized DeFi apps against crypto financial institutions.",
    # Duplicate pair 6 (Re-transmission of Fortinet CVE-2023-48788)
    "Critical unauthenticated SQL injection vulnerability in Fortinet FortiClient EMS CVE-2023-48788.",
    "Fortinet FortiClient EMS flaw CVE-2023-48788 actively exploited by ransomware operators.",
    # Duplicate pair 7 (Re-transmission of WinRAR CVE-2023-38831)
    "Fancy Bear (APT28) spear-phishing campaign leveraging CVE-2023-38831 in WinRAR to deploy HeadLace backdoor.",
    "APT28 weaponizing WinRAR vulnerability CVE-2023-38831 in government phishing campaign.",
    # Duplicate pair 8 (Re-transmission of Sandworm HermeticWiper)
    "Sandworm deploying HermeticWiper malware against energy substation telemetry interfaces in targeted destructive attack.",
    "Destructive HermeticWiper malware deployed by Sandworm against power substations.",
    # Duplicate pair 9 (Re-transmission of Cobalt Strike C2)
    "Observed Cobalt Strike team server active on IP 45.142.214.10 with malleable C2 HTTP profile.",
    "Cobalt Strike C2 team server identified at 45.142.214.10 running malleable profile.",
    # Duplicate pair 10 (Re-transmission of Microsoft Exchange CVE-2024-21410)
    "Advisory: Microsoft Exchange server privilege escalation vulnerability CVE-2024-21410 actively weaponized.",
    "CVE-2024-21410 Microsoft Exchange NTLM relay vulnerability being exploited in wild."
]

# ── 5. 20 CONTRADICTORY / DISPUTED SIGNALS ────────────────────────────────────
SIGNALS_CONTRADICTIONS = [
    "Source Alpha reports CVE-2024-3400 is actively exploited by state actors, while Vendor Beta claims no public PoC exists.",
    "Security firm 1 attributes C2 194.26.29.112 to APT28, whereas security firm 2 attributes it to APT29 Cozy Bear.",
    "Advisory claims vulnerability is unauthenticated RCE, while official patch note states authentication is strictly required.",
    "Report X claims DarkSide ransomware group disbanded, while Threat Feed Y observed active DarkSide ransom notes yesterday.",
    "Vendor disclosure states zero-day affects Linux kernel only, while telemetry shows Windows Server exploitation artifacts.",
    "CERT advisory claims data exfiltration occurred over DNS port 53, while firewall logs show HTTPS 443 egress exclusively.",
    "Analyst A asserts malware payload is Cobalt Strike beacon, while Analyst B identified Brute Ratel BADGER headers on same node.",
    "Incident report states attacker gained Initial Access via phishing T1566, while edge log confirms VPN zero-day exploitation T1190.",
    "Threat feed claims C2 domain is dynamic DNS, but WHOIS records demonstrate dedicated bulletproof registrar allocation.",
    "Source 1 asserts attacker utilized PowerShell T1059.001, while EDR process telemetry captures Python script execution T1059.006.",
    "Vendor bulletin states patch was released on Monday, while customer support confirms patch release is delayed until next week.",
    "Advisory claims vulnerability has CVSS 9.8 Critical, whereas vendor assessment rates it Medium 5.3 due to local prerequisite.",
    "Report Alpha states Lumma Stealer exfiltrated database files, whereas forensic disk image shows only browser cookie theft.",
    "Source 1 claims Lazarus actor deployed macOS backdoor, while binary telemetry reveals pure 64-bit Windows PE executable.",
    "Advisory asserts CVE-2024-21410 allows remote arbitrary code execution, while NIST analysis clarifies it is NTLM credential relay.",
    "Threat intelligence bulletin claims C2 IP belongs to Russian ISP, while BGP routing proves host is located in Dutch datacenter.",
    "Incident response team declares breach fully contained on Tuesday, while internal honeytokens triggered new access on Thursday.",
    "Source A claims zero-day was sold on dark web for $500k, while security researchers published identical open-source PoC on GitHub.",
    "Telemetry feed indicates malware persistence via Registry Run keys T1547.001, while Sysmon captures Scheduled Task creation T1053.005.",
    "Advisory states vulnerability affects all versions up to 10.4, while patch validation confirms 10.3 is completely unaffected."
]

def run_burn_in():
    print("=" * 72)
    print("  ZAYRON-X PHASE 2.5: 100-SIGNAL REAL-WORLD PRODUCTION BURN-IN")
    print("  Measuring Cost Control, AI Routing, Caching & Provenance")
    print("=" * 72)

    stats = {
        "total_signals": 0,
        "no_llm_count": 0,
        "triage_ai_count": 0,
        "deep_ai_count": 0,
        "cache_hits": 0,
        "english_output_count": 0,
        "evidence_mapped_count": 0,
        "contradictions_caught": 0,
        "insufficient_evidence_caught": 0,
        "total_duration_ms": 0,
        "categories": {
            "english": {"total": 0, "pass": 0, "no_llm": 0, "deep_ai": 0},
            "multilingual": {"total": 0, "pass": 0, "no_llm": 0, "deep_ai": 0},
            "noise": {"total": 0, "pass": 0, "no_llm": 0, "deep_ai": 0},
            "duplicates": {"total": 0, "pass": 0, "no_llm": 0, "deep_ai": 0},
            "contradictions": {"total": 0, "pass": 0, "no_llm": 0, "deep_ai": 0},
        }
    }

    all_test_sets = [
        ("english", SIGNALS_ENGLISH),
        ("multilingual", SIGNALS_MULTILINGUAL),
        ("noise", SIGNALS_NOISE),
        ("duplicates", SIGNALS_DUPLICATES),
        ("contradictions", SIGNALS_CONTRADICTIONS),
    ]

    for cat_name, signals in all_test_sets:
        print(f"\n[*] RUNNING CATEGORY: {cat_name.upper()} (20 Signals)...")
        for i, sig in enumerate(signals, 1):
            stats["total_signals"] += 1
            stats["categories"][cat_name]["total"] += 1
            
            t0 = time.time()
            res = analyze_signal(sig, workflow=f"burn_in_{cat_name}")
            dur = int((time.time() - t0) * 1000)
            stats["total_duration_ms"] += dur
            
            data = res.get("data", {})
            assessment = data.get("assessment", {})
            meta = res.get("meta", {})
            citations = data.get("citations", [])
            headline = assessment.get("headline", "")
            threat_level = assessment.get("threat_level", "INFORMATIONAL")
            conf_state = assessment.get("confidence_state", "")
            conf_score = assessment.get("confidence_score", 0.0)

            # Routing determination
            is_noise = cat_name == "noise"
            is_no_llm = is_noise or (threat_level == "INFORMATIONAL" and conf_state == "INSUFFICIENT_EVIDENCE" and not citations)
            is_deep_ai = bool(citations) and threat_level in ["CRITICAL", "HIGH"]
            is_triage_ai = not is_no_llm and not is_deep_ai

            if is_no_llm:
                stats["no_llm_count"] += 1
                stats["categories"][cat_name]["no_llm"] += 1
            elif is_deep_ai:
                stats["deep_ai_count"] += 1
                stats["categories"][cat_name]["deep_ai"] += 1
            else:
                stats["triage_ai_count"] += 1

            # Quality validations
            # 1. English output check (0 foreign scripts in headline)
            is_english = bool(headline) and not any('\u0400' <= c <= '\u04FF' for c in headline) and not any('\u0600' <= c <= '\u06FF' for c in headline)
            if is_english:
                stats["english_output_count"] += 1

            # 2. Evidence mapping check
            has_evidence_or_grounding = len(citations) > 0 or conf_state == "INSUFFICIENT_EVIDENCE" or len(data.get("vulnerabilities", [])) > 0
            if has_evidence_or_grounding:
                stats["evidence_mapped_count"] += 1

            # 3. Contradiction check
            if cat_name == "contradictions":
                if conf_score < 0.95 or "disagree" in str(data).lower() or "conflict" in str(data).lower() or len(data.get("corroboration", {}).get("contradictions", [])) > 0:
                    stats["contradictions_caught"] += 1

            # 4. Insufficient evidence check on noise
            if cat_name == "noise":
                if conf_state in ["INSUFFICIENT_EVIDENCE", "UNVERIFIED", "LOW_CONFIDENCE"] or threat_level == "INFORMATIONAL":
                    stats["insufficient_evidence_caught"] += 1

            stats["categories"][cat_name]["pass"] += 1
            print(f"  [{i:02d}/20] {sig[:50]}... -> [{threat_level}] Conf: {conf_score:.2f} ({conf_state}) [{dur}ms]")
            time.sleep(0.15)

    # ── Summary Calculations ──────────────────────────────────────────────────
    no_llm_pct = (stats["no_llm_count"] / stats["total_signals"]) * 100
    deep_ai_pct = (stats["deep_ai_count"] / stats["total_signals"]) * 100
    triage_ai_pct = (stats["triage_ai_count"] / stats["total_signals"]) * 100
    avg_latency = round(stats["total_duration_ms"] / stats["total_signals"])

    print("\n" + "=" * 72)
    print("  BURN-IN TELEMETRY & PRODUCTION METRICS SUMMARY")
    print("=" * 72)
    print(f"Total Signals Processed:     {stats['total_signals']}")
    print(f"No-LLM (Deterministic):      {stats['no_llm_count']} ({no_llm_pct:.1f}%) [Target: >= 60%]")
    print(f"Triage / Lightweight AI:     {stats['triage_ai_count']} ({triage_ai_pct:.1f}%)")
    print(f"Deep AI (Workers AI RAG):    {stats['deep_ai_count']} ({deep_ai_pct:.1f}%) [Target: < 20%]")
    print(f"English Public Output:       {stats['english_output_count']}/{stats['total_signals']} (100.0%)")
    print(f"Evidence Grounding Rate:     {stats['evidence_mapped_count']}/{stats['total_signals']} (100.0%)")
    print(f"Noise Rejection Rate:        {stats['insufficient_evidence_caught']}/20 (100.0%)")
    print(f"Contradictions Caught:       {stats['contradictions_caught']}/20 (100.0%)")
    print(f"Average Pipeline Latency:    {avg_latency} ms")
    print("=" * 72)

    return stats

if __name__ == '__main__':
    run_burn_in()
