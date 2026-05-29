#!/usr/bin/env python3
"""
workers/ingestors/rss_ingestor.py — RSS Feed Collector

Pulls from BleepingComputer, The Hacker News, Dark Reading RSS feeds
and inserts raw content into the `raw_feeds` table with status='pending'.

This module does NOT perform AI analysis. The omni_crew pipeline
picks up pending feeds from raw_feeds and processes them through
the 5-agent Gemini pipeline.

Extracted from the legacy cti_ingestion_engine.py (lines 170–569).
Only the RSS fetching + Supabase raw_feeds insert logic is kept.
All GPT-4o / DALL-E 3 / direct-to-articles code is removed.

Usage:
    python -m workers.ingestors.rss_ingestor          # run once
    python -m workers.ingestors.rss_ingestor --loop    # continuous polling
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import random
import sys
import time
from dataclasses import dataclass
from typing import Any

import aiohttp
import feedparser

# Ensure shared package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from workers.config import SUPABASE_SERVICE_KEY, SUPABASE_URL

log = logging.getLogger("zayron_x_rss_ingestor")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

POLL_INTERVAL_MINUTES: int = int(os.getenv("RSS_POLL_INTERVAL", "15"))

USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) "
    "Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.5 Safari/605.1.15",
]


# ---------------------------------------------------------------------------
# Feed Sources
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class FeedSource:
    name: str
    url: str
    category: str


FEED_SOURCES: list[FeedSource] = [
    FeedSource(
        name="BleepingComputer",
        url="https://www.bleepingcomputer.com/feed/",
        category="Threat Intelligence",
    ),
    FeedSource(
        name="The Hacker News",
        url="https://feeds.feedburner.com/TheHackersNews",
        category="Threat Intelligence",
    ),
    FeedSource(
        name="Dark Reading",
        url="https://www.darkreading.com/rss/all.xml",
        category="Threat Intelligence",
    ),
]


# ---------------------------------------------------------------------------
# Feed Fetching
# ---------------------------------------------------------------------------

async def fetch_feed(
    session: aiohttp.ClientSession,
    source: FeedSource,
) -> str | None:
    """Fetch a single RSS feed. Returns raw XML or None on failure."""
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
    }
    timeout = aiohttp.ClientTimeout(total=30)

    for attempt in range(1, 4):
        try:
            async with session.get(
                source.url, headers=headers, timeout=timeout,
            ) as resp:
                resp.raise_for_status()
                text = await resp.text()
                log.info(
                    "Fetched %s — HTTP %d (%.1f KB)",
                    source.name, resp.status, len(text) / 1024,
                )
                return text
        except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
            delay = (2 ** attempt) + random.uniform(0, 1)
            log.warning(
                "fetch:%s failed (attempt %d/3): %s — retrying in %.1fs",
                source.name, attempt, exc, delay,
            )
            await asyncio.sleep(delay)

    log.error("fetch:%s failed after 3 attempts", source.name)
    return None


async def fetch_all_feeds(
    session: aiohttp.ClientSession,
) -> list[tuple[FeedSource, str | None]]:
    """Fetch all configured RSS feeds concurrently."""
    tasks = [fetch_feed(session, src) for src in FEED_SOURCES]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    return [(src, text) for src, text in zip(FEED_SOURCES, results)]


# ---------------------------------------------------------------------------
# Feed Parsing
# ---------------------------------------------------------------------------

@dataclass
class RawArticle:
    source_name: str
    source_category: str
    url: str
    title: str
    description: str
    published: str | None


def parse_feed(raw_xml: str, source: FeedSource) -> list[RawArticle]:
    """Parse RSS XML into a list of RawArticle objects."""
    feed = feedparser.parse(raw_xml)
    entries: list[RawArticle] = []

    for entry in feed.entries:
        url = (entry.get("link") or "").strip()
        if not url:
            continue

        title = (entry.get("title") or "").strip()
        desc = (
            entry.get("summary")
            or entry.get("description")
            or entry.get("content", [{}])[0].get("value")
            or ""
        ).strip()

        if not title and not desc:
            continue

        published: str | None = None
        for field_name in ("published", "updated", "created"):
            raw = entry.get(field_name)
            if raw:
                published = str(raw)
                break

        entries.append(RawArticle(
            source_name=source.name,
            source_category=source.category,
            url=url,
            title=title,
            description=desc,
            published=published,
        ))

    log.info("Parsed %d entries from %s", len(entries), source.name)
    return entries


# ---------------------------------------------------------------------------
# Deduplication: check if url_hash already exists in raw_feeds or articles
# ---------------------------------------------------------------------------

def compute_url_hash(url: str) -> str:
    """SHA-256 hash for deduplication."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


async def hash_exists_in_raw_feeds(
    session: aiohttp.ClientSession,
    url_hash: str,
) -> bool:
    """Check if a raw_feed entry with this content hash already exists."""
    url = (
        f"{SUPABASE_URL}/rest/v1/raw_feeds"
        f"?raw_content=like.*{url_hash}*"
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
            url, headers=headers, timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                return len(data) > 0
    except Exception as exc:
        log.debug("Dedup check failed (non-fatal): %s", exc)
    return False


async def hash_exists_in_articles(
    session: aiohttp.ClientSession,
    url_hash: str,
) -> bool:
    """Check if an article with this url_hash already exists."""
    url = (
        f"{SUPABASE_URL}/rest/v1/articles"
        f"?url_hash=eq.{url_hash}"
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
            url, headers=headers, timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                return len(data) > 0
    except Exception as exc:
        log.debug("Dedup check failed (non-fatal): %s", exc)
    return False


# ---------------------------------------------------------------------------
# Insert into raw_feeds (as pending for omni_crew to process)
# ---------------------------------------------------------------------------

async def insert_raw_feed(
    session: aiohttp.ClientSession,
    article: RawArticle,
) -> bool:
    """Insert a single RSS article into raw_feeds with status='pending'."""
    url_hash = compute_url_hash(article.url)

    # Build raw_content that includes both title and description
    raw_content = f"[RSS:{article.source_name}] [HASH:{url_hash}]\n\n"
    raw_content += f"# {article.title}\n\n"
    raw_content += article.description

    payload: dict[str, Any] = {
        "source_channel": f"rss_{article.source_name.lower().replace(' ', '_')}",
        "raw_content": raw_content,
        "original_language": "en",
        "status": "pending",
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
                log.info("Inserted RSS feed: %s", article.title[:60])
                return True
            else:
                body = await resp.text()
                log.warning(
                    "raw_feeds insert HTTP %d: %s", resp.status, body[:200],
                )
                return False
    except Exception as exc:
        log.error("raw_feeds insert error: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Main Cycle
# ---------------------------------------------------------------------------

async def rss_ingestion_cycle() -> dict[str, int]:
    """Run a single RSS ingestion cycle. Returns stats dict."""
    stats = {"fetched": 0, "parsed": 0, "inserted": 0, "skipped_dedup": 0}

    async with aiohttp.ClientSession() as session:
        feed_results = await fetch_all_feeds(session)

        all_articles: list[RawArticle] = []
        for source, raw_xml in feed_results:
            if raw_xml:
                stats["fetched"] += 1
                articles = parse_feed(raw_xml, source)
                all_articles.extend(articles)

        stats["parsed"] = len(all_articles)
        log.info("Parsed %d total RSS entries from %d feeds",
                 stats["parsed"], stats["fetched"])

        for article in all_articles:
            url_hash = compute_url_hash(article.url)

            # Skip if already in articles table (fully processed)
            if await hash_exists_in_articles(session, url_hash):
                stats["skipped_dedup"] += 1
                continue

            if await insert_raw_feed(session, article):
                stats["inserted"] += 1

            # Small delay to avoid hammering Supabase
            await asyncio.sleep(0.3)

    log.info(
        "RSS cycle complete — fetched: %d, parsed: %d, "
        "inserted: %d, skipped (dedup): %d",
        stats["fetched"], stats["parsed"],
        stats["inserted"], stats["skipped_dedup"],
    )
    return stats


async def main_loop() -> None:
    """Run the RSS ingestor in a continuous polling loop."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] [RSS-INGESTOR] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
    )

    log.info("=" * 60)
    log.info("ZAYRON-X RSS Ingestor — Starting")
    log.info("Poll interval: %d minutes", POLL_INTERVAL_MINUTES)
    log.info("Feed sources: %d", len(FEED_SOURCES))
    log.info("=" * 60)

    while True:
        try:
            t0 = time.monotonic()
            await rss_ingestion_cycle()
            elapsed = time.monotonic() - t0
            log.info("Cycle completed in %.1f seconds", elapsed)
        except Exception as exc:
            log.error("RSS cycle crashed (non-fatal): %s", exc, exc_info=True)

        log.info("Sleeping %d minutes...", POLL_INTERVAL_MINUTES)
        await asyncio.sleep(POLL_INTERVAL_MINUTES * 60)


async def main_once() -> None:
    """Run a single RSS cycle and exit."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] [RSS-INGESTOR] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
    )
    await rss_ingestion_cycle()


if __name__ == "__main__":
    if "--loop" in sys.argv:
        asyncio.run(main_loop())
    else:
        asyncio.run(main_once())
