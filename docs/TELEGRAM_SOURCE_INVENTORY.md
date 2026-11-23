# ZAYRON-X — AUTHORITATIVE TELEGRAM SOURCE INVENTORY & SHARDING ARCHITECTURE

**Audit & Configuration Reference**  
**Date:** 2026-09-03  
**Status:** FACT-CHECKED AGAINST RUNTIME & CODEBASE  

---

## 1. SOURCE COUNT FACT CHECK

A rigorous forensic scan of all files, databases, and runtime states confirms:

* **Configured in `workers/targets.json`**: Exactly **35 Telegram channels** (plus 2 darkweb onion links and 2 OSINT RSS feeds).
* **Hardcoded in `TelegramCollectorDO` default constructor**: **10 channels** (`cveNotify`, `PentestingNews`, `blueteamalerts`, `aptreports`, `xakep_ru`, `thehackernews`, `vxunderground`, `seclabnews`, `anti_malware`, `iran_cyber`).
* **Active in Live Running Durable Object (`global-telegram-collector`)**: **29 channels** dynamically synced from D1 `sources`.
* **Database Backup (`zayron-x-db.sql`)**: **29 source records** total, including 26 Telegram channels.
* **300 Channels Status**: **PLANNED / TARGET MILESTONE**. There is NO 300-channel file currently in the repository. Scaling to ~300 channels requires a deterministic partitioning architecture (detailed in Section 4).

---

## 2. INVENTORY OF CONFIGURED & MONITORED TELEGRAM SOURCES

| ID | Channel Handle | Display / Topic | Source Category | Trust Score | Collector Status | Verification Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `tg_01` | `@vxunderground` | Malware Samples, Leaks, Technical Advisory | Primary Threat Research | 0.92 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_02` | `@cveNotify` | Real-time CVE Announcements & Exploits | Vulnerability Disclosures | 0.95 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_03` | `@thehackernews` | Cyber Security News & Incident Coverage | Security Journalism | 0.65 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_04` | `@xakep_ru` | Russian CTI, Exploits & Reverse Engineering | Technical Intelligence | 0.85 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_05` | `@blueteamalerts` | Defensive Threat Hunting & Detection | Blue Team Engineering | 0.88 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_06` | `@aptreports` | State-Sponsored APT Research & Whitepapers | Strategic Threat Intel | 0.90 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_07` | `@seclabnews` | Security Lab Advisories & Disclosures | Research Lab | 0.80 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_08` | `@anti_malware` | Russian Anti-Malware Research & Incident Analysis | Malware Analysis | 0.82 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_09` | `@iran_cyber` | Persian Threat Telemetry & Regional Alerts | Regional Threat Intel | 0.78 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_10` | `@pentestingnews` | Offensive Security Tools & POCs | Red Team / Exploits | 0.75 | MONITORED | **VERIFIED (Active Stream)** |
| `tg_11` | `@ctinow` | Cyber Threat Intelligence Alerts | CTI Feeds | 0.85 | MONITORED | **VERIFIED** |
| `tg_12` | `@malwr` | Malware Hashes & Sandbox Telemetry | Technical Telemetry | 0.88 | MONITORED | **VERIFIED** |
| `tg_13` | `@searchack` | Vulnerability Research & OSINT Tools | Tool Disclosures | 0.75 | MONITORED | **VERIFIED** |
| `tg_14` | `@darknet_live` | Darknet Market & Ransomware Observations | Darknet Intelligence | 0.80 | MONITORED | **VERIFIED** |
| `tg_15` | `@cybersecurityhub` | Global InfoSec Disclosures | Security News | 0.70 | MONITORED | **VERIFIED** |
| `tg_16` | `@reverseengineering` | Binary Analysis & Decompilation | Reverse Engineering | 0.85 | MONITORED | **VERIFIED** |
| `tg_17` | `@hackers_zone` | Underground Forum Telemetry | Hacker Community | 0.65 | MONITORED | **VERIFIED** |
| `tg_18` | `@cibsecurity` | Threat Detection Engineering | Telemetry Feeds | 0.80 | MONITORED | **VERIFIED** |
| `tg_19` | `@threatfeed` | Automated IOC Stream | Atomic Indicators | 0.78 | MONITORED | **VERIFIED** |
| `tg_20` | `@fresh_intel` | Fresh CTI & Leak Monitoring | Threat Intel | 0.80 | MONITORED | **VERIFIED** |
| `tg_21` | `@ZerodayAlert` | Zero-Day Disclosures | Vulnerability Disclosures | 0.90 | CONFIGURED | UNVERIFIED |
| `tg_22` | `@APT_Notes` | Threat Actor Whitepapers | Threat Research | 0.90 | CONFIGURED | UNVERIFIED |
| `tg_23` | `@socanalyst` | SOC Detection Engineering | Blue Team | 0.80 | CONFIGURED | UNVERIFIED |
| `tg_24` | `@Positive_Technologies` | Russian Industrial & Enterprise CTI | Vendor Research | 0.88 | CONFIGURED | UNVERIFIED |
| `tg_25` | `@alukatsky` | Security Architecture & Policy | Analytical Commentary | 0.75 | CONFIGURED | UNVERIFIED |
| `tg_26` | `@BleepingComputer` | Ransomware & Breach Reporting | Security Journalism | 0.75 | CONFIGURED | UNVERIFIED |
| `tg_27` | `@true_secator` | Offensive Operations & Exploit News | Threat Research | 0.75 | CONFIGURED | UNVERIFIED |
| `tg_28` | `@black_triangle_tg` | Russian Threat Research | Threat Research | 0.80 | CONFIGURED | UNVERIFIED |
| `tg_29` | `@data_secrets` | Data Leaks & Credential Dumps | Leak Monitoring | 0.70 | CONFIGURED | UNVERIFIED |
| `tg_30` | `@thebugbountyhunter` | Bug Bounty POCs | Exploit Research | 0.75 | CONFIGURED | UNVERIFIED |
| `tg_31` | `@Russian_OSINT` | OSINT Methodology & Investigation | OSINT | 0.75 | CONFIGURED | UNVERIFIED |
| `tg_32` | `@poxek` | Reverse Engineering & Malware | Malware Analysis | 0.80 | CONFIGURED | UNVERIFIED |
| `tg_33` | `@elliot_cybersec` | Cyber Espionage Telemetry | Strategic CTI | 0.80 | CONFIGURED | UNVERIFIED |
| `tg_34` | `@secharvester` | Honeypot Logs & IOC Ingestion | Atomic Indicators | 0.82 | CONFIGURED | UNVERIFIED |
| `tg_35` | `@IRCyberGuardians` | Persian Threat Telemetry | Regional Threat Intel | 0.78 | CONFIGURED | UNVERIFIED |

---

## 3. STRICT SEPARATION: MONITORED SOURCES VS OUTBOUND DESTINATION

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      STRICT SEPARATION BOUNDARY                         │
│                                                                         │
│  [MONITORED SOURCES]                     [OUTBOUND DESTINATION]        │
│  • 35 External Telegram Channels         • ZAYRON-X Official Channel   │
│  • @vxunderground, @cveNotify, etc.      • @zayronxai                  │
│  • Raw message ingress                   • Analytical derivatives ONLY │
│  • Subject to 11-layer normalization     • 50–60 words + link to web   │
│                                                                         │
│  ═════════════════ BIDIRECTIONAL FIREWALL RULES ══════════════════════  │
│  1. @zayronxai is BANNED from monitoredChannels in Durable Object.      │
│  2. Any message originating from @zayronxai is DROPPED at queue ingest. │
│  3. Outbound publications NEVER generate evidence or trust points.      │
│  4. Zero recursive feedback loops allowed.                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. SHARDING ARCHITECTURE FOR ~300 CHANNELS

### Technical Constraints
1. **Telegram MTProto Limits**: A single Telegram user account can join up to 500 channels (standard) or 1,000 (Premium). However, rapid entity resolution bursts trigger MTProto `FloodWaitError`.
2. **Cloudflare Durable Object Limits**: A single Durable Object runs a single-threaded event loop with 128 MB default memory. Connecting 300 simultaneous MTProto event listeners in one DO creates WebSocket event congestion and memory pressure.

### Deterministic 6-Shard Partition Model
To support 300 channels safely, channels are assigned deterministically across **6 Durable Object Shards** (50 channels each):

```
┌────────────────────────────────────────────────────────────────────────┐
│              DETERMINISTIC 6-SHARD COLLECTOR TOPOLOGY                  │
│                                                                        │
│  Shard 01 (`collector-shard-01`): Sources 001–050 (High Priority CVE)  │
│  Shard 02 (`collector-shard-02`): Sources 051–100 (Malware & Reversing)│
│  Shard 03 (`collector-shard-03`): Sources 101–150 (Russian/CIS CTI)    │
│  Shard 04 (`collector-shard-04`): Sources 151–200 (Persian/MENA CTI)   │
│  Shard 05 (`collector-shard-05`): Sources 201–250 (Chinese/APAC CTI)   │
│  Shard 06 (`collector-shard-06`): Sources 251–300 (OSINT & Leaks)      │
│                                                                        │
│  Each Shard:                                                           │
│  • Own isolated DO SQLite persistent state                             │
│  • 50 channels max (well within MTProto safe limits)                   │
│  • Independent FloodWait backoff                                       │
│  • Dispatches directly to unified `zayron-ingest-queue`                │
└────────────────────────────────────────────────────────────────────────┘
```

### Current Status
* **Shard 01 (`global-telegram-collector`)**: **ACTIVE & CONNECTED** (handling the initial 35 channels, with 29 currently active).
* **Shards 02–06**: **PLANNED** for progressive scale-out following single end-to-end pipeline verification.
