/**
 * PHASE 10A-POLISH — deterministic inputs for the editorial cover artwork.
 *
 * Pure functions, no DOM and no randomness: the same briefing slug always
 * produces the same composition, so a card, a lead hero and an article header
 * never disagree and two renders of the same page are byte-identical.
 */

export type NewsArtMotif = "KEV" | "VULNERABILITY" | "MALWARE" | "ACTOR" | "SUPPLY_CHAIN" | "ADVISORY";

/** Category → geometric motif. Unknown categories fall back to the advisory grid. */
export function newsArtMotif(category: string): NewsArtMotif {
  switch (String(category ?? "").trim().toUpperCase()) {
    case "EXPLOITATION":
    case "EXPLOIT":
    case "KEV":
      return "KEV";
    case "VULNERABILITY":
      return "VULNERABILITY";
    case "MALWARE":
      return "MALWARE";
    case "THREAT_ACTOR":
    case "ACTOR":
      return "ACTOR";
    case "SUPPLY_CHAIN":
      return "SUPPLY_CHAIN";
    default:
      return "ADVISORY";
  }
}

const MOTIF_LABEL: Record<NewsArtMotif, string> = {
  KEV: "CISA KEV",
  VULNERABILITY: "VULNERABILITY",
  MALWARE: "MALWARE",
  ACTOR: "THREAT ACTOR",
  SUPPLY_CHAIN: "SUPPLY CHAIN",
  ADVISORY: "ADVISORY",
};

/** The single corner pill. Real typography, never artwork text. */
export function newsArtLabel(category: string): string {
  return MOTIF_LABEL[newsArtMotif(category)];
}

/** Deterministic 32-bit seed (FNV-1a) so a briefing always renders identically. */
export function newsArtSeed(value: string): number {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Seeded PRNG (mulberry32): same seed, same sequence, no `Math.random`. */
export function newsArtRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The one entity chip worth printing: a KEV-listed CVE first, then the first
 * catalog-verified mention. Returns null so the chip is simply absent.
 */
interface NewsArtArticle {
  graph_enrichment?: { cves?: Array<{ cve_id?: string; cisa_kev?: boolean }> };
  mentions?: Array<{ entity_label?: string; in_catalog?: number }>;
}

export function newsArtEntity(article: unknown): string | null {
  if (!article || typeof article !== 'object') return null;
  const row = article as NewsArtArticle;
  const cve = row.graph_enrichment?.cves?.find((entry) => Boolean(entry?.cve_id));
  if (cve?.cve_id) return cve.cisa_kev ? `${cve.cve_id} · KEV` : cve.cve_id;
  const linked = (row.mentions ?? []).find((mention) => mention?.in_catalog === 1 && mention?.entity_label);
  return linked?.entity_label ?? null;
}
