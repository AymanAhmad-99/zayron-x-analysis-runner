import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { VulnerabilityList } from "../../components/VulnerabilityList";
import { getVulnerabilities } from "../../lib/api";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";

export const revalidate = 300;

const PAGE_SIZE = 25;

type Props = {
  searchParams?: Promise<{ page?: string; severity?: string; q?: string }>;
};

const loadVulnerabilitiesPage = cache((limit: number, offset: number, severity: string, q: string) =>
  getVulnerabilities({
    limit,
    offset,
    severity: severity || undefined,
    q: q || undefined,
  }),
);

function parseStrictPage(raw?: string): number | null {
  if (raw === undefined || raw.trim() === "") return 1;
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

function pageUrl(page: number): string {
  return page <= 1 ? "/intelligence/vulnerabilities" : `/intelligence/vulnerabilities?page=${page}`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const page = parseStrictPage(params.page);
  const severity = (params.severity ?? "").trim().toUpperCase();
  const query = (params.q ?? "").trim();

  if (page === null) {
    return {
      title: "Page Not Found",
      robots: { index: false, follow: false },
    };
  }

  const filtered = Boolean(severity || query);
  const initial = await loadVulnerabilitiesPage(PAGE_SIZE, (page - 1) * PAGE_SIZE, severity, query);
  const total = initial.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (initial.state !== "error" && page > totalPages) {
    return {
      title: "Page Not Found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = filtered ? "/intelligence/vulnerabilities" : pageUrl(page);
  const title = page > 1 ? `Vulnerabilities — Page ${page}` : "Vulnerabilities";
  const description =
    "Assessed vulnerabilities with CVSS, EPSS and CISA KEV truth states, severity, cited evidence and publication status.";

  return {
    title,
    description,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: !filtered }),
    openGraph: buildOpenGraph({
      title: `${title} | ZAYRON-X`,
      description,
      path: canonical,
      type: "website",
    }),
  };
}

export default async function VulnerabilitiesPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const page = parseStrictPage(params.page);
  if (page === null) notFound();

  const severity = (params.severity ?? "").trim().toUpperCase();
  const query = (params.q ?? "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  const initial = await loadVulnerabilitiesPage(PAGE_SIZE, offset, severity, query);
  if (initial.state === "error") {
    throw new Error("Vulnerability catalog temporarily unavailable");
  }

  const total = initial.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) notFound();
  const site = getSiteUrl();
  const canonicalPath = pageUrl(page);
  const hasPrev = page > 1 && !severity && !query;
  const hasNext = offset + PAGE_SIZE < total && !severity && !query;

  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: canonicalPath,
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Intelligence", path: "/intelligence" },
      { name: "Vulnerabilities", path: "/intelligence/vulnerabilities" },
    ],
    primary: {
      "@type": "CollectionPage",
      name: page > 1 ? `Vulnerability Intelligence — Page ${page}` : "Vulnerability Intelligence",
      description: "Authoritative CVE advisories with CVSS, EPSS, CISA KEV and exploitation telemetry.",
      isAccessibleForFree: true,
      numberOfItems: total,
    },
  });

  return (
    <>
      {hasPrev ? <link rel="prev" href={`${site}${pageUrl(page - 1)}`} /> : null}
      {hasNext ? <link rel="next" href={`${site}${pageUrl(page + 1)}`} /> : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <VulnerabilityList
        initial={initial}
        initialPage={page}
        initialSeverity={severity}
        initialQuery={query}
      />
    </>
  );
}
