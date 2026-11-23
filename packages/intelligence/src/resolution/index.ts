/**
 * Canonical Entity Resolution Module for ZAYRON-X
 * Maps aliases, variants, and abbreviations to authoritative identities.
 */

export interface CanonicalActor {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  country?: string;
  motivation?: string;
}

export interface CanonicalMalware {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  family: string;
}

// ── CANONICAL THREAT ACTOR REGISTRY ─────────────────────────────
export const CANONICAL_ACTORS: CanonicalActor[] = [
  {
    id: 'act_apt29',
    name: 'APT29',
    slug: 'apt29',
    aliases: ['Cozy Bear', 'The Dukes', 'Midnight Blizzard', 'NOBELIUM', 'UNC2452', 'YTTRIUM'],
    country: 'Russia',
    motivation: 'State-sponsored espionage',
  },
  {
    id: 'act_apt28',
    name: 'APT28',
    slug: 'apt28',
    aliases: ['Fancy Bear', 'Strontium', 'Pawn Storm', 'Sednit', 'Sofacy', 'Forest Blizzard'],
    country: 'Russia',
    motivation: 'Military intelligence / Sabotage',
  },
  {
    id: 'act_sandworm',
    name: 'Sandworm',
    slug: 'sandworm',
    aliases: ['Voodoo Bear', 'TeleBots', 'BlackEnergy Group', 'Seashell Blizzard', 'UAC-0082'],
    country: 'Russia',
    motivation: 'Critical infrastructure destruction / Espionage',
  },
  {
    id: 'act_lazarus',
    name: 'Lazarus Group',
    slug: 'lazarus',
    aliases: ['Hidden Cobra', 'Zinc', 'Diamond Sleet', 'Labyrinth Chollima'],
    country: 'North Korea',
    motivation: 'Financial cybercrime / Crypto theft / Espionage',
  },
  {
    id: 'act_volt_typhoon',
    name: 'Volt Typhoon',
    slug: 'volt-typhoon',
    aliases: ['Bronze Silhouette', 'Vanguard Panda', 'Insidious Taurus'],
    country: 'China',
    motivation: 'Pre-positioning on critical infrastructure',
  },
  {
    id: 'act_salt_typhoon',
    name: 'Salt Typhoon',
    slug: 'salt-typhoon',
    aliases: ['GhostEmperor', 'FamousSparrow'],
    country: 'China',
    motivation: 'Telecommunications interception / Espionage',
  },
  {
    id: 'act_flax_typhoon',
    name: 'Flax Typhoon',
    slug: 'flax-typhoon',
    aliases: ['Ethereal Panda'],
    country: 'China',
    motivation: 'Espionage',
  },
  {
    id: 'act_darkside',
    name: 'DarkSide',
    slug: 'darkside',
    aliases: ['BlackMatter'],
    country: 'Eastern Europe',
    motivation: 'Ransomware extortion',
  },
  {
    id: 'act_lockbit',
    name: 'LockBit',
    slug: 'lockbit',
    aliases: ['LockBit 2.0', 'LockBit 3.0', 'LockBit Black', 'LockBit Green'],
    country: 'Global Cybercrime',
    motivation: 'Ransomware-as-a-Service (RaaS)',
  },
  {
    id: 'act_charming_kitten',
    name: 'Charming Kitten',
    slug: 'charming-kitten',
    aliases: ['APT35', 'Mint Sandstorm', 'Phosphorus', 'TA453'],
    country: 'Iran',
    motivation: 'Espionage / Dissident surveillance',
  },
  {
    id: 'act_oilrig',
    name: 'OilRig',
    slug: 'oilrig',
    aliases: ['APT34', 'Helix Kitten', 'Chrysene', 'Hazel Sandstorm'],
    country: 'Iran',
    motivation: 'Regional espionage / Critical infrastructure',
  },
  {
    id: 'act_fin7',
    name: 'FIN7',
    slug: 'fin7',
    aliases: ['Carbanak', 'Navigator Group', 'ELBRUS'],
    country: 'Eastern Europe / Global',
    motivation: 'Financial cybercrime / Ransomware syndication',
  },
];

// ── CANONICAL MALWARE REGISTRY ───────────────────────────────────
export const CANONICAL_MALWARE: CanonicalMalware[] = [
  {
    id: 'mw_cobalt-strike',
    name: 'Cobalt Strike',
    slug: 'cobalt-strike',
    aliases: ['Cobalt Strike Beacon', 'CS Beacon', 'Beacon'],
    family: 'C2 Framework / Post-Exploitation',
  },
  {
    id: 'mw_shadowpad',
    name: 'ShadowPad',
    slug: 'shadowpad',
    aliases: ['ShadowPad RAT', 'PoisonIvy Successor'],
    family: 'Modular Remote Access Trojan',
  },
  {
    id: 'mw_lumma',
    name: 'Lumma',
    slug: 'lumma',
    aliases: ['LummaC2', 'Lumma Stealer', 'LummaC2 Stealer'],
    family: 'Information Stealer',
  },
  {
    id: 'mw_mimikatz',
    name: 'Mimikatz',
    slug: 'mimikatz',
    aliases: ['Mimikatz Credential Dumper'],
    family: 'Credential Dumper / LSASS Injection',
  },
  {
    id: 'mw_qakbot',
    name: 'QakBot',
    slug: 'qakbot',
    aliases: ['QBot', 'QuakBot', 'Pinkslipbot'],
    family: 'Banking Trojan / Loader',
  },
  {
    id: 'mw_emotet',
    name: 'Emotet',
    slug: 'emotet',
    aliases: ['Geodo', 'Heodo'],
    family: 'Modular Botnet / Malware Dropper',
  },
  {
    id: 'mw_asyncrat',
    name: 'AsyncRAT',
    slug: 'asyncrat',
    aliases: ['Async RAT'],
    family: 'Open-Source Remote Access Trojan',
  },
  {
    id: 'mw_redline',
    name: 'RedLine',
    slug: 'redline',
    aliases: ['RedLine Stealer'],
    family: 'Information Stealer',
  },
  {
    id: 'mw_plugx',
    name: 'PlugX',
    slug: 'plugx',
    aliases: ['Korplug', 'Sogu', 'DESTROY RAT'],
    family: 'Modular Remote Access Trojan',
  },
  {
    id: 'mw_lockbit_payload',
    name: 'LockBit 3.0',
    slug: 'lockbit-3-0',
    aliases: ['LockBit Black payload'],
    family: 'Ransomware Encryptor',
  },
  {
    id: 'mw_kv_botnet',
    name: 'KV-Botnet',
    slug: 'kv-botnet',
    aliases: ['KV botnet', 'KV-bot'],
    family: 'SOHO Router Botnet / Covert Proxy Network',
  },
];

/**
 * Resolves an actor string to its canonical identity.
 * Returns null if no definitive canonical match or ambiguous.
 */
export function resolveActor(input: string): CanonicalActor | null {
  const normalized = input.trim().toLowerCase();
  
  for (const actor of CANONICAL_ACTORS) {
    if (actor.name.toLowerCase() === normalized || actor.slug === normalized) {
      return actor;
    }
    for (const alias of actor.aliases) {
      if (alias.toLowerCase() === normalized) {
        return actor;
      }
    }
  }

  return null;
}

/**
 * Resolves a malware string to its canonical identity.
 */
export function resolveMalware(input: string): CanonicalMalware | null {
  const normalized = input.trim().toLowerCase();
  
  for (const mw of CANONICAL_MALWARE) {
    if (mw.name.toLowerCase() === normalized || mw.slug === normalized) {
      return mw;
    }
    for (const alias of mw.aliases) {
      if (alias.toLowerCase() === normalized) {
        return mw;
      }
    }
  }

  return null;
}

/**
 * Normalizes a CVE string to standard uppercase CVE-YYYY-NNNN+
 */
export function resolveVulnerability(input: string): string | null {
  const match = input.trim().match(/CVE-\d{4}-\d{4,7}/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Normalizes IOC values and verifies format validity.
 */
export function resolveIOC(type: 'ipv4' | 'sha256' | 'md5' | 'domain', value: string): string | null {
  const v = value.trim();
  if (type === 'ipv4') {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(v) ? v : null;
  }
  if (type === 'sha256') {
    return /^[a-fA-F0-9]{64}$/.test(v) ? v.toLowerCase() : null;
  }
  if (type === 'md5') {
    return /^[a-fA-F0-9]{32}$/.test(v) ? v.toLowerCase() : null;
  }
  if (type === 'domain') {
    const d = v.toLowerCase();
    if (['t.me', 'telegram.org', 'google.com', 'github.com', 'x.com'].includes(d)) return null;
    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,6}$/.test(d) ? d : null;
  }
  return null;
}
