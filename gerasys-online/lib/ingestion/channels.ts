/**
 * ZAYRON-X — 30 Elite Intelligence Channel Inventory
 *
 * Category alignment with the 4-silo CTI doctrine:
 *   vulnerabilities — CVE feeds, exploit announcements, bug bounty
 *   threat_intel    — APT tracking, IR, SOC analysis, social engineering
 *   osint           — Open-source intelligence gathering
 *   cyber_news      — Industry headlines, breach reporting
 */

export interface IntelligenceChannel {
  url: string;
  name: string;
  category: "vulnerabilities" | "threat_intel" | "osint" | "cyber_news";
  lang: "en" | "ru";
}

export const INTELLIGENCE_CHANNELS: IntelligenceChannel[] = [
  // --- VULNERABILITIES ---
  { url: "https://t.me/cveNotify", name: "CVE Notify", category: "vulnerabilities", lang: "en" },
  { url: "https://t.me/ZerodayAlert", name: "ZeroDay Alert", category: "vulnerabilities", lang: "en" },
  { url: "https://t.me/thebugbountyhunter", name: "The Bug Bounty Hunter", category: "vulnerabilities", lang: "en" },
  { url: "https://t.me/package_security", name: "Package Security", category: "vulnerabilities", lang: "en" },
  { url: "https://t.me/Offensiv3Sec", name: "Offensive Security", category: "vulnerabilities", lang: "en" },
  { url: "https://t.me/linuxkalii", name: "Linux Kali", category: "vulnerabilities", lang: "en" },
  { url: "https://t.me/OffensiveTwitter", name: "Offensive Twitter", category: "vulnerabilities", lang: "en" },

  // --- THREAT INTEL ---
  { url: "https://t.me/APT_Notes", name: "APT Notes", category: "threat_intel", lang: "en" },
  { url: "https://t.me/malwr", name: "Malwr", category: "threat_intel", lang: "en" },
  { url: "https://t.me/ctinow", name: "CTI Now", category: "threat_intel", lang: "en" },
  { url: "https://t.me/Positive_Technologies", name: "Positive Tech", category: "threat_intel", lang: "ru" },
  { url: "https://t.me/codeby_sec", name: "Codeby Sec", category: "threat_intel", lang: "ru" },
  { url: "https://t.me/IRCyberGuardians", name: "IR Guardians", category: "threat_intel", lang: "en" },
  { url: "https://t.me/socanalyst", name: "SOC Analyst", category: "threat_intel", lang: "en" },
  { url: "https://t.me/Social_engineering", name: "Social Eng", category: "threat_intel", lang: "en" },
  { url: "https://t.me/cibsecurity", name: "CIB Security", category: "threat_intel", lang: "en" },
  { url: "https://t.me/black_triangle_tg", name: "Black Triangle", category: "threat_intel", lang: "ru" },
  { url: "https://t.me/elliot_cybersec", name: "Elliot Sec", category: "threat_intel", lang: "en" },
  { url: "https://t.me/tg_infosec", name: "TG InfoSec", category: "threat_intel", lang: "en" },
  { url: "https://t.me/cybred", name: "CybRed", category: "threat_intel", lang: "en" },
  { url: "https://t.me/searchack", name: "Search Ack", category: "threat_intel", lang: "en" },

  // --- OSINT ---
  { url: "https://t.me/Russian_OSINT", name: "Russian OSINT", category: "osint", lang: "ru" },
  { url: "https://t.me/osint_mindset", name: "OSINT Mindset", category: "osint", lang: "en" },
  { url: "https://t.me/osint_san_framework", name: "OSINT San", category: "osint", lang: "en" },
  { url: "https://t.me/osintkanal", name: "OSINT Kanal", category: "osint", lang: "ru" },

  // --- CYBER NEWS ---
  { url: "https://t.me/thehackernews", name: "The Hacker News", category: "cyber_news", lang: "en" },
  { url: "https://t.me/BleepingComputer", name: "Bleeping Computer", category: "cyber_news", lang: "en" },
  { url: "https://t.me/xakep_ru", name: "Xakep.ru", category: "cyber_news", lang: "ru" },
  { url: "https://t.me/SecLabNews", name: "SecLab News", category: "cyber_news", lang: "ru" },
  { url: "https://t.me/HNews", name: "Hacker News", category: "cyber_news", lang: "en" },
];

export function getChannelsByCategory(category: IntelligenceChannel["category"]) {
  return INTELLIGENCE_CHANNELS.filter((c) => c.category === category);
}

export function getChannelByName(name: string) {
  return INTELLIGENCE_CHANNELS.find((c) => c.name === name) ?? null;
}

export function getChannelCountByCategory() {
  const counts: Record<string, number> = {};
  for (const ch of INTELLIGENCE_CHANNELS) {
    counts[ch.category] = (counts[ch.category] ?? 0) + 1;
  }
  return counts;
}
