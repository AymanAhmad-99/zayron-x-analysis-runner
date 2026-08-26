import asyncio
import os
import sys
import json
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = 37585861
API_HASH = "e38c7289b2050a99557bcc0d1813cfac"
PHONE = "+962788479169"
STATE_FILE = "scripts/.tg_login_state.json"

async def main():
    session = StringSession()
    client = TelegramClient(session, API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print(f"[*] Sending login code request to {PHONE}...")
        sent_code = await client.send_code_request(PHONE)
        session_str = client.session.save()
        
        state = {
            "phone": PHONE,
            "phone_code_hash": sent_code.phone_code_hash,
            "session_str": session_str,
            "api_id": API_ID,
            "api_hash": API_HASH
        }
        
        os.makedirs("scripts", exist_ok=True)
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f)
            
        print("[+] Code sent successfully!")
        print(f"[*] phone_code_hash: {sent_code.phone_code_hash}")
        print("[*] Please check your Telegram app for the verification code.")
    else:
        print("[+] Already authorized!")
        print(f"SESSION: {client.session.save()}")
        
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
