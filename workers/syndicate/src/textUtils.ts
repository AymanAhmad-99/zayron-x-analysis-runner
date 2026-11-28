/** Shared text, grapheme, UTF-8 byte-offset, URL, and XML helpers. */
import type { SyndicationItem } from "./types";

const UTF8_ENCODER = new TextEncoder();

export function normalizeSiteUrl(raw?: string): string {
  const clean = String(raw ?? "").trim().replace(/\/+$/, "");
  return clean || "https://zayron-x.co";
}

export function collapseWhitespace(text: string): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

export function stripUrls(text: string): string {
  return collapseWhitespace(String(text ?? "").replace(/https?:\/\/\S+/gi, ""));
}

export function normalizeHashtag(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^#+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "");
}

/** Pick 1–maxTags clean hashtags with defensive framing (no hype). */
export function selectHashtags(
  item: Pick<SyndicationItem, "itemType" | "isKev" | "tags">,
  maxTags = 2,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const clean = normalizeHashtag(raw);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(clean);
  };

  for (const raw of item.tags ?? []) {
    push(raw);
    if (result.length >= maxTags) return result;
  }

  push("ThreatIntel");
  if (result.length >= maxTags) return result;

  if (item.isKev || item.itemType === "kev") {
    push("CISAKEV");
  } else if (item.itemType === "cve") {
    push("CVE");
  } else {
    push("Cybersecurity");
  }
  return result.slice(0, maxTags);
}

/** Split text into Unicode grapheme clusters (safe fallback when Segmenter is absent). */
export function splitGraphemes(text: string): string[] {
  const str = String(text ?? "");
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(str), (entry) => entry.segment);
  }
  return Array.from(str);
}

export function graphemeLength(text: string): number {
  return splitGraphemes(text).length;
}

/** Clamp text cleanly to <= maxGraphemes using a single-grapheme ellipsis ("…"). */
export function truncateGraphemes(text: string, maxGraphemes: number): string {
  const clean = collapseWhitespace(text);
  if (maxGraphemes <= 0) return "";
  const graphemes = splitGraphemes(clean);
  if (graphemes.length <= maxGraphemes) return clean;
  if (maxGraphemes === 1) return "…";
  return `${graphemes.slice(0, maxGraphemes - 1).join("").trimEnd()}…`;
}

/** Compute exact UTF-8 byte offsets for a substring within `fullText`. */
export function utf8ByteRange(
  fullText: string,
  needle: string,
  searchFromChar = 0,
): { byteStart: number; byteEnd: number; charEnd: number } | null {
  if (!needle) return null;
  const charStart = fullText.indexOf(needle, searchFromChar);
  if (charStart < 0) return null;
  const byteStart = UTF8_ENCODER.encode(fullText.slice(0, charStart)).byteLength;
  const byteEnd = byteStart + UTF8_ENCODER.encode(needle).byteLength;
  return { byteStart, byteEnd, charEnd: charStart + needle.length };
}

export function decodeXmlEntities(raw: string): string {
  const withoutCdata = String(raw ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ");
  return collapseWhitespace(
    withoutCdata
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&"),
  );
}
