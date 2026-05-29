/**
 * ZAYRON-X — Intelligence Orchestration Engine
 *
 * Persona Selection: Maps every ingested intelligence item to the most
 * qualified Global Analyst Core member based on domain specialization.
 *
 * Expert Note Generation: Produces a "Professional Analyst Opinion" that
 * reflects the assigned analyst's unique technical background, nationality,
 * and professional experience — not a generic summary.
 */

import type { IntelligenceChannel } from "./channels";

/* ============================================================
 * Global Analyst Core Registry (21 Personas)
 * ============================================================ */

export interface AnalystProfile {
  id: string;        // DB UUID (populated post-seed)
  name: string;
  nationality: string;
  specialization: string;
  /** Keywords that trigger this analyst's assignment */
  domainKeywords: string[];
  /** Linguistic/cultural edge this analyst brings */
  culturalContext: string;
  /** The analyst's signature analytical lens */
  analyticalLens: string;
}

/**
 * In-memory cache hydrated from the database on first orchestration run.
 * Use `loadAnalystRegistry()` to populate.
 */
let analystRegistry: AnalystProfile[] = [];

export function setAnalystRegistry(profiles: AnalystProfile[]) {
  analystRegistry = profiles;
}

export function getAnalystRegistry(): ReadonlyArray<AnalystProfile> {
  return analystRegistry;
}

/**
 * Hydrates the in-memory analyst registry from the `analysts` database table.
 * Maps DB rows to AnalystProfile structs using keyword inference from specializations.
 * Call once at daemon startup before any `selectLeadAnalyst()` invocation.
 */
export async function loadAnalystRegistry(db: any) {
  const { analysts } = await import("../db/schema");
  const rows = await db.select().from(analysts);

  analystRegistry = rows.map((row: any) => {
    const specializations: string[] = row.specializations ?? [];
    const domainKeywords = deriveDomainKeywords(specializations, row.title ?? "", row.bio ?? "");
    const nationality = extractNationality(row.title ?? "", ANALYST_NATIONALITY_MAP);

    return {
      id: row.id,
      name: row.name,
      nationality,
      specialization: specializations[0] ?? "General Intelligence",
      domainKeywords,
      culturalContext: buildCulturalContext(nationality, specializations),
      analyticalLens: buildAnalyticalLens(specializations),
    };
  });

  return analystRegistry.length;
}

/* ============================================================
 * Nationality & Domain Mapping Tables
 * ============================================================ */

const ANALYST_NATIONALITY_MAP: Record<string, string> = {
  "Viktor Volkov": "Russian",
  "Arjun Mehta": "Indian",
  "Eli Ben-Zvi": "Israeli",
  "Omar Al-Fayed": "Egyptian",
  "Carlos Méndez": "Mexican",
  "Sarah Jenkins": "American",
  "Chen Wei": "Singaporean",
  "Giovanni Rossi": "Italian",
  "Luc Dumont": "French",
  "Aiko Tanaka": "Japanese",
  "Hans Müller": "German",
  "Fatima Al-Zahra": "Jordanian",
  "Santiago Silva": "Brazilian",
  "Yuna Kim": "South Korean",
  "Lars Jensen": "Danish",
  "Isabella Conti": "Argentinian",
  "Mustafa Demir": "Turkish",
  "Priya Sharma": "British-Indian",
  "Nour Al-Din": "Lebanese",
  "Mateo Hernandez": "Spanish",
  "Sophie Lefebvre": "Belgian",
};

function extractNationality(title: string, map: Record<string, string>): string {
  for (const [name, nationality] of Object.entries(map)) {
    if (title.includes(name)) return nationality;
  }
  return "Unknown";
}

function deriveDomainKeywords(
  specializations: string[],
  _title: string,
  _bio: string
): string[] {
  const keywords: string[] = [];
  for (const spec of specializations) {
    keywords.push(spec);
    // Split compound specs into individual words
    for (const word of spec.split(/[\s\/-]+/)) {
      const w = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (w.length > 2 && !keywords.some((k) => k.toLowerCase().includes(w))) {
        keywords.push(word);
      }
    }
  }
  return keywords;
}

function buildCulturalContext(nationality: string, specializations: string[]): string {
  const contexts: Record<string, string> = {
    Russian: "monitoring Russian-language underground forums and Eastern European APT ecosystems",
    Indian: "tracking South Asian threat actors and securing large-scale cloud deployments across the subcontinent",
    Israeli: "analyzing Middle Eastern cyber operations and zero-day markets",
    Egyptian: "monitoring MENA critical infrastructure threats and Arabic-language darknet forums",
    Mexican: "tracking Latin American financial cybercrime and cartel-linked digital operations",
    American: "assessing strategic cyber warfare developments and US critical infrastructure threats",
    Singaporean: "monitoring Southeast Asian semiconductor supply chain and hardware security risks",
    Italian: "tracking European malware campaigns and Mediterranean-region cybercrime",
    French: "monitoring Francophone industrial espionage and European OSINT landscapes",
    Japanese: "tracking Asia-Pacific IoT threats and robotics vulnerability disclosures",
    German: "monitoring European automotive cybersecurity and industrial control system threats",
    Jordanian: "tracking Arabic-language social engineering campaigns and Middle Eastern HUMINT",
    Brazilian: "monitoring Latin American banking malware and Portuguese-language darknet activity",
    "South Korean": "tracking East Asian mobile spyware and Korean-language threat actor forums",
    Danish: "monitoring maritime and Nordic-region logistics cyber threats",
    Argentinian: "tracking Spanish-language dark web markets and Latin American underground forums",
    Turkish: "monitoring UAV/drone threats and Turkish-language cybercriminal networks",
    "British-Indian": "assessing AI-generated disinformation and deepfake-enabled fraud operations",
    Lebanese: "monitoring Levantine network threats and Arabic-language perimeter defense discussions",
    Spanish: "tracking European GDPR enforcement actions and Spanish-language privacy forums",
    Belgian: "monitoring European cryptographic standards and blockchain protocol vulnerabilities",
  };
  return contexts[nationality] ?? `monitoring global ${specializations[0]?.toLowerCase() ?? "cyber"} developments`;
}

function buildAnalyticalLens(specializations: string[]): string {
  if (specializations.length >= 2 && specializations[1]) {
    return `${specializations[0]} cross-referenced with ${specializations[1].toLowerCase()}`;
  }
  return specializations[0] ?? "general threat intelligence analysis";
}

/* ============================================================
 * Persona Selection — Domain-Aware Matching
 * ============================================================ */

interface MatchResult {
  analyst: AnalystProfile;
  score: number;
  matchedKeywords: string[];
}

/**
 * Scores each analyst against the raw content text and channel metadata.
 * Returns the highest-scoring analyst as the "Lead Investigator."
 */
export function selectLeadAnalyst(
  rawContent: string,
  channel: IntelligenceChannel
): MatchResult {
  if (analystRegistry.length === 0) {
    throw new Error(
      "Analyst registry is empty. Run seed-analysts and call loadAnalystRegistry() first."
    );
  }

  const contentLower = rawContent.toLowerCase();
  const results: MatchResult[] = analystRegistry.map((analyst) => {
    const matchedKeywords: string[] = [];

    // Score based on domain keyword hits in content
    let score = 0;
    for (const kw of analyst.domainKeywords) {
      const kwLower = kw.toLowerCase();
      if (contentLower.includes(kwLower)) {
        matchedKeywords.push(kw);
        score += 3; // Direct keyword match
      }
    }

    // Category-to-specialization affinity bonus
    const categoryAffinity: Record<string, string[]> = {
      vulnerabilities: ["exploit", "cve", "zero-day", "vulnerability", "patch", "bug bounty"],
      threat_intel: ["apt", "threat actor", "campaign", "ttp", "indicator", "malware", "ransomware"],
      osint: ["osint", "open source", "reconnaissance", "social media", "monitoring"],
      cyber_news: ["breach", "news", "industry", "regulation", "policy", "cyber"],
    };

    const affinityKeywords = categoryAffinity[channel.category] ?? [];
    for (const ak of affinityKeywords) {
      if (contentLower.includes(ak)) {
        score += 1;
      }
    }

    // Channel language match to analyst cultural context
    const analystNationality = analyst.nationality.toLowerCase();
    if (channel.lang === "ru" && analystNationality.includes("russian")) {
      score += 2;
    }
    if (channel.lang === "en" && !analystNationality.includes("russian")) {
      score += 1;
    }

    return { analyst, score, matchedKeywords };
  });

  // Sort descending by score; break ties with deterministic shuffle
  results.sort((a, b) => b.score - a.score);

  const topResult = results[0]!;

  // If no meaningful match, return the most generalist analyst
  if (topResult.score === 0) {
    // Rotate through generalists using content hash as seed
    const hash = simpleHash(rawContent);
    return results[hash % results.length]!;
  }

  return topResult;
}

/* ============================================================
 * Expert Note Generation
 * ============================================================ */

/**
 * Generates a "Professional Analyst Opinion" that reflects the assigned
 * analyst's unique background, nationality, and technical specialty.
 *
 * The note is structured as a first-person analytical assessment that
 * would appear credible coming from this specific expert.
 */
export function generateExpertNote(
  rawContent: string,
  channel: IntelligenceChannel,
  match: MatchResult
): string {
  const { analyst, matchedKeywords } = match;

  const templates = buildOpinionTemplates(analyst, matchedKeywords, channel);

  // Select template based on content signals
  const contentLower = rawContent.toLowerCase();
  let template: string;

  if (
    contentLower.includes("critical") ||
    contentLower.includes("emergency") ||
    contentLower.includes("zero-day") ||
    contentLower.includes("exploit")
  ) {
    template = templates.critical;
  } else if (
    contentLower.includes("campaign") ||
    contentLower.includes("apt") ||
    contentLower.includes("threat actor") ||
    contentLower.includes("group")
  ) {
    template = templates.campaign;
  } else if (
    contentLower.includes("patch") ||
    contentLower.includes("update") ||
    contentLower.includes("fix") ||
    contentLower.includes("advisory")
  ) {
    template = templates.advisory;
  } else {
    template = templates.general;
  }

  // Append cultural signature
  const signature = buildCulturalSignature(analyst);
  return `${template}\n\n${signature}`;
}

/* ============================================================
 * Opinion Template Builder
 * ============================================================ */

interface OpinionTemplates {
  critical: string;
  campaign: string;
  advisory: string;
  general: string;
}

function buildOpinionTemplates(
  analyst: AnalystProfile,
  matchedKeywords: string[],
  channel: IntelligenceChannel
): OpinionTemplates {
  const kwRef = matchedKeywords.length > 0
    ? `My focus on ${matchedKeywords.slice(0, 3).join(", ")} gives me specific insight here.`
    : `My background in ${analyst.specialization} provides relevant context for this intelligence.`;

  return {
    critical: [
      `From ${analyst.name}'s Desk — ${analyst.nationality}`,
      ``,
      `CRITICAL ASSESSMENT: This requires immediate escalation. ${kwRef}`,
      `Drawing on ${analyst.analyticalLens}, I assess this as a high-impact event with cascading implications across the threat landscape. The ${channel.category.replace("_", " ")} vector aligns with patterns I've tracked extensively through ${analyst.culturalContext}.`,
      ``,
      `I recommend the following immediate actions:`,
      `1. Correlate with existing IOC repositories within the hour`,
      `2. Notify perimeter defense teams of any matching indicators`,
      `3. Prepare an executive flash brief for CISO distribution`,
    ].join("\n"),

    campaign: [
      `From ${analyst.name}'s Desk — ${analyst.nationality}`,
      ``,
      `CAMPAIGN ANALYSIS: This intelligence fits a broader pattern of coordinated activity. ${kwRef}`,
      `Through the lens of ${analyst.analyticalLens}, I evaluate the adversary's TTPs and assess their operational maturity. My experience with ${analyst.culturalContext} informs my read on the geopolitical dimensions at play.`,
      ``,
      `Key analytical observations:`,
      `1. The adversary's operational security posture suggests ${Math.random() > 0.5 ? "a well-resourced group with established infrastructure" : "an evolving threat actor refining their techniques"}`,
      `2. Sectoral targeting patterns indicate ${Math.random() > 0.5 ? "strategic intent rather than opportunistic exploitation" : "a systematic reconnaissance phase preceding a larger operation"}`,
      `3. Attribution confidence requires additional telemetry, but the TTP signature bears hallmarks consistent with known threat clusters`,
    ].join("\n"),

    advisory: [
      `From ${analyst.name}'s Desk — ${analyst.nationality}`,
      ``,
      `TECHNICAL ADVISORY: ${kwRef}`,
      `Evaluating this through ${analyst.analyticalLens}, I assess the remediation guidance with a critical eye. My work across ${analyst.culturalContext} has taught me that patches and mitigations must be validated against real-world exploitation chains, not just proof-of-concept code.`,
      ``,
      `Recommended validation steps:`,
      `1. Test the advisory against your specific asset inventory — generic applicability may mask edge cases`,
      `2. Verify that the proposed fix does not introduce regression in ${analyst.specialization.toLowerCase()} environments`,
      `3. Monitor for exploitation attempts targeting the window between disclosure and patch deployment`,
    ].join("\n"),

    general: [
      `From ${analyst.name}'s Desk — ${analyst.nationality}`,
      ``,
      `INTELLIGENCE ASSESSMENT: ${kwRef}`,
      `Analyzing this through ${analyst.analyticalLens}, I place this development within the broader ${channel.category.replace("_", " ")} landscape. My perspective is informed by ${analyst.culturalContext}.`,
      ``,
      `Notable considerations:`,
      `1. The intelligence value is amplified when cross-referenced with parallel reporting from allied channels`,
      `2. The ${analyst.specialization} angle reveals dimensions that a generalist assessment might miss`,
      `3. I recommend tracking this thread for 72 hours to establish trend directionality before committing to a formal intelligence product`,
    ].join("\n"),
  };
}

/* ============================================================
 * Cultural Signature — National/Perspective Flavor
 * ============================================================ */

function buildCulturalSignature(analyst: AnalystProfile): string {
  const sigils: Record<string, string> = {
    Russian: "— Viktor Volkov, Lead APT Analyst · ZAYRON-X Moscow Desk",
    Indian: "— Arjun Mehta, Cloud Security Principal · ZAYRON-X Bangalore Desk",
    Israeli: "— Eli Ben-Zvi, Zero-Day Research Director · ZAYRON-X Tel Aviv Desk",
    Egyptian: "— Omar Al-Fayed, Critical Infrastructure Lead · ZAYRON-X Cairo Desk",
    Mexican: "— Carlos Méndez, Fintech Cybercrime Director · ZAYRON-X Mexico City Desk",
    American: "— Sarah Jenkins, Cyber Warfare Policy Chief · ZAYRON-X Washington DC Desk",
    Singaporean: "— Chen Wei, Supply Chain Security Director · ZAYRON-X Singapore Desk",
    Italian: "— Giovanni Rossi, Malware Reverse Engineering Lead · ZAYRON-X Milan Desk",
    French: "— Luc Dumont, Industrial Espionage Section Chief · ZAYRON-X Paris Desk",
    Japanese: "— Aiko Tanaka, IoT Security Director · ZAYRON-X Tokyo Desk",
    German: "— Hans Müller, Automotive Security Lead · ZAYRON-X Stuttgart Desk",
    Jordanian: "— Fatima Al-Zahra, HUMINT & Social Engineering Director · ZAYRON-X Amman Desk",
    Brazilian: "— Santiago Silva, Banking Trojan Analysis Lead · ZAYRON-X Sao Paulo Desk",
    "South Korean": "— Yuna Kim, Mobile Forensics Director · ZAYRON-X Seoul Desk",
    Danish: "— Lars Jensen, Maritime Cyber-Security Lead · ZAYRON-X Copenhagen Desk",
    Argentinian: "— Isabella Conti, Dark Web Monitoring Director · ZAYRON-X Buenos Aires Desk",
    Turkish: "— Mustafa Demir, UAV Signal Intelligence Lead · ZAYRON-X Ankara Desk",
    "British-Indian": "— Priya Sharma, AI Ethics & Deepfake Detection Director · ZAYRON-X London Desk",
    Lebanese: "— Nour Al-Din, Network Perimeter Defense Lead · ZAYRON-X Beirut Desk",
    Spanish: "— Mateo Hernandez, Data Privacy & GDPR Director · ZAYRON-X Madrid Desk",
    Belgian: "— Sophie Lefebvre, Cryptography & Blockchain Audit Lead · ZAYRON-X Brussels Desk",
  };

  return sigils[analyst.nationality] ?? `— ${analyst.name} · ZAYRON-X Global Intelligence Network`;
}

/* ============================================================
 * Utility — Simple hash for tie-breaking
 * ============================================================ */

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
