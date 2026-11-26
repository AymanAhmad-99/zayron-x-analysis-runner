import { getVulnerabilityDetail } from "../../../../lib/api";
import { ogCardResponse } from "../../../../lib/ogCard";
import {
  computeOgPriority,
  formatKevCell,
  formatPocCell,
  formatStoredState,
  ogSeverityBand,
} from "../../../../lib/ogCardPolicy";

type Props = { params: Promise<{ cveId: string }> };

/** Card reflects stored intelligence, and is cached at the edge for a day. */
export const dynamic = "force-dynamic";

function text(value: unknown, fallback = "N/A"): string {
  if (value === null || value === undefined) return fallback;
  const out = String(value).trim();
  return out || fallback;
}

function epssPercent(value: unknown): string {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return "N/A";
  const percent = raw <= 1 ? raw * 100 : raw;
  return `${percent.toFixed(1)}%`;
}

export async function GET(_request: Request, { params }: Props) {
  const { cveId } = await params;
  const id = decodeURIComponent(cveId).toUpperCase();
  const result = await getVulnerabilityDetail(id);
  const report = result.data;
  const advisory = report?.public_advisory ?? null;
  const brief = (report?.strategic_brief ?? null) as Record<string, any> | null;
  const pocs = Array.isArray((report as any)?.pocs) ? (report as any).pocs : [];

  const vendor = text(advisory?.affected_vendor, "");
  const product = text(advisory?.affected_product, "");
  // Deduplicate: a product that already names its vendor ("Red Hat" /
  // "Red Hat Enterprise Linux 10") must not repeat it in the headline.
  const headline = product.toLowerCase().startsWith(vendor.toLowerCase()) && vendor
    ? product
    : [vendor, product].filter(Boolean).join(" / ") || "VERIFIED ADVISORY";

  const knownExploited = advisory?.known_exploited === true;
  const cvss = advisory?.cvss_score ?? null;
  const band = ogSeverityBand({ cvss, kev: knownExploited });
  const pocCount = pocs.length;

  // An analyst priority is used verbatim when it exists; otherwise the card
  // carries the deterministic KEV/CVSS/EPSS/PoC band — never `UNBRIEFED`.
  const analystPriority = text(brief?.operational_prioritization?.priority, "");
  const priority = analystPriority || computeOgPriority({ kev: knownExploited, cvss, epss: advisory?.epss_score, pocCount });

  return ogCardResponse({
    badge: band.label,
    accentHex: band.accentHex,
    title: id,
    subtitle: headline,
    cells: [
      { label: "PRIORITY", value: priority },
      { label: "CVSS", value: text(cvss, "N/A") },
      { label: "EPSS", value: epssPercent(advisory?.epss_score) },
      { label: "CISA KEV", value: formatKevCell(knownExploited ? "LISTED" : advisory?.cisa_kev) },
      { label: "EXPLOIT / POC", value: formatPocCell(pocCount) },
    ],
    footer: advisory?.provenance_state
      ? `ZAYRON-X.CO  ·  ${formatStoredState(advisory.provenance_state)} SOURCE INTELLIGENCE`
      : undefined,
  });
}
