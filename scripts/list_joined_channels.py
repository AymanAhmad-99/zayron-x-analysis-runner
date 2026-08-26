import asyncio
import os
import sys
import json
from telethon import TelegramClient
from telethon.sessions import StringSession

sys.stdout.reconfigure(encoding='utf-8')

API_ID = 37585861
API_HASH = "e38c7289b2050a99557bcc0d1813cfac"
SESSION_FILE = "scripts/.tg_session.txt"
OUTPUT_FILE = "scripts/user_channels.json"

async def list_channels():
    with open(SESSION_FILE, "r", encoding="utf-8") as f:
        session_str = f.read().strip()
        
    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()
    
    dialogs = await client.get_dialogs()
    channels = []
    
    for d in dialogs:
        if d.is_channel or d.is_group:
            entity = d.entity
            username = getattr(entity, 'username', None)
            title = d.name
            chat_id = d.id
            channels.append({
                "id": chat_id,
                "title": title,
                "username": username,
                "type": "channel" if d.is_channel else "group",
                "unread_count": d.unread_count
            })
            
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(channels, f, ensure_ascii=False, indent=2)
        
    print(f"[+] Total Dialogs: {len(dialogs)}")
    print(f"[+] Successfully extracted {len(channels)} channels/groups to {OUTPUT_FILE}")
    
    # Print sample top 15 channels
    print("\n--- Sample Joined Channels ---")
    for c in channels[:15]:
        uname = f"@{c['username']}" if c['username'] else "private"
        print(f"[{c['id']}] {c['title'][:40]} ({uname})")
        
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(list_channels())
