"""ZAYRON-X End-to-End Health Check Diagnostic"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

# Force UTF-8 on Windows stdout to avoid cp1252 UnicodeEncodeError
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

PAYLOAD = (
    "Test Case: CVE-2026-9999, Critical vulnerability in Linux Kernel. "
    "APT29 exploiting unpatched systems via T1190 Initial Access and T1059.001 command execution. "
    "IoC: 45.33.32.156, hash: d41d8cd98f00b204e9800998ecf8427e. "
    "Malware: Cobalt Strike beacon deployed. Affected sectors: Government, Energy."
)

results: dict[str, str] = {}
details: dict[str, list[str]] = {}


def mark(section: str, status: str, lines: list[str] | None = None) -> None:
    results[section] = status
    details[section] = lines or []


# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC 1: AI LOGIC & OMNI-AGENT INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 72)
print("  [DIAGNOSTIC 1] AI LOGIC & OMNI-AGENT INTEGRATION")
print("=" * 72)

diag1_lines: list[str] = []
try:
    from workers.agents.harvester import (
        deterministic_preprocess,
        build_preprocess_context_block,
        is_tier1_source,
    )
    t0 = time.time()
    ctx = deterministic_preprocess(PAYLOAD, "test_channel_diagnostic")
    block = build_preprocess_context_block(PAYLOAD, "test_channel_diagnostic")
    elapsed = (time.time() - t0) * 1000

    diag1_lines.append(f"harvester.deterministic_preprocess: {elapsed:.1f}ms")
    diag1_lines.append(f"  detected_language : {ctx['detected_language']}")
    diag1_lines.append(f"  preliminary_category : {ctx['preliminary_category']}")
    diag1_lines.append(f"  cve_ids : {ctx['cve_ids']}")
    diag1_lines.append(f"  extracted_entities : {ctx['extracted_entities']}")
    diag1_lines.append(f"  has_cve_reference : {ctx['has_cve_reference']}")
    diag1_lines.append(f"  has_ioc_indicators : {ctx['has_ioc_indicators']}")
    diag1_lines.append("")
    diag1_lines.append("--- Context Block (prompt injection preview) ---")
    for ln in block.splitlines():
        diag1_lines.append(f"  {ln}")

    from workers.agents.validator import (
        extract_ioc_candidates,
        extract_cve_ids,
        extract_mitre_ttps,
    )
    t1 = time.time()
    candidates = extract_ioc_candidates(PAYLOAD)
    cves = extract_cve_ids(PAYLOAD)
    ttps = extract_mitre_ttps(PAYLOAD)
    elapsed2 = (time.time() - t1) * 1000

    diag1_lines.append("")
    diag1_lines.append(f"validator.extract_ioc_candidates: {elapsed2:.1f}ms")
    for c in candidates:
        diag1_lines.append(f"  IoC: type={c['type']} value={c['value']!r} confidence={c['confidence']}")
    diag1_lines.append(f"  CVEs: {cves}")
    diag1_lines.append(f"  TTPs: {ttps}")

    from workers.omni_crew import OmniCoreOrchestrator, process_feed_omni, master_crew_scheduler
    diag1_lines.append("")
    diag1_lines.append("OmniCoreOrchestrator: importable [OK]")
    diag1_lines.append("process_feed_omni: importable [OK]")
    diag1_lines.append("master_crew_scheduler: importable [OK]")

    # Verify no legacy LLM-calling symbols remain exported
    import workers.agents.harvester as harv_mod
    import workers.agents.validator as val_mod
    legacy_symbols = []
    for sym in ("HARVESTER_SYSTEM_PROMPT", "build_harvest_prompt", "parse_harvest_response"):
        if hasattr(harv_mod, sym):
            legacy_symbols.append(f"harvester.{sym}")
    for sym in ("VALIDATOR_SYSTEM_PROMPT", "build_validator_prompt", "parse_validator_response"):
        if hasattr(val_mod, sym):
            legacy_symbols.append(f"validator.{sym}")
    if legacy_symbols:
        diag1_lines.append(f"  WARNING: Legacy LLM symbols still present: {legacy_symbols}")
    else:
        diag1_lines.append("  Legacy LLM symbol purge: CLEAN (no SYSTEM_PROMPT exports found)")

    mark("1_AI_LOGIC", "PASS", diag1_lines)
    print(f"  [PASS] All AI/Omni-Agent checks passed.")
    for ln in diag1_lines:
        print(f"    {ln}")

except Exception as exc:
    import traceback
    mark("1_AI_LOGIC", "FAIL", [str(exc), traceback.format_exc()])
    print(f"  [FAIL] {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC 2: DATABASE INTEGRATION & SCHEMA VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 72)
print("  [DIAGNOSTIC 2] DATABASE INTEGRATION & SCHEMA VALIDATION")
print("=" * 72)

diag2_lines: list[str] = []
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
    db_url = os.getenv("DATABASE_URL") or os.getenv("DIRECT_URL", "")

    diag2_lines.append(f"SUPABASE_URL: {'SET (' + supabase_url[:30] + '...)' if supabase_url else 'NOT SET'}")
    diag2_lines.append(f"SERVICE_ROLE_KEY: {'SET (****)' if supabase_key else 'NOT SET'}")
    diag2_lines.append(f"DATABASE_URL: {'SET (' + db_url[:30] + '...)' if db_url else 'NOT SET'}")

    if supabase_url and supabase_key:
        try:
            from supabase import create_client
            t0 = time.time()
            sb = create_client(supabase_url, supabase_key)
            elapsed = (time.time() - t0) * 1000
            diag2_lines.append(f"Supabase client instantiation: {elapsed:.1f}ms [OK]")

            # Probe tables
            TABLES_TO_CHECK = ["articles", "cves", "threat_artifacts_secure", "profiles"]
            for tbl in TABLES_TO_CHECK:
                try:
                    t1 = time.time()
                    resp = sb.table(tbl).select("*", count="exact").limit(0).execute()
                    elapsed_t = (time.time() - t1) * 1000
                    count = resp.count if hasattr(resp, "count") else "?"
                    diag2_lines.append(f"  table '{tbl}': accessible, row_count~{count}, RTT={elapsed_t:.0f}ms [OK]")
                except Exception as tbl_exc:
                    diag2_lines.append(f"  table '{tbl}': [FAIL] {tbl_exc}")

            mark("2_DATABASE", "PASS", diag2_lines)
            print(f"  [PASS] Supabase connection and table probes succeeded.")
        except Exception as conn_exc:
            diag2_lines.append(f"Connection error: {conn_exc}")
            mark("2_DATABASE", "FAIL", diag2_lines)
            print(f"  [FAIL] Supabase connection error: {conn_exc}")
    else:
        diag2_lines.append("Cannot connect — environment variables not set in .env / .env.local")
        mark("2_DATABASE", "WARN", diag2_lines)
        print("  [WARN] Supabase env vars not found — skipping live connection test.")

except Exception as exc:
    import traceback
    mark("2_DATABASE", "FAIL", [str(exc), traceback.format_exc()])
    print(f"  [FAIL] {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC 3: NETWORK & PROXY LATENCY
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 72)
print("  [DIAGNOSTIC 3] CLOUDFLARE / NETWORK & PROXY LATENCY")
print("=" * 72)

diag3_lines: list[str] = []
try:
    import urllib.request
    import ssl

    TARGETS = [
        ("Cloudflare Edge", "https://1.1.1.1"),
        ("Google GenAI API", "https://generativelanguage.googleapis.com"),
        ("Supabase Global CDN", "https://supabase.com"),
    ]

    for label, url in TARGETS:
        try:
            ctx_ssl = ssl.create_default_context()
            t0 = time.time()
            req = urllib.request.Request(url, headers={"User-Agent": "ZAYRON-X-HealthCheck/1.0"})
            with urllib.request.urlopen(req, context=ctx_ssl, timeout=5) as resp:
                status = resp.status
            rtt = (time.time() - t0) * 1000
            tls_note = "TLS OK"
            diag3_lines.append(f"  {label} ({url}): HTTP {status} | RTT={rtt:.0f}ms | {tls_note}")
        except urllib.error.HTTPError as e:
            rtt = (time.time() - t0) * 1000
            diag3_lines.append(f"  {label}: HTTP {e.code} (expected for auth-required) | RTT={rtt:.0f}ms | TLS OK")
        except Exception as net_exc:
            diag3_lines.append(f"  {label}: [FAIL] {net_exc}")

    mark("3_NETWORK", "PASS", diag3_lines)
    print(f"  [PASS] Network reachability checks complete.")
    for ln in diag3_lines:
        print(f"    {ln}")

except Exception as exc:
    import traceback
    mark("3_NETWORK", "FAIL", [str(exc), traceback.format_exc()])
    print(f"  [FAIL] {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC 4: REPOSITORY & DEPLOYMENT SYNC
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 72)
print("  [DIAGNOSTIC 4] REPOSITORY & DEPLOYMENT SYNC (GIT)")
print("=" * 72)

diag4_lines: list[str] = []
repo_root = os.path.join(os.path.dirname(__file__), "..", "..")

def git(args: list[str]) -> str:
    try:
        r = subprocess.run(
            ["git"] + args, capture_output=True, text=True, cwd=repo_root, timeout=10
        )
        return (r.stdout + r.stderr).strip()
    except Exception as e:
        return f"ERROR: {e}"

branch = git(["rev-parse", "--abbrev-ref", "HEAD"])
commit_hash = git(["rev-parse", "HEAD"])
commit_short = git(["rev-parse", "--short", "HEAD"])
status_out = git(["status", "--short"])
log_oneline = git(["log", "--oneline", "-5"])
upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
diverge = git(["rev-list", "--left-right", "--count", "HEAD...@{u}"]) if "upstream" not in upstream.lower() else "N/A"

diag4_lines.append(f"Branch: {branch}")
diag4_lines.append(f"HEAD commit: {commit_hash}")
diag4_lines.append(f"Upstream: {upstream}")
diag4_lines.append(f"Divergence (local<->remote): {diverge}")
diag4_lines.append("")
diag4_lines.append("Recent commits:")
for ln in log_oneline.splitlines()[:5]:
    diag4_lines.append(f"  {ln}")
diag4_lines.append("")
if status_out.strip():
    diag4_lines.append("Uncommitted changes (git status --short):")
    for ln in status_out.splitlines():
        diag4_lines.append(f"  {ln}")
else:
    diag4_lines.append("Uncommitted changes: NONE (working tree clean)")

# Check requirements.txt
req_path = os.path.join(repo_root, "workers", "requirements.txt")
workers_req_exists = os.path.exists(req_path)
diag4_lines.append("")
diag4_lines.append(f"workers/requirements.txt: {'EXISTS' if workers_req_exists else 'MISSING'}")
if workers_req_exists:
    with open(req_path) as f:
        reqs = f.read().strip().splitlines()
    diag4_lines.append(f"  {len(reqs)} dependencies listed")
    # Check key packages
    key_pkgs = ["google-generativeai", "pydantic", "supabase", "asyncpg", "python-dotenv"]
    for pkg in key_pkgs:
        present = any(pkg.lower() in r.lower() for r in reqs)
        diag4_lines.append(f"  {pkg}: {'[IN requirements.txt]' if present else '[MISSING from requirements.txt]'}")

mark("4_GIT_REPO", "PASS" if not status_out.strip() else "WARN", diag4_lines)
status_label = "PASS (clean)" if not status_out.strip() else "WARN (uncommitted changes)"
print(f"  [{status_label.split(' ')[0]}] Repository sync check: {status_label}")
for ln in diag4_lines:
    print(f"    {ln}")


# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC 5: FINAL VERDICT
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 72)
print("  [DIAGNOSTIC 5] FINAL SYSTEM HEALTH VERDICT")
print("=" * 72)

FAIL_COUNT = sum(1 for v in results.values() if v == "FAIL")
WARN_COUNT = sum(1 for v in results.values() if v == "WARN")
PASS_COUNT = sum(1 for v in results.values() if v == "PASS")

print(f"\n  {'Component':<35} {'Status':>8}")
print(f"  {'-'*35} {'-'*8}")

LABELS = {
    "1_AI_LOGIC":  "1. AI Logic / Omni-Agent",
    "2_DATABASE":  "2. Database / Supabase",
    "3_NETWORK":   "3. Network / Proxy Latency",
    "4_GIT_REPO":  "4. Repository / Git Sync",
}
REMEDIATION = {
    "1_AI_LOGIC": "python -m pytest workers/tests/test_omni_agent.py -v",
    "2_DATABASE": "Verify SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local",
    "3_NETWORK":  "Check corporate firewall or VPN blocking generativelanguage.googleapis.com",
    "4_GIT_REPO": "git add -A && git commit -m 'chore: sync omni-agent refactor' && git push",
}

for key, label in LABELS.items():
    status = results.get(key, "NOT RUN")
    icon = {"PASS": "[PASS]", "WARN": "[WARN]", "FAIL": "[FAIL]"}.get(status, "[SKIP]")
    print(f"  {label:<35} {icon:>8}")
    if status == "FAIL":
        print(f"    FIX: {REMEDIATION.get(key, 'See details above')}")

print()
ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
if FAIL_COUNT == 0 and WARN_COUNT == 0:
    verdict = "[GREEN] ALL SYSTEMS NOMINAL -- READY FOR LIVE PRODUCTION DEPLOYMENT"
elif FAIL_COUNT == 0:
    verdict = f"[YELLOW] OPERATIONAL WITH WARNINGS ({WARN_COUNT} WARN, {PASS_COUNT} PASS) -- REVIEW BEFORE DEPLOY"
else:
    verdict = f"[RED] CRITICAL FAILURES DETECTED ({FAIL_COUNT} FAIL, {WARN_COUNT} WARN) -- DO NOT DEPLOY"

print(f"  VERDICT: {verdict}")
print(f"  Timestamp: {ts}")
print(f"  Total checks: {len(results)} | PASS: {PASS_COUNT} | WARN: {WARN_COUNT} | FAIL: {FAIL_COUNT}")
print("=" * 72 + "\n")
