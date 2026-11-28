import type { Metadata } from "next";
import { SearchClient } from "../components/SearchClient";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "Search",
  description: "Search ZAYRON-X intelligence records across vulnerabilities, malware families, threat actors, and advisories.",
  alternates: { canonical: "/search" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: false }),
};

export default function SearchPage() {
  return <SearchClient />;
}
