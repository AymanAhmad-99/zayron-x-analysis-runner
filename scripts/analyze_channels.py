import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/user_channels.json', 'r', encoding='utf-8') as f:
    channels = json.load(f)

arabic_channels = []
cyber_channels = []
general_channels = []

cyber_keywords = [
    'cve', 'hack', 'pentest', 'threat', 'exploit', 'security', 'cyber', 'vuln', 
    'malware', 'team', 'apt', 'хакер', 'бэкдор', 'иб', 'уязвимост', 'инфобез',
    'leak', 'dump', 'ransom', 'payload', '0day', 'zero-day', 'reverse', 'osint',
    'botnet', 'stealer', 'rootkit', 'phish', 'radar', 'defcon'
]

for c in channels:
    title = c['title']
    uname = (c['username'] or '').lower()
    combined = (title + ' ' + uname).lower()
    
    is_ar = any('\u0600' <= char <= '\u06FF' for char in title)
    is_cyber = any(kw in combined for kw in cyber_keywords)
    
    if is_ar:
        arabic_channels.append(c)
    elif is_cyber:
        cyber_channels.append(c)
    else:
        general_channels.append(c)

print(f"Total Channels/Groups: {len(channels)}")
print(f"• Arabic/Regional Channels: {len(arabic_channels)}")
print(f"• Technical/Cyber/Hacking Channels: {len(cyber_channels)}")
print(f"• General/Other Channels: {len(general_channels)}")

print("\n--- 1. ARABIC CHANNELS FOUND ---")
for c in arabic_channels[:15]:
    uname = f"@{c['username']}" if c['username'] else "private"
    print(f"• [{c['id']}] {c['title']} ({uname})")

print("\n--- 2. TOP CYBER & THREAT INTEL CHANNELS FOUND ---")
for c in cyber_channels[:25]:
    uname = f"@{c['username']}" if c['username'] else "private"
    print(f"• [{c['id']}] {c['title']} ({uname})")
