"""
ZAYRON-X — Autonomous 24/7 Telegram CTI Collector Daemon
Production-grade MTProto ingestion engine with persistent session storage,
local durable SQLite message buffer, bounded webhook retries, dynamic source registry,
FloodWait supervisor, healthcheck HTTP server, and heartbeat telemetry.
"""

import asyncio
import hashlib
import json
import logging
import os
import random
import signal
import sqlite3
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

import aiohttp
from aiohttp import web
from telethon import TelegramClient, events
from telethon.errors import FloodWaitError, RPCError
from telethon.sessions import StringSession

# Configuration
DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "data", "telegram"))
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "queue.db")
SESSION_FILE = os.getenv("TELEGRAM_SESSION_FILE", os.path.join(DATA_DIR, "zayron_collector.session"))
FALLBACK_SESSION_TXT = os.path.join(os.path.dirname(__file__), "..", "..", "scripts", ".tg_session.txt")

API_ID = int(os.getenv("TELEGRAM_API_ID", "37585861"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "e38c7289b2050a99557bcc0d1813cfac")
SESSION_STRING = os.getenv("TELEGRAM_SESSION_STRING", "")

WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://zayron-x-api.aabusabih.workers.dev/api/v1/webhook/telegram")
HEARTBEAT_URL = os.getenv("HEARTBEAT_URL", "https://zayron-x-api.aabusabih.workers.dev/api/v1/admin/collector-heartbeat")
SOURCES_URL = os.getenv("SOURCES_URL", "https://zayron-x-api.aabusabih.workers.dev/api/v1/sources")
PORT = int(os.getenv("PORT", "8080"))

# Default Authoritative CTI Channels (Pools A-E)
DEFAULT_CHANNELS = [
    "cveNotify",
    "PentestingNews",
    "blueteamalerts",
    "aptreports",
    "xakep_ru",
    "thehackernews",
    "vxunderground",
    "seclabnews",
    "anti_malware",
    "iran_cyber",
]

# Structured Logger
class StructuredJsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "source": "ZayronTelegramCollector",
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }
        if hasattr(record, "extra_data"):
            log_record.update(record.extra_data)
        return json.dumps(log_record)

logger = logging.getLogger("ZayronCollector")
logger.setLevel(logging.INFO)
log_handler = logging.StreamHandler(sys.stdout)
log_handler.setFormatter(StructuredJsonFormatter())
logger.addHandler(log_handler)
logger.propagate = False


class LocalDurableQueue:
    """Atomic SQLite buffer ensuring zero message loss during network/Cloudflare outages."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pending_messages (
                    id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    channel_title TEXT,
                    channel_username TEXT,
                    channel_id INTEGER,
                    message_id INTEGER NOT NULL,
                    raw_text TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    author TEXT,
                    content_hash TEXT NOT NULL,
                    attempts INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'PENDING',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_attempt_at TIMESTAMP
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_status_attempts ON pending_messages(status, attempts);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON pending_messages(content_hash);")
            conn.commit()

    def enqueue(self, source_id: str, channel_title: str, channel_username: Optional[str],
                channel_id: int, message_id: int, raw_text: str, timestamp: int,
                author: Optional[str], content_hash: str) -> bool:
        msg_uuid = f"msg_{channel_id}_{message_id}"
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM pending_messages WHERE id = ? OR content_hash = ? LIMIT 1", (msg_uuid, content_hash))
                if cursor.fetchone():
                    return False  # Already in buffer
                
                cursor.execute("""
                    INSERT INTO pending_messages (
                        id, source_id, channel_title, channel_username, channel_id,
                        message_id, raw_text, timestamp, author, content_hash, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
                """, (msg_uuid, source_id, channel_title, channel_username, channel_id,
                      message_id, raw_text, timestamp, author, content_hash))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to enqueue message {msg_uuid}: {e}")
            return False

    def get_pending(self, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM pending_messages 
                    WHERE status = 'PENDING' AND attempts < 3 
                    ORDER BY timestamp ASC LIMIT ?
                """, (limit,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to fetch pending queue: {e}")
            return []

    def mark_dispatched(self, msg_id: str):
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("DELETE FROM pending_messages WHERE id = ?", (msg_id,))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to mark dispatched {msg_id}: {e}")

    def record_failure(self, msg_id: str, error_msg: str):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT attempts FROM pending_messages WHERE id = ?", (msg_id,))
                row = cursor.fetchone()
                if row:
                    attempts = row[0] + 1
                    status = 'DEAD_LETTER' if attempts >= 3 else 'PENDING'
                    cursor.execute("""
                        UPDATE pending_messages 
                        SET attempts = ?, status = ?, last_attempt_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    """, (attempts, status, msg_id))
                    conn.commit()
        except Exception as e:
            logger.error(f"Failed to record failure for {msg_id}: {e}")

    def get_stats(self) -> Dict[str, int]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT count(*) FROM pending_messages WHERE status = 'PENDING'")
                pending = cursor.fetchone()[0]
                cursor.execute("SELECT count(*) FROM pending_messages WHERE status = 'DEAD_LETTER'")
                dead_letter = cursor.fetchone()[0]
                return {"pending_queue_size": pending, "dead_letter_count": dead_letter}
        except Exception:
            return {"pending_queue_size": 0, "dead_letter_count": 0}


class AutonomousCollector:
    def __init__(self):
        self.queue = LocalDurableQueue(DB_PATH)
        self.client: Optional[TelegramClient] = None
        self.http_session: Optional[aiohttp.ClientSession] = None
        self.status = "DISCONNECTED"
        self.start_time = time.time()
        self.messages_received = 0
        self.messages_dispatched = 0
        self.duplicates_dropped = 0
        self.errors_count = 0
        self.flood_wait_seconds_remaining = 0
        self.reconnect_attempts = 0
        self.last_received_at: Optional[str] = None
        self.last_success_at: Optional[str] = None
        self.last_error_message: Optional[str] = None
        self.monitored_channels: List[str] = list(DEFAULT_CHANNELS)
        self.is_running = True
        self.known_hashes: Set[str] = set()

    def get_session(self) -> Any:
        """Determines the best available session source."""
        if SESSION_STRING:
            return StringSession(SESSION_STRING)
        
        if os.path.exists(FALLBACK_SESSION_TXT):
            with open(FALLBACK_SESSION_TXT, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    return StringSession(content)
        
        return SESSION_FILE

    async def sync_sources(self):
        """Fetches active sources dynamically from the API."""
        if not self.http_session:
            return
        try:
            headers = {"User-Agent": "ZayronAutonomousCollector/2.0"}
            async with self.http_session.get(SOURCES_URL, headers=headers, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    sources = data.get("sources", [])
                    new_channels = []
                    for s in sources:
                        url = s.get("url", "")
                        display = s.get("display_name", "")
                        if "t.me/" in url:
                            uname = url.split("t.me/")[-1].split("/")[0].replace("@", "")
                            if uname and uname not in new_channels:
                                new_channels.append(uname)
                        elif display.startswith("@"):
                            uname = display.replace("@", "")
                            if uname and uname not in new_channels:
                                new_channels.append(uname)

                    if new_channels:
                        self.monitored_channels = new_channels
                        logger.info(f"Synchronized {len(new_channels)} active sources from registry.")
        except Exception as e:
            logger.warning(f"Source registry sync error (using local channel list): {e}")

    async def drain_queue_worker(self):
        """Asynchronously drains the local durable buffer to the Cloudflare webhook."""
        logger.info("Local durable buffer drain worker started.")
        while self.is_running:
            pending = self.queue.get_pending(limit=10)
            if not pending:
                await asyncio.sleep(1.5)
                continue

            for item in pending:
                if not self.is_running:
                    break

                payload = {
                    "update_id": int(f"99{item['message_id']}"),
                    "channel_post": {
                        "message_id": item['message_id'],
                        "date": item['timestamp'],
                        "chat": {
                            "id": item['channel_id'],
                            "title": item['channel_title'],
                            "username": item['channel_username'],
                            "type": "channel"
                        },
                        "text": item['raw_text'],
                        "author_signature": item['author']
                    }
                }

                success = False
                try:
                    headers = {
                        "Content-Type": "application/json",
                        "User-Agent": "ZayronAutonomousCollector/2.0"
                    }
                    async with self.http_session.post(WEBHOOK_URL, json=payload, headers=headers, timeout=15) as resp:
                        if resp.status in (200, 202):
                            self.queue.mark_dispatched(item['id'])
                            self.messages_dispatched += 1
                            self.last_success_at = datetime.now(timezone.utc).isoformat()
                            success = True
                            logger.info(f"Dispatched message {item['id']} from {item['channel_title']}")
                        else:
                            text = await resp.text()
                            err_msg = f"HTTP {resp.status}: {text[:100]}"
                            self.queue.record_failure(item['id'], err_msg)
                            self.errors_count += 1
                            self.last_error_message = err_msg
                            logger.warning(f"Webhook delivery failed for {item['id']}: {err_msg}")
                except Exception as e:
                    err_msg = str(e)
                    self.queue.record_failure(item['id'], err_msg)
                    self.errors_count += 1
                    self.last_error_message = err_msg
                    logger.error(f"Webhook dispatch exception for {item['id']}: {err_msg}")

                await asyncio.sleep(0.2)

    async def heartbeat_worker(self):
        """Dispatches operational telemetry to Cloudflare every 30-60 seconds."""
        logger.info("Heartbeat telemetry dispatcher started.")
        while self.is_running:
            try:
                stats = self.queue.get_stats()
                telemetry = {
                    "status": self.status,
                    "session_active": self.status == "CONNECTED",
                    "messages_received": self.messages_received,
                    "messages_dispatched": self.messages_dispatched,
                    "duplicates_dropped": self.duplicates_dropped,
                    "errors_count": self.errors_count,
                    "flood_wait_seconds_remaining": self.flood_wait_seconds_remaining,
                    "reconnect_attempts": self.reconnect_attempts,
                    "last_received_at": self.last_received_at,
                    "last_success_at": self.last_success_at,
                    "last_error_message": self.last_error_message,
                    "uptime_seconds": int(time.time() - self.start_time),
                    "monitored_channels": self.monitored_channels[:20],
                    "pending_queue_size": stats["pending_queue_size"],
                    "dead_letter_count": stats["dead_letter_count"],
                }

                if self.http_session:
                    headers = {
                        "Content-Type": "application/json",
                        "User-Agent": "ZayronAutonomousCollector/2.0"
                    }
                    async with self.http_session.post(HEARTBEAT_URL, json=telemetry, headers=headers, timeout=8) as resp:
                        if resp.status == 200:
                            logger.debug("Heartbeat synchronized successfully.")
            except Exception as e:
                logger.debug(f"Heartbeat dispatch failed (non-fatal): {e}")

            await asyncio.sleep(30)

    async def handle_new_message(self, event):
        """Processes incoming Telegram MTProto event and buffers to durable queue."""
        try:
            msg = event.message
            text = msg.text or msg.message or ""
            if not text or len(text.strip()) < 10:
                return

            self.messages_received += 1
            self.last_received_at = datetime.now(timezone.utc).isoformat()

            chat = await event.get_chat()
            channel_title = getattr(chat, 'title', 'Telegram Channel')
            channel_username = getattr(chat, 'username', None)
            channel_id = chat.id
            message_id = msg.id
            timestamp = int(msg.date.timestamp()) if msg.date else int(time.time())
            author = getattr(msg, 'post_author', None)

            # Compute content hash for deduplication
            content_hash = hashlib.sha256(text.strip().encode('utf-8')).hexdigest()
            if content_hash in self.known_hashes:
                self.duplicates_dropped += 1
                return

            self.known_hashes.add(content_hash)
            if len(self.known_hashes) > 10000:
                self.known_hashes.pop()

            source_id = f"tg_{channel_username}" if channel_username else f"tg_{abs(channel_id)}"

            # Enqueue into local SQLite durable buffer
            enqueued = self.queue.enqueue(
                source_id=source_id,
                channel_title=channel_title,
                channel_username=channel_username,
                channel_id=channel_id,
                message_id=message_id,
                raw_text=text,
                timestamp=timestamp,
                author=author,
                content_hash=content_hash,
            )

            if enqueued:
                logger.info(f"Buffered signal from {channel_title} (@{channel_username or channel_id}) [Msg ID: {message_id}]")
            else:
                self.duplicates_dropped += 1

        except Exception as e:
            self.errors_count += 1
            self.last_error_message = str(e)
            logger.error(f"Event handler error: {e}")

    async def start_telegram_listener(self):
        """Runs the supervised MTProto listener loop with exponential backoff & FloodWait protection."""
        session = self.get_session()
        self.client = TelegramClient(session, API_ID, API_HASH)

        backoff = 1
        max_backoff = 60

        while self.is_running:
            try:
                self.status = "RECONNECTING" if self.reconnect_attempts > 0 else "CONNECTING"
                logger.info("Connecting to Telegram MTProto...")
                await self.client.connect()

                if not await self.client.is_user_authorized():
                    self.status = "DISCONNECTED"
                    self.last_error_message = "Telegram session is not authorized. Please authenticate."
                    logger.error("Telegram session is not authorized!")
                    await asyncio.sleep(10)
                    continue

                self.status = "CONNECTED"
                self.reconnect_attempts = 0
                backoff = 1
                logger.info(f"[CONNECTED] MTProto client listening on {len(self.monitored_channels)} channels.")

                # Register event handler
                self.client.add_event_handler(self.handle_new_message, events.NewMessage)

                # Keep-alive loop
                while self.is_running and self.client.is_connected():
                    await asyncio.sleep(5)

            except FloodWaitError as e:
                self.status = "FLOOD_WAIT"
                self.flood_wait_seconds_remaining = e.seconds
                jitter = random.uniform(1.0, 5.0)
                wait_time = e.seconds + jitter
                logger.warning(f"Telegram FloodWait encountered: sleeping for {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
                self.flood_wait_seconds_remaining = 0

            except (ConnectionError, RPCError, OSError, Exception) as e:
                self.status = "RECONNECTING"
                self.reconnect_attempts += 1
                self.errors_count += 1
                self.last_error_message = str(e)
                logger.error(f"Connection lost: {e}. Reconnecting in {backoff}s (Attempt #{self.reconnect_attempts})...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)

    async def handle_health_route(self, request):
        """HTTP Healthcheck route for container probes and monitoring."""
        stats = self.queue.get_stats()
        health = {
            "status": self.status,
            "session_active": self.status == "CONNECTED",
            "uptime_seconds": int(time.time() - self.start_time),
            "messages_received": self.messages_received,
            "messages_dispatched": self.messages_dispatched,
            "duplicates_dropped": self.duplicates_dropped,
            "errors_count": self.errors_count,
            "flood_wait_seconds_remaining": self.flood_wait_seconds_remaining,
            "reconnect_attempts": self.reconnect_attempts,
            "last_received_at": self.last_received_at,
            "last_success_at": self.last_success_at,
            "last_error_message": self.last_error_message,
            "pending_queue_size": stats["pending_queue_size"],
            "dead_letter_count": stats["dead_letter_count"],
            "monitored_channels": self.monitored_channels,
        }
        status_code = 200 if self.status in ("CONNECTED", "CONNECTING", "RECONNECTING", "FLOOD_WAIT") else 503
        return web.json_response(health, status=status_code)

    async def start_http_server(self):
        """Starts embedded HTTP server for container healthchecks."""
        app = web.Application()
        app.router.add_get("/health", self.handle_health_route)
        app.router.add_get("/", self.handle_health_route)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", PORT)
        await site.start()
        logger.info(f"Healthcheck HTTP server running on port {PORT}")

    async def run(self):
        """Master runner orchestrating all collector subsystems."""
        self.http_session = aiohttp.ClientSession()

        # Start HTTP Health Server
        await self.start_http_server()

        # Initial source sync
        await self.sync_sources()

        # Spawn background tasks
        drain_task = asyncio.create_task(self.drain_queue_worker())
        heartbeat_task = asyncio.create_task(self.heartbeat_worker())
        listener_task = asyncio.create_task(self.start_telegram_listener())

        try:
            await asyncio.gather(drain_task, heartbeat_task, listener_task)
        except asyncio.CancelledError:
            logger.info("Collector tasks cancelled. Shutting down gracefully...")
        finally:
            self.is_running = False
            if self.client and self.client.is_connected():
                await self.client.disconnect()
            if self.http_session:
                await self.http_session.close()
            logger.info("Collector shutdown complete.")


if __name__ == "__main__":
    collector = AutonomousCollector()

    def shutdown_handler(sig, frame):
        logger.info(f"Received signal {sig}. Stopping collector...")
        collector.is_running = False

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    asyncio.run(collector.run())
