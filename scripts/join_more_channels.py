import asyncio
import os
import sys
import json
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.errors import FloodWaitError, ChannelPrivateError, UsernameNotOccupiedError, UserAlreadyParticipantError

sys.stdout.reconfigure(encoding='utf-8')

API_ID = 37585861
API_HASH = "e38c7289b2050a99557bcc0d1813cfac"
SESSION_FILE = "scripts/.tg_session.txt"

ADDITIONAL_CHANNELS = [
    {"username": "CyberSecurityHub", "display_name": "CyberSecurity Hub", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "MalwareTraffic", "display_name": "Malware Traffic Analysis", "lang": "en", "region": "Global", "trust": 0.93},
    {"username": "reverseengineering", "display_name": "Reverse Engineering & Binary Analysis", "lang": "en", "region": "Global", "trust": 0.91},
    {"username": "soc_analyst", "display_name": "SOC Analyst Threat Hunter", "lang": "en", "region": "Global", "trust": 0.89},
    {"username": "darknet_live", "display_name": "Darknet Live Intelligence", "lang": "en", "region": "Global", "trust": 0.94},
    {"username": "cyber_crimes", "display_name": "Cyber Crime & Underground Activity", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "red_teaming", "display_name": "Red Teaming & Exploitation Tactics", "lang": "en", "region": "Global", "trust": 0.92},
    {"username": "cve_news", "display_name": "CVE News & Exploits", "lang": "en", "region": "Global", "trust": 0.93},
    {"username": "osint_club", "display_name": "OSINT Club Worldwide", "lang": "en", "region": "Global", "trust": 0.89},
    {"username": "infosec_news", "display_name": "InfoSec News Wire", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "threat_intel_radar", "display_name": "Threat Intel Radar 2026", "lang": "en", "region": "Global", "trust": 0.91},
    {"username": "security_affairs", "display_name": "Security Affairs Threat Hub", "lang": "en", "region": "Global", "trust": 0.93},
    {"username": "cyber_security_experts", "display_name": "Cyber Security Experts Channel", "lang": "en", "region": "Global", "trust": 0.88},
    {"username": "hackers_zone", "display_name": "Hackers Zone & Tools", "lang": "en", "region": "Global", "trust": 0.87},
    {"username": "ai_offensive", "display_name": "Offensive AI & LLM Weaponization", "lang": "en", "region": "Global", "trust": 0.91},
    {"username": "zero_day_daily", "display_name": "Zero Day Daily Disclosures", "lang": "en", "region": "Global", "trust": 0.94},
    {"username": "ransomware_map", "display_name": "Ransomware Operations Map", "lang": "en", "region": "Global", "trust": 0.92},
    {"username": "darkweb_dumps", "display_name": "Darkweb Dumps & Credential Leaks", "lang": "en", "region": "Global", "trust": 0.91},
]

async def join_more():
    with open(SESSION_FILE, "r", encoding="utf-8") as f:
        session_str = f.read().strip()

    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()

    print(f"[*] Connecting to {len(ADDITIONAL_CHANNELS)} additional channels...")

    for item in ADDITIONAL_CHANNELS:
        uname = item["username"]
        try:
            entity = await client.get_entity(uname)
            try:
                await client(JoinChannelRequest(entity))
                print(f"[✓ JOINED] {item['display_name']} (@{uname})")
                await asyncio.sleep(2.0)
            except UserAlreadyParticipantError:
                print(f"[✓ ACTIVE] {item['display_name']} (@{uname})")
            except FloodWaitError as e:
                print(f"[!] FloodWait {e.seconds}s...")
                await asyncio.sleep(e.seconds)
            except Exception as e:
                print(f"[i] Status (@{uname}): {e}")
        except Exception as e:
            print(f"[✗ UNAVAILABLE] @{uname}: {e}")

    await client.disconnect()
    print("[+] Additional join cycle finished.")

if __name__ == "__main__":
    asyncio.run(join_more())
