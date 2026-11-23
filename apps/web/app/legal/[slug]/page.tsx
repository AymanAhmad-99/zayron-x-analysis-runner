import { notFound } from "next/navigation";
import { legalDocumentBySlug, legalSlugs } from "../../lib/legal/documents";
import { LegalDocument } from "../../components/LegalDocument";

export function generateStaticParams() {
  return legalSlugs.map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDocumentBySlug[slug];
  if (!doc) notFound();
  return <LegalDocument doc={doc} />;
}
