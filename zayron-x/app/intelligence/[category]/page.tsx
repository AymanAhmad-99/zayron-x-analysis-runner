export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';

import { ArticleCard } from '@/components/ui/ArticleCard';
import { getCached } from '@/lib/cache/redis';
import { ArrowLeft, Code, Network, Radar, Radio, Shield, Tag } from '@/lib/icons';
import { getCategoryNavigationJsonLd, getCategoryPageMetadata } from '@/lib/seo/metadata';
import { type SiloId, getSiloColorClass, getSiloForCategory } from '@/lib/silos';
import {
  getAllTags,
  getArticlesByCategory,
  getArticlesCountByCategory,
  getCategoriesWithCounts,
} from '@/lib/db/queries/articles';
import { createClient } from '@/lib/supabase/server';
import type { Article, CategoryType } from '@/lib/types';
import type { Metadata } from 'next';
import Link from 'next/link';

/* Map URL slug → DB category enum value.
   generateStaticParams produces kebab-case slugs from the enum;
   this reverses that so queries match the actual column values. */
const SLUG_TO_DB_CATEGORY: Record<string, string> = {
  malware: 'MALWARE',
  'threat-actors': 'THREAT_ACTOR',
  'threat-actor': 'THREAT_ACTOR',
  vulnerabilities: 'VULNERABILITY',
  vulnerability: 'VULNERABILITY',
  exploits: 'EXPLOIT',
  exploit: 'EXPLOIT',
  'dark-web': 'DARK_WEB',
  dark_web: 'DARK_WEB',
  osint: 'OSINT',
};

function slugToDbCategory(slug: string): string {
  const normalized = slug.toLowerCase();
  return SLUG_TO_DB_CATEGORY[normalized] ?? normalized.toUpperCase();
}

function formatCategoryDisplay(slug: string): string {
  const friendlyNames: Record<string, string> = {
    malware: 'Malware',
    'threat-actors': 'Threat Actors',
    'threat-actor': 'Threat Actors',
    vulnerabilities: 'Vulnerabilities',
    vulnerability: 'Vulnerabilities',
    exploits: 'Exploits',
    exploit: 'Exploits',
    'dark-web': 'Dark Web',
    dark_web: 'Dark Web',
    osint: 'OSINT',
  };
  const normalized = slug.toLowerCase();
  return (
    friendlyNames[normalized] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const SILO_ICONS: Record<SiloId, React.ComponentType<{ size?: number; className?: string }>> = {
  cybersecurity: Shield,
  programming: Code,
  networking: Network,
};

type Props = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{ page?: string }>;
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

function getSectionTitle(siloId: SiloId): string {
  switch (siloId) {
    case 'cybersecurity':
      return 'Tactical Intelligence Dossier';
    case 'programming':
      return 'Secure Engineering Repository';
    case 'networking':
      return 'Network Forensics Archive';
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { category } = await params;
    if (!category) {
      return {
        title: 'Intelligence Reports — ZAYRON-X',
      };
    }
    return getCategoryPageMetadata(category);
  } catch (error) {
    console.error('EDGE METADATA CRASH AVOIDED:', error);
    return {
      title: 'Intelligence Reports — ZAYRON-X',
    };
  }
}

/* ─── Zero Intel Report — Terminal Matrix ─── */
function ZeroIntelReport({ categoryName }: { categoryName: string }) {
  return (
    <div className="dark bg-slate-950 text-[#f8fafc] min-h-[80vh]">
      {/* Hero section */}
      <section className="relative border-b border-white/5 bg-slate-950/60 backdrop-blur-xl silo-cyber-hero">
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 font-mono">
              <Radio size={14} />
              Sector Scan
            </span>
          </div>
          <h1 className="font-mono text-4xl lg:text-5xl font-extrabold text-[#f8fafc] tracking-tight">
            {categoryName.toUpperCase()}
          </h1>
        </div>
      </section>

      {/* Zero Intel Body */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          {/* Animated radar icon */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border border-white/5 bg-slate-950/60 backdrop-blur-xl flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border border-[#FFD700]/20 animate-ping"
                style={{ animationDuration: '3s' }}
              />
              <div className="absolute inset-2 rounded-full border border-white/5" />
              <Radar size={32} className="text-[#733DD9] animate-pulse" />
            </div>
          </div>

          {/* Alert message */}
          <div className="mb-8 px-6 py-5 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-xl max-w-lg w-full">
            <p className="text-[#DC2626] font-mono text-sm leading-loose">
              🚨 Zx Sector Scan: <span className="font-bold text-[#f8fafc]">{categoryName}</span> —
              No intelligence intercepted in the last 24h. The Radar is actively monitoring.
            </p>
          </div>

          {/* Status details */}
          <div className="space-y-3 mb-10 w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-slate-950/60 backdrop-blur-xl border border-white/5">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Sector
              </span>
              <span className="text-sm text-[#f8fafc] font-semibold font-mono">{categoryName}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-slate-950/60 backdrop-blur-xl border border-white/5">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Reports Found
              </span>
              <span className="text-sm text-[#DC2626] font-bold font-mono">0</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-slate-950/60 backdrop-blur-xl border border-white/5">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Radar Status
              </span>
              <span className="text-sm text-[#16A34A] font-semibold font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                ACTIVE
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#733DD9] hover:bg-[#5B21B6] text-white rounded-lg transition-colors font-mono shadow-sm"
            >
              <ArrowLeft size={14} />
              Command Center
            </Link>
            <Link
              href="/intelligence/threat-intelligence"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold border border-white/5 rounded-lg text-slate-300 hover:text-white hover:border-[#733DD9] transition-all font-mono bg-slate-950/60 backdrop-blur-xl"
            >
              Browse All Intel
            </Link>
          </div>

          {/* Footer stamp */}
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-12">
            ZAYRON-X ZERO INTEL REPORT · TLP:AMBER · AUTOMATED SCAN
          </p>
        </div>
      </section>
    </div>
  );
}

export default async function IntelligenceCategoryPage({ params, searchParams }: Props) {
  const { category } = await params;

  if (!category) {
    return notFound();
  }

  let page = 1;
  try {
    if (searchParams) {
      const resolvedSearchParams = await searchParams;
      const pageStr = resolvedSearchParams?.page;
      page = Number(pageStr) || 1;
    }
  } catch (error) {
    console.error('EDGE SEARCHPARAMS RESOLVE ERROR AVOIDED:', error);
  }

  const dbCategory = slugToDbCategory(category);
  const displayCategory = formatCategoryDisplay(category);
  const silo = getSiloForCategory(displayCategory);
  const siloId = silo?.id ?? 'cybersecurity';
  const siloColorClass = silo ? getSiloColorClass(silo.id) : '';
  const heroClass = getSiloHeroClass(siloId);

  let articles: Awaited<ReturnType<typeof getArticlesByCategory>> = [];
  let allTags: Awaited<ReturnType<typeof getAllTags>> = [];
  let totalCount = 0;
  try {
    const [fetchedArticles, fetchedTags, fetchedCount] = await Promise.all([
      getCached(
        process.env,
        `intel:category:${dbCategory}:page:${page}`,
        () => getArticlesByCategory(dbCategory, page, 12, process.env),
        300,
      ),
      getCached(process.env, 'intel:all_tags', () => getAllTags(process.env), 300),
      getCached(
        process.env,
        `intel:count:${dbCategory}`,
        () => getArticlesCountByCategory(dbCategory, process.env),
        300,
      ),
    ]);
    articles = fetchedArticles as Awaited<ReturnType<typeof getArticlesByCategory>>;
    allTags = fetchedTags;
    totalCount = fetchedCount as number;
  } catch (error) {
    console.error(
      `EDGE DB CRASH AVOIDED: IntelligenceCategoryPage fetch failed for "${dbCategory}":`,
      error,
    );
    articles = [];
    allTags = [];
    totalCount = 0;
  }

  // 1. Establish server-side security context check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSubscriber = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('clearance_level, stripe_subscription_status, tier_id')
      .eq('id', user.id)
      .single();

    isSubscriber = !!(
      profile &&
      (profile.clearance_level === 'SUBSCRIBER' ||
        profile.stripe_subscription_status === 'active' ||
        profile.stripe_subscription_status === 'trialing' ||
        profile.tier_id === 'TACTICAL_OBSERVER' ||
        profile.tier_id === 'SOVEREIGN_COMMAND')
    );
  }

  // 2. Strict server boundary sanitization to prevent gated data leaks in __NEXT_DATA__ serialization
  const processedArticles = isSubscriber
    ? articles
    : articles.map((art) => ({
        ...art,
        yaraRule: null,
        iocsJson: null,
        mitreTtps: null,
        fbrScore: null,
        cvssV4Score: null,
        financialExposure: null,
        regulatoryRisk: null,
        mitigationImpact: null,
      }));

  /* ─── FALLBACK: Show Zero Intel Report instead of notFound() ─── */
  if (processedArticles.length === 0) {
    return <ZeroIntelReport categoryName={displayCategory} />;
  }

  const SiloIcon = silo ? SILO_ICONS[silo.id] : Shield;
  const sectionTitle = silo ? getSectionTitle(silo.id) : 'Intelligence Archive';
  const classification = silo?.tagline ?? 'INTELLIGENCE REPORT — FOR OFFICIAL USE ONLY';

  const jsonLd = getCategoryNavigationJsonLd();

  return (
    <div className="dark bg-slate-950 text-[#f8fafc] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Compartmentalized Category Hero */}
      <section
        className={`relative border-b border-white/5 bg-slate-950/60 backdrop-blur-xl ${heroClass}`}
      >
        <div className="absolute top-3 right-6 z-10">
          <span className="text-[0.55rem] font-bold text-slate-400 font-mono uppercase tracking-[0.2em] opacity-60">
            {classification}
          </span>
        </div>

        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            {silo && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${siloColorClass}`}
              >
                <SiloIcon size={14} />
                {silo.label}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold font-mono">
              {sectionTitle}
            </span>
          </div>
          <h1 className="font-mono text-4xl lg:text-5xl font-extrabold text-[#f8fafc] tracking-tight">
            {displayCategory.toUpperCase()}
          </h1>
          <p className="text-slate-400 text-lg mt-3 max-w-2xl leading-loose">
            {silo
              ? `${silo.description}`
              : `Curated intelligence reports and deep-dive analysis in ${displayCategory.toLowerCase()}.`}
          </p>

          {/* Article count badge */}
          <div className="flex items-center gap-2 mt-6">
            <span className="text-2xl font-extrabold text-[#733DD9] font-mono">{totalCount}</span>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
              Reports {page > 1 ? `(Page ${page})` : 'Available'}
            </span>
          </div>
        </div>
      </section>

      {/* Articles Grid + Tags Sidebar */}
      <section className="max-w-7xl mx-auto px-8 py-14">
        <div className="flex gap-10">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedArticles.map((article, index) => (
                <ArticleCard key={article.id} article={article} neighborOffset={index * 17} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-3 mt-12">
              {page > 1 && (
                <Link
                  href={`/intelligence/${category}?page=${page - 1}`}
                  prefetch={true}
                  className="px-5 py-2.5 text-sm font-bold border border-white/5 rounded-lg hover:border-[#733DD9] hover:text-[#733DD9] transition-colors font-mono bg-slate-950/60 backdrop-blur-xl text-slate-300"
                >
                  Previous
                </Link>
              )}
              {processedArticles.length === 12 && (
                <Link
                  href={`/intelligence/${category}?page=${page + 1}`}
                  prefetch={true}
                  className="px-5 py-2.5 text-sm font-bold bg-[#733DD9] text-white border border-white/5 rounded-lg hover:bg-[#5B21B6] transition-colors font-mono"
                >
                  Next Reports →
                </Link>
              )}
            </div>
          </div>

          {/* Tags filter sidebar — DB-driven */}
          {allTags.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-24 bg-slate-950/60 backdrop-blur-xl border border-white/5 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={13} className="text-[#733DD9]" />
                  <h3 className="text-[10px] uppercase tracking-[0.14em] text-[#733DD9] font-bold font-mono">
                    Filter by Tag
                  </h3>
                </div>
                <div className="space-y-1">
                  {allTags.slice(0, 25).map((t) => (
                    <Link
                      key={t.tag}
                      href={`/search?q=${encodeURIComponent(t.tag)}`}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-[#f8fafc] hover:bg-white/5 transition-colors font-mono group"
                    >
                      <span className="truncate">{t.tag}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">
                        {t.count}
                      </span>
                    </Link>
                  ))}
                </div>
                {allTags.length > 25 && (
                  <Link
                    href="/search"
                    className="text-[10px] text-[#733DD9] hover:underline font-mono mt-3 inline-block"
                  >
                    +{allTags.length - 25} more tags
                  </Link>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
