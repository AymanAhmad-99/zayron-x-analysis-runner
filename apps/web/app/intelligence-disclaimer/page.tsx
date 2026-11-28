import type { Metadata } from "next";
import { LegalDocument } from "../components/LegalDocument";
import { legalDocumentBySlug } from "../lib/legal/documents";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

const doc = legalDocumentBySlug["intelligence-disclaimer"];

export const metadata: Metadata = {
  title: doc.title,
  description: doc.purpose,
  alternates: { canonical: "/legal/intelligence-disclaimer" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: false }),
};

export default function IntelligenceDisclaimerPage() {
  return <LegalDocument doc={doc} />;
}
