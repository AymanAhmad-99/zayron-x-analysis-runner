import asyncio
import os
import sys
import json
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError

STATE_FILE = "scripts/.tg_login_state.json"
SESSION_OUTPUT_FILE = os.environ.get("TELEGRAM_SESSION_OUTPUT_FILE", "scripts/.tg_session.txt")

async def verify(code: str, password: str = None):
    if not os.path.exists(STATE_FILE):
        print("[-] Error: Login state file not found. Please request code first.")
        return
        
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        state = json.load(f)
        
    phone = state["phone"]
    phone_code_hash = state["phone_code_hash"]
    session_str = state["session_str"]
    api_id = int(os.environ["TELEGRAM_API_ID"])
    api_hash = os.environ["TELEGRAM_API_HASH"]
    
    session = StringSession(session_str)
    client = TelegramClient(session, api_id, api_hash)
    await client.connect()
    
    try:
        print(f"[*] Attempting sign in with code {code}...")
        await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
    except SessionPasswordNeededError:
        print("[!] 2FA Password is required for this account.")
        if password:
            print("[*] Signing in with 2FA password...")
            await client.sign_in(password=password)
        else:
            print("[!] Please provide your 2FA password.")
            await client.disconnect()
            return
            
    if await client.is_user_authorized():
        me = await client.get_me()
        final_session = client.session.save()
        print(f"[+] Successfully logged in as: {me.first_name} (@{me.username or 'no_username'}) [ID: {me.id}]")
        with open(SESSION_OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(final_session)
        print(f"[+] Saved persistent session string to {SESSION_OUTPUT_FILE}")
    else:
        print("[-] Failed to authorize user.")
        
    await client.disconnect()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/telegram_verify_code.py <code> [2fa_password]")
        sys.exit(1)
        
    code_arg = sys.argv[1]
    pwd_arg = sys.argv[2] if len(sys.argv) > 2 else None
    asyncio.run(verify(code_arg, pwd_arg))
