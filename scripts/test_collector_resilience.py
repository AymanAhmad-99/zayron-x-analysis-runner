"""
ZAYRON-X — Autonomous Telegram Collector Resilience & Integrity Test Suite
Validates:
1. Local SQLite durable buffer (enqueue, dedup, bounded retries, dead-lettering)
2. Webhook delivery failure recovery & offline protection
3. Heartbeat dispatch & /api/v1/admin/collector-health live synchronization
4. Dynamic source synchronization from D1 registry
"""

import os
import sys
import time
import json
import sqlite3
import urllib.request
import tempfile
import unittest
import gc

if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "workers", "ingestors"))
from autonomous_collector import LocalDurableQueue

class TestCollectorResilience(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_queue.db")
        self.queue = LocalDurableQueue(self.db_path)

    def tearDown(self):
        self.queue = None
        gc.collect()
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def test_01_enqueue_and_deduplication(self):
        """Test atomic enqueue and idempotency rejection."""
        print("\n[*] Test 1: Local SQLite Durable Queue Enqueue & Dedup...")
        
        # Enqueue first message
        success1 = self.queue.enqueue(
            source_id="tg_cvenotify",
            channel_title="CVE Notify",
            channel_username="cvenotify",
            channel_id=1001,
            message_id=501,
            raw_text="CRITICAL: Zero-day remote code execution in web framework CVE-2026-9999",
            timestamp=int(time.time()),
            author="SecurityTeam",
            content_hash="hash_cve_9999_test_a"
        )
        self.assertTrue(success1, "First message should be enqueued successfully")

        # Try to enqueue duplicate content hash
        success_dup = self.queue.enqueue(
            source_id="tg_cvenotify",
            channel_title="CVE Notify",
            channel_username="cvenotify",
            channel_id=1001,
            message_id=502,
            raw_text="CRITICAL: Zero-day remote code execution in web framework CVE-2026-9999",
            timestamp=int(time.time()),
            author="SecurityTeam",
            content_hash="hash_cve_9999_test_a"
        )
        self.assertFalse(success_dup, "Duplicate message with same content hash must be rejected")
        print("  [+] Enqueue and deduplication passed.")

    def test_02_bounded_retries_and_dead_lettering(self):
        """Test max 3 retry policy and dead-letter quarantine."""
        print("\n[*] Test 2: Bounded Webhook Retries & Dead Lettering...")
        
        self.queue.enqueue(
            source_id="tg_pentestingnews",
            channel_title="Pentest News",
            channel_username="pentestingnews",
            channel_id=1002,
            message_id=601,
            raw_text="Advisory on Active Directory lateral movement",
            timestamp=int(time.time()),
            author=None,
            content_hash="hash_ad_movement_601"
        )

        msg_id = "msg_1002_601"
        
        # Attempt 1 failure
        self.queue.record_failure(msg_id, "HTTP 500: Internal Server Error")
        pending = self.queue.get_pending()
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["attempts"], 1)

        # Attempt 2 failure
        self.queue.record_failure(msg_id, "HTTP 502: Bad Gateway")
        pending = self.queue.get_pending()
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["attempts"], 2)

        # Attempt 3 failure -> Dead letter quarantine
        self.queue.record_failure(msg_id, "HTTP 503: Service Unavailable")
        pending_after_3 = self.queue.get_pending()
        self.assertEqual(len(pending_after_3), 0, "Item must not remain in pending queue after 3 failed attempts")

        stats = self.queue.get_stats()
        self.assertEqual(stats["dead_letter_count"], 1, "Item must be moved to dead-letter count")
        print("  [+] Bounded retries (3 max) and dead-lettering passed.")

    def test_03_heartbeat_and_live_health_api(self):
        """Test heartbeat synchronization with production Cloudflare API."""
        print("\n[*] Test 3: Collector Heartbeat -> Live Cloudflare API...")
        
        heartbeat_payload = {
            "status": "CONNECTED",
            "session_active": True,
            "messages_received": 42,
            "messages_dispatched": 40,
            "duplicates_dropped": 2,
            "errors_count": 0,
            "flood_wait_seconds_remaining": 0,
            "reconnect_attempts": 0,
            "last_received_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "last_success_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "uptime_seconds": 3600,
            "monitored_channels": ["@vxunderground", "@cvenotify", "@blueteamalerts"]
        }

        # 1. Post heartbeat
        req_post = urllib.request.Request(
            "https://zayron-x-api.aabusabih.workers.dev/api/v1/admin/collector-heartbeat",
            data=json.dumps(heartbeat_payload).encode('utf-8'),
            headers={"Content-Type": "application/json", "User-Agent": "ZayronResilienceTest/1.0"}
        )
        with urllib.request.urlopen(req_post, timeout=10) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            self.assertEqual(data.get("status"), "SUCCESS")

        # 2. Get collector health
        req_get = urllib.request.Request(
            "https://zayron-x-api.aabusabih.workers.dev/api/v1/admin/collector-health",
            headers={"User-Agent": "ZayronResilienceTest/1.0"}
        )
        with urllib.request.urlopen(req_get, timeout=10) as resp:
            self.assertEqual(resp.status, 200)
            health_data = json.loads(resp.read().decode('utf-8'))
            collector = health_data.get("collector", {})
            self.assertEqual(collector.get("status"), "CONNECTED")
            self.assertEqual(collector.get("messages_received"), 42)
            self.assertTrue(collector.get("session_active"))
            print(f"  [+] Synchronized collector health confirmed: Status={collector.get('status')}, Received={collector.get('messages_received')}")

    def test_04_dynamic_source_registry_sync(self):
        """Test dynamic loading of authoritative sources from D1."""
        print("\n[*] Test 4: Dynamic Source Registry Sync...")
        
        req = urllib.request.Request(
            "https://zayron-x-api.aabusabih.workers.dev/api/v1/sources",
            headers={"User-Agent": "ZayronResilienceTest/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            sources = data.get("sources", [])
            self.assertGreater(len(sources), 0, "D1 sources registry must contain enabled sources")
            print(f"  [+] Loaded {len(sources)} active sources from D1 registry.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
