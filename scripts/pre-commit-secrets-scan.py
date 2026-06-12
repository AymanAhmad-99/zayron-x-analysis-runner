#!/usr/bin/env python3
import sys
import subprocess
import re

# Regular expression patterns for common secrets
SECRET_PATTERNS = {
    "Supabase Service Role Key / JWT": re.compile(r"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+"),
    "Sentry Authentication Token": re.compile(r"sntrys_[A-Za-z0-9+/=_-]+"),
    "Supabase Access Token": re.compile(r"sbp_[a-f0-9]{40}"),
    "PostgreSQL Connection String": re.compile(r"postgres(?:ql)?://[^:\s]+:[^@\s]+@[a-zA-Z0-9_.-]+:[0-9]+/?[a-zA-Z0-9_.-]*"),
    "Redis Connection String": re.compile(r"redis://[^:\s]+:[^@\s]+@[a-zA-Z0-9_.-]+:[0-9]+/?[a-zA-Z0-9_.-]*"),
    "Resend API Key": re.compile(r"re_[a-zA-Z0-9]{8}_[a-zA-Z0-9]{24}")
}

# Patterns to ignore (e.g. dummy placeholder values used in configuration templates)
IGNORE_PATTERNS = [
    re.compile(r"YOUR_[A-Z_]+_HERE"),
    re.compile(r"mock_"),
    re.compile(r"dummy_"),
    re.compile(r"placeholder")
]

def is_placeholder(val):
    return any(pat.search(val) for pat in IGNORE_PATTERNS)

def scan_staged_files():
    print("[ZAYRON-X] Running pre-commit secrets scan...")
    
    # Get list of staged files
    try:
        files_output = subprocess.check_output(
            ["git", "diff", "--cached", "--name-only"], 
            text=True
        ).strip()
    except subprocess.CalledProcessError as e:
        print(f"Error checking staged files: {e}")
        return 1
        
    if not files_output:
        print("No staged changes to scan.")
        return 0

    staged_files = files_output.split("\n")
    failed = False

    for file_path in staged_files:
        # Skip binary files or non-code files
        if not file_path.endswith((".ts", ".tsx", ".js", ".jsx", ".py", ".sql", ".toml", ".yml", ".yaml", ".json", ".env", ".example")):
            continue
            
        try:
            # Get only the added lines in the staged diff (excluding context)
            diff_lines = subprocess.check_output(
                ["git", "diff", "--cached", "-U0", file_path],
                text=True
            ).split("\n")
        except subprocess.CalledProcessError:
            # File might be deleted or untracked
            continue

        for line in diff_lines:
            # Only analyze lines starting with '+' (added lines), excluding '+++' headers
            if line.startswith("+") and not line.startswith("+++"):
                content = line[1:].strip()
                
                # Check for secrets
                for name, pattern in SECRET_PATTERNS.items():
                    matches = pattern.findall(content)
                    for match in matches:
                        if not is_placeholder(match):
                            # Mask secret for display
                            masked = match[:8] + "..." + match[-8:] if len(match) > 16 else "********"
                            print(f"\n[LEAK DETECTED] in file: \033[1;31m{file_path}\033[0m")
                            print(f"   Category: \033[1;33m{name}\033[0m")
                            print(f"   Staged Line: {content.replace(match, f'\033[1;41m{masked}\033[0m')}")
                            print("   Action: Remove the secret before committing!")
                            failed = True

    if failed:
        print("\nCommit BLOCKED. Plaintext secrets detected in staged files.")
        return 1
        
    print("Secrets scan complete. No plaintext credentials found in staged changes.")
    return 0

if __name__ == "__main__":
    sys.exit(scan_staged_files())
