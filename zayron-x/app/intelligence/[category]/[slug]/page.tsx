import { ArticleBody } from '@/components/article/ArticleBody';
import { ArticleHeader } from '@/components/article/ArticleHeader';
import { ArticleSidebar } from '@/components/article/ArticleSidebar';
import { AuthorCard } from '@/components/article/AuthorCard';
import { ReadingProgress } from '@/components/article/ReadingProgress';
import { RelatedArticles } from '@/components/article/RelatedArticles';
import { ShareButtons } from '@/components/article/ShareButtons';
import { FinancialBlastRadius } from '@/components/platform/FinancialBlastRadius';
import CyberArticleImage from '@/components/ui/CyberArticleImage';
import { ChevronRight, Code, Network, Shield } from '@/lib/icons';
import { type SiloId, getSiloColorClass, getSiloForCategory } from '@/lib/silos';
import {
  getAllArticleSlugs,
  getArticleBySlug,
  getRelatedArticles,
  getTrendingArticles,
} from '@/lib/db/queries/articles';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const SILO_ICONS: Record<SiloId, React.ComponentType<{ size?: number; className?: string }>> = {
  cybersecurity: Shield,
  programming: Code,
  networking: Network,
};

function getSiloHeroClass(siloId: SiloId): string {
  switch (siloId) {
    case 'cybersecurity':
      return 'silo-cyber-hero';
    case 'programming':
      return 'silo-programming-hero';
    case 'networking':
      return 'silo-networking-hero';
  }
}

function getSiloArticleClass(siloId: SiloId): string {
  switch (siloId) {
    case 'cybersecurity':
      return 'silo-cyber-article';
    case 'programming':
      return 'silo-programming-article';
    case 'networking':
      return 'silo-networking-article';
  }
}

function getSiloProseClass(siloId: SiloId): string {
  switch (siloId) {
    case 'cybersecurity':
      return 'prose-zayron prose-cyber';
    case 'programming':
      return 'prose-zayron prose-programming';
    case 'networking':
      return 'prose-zayron prose-networking';
  }
}

function getSiloClassification(siloId: SiloId): string {
  switch (siloId) {
    case 'cybersecurity':
      return 'TLP:AMBER — RESTRICTED DISTRIBUTION';
    case 'programming':
      return 'SOURCE VALIDATED — PRODUCTION GRADE';
    case 'networking':
      return 'DEEP PACKET INSPECTION — FORENSIC ANALYSIS';
  }
}

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof getArticleBySlug>> = null;
  try {
    article = await getArticleBySlug(slug);
  } catch {}
  if (!article) return { title: 'Intelligence Report Not Found' };

  const categorySlug = (article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-');

  return {
    title: article.title,
    description: article.excerpt ?? article.content.substring(0, 160),
    openGraph: {
      title: article.title,
      description: article.excerpt ?? article.content.substring(0, 160),
      type: 'article',
      publishedTime:
        (article.publishedAt ?? article.createdAt)
          ? new Date((article.publishedAt ?? article.createdAt) as string | Date).toISOString()
          : undefined,
      authors: [article.author],
      images: article.imageUrl ? [{ url: article.imageUrl, width: 1200, height: 630 }] : [],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/intelligence/${categorySlug}/${article.slug}`,
    },
  };
}

export const revalidate = 0;

export default async function IntelligenceArticlePage({ params }: Props) {
  const { category: _category, slug } = await params;

  // 1. Establish secure client session and authenticate profile
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSubscriber = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('clearance_level, stripe_subscription_status')
      .eq('id', user.id)
      .single();

    isSubscriber = !!(
      profile &&
      (profile.clearance_level === 'SUBSCRIBER' ||
        profile.stripe_subscription_status === 'active' ||
        profile.stripe_subscription_status === 'trialing')
    );
  }

  let article: Awaited<ReturnType<typeof getArticleBySlug>> = null;
  try {
    article = await getArticleBySlug(slug);
  } catch {}
  if (!article) notFound();

  // Absolute Zero-Leak Redaction (Server-Side Verification)
  // Strip out premium content completely if not subscriber to prevent serialization
  if (!isSubscriber) {
    article = {
      ...article,
      yaraRule: null,
      mitreTtps: null,
      fbrScore: null,
      cvssV4Score: null,
      financialExposure: null,
      regulatoryRisk: null,
      mitigationImpact: null,
    };
  }

  const silo = article.category ? getSiloForCategory(article.category) : null;
  const siloId = silo?.id ?? 'cybersecurity';
  const siloColorClass = silo ? getSiloColorClass(silo.id) : '';
  const SiloIcon = silo ? SILO_ICONS[silo.id] : Shield;

  let relatedArticles: Awaited<ReturnType<typeof getRelatedArticles>> = [];
  let trendingArticles: Awaited<ReturnType<typeof getTrendingArticles>> = [];
  try {
    [relatedArticles, trendingArticles] = await Promise.all([
      getRelatedArticles(article.category, article.slug, 3),
      getTrendingArticles(5),
    ]);
  } catch {}

  const severity = isSubscriber ? article.regulatoryRisk || 'CRITICAL' : '[ RESTRICTED_INTEL ]';
  const exposure = isSubscriber
    ? article.financialExposure || '$4.2M – $8.5M'
    : '[ RESTRICTED_INTEL ]';
  const iocs = isSubscriber
    ? (article.tags ?? []).filter(Boolean).join(', ') || 'No active IoCs mapped'
    : '[ RESTRICTED_INTEL ]';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.title,
    datePublished:
      (article.publishedAt ?? article.createdAt)
        ? new Date((article.publishedAt ?? article.createdAt) as string | Date).toISOString()
        : undefined,
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: 'ZAYRON-X',
      url: process.env.NEXT_PUBLIC_SITE_URL,
    },
    description: article.excerpt ?? article.content.substring(0, 160),
    image: article.imageUrl,
    mainEntity: {
      '@type': 'SecurityAdvisory',
      name: article.title,
      severity: severity,
      amount: exposure,
      sharedContent: {
        '@type': 'CreativeWork',
        text: `Indicators of Compromise (IoCs): ${iocs}`,
      },
    },
  };

  const heroClass = getSiloHeroClass(siloId);
  const articleCardClass = getSiloArticleClass(siloId);
  const proseClass = getSiloProseClass(siloId);
  const classification = getSiloClassification(siloId);

  const categorySlug = (article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-');
  const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/intelligence/${categorySlug}/${article.slug}`;

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress color="#733DD9" />

      {/* Modern Asymmetrical Split-Pane Dossier Layout */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-16 lg:gap-32 items-start">
          {/* ═══════════════════════════════════════════════
              LEFT PANE (Sticky, Floating Sidebar)
              ═══════════════════════════════════════════════ */}
          <aside className="lg:sticky lg:top-24 space-y-8 bg-white p-8 rounded-xl border border-neutral-100 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-12px_rgba(115,61,217,0.08)] hover:-translate-y-1 transition-all duration-500 lg:mr-24">
            {/* Classification Stamp */}
            <div className="pb-4 border-b border-neutral-200/60">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#733DD9] bg-[#733DD9]/5 px-2.5 py-1 rounded">
                {classification}
              </span>
            </div>

            {/* Core Metadata Stack */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#050505] font-black">
                Dossier Intelligence
              </h4>
              <div className="space-y-3 text-xs text-neutral-600">
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                  <span className="font-mono">AUTHOR:</span>
                  <span className="font-bold text-[#050505]">{article.author}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                  <span className="font-mono">PUBLISHED:</span>
                  <span className="font-bold text-[#050505]">
                    {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                  <span className="font-mono">READ TIME:</span>
                  <span className="font-bold text-[#050505]">{article.readTime} MIN</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                  <span className="font-mono">VIEWS:</span>
                  <span className="font-bold text-[#733DD9] font-mono">
                    {(article.views ?? 0).toLocaleString()}
                  </span>
                </div>
                {isSubscriber &&
                  article.cvssV4Score !== undefined &&
                  article.cvssV4Score !== null && (
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                      <span className="font-mono">CVSS V4.0:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                          Number(article.cvssV4Score) >= 9.0
                            ? 'bg-red-500 text-white'
                            : Number(article.cvssV4Score) >= 7.0
                              ? 'bg-orange-500 text-white'
                              : Number(article.cvssV4Score) >= 4.0
                                ? 'bg-yellow-500 text-black'
                                : 'bg-blue-500 text-white'
                        }`}
                      >
                        {Number(article.cvssV4Score).toFixed(1)}
                      </span>
                    </div>
                  )}
                {!isSubscriber && (
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                    <span className="font-mono">CVSS V4.0:</span>
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                      RESTRICTED
                    </span>
                  </div>
                )}
                {isSubscriber && article.fbrScore !== undefined && article.fbrScore !== null && (
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                    <span className="font-mono">FBR SCORE:</span>
                    <span className="font-bold text-[#050505] font-mono bg-neutral-100 px-2 py-0.5 rounded">
                      {article.fbrScore}
                    </span>
                  </div>
                )}
                {!isSubscriber && (
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                    <span className="font-mono">FBR SCORE:</span>
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                      RESTRICTED
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Mapped Threat Indicators (IoCs) */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#050505] font-black">
                Active Vectors (IoCs)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {isSubscriber && (article.tags ?? []).filter(Boolean).length > 0 ? (
                  (article.tags ?? []).filter(Boolean).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-mono uppercase tracking-wider bg-white border border-neutral-200/80 text-neutral-700 px-2 py-0.5 rounded hover:border-[#733DD9] hover:text-[#733DD9] transition-colors duration-200 cursor-default"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-mono text-neutral-400">
                    {isSubscriber
                      ? 'No active threat hashes mapped.'
                      : '[ LOCKED — SUBSCRIBER EXCLUSIVE ]'}
                  </span>
                )}
              </div>
            </div>

            {/* MITRE ATT&CK TTPs */}
            {isSubscriber && article.mitreTtps && article.mitreTtps.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#050505] font-black">
                  MITRE ATT&CK TTPs
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {article.mitreTtps.map((ttp, idx) => (
                    <span
                      key={idx}
                      title={ttp}
                      className="text-[9px] font-mono uppercase tracking-wider bg-purple-50 border border-purple-200 text-[#733DD9] px-2 py-0.5 rounded cursor-default hover:bg-purple-100 transition-colors"
                    >
                      {ttp.split(' — ')[0] || ttp}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              !isSubscriber && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#050505] font-black">
                    MITRE ATT&CK TTPs
                  </h4>
                  <span className="text-[9px] font-mono text-neutral-400 block">
                    [ LOCKED — SUBSCRIBER EXCLUSIVE ]
                  </span>
                </div>
              )
            )}

            {/* Dynamic Financial Impact Engine Toggle Interface */}
            {!isSubscriber ? (
              <div className="pt-8 mt-6 border-t border-neutral-200/60 p-5 bg-neutral-50 border border-neutral-200 text-center">
                <span className="text-[10px] font-mono font-bold text-neutral-400 block mb-1">
                  [ FINANCIAL IMPACT MAPPED ]
                </span>
                <Link
                  href="/intelligence"
                  className="text-xs font-bold text-[#733DD9] hover:underline animate-pulse"
                >
                  Upgrade to ZAYRON-X Premium to unlock financial blast radius simulation.
                </Link>
              </div>
            ) : (
              <div className="pt-8 mt-6 border-t border-neutral-200/60">
                <FinancialBlastRadius
                  financialExposure={article.financialExposure}
                  regulatoryRisk={article.regulatoryRisk}
                  mitigationImpact={article.mitigationImpact}
                />
              </div>
            )}
          </aside>

          {/* ═══════════════════════════════════════════════
              RIGHT PANE (Scrollable, 75% Width)
              ═══════════════════════════════════════════════ */}
          <main className="min-w-0 space-y-10">
            {/* Symmetrical Header Elements */}
            <div className="space-y-4">
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center gap-1.5 text-[11px] font-ui text-neutral-400">
                <Link href="/" className="hover:text-[#733DD9] transition-colors duration-200">
                  Home
                </Link>
                <ChevronRight size={10} />
                <Link
                  href={`/intelligence/${categorySlug}`}
                  className="hover:text-[#733DD9] transition-colors duration-200"
                >
                  {article.category ?? 'Intelligence'}
                </Link>
                <ChevronRight size={10} />
                <span className="text-[#050505] font-bold truncate max-w-[250px]">
                  {article.title}
                </span>
              </nav>

              {/* Category Indicator Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#733DD9]/5 border border-[#733DD9]/10 text-xs font-bold uppercase tracking-wider text-[#733DD9]">
                  <SiloIcon size={13} className="text-[#733DD9]" />
                  {silo?.label ?? 'Cyber'} Intelligence Channel
                </span>
              </div>
            </div>

            {/* Auth Headline */}
            <div className="space-y-6">
              <h1 className="text-[2.5rem] md:text-[3.5rem] font-black text-[#050505] leading-[1.1] tracking-tight max-w-4xl font-sans">
                {article.title}
              </h1>
              {article.subtitle && (
                <p className="text-base md:text-lg text-neutral-600 leading-loose max-w-3xl font-medium">
                  {article.subtitle}
                </p>
              )}
            </div>

            {/* Standalone Featured Image */}
            <CyberArticleImage
              title={article.title}
              category={article.category}
              articleId={article.id}
              featuredImage={article.image_url}
              className="w-full rounded-lg border border-neutral-100 shadow-sm group bg-neutral-50 transition-all duration-300 hover:border-neutral-200 aspect-[16/9] max-h-[500px]"
              priority
            />

            {/* Clean Separator */}
            <hr className="border-neutral-100 my-8" />

            {/* The Intelligence Brief Content */}
            <article className={`${proseClass} bg-white leading-loose`}>
              <ArticleBody content={article.content} />
            </article>

            {/* YARA detection rule code block */}
            {article.yaraRule ? (
              <div className="mt-12 bg-white">
                <details className="group border border-neutral-200/80 rounded-lg overflow-hidden bg-neutral-50/50 hover:bg-neutral-50/80 transition-all duration-300">
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none bg-neutral-50/80 hover:bg-neutral-100/60 font-mono text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-transparent group-open:border-neutral-200/80 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#733DD9]" />
                      <span>YARA Rule Signature</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 group-open:rotate-180 transition-transform duration-200">
                      ▼
                    </span>
                  </summary>
                  <div className="p-6 bg-[#0B0F19] text-[#A9B2C3] font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
                    <code>{article.yaraRule}</code>
                  </div>
                </details>
              </div>
            ) : (
              !isSubscriber && (
                <div className="mt-12 p-6 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-center">
                  <span className="text-xs font-mono text-neutral-400 block mb-2">
                    [ YARA SIGNATURE LOCKED ]
                  </span>
                  <Link
                    href="/intelligence"
                    className="text-xs font-bold text-[#733DD9] hover:underline"
                  >
                    Subscribe to ZAYRON-X Premium to access automated detection signatures.
                  </Link>
                </div>
              )
            )}

            {/* Symmetrical Footer Tools */}
            <div className="pt-10 border-t border-neutral-100 space-y-8">
              <ShareButtons url={articleUrl} title={article.title} />
              <AuthorCard authorName={article.author} />
              <RelatedArticles articles={relatedArticles} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
