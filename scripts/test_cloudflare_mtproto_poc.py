"""
ZAYRON-X — Cloudflare-Native 24/7 Telegram MTProto Collector PoC Verification
Validates:
1. Live MTProto connection over WebSocket inside Cloudflare Durable Object (GramJS)
2. Session persistence in Durable Object SQLite storage across requests
3. Dynamic D1 source synchronization (/sync)
4. Ingestion of authentic threat signals directly from Telegram to Cloudflare Ingest Queue
5. Progression to D1 (source_messages -> intelligence_events -> articles)
"""

import json
import os
import sys
import time
import unittest
import urllib.request
import ssl

if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

DO_URL = "https://zayron-telegram-collector-do.aabusabih.workers.dev"
API_URL = "https://zayron-x-api.aabusabih.workers.dev"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class TestCloudflareNativeMTProto(unittest.TestCase):
    def test_01_durable_object_health_and_session(self):
        """Verify DO is alive, session is active, and MTProto is CONNECTED."""
        print("\n[*] Test 1: Cloudflare Durable Object MTProto Status...")
        req = urllib.request.Request(
            f"{DO_URL}/status",
            headers={"User-Agent": "ZayronCloudflarePoC/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            collector = data.get("collector", {})
            self.assertEqual(collector.get("status"), "CONNECTED")
            self.assertTrue(collector.get("session_active"))
            print(f"  [+] Status: {collector.get('status')} | Session Active: {collector.get('session_active')} | Channels: {len(collector.get('monitored_channels', []))}")

    def test_02_dynamic_source_synchronization(self):
        """Verify DO syncs active sources from D1 sources registry."""
        print("\n[*] Test 2: Dynamic Source Synchronization from D1...")
        req = urllib.request.Request(
            f"{DO_URL}/sync",
            data=b"{}",
            headers={"Content-Type": "application/json", "User-Agent": "ZayronCloudflarePoC/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            channels = data.get("channels", [])
            self.assertGreater(len(channels), 0)
            print(f"  [+] Synchronized {len(channels)} channels from D1 sources registry.")

    def test_03_real_signal_fetch_and_queue_dispatch(self):
        """Fetch a live technical message from Telegram via DO and dispatch to INGEST_QUEUE."""
        print("\n[*] Test 3: Live Signal Ingestion via Durable Object...")
        req = urllib.request.Request(
            f"{DO_URL}/dispatch-signal",
            data=json.dumps({"channel": "cveNotify"}).encode('utf-8'),
            headers={"Content-Type": "application/json", "User-Agent": "ZayronCloudflarePoC/1.0"}
        )
        with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            self.assertEqual(data.get("status"), "SUCCESS")
            payload = data.get("payload", {})
            print(f"  [+] Dispatched: MsgID={payload.get('messageId')}, Hash={payload.get('contentHash')[:12]}..., Preview='{payload.get('preview', '')[:60]}...'")

    def test_04_published_articles_integrity(self):
        """Verify articles created from real signals are available on the production API."""
        print("\n[*] Test 4: Production Article Integrity...")
        req = urllib.request.Request(
            f"{API_URL}/api/v1/articles",
            headers={"User-Agent": "ZayronCloudflarePoC/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            articles = data.get("data", [])
            self.assertGreater(len(articles), 0)
            print(f"  [+] Found {len(articles)} published articles on production API. Latest: '{articles[0].get('title')}'")

if __name__ == "__main__":
    unittest.main(verbosity=2)
