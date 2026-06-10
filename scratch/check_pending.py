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

url = f"{supabase_url}/rest/v1/raw_feeds?status=eq.pending"
headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Prefer": "count=exact"
}

try:
    # We only want the count, so we can set limit=0 to return empty list but keep Content-Range header
    r = requests.get(url + "&limit=0", headers=headers)
    print("Content-Range Header:", r.headers.get("Content-Range"))
    print("Response Status:", r.status_code)
except Exception as e:
    print("Error querying Supabase:", e)
