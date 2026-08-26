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

async def dispatch_telegram_message(client, event_msg, chat):
    text = event_msg.text or event_msg.message or ""
    if not text or len(text.strip()) < 10:
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
                print(f"[✓ DISPATCHED] From: {chat_title} (@{username or chat_id}) | MsgID: {message_id} | Result: {data.get('queued')}")
                return data
            else:
                print(f"[✗ HTTP ERROR {resp.status_code}] {resp.text}")
    except Exception as err:
        print(f"[✗ ERROR] Failed to dispatch message: {err}")
    return None

async def main(backfill_limit=1):
    with open(SESSION_FILE, "r", encoding="utf-8") as f:
        session_str = f.read().strip()

    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()

    print("[+] Connected to Telegram MTProto as authorized user!")

    # 1. Backfill top recent messages from threat channels
    target_usernames = ["cveNotify", "PentestingNews", "blueteamalerts", "aptreports", "xakep_ru"]
    print(f"[*] Checking recent messages from channels: {target_usernames}...")
    
    for uname in target_usernames:
        try:
            entity = await client.get_entity(uname)
            messages = await client.get_messages(entity, limit=backfill_limit)
            for m in messages:
                if m.text:
                    print(f"\n[*] Found recent post in @{uname} (ID: {m.id}): {m.text[:80]}...")
                    await dispatch_telegram_message(client, m, entity)
                    await asyncio.sleep(0.5)
        except Exception as e:
            print(f"[!] Could not fetch from @{uname}: {e}")

    await client.disconnect()
    print("\n[+] Ingestion run complete.")

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    asyncio.run(main(limit))
