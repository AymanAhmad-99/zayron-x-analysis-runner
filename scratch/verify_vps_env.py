import os

env_path = "/opt/zayron-app/.env"
if not os.path.exists(env_path):
    print(f"Error: {env_path} does not exist on the VPS.")
    exit(1)

with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            parts = line.split("=", 1)
            key = parts[0].strip()
            val = parts[1].strip()
            print(f"{key}: length={len(val)}, starts with '{val[:5]}...'")
