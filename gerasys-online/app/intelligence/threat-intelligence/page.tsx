export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import type { CategoryType, Article } from "@/lib/db/schema";
import { ArticleCard } from "@/components/ui/ArticleCard";
import {
  getArticlesByCategory,
  getCategoriesWithCounts,
  getAllTags,
} from "@/lib/db/queries/articles";
import {
  getSiloForCategory,
  getSiloColorClass,
  type SiloId,
} from "@/lib/silos";
import {
  Shield,
  Radio,
  ArrowLeft,
  Tag,
  Activity,
  AlertTriangle,
} from "@/lib/icons";
import Link from "next/link";

const DB_CATEGORY: CategoryType = "threat_intel";
const DISPLAY_NAME = "Threat Intelligence";
const SILO_ID: SiloId = "cybersecurity";
const CLASSIFICATION = "TLP:AMBER — RESTRICTED DISTRIBUTION";
const PAGE_SIZE = 12;

const SILO_ICONS: Record<SiloId, React.ComponentType<{ size?: number; className?: string }>> = {
  cybersecurity: Shield,
  programming: Shield,
  networking: Shield,
};

function getSiloHeroClass(siloId: SiloId): string {
  switch (siloId) {
    case "cybersecurity":
      return "silo-cyber-hero";
    case "programming":
      return "silo-programming-hero";
    case "networking":
      return "silo-networking-hero";
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
    const articles = await getArticlesByCategory(DB_CATEGORY, 1, 1);
    articleCount = articles.length;
  } catch {
    articleCount = 0;
  }

  return {
    title: `${DISPLAY_NAME} — Intelligence Reports`,
    description: articleCount > 0
      ? `${articleCount}+ ${DISPLAY_NAME} intelligence reports and deep-dive analysis from ZAYRON-X. APT tracking, campaign analysis, and IOC feeds.`
      : `Live ${DISPLAY_NAME} monitoring — ZAYRON-X radar actively scanning. Real-time APT tracking, threat actor profiles, and IOC feeds.`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/intelligence/threat-intelligence`,
    },
    openGraph: {
      title: `${DISPLAY_NAME} — ZAYRON-X Intelligence`,
      description: "Advanced Persistent Threat tracking, campaign analysis, IOC feeds, and threat actor profiling.",
      type: "website",
    },
  };
}

/* ─── Zero Intel Fallback — Terminal Matrix ─── */
function ZeroIntelReport() {
  return (
    <div>
      <section className="relative border-b border-[#E2E8F0] silo-cyber-hero">
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#DC2626]/6 text-[#DC2626] border border-[#DC2626]/15">
              <Radio size={14} />
              Sector Scan
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight">
            {DISPLAY_NAME}
          </h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center relative">
              <div className="absolute inset-2 rounded-full border border-[#FFD700]/10" />
              <Activity size={32} className="text-[#B8860B]" />
            </div>
          </div>

          <div className="mb-8 px-6 py-5 rounded-xl border border-[#DC2626]/10 bg-[#DC2626]/[0.02] max-w-lg w-full">
            <p className="text-[#DC2626] font-mono text-sm leading-loose">
              Zx Sector Scan:{" "}
              <span className="font-bold text-[#111827]">{DISPLAY_NAME}</span> —
              No intelligence intercepted in the last 24h. The Radar is actively
              monitoring.
            </p>
          </div>

          <div className="space-y-3 mb-10 w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">
                Sector
              </span>
              <span className="text-sm text-[#111827] font-semibold font-display">
                {DISPLAY_NAME}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">
                Reports Found
              </span>
              <span className="text-sm text-[#DC2626] font-bold font-mono">0</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">
                Radar Status
              </span>
              <span className="text-sm text-[#16A34A] font-semibold font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                ACTIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#733DD9] text-white rounded-lg hover:bg-[#5B21B6] transition-colors font-ui shadow-sm"
            >
              <ArrowLeft size={14} />
              Command Center
            </Link>
            <Link
              href="/intelligence"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-[#E2E8F0] rounded-lg text-[#4B5563] hover:text-[#111827] hover:border-[#733DD9] transition-all font-ui bg-white"
            >
              All Intel Sectors
            </Link>
          </div>

          <p className="text-[10px] text-[#D1D5DB] font-mono uppercase tracking-wider mt-12">
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
    <div>
      <section className="relative border-b border-[#E2E8F0] silo-cyber-hero">
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#733DD9]/10 text-[#733DD9] border border-[#733DD9]/20">
              <AlertTriangle size={14} />
              Degraded Mode
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight">
            {DISPLAY_NAME}
          </h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border-2 border-[#733DD9]/10 bg-white flex items-center justify-center">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#733DD9] text-white rounded-lg hover:bg-[#5B21B6] transition-colors font-ui shadow-sm"
            >
              <ArrowLeft size={14} />
              Command Center
            </Link>
          </div>

          <p className="text-[10px] text-[#D1D5DB] font-mono uppercase tracking-wider mt-12">
            ZAYRON-X · DEGRADED MODE · RETRY CYCLE ACTIVE
          </p>
        </div>
      </section>
    </div>
  );
}

/* ─── Main Page Component ─── */
export default async function ThreatIntelligencePage({
  searchParams,
}: PageProps) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;

  /* ─── DB Fetch — Asymmetric Async Block with Full Isolation ─── */
  let articles: Article[] = [];
  let allTags: Awaited<ReturnType<typeof getAllTags>> = [];
  let dbError: string | null = null;

  try {
    const [fetchedArticles, fetchedTags] = await Promise.all([
      getArticlesByCategory(DB_CATEGORY, page, PAGE_SIZE),
      getAllTags(),
    ]);
    articles = fetchedArticles as Article[];
    allTags = fetchedTags;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown database connection failure";
    console.error(
      `[threat-intelligence] DB fetch failed for category "${DB_CATEGORY}":`,
      message,
    );
    dbError = message;
  }

  /* ─── DB Connection Failure — Degraded Mode ─── */
  if (dbError) {
    return <DatabaseErrorReport message={dbError} />;
  }

  /* ─── Empty Dataset — Terminal Zero-Intel Matrix ─── */
  if (articles.length === 0) {
    return <ZeroIntelReport />;
  }

  /* ─── Render: Full Intelligence Layout ─── */
  const silo = getSiloForCategory(DISPLAY_NAME);
  const siloId: SiloId = silo?.id ?? "cybersecurity";
  const siloColorClass = silo ? getSiloColorClass(silo.id) : "silo-cyber";
  const heroClass = getSiloHeroClass(siloId);
  const SiloIcon = silo ? SILO_ICONS[silo.id] : Shield;
  const sectionTitle = "Tactical Intelligence Dossier";
  const classification = silo?.tagline ?? CLASSIFICATION;

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className={`relative border-b border-[#E2E8F0] ${heroClass}`}>
        <div className="absolute top-3 right-6 z-10">
          <span className="text-[0.55rem] font-bold text-[#9CA3AF] font-mono uppercase tracking-[0.2em] opacity-60">
            {classification}
          </span>
        </div>

        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${siloColorClass}`}
            >
              <SiloIcon size={14} />
              {silo?.label ?? "Cyber"} Intelligence
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] font-bold">
              {sectionTitle}
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight">
            {DISPLAY_NAME}
          </h1>
          <p className="text-[#4B5563] text-lg mt-3 max-w-2xl leading-loose">
            Advanced Persistent Threat tracking, campaign analysis, IOC feeds,
            and threat actor profiling from ZAYRON-X global intelligence
            network.
          </p>

          <div className="flex items-center gap-2 mt-6">
            <span className="text-2xl font-extrabold text-[#111827] font-display">
              {articles.length}
            </span>
            <span className="text-xs text-[#9CA3AF] font-ui uppercase tracking-wider">
              Reports{page > 1 ? ` (Page ${page})` : " Available"}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Articles Grid + Tags Sidebar ─── */}
      <section className="max-w-7xl mx-auto px-8 py-14">
        <div className="flex gap-10">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* ─── Pagination ─── */}
            <div className="flex justify-center gap-3 mt-12">
              {page > 1 && (
                <a
                  href={`/intelligence/threat-intelligence?page=${page - 1}`}
                  className="px-5 py-2.5 text-sm font-medium border border-[#E2E8F0] rounded-lg hover:border-[#733DD9] hover:text-[#733DD9] transition-colors font-ui bg-white text-[#4B5563]"
                >
                  Previous
                </a>
              )}
              {articles.length === PAGE_SIZE && (
                <a
                  href={`/intelligence/threat-intelligence?page=${page + 1}`}
                  className="px-5 py-2.5 text-sm font-medium bg-[#733DD9] text-white rounded-lg hover:bg-[#5B21B6] transition-colors font-ui"
                >
                  Next Reports →
                </a>
              )}
            </div>
          </div>

          {/* ─── Tags Filter Sidebar ─── */}
          {allTags.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={13} className="text-[#733DD9]" />
                  <h3 className="text-[10px] uppercase tracking-[0.14em] text-[#733DD9] font-bold font-ui">
                    Filter by Tag
                  </h3>
                </div>
                <div className="space-y-1">
                  {allTags.slice(0, 25).map((t) => (
                    <Link
                      key={t.tag}
                      href={`/search?q=${encodeURIComponent(t.tag)}`}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors font-ui group"
                    >
                      <span className="truncate">{t.tag}</span>
                      <span className="text-[10px] text-[#9CA3AF] font-mono ml-2 shrink-0">
                        {t.count}
                      </span>
                    </Link>
                  ))}
                </div>
                {allTags.length > 25 && (
                  <Link
                    href="/search"
                    className="text-[10px] text-[#733DD9] hover:underline font-ui mt-3 inline-block"
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
