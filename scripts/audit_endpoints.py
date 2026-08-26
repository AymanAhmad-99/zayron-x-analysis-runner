import urllib.request
import urllib.error
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    "https://zayron-x.co",
    "https://zayron-x.co/api/health",
    "https://zayron-x.co/api/v1/health",
    "https://zayron-x.co/api/intelligence",
    "https://zayron-x.co/api/threats",
    "https://zayron-x.co/api/vulnerabilities",
    "https://zayron-x.co/api/actors",
    "https://zayron-x.co/api/malware",
    "https://zayron-x.co/api/iocs",
    "https://zayron-x.co/api/campaigns",
    "https://zayron-x.co/api/reports",
    "https://zayron-x.co/robots.txt",
    "https://zayron-x.co/sitemap.xml",
    "https://zayron-x.co/threats",
    "https://zayron-x.co/intelligence",
    "https://zayron-x.co/vulnerabilities",
    "https://zayron-x.co/actors",
    "https://zayron-x.co/malware",
    "https://zayron-x.co/iocs",
    "https://zayron-x.co/campaigns",
    "https://zayron-x.co/reports",
    "https://zayron-x.co/search",
    "https://zayron-x.co/dashboard",
    "https://zayron-x.co/alerts",
    "https://zayron-x.co/watchlists"
]

print("=== LIVE PROD ENDPOINT AUDIT ===")
for u in urls:
    req = urllib.request.Request(u, headers={"User-Agent": "ZayronAudit/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            body = resp.read()
            print(f"[{resp.status}] {u} (Length: {len(body)})")
            if "api" in u or "robots" in u or "sitemap" in u:
                print(f"   Snippet: {body[:150].decode('utf-8', errors='replace')}")
    except urllib.error.HTTPError as e:
        print(f"[{e.code}] {u} -> HTTPError: {e.reason}")
    except Exception as e:
        print(f"[ERR] {u} -> {e}")
