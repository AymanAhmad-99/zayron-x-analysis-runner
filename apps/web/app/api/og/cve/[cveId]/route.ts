import { getVulnerabilityDetail } from "../../../../lib/api";
import { ogCardResponse } from "../../../../lib/ogCard";

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

  const vendor = text(advisory?.affected_vendor, "");
  const product = text(advisory?.affected_product, "");
  // Deduplicate: a vendor that already names the product must not appear twice.
  const headline = [vendor, product]
    .filter(Boolean)
    .filter((part, index, all) => all.findIndex((other) => other.toLowerCase() === part.toLowerCase()) === index)
    .join(" / ") || "VERIFIED ADVISORY";

  const kev = advisory?.cisa_kev
    ? String(advisory.cisa_kev)
    : advisory?.known_exploited
      ? "LISTED"
      : "NOT LISTED";

  return ogCardResponse({
    badge: advisory ? "CRITICAL ADVISORY" : "CVE ADVISORY",
    title: id,
    subtitle: headline,
    cells: [
      { label: "PRIORITY", value: text(brief?.operational_prioritization?.priority, "UNBRIEFED") },
      { label: "CVSS", value: text(advisory?.cvss_score, "N/A") },
      { label: "EPSS", value: epssPercent(advisory?.epss_score) },
      { label: "CISA KEV", value: kev },
    ],
  });
}
