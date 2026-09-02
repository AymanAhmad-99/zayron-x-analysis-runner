import { notFound } from 'next/navigation';

interface Props { params: Promise<{ slug: string }> }

async function loadArticle(slug: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'https://zayron-x-api.aabusabih.workers.dev';
  const response = await fetch(`${base}/api/v1/articles/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  if (!response.ok) return null;
  const body = await response.json();
  return body?.data || body?.article || null;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) return { title: 'Intelligence Report | ZAYRON-X' };
  return {
    title: article.title,
    description: article.excerpt || article.dek || 'Evidence-backed ZAYRON-X intelligence report.',
    alternates: { canonical: `https://zayron-x.co/articles/${encodeURIComponent(article.slug || slug)}` },
    openGraph: { title: article.title, description: article.excerpt || article.dek || '' },
    twitter: { card: 'summary_large_image', title: article.title, description: article.excerpt || article.dek || '' },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article || !article.is_published) notFound();
  const canonical = `https://zayron-x.co/articles/${encodeURIComponent(article.slug || slug)}`;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
    description: article.excerpt || article.dek || '', datePublished: article.published_at, dateModified: article.updated_at, mainEntityOfPage: canonical };
  return <main className="min-h-screen bg-[#F7F7F5] text-[#111111] px-6 py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <article className="mx-auto max-w-4xl">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#FF6A00]">ZAYRON-X // Intelligence Report</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{article.title}</h1>
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-[#56606B]"><span>Severity: {article.severity || 'UNASSESSED'}</span><span>Confidence: {article.confidence ?? 'UNKNOWN'}</span><span>Version: 1</span></div>
      <p className="mt-8 text-xl leading-relaxed text-[#56606B]">{article.excerpt || article.dek || article.summary}</p>
      <section className="mt-12 border-t border-[#D9DDE2] pt-8"><h2 className="text-2xl font-bold">Assessment</h2><div className="prose mt-4 max-w-none whitespace-pre-wrap text-[#56606B]">{article.content || article.ai_summary || article.excerpt}</div></section>
      <footer className="mt-12 border-t border-[#D9DDE2] pt-5 text-xs text-[#7A838D]">Published intelligence derived from permitted evidence. Last updated: {article.updated_at || article.published_at || 'UNKNOWN'}</footer>
    </article>
  </main>;
}
