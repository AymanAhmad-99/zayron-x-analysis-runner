import asyncio
import os
import sys
import json
import httpx
from telethon import TelegramClient, events
from telethon.sessions import StringSession

sys.stdout.reconfigure(encoding='utf-8')

API_ID = 37585861
API_HASH = "e38c7289b2050a99557bcc0d1813cfac"
SESSION_FILE = "scripts/.tg_session.txt"
WEBHOOK_URL = "https://zayron-x-api.aabusabih.workers.dev/api/v1/webhook/telegram"

TOP_RADAR_CHANNELS = [
    "vxunderground",
    "thehackernews",
    "cveNotify",
    "PentestingNews",
    "blueteamalerts",
    "aptreports",
    "malwr",
    "ctinow",
    "xakep_ru",
    "whackdoor",
    "exploitex",
    "searchack",
    "SecLabNews",
    "anti_malware",
    "lab_hack",
    "cyber_cabb",
    "ransomfeed",
    "databreaches",
    "darknet_live",
    "MalwareTraffic",
    "CyberSecurityHub",
    "reverseengineering",
    "hackers_zone",
    "hackernewslive",
    "cibsecurity",
]

async def dispatch_telegram_message(event_msg, chat):
    text = event_msg.text or event_msg.message or ""
    if not text or len(text.strip()) < 15:
        return None

    username = getattr(chat, 'username', None)
    chat_title = getattr(chat, 'title', 'Telegram Channel')
    chat_id = chat.id
    message_id = event_msg.id
    timestamp = int(event_msg.date.timestamp()) if event_msg.date else 0

    update_payload = {
        "update_id": int(f"99{message_id}"),
        "channel_post": {
            "message_id": message_id,
            "date": timestamp,
            "chat": {
                "id": chat_id,
                "title": chat_title,
                "username": username,
                "type": "channel"
            },
            "text": text,
            "author_signature": getattr(event_msg, 'post_author', None)
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.post(WEBHOOK_URL, json=update_payload)
            if resp.status_code == 200:
                data = resp.json()
                print(f"[✓ DISPATCHED] {chat_title[:30]} (@{username or chat_id}) | MsgID: {message_id} | Result: {data.get('queued')}")
                return data
            else:
                print(f"[✗ HTTP {resp.status_code}] {resp.text}")
    except Exception as err:
        print(f"[✗ ERROR] {err}")
    return None

async def run_radar_sweep(limit_per_ch=2):
    with open(SESSION_FILE, "r", encoding="utf-8") as f:
        session_str = f.read().strip()

    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()

    print("=" * 64)
    print("  ZAYRON-X GLOBAL TELEGRAM THREAT RADAR — DEEP SWEEP")
    print(f"  Target Channels: {len(TOP_RADAR_CHANNELS)}")
    print(f"  Messages Per Channel: {limit_per_ch}")
    print("=" * 64)

    total_dispatched = 0

    for uname in TOP_RADAR_CHANNELS:
        try:
            entity = await client.get_entity(uname)
            messages = await client.get_messages(entity, limit=limit_per_ch)
            for m in messages:
                if m.text and len(m.text.strip()) >= 15:
                    res = await dispatch_telegram_message(m, entity)
                    if res:
                        total_dispatched += 1
                    await asyncio.sleep(0.3)
        except Exception as e:
            print(f"[!] Skip @{uname}: {e}")

    await client.disconnect()
    print("\n" + "=" * 64)
    print(f"[+] Radar Sweep Completed. Total Live Signals Ingested: {total_dispatched}")
    print("=" * 64)

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    asyncio.run(run_radar_sweep(count))
