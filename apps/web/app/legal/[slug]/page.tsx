import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalDocumentBySlug, legalSlugs } from "../../lib/legal/documents";
import { LegalDocument } from "../../components/LegalDocument";
import { isPreviewDeployment } from "../../lib/siteConfig";
import { resolvePageRobots } from "../../lib/seo";

export function generateStaticParams() {
  return legalSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = legalDocumentBySlug[slug];
  if (!doc) {
    return { title: "Document not found", robots: { index: false, follow: false } };
  }
  const utilityNoindex = slug === "intelligence-disclaimer";
  return {
    title: doc.title,
    description: doc.purpose,
    alternates: { canonical: `/legal/${doc.slug}` },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: !utilityNoindex }),
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDocumentBySlug[slug];
  if (!doc) notFound();
  return <LegalDocument doc={doc} />;
}
