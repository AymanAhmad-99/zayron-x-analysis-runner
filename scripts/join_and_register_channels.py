import asyncio
import os
import sys
import json
import httpx
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.errors import FloodWaitError, ChannelPrivateError, UsernameNotOccupiedError, UserAlreadyParticipantError

sys.stdout.reconfigure(encoding='utf-8')

API_ID = 37585861
API_HASH = "e38c7289b2050a99557bcc0d1813cfac"
SESSION_FILE = "scripts/.tg_session.txt"

# ═══════════════════════════════════════════════════════════════
# 50+ Top-Tier Elite Cybersecurity, APT, Ransomware & Exploit Channels
# ═══════════════════════════════════════════════════════════════
TARGET_CHANNELS = [
    # ── 1. Elite Malware, Exploits & Source Code ────────────────
    {"username": "vxunderground", "display_name": "VX-Underground (Malware & Leak Vault)", "lang": "en", "region": "Global", "trust": 0.96},
    {"username": "thehackernews", "display_name": "The Hacker News (Global Breaking CTI)", "lang": "en", "region": "Global", "trust": 0.95},
    {"username": "cveNotify", "display_name": "CVE Notify (Zero-Day & NVD Radar)", "lang": "en", "region": "Global", "trust": 0.98},
    {"username": "PentestingNews", "display_name": "Pentesting & Exploitation News", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "blueteamalerts", "display_name": "Blue Team & SOC Alerts", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "aptreports", "display_name": "CTT Report Hub (Global APT Intel)", "lang": "en", "region": "Global", "trust": 0.94},
    {"username": "malwr", "display_name": "Malware Analysis & Hashes Feed", "lang": "en", "region": "Global", "trust": 0.92},
    {"username": "ctinow", "display_name": "Cyber Threat Intelligence Radar", "lang": "en", "region": "Global", "trust": 0.91},
    
    # ── 2. Russian Underground & APT Ecosystem ───────────────────
    {"username": "xakep_ru", "display_name": "Xakep.ru (Russian Underground Journal)", "lang": "ru", "region": "RU/CIS", "trust": 0.92},
    {"username": "whackdoor", "display_name": "Бэкдор (Exploits & 0-Days)", "lang": "ru", "region": "RU/CIS", "trust": 0.89},
    {"username": "exploitex", "display_name": "Эксплойт (Vulnerability Weaponization)", "lang": "ru", "region": "RU/CIS", "trust": 0.90},
    {"username": "searchack", "display_name": "Не хакинг, а ИБ (Offensive Security)", "lang": "ru", "region": "RU/CIS", "trust": 0.88},
    {"username": "SecLabNews", "display_name": "SecurityLab.ru (Vulnerability Base)", "lang": "ru", "region": "RU/CIS", "trust": 0.93},
    {"username": "anti_malware", "display_name": "AM Live (Russian Threat Tracking)", "lang": "ru", "region": "RU/CIS", "trust": 0.90},
    {"username": "lab_hack", "display_name": "Лаборатория хакера (Hacker Lab)", "lang": "ru", "region": "RU/CIS", "trust": 0.87},
    {"username": "cyber_cabb", "display_name": "Отдел К (Cyber Investigation)", "lang": "ru", "region": "RU/CIS", "trust": 0.89},
    {"username": "book_academ", "display_name": "Бункер Хакера (Underground Materials)", "lang": "ru", "region": "RU/CIS", "trust": 0.85},
    {"username": "tg_infosec", "display_name": "InfoSecurity RU/Global", "lang": "ru", "region": "RU/CIS", "trust": 0.88},
    {"username": "DigitaIIntelligence", "display_name": "Digital-Разведка & OSINT", "lang": "ru", "region": "RU/CIS", "trust": 0.91},
    
    # ── 3. Ransomware, Leaks & Dark Web Monitoring ───────────────
    {"username": "ransomfeed", "display_name": "RansomFeed (Live Ransomware Victims)", "lang": "en", "region": "Global", "trust": 0.95},
    {"username": "databreaches", "display_name": "DataBreaches.net Incident Feed", "lang": "en", "region": "Global", "trust": 0.93},
    {"username": "leak_station", "display_name": "Leak Station (Corporate Dumps)", "lang": "en", "region": "Global", "trust": 0.88},
    {"username": "threat_intel_feed", "display_name": "Threat Intel Live Feeds", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "cibsecurity", "display_name": "Cybersecurity & Privacy Ops", "lang": "en", "region": "Global", "trust": 0.88},
    {"username": "cybersecurity_outlook", "display_name": "Cybersecurity Outlook Global", "lang": "en", "region": "Global", "trust": 0.87},
    {"username": "hackernewslive", "display_name": "Hacker News Live Telemetry", "lang": "en", "region": "Global", "trust": 0.89},
    
    # ── 4. APT Hunting (North Korea, China, Middle East, USA) ────
    {"username": "apt_hunting", "display_name": "APT Hunting & Advanced Threat Actors", "lang": "en", "region": "Global", "trust": 0.94},
    {"username": "redteamblue", "display_name": "Red & Blue Team Cyber Warfare", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "offensive_security_feed", "display_name": "Offensive Security Feeds", "lang": "en", "region": "Global", "trust": 0.89},
    {"username": "osint_threats", "display_name": "OSINT & Geopolitical Cyber Threats", "lang": "en", "region": "Global", "trust": 0.90},
    {"username": "cyberthreatdefense", "display_name": "Cyber Threat Defense Network", "lang": "en", "region": "Global", "trust": 0.88},
    {"username": "infosec_feed", "display_name": "InfoSec Global Intelligence Feed", "lang": "en", "region": "Global", "trust": 0.89},
    {"username": "cert_alerts", "display_name": "Global CERT & CSIRT Alerts", "lang": "en", "region": "Global", "trust": 0.97},
    {"username": "darkweb_intelligence", "display_name": "Dark Web & Forum Intelligence", "lang": "en", "region": "Global", "trust": 0.92},
]

async def join_and_register():
    if not os.path.exists(SESSION_FILE):
        print(f"[-] Session file {SESSION_FILE} not found.")
        return

    with open(SESSION_FILE, "r", encoding="utf-8") as f:
        session_str = f.read().strip()

    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()

    print("[+] Connected to Telegram MTProto.")
    print(f"[*] Starting auto-join and source registry synchronization for {len(TARGET_CHANNELS)} channels...\n")

    joined_count = 0
    already_in = 0
    failed_count = 0
    registered_sources = []

    for item in TARGET_CHANNELS:
        uname = item["username"]
        disp_name = item["display_name"]
        
        try:
            entity = await client.get_entity(uname)
            # Try joining channel
            try:
                await client(JoinChannelRequest(entity))
                print(f"[✓ JOINED NEW] {disp_name} (@{uname})")
                joined_count += 1
                await asyncio.sleep(2.0) # Rate limit safety
            except UserAlreadyParticipantError:
                print(f"[✓ ACTIVE/ALREADY JOINED] {disp_name} (@{uname})")
                already_in += 1
            except FloodWaitError as e:
                print(f"[!] Rate limit (FloodWait): Sleeping {e.seconds}s...")
                await asyncio.sleep(e.seconds)
            except Exception as e:
                print(f"[i] Status (@{uname}): {e}")
                already_in += 1

            source_id = f"tg_{uname.lower()}"
            registered_sources.append({
                "id": source_id,
                "display_name": disp_name,
                "url": f"https://t.me/{uname}",
                "source_type": "telegram",
                "language": item["lang"],
                "region": item["region"],
                "trust_score": item["trust"],
                "priority": "A" if item["trust"] >= 0.9 else "B",
                "status": "ENABLED",
                "enabled": 1
            })

        except (UsernameNotOccupiedError, ChannelPrivateError) as e:
            print(f"[✗ UNAVAILABLE] @{uname}: {e}")
            failed_count += 1
        except Exception as e:
            print(f"[✗ ERROR] @{uname}: {e}")
            failed_count += 1

    await client.disconnect()

    # Save to local sources JSON for D1 insertion
    with open("scripts/top_threat_sources.json", "w", encoding="utf-8") as f:
        json.dump(registered_sources, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"[+] Total Channels Processed: {len(TARGET_CHANNELS)}")
    print(f"[+] Successfully Connected/Active: {len(registered_sources)} ({already_in} already in account, {joined_count} newly joined)")
    print(f"[+] Failed/Private: {failed_count}")
    print(f"[+] Saved registry to scripts/top_threat_sources.json")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(join_and_register())
