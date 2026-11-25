import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { VulnerabilityDetail } from "../../../components/VulnerabilityDetail";
import { getVulnerabilityDetail, type VulnerabilityDetail as Detail } from "../../../lib/api";
import { articleJsonLd, serializeJsonLd } from "../../../lib/jsonLd";
import { getSiteUrl, isPreviewDeployment } from "../../../lib/siteConfig";
import { resolvePageRobots, vulnerabilitySeoTitle } from "../../../lib/seo";

type Props = { params: Promise<{ id: string }> };

/**
 * Phase 5A — this page must reflect the stored intelligence on every request.
 *
 * A cached full-route render kept serving a pre-enrichment advisory and a v3
 * brief long after the row had been re-enriched and re-briefed. The API already
 * applies its own short `Cache-Control`, so rendering per request here costs one
 * in-worker read and removes an entire class of stale intelligence.
 */
export const dynamic = "force-dynamic";

/**
 * Wave 4B audit — `generateMetadata` and the page body both need this record.
 * React's `cache` memoises the loader for the duration of ONE server request,
 * so a page render performs a single API call instead of two.
 */
const loadVulnerability = cache((id: string) => getVulnerabilityDetail(id));

const canonicalPath = (id: string) => `/intelligence/vulnerabilities/${encodeURIComponent(id)}`;

/** WITHHELD items are never indexable and never carry a JSON-LD node. */
function isWithheld(report: Detail | null | undefined): boolean {
  if (!report) return true;
  const status = (report.publication_status ?? report.status ?? "").toUpperCase();
  return status === "WITHHELD";
}

/** First real description available; never generated when the API had none. */
function realDescription(report: Detail): string | null {
  const summary = (report.summary ?? "").trim();
  if (summary) return summary;
  const executive = (report.structured_report?.assessment?.executive_assessment ?? "").trim();
  if (executive) return executive;
  const body = (report.body ?? "").trim();
  return body || null;
}

function clampDescription(value: string | null): string | undefined {
  if (!value) return undefined;
  const single = value.replace(/\s+/g, " ").trim();
  if (!single) return undefined;
  return single.length <= 160 ? single : `${single.slice(0, 157).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await loadVulnerability(id);
  const report = result.data;

  if (!report || isWithheld(report)) {
    return {
      title: "Vulnerability unavailable",
      robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: false }),
      alternates: { canonical: canonicalPath(id) },
    };
  }

  const identifier = report.intelligence_id || id;
  const advisory = report.public_advisory;
  // Gate 3A.5 — entity-rich title (CVE · vendor/product · CVSS band) instead of
  // the generic "CVE-x Security Advisory" ingest title.
  const title = advisory
    ? vulnerabilitySeoTitle({
        cveId: advisory.cve_id || identifier,
        vendor: advisory.affected_vendor,
        product: advisory.affected_product,
        cvss: advisory.cvss_score,
      })
    : report.title
      ? `${identifier} — ${report.title}`
      : identifier;
  const description = clampDescription(advisory?.description ?? realDescription(report));
  const path = canonicalPath(id);

  return {
    title,
    description,
    // Preview ALWAYS wins here: verified CVE or not, a preview host is never indexable.
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
      siteName: "ZAYRON-X",
      // PHASE 7D — programmatic edge card, rendered once and CDN-cached a day.
      images: [{ url: `/api/og/cve/${encodeURIComponent(identifier)}`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/cve/${encodeURIComponent(identifier)}`],
    },
  };
}

export default async function VulnerabilityDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await loadVulnerability(id);

  // No record ⇒ a real 404 (never an empty indexable dossier). A transport
  // failure is NOT a 404: the component renders its explicit error surface.
  if (result.state === "empty" || (result.state === "success" && !result.data)) notFound();

  const report = result.data;
  const jsonLd =
    report && !isWithheld(report)
      ? articleJsonLd({
          type: "TechArticle",
          url: `${getSiteUrl()}${canonicalPath(id)}`,
          siteUrl: getSiteUrl(),
          identifier: report.intelligence_id ?? id,
          headline: report.title ?? null,
          description: clampDescription(realDescription(report)) ?? null,
          // Real timestamps only — omitted when the API did not provide one.
          datePublished: report.published_at ?? null,
          dateModified: report.updated_at ?? null,
        })
      : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      <VulnerabilityDetail id={id} initial={result} />
    </>
  );
}
