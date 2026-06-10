import os
import urllib.request
import urllib.parse
import json

SUPABASE_URL = "https://xdfndojvqazffcjngglr.supabase.co"
# Load service key from root .env file
env_vars = {}
with open(".env", "r") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip()

SUPABASE_SERVICE_KEY = env_vars.get("SUPABASE_SERVICE_ROLE_KEY") or env_vars.get("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# Test 1: Insert WITH fbr_score
payload_with_fbr = [{
    "cve_id": "CVE-2026-99999",
    "title": "Test CVE with FBR",
    "description": "Test description",
    "severity": "High",
    "cvss_score": 8.5,
    "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    "affected_product": "Test Product",
    "vendor": "Test Vendor",
    "status": "Active",
    "fbr_score": 100000.0,
    "fbr_risk_tier": "High",
    "fbr_loss_frequency": "Monthly"
}]

url = f"{SUPABASE_URL}/rest/v1/cves?on_conflict=cve_id"

req = urllib.request.Request(url, data=json.dumps(payload_with_fbr).encode("utf-8"), headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as resp:
        print("Insert with FBR status:", resp.status)
except Exception as e:
    if hasattr(e, "read"):
        print("Insert with FBR failed:", e.code, e.read().decode())
    else:
        print("Insert with FBR failed:", e)

# Test 2: Insert WITHOUT fbr_score
payload_without_fbr = [{
    "cve_id": "CVE-2026-99999",
    "title": "Test CVE without FBR",
    "description": "Test description",
    "severity": "High",
    "cvss_score": 8.5,
    "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    "affected_product": "Test Product",
    "vendor": "Test Vendor",
    "status": "Active"
}]

req = urllib.request.Request(url, data=json.dumps(payload_without_fbr).encode("utf-8"), headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as resp:
        print("Insert without FBR status:", resp.status)
except Exception as e:
    if hasattr(e, "read"):
        print("Insert without FBR failed:", e.code, e.read().decode())
    else:
        print("Insert without FBR failed:", e)
