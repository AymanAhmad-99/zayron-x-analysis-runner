#!/usr/bin/env python3
"""
workers/ingestors/darkweb_ingestor.py — ZAYRON-X Dark Web Intelligence Daemon

Production-grade continuous intelligence collector that:
  1. Pulls ransomware leak data from Ransomwatch (public GitHub JSON endpoint)
  2. Routes .onion traffic exclusively through the isolated Tor SOCKS5 proxy
  3. Deduplicates via SHA-256 content hashing before Supabase insertion
  4. Writes novel alerts to `raw_feeds` with source_channel='darkweb_ransomwatch'

Architecture
────────────
  Ransomwatch JSON (clearnet fallback)  +  .onion targets (Tor SOCKS5)
       │                                       │
       └───────────┬───────────────────────────┘
                   │
                   ▼
  SHA-256 Deduplication Gate
       │
       ▼
  Supabase raw_feeds (status='pending')
       │
       ▼
  omni_crew.py claims + AI pipeline

Usage
─────
    python -m workers.ingestors.darkweb_ingestor
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import os
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import aiohttp

# Ensure shared package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from workers.config import SUPABASE_SERVICE_KEY, SUPABASE_URL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [DARKWEB-INGESTOR] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_darkweb_ingestor")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

TOR_PROXY: str = os.getenv("TOR_PROXY", "socks5h://tor_proxy:9050")
POLL_INTERVAL_SECONDS: float = float(os.getenv("DARKWEB_POLL_INTERVAL", "600"))
CIRCUIT_ROTATION_THRESHOLD: int = int(os.getenv("CIRCUIT_ROTATION_THRESHOLD", "10"))

# Primary clearnet intelligence source (reliable, maintained)
RANSOMWATCH_URL: str = os.getenv(
    "RANSOMWATCH_URL",
    "https://raw.githubusercontent.com/joshhighet/ransomwatch/main/posts.json",
)

USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
]


@dataclass(frozen=True)
class DarkWebTarget:
    name: str
    url: str
    category: str
    requires_tor: bool = False


# Onion targets — architecture maintained for future expansion.
# These will be resolved via the Tor SOCKS5 proxy only.
ONION_TARGETS: list[DarkWebTarget] = [
    # Add real .onion leak site URLs here when available:
    # DarkWebTarget(
    #     name="LockBit_Leak_Site",
    #     url="http://lockbit3753...onion/api/leaks",
    #     category="Ransomware",
    #     requires_tor=True,
    # ),
]


# ---------------------------------------------------------------------------
# Helper: Poisson Jitter Delays (FIXED — uses math.log correctly)
# ---------------------------------------------------------------------------

async def poisson_delay(lambda_sec: float = 5.0) -> None:
    """Randomized delay following an exponential distribution (Poisson process).

    Inter-arrival time: Δt = -λ × ln(U), where U ~ Uniform(0, 1].
    Clamped to [0.5s, 5λ] to prevent extreme values.
    """
    u = random.uniform(1e-9, 1.0)
    delay = -lambda_sec * math.log(u)
    delay = min(max(delay, 0.5), lambda_sec * 5)
    log.debug("Stealth behavioral pause: %.2fs", delay)
    await asyncio.sleep(delay)


def generate_stealth_headers() -> dict[str, str]:
    """Generates realistic browser headers with dynamic User-Agent rotation."""
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;"
            "q=0.9,image/avif,image/webp,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }


# ---------------------------------------------------------------------------
# Tor Circuit Rotation
# ---------------------------------------------------------------------------

async def rotate_tor_circuit() -> None:
    """Request a new Tor exit node via the Tor ControlPort (SIGNAL NEWNYM)."""
    tor_password = os.getenv("TOR_CONTROL_PASSWORD", "")
    try:
        reader, writer = await asyncio.open_connection("tor_proxy", 9051)
        writer.write(f'AUTHENTICATE "{tor_password}"\r\n'.encode("utf-8"))
        await writer.drain()
        auth_resp = await reader.readline()

        if auth_resp.startswith(b"250"):
            writer.write(b"SIGNAL NEWNYM\r\n")
            await writer.drain()
            signal_resp = await reader.readline()
            if signal_resp.startswith(b"250"):
                log.info("Tor circuit rotated — egress IP changed.")
            else:
                log.warning("NEWNYM rejected: %s", signal_resp.decode().strip())
        else:
            log.warning("Tor auth failed: %s", auth_resp.decode().strip())

        writer.close()
        await writer.wait_closed()
    except Exception as exc:
        log.warning("Tor circuit rotation failed (non-fatal): %s", exc)


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def compute_hash(content: str) -> str:
    """SHA-256 content hash for deduplication."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


async def hash_exists_in_raw_feeds(
    session: aiohttp.ClientSession, content_hash: str
) -> bool:
    """Check if a raw_feed with this content hash already exists."""
    url = (
        f"{SUPABASE_URL}/rest/v1/raw_feeds"
        f"?raw_content=like.*{content_hash}*"
        f"&select=id"
        f"&limit=1"
    )
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }
    try:
        async with session.get(
            url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                return len(data) > 0
    except Exception as exc:
        log.debug("Dedup check failed (non-fatal): %s", exc)
    return False


# ---------------------------------------------------------------------------
# Supabase Persistence
# ---------------------------------------------------------------------------

async def insert_darkweb_feed(
    session: aiohttp.ClientSession,
    source_name: str,
    raw_content: str,
    content_hash: str,
    category: str = "darkweb",
) -> bool:
    """Insert a novel dark web alert into Supabase raw_feeds."""
    formatted = (
        f"[DARKWEB:{source_name}] [HASH:{content_hash}]\n\n"
        f"{raw_content}"
    )

    payload = {
        "source_channel": f"darkweb_{source_name.lower().replace(' ', '_')}",
        "raw_content": formatted,
        "original_language": "en",
        "status": "pending",
        "category": category,
    }

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    try:
        async with session.post(
            f"{SUPABASE_URL}/rest/v1/raw_feeds",
            headers=headers,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            if resp.status in (200, 201, 204):
                log.info("Inserted dark web alert: %s", source_name)
                return True
            else:
                body = await resp.text()
                log.warning(
                    "Supabase insert failed HTTP %d: %s",
                    resp.status,
                    body[:200],
                )
                return False
    except Exception as exc:
        log.error("Failed to persist dark web CTI: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Ransomwatch Feed Parser
# ---------------------------------------------------------------------------

async def fetch_ransomwatch(session: aiohttp.ClientSession) -> list[dict]:
    """Fetch and parse the Ransomwatch posts.json feed."""
    headers = generate_stealth_headers()

    for attempt in range(1, 4):
        try:
            async with session.get(
                RANSOMWATCH_URL,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=45),
            ) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    posts = json.loads(text)
                    if isinstance(posts, list):
                        log.info(
                            "Fetched Ransomwatch — %d leak entries (%.1f KB)",
                            len(posts),
                            len(text) / 1024,
                        )
                        return posts
                    log.warning("Ransomwatch returned non-list JSON")
                    return []
                else:
                    log.warning(
                        "Ransomwatch HTTP %d (attempt %d/3)", resp.status, attempt
                    )
        except Exception as exc:
            log.warning(
                "Ransomwatch fetch failed (attempt %d/3): %s", attempt, exc
            )

        delay = (2**attempt) + random.uniform(0, 1)
        await asyncio.sleep(delay)

    log.error("Ransomwatch failed after 3 attempts")
    return []


def parse_ransomwatch_post(post: dict) -> dict[str, str] | None:
    """Extract structured fields from a single Ransomwatch post.

    Expected fields: group_name, post_title, discovered, description, website.
    """
    group = post.get("group_name", "").strip()
    victim = post.get("post_title", "").strip()
    discovered = post.get("discovered", "")
    description = post.get("description", "")
    website = post.get("website", "")

    if not group or not victim:
        return None

    raw_content = (
        f"# Ransomware Leak Alert — {group}\n\n"
        f"**Threat Actor:** {group}\n"
        f"**Victim:** {victim}\n"
        f"**Discovered:** {discovered}\n"
        f"**Website:** {website}\n\n"
    )
    if description:
        raw_content += f"**Description:** {description}\n"

    return {
        "source_name": f"ransomwatch_{group}",
        "raw_content": raw_content,
        "dedup_key": f"{group}|{victim}|{discovered}",
    }


# ---------------------------------------------------------------------------
# Onion Target Crawler (Tor SOCKS5)
# ---------------------------------------------------------------------------

async def crawl_onion_target(
    session: aiohttp.ClientSession, target: DarkWebTarget
) -> str | None:
    """Crawl a single .onion target through the Tor SOCKS5 proxy."""
    headers = generate_stealth_headers()
    await poisson_delay(lambda_sec=3.0)

    log.info("Crawling onion target: %s (%s)", target.name, target.url)
    try:
        async with session.get(
            target.url,
            headers=headers,
            proxy=TOR_PROXY,
            timeout=aiohttp.ClientTimeout(total=60),
        ) as resp:
            if resp.status == 200:
                return await resp.text()
            else:
                log.warning(
                    "Onion target %s returned HTTP %d", target.name, resp.status
                )
                return None
    except Exception as exc:
        log.warning("Onion target %s failed: %s", target.name, exc)
        return None


# ---------------------------------------------------------------------------
# Ingestion Cycle
# ---------------------------------------------------------------------------

async def ingestion_cycle(session: aiohttp.ClientSession) -> dict[str, int]:
    """Run a full dark web ingestion cycle."""
    stats = {"fetched": 0, "novel": 0, "inserted": 0, "skipped_dedup": 0, "errors": 0}

    # ─── Phase 1: Ransomwatch (clearnet) ───
    posts = await fetch_ransomwatch(session)
    stats["fetched"] += len(posts)

    for post in posts:
        parsed = parse_ransomwatch_post(post)
        if not parsed:
            continue

        content_hash = compute_hash(parsed["dedup_key"])

        if await hash_exists_in_raw_feeds(session, content_hash):
            stats["skipped_dedup"] += 1
            continue

        stats["novel"] += 1
        success = await insert_darkweb_feed(
            session,
            parsed["source_name"],
            parsed["raw_content"],
            content_hash,
            category="darkweb",
        )
        if success:
            stats["inserted"] += 1
        else:
            stats["errors"] += 1

        # Mild rate limit between inserts
        await asyncio.sleep(0.2)

    # ─── Phase 2: Onion targets (Tor SOCKS5) ───
    for target in ONION_TARGETS:
        raw_html = await crawl_onion_target(session, target)
        if not raw_html:
            stats["errors"] += 1
            continue

        stats["fetched"] += 1
        content_hash = compute_hash(raw_html[:2000])

        if await hash_exists_in_raw_feeds(session, content_hash):
            stats["skipped_dedup"] += 1
            continue

        stats["novel"] += 1
        success = await insert_darkweb_feed(
            session, target.name, raw_html[:10000], content_hash, category=target.category
        )
        if success:
            stats["inserted"] += 1
        else:
            stats["errors"] += 1

    return stats


# ---------------------------------------------------------------------------
# Daemon Core Loop
# ---------------------------------------------------------------------------

async def main_loop() -> None:
    """Run the Dark Web ingestor as a continuous polling daemon."""
    log.info("=" * 64)
    log.info("  ZAYRON-X Dark Web Intelligence Daemon")
    log.info("  Ransomwatch URL: %s", RANSOMWATCH_URL)
    log.info("  Tor Proxy: %s", TOR_PROXY)
    log.info("  Onion Targets: %d", len(ONION_TARGETS))
    log.info("  Poll Interval: %.0f seconds", POLL_INTERVAL_SECONDS)
    log.info("=" * 64)

    cycle = 0
    while True:
        cycle += 1
        log.info("═══ Dark Web Cycle %d starting ═══", cycle)

        # Rotate Tor circuit periodically
        if cycle % CIRCUIT_ROTATION_THRESHOLD == 0:
            await rotate_tor_circuit()

        try:
            async with aiohttp.ClientSession() as session:
                t0 = time.monotonic()
                stats = await ingestion_cycle(session)
                elapsed = time.monotonic() - t0

                log.info(
                    "Cycle %d complete in %.1fs — fetched=%d, novel=%d, "
                    "inserted=%d, dedup_skipped=%d, errors=%d",
                    cycle,
                    elapsed,
                    stats["fetched"],
                    stats["novel"],
                    stats["inserted"],
                    stats["skipped_dedup"],
                    stats["errors"],
                )
        except Exception as exc:
            log.error(
                "Cycle %d crashed (non-fatal): %s", cycle, exc, exc_info=True
            )

        log.info("Sleeping %.0f seconds...", POLL_INTERVAL_SECONDS)
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        log.info("Dark Web Ingestor shutdown.")
