#!/usr/bin/env python3
"""
radar-engine.py — ZAYRON-X Global Telegram Intelligence Radar

Massive parallel intake engine that monitors 60+ Telegram channels, enforces
strict content deduplication, and dispatches categorized intelligence to
Supabase tables (articles, cves, malware, apt, osint, tools).

Architecture
────────────
  Supabase radar_targets table (dynamic sourcing)
       │
       ▼
  Telethon MTProto Client (primary) / HTTP fallback
       │
       ▼
  SHA-256 Content Deduplication (SQLite cache, 72h TTL)
       │
       ▼
  Multi-Channel Cross-Reference — first post wins, rest dropped
       │
       ▼
  Intake Dispatcher → raw_feeds table (pending queue for LLM analysis)

Usage
─────
    export SUPABASE_URL="https://..."
    export SUPABASE_SERVICE_KEY="sb-..."
    export TELEGRAM_API_ID="..."
    export TELEGRAM_API_HASH="..."
    python radar-engine.py

Environment variables
─────────────────────
    SUPABASE_URL          Supabase project URL (required)
    SUPABASE_SERVICE_KEY          Supabase service_role key (required)
    TELEGRAM_API_ID       Telegram API app ID (optional — HTTP fallback if unset)
    TELEGRAM_API_HASH     Telegram API app hash
    TELEGRAM_PHONE        Phone number for MTProto auth
    SCAN_INTERVAL         Minutes between scan cycles (default: 5)
    DEDUP_TTL_HOURS       Hours to retain dedup hashes (default: 72)
    MAX_MESSAGES_PER_CH   Max messages to fetch per channel per cycle (default: 10)
    RADAR_DEBUG           Set to "true" for verbose logging
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import random
import sqlite3
import sys
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

import aiohttp
try:
    from aiohttp_socks import ProxyConnector
    HAS_SOCKS = True
except ImportError:
    HAS_SOCKS = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL:
    print("FATAL: SUPABASE_URL is not set.")
    sys.exit(1)
if not SUPABASE_SERVICE_KEY:
    print("FATAL: SUPABASE_SERVICE_KEY is not set.")
    sys.exit(1)

SCAN_INTERVAL_MINUTES: int = int(os.getenv("SCAN_INTERVAL", "5"))
DEDUP_TTL_HOURS: int = int(os.getenv("DEDUP_TTL_HOURS", "72"))
MAX_MESSAGES_PER_CH: int = int(os.getenv("MAX_MESSAGES_PER_CH", "10"))
TOR_PROXY: str = os.getenv("TOR_PROXY", "socks5://tor_proxy:9150")

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

logging.basicConfig(
    level=logging.DEBUG if os.getenv("RADAR_DEBUG", "").lower() == "true"
         else logging.INFO,
    format="%(asctime)s [%(levelname)s] [RADAR] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_radar")

# ---------------------------------------------------------------------------
# Anti-Duplication Cache (SQLite)
# ---------------------------------------------------------------------------

DEDUP_DB_PATH: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "radar_dedup.db")


class DedupCache:
    """SQLite-backed content deduplication cache with TTL-based expiry.

    Stores SHA-256 hashes of message content. When 5 channels post the same
    CVE or malware news, only the first capture is kept — the rest are
    rejected as duplicates.
    """

    def __init__(self, db_path: str = DEDUP_DB_PATH, ttl_hours: int = DEDUP_TTL_HOURS):
        self.db_path = db_path
        self.ttl_seconds = ttl_hours * 3600
        self._conn: sqlite3.Connection | None = None
        self._lock = threading.RLock()

    @property
    def conn(self) -> sqlite3.Connection:
        with self._lock:
            if self._conn is None:
                try:
                    self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
                    self._conn.execute("PRAGMA journal_mode=WAL")
                    self._conn.execute("PRAGMA synchronous=NORMAL")
                    self._conn.execute(
                        """CREATE TABLE IF NOT EXISTS content_hashes (
                            hash TEXT PRIMARY KEY,
                            source_channel TEXT NOT NULL,
                            ingested_at REAL NOT NULL,
                            expires_at REAL NOT NULL
                        )"""
                    )
                    self._conn.execute(
                        "CREATE INDEX IF NOT EXISTS idx_expires ON content_hashes(expires_at)"
                    )
                    self._conn.commit()
                except Exception as exc:
                    log.critical("Failed to initialize SQLite Dedup Cache: %s", exc)
                    raise
            return self._conn

    def is_duplicate(self, content: str) -> bool:
        """Check if content has already been ingested. Returns True if duplicate."""
        content_hash = self._compute_hash(content)
        now = time.time()

        with self._lock:
            try:
                conn = self.conn
                # Purge expired entries periodically
                conn.execute("DELETE FROM content_hashes WHERE expires_at < ?", (now,))
                conn.commit()

                cursor = conn.execute(
                    "SELECT hash FROM content_hashes WHERE hash = ? AND expires_at > ?",
                    (content_hash, now),
                )
                return cursor.fetchone() is not None
            except Exception as exc:
                log.error("SQLite error during is_duplicate check: %s", exc)
                raise

    def mark_seen(self, content: str, source_channel: str) -> None:
        """Record a content hash as ingested."""
        content_hash = self._compute_hash(content)
        now = time.time()
        expires_at = now + self.ttl_seconds

        with self._lock:
            try:
                conn = self.conn
                conn.execute(
                    "INSERT OR REPLACE INTO content_hashes (hash, source_channel, ingested_at, expires_at) VALUES (?, ?, ?, ?)",
                    (content_hash, source_channel, now, expires_at),
                )
                conn.commit()
            except Exception as exc:
                log.error("SQLite error during mark_seen write: %s", exc)
                raise

    def _compute_hash(self, content: str) -> str:
        """Normalize and hash content for dedup matching."""
        # Normalize: strip whitespace, lowercase, remove common noise
        normalized = " ".join(content.lower().split())
        # Remove URLs (they're often unique even for duplicate content)
        import re
        normalized = re.sub(r'https?://\S+', '', normalized)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def stats(self) -> dict[str, int]:
        """Return cache statistics."""
        now = time.time()
        with self._lock:
            try:
                conn = self.conn
                total = conn.execute("SELECT COUNT(*) FROM content_hashes").fetchone()[0]
                active = conn.execute(
                    "SELECT COUNT(*) FROM content_hashes WHERE expires_at > ?", (now,)
                ).fetchone()[0]
                return {"total_hashes": total, "active_hashes": active}
            except Exception as exc:
                log.error("SQLite error during stats fetching: %s", exc)
                raise

    def close(self) -> None:
        with self._lock:
            if self._conn:
                try:
                    self._conn.close()
                except Exception as exc:
                    log.error("Error closing SQLite connection: %s", exc)
                finally:
                    self._conn = None


# ---------------------------------------------------------------------------
# Supabase Channel Fetcher
# ---------------------------------------------------------------------------

@dataclass
class RadarTarget:
    id: str
    channel_url: str
    category: str
    is_active: bool


async def fetch_radar_targets(session: aiohttp.ClientSession) -> list[RadarTarget]:
    """Fetch active target channels dynamically from Supabase radar_targets table."""
    url = f"{SUPABASE_URL}/rest/v1/radar_targets?is_active=eq.true&select=id,channel_url,category,is_active"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }

    try:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                log.error("Failed to fetch radar_targets: HTTP %d", resp.status)
                return []
            data = await resp.json()
            targets = [
                RadarTarget(
                    id=row["id"],
                    channel_url=row["channel_url"],
                    category=row["category"],
                    is_active=row["is_active"],
                )
                for row in data
            ]
            log.info("Fetched %d active radar targets from Supabase", len(targets))
            return targets
    except Exception as exc:
        log.error("Error fetching radar_targets: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Channel URL Parser
# ---------------------------------------------------------------------------

def parse_channel_identifier(channel_url: str) -> tuple[str, str]:
    """Parse a Telegram channel URL into (type, identifier).

    Returns:
        ('public', 'channelname')  — for t.me/s/channelname or @channelname
        ('invite', 'hash')         — for t.me/+invitehash
        ('raw', url)               — fallback
    """
    parsed = urlparse(channel_url)
    path = parsed.path.strip("/")

    if path.startswith("s/"):
        return ("public", path[2:])
    elif path.startswith("+"):
        return ("invite", path[1:])
    elif path:
        return ("public", path)
    return ("raw", channel_url)


# ---------------------------------------------------------------------------
# HTTP-based Telegram Scraper (public channel fallback)
# ---------------------------------------------------------------------------

USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
]


async def scrape_public_channel(
    session: aiohttp.ClientSession,
    channel_username: str,
    max_messages: int = MAX_MESSAGES_PER_CH,
) -> list[dict[str, Any]]:
    """Scrape messages from a public Telegram channel via its web preview (t.me/s/...).

    This is a lightweight fallback. For production throughput, use MTProto.
    """
    url = f"https://t.me/s/{channel_username}"
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
    }

    messages: list[dict[str, Any]] = []

    try:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as resp:
            if resp.status == 200:
                html = await resp.text()
                messages = _parse_telegram_html(html, channel_username, max_messages)
                log.debug("HTTP scraped %d messages from @%s", len(messages), channel_username)
            else:
                log.warning("HTTP %d for @%s — channel may be private", resp.status, channel_username)
    except asyncio.TimeoutError:
        log.warning("Timeout scraping @%s", channel_username)
    except Exception as exc:
        log.warning("Error scraping @%s: %s", channel_username, exc)

    return messages


def _parse_telegram_html(html: str, channel: str, limit: int) -> list[dict[str, Any]]:
    """Extract message texts from Telegram web preview HTML.

    Uses simple regex-based extraction since the t.me/s/ page embeds messages
    in .tgme_widget_message_text and .tgme_widget_message_bubble divs.
    """
    import re

    messages: list[dict[str, Any]] = []

    # Extract message containers with text and optional timestamp
    pattern = re.compile(
        r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>'
        r'.*?'
        r'<time[^>]*datetime="([^"]*)"',
        re.DOTALL,
    )

    matches = pattern.findall(html)

    # Fallback: also try the bubble pattern
    bubble_pattern = re.compile(
        r'<div class="tgme_widget_message_bubble">(.*?)</div>',
        re.DOTALL,
    )
    if not matches:
        alt_matches = []
        for bubble in bubble_pattern.findall(html):
            text_match = re.search(
                r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>',
                bubble, re.DOTALL,
            )
            time_match = re.search(
                r'<time[^>]*datetime="([^"]*)"',
                bubble,
            )
            if text_match:
                alt_matches.append((text_match.group(1), time_match.group(1) if time_match else ""))
        matches = alt_matches

    for i, match in enumerate(matches):
        if i >= limit:
            break
        raw_text, timestamp = match if isinstance(match, tuple) else (match, "")
        clean = _clean_html(raw_text)
        if len(clean) < 15:
            continue
        messages.append({
            "text": clean,
            "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
            "channel": channel,
        })

    return messages


def _clean_html(html: str) -> str:
    """Strip HTML tags and decode entities from message text."""
    import re
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', html)
    # Decode common HTML entities
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ---------------------------------------------------------------------------
# MTProto-based Telegram Client (Telethon)
# ---------------------------------------------------------------------------

async def init_telethon_client() -> Any | None:
    """Initialize a Telethon client if API credentials are available."""
    api_id = os.getenv("TELEGRAM_API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH")

    if not api_id or not api_hash:
        log.info("Telegram API credentials not set — using HTTP fallback mode")
        return None

    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession

        session_str = os.getenv("TELEGRAM_SESSION_STRING", "")
        client = TelegramClient(
            StringSession(session_str),
            int(api_id),
            api_hash,
            connection_retries=3,
            auto_reconnect=True,
        )

        await client.start(
            phone=os.getenv("TELEGRAM_PHONE") or (lambda: input("Phone: ")),
            password=os.getenv("TELEGRAM_PASSWORD") or (lambda: input("2FA: ")),
            code_callback=os.getenv("TELEGRAM_CODE") or (lambda: input("Code: ")),
        )

        log.info("Telethon client connected — user ID: %s", await client.get_me())
        return client
    except ImportError:
        log.warning("Telethon not installed — pip install telethon — using HTTP fallback")
        return None
    except Exception as exc:
        log.warning("Telethon init failed: %s — using HTTP fallback", exc)
        return None


async def scrape_channel_mtproto(
    client: Any,
    channel_identifier: str,
    max_messages: int = MAX_MESSAGES_PER_CH,
) -> list[dict[str, Any]]:
    """Scrape messages from a Telegram channel using MTProto (Telethon)."""
    messages: list[dict[str, Any]] = []

    try:
        entity = await client.get_entity(channel_identifier)
        result = await client.get_messages(entity, limit=max_messages)

        for msg in result:
            if msg.message and len(msg.message) > 15:
                messages.append({
                    "text": msg.message.strip(),
                    "timestamp": msg.date.isoformat() if msg.date else datetime.now(timezone.utc).isoformat(),
                    "channel": channel_identifier,
                })
    except Exception as exc:
        log.warning("MTProto fetch failed for %s: %s", channel_identifier, exc)

    return messages


# ---------------------------------------------------------------------------
# Content Categorization (lightweight pre-LLM)
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "cve": ["CVE-", "vulnerability", "vuln", "zero-day", "zeroday", "0day", "CVSS",
            "patch", "exploit", "PoC", "proof of concept", "remote code execution",
            "privilege escalation", "buffer overflow", "SQL injection", "XSS"],
    "malware": ["malware", "ransomware", "trojan", "backdoor", "rootkit", "keylogger",
                "stealer", "infostealer", "botnet", "RAT", "remote access trojan",
                "dropper", "loader", "crypter", "wiper", "ransom", "encrypted files"],
    "apt": ["APT", "advanced persistent threat", "nation-state", "state-sponsored",
            "Fancy Bear", "Cozy Bear", "Lazarus", "APT28", "APT29", "APT41",
            "Sandworm", "Volt Typhoon", "Charming Kitten", "TA444", "UNC2452",
            "espionage", "cyber spy", "intelligence gathering"],
    "osint": ["OSINT", "open source intelligence", "leaked database", "data leak",
              "breach", "credential dump", "darknet", "dark web", "telegram leak",
              "dox", "doxing", "social media intelligence"],
    "tools": ["tool", "framework", "scanner", "GitHub", "open source", "pentest",
              "red team", "blue team", "forensics", "reverse engineering",
              "Burp Suite", "Metasploit", "Nmap", "Wireshark", "detection"],
}


def categorize_message(text: str) -> str:
    """Quick keyword-based categorization. Returns the best-matching category."""
    text_lower = text.lower()
    scores: dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[category] = score

    if not scores:
        return "general_intel"

    # Return the category with the highest keyword match count
    return max(scores, key=scores.get)


# ---------------------------------------------------------------------------
# Supabase Dispatcher
# ---------------------------------------------------------------------------

async def insert_raw_feeds(
    session: aiohttp.ClientSession,
    feeds: list[dict[str, Any]],
) -> int:
    """Batch insert raw feed entries into Supabase."""
    if not feeds:
        return 0

    batch_size = 10
    total = 0
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    for i in range(0, len(feeds), batch_size):
        batch = feeds[i:i + batch_size]
        rows = [
            {
                "source_channel": f["channel"],
                "raw_content": f["text"],
                "original_language": f.get("language", "auto"),
                "status": "pending",
                "category": f.get("category"),
                "timestamp": f["timestamp"],
            }
            for f in batch
        ]

        url = f"{SUPABASE_URL}/rest/v1/raw_feeds"

        try:
            async with session.post(
                url, headers=headers, json=rows,
                timeout=aiohttp.ClientTimeout(total=20),
            ) as resp:
                if resp.status in (200, 201, 204):
                    total += len(rows)
                else:
                    body = await resp.text()
                    log.warning("raw_feeds insert HTTP %d: %s", resp.status, body[:200])
        except Exception as exc:
            log.error("raw_feeds insert error: %s", exc)

        await asyncio.sleep(0.2)

    return total


# ---------------------------------------------------------------------------
# Main Radar Cycle
# ---------------------------------------------------------------------------

async def radar_cycle(
    http_session: aiohttp.ClientSession,
    telethon_client: Any | None,
    dedup: DedupCache,
) -> dict[str, Any]:
    """Execute one complete radar scan cycle across all active channels."""
    start = time.monotonic()
    stats: dict[str, Any] = {
        "channels_scanned": 0,
        "messages_fetched": 0,
        "duplicates_rejected": 0,
        "new_feeds_inserted": 0,
        "errors": 0,
    }

    # Step 1: Fetch radar targets dynamically
    targets = await fetch_radar_targets(http_session)
    if not targets:
        log.info("No active radar targets found — check radar_targets table")
        stats["cycle_seconds"] = time.monotonic() - start
        return stats

    stats["channels_scanned"] = len(targets)

    # Rotate Tor circuit
    await rotate_tor_circuit()

    # Step 2: Scrape each channel
    all_messages: list[dict[str, Any]] = []
    semaphore = asyncio.Semaphore(5)  # Max 5 concurrent channel scrapes

    # Configure Tor proxy connector if available
    connector = None
    if TOR_PROXY and HAS_SOCKS:
        log.info("Scraping session configured with Tor proxy: %s", TOR_PROXY)
        connector = ProxyConnector.from_url(TOR_PROXY)
    else:
        log.debug("Scraping session configured without proxy")

    async with aiohttp.ClientSession(
        connector=connector,
        headers={"User-Agent": random.choice(USER_AGENTS)},
        timeout=aiohttp.ClientTimeout(total=30),
    ) as scraping_session:

        async def scrape_one(target: RadarTarget) -> None:
            async with semaphore:
                channel_type, identifier = parse_channel_identifier(target.channel_url)

                if channel_type == "invite":
                    log.debug("Skipping invite link %s (MTProto-only)", target.channel_url)
                    return

                if telethon_client and channel_type == "public":
                    msgs = await scrape_channel_mtproto(telethon_client, identifier)
                else:
                    msgs = await scrape_public_channel(scraping_session, identifier)

                # Attach target metadata
                for m in msgs:
                    m["category"] = target.category
                    m["target_id"] = target.id
                    m["language"] = _detect_language(m.get("text", ""))

                all_messages.extend(msgs)
                stats["messages_fetched"] += len(msgs)

        tasks = [scrape_one(t) for t in targets]
        await asyncio.gather(*tasks, return_exceptions=True)

    log.info(
        "Fetched %d total messages from %d channels",
        stats["messages_fetched"], stats["channels_scanned"],
    )

    # Step 3: Deduplication — first occurrence wins
    unique_feeds: list[dict[str, Any]] = []
    for msg in all_messages:
        text = msg.get("text", "")
        if not text or len(text) < 15:
            continue

        is_dup = await asyncio.to_thread(dedup.is_duplicate, text)
        if is_dup:
            stats["duplicates_rejected"] += 1
            continue

        # Cross-channel categorization refinement
        if msg.get("category") == "general_intel":
            msg["category"] = categorize_message(text)

        await asyncio.to_thread(dedup.mark_seen, text, msg.get("channel", "unknown"))
        unique_feeds.append(msg)

    log.info(
        "Dedup: %d duplicates rejected, %d unique feeds retained",
        stats["duplicates_rejected"], len(unique_feeds),
    )

    # Step 4: Batch insert into Supabase raw_feeds
    if unique_feeds:
        stats["new_feeds_inserted"] = await insert_raw_feeds(http_session, unique_feeds)

    # Step 5: Log dedup cache stats
    cache_stats = await asyncio.to_thread(dedup.stats)
    log.info(
        "Dedup cache: %d active hashes, %d total (TTL: %dh)",
        cache_stats["active_hashes"], cache_stats["total_hashes"], DEDUP_TTL_HOURS,
    )

    stats["cycle_seconds"] = time.monotonic() - start
    return stats


def _detect_language(text: str) -> str:
    """Quick script-based language detection for Cyrillic, Arabic, CJK, Latin."""
    import re
    if not text:
        return "en"

    cyrillic = len(re.findall(r'[Ѐ-ӿ]', text))
    arabic = len(re.findall(r'[؀-ۿ]', text))
    cjk = len(re.findall(r'[一-鿿぀-ゟ゠-ヿ가-힯]', text))

    if cyrillic > len(text) * 0.3:
        return "ru"
    if arabic > len(text) * 0.3:
        return "ar"
    if cjk > len(text) * 0.3:
        return "zh"
    return "en"


# ---------------------------------------------------------------------------
# Daemon Main Loop
# ---------------------------------------------------------------------------

async def main_loop() -> None:
    """Main radar daemon — continuous scanning on a configurable interval."""
    log.info("=" * 60)
    log.info("  ZAYRON-X Global Intelligence Radar")
    log.info("  Scan interval: %d min", SCAN_INTERVAL_MINUTES)
    log.info("  Dedup TTL: %d hours", DEDUP_TTL_HOURS)
    log.info("  Max messages/channel: %d", MAX_MESSAGES_PER_CH)
    log.info("=" * 60)

    dedup = DedupCache(ttl_hours=DEDUP_TTL_HOURS)
    telethon_client = await init_telethon_client()

    cycle = 0
    try:
        async with aiohttp.ClientSession(
            headers={"User-Agent": random.choice(USER_AGENTS)},
            timeout=aiohttp.ClientTimeout(total=30),
        ) as http_session:

            while True:
                cycle += 1
                log.info("=== Radar cycle %d starting ===", cycle)

                try:
                    stats = await radar_cycle(http_session, telethon_client, dedup)
                except Exception as exc:
                    log.critical("Radar cycle %d crashed: %s", cycle, exc)
                    stats = {"errors": 1}

                log.info(
                    "Cycle %d complete | channels=%d | fetched=%d | "
                    "dupes=%d | inserted=%d | %.1fs",
                    cycle,
                    stats.get("channels_scanned", 0),
                    stats.get("messages_fetched", 0),
                    stats.get("duplicates_rejected", 0),
                    stats.get("new_feeds_inserted", 0),
                    stats.get("cycle_seconds", 0),
                )

                log.info("Sleeping %d min ...", SCAN_INTERVAL_MINUTES)
                await asyncio.sleep(SCAN_INTERVAL_MINUTES * 60)

    finally:
        if telethon_client:
            await telethon_client.disconnect()
        dedup.close()
        log.info("Radar engine shut down.")


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

def main() -> None:
    if "--once" in sys.argv:
        async def _once() -> None:
            dedup = DedupCache(ttl_hours=DEDUP_TTL_HOURS)
            telethon_client = await init_telethon_client()
            async with aiohttp.ClientSession(
                headers={"User-Agent": random.choice(USER_AGENTS)},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as http_session:
                stats = await radar_cycle(http_session, telethon_client, dedup)
                print(json.dumps(stats, indent=2, default=str))
            if telethon_client:
                await telethon_client.disconnect()
            dedup.close()
        asyncio.run(_once())
    else:
        asyncio.run(main_loop())


if __name__ == "__main__":
    main()
