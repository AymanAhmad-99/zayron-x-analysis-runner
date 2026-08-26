export interface SourceRecord {
  id: string;
  displayName: string;
  url: string;
  type: 'telegram' | 'rss' | 'api' | 'cert' | 'vendor';
  language: string;
  region?: string;
  trustScore: number;
  priority: 'A' | 'B' | 'C';
  status: 'DISCOVERED' | 'REVIEWED' | 'ENABLED' | 'MONITORED' | 'DEGRADED' | 'QUARANTINED' | 'DISABLED';
  enabled: boolean;
}

// Seed catalogue of verified CTI channels across multiple languages
export const SEED_SOURCES: SourceRecord[] = [
  {
    id: 'tg_vxunderground',
    displayName: 'vx-underground',
    url: 'https://t.me/vxunderground',
    type: 'telegram',
    language: 'en',
    region: 'global',
    trustScore: 0.92,
    priority: 'A',
    status: 'ENABLED',
    enabled: true,
  },
  {
    id: 'tg_redteams_ru',
    displayName: 'Russian Threat Intel Channel',
    url: 'https://t.me/threat_intel_ru',
    type: 'telegram',
    language: 'ru',
    region: 'RU/CIS',
    trustScore: 0.85,
    priority: 'A',
    status: 'ENABLED',
    enabled: true,
  },
  {
    id: 'tg_iran_cyber',
    displayName: 'Persian Threat Advisory Feed',
    url: 'https://t.me/iran_cyber_watch',
    type: 'telegram',
    language: 'fa',
    region: 'Middle East',
    trustScore: 0.78,
    priority: 'B',
    status: 'ENABLED',
    enabled: true,
  },
  {
    id: 'tg_cve_alert',
    displayName: 'CVE & Exploits Global Feed',
    url: 'https://t.me/cve_announcements',
    type: 'telegram',
    language: 'en',
    region: 'global',
    trustScore: 0.95,
    priority: 'A',
    status: 'ENABLED',
    enabled: true,
  },
  {
    id: 'tg_ch_apt',
    displayName: 'Asia-Pacific Cyber Radar',
    url: 'https://t.me/apac_threat_intel',
    type: 'telegram',
    language: 'zh',
    region: 'APAC',
    trustScore: 0.82,
    priority: 'B',
    status: 'ENABLED',
    enabled: true,
  },
];

/**
 * Calculates updated source trust based on verification outcome.
 */
export function updateSourceTrustScore(
  currentScore: number,
  outcome: 'CONFIRMED' | 'DISPUTED' | 'SPAM'
): number {
  if (outcome === 'CONFIRMED') {
    return Math.min(1.0, currentScore + 0.02);
  }
  if (outcome === 'DISPUTED') {
    return Math.max(0.1, currentScore - 0.08);
  }
  if (outcome === 'SPAM') {
    return Math.max(0.0, currentScore - 0.15);
  }
  return currentScore;
}
