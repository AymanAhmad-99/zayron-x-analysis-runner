#!/usr/bin/env python3
"""
workers/ingestors/cve_worker.py — ZAYRON-X CVE Intelligence Daemon

Continuous polling daemon that fetches CVEs from the NIST NVD API v2.0
every 15 minutes using tightly-scoped time windows. Enriches each CVE
with a Financial Blast Radius (FBR) score before upserting to Supabase.

Architecture
────────────
  NVD REST API v2.0 (lastModStartDate / lastModEndDate)
       │
       ▼
  CVERecord Pydantic Validation
       │
       ▼
  FBR Enrichment (sector_weight × geo × cvss_base)
       │
       ▼
  Batch Upsert → Supabase `cves` table (ON CONFLICT cve_id)
       │
       ▼
  15-minute sleep → repeat

Environment Variables
─────────────────────
    NVD_API_KEY              Optional (50 req/30s vs 5 unauthenticated)
    SUPABASE_URL             Supabase project URL
    SUPABASE_SERVICE_KEY     Supabase service_role key
    CVE_POLL_INTERVAL        Poll interval in minutes (default: 15)
"""

import json
import logging
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import hashlib
import asyncio
from datetime import datetime, timedelta, timezone

# Ensure shared package is importable from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.models.cve import CVERecord
from shared.models.fbr_calculator import FBRCalculator

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
NVD_BASE_URL: str = "https://services.nvd.nist.gov/rest/json/cves/2.0"
CVE_POLL_INTERVAL: int = int(os.getenv("CVE_POLL_INTERVAL", "15"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ZAYRON-X-CVE] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_cve")

if not SUPABASE_URL:
    log.critical("SUPABASE_URL is not set. Export SUPABASE_URL and retry.")
    sys.exit(1)
if not SUPABASE_SERVICE_KEY:
    log.critical("SUPABASE_SERVICE_KEY is not set. Export SUPABASE_SERVICE_KEY and retry.")
    sys.exit(1)

# ---------------------------------------------------------------------------
# FBR Sector Weights — centralized in shared.models.fbr_calculator
# ---------------------------------------------------------------------------
# All sector weights, geo exposure multipliers, and calculation logic are
# now sourced exclusively from FBRCalculator. Local hardcoded copies are
# forbidden per ZX-SEC-036 architecture invariants.


# ---------------------------------------------------------------------------
# NVD API — Fetch with Moment-by-Moment Time Window
# ---------------------------------------------------------------------------

def fetch_nvd_cves(
    start_date: datetime,
    end_date: datetime,
    api_key: str | None = None,
) -> list[dict]:
    """Fetch CVEs modified between *start_date* and *end_date* from NVD."""

    def fmt(dt: datetime) -> str:
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000")

    params = {
        "lastModStartDate": fmt(start_date),
        "lastModEndDate": fmt(end_date),
        "startIndex": 0,
        "resultsPerPage": 100,
    }

    headers = {"User-Agent": "ZAYRON-X-CVE-Worker/3.0"}
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
            if exc.code in (403, 429):
                log.warning("Rate limited by NVD — cooling down 60s ...")
                time.sleep(60)
                continue
            if exc.code == 503:
                log.warning("NVD service unavailable — cooling down 120s ...")
                time.sleep(120)
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

        # Respect NVD rate limits
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


# ---------------------------------------------------------------------------
# CVE Parser
# ---------------------------------------------------------------------------

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
# FBR Enrichment — Financial Blast Radius Scoring
# ---------------------------------------------------------------------------

def infer_sector_from_product(product: str) -> str:
    """Heuristic sector inference from CVE affected product string."""
    product_lower = product.lower()

    sector_keywords = {
        "Healthcare": ["medical", "health", "hospital", "pharma", "dicom", "hl7", "epic", "cerner"],
        "Financial Services": ["banking", "payment", "swift", "financial", "atm", "pos", "trading"],
        "Energy": ["scada", "ics", "plc", "energy", "power", "grid", "oil", "gas", "siemens"],
        "Government": ["government", "federal", "dod", "military", "nsa", "cisa"],
        "Technology": ["cisco", "microsoft", "google", "apple", "oracle", "sap", "vmware",
                       "fortinet", "palo alto", "juniper", "adobe", "linux", "apache",
                       "nginx", "wordpress", "drupal", "jenkins"],
        "Telecommunications": ["telecom", "5g", "lte", "voip", "sip", "ericsson", "nokia"],
        "Manufacturing": ["manufacturing", "industrial", "automation", "rockwell"],
    }

    for sector, keywords in sector_keywords.items():
        for kw in keywords:
            if kw in product_lower:
                return sector

    return "Technology"  # Default for software CVEs


def compute_fbr_for_cve(
    cvss_score: float,
    product: str,
) -> dict:
    """Compute the Financial Blast Radius score for a CVE using the centralized FBRCalculator."""
    sector = FBRCalculator.infer_sector(product)
    sector_weight = FBRCalculator.get_sector_weight(sector)
    geo_factor = FBRCalculator.get_geo_exposure("US")
    return FBRCalculator.calculate_impact(
        base_cvss=cvss_score,
        sector_weight=sector_weight,
        geo_factor=geo_factor,
    )


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
# Daemon Core
# ---------------------------------------------------------------------------

def insert_raw_feed_sync(cve: dict) -> bool:
    """Insert a raw CVE payload into raw_feeds with status='pending' and category='vulnerabilities'."""
    cve_id = cve.get("cve_id")
    title = cve.get("title") or ""
    description = cve.get("description") or ""
    severity = cve.get("severity") or "Unknown"
    cvss_score = cve.get("cvss_score") or 0.0
    cvss_vector = cve.get("cvss_vector") or ""
    product = cve.get("affected_product") or "Unknown"
    vendor = cve.get("vendor") or "Unknown"

    content_hash = hashlib.sha256(f"{cve_id}".encode("utf-8")).hexdigest()

    raw_content = (
        f"[CVE:{cve_id}] [HASH:{content_hash}]\n\n"
        f"# {title}\n\n"
        f"**CVE ID:** {cve_id}\n"
        f"**Severity:** {severity}\n"
        f"**CVSS Score:** {cvss_score}\n"
        f"**CVSS Vector:** {cvss_vector}\n"
        f"**Product:** {product}\n"
        f"**Vendor:** {vendor}\n\n"
        f"**Description:**\n{description}"
    )

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }

    # Query duplicate using LIKE with content_hash in raw_content
    check_url = f"{SUPABASE_URL}/rest/v1/raw_feeds?raw_content=like.*{content_hash}*&select=id"
    req_check = urllib.request.Request(check_url, headers=headers)
    try:
        with urllib.request.urlopen(req_check, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data:
                log.info("CVE raw feed for %s already exists, skipping.", cve_id)
                return True
    except Exception as e:
        log.error("Failed to check if CVE %s raw feed exists: %s", cve_id, e)

    payload = {
        "source_channel": "cveNotify",
        "raw_content": raw_content,
        "original_language": "en",
        "status": "pending",
        "category": "vulnerabilities"
    }

    url = f"{SUPABASE_URL}/rest/v1/raw_feeds"
    headers["Content-Type"] = "application/json"
    headers["Prefer"] = "return=minimal"

    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201, 204):
                log.info("Queued raw feed for CVE %s", cve_id)
                return True
    except Exception as e:
        log.error("Failed to insert CVE raw feed for %s: %s", cve_id, e)
    return False


def run_cycle(api_key: str | None) -> None:
    """Execute a single CVE ingestion cycle (last N minutes)."""
    now = datetime.now(timezone.utc)
    # Tightly scope to the last polling interval + 2-minute buffer for clock skew
    since = now - timedelta(minutes=CVE_POLL_INTERVAL + 2)

    log.info(
        "Fetching CVEs modified from %s to %s",
        since.isoformat(), now.isoformat(),
    )

    vulns = fetch_nvd_cves(since, now, api_key)
    log.info("Received %d CVE items from NVD.", len(vulns))

    parsed: list[dict] = []
    for v in vulns:
        raw_row = parse_cve(v)
        if raw_row:
            # Validate through Pydantic CVERecord model
            try:
                record = CVERecord(**raw_row)
                row = record.to_insert().to_supabase_dict()

                # ─── FBR Enrichment (centralized engine) ───
                fbr_result = compute_fbr_for_cve(
                    cvss_score=record.cvss_score,
                    product=record.affected_product or "",
                )
                fbr_usd = fbr_result["fbr_score_usd"]
                if fbr_usd > 0:
                    row["fbr_score"] = fbr_usd
                    row["fbr_risk_tier"] = fbr_result["risk_tier"]
                    row["fbr_loss_frequency"] = fbr_result["loss_frequency"]
                    log.debug(
                        "FBR for %s: $%.2f [%s] (CVSS=%.1f, product=%s)",
                        record.cve_id, fbr_usd,
                        fbr_result["risk_tier"],
                        record.cvss_score, record.affected_product,
                    )

                parsed.append(row)
            except Exception as exc:
                log.warning("CVE validation failed for %s: %s",
                            raw_row.get("cve_id", "?"), exc)

    log.info("Parsed %d valid CVE records.", len(parsed))

    if not parsed:
        log.info("No new/modified CVEs in the last %d minutes.", CVE_POLL_INTERVAL)
        return

    # Show severity distribution
    sev_counts: dict[str, int] = {}
    for p in parsed:
        s = p.get("severity", "Unknown")
        sev_counts[s] = sev_counts.get(s, 0) + 1
    log.info("Severity distribution: %s", sev_counts)

    # Show FBR stats
    fbr_values = [p.get("fbr_score", 0) for p in parsed if p.get("fbr_score")]
    if fbr_values:
        log.info(
            "FBR stats: min=$%.0f, max=$%.0f, avg=$%.0f",
            min(fbr_values), max(fbr_values), sum(fbr_values) / len(fbr_values),
        )

    # Strip non-existent database columns for cves table upsert
    db_cves = []
    for r in parsed:
        db_cve = r.copy()
        db_cve.pop("fbr_score", None)
        db_cve.pop("fbr_risk_tier", None)
        db_cve.pop("fbr_loss_frequency", None)
        db_cves.append(db_cve)

    inserted = upsert_cves(db_cves)
    log.info("Done — %d CVEs upserted into Supabase cves table.", inserted)

    # Queue in raw_feeds for AI processing
    for r in parsed:
        insert_raw_feed_sync(r)
    log.info("Done — raw feeds queued for AI processing.")


async def main_async() -> None:
    """Run the CVE Worker as a continuous intelligence daemon."""
    api_key = os.getenv("NVD_API_KEY")

    log.info("=" * 64)
    log.info("  ZAYRON-X CVE Intelligence Daemon v3.0 (Async)")
    log.info("  NVD API Key: %s", "CONFIGURED" if api_key else "NOT SET (rate limited)")
    log.info("  Poll Interval: %d minutes", CVE_POLL_INTERVAL)
    log.info("  FBR Enrichment: ENABLED")
    log.info("=" * 64)

    # First run: fetch last 24 hours for backfill
    log.info("Initial backfill: fetching last 24 hours...")
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)

    try:
        loop = asyncio.get_running_loop()
        vulns = await loop.run_in_executor(None, fetch_nvd_cves, since, now, api_key)
        log.info("Backfill received %d CVE items.", len(vulns))

        parsed: list[dict] = []
        for v in vulns:
            raw_row = parse_cve(v)
            if raw_row:
                try:
                    record = CVERecord(**raw_row)
                    row = record.to_insert().to_supabase_dict()
                    fbr_result = compute_fbr_for_cve(
                        cvss_score=record.cvss_score,
                        product=record.affected_product or "",
                    )
                    fbr_usd = fbr_result["fbr_score_usd"]
                    if fbr_usd > 0:
                        row["fbr_score"] = fbr_usd
                        row["fbr_risk_tier"] = fbr_result["risk_tier"]
                        row["fbr_loss_frequency"] = fbr_result["loss_frequency"]
                    parsed.append(row)
                except Exception as exc:
                    log.warning("CVE validation failed: %s", exc)

        if parsed:
            # Strip non-existent database columns for cves table upsert
            db_cves = []
            for r in parsed:
                db_cve = r.copy()
                db_cve.pop("fbr_score", None)
                db_cve.pop("fbr_risk_tier", None)
                db_cve.pop("fbr_loss_frequency", None)
                db_cves.append(db_cve)

            inserted = await loop.run_in_executor(None, upsert_cves, db_cves)
            log.info("Backfill complete — %d CVEs upserted into cves table.", inserted)

            # Queue raw feeds for AI processing
            for r in parsed:
                await loop.run_in_executor(None, insert_raw_feed_sync, r)
            log.info("Backfill raw feeds queued for AI processing.")
    except Exception as exc:
        log.error("Backfill failed (non-fatal): %s", exc)

    # Continuous polling loop
    cycle = 0
    while True:
        cycle += 1
        log.info("═══ CVE Cycle %d starting ═══", cycle)

        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, run_cycle, api_key)
        except Exception as exc:
            log.error(
                "Cycle %d crashed (non-fatal): %s", cycle, exc, exc_info=True
            )

        log.info("Sleeping %d seconds until next cycle (CVE_POLL_INTERVAL=%d min)...", CVE_POLL_INTERVAL * 60, CVE_POLL_INTERVAL)
        await asyncio.sleep(CVE_POLL_INTERVAL * 60)  # Synchronized: env-driven, not hardcoded


if __name__ == "__main__":
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        log.info("CVE Daemon shutdown.")
