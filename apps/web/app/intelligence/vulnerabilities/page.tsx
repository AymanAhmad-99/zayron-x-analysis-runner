import type { Metadata } from "next";
import { VulnerabilityList } from "../../components/VulnerabilityList";
import { getVulnerabilities } from "../../lib/api";
import { buildOpenGraph } from "../../lib/seo";

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
  return <VulnerabilityList initial={initial} />;
}
