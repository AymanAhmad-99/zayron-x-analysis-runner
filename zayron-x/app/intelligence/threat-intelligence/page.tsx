export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { ArticleCard } from '@/components/ui/ArticleCard';
import { getCached } from '@/lib/cache/redis';
import { Activity, AlertTriangle, ArrowLeft, Radio, Shield, Tag } from '@/lib/icons';
import { type SiloId, getSiloColorClass, getSiloForCategory } from '@/lib/silos';
import {
  getAllTags,
  getArticlesByCategory,
  getArticlesCountByCategory,
  getCategoriesWithCounts,
} from '@/lib/db/queries/articles';
import type { Article, CategoryType } from '@/lib/types';
import type { Metadata } from 'next';
import Link from 'next/link';

const DB_CATEGORY: CategoryType = 'threat_intel';
const DISPLAY_NAME = 'Threat Intelligence';
const SILO_ID: SiloId = 'cybersecurity';
const CLASSIFICATION = 'TLP:AMBER — RESTRICTED DISTRIBUTION';
const PAGE_SIZE = 12;

const SILO_ICONS: Record<SiloId, React.ComponentType<{ size?: number; className?: string }>> = {
  cybersecurity: Shield,
  programming: Shield,
  networking: Shield,
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

/* ─── Props ─── */
interface PageProps {
  params: Promise<Record<string, string>>;
  searchParams: Promise<{ page?: string }>;
}

/* ─── Metadata ─── */
export async function generateMetadata(): Promise<Metadata> {
  let articleCount = 0;

  try {
    const articles = await getArticlesByCategory(DB_CATEGORY, 1, 1, process.env);
    articleCount = articles.length;
  } catch {
    articleCount = 0;
  }

  return {
    title: `${DISPLAY_NAME} — ZAYRON-X Intelligence Reports`,
    description:
      articleCount > 0
        ? `${articleCount}+ ${DISPLAY_NAME} intelligence reports and deep-dive analysis from ZAYRON-X. APT tracking, campaign analysis, and IOC feeds.`
        : `Live ${DISPLAY_NAME} monitoring — ZAYRON-X radar actively scanning. Real-time APT tracking, threat actor profiles, and IOC feeds.`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/intelligence/threat-intelligence`,
    },
    openGraph: {
      title: `${DISPLAY_NAME} — ZAYRON-X Intelligence`,
      description:
        'Advanced Persistent Threat tracking, campaign analysis, IOC feeds, and threat actor profiling.',
      type: 'website',
    },
  };
}

/* ─── Zero Intel Fallback — Terminal Matrix ─── */
function ZeroIntelReport() {
  return (
    <div className="dark bg-slate-950 text-[#f8fafc] min-h-[80vh]">
      <section className="relative border-b border-white/5 bg-slate-950/60 backdrop-blur-xl silo-cyber-hero">
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 font-mono">
              <Radio size={14} />
              Sector Scan
            </span>
          </div>
          <h1 className="font-mono text-4xl lg:text-5xl font-extrabold text-[#f8fafc] tracking-tight">
            {DISPLAY_NAME.toUpperCase()}
          </h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border border-white/5 bg-slate-950/60 backdrop-blur-xl flex items-center justify-center relative">
              <div className="absolute inset-2 rounded-full border border-[#FFD700]/10" />
              <Activity size={32} className="text-[#733DD9] animate-pulse" />
            </div>
          </div>

          <div className="mb-8 px-6 py-5 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-xl max-w-lg w-full">
            <p className="text-[#DC2626] font-mono text-sm leading-loose">
              Zx Sector Scan: <span className="font-bold text-[#f8fafc]">{DISPLAY_NAME}</span> — No
              intelligence intercepted in the last 24h. The Radar is actively monitoring.
            </p>
          </div>

          <div className="space-y-3 mb-10 w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-slate-950/60 backdrop-blur-xl border border-white/5">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Sector
              </span>
              <span className="text-sm text-[#f8fafc] font-semibold font-mono">{DISPLAY_NAME}</span>
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

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#733DD9] hover:bg-[#5B21B6] text-white rounded-lg transition-colors font-mono shadow-sm"
            >
              <ArrowLeft size={14} />
              Command Center
            </Link>
            <Link
              href="/intelligence"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold border border-white/5 rounded-lg text-slate-300 hover:text-white hover:border-[#733DD9] transition-all font-mono bg-slate-950/60 backdrop-blur-xl"
            >
              All Intel Sectors
            </Link>
          </div>

          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-12">
            ZAYRON-X ZERO INTEL REPORT · TLP:AMBER · AUTOMATED SCAN
          </p>
        </div>
      </section>
    </div>
  );
}

/* ─── Error State Fallback — DB Connection Lost ─── */
function DatabaseErrorReport({ message }: { message: string }) {
  return (
    <div className="dark bg-slate-950 text-[#f8fafc] min-h-screen">
      <section className="relative border-b border-white/5 bg-slate-950/60 backdrop-blur-xl silo-cyber-hero">
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#733DD9]/10 text-[#733DD9] border border-[#733DD9]/20 font-mono">
              <AlertTriangle size={14} />
              Degraded Mode
            </span>
          </div>
          <h1 className="font-mono text-4xl lg:text-5xl font-extrabold text-[#f8fafc] tracking-tight">
            {DISPLAY_NAME.toUpperCase()}
          </h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border border-white/5 bg-slate-950/60 backdrop-blur-xl flex items-center justify-center">
              <AlertTriangle size={32} className="text-[#733DD9]" />
            </div>
          </div>

          <div className="mb-8 px-6 py-5 rounded-xl border border-[#733DD9]/10 bg-[#733DD9]/[0.02] max-w-lg w-full">
            <p className="text-[#733DD9] font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
              {message}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold border border-white/5 text-slate-300 rounded-lg hover:border-[#733DD9] hover:text-[#733DD9] transition-colors uppercase tracking-wider font-mono bg-slate-950/60 backdrop-blur-xl"
            >
              <ArrowLeft size={14} />
              Return to Command Center
            </Link>
          </div>

          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-12">
            ZAYRON-X · DEGRADED MODE · RETRY CYCLE ACTIVE
          </p>
        </div>
      </section>
    </div>
  );
}

/* ─── Main Page Component ─── */
export default async function ThreatIntelligencePage({ searchParams }: PageProps) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;

  /* ─── DB Fetch ─── */
  let articles: Article[] = [];
  let allTags: Awaited<ReturnType<typeof getAllTags>> = [];
  let totalCount = 0;
  let dbError: string | null = null;

  try {
    const [fetchedArticles, fetchedTags, fetchedCount] = await Promise.all([
      getCached(
        process.env,
        `intel:category:${DB_CATEGORY}:page:${page}`,
        () => getArticlesByCategory(DB_CATEGORY, page, PAGE_SIZE, process.env),
        300,
      ),
      getCached(process.env, 'intel:all_tags', () => getAllTags(process.env), 300),
      getCached(
        process.env,
        `intel:count:${DB_CATEGORY}`,
        () => getArticlesCountByCategory(DB_CATEGORY, process.env),
        300,
      ),
    ]);
    articles = fetchedArticles as Article[];
    allTags = fetchedTags;
    totalCount = fetchedCount as number;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database connection failure';
    console.error(`[threat-intelligence] DB fetch failed for category "${DB_CATEGORY}":`, message);
    dbError = message;
  }

  /* ─── DB Connection Failure — Degraded Mode ─── */
  if (dbError) {
    return <DatabaseErrorReport message={dbError} />;
  }

  /* ─── Empty Dataset ─── */
  if (articles.length === 0) {
    return <ZeroIntelReport />;
  }

  const silo = getSiloForCategory(DISPLAY_NAME);
  const siloId: SiloId = silo?.id ?? 'cybersecurity';
  const siloColorClass = silo ? getSiloColorClass(silo.id) : 'silo-cyber';
  const heroClass = getSiloHeroClass(siloId);
  const SiloIcon = silo ? SILO_ICONS[silo.id] : Shield;
  const sectionTitle = 'Tactical Intelligence Dossier';
  const classification = silo?.tagline ?? CLASSIFICATION;

  return (
    <div className="dark bg-slate-950 text-[#f8fafc] min-h-screen">
      {/* ─── Hero ─── */}
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
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${siloColorClass}`}
            >
              <SiloIcon size={14} />
              {silo?.label ?? 'Cyber'} Intelligence
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold font-mono">
              {sectionTitle}
            </span>
          </div>
          <h1 className="font-mono text-4xl lg:text-5xl font-extrabold text-[#f8fafc] tracking-tight">
            {DISPLAY_NAME.toUpperCase()}
          </h1>
          <p className="text-slate-400 text-lg mt-3 max-w-2xl leading-loose">
            Advanced Persistent Threat tracking, campaign analysis, IOC feeds, and threat actor
            profiling from ZAYRON-X global intelligence network.
          </p>

          <div className="flex items-center gap-2 mt-6">
            <span className="text-2xl font-extrabold text-[#733DD9] font-mono">{totalCount}</span>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
              Reports{page > 1 ? ` (Page ${page})` : ' Available'}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Articles Grid + Tags Sidebar ─── */}
      <section className="max-w-7xl mx-auto px-8 py-14">
        <div className="flex gap-10">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <ArticleCard key={article.id} article={article} neighborOffset={index * 17} />
              ))}
            </div>

            {/* ─── Pagination ─── */}
            <div className="flex justify-center gap-3 mt-12">
              {page > 1 && (
                <Link
                  href={`/intelligence/threat-intelligence?page=${page - 1}`}
                  prefetch={true}
                  className="px-5 py-2.5 text-sm font-bold border border-white/5 rounded-lg hover:border-[#733DD9] hover:text-[#733DD9] transition-colors font-mono bg-slate-950/60 backdrop-blur-xl text-slate-300"
                >
                  Previous
                </Link>
              )}
              {articles.length === PAGE_SIZE && (
                <Link
                  href={`/intelligence/threat-intelligence?page=${page + 1}`}
                  prefetch={true}
                  className="px-5 py-2.5 text-sm font-bold bg-[#733DD9] text-white border border-white/5 rounded-lg hover:bg-[#5B21B6] transition-colors font-mono"
                >
                  Next Reports →
                </Link>
              )}
            </div>
          </div>

          {/* ─── Tags Filter Sidebar ─── */}
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
