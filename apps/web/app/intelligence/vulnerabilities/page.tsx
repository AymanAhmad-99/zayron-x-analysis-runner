import type { Metadata } from "next";
import { VulnerabilityList } from "../../components/VulnerabilityList";
import { getVulnerabilities } from "../../lib/api";
import { buildLinkedJsonLdGraph, buildOpenGraph } from "../../lib/seo";
import { getSiteUrl } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Vulnerabilities",
  description:
    "Assessed vulnerabilities with CVSS, EPSS and CISA KEV truth states, severity, cited evidence and publication status.",
  alternates: { canonical: "/intelligence/vulnerabilities" },
  openGraph: buildOpenGraph({
    title: "Vulnerabilities | ZAYRON-X",
    description: "Assessed vulnerabilities with CVSS, EPSS and CISA KEV truth states.",
    path: "/intelligence/vulnerabilities",
    type: "website",
  }),
};

export default async function VulnerabilitiesPage() {
  // Wave 4B — first page is fetched in the RSC and rendered into the SSR HTML.
  const initial = await getVulnerabilities({ limit: 25, offset: 0 });
  // PHASE 9B — one linked @graph per page, even on a client-widget list page.
  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: getSiteUrl(),
    path: "/intelligence/vulnerabilities",
    primary: {
      "@type": "CollectionPage",
      name: "Vulnerability Intelligence",
      description: "Authoritative CVE advisories with CVSS, EPSS, CISA KEV and exploitation telemetry.",
      isAccessibleForFree: true,
      numberOfItems: initial.data?.total ?? 0,
    },
  });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <VulnerabilityList initial={initial} />
    </>
  );
}
