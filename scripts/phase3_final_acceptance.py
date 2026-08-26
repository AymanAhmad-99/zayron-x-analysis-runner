import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://zayron-x-api.aabusabih.workers.dev/api/v1/analyze"
PUBLISH_URL = "https://zayron-x-api.aabusabih.workers.dev/api/v1/publish"

# 100 Controlled Test Signals for Phase 3 Acceptance (Section 34)
TEST_SIGNALS = [
    # 1. 10 ENGLISH SIGNALS
    {"cat": "LANG_EN", "text": "CISA flags active exploitation of CVE-2024-3400 PAN-OS zero-day vulnerability in the wild."},
    {"cat": "LANG_EN", "text": "Threat actor Volt Typhoon deploying living-off-the-land techniques to compromise critical energy grids."},
    {"cat": "LANG_EN", "text": "LockBit 3.0 ransomware variant targeting enterprise virtualization infrastructure with double extortion."},
    {"cat": "LANG_EN", "text": "Ivanti Connect Secure zero-day authentication bypass vulnerability CVE-2023-46805 under active weaponization."},
    {"cat": "LANG_EN", "text": "Observed Lumma Stealer binary communicating with command-and-control server on IP 185.220.101.5."},
    {"cat": "LANG_EN", "text": "Apache ActiveMQ remote code execution vulnerability CVE-2023-46604 targeted by ransomware operators."},
    {"cat": "LANG_EN", "text": "Lazarus Group utilizing trojanized cryptocurrency management applications to deliver macOS backdoors."},
    {"cat": "LANG_EN", "text": "Microsoft Exchange privilege escalation vulnerability CVE-2024-21410 actively exploited via NTLM relay attacks."},
    {"cat": "LANG_EN", "text": "New AsyncRAT campaign using obfuscated PowerShell payloads and dynamic DNS domains for persistence."},
    {"cat": "LANG_EN", "text": "Sandworm APT deploying HermeticWiper malware against electrical distribution substations."},

    # 2. 10 RUSSIAN SIGNALS
    {"cat": "LANG_RU", "text": "Хакерская группировка APT28 использует эксплойт для уязвимости WinRAR CVE-2023-38831 в целевых атаках."},
    {"cat": "LANG_RU", "text": "Обнаружена новая модификация вымогателя LockBit, шифрующая базы данных ESXi серверов."},
    {"cat": "LANG_RU", "text": "Вредоносная кампания Lumma Stealer распространяется через поддельные обновления браузеров."},
    {"cat": "LANG_RU", "text": "Группа Sandworm применяет деструктивный вайпер CaddyWiper против правительственных систем."},
    {"cat": "LANG_RU", "text": "Критическая уязвимость удаленного выполнения кода обнаружена в серверах Microsoft Exchange."},
    {"cat": "LANG_RU", "text": "Операторы шифровальщика BlackCat заявили о взломе крупной телекоммуникационной компании."},
    {"cat": "LANG_RU", "text": "Ботнет Mirai сканирует порты маршрутизаторов для проведения масштабных DDoS-атак."},
    {"cat": "LANG_RU", "text": "Вредоносное ПО RedLine осуществляет кражу сохраненных учетных данных и криптокошельков."},
    {"cat": "LANG_RU", "text": "Зафиксирована активность шпионской группы Turla с использованием скрытых бэкдоров."},
    {"cat": "LANG_RU", "text": "Массовая рассылка фишинговых писем с трояном AgentTesla против промышленных предприятий."},

    # 3. 10 ARABIC SIGNALS
    {"cat": "LANG_AR", "text": "تحذير أمني عاجل: رصد استغلال نشط لثغرة أمنية حرجة في بوابات VPN التابعة لشركة Ivanti."},
    {"cat": "LANG_AR", "text": "مجموعة التهديد المتقدم Lazarus تشن هجمات احتيالية تستهدف المؤسسات المالية والعملات الرقمية."},
    {"cat": "LANG_AR", "text": "اكتشاف برمجية فدية جديدة تستهدف خوادم لينكس وتقوم بتشفير النسخ الاحتياطية تلقائياً."},
    {"cat": "LANG_AR", "text": "رصد خادم تحكم وسيط نشط يستخدم لتوزيع حمولات برمجية Cobalt Strike الخبيثة."},
    {"cat": "LANG_AR", "text": "هجوم فدية يعطل الخدمات الرقمية لعدد من المستشفيات مع تسريب بيانات المرضى."},
    {"cat": "LANG_AR", "text": "حملة تجسس إلكتروني تستهدف القطاع الدبلوماسي باستخدام ملفات PDF مفخخة بثغرة يوم الصفر."},
    {"cat": "LANG_AR", "text": "تسريب بيانات اعتماد دخول آلاف المستخدمين نتيجة هجوم حشو الاعتمادات Credential Stuffing."},
    {"cat": "LANG_AR", "text": "ثغرة أمنية عالية الخطورة في برمجيات جدار الحماية Fortinet تتيح تجاوز آليات المصادقة."},
    {"cat": "LANG_AR", "text": "برمجية خبيثة تقوم بسرقة الجلسات النشطة لمتصفحات الويب وتفريغ الرموز المميزة."},
    {"cat": "LANG_AR", "text": "حملة تصيد احتيالي موسعة تنتحل هوية البنوك المركزية لنشر برمجيات التحكم عن بعد."},

    # 4. 10 PERSIAN SIGNALS
    {"cat": "LANG_FA", "text": "گروه هکری Charming Kitten زیرساخت‌های دولتی را با بدافزارهای اختصاصی هدف قرار داده است."},
    {"cat": "LANG_FA", "text": "شناسایی کارزار فیشینگ هدفمند با استفاده از اکسپلویت آسیب‌پذیری در نرم‌افزارهای مایکروسافت."},
    {"cat": "LANG_FA", "text": "بدافزار جاسوسی جدید اطلاعات اعتباری کاربران و نشست‌های فعال مرورگر را استخراج می‌کند."},
    {"cat": "LANG_FA", "text": "هشدار فوری: آسیب‌پذیری بحرانی در سرویس‌های ابری امکان دسترسی غیرمجاز ریشه را فراهم می‌سازد."},
    {"cat": "LANG_FA", "text": "کشف یک باج‌افزار پیشرفته که فایل‌های سرورهای لینوکس را با الگوریتم ChaCha20 رمزگذاری می‌کند."},
    {"cat": "LANG_FA", "text": "نفوذ سایبری به شرکت‌های مخابراتی با بهره‌گیری از پروتکل‌های ارتباطی پنهان."},
    {"cat": "LANG_FA", "text": "گروه نفوذگر MuddyWater از ابزارهای دسترسی از راه دور برای نفوذ به شبکه‌های سازمانی استفاده می‌کند."},
    {"cat": "LANG_FA", "text": "رصد فعالیت سرور C2 فعال مرتبط با تروجان بانکی در آدرس‌های آی‌پی اروپایی."},
    {"cat": "LANG_FA", "text": "حملات انکار سرویس توزیع‌شده شدید علیه درگاه‌های بانکی با ترافیک بیش از ۵۰۰ گیگابیت."},
    {"cat": "LANG_FA", "text": "انتشار کدهای بهره‌برداری آزمایشی (PoC) برای آسیب‌پذیری اجرای کد از راه دور در اتوماسیون اداری."},

    # 5. 10 FRENCH SIGNALS
    {"cat": "LANG_FR", "text": "Alerte de sécurité ANSSI concernant l'exploitation active de la vulnérabilité critique CVE-2024-3400."},
    {"cat": "LANG_FR", "text": "Le groupe de rançongiciel LockBit revendique l'exfiltration de données d'un groupe industriel européen."},
    {"cat": "LANG_FR", "text": "Détection d'une nouvelle variante du voleur d'informations Lumma Stealer diffusée via des cracks logiciels."},
    {"cat": "LANG_FR", "text": "Campagne d'espionnage sophistiquée attribuée au groupe APT29 ciblant les ministères des affaires étrangères."},
    {"cat": "LANG_FR", "text": "Vulnérabilité critique de dépassement de tampon dans les routeurs d'entreprise permettant l'exécution de code."},
    {"cat": "LANG_FR", "text": "Observation d'un serveur de commande et contrôle Cobalt Strike actif sur l'adresse IP 45.142.214.10."},
    {"cat": "LANG_FR", "text": "Attaque par déni de service distribué massive visant les infrastructures de transport public."},
    {"cat": "LANG_FR", "text": "Rançongiciel Akira exploitant des failles VPN non corrigées pour pénétrer les réseaux municipaux."},
    {"cat": "LANG_FR", "text": "Diffusion massive de chevaux de Troie d'accès à distance AsyncRAT par courriels d'ingénierie sociale."},
    {"cat": "LANG_FR", "text": "Fuite de données affectant des millions d'utilisateurs suite à une compromission de base de données cloud."},

    # 6. 10 CVE SIGNALS
    {"cat": "TYPE_CVE", "text": "Critical zero-day vulnerability CVE-2024-21887 in Ivanti Connect Secure web components allows command injection."},
    {"cat": "TYPE_CVE", "text": "Security advisory for CVE-2023-48788 Fortinet FortiClient EMS SQL injection vulnerability allowing RCE."},
    {"cat": "TYPE_CVE", "text": "Active exploitation of CVE-2023-22527 Atlassian Confluence Data Center template injection vulnerability."},
    {"cat": "TYPE_CVE", "text": "Advisory on CVE-2024-1709 ScreenConnect authentication bypass allowing administrative account creation."},
    {"cat": "TYPE_CVE", "text": "CVE-2023-34362 MOVEit Transfer SQL injection flaw leveraged in massive global data theft campaign."},
    {"cat": "TYPE_CVE", "text": "CISA alert on CVE-2024-21413 Microsoft Outlook remote code execution vulnerability bypassing protected view."},
    {"cat": "TYPE_CVE", "text": "Zero-day vulnerability CVE-2024-0519 in Google Chrome V8 engine exploited in targeted zero-click attacks."},
    {"cat": "TYPE_CVE", "text": "Advisory for CVE-2023-27997 Fortinet FortiOS SSL-VPN heap buffer overflow enabling remote pre-auth RCE."},
    {"cat": "TYPE_CVE", "text": "CVE-2023-20198 Cisco IOS XE web UI privilege escalation vulnerability actively weaponized in wild."},
    {"cat": "TYPE_CVE", "text": "Critical vulnerability CVE-2024-27198 JetBrains TeamCity authentication bypass allowing full server takeover."},

    # 7. 10 MALWARE SIGNALS
    {"cat": "TYPE_MALWARE", "text": "Lumma Stealer infostealer sample exfiltrating browser cookies, crypto wallets, and 2FA desktop session tokens."},
    {"cat": "TYPE_MALWARE", "text": "HermeticWiper destructive payload targeting master boot record (MBR) and NTFS file system structures."},
    {"cat": "TYPE_MALWARE", "text": "AsyncRAT remote access trojan incorporating anti-analysis VM detection and encrypted C2 communication."},
    {"cat": "TYPE_MALWARE", "text": "DarkSide ransomware executing double extortion encryption with salsa20 and RSA-1024 algorithms."},
    {"cat": "TYPE_MALWARE", "text": "Cobalt Strike malleable C2 profile communicating over HTTP port 443 with randomized jitter."},
    {"cat": "TYPE_MALWARE", "text": "QakBot banking trojan resurgence utilizing malicious MSI installer packages for initial execution."},
    {"cat": "TYPE_MALWARE", "text": "RedLine Stealer variant leveraging disguised Telegram desktop setup files to compromise endpoints."},
    {"cat": "TYPE_MALWARE", "text": "AgentTesla keylogger harvesting enterprise email credentials and transmitting via SMTP protocol."},
    {"cat": "TYPE_MALWARE", "text": "BlackCat (ALPHV) Rust-based ransomware incorporating configurable privilege escalation and domain discovery."},
    {"cat": "TYPE_MALWARE", "text": "Mimikatz post-exploitation utility executing LSASS memory dumping for Kerberos ticket extraction."},

    # 8. 10 ACTOR SIGNALS
    {"cat": "TYPE_ACTOR", "text": "Threat actor Volt Typhoon (Bronze Silhouette) targeting operational technology and SCADA networks."},
    {"cat": "TYPE_ACTOR", "text": "APT29 (Cozy Bear / Midnight Blizzard) conducting identity-based token forgery and OAuth application abuse."},
    {"cat": "TYPE_ACTOR", "text": "Lazarus Group (HIDDEN COBRA) launching spear-phishing campaigns against cryptocurrency protocol developers."},
    {"cat": "TYPE_ACTOR", "text": "Sandworm (APT44 / Unit 74455) executing wiper deployments against electrical transmission infrastructure."},
    {"cat": "TYPE_ACTOR", "text": "Charming Kitten (APT35 / Mint Sandstorm) targeting human rights organizations with customized backdoors."},
    {"cat": "TYPE_ACTOR", "text": "LockBit operational cartel deploying affiliate-driven multi-extortion campaigns across manufacturing."},
    {"cat": "TYPE_ACTOR", "text": "Fancy Bear (APT28 / Strontium) targeting European government bodies with NTLM credential-harvesting exploits."},
    {"cat": "TYPE_ACTOR", "text": "Salt Typhoon executing persistent long-term counter-intelligence intrusions within telecommunications carriers."},
    {"cat": "TYPE_ACTOR", "text": "MuddyWater (Mango Sandstorm) deploying remote management tools (Atera, SimpleHelp) for unauthorized access."},
    {"cat": "TYPE_ACTOR", "text": "DarkSide cybercriminal syndicate conducting targeted intrusion campaigns against critical pipeline networks."},

    # 9. 10 IOC SIGNALS
    {"cat": "TYPE_IOC", "text": "Telemetry alert: Observed malicious C2 beaconing to IP 45.142.214.10 on port 443 with Cobalt Strike signature."},
    {"cat": "TYPE_IOC", "text": "Suspicious outbound TLS connection to 194.26.29.112 identified in network perimeter security logs."},
    {"cat": "TYPE_IOC", "text": "Infostealer data exfiltration endpoint identified at 185.220.101.5 over non-standard port 8080."},
    {"cat": "TYPE_IOC", "text": "Malware staging host active at IP 103.145.22.18 delivering second-stage downloader scripts."},
    {"cat": "TYPE_IOC", "text": "DNS query logs reveal rapid flux domain resolution resolving to threat infrastructure IP 198.51.100.23."},
    {"cat": "TYPE_IOC", "text": "Observed brute-force authentication attempts originating from IP cluster 192.0.2.88 against SSH services."},
    {"cat": "TYPE_IOC", "text": "Dynamic DNS staging domain updates pointing to attacker-controlled server IP 203.0.113.145."},
    {"cat": "TYPE_IOC", "text": "Command and control traffic detected connecting to external proxy node 91.240.118.66."},
    {"cat": "TYPE_IOC", "text": "Endpoint telemetry reports reverse shell initiated towards foreign IP 185.196.220.14."},
    {"cat": "TYPE_IOC", "text": "Ransomware negotiation portal hosted on Tor onion service and backed by reverse proxy 45.33.32.156."},

    # 10. 10 CAMPAIGN SIGNALS
    {"cat": "TYPE_CAMPAIGN", "text": "Global phishing campaign weaponizing malicious PDF attachments containing CVE-2023-38831 WinRAR zero-day."},
    {"cat": "TYPE_CAMPAIGN", "text": "Multi-stage supply chain intrusion campaign injecting backdoor code into open-source JavaScript packages."},
    {"cat": "TYPE_CAMPAIGN", "text": "Targeted ransomware campaign against regional hospital networks deploying BlackSuit encryptor."},
    {"cat": "TYPE_CAMPAIGN", "text": "Widespread credential spraying campaign against Microsoft 365 tenants lacking MFA enforcement."},
    {"cat": "TYPE_CAMPAIGN", "text": "Watering hole attack campaign compromising regional aerospace news portals to drop Lumma Stealer."},
    {"cat": "TYPE_CAMPAIGN", "text": "Nation-state cyber espionage campaign targeting critical satellite communications infrastructure."},
    {"cat": "TYPE_CAMPAIGN", "text": "Massive brute-force campaign targeting exposed edge router management consoles across municipal utilities."},
    {"cat": "TYPE_CAMPAIGN", "text": "Cyber extortion campaign exfiltrating unstructured file shares via stolen cloud backup credentials."},
    {"cat": "TYPE_CAMPAIGN", "text": "Malvertising campaign redirecting enterprise users to fake IT support portals hosting AsyncRAT."},
    {"cat": "TYPE_CAMPAIGN", "text": "Spear-phishing campaign impersonating international defense procurement agencies to harvest VPN tokens."}
]

print("=" * 80)
print("  ZAYRON-X PHASE 3: 100-SIGNAL PRODUCTION PUBLISHING ACCEPTANCE SUITE")
print("  Full End-to-End Publishing Pipeline Verification")
print("=" * 80)

metrics = {
    "total": len(TEST_SIGNALS),
    "analyzed": 0,
    "published": 0,
    "held": 0,
    "english_public": 0,
    "evidence_grounded": 0,
    "full_distribution": 0,
    "website_telegram": 0,
    "website_only": 0,
    "total_latency_ms": 0,
    "categories": {}
}

start_suite_time = time.time()

for idx, sig in enumerate(TEST_SIGNALS, 1):
    cat = sig["cat"]
    query = sig["text"]
    t0 = time.time()

    # Step 1: Run AI Analyst
    req = urllib.request.Request(
        API_URL,
        data=json.dumps({"query": query}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronPhase3Suite/3.0'}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            report = data.get('data')
            latency = int((time.time() - t0) * 1000)
            metrics["total_latency_ms"] += latency
            metrics["analyzed"] += 1

            # Step 2: Run Publishing Pipeline
            pub_req = urllib.request.Request(
                PUBLISH_URL,
                data=json.dumps({"report": report, "eventId": f"evt_p3_{idx:03d}"}).encode('utf-8'),
                headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronPhase3Suite/3.0'}
            )
            with urllib.request.urlopen(pub_req, timeout=15) as pub_resp:
                pub_data = json.loads(pub_resp.read().decode('utf-8'))
                pub_result = pub_data.get('publish', {})
                pub_status = pub_result.get('status')
                dist = pub_result.get('distribution', {})
                route = dist.get('route', 'WEBSITE_ONLY')
                priority = dist.get('priority', 'P3')

                if pub_status == 'PUBLISHED':
                    metrics["published"] += 1
                else:
                    metrics["held"] += 1

                if route == 'FULL_DISTRIBUTION':
                    metrics["full_distribution"] += 1
                elif 'TELEGRAM' in route:
                    metrics["website_telegram"] += 1
                else:
                    metrics["website_only"] += 1

                # Check English Public Output
                headline = report.get('assessment', {}).get('headline', '')
                is_english = not any(ord(c) > 1000 for c in headline)
                if is_english:
                    metrics["english_public"] += 1

                # Check Evidence Grounding
                conf = report.get('assessment', {}).get('confidence_score', 0)
                if conf > 0:
                    metrics["evidence_grounded"] += 1

                # Track Category Stats
                if cat not in metrics["categories"]:
                    metrics["categories"][cat] = {"count": 0, "published": 0}
                metrics["categories"][cat]["count"] += 1
                if pub_status == 'PUBLISHED':
                    metrics["categories"][cat]["published"] += 1

                preview = headline[:45]
                print(f"[{idx:03d}/100] [{cat:<12}] -> [{pub_status:<9}] {priority} ({route:<22}) | {latency}ms | {preview}...")

    except Exception as e:
        print(f"[{idx:03d}/100] [{cat:<12}] -> [ERROR    ] Err: {e}")

suite_duration = time.time() - start_suite_time
avg_latency = int(metrics["total_latency_ms"] / max(1, metrics["analyzed"]))

print("\n" + "=" * 80)
print("  PHASE 3: PRODUCTION PUBLISHING SUITE SUMMARY")
print("=" * 80)
print(f"Total Signals Processed:      {metrics['total']}")
print(f"Successfully Analyzed:        {metrics['analyzed']}/{metrics['total']} ({metrics['analyzed']/metrics['total']*100:.1f}%)")
print(f"Articles Published to D1:     {metrics['published']}/{metrics['total']} ({metrics['published']/metrics['total']*100:.1f}%)")
print(f"Quality Gate Held / Internal: {metrics['held']}/{metrics['total']}")
print(f"English Public Output Rate:   {metrics['english_public']}/{metrics['total']} ({metrics['english_public']/metrics['total']*100:.1f}%)")
print(f"Evidence Grounding Rate:      {metrics['evidence_grounded']}/{metrics['total']} ({metrics['evidence_grounded']/metrics['total']*100:.1f}%)")
print(f"FULL_DISTRIBUTION (P0 Alerts):{metrics['full_distribution']}")
print(f"TELEGRAM / X Alerts (P1/P2):  {metrics['website_telegram']}")
print(f"WEBSITE_ONLY Depth (P3/P4):   {metrics['website_only']}")
print(f"Average Pipeline Latency:     {avg_latency} ms")
print(f"Total Suite Execution Time:   {suite_duration:.1f} s")
print("=" * 80)
