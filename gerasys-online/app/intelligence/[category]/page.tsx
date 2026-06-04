export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";

import type { Metadata } from "next";
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
import { Shield, Code, Network, Radar, ArrowLeft, Radio, Tag } from "@/lib/icons";
import Link from "next/link";

/* Map URL slug → DB category enum value.
   generateStaticParams produces kebab-case slugs from the enum;
   this reverses that so queries match the actual column values. */
const SLUG_TO_DB_CATEGORY: Record<string, string> = {
  vulnerabilities: "vulnerabilities",
  "threat-intel": "threat_intel",
  osint: "osint",
  "cyber-news": "cyber_news",
};

function slugToDbCategory(slug: string): string {
  return SLUG_TO_DB_CATEGORY[slug] ?? slug.replace(/-/g, "_");
}

function formatCategoryDisplay(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SILO_ICONS: Record<SiloId, React.ComponentType<{ size?: number; className?: string }>> = {
  cybersecurity: Shield,
  programming: Code,
  networking: Network,
};

interface Props {
  params: Promise<{ category: string }> | { category: string };
  searchParams?: Promise<{ page?: string }> | { page?: string };
}

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

function getSectionTitle(siloId: SiloId): string {
  switch (siloId) {
    case "cybersecurity":
      return "Tactical Intelligence Dossier";
    case "programming":
      return "Secure Engineering Repository";
    case "networking":
      return "Network Forensics Archive";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const category = resolvedParams?.category;
    if (!category) {
      return {
        title: "Intelligence Reports — ZAYRON-X",
      };
    }
    const label = category
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const silo = getSiloForCategory(label);
    return {
      title: `${label} — ${silo?.label ?? "Intelligence"} Reports`,
      description: `Latest ${label} intelligence reports and analysis from ZAYRON-X. ${silo?.description ?? ""}`,
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/intelligence/${category}`,
      },
    };
  } catch (error) {
    console.error("EDGE METADATA CRASH AVOIDED:", error);
    return {
      title: "Intelligence Reports — ZAYRON-X",
    };
  }
}

/* ─── Zero Intel Report — Oracle White ─── */
function ZeroIntelReport({ categoryName }: { categoryName: string }) {
  return (
    <div>
      {/* Hero section */}
      <section className="relative border-b border-[#E2E8F0] silo-cyber-hero">
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#DC2626]/6 text-[#DC2626] border border-[#DC2626]/15">
              <Radio size={14} />
              Sector Scan
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight">
            {categoryName}
          </h1>
        </div>
      </section>

      {/* Zero Intel Body */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          {/* Animated radar icon */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border border-[#FFD700]/20 animate-ping" style={{ animationDuration: "3s" }} />
              <div className="absolute inset-2 rounded-full border border-[#FFD700]/10" />
              <Radar size={32} className="text-[#B8860B] animate-pulse" />
            </div>
          </div>

          {/* Alert message */}
          <div className="mb-8 px-6 py-5 rounded-xl border border-[#DC2626]/10 bg-[#DC2626]/[0.02] max-w-lg w-full">
            <p className="text-[#DC2626] font-mono text-sm leading-loose">
              🚨 Zx Sector Scan: <span className="font-bold text-[#111827]">{categoryName}</span> — No intelligence intercepted in the last 24h. The Radar is actively monitoring.
            </p>
          </div>

          {/* Status details */}
          <div className="space-y-3 mb-10 w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">Sector</span>
              <span className="text-sm text-[#111827] font-semibold font-display">{categoryName}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">Reports Found</span>
              <span className="text-sm text-[#DC2626] font-bold font-mono">0</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">Radar Status</span>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#D2B48C] text-white rounded-lg hover:bg-[#C4A47A] transition-colors font-ui shadow-sm"
            >
              <ArrowLeft size={14} />
              Command Center
            </Link>
            <Link
              href="/intelligence/threat-intelligence"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-[#E2E8F0] rounded-lg text-[#4B5563] hover:text-[#111827] hover:border-[#D2B48C] transition-all font-ui bg-white"
            >
              Browse All Intel
            </Link>
          </div>

          {/* Footer stamp */}
          <p className="text-[10px] text-[#D1D5DB] font-mono uppercase tracking-wider mt-12">
            ZAYRON-X ZERO INTEL REPORT · TLP:AMBER · AUTOMATED SCAN
          </p>
        </div>
      </section>
    </div>
  );
}

export default async function IntelligenceCategoryPage({
  params,
  searchParams,
}: Props) {
  let category = "";
  try {
    const resolvedParams = await params;
    category = resolvedParams?.category || "";
  } catch (error) {
    console.error("EDGE PARAMS RESOLVE ERROR AVOIDED:", error);
  }

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
    console.error("EDGE SEARCHPARAMS RESOLVE ERROR AVOIDED:", error);
  }

  const dbCategory = slugToDbCategory(category);
  const displayCategory = formatCategoryDisplay(category);
  const silo = getSiloForCategory(displayCategory);
  const siloId = silo?.id ?? "cybersecurity";
  const siloColorClass = silo ? getSiloColorClass(silo.id) : "";
  const heroClass = getSiloHeroClass(siloId);

  let articles: Awaited<ReturnType<typeof getArticlesByCategory>> = [];
  let allTags: Awaited<ReturnType<typeof getAllTags>> = [];
  try {
    [articles, allTags] = await Promise.all([
      getArticlesByCategory(dbCategory, page, 12),
      getAllTags(),
    ]);
  } catch (error) {
    console.error(
      `EDGE DB CRASH AVOIDED: IntelligenceCategoryPage fetch failed for "${dbCategory}":`,
      error
    );
    articles = [];
    allTags = [];
  }

  /* ─── FALLBACK: Show Zero Intel Report instead of notFound() ─── */
  if (articles.length === 0) {
    return <ZeroIntelReport categoryName={displayCategory} />;
  }

  const SiloIcon = silo ? SILO_ICONS[silo.id] : Shield;
  const sectionTitle = silo ? getSectionTitle(silo.id) : "Intelligence Archive";
  const classification =
    silo?.tagline ?? "INTELLIGENCE REPORT — FOR OFFICIAL USE ONLY";

  return (
    <div>
      {/* Compartmentalized Category Hero */}
      <section className={`relative border-b border-[#E2E8F0] ${heroClass}`}>
        <div className="absolute top-3 right-6 z-10">
          <span className="text-[0.55rem] font-bold text-[#9CA3AF] font-mono uppercase tracking-[0.2em] opacity-60">
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
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] font-bold">
              {sectionTitle}
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight">
            {displayCategory}
          </h1>
          <p className="text-[#4B5563] text-lg mt-3 max-w-2xl leading-loose">
            {silo
              ? `${silo.description}`
              : `Curated intelligence reports and deep-dive analysis in ${displayCategory.toLowerCase()}.`}
          </p>

          {/* Article count badge */}
          <div className="flex items-center gap-2 mt-6">
            <span className="text-2xl font-extrabold text-[#111827] font-display">
              {articles.length}
            </span>
            <span className="text-xs text-[#9CA3AF] font-ui uppercase tracking-wider">
              Reports {page > 1 ? `(Page ${page})` : "Available"}
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
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-3 mt-12">
              {page > 1 && (
                <a
                  href={`/intelligence/${category}?page=${page - 1}`}
                  className="px-5 py-2.5 text-sm font-medium border border-[#E2E8F0] rounded-lg hover:border-[#D2B48C] hover:text-[#D2B48C] transition-colors font-ui bg-white text-[#4B5563]"
                >
                  Previous
                </a>
              )}
              {articles.length === 12 && (
                <a
                  href={`/intelligence/${category}?page=${page + 1}`}
                  className="px-5 py-2.5 text-sm font-medium bg-[#D2B48C] text-white rounded-lg hover:bg-[#C4A47A] transition-colors font-ui"
                >
                  Next Reports →
                </a>
              )}
            </div>
          </div>

          {/* Tags filter sidebar — DB-driven */}
          {allTags.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={13} className="text-[#D2B48C]" />
                  <h3 className="text-[10px] uppercase tracking-[0.14em] text-[#D2B48C] font-bold font-ui">
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
                    className="text-[10px] text-[#D2B48C] hover:underline font-ui mt-3 inline-block"
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
