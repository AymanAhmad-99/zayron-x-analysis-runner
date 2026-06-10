import os
import requests

# Load env variables from root .env file
env_vars = {}
with open(".env", "r") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip()

supabase_url = env_vars.get("NEXT_PUBLIC_SUPABASE_URL") or env_vars.get("SUPABASE_URL")
supabase_key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY") or env_vars.get("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Accept": "application/json"
}

# Test 1: rss
r = requests.get(f"{supabase_url}/rest/v1/raw_feeds?status=eq.pending&source_channel=like.rss_*&limit=1", headers=headers)
print("RSS Test status:", r.status_code, len(r.json()) if r.status_code == 200 else r.text)

# Test 2: darkweb
r = requests.get(f"{supabase_url}/rest/v1/raw_feeds?status=eq.pending&source_channel=like.darkweb_*&limit=1", headers=headers)
print("Darkweb Test status:", r.status_code, len(r.json()) if r.status_code == 200 else r.text)

# Test 3: cve
r = requests.get(f"{supabase_url}/rest/v1/raw_feeds?status=eq.pending&source_channel=eq.cveNotify&limit=1", headers=headers)
print("CVE Test status:", r.status_code, len(r.json()) if r.status_code == 200 else r.text)

# Test 4: telegram
r = requests.get(f"{supabase_url}/rest/v1/raw_feeds?status=eq.pending&source_channel=not.like.rss_*&source_channel=not.like.darkweb_*&source_channel=not.eq.cveNotify&limit=1", headers=headers)
print("Telegram Test status:", r.status_code, len(r.json()) if r.status_code == 200 else r.text)
