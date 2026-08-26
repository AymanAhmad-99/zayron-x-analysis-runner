import urllib.request
import urllib.error
import sys

sys.stdout.reconfigure(encoding='utf-8')

TEST_URLS = [
    # Core Feeds
    ("Threat Feed", "https://zayron-x.co/threats", 200),
    ("Intelligence Feed", "https://zayron-x.co/intelligence", 200),
    ("Vulnerability Index", "https://zayron-x.co/vulnerabilities", 200),
    ("Actor Index", "https://zayron-x.co/actors", 200),
    ("Malware Index", "https://zayron-x.co/malware", 200),
    ("IOC Index", "https://zayron-x.co/iocs", 200),
    ("Campaigns Index", "https://zayron-x.co/campaigns", 200),
    ("Reports Index", "https://zayron-x.co/reports", 200),
    ("Global Search", "https://zayron-x.co/search?q=APT29", 200),

    # Dynamic Entities (Real D1 Records)
    ("Vulnerability Dossier (CVE-2026-1453)", "https://zayron-x.co/vulnerabilities/CVE-2026-1453", 200),
    ("Vulnerability Dossier (CVE-2026-69836)", "https://zayron-x.co/vulnerabilities/CVE-2026-69836", 200),
    ("Actor Dossier (APT29)", "https://zayron-x.co/actors/apt29", 200),
    ("Actor Dossier (DarkSide)", "https://zayron-x.co/actors/darkside", 200),
    ("Malware Dossier (Cobalt Strike)", "https://zayron-x.co/malware/cobalt-strike", 200),
    ("Malware Dossier (ShadowPad)", "https://zayron-x.co/malware/shadowpad", 200),
    ("IOC Dossier (194.26.29.112)", "https://zayron-x.co/iocs/194.26.29.112", 200),

    # Truthful 404 Tests (Unknown IDs)
    ("Vulnerability 404 (CVE-DOES-NOT-EXIST)", "https://zayron-x.co/vulnerabilities/CVE-DOES-NOT-EXIST", 404),
    ("Actor 404 (does-not-exist)", "https://zayron-x.co/actors/does-not-exist", 404),
    ("Malware 404 (does-not-exist)", "https://zayron-x.co/malware/does-not-exist", 404),
    ("IOC 404 (999.999.999.999)", "https://zayron-x.co/iocs/999.999.999.999", 404),
    ("Campaign 404 (does-not-exist)", "https://zayron-x.co/campaigns/does-not-exist", 404),
    ("Report 404 (does-not-exist)", "https://zayron-x.co/reports/does-not-exist", 404),
]

def run_tests():
    print("=" * 70)
    print("  ZAYRON-X PRODUCTION INTEGRATION AUDIT — PHASE A/B")
    print("=" * 70)
    
    passed = 0
    failed = 0

    for name, url, expected_status in TEST_URLS:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                status = resp.getcode()
                body = resp.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            status = e.code
            body = e.read().decode('utf-8')
        except Exception as e:
            status = 0
            body = str(e)

        if status == expected_status:
            passed += 1
            print(f"[PASS] {name:42} | HTTP {status} (Expected {expected_status}) | {url}")
        else:
            failed += 1
            print(f"[FAIL] {name:42} | HTTP {status} (Expected {expected_status}) | {url}")

    print("=" * 70)
    print(f"Total: {len(TEST_URLS)} | Passed: {passed} | Failed: {failed}")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
