#!/usr/bin/env python3
"""
⚠️  LEGACY — MOVED FROM PROJECT ROOT TO workers/legacy/ ON 2026-06-02

cve_worker.py — ZAYRON-X CVE Intelligence Worker

This file was relocated from the project root as part of the DeepTrace-2027
security audit cleanup.

Fetches latest CVEs from the NIST NVD API and upserts them into the
Supabase `cves` table. Supports CVSS v4.0 extraction when available.

Usage:
    python cve_worker.py
    NVD_API_KEY=your_key python cve_worker.py   # higher rate limit

Environment variables:
    NVD_API_KEY      Optional NVD API key (50 requests / 30s vs 5 unauthenticated)
    SUPABASE_URL     Supabase project URL
    SUPABASE_SERVICE_KEY     Supabase service_role key
"""

import urllib.request
import urllib.error
import urllib.parse
import json
import os
import sys
import time
import logging
from datetime import datetime, timedelta, timezone

# Ensure shared package is importable from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.models.cve import CVERecord

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
NVD_BASE_URL: str = "https://services.nvd.nist.gov/rest/json/cves/2.0"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ZAYRON-X-CVE] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("zayron_x_cve")

if not SUPABASE_URL:
    log.critical("SUPABASE_URL is not set. Export SUPABASE_URL and retry.")
    sys.exit(1)
if not SUPABASE_SERVICE_KEY:
    log.critical("SUPABASE_SERVICE_KEY is not set. Export SUPABASE_SERVICE_KEY and retry.")
    sys.exit(1)


# ---------------------------------------------------------------------------
# NVD API
# ---------------------------------------------------------------------------

def fetch_nvd_cves(
    start_date: datetime,
    end_date: datetime,
    api_key: str | None = None,
) -> list[dict]:
    """Fetch CVEs published between *start_date* and *end_date* from NVD."""

    def fmt(dt: datetime) -> str:
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000")

    params = {
        "pubStartDate": fmt(start_date),
        "pubEndDate": fmt(end_date),
        "startIndex": 0,
        "resultsPerPage": 100,
    }

    headers = {"User-Agent": "ZAYRON-X-CVE-Worker/2.0"}
    if api_key:
        headers["apiKey"] = api_key

    all_vulns: list[dict] = []
    total_results = None

    while True:
        url = NVD_BASE_URL + "?" + urllib.parse.urlencode(params)
        log.info("Fetching NVD page (startIndex=%d) ...", params["startIndex"])

        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            log.error("NVD API HTTP %s: %s", exc.code, exc.reason)
            if exc.code == 403:
                log.warning("Rate limited — sleeping 60s ...")
                time.sleep(60)
                continue
            break
        except Exception as exc:
            log.error("NVD request failed: %s", exc)
            break

        vulns = data.get("vulnerabilities", [])
        total_results = data.get("totalResults", 0)
        all_vulns.extend(vulns)

        log.info("  -> got %d vulns (total: %s)", len(vulns), total_results)

        params["startIndex"] += len(vulns)
        if params["startIndex"] >= (total_results or 0):
            break

        time.sleep(0.6 if api_key else 6.0)

    # Deduplicate by CVE ID
    seen: set[str] = set()
    unique: list[dict] = []
    for v in all_vulns:
        cve_id = v.get("cve", {}).get("id", "")
        if cve_id not in seen:
            seen.add(cve_id)
            unique.append(v)

    return unique


def parse_cve(vuln: dict) -> dict | None:
    """Convert a raw NVD vulnerability object into our cves row schema.
    Supports CVSS v4.0, v3.1, v3.0, and v2.0 metrics."""
    cve = vuln.get("cve")
    if not cve:
        return None

    cve_id = cve.get("id", "")
    if not cve_id:
        return None

    severity = "UNKNOWN"
    cvss_score = 0.0
    cvss_vector = ""

    # Priority: CVSS v4.0 > v3.1 > v3.0 > v2.0
    for metric_key in ("cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        metrics = cve.get("metrics", {}).get(metric_key)
        if metrics and len(metrics) > 0:
            cvss_data = metrics[0].get("cvssData", {})
            cvss_score = float(cvss_data.get("baseScore", 0.0))
            cvss_vector = cvss_data.get("vectorString", "")
            raw_sev = cvss_data.get("baseSeverity", "UNKNOWN").upper()

            if raw_sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                severity = raw_sev.capitalize()
            elif raw_sev == "NONE":
                severity = "Low"
            break

    # Map numeric score when string severity missing
    if severity == "UNKNOWN" and cvss_score > 0:
        if cvss_score >= 9.0:
            severity = "Critical"
        elif cvss_score >= 7.0:
            severity = "High"
        elif cvss_score >= 4.0:
            severity = "Medium"
        else:
            severity = "Low"

    # --- Product ---
    product = extract_product(cve)

    # --- Published date ---
    published_raw = cve.get("published", "")
    published_date = published_raw.replace("Z", "+00:00") if published_raw else None

    # --- Title & description ---
    title = ""
    description = ""
    for desc in cve.get("descriptions", []):
        if desc.get("lang") == "en":
            text = desc.get("value", "")
            if not title:
                title = text[:120]
            description = text
            break

    # --- Vendor ---
    vendor = extract_vendor(cve)

    return {
        "cve_id": cve_id,
        "title": title,
        "description": description,
        "severity": severity,
        "cvss_score": cvss_score,
        "cvss_vector": cvss_vector,
        "affected_product": product,
        "vendor": vendor,
        "status": "Active",
        "published_date": published_date,
    }



def extract_product(cve: dict) -> str:
    """Extract a meaningful product name from CVE CPE data."""
    try:
        nodes = cve.get("configurations", [])
        for node in nodes:
            for match in node.get("nodes", []):
                for cpe_match in match.get("cpeMatch", []):
                    criteria = cpe_match.get("criteria", "")
                    parts = criteria.split(":")
                    if len(parts) >= 5:
                        vendor = parts[3]
                        prod = parts[4]
                        if prod != "*" and prod != vendor:
                            return f"{vendor} {prod}".title()
    except Exception:
        pass

    try:
        for desc in cve.get("descriptions", []):
            if desc.get("lang") == "en":
                text = desc.get("value", "")
                return text.split(". ")[0][:80] or "Unknown"
    except Exception:
        pass

    return "Unknown"


def extract_vendor(cve: dict) -> str:
    """Extract vendor name from CPE data."""
    try:
        nodes = cve.get("configurations", [])
        for node in nodes:
            for match in node.get("nodes", []):
                for cpe_match in match.get("cpeMatch", []):
                    criteria = cpe_match.get("criteria", "")
                    parts = criteria.split(":")
                    if len(parts) >= 4 and parts[3] != "*":
                        return parts[3].title()
    except Exception:
        pass
    return "Unknown"


# ---------------------------------------------------------------------------
# Supabase Upsert
# ---------------------------------------------------------------------------

def upsert_cves(cves: list[dict]) -> int:
    """Upsert the list of CVE rows into Supabase with batch processing.
    Returns count inserted."""
    if not cves:
        log.info("No CVEs to upsert.")
        return 0

    batch_size = 50
    total = 0

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    for i in range(0, len(cves), batch_size):
        batch = cves[i:i + batch_size]
        url = f"{SUPABASE_URL}/rest/v1/cves?on_conflict=cve_id"

        payload = json.dumps(batch).encode("utf-8")
        req = urllib.request.Request(
            url, data=payload, headers=headers, method="POST"
        )

        # Retry logic
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    status = resp.status
                    if status in (200, 201, 204):
                        total += len(batch)
                        log.info(
                            "Upserted batch %d-%d: %d rows (HTTP %d)",
                            i + 1, min(i + batch_size, len(cves)),
                            len(batch), status,
                        )
                        break
                    else:
                        log.warning(
                            "Batch %d-%d returned HTTP %d",
                            i + 1, min(i + batch_size, len(cves)), status,
                        )
                        break
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8")[:300]
                log.error("Supabase upsert HTTP %s: %s", exc.code, body)
                if attempt < max_retries:
                    time.sleep(2 ** attempt)
            except Exception as exc:
                log.error("Supabase upsert error: %s", exc)
                if attempt < max_retries:
                    time.sleep(2 ** attempt)

        time.sleep(0.3)  # Mild throttle between batches

    return total


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    api_key = os.getenv("NVD_API_KEY")

    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)

    log.info(
        "ZAYRON-X CVE Worker — fetching CVEs from %s to %s",
        since.isoformat(), now.isoformat(),
    )

    vulns = fetch_nvd_cves(since, now, api_key)
    log.info("Received %d total CVE items from NVD.", len(vulns))

    parsed: list[dict] = []
    for v in vulns:
        raw_row = parse_cve(v)
        if raw_row:
            # Validate through Pydantic CVERecord model
            try:
                record = CVERecord(**raw_row)
                parsed.append(record.to_insert().to_supabase_dict())
            except Exception as exc:
                log.warning("CVE validation failed for %s: %s",
                            raw_row.get("cve_id", "?"), exc)

    log.info("Parsed %d valid CVE records.", len(parsed))

    if not parsed:
        log.info("No new CVEs in the last 24 hours.")
        return

    # Show severity distribution
    sev_counts: dict[str, int] = {}
    for p in parsed:
        s = p.get("severity", "Unknown")
        sev_counts[s] = sev_counts.get(s, 0) + 1
    log.info("Severity distribution: %s", sev_counts)

    inserted = upsert_cves(parsed)
    log.info("Done — %d CVEs upserted into Supabase.", inserted)


if __name__ == "__main__":
    main()
