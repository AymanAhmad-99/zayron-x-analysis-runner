"""
workers/persistence.py — Supabase Persistence & Vercel ISR Revalidation

Handles:
  1. Claiming pending feeds from raw_feeds with FOR UPDATE SKIP LOCKED
     semantics (via Supabase REST API atomic status transition)
  2. Persisting final ExecutiveSITREPs to the articles table via
     the validated ArticleInsert model
  3. Triggering Vercel ISR revalidation to bust static cache
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import re
import sys
import time
from datetime import datetime, timezone
from typing import Any

import aiohttp

# Ensure shared package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.models import ArticleInsert
from shared.models.fbr_calculator import FBRCalculator
from workers.config import (
    CTI_AUTHORS,
    REVALIDATION_SECRET,
    REVALIDATION_URL,
    SUPABASE_SERVICE_KEY,
    SUPABASE_URL,
)
from workers.contracts.inter_agent import ExecutiveSITREP

log = logging.getLogger("zayron_x_persistence")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def utc_now_iso() -> str:
    """ISO 8601 timestamp for published_at display ordering."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def compute_url_hash(content: str) -> str:
    """SHA-256 hash for deduplication."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def estimate_read_time(text: str) -> int:
    """Estimate read time in minutes (200 wpm baseline)."""
    return max(1, round(len(text.split()) / 200))


def generate_slug(title: str) -> str:
    """Generate a URL-safe slug from an article title."""
    slug = title.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug)
    slug = slug.strip("-")
    return slug[:200]


def pick_author() -> str:
    """Select a random CTI analyst from the pool."""
    return random.choice(CTI_AUTHORS)


# ---------------------------------------------------------------------------
# 1. Feed Claiming (FOR UPDATE SKIP LOCKED semantics)
# ---------------------------------------------------------------------------


async def claim_pending_feeds(
    session: aiohttp.ClientSession,
    limit: int = 3,
    feed_type: str | None = None,
) -> list[dict[str, Any]]:
    """Claim pending feeds by atomically transitioning their status.

    Supabase REST API doesn't support SELECT FOR UPDATE SKIP LOCKED directly,
    so we implement the equivalent pattern:
      1. SELECT pending feeds (ordered by created_at ASC)
      2. Atomically PATCH each to status='processing_crew' (optimistic lock)
      3. Only process feeds that were successfully claimed

    This prevents double-processing when multiple crew instances run.
    """
    # Step 1: Fetch candidates
    select_url = (
        f"{SUPABASE_URL}/rest/v1/raw_feeds"
        f"?status=eq.pending"
    )
    if feed_type:
        if feed_type == "cve":
            select_url += "&source_channel=eq.cveNotify"
        elif feed_type == "darkweb":
            select_url += "&source_channel=like.darkweb_*"
        elif feed_type == "rss":
            select_url += "&source_channel=like.rss_*"
        elif feed_type == "telegram":
            select_url += "&source_channel=not.like.rss_*&source_channel=not.like.darkweb_*&source_channel=not.eq.cveNotify"
        
    select_url += (
        f"&order=created_at.asc"
        f"&limit={limit}"
        f"&select=id,raw_content,source_channel,created_at"
    )
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }

    try:
        async with session.get(
            select_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)
        ) as resp:
            if resp.status != 200:
                log.warning("Failed to fetch pending feeds: HTTP %d", resp.status)
                return []
            candidates = await resp.json()
    except Exception as exc:
        log.error("Error fetching pending feeds: %s", exc)
        return []

    if not candidates:
        return []

    # Step 2: Atomically claim each feed
    claimed: list[dict[str, Any]] = []
    patch_headers = {
        **headers,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    for feed in candidates:
        feed_id = feed.get("id", "")
        claim_url = (
            f"{SUPABASE_URL}/rest/v1/raw_feeds"
            f"?id=eq.{feed_id}"
            f"&status=eq.pending"  # Optimistic lock — only claim if still pending
        )
        try:
            async with session.patch(
                claim_url,
                headers=patch_headers,
                json={"status": "processing_crew"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status in (200, 204):
                    result = await resp.json()
                    if result:
                        claimed.append(result[0] if isinstance(result, list) else feed)
                        log.debug("Claimed feed %s", feed_id)
                    else:
                        log.debug(
                            "Feed %s already claimed by another worker", feed_id
                        )
        except Exception as exc:
            log.warning("Failed to claim feed %s: %s", feed_id, exc)

    log.info("Claimed %d/%d pending feeds", len(claimed), len(candidates))
    return claimed


# ---------------------------------------------------------------------------
# 2. Mark Feed Status (post-processing)
# ---------------------------------------------------------------------------


async def mark_feed_status(
    session: aiohttp.ClientSession,
    feed_id: str,
    status: str,
    analysis: str | None = None,
    translated_title: str | None = None,
    translated_content: str | None = None,
    category: str | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    promoted_at: str | None = None,
) -> bool:
    """Update a raw_feed entry's status after crew processing."""
    url = f"{SUPABASE_URL}/rest/v1/raw_feeds?id=eq.{feed_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    body: dict[str, Any] = {"status": status}
    if analysis:
        body["analysis"] = analysis[:500]
    if translated_title:
        body["translated_title"] = translated_title[:500]
    if translated_content:
        body["translated_content"] = translated_content
    if category:
        body["category"] = category
    if prompt_tokens is not None:
        body["prompt_tokens"] = prompt_tokens
    if completion_tokens is not None:
        body["completion_tokens"] = completion_tokens
    if promoted_at:
        body["promoted_at"] = promoted_at

    try:
        async with session.patch(
            url, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=10)
        ) as resp:
            return resp.status in (200, 204)
    except Exception as exc:
        log.error("Error updating feed %s to status '%s': %s", feed_id, status, exc)
        return False


# ---------------------------------------------------------------------------
# 3. Article Persistence (via ArticleInsert Pydantic validation)
# ---------------------------------------------------------------------------


async def persist_sitrep(
    session: aiohttp.ClientSession,
    sitrep: ExecutiveSITREP,
    source_content: str,
    source_channel: str | None = None,
) -> bool:
    """Persist a validated ExecutiveSITREP to the articles table.

    Validates through the ArticleInsert Pydantic model to ensure strict
    schema compliance before writing.
    """
    try:
        # Determine dynamic image tag for Unsplash query based on content keyword
        content_lower = sitrep.content.lower()
        image_tag = "cybersecurity"
        if "ransomware" in content_lower or "leak" in content_lower:
            image_tag = "ransomware"
        elif "exploit" in content_lower or "zero-day" in content_lower or "cve" in content_lower:
            image_tag = "exploit"
        elif "phishing" in content_lower or "credential" in content_lower:
            image_tag = "phishing"
        elif "database" in content_lower or "sql" in content_lower:
            image_tag = "database"
        elif "malware" in content_lower or "trojan" in content_lower or "backdoor" in content_lower:
            image_tag = "malware"
        elif sitrep.category:
            image_tag = sitrep.category.lower()

        # Serialize indicators of compromise (IoCs) to JSON string
        iocs_json = None
        if sitrep.iocs:
            iocs_json = json.dumps(sitrep.iocs)

        insert = ArticleInsert(
            title=sitrep.title,
            slug=generate_slug(sitrep.title),
            author="ZAYRON-X Intelligence Unit",  # ALWAYS exactly this
            category=sitrep.category,
            content=sitrep.content,
            excerpt=sitrep.executive_summary[:500] if sitrep.executive_summary else "",
            read_time=estimate_read_time(sitrep.content),
            published_at=utc_now_iso(),
            url_hash=compute_url_hash(source_content),
            financial_exposure=sitrep.financial_exposure,
            regulatory_risk=sitrep.regulatory_risk,
            mitigation_impact=sitrep.mitigation_impact,
            yara_rule=sitrep.yara_rule,
            image_tag=image_tag,
            fbr_score=sitrep.fbr_score,
            mitre_ttps=sitrep.mitre_attack_ttps,
            iocs_json=iocs_json,
            source_channel=source_channel,
            cvss_v4_score=sitrep.cvss_v4_score,
            is_public_teaser=sitrep.is_public_teaser,
            teaser_text=sitrep.teaser_text,
        )
        row = insert.to_supabase_dict()
    except Exception as exc:
        log.error("ArticleInsert validation failed: %s", exc)
        return False

    url = f"{SUPABASE_URL}/rest/v1/articles"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    try:
        async with session.post(
            url, headers=headers, json=row, timeout=aiohttp.ClientTimeout(total=15)
        ) as resp:
            if resp.status in (200, 201, 204):
                log.info("Article persisted: %s", sitrep.title[:80])

                # Relational routing bifurcation logic
                if sitrep.category == "vulnerabilities":
                    try:
                        cve_match = re.search(r"CVE-\d{4}-\d{4,}", sitrep.title + " " + sitrep.content, re.IGNORECASE)
                        cve_id = cve_match.group(0).upper() if cve_match else f"CVE-{datetime.now().year}-{abs(hash(sitrep.title)) % 100000:05d}"

                        cve_payload = {
                            "cve_id": cve_id,
                            "title": sitrep.title,
                            "description": sitrep.executive_summary + "\n\n" + sitrep.content,
                            "severity": sitrep.severity,
                            "cvss_score": sitrep.cvss_v4_score or 5.0,
                            "cvss_vector": sitrep.cvss_v4_vector or "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
                            "affected_product": sitrep.affected_sectors[0] if sitrep.affected_sectors else "Unknown",
                            "vendor": "Unknown",
                            "status": "Active",
                            "published_date": utc_now_iso(),
                        }

                        cve_url = f"{SUPABASE_URL}/rest/v1/cves?on_conflict=cve_id"
                        cve_headers = {
                            **headers,
                            "Prefer": "resolution=merge-duplicates"
                        }

                        async with session.post(
                            cve_url, headers=cve_headers, json=cve_payload, timeout=aiohttp.ClientTimeout(total=10)
                        ) as cve_resp:
                            if cve_resp.status in (200, 201, 204):
                                log.info("Relational routing: CVE %s successfully upserted.", cve_id)
                            else:
                                cve_body = await cve_resp.text()
                                log.warning("Relational routing: CVE upsert HTTP %d: %s", cve_resp.status, cve_body[:200])
                    except Exception as cve_exc:
                        log.error("Relational routing: CVE upsert failed: %s", cve_exc)

                elif sitrep.category == "threat_intel":
                    try:
                        sector = sitrep.affected_sectors[0] if sitrep.affected_sectors else "Technology"
                        sector_weight = FBRCalculator.get_sector_weight(sector)
                        geo_factor = FBRCalculator.get_geo_exposure("US")
                        fbr_calc = FBRCalculator.calculate_impact(sitrep.cvss_v4_score or 5.0, sector_weight, geo_factor)
                        fbr_total = fbr_calc["fbr_score_usd"]

                        threat_payload = {
                            "title": sitrep.title,
                            "severity": sitrep.severity.upper(),
                            "cvss_score": sitrep.cvss_v4_score or 5.0,
                            "fbr_total": fbr_total,
                            "sector": sector,
                            "yara_rules": "\n\n".join(sitrep.yara_rules) if isinstance(sitrep.yara_rules, list) else (sitrep.yara_rule or ""),
                            "sigma_rules": "\n\n".join(sitrep.sigma_rules) if isinstance(sitrep.sigma_rules, list) else "",
                            "raw_iocs": json.dumps(sitrep.iocs) if sitrep.iocs else "[]",
                            "unmasked_target_entities": ", ".join(sitrep.affected_sectors) if sitrep.affected_sectors else "Technology",
                            "sitrep_pdf_url": f"https://xdfndojvqazffcjngglr.supabase.co/storage/v1/object/public/sitreps/{generate_slug(sitrep.title)}.pdf",
                            "is_public_teaser": sitrep.is_public_teaser,
                            "teaser_text": sitrep.teaser_text,
                        }

                        threat_url = f"{SUPABASE_URL}/rest/v1/threat_artifacts_secure"
                        async with session.post(
                            threat_url, headers=headers, json=threat_payload, timeout=aiohttp.ClientTimeout(total=10)
                        ) as threat_resp:
                            if threat_resp.status in (200, 201, 204):
                                log.info("Relational routing: Threat Artifact secure record successfully created.")
                            else:
                                threat_body = await threat_resp.text()
                                log.warning("Relational routing: Threat Artifact insert HTTP %d: %s", threat_resp.status, threat_body[:200])
                    except Exception as threat_exc:
                        log.error("Relational routing: Threat Artifact insert failed: %s", threat_exc)

                return True
            else:
                body = await resp.text()
                log.warning(
                    "Article insert HTTP %d: %s", resp.status, body[:200]
                )
                return False
    except Exception as exc:
        log.error("Article insert error: %s", exc)
        return False


# ---------------------------------------------------------------------------
# 4. Vercel ISR Revalidation Trigger
# ---------------------------------------------------------------------------


async def trigger_revalidation(
    session: aiohttp.ClientSession,
    paths: list[str] | None = None,
) -> bool:
    """Trigger Vercel ISR revalidation to bust the static cache.

    Calls POST /api/revalidate with the shared secret and paths to revalidate.
    """
    if not REVALIDATION_SECRET:
        log.debug("No REVALIDATION_SECRET set — skipping ISR revalidation")
        return False

    if paths is None:
        paths = ["/", "/intelligence"]

    payload = {
        "secret": REVALIDATION_SECRET,
        "paths": paths,
    }

    try:
        async with session.post(
            REVALIDATION_URL,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status == 200:
                log.info("ISR revalidation triggered for paths: %s", paths)
                return True
            else:
                body = await resp.text()
                log.warning(
                    "ISR revalidation failed HTTP %d: %s", resp.status, body[:200]
                )
                return False
    except Exception as exc:
        log.debug("ISR revalidation request failed (non-critical): %s", exc)
        return False
