export const runtime = 'edge';
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import type { Article, CVE } from "@/lib/db/schema";
import { ArticleCard } from "@/components/ui/ArticleCard";
import { CveTable } from "@/components/cve/CveTable";
import {
  getRecentArticles,
  getBreakingArticles,
  getAllTags,
  getArticleCount,
} from "@/lib/db/queries/articles";
import { getCriticalCVEs, getCVECount } from "@/lib/db/queries/cves";
import { getAnalysts } from "@/lib/db/queries/analysts";
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
  Zap,
  Bug,
  Satellite,
  Users,
  Database,
} from "@/lib/icons";
import Link from "next/link";

const DISPLAY_NAME = "Operations";
const PAGE_SIZE = 12;
const CVE_LIMIT = 5;

const SILO_ICONS: Record<SiloId, React.ComponentType<{ size?: number; className?: string }>> = {
  cybersecurity: Shield,
  programming: Shield,
  networking: Shield,
};

function getSiloHeroClass(siloId: SiloId): string {
  switch (siloId) {
    case "cybersecurity": return "silo-cyber-hero";
    case "programming": return "silo-programming-hero";
    case "networking": return "silo-networking-hero";
  }
}

/* ─── Props ─── */
interface PageProps {
  params: Promise<Record<string, string>>;
  searchParams: Promise<{ page?: string }>;
}

/* ─── Telemetry Row Datum ─── */
interface TelemetryDatum {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}

/* ─── Metadata ─── */
export async function generateMetadata(): Promise<Metadata> {
  let articleCount = 0;
  let cveCount = 0;

  try {
    const [articles, cves] = await Promise.allSettled([
      getArticleCount(),
      getCVECount(),
    ]);
    if (articles.status === "fulfilled") articleCount = articles.value;
    if (cves.status === "fulfilled") cveCount = cves.value;
  } catch {
    // Metadata generation failure is non-fatal — return defaults
  }

  return {
    title: `${DISPLAY_NAME} — ZAYRON-X Intelligence Command`,
    description:
      articleCount > 0
        ? `${articleCount} intelligence reports · ${cveCount} CVEs tracked. Real-time threat operations, live radar, analyst deployment status.`
        : "ZAYRON-X Operations Center — live threat radar, CVE tracking, analyst deployment, and intelligence command dashboard.",
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/intelligence/operations`,
    },
    openGraph: {
      title: `${DISPLAY_NAME} — ZAYRON-X Intelligence Command`,
      description:
        "Real-time threat operations dashboard: live radar, CVE tracking, analyst deployment status, and intelligence command center.",
      type: "website",
    },
  };
}

/* ───────────────────────────────────────────────────────────
   FALLBACK: Radar Offline — Dark Terminal UI (ENOTFOUND)
   ─────────────────────────────────────────────────────────── */
function RadarOfflineTerminal({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] font-mono">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] bg-repeat"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-24">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#DC2626]" />
            <span className="text-xs tracking-[0.2em] text-[#64748B] uppercase">
              ZAYRON-X · COMMAND TERMINAL
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#475569]">
            <span>UTC {new Date().toISOString().slice(11, 19)}</span>
            <span>ENCRYPTED</span>
          </div>
        </div>

        {/* Alert banner */}
        <div className="mb-10 p-6 rounded-lg border border-[#DC2626]/20 bg-[#DC2626]/[0.04]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full border border-[#DC2626]/30 bg-[#DC2626]/[0.06] flex items-center justify-center shrink-0 mt-0.5">
              <Satellite size={20} className="text-[#DC2626]" />
            </div>
            <div className="space-y-2 min-w-0">
              <h2 className="text-sm font-semibold text-[#DC2626] tracking-wide">
                📡 ZAYRON-X Radar Offline: Re-establishing encrypted connection
                to Intel Hub...
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                The secure channel to <code className="text-[#94A3B8] bg-[#1E293B] px-1.5 py-0.5 rounded text-[11px]">aws-1-us-west-1.pooler.supabase.com</code> could
                not be established. Ensure your DATABASE_URL is configured
                to use the IPv4-only connection pooler endpoint (port 6543).
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostic table */}
        <div className="space-y-1 mb-10 font-mono text-xs">
          <div className="flex items-center justify-between px-4 py-3 rounded bg-[#0F172A] border border-[#1E293B]">
            <span className="text-[#475569]">DIAGNOSTIC</span>
            <span className="text-[#94A3B8]">{">"} getaddrinfo ENOTFOUND aws-1-us-west-1.pooler.supabase.com</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded bg-[#0F172A] border border-[#1E293B]">
            <span className="text-[#475569]">STACK</span>
            <span className="text-[#94A3B8]">Vercel Edge Runtime · Node.js 22 · IPv4-only</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded bg-[#0F172A] border border-[#1E293B]">
            <span className="text-[#475569]">RESOLUTION</span>
            <span className="text-[#16A34A]">
              Migrate DATABASE_URL to Supabase Connection Pooler (Port 6543)
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded bg-[#0F172A] border border-[#1E293B]">
            <span className="text-[#475569]">RETRY</span>
            <span className="text-[#F59E0B]">Automatic reconnection cycle active · TTL 30s</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded bg-[#0F172A] border border-[#1E293B]">
            <span className="text-[#475569]">ERROR</span>
            <span className="text-[#DC2626] truncate max-w-lg">{message}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border border-[#1E293B] text-[#94A3B8] rounded-lg hover:border-[#3B82F6]/40 hover:text-[#E2E8F0] transition-colors uppercase tracking-wider"
          >
            <ArrowLeft size={14} />
            Return to Command Center
          </Link>
          <button
            type="button"
            onClick={undefined}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-[#1E293B] text-[#94A3B8] rounded-lg border border-[#334155] cursor-not-allowed opacity-60 uppercase tracking-wider"
            disabled
          >
            <Activity size={14} />
            Reconnecting...
          </button>
        </div>

        {/* Footer stamp */}
        <div className="mt-16 pt-6 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-[#334155]">
          <span>ZAYRON-X TERMINAL · DEGRADED MODE</span>
          <span>TLP:RED · NO FORN</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   FALLBACK: Zero Intel — No Articles Found
   ─────────────────────────────────────────────────────────── */
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
            <p className="text-[#DC2626] font-mono text-sm leading-relaxed">
              Zx Sector Scan: <span className="font-bold text-[#111827]">{DISPLAY_NAME}</span> — No
              intelligence intercepted in the last 24h. The Radar is actively
              monitoring.
            </p>
          </div>

          <div className="space-y-3 mb-10 w-full max-w-md">
            {[
              ["Sector", DISPLAY_NAME],
              ["Reports Found", "0"],
              ["Radar Status", "ACTIVE"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-5 py-3 rounded-lg bg-white border border-[#E2E8F0]">
                <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">{label}</span>
                <span className={`text-sm font-semibold font-display ${value === "0" ? "text-[#DC2626] font-mono" : "text-[#111827]"}`}>
                  {value === "ACTIVE" ? (
                    <span className="text-[#16A34A] font-mono flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                      ACTIVE
                    </span>
                  ) : value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#733DD9] text-white rounded-lg hover:bg-[#5B21B6] transition-colors font-ui shadow-sm">
              <ArrowLeft size={14} /> Command Center
            </Link>
            <Link href="/intelligence/threat-intelligence" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-[#E2E8F0] rounded-lg text-[#4B5563] hover:text-[#111827] hover:border-[#733DD9] transition-all font-ui bg-white">
              Threat Intelligence
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

/* ───────────────────────────────────────────────────────────
   MAIN PAGE COMPONENT
   ─────────────────────────────────────────────────────────── */
export default async function OperationsPage({ searchParams }: PageProps) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;

  /* ─── Data Fetching — Full Isolation ─── */
  let articles: Article[] = [];
  let breakingArticles: Article[] = [];
  let criticalCVEs: CVE[] = [];
  let allTags: Awaited<ReturnType<typeof getAllTags>> = [];
  let totalArticleCount = 0;
  let totalCveCount = 0;
  let analystCount = 0;
  let dbError: string | null = null;

  try {
    const [recent, breaking, cves, tags, analysts, articleCount, cveCount] =
      await Promise.all([
        getRecentArticles(PAGE_SIZE),
        getBreakingArticles(5),
        getCriticalCVEs(CVE_LIMIT),
        getAllTags(),
        getAnalysts(),
        getArticleCount(),
        getCVECount(),
      ]);

    articles = recent as Article[];
    breakingArticles = breaking as Article[];
    criticalCVEs = cves as CVE[];
    allTags = tags;
    analystCount = analysts.length;
    totalArticleCount = articleCount;
    totalCveCount = cveCount;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown database connection failure";
    console.error(
      `[operations] DB fetch failed:`,
      message,
    );
    dbError = message;
  }

  /* ─── DB Connection Failure → Radar Offline Terminal ─── */
  if (dbError) {
    return <RadarOfflineTerminal message={dbError} />;
  }

  /* ─── Empty Dataset → Zero Intel Report ─── */
  if (totalArticleCount === 0 && totalCveCount === 0) {
    return <ZeroIntelReport />;
  }

  /* ─── Derived Values ─── */
  const silo = getSiloForCategory(DISPLAY_NAME);
  const siloId: SiloId = silo?.id ?? "cybersecurity";
  const siloColorClass = silo ? getSiloColorClass(silo.id) : "silo-cyber";
  const heroClass = getSiloHeroClass(siloId);
  const SiloIcon = silo ? SILO_ICONS[silo.id] : Shield;
  const classification = "TLP:AMBER — OPERATIONS COMMAND — RESTRICTED";

  const telemetry: TelemetryDatum[] = [
    { label: "Intel Reports", value: totalArticleCount.toLocaleString(), icon: Database, accent: "text-[#2563EB]" },
    { label: "Breaking Alerts", value: breakingArticles.length, icon: Zap, accent: "text-[#DC2626]" },
    { label: "CVEs Tracked", value: totalCveCount.toLocaleString(), icon: Bug, accent: "text-[#DC2626]" },
    { label: "Analysts Deployed", value: analystCount, icon: Users, accent: "text-[#16A34A]" },
  ];

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
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${siloColorClass}`}>
              <SiloIcon size={14} />
              {silo?.label ?? "Cyber"} Operations
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] font-bold">
              Command Dashboard
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight">
            {DISPLAY_NAME}
          </h1>
          <p className="text-[#4B5563] text-lg mt-3 max-w-2xl leading-loose">
            Live threat radar · CVE tracking · Analyst deployment status · Intelligence
            command and control from ZAYRON-X global operations center.
          </p>

          {/* Telemetry bar */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {telemetry.map((t) => (
              <div key={t.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] shadow-sm">
                <t.icon size={14} className={t.accent} />
                <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-ui">
                  {t.label}
                </span>
                <span className="text-lg font-extrabold text-[#111827] font-display">
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Breaking Alerts Strip ─── */}
      {breakingArticles.length > 0 && (
        <section className="bg-[#FEF2F2] border-b border-[#FECACA]">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap size={14} className="text-[#DC2626]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#DC2626] font-ui">
                Breaking Intelligence
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {breakingArticles.map((a) => (
                <Link
                  key={a.id}
                  href={`/intelligence/${(a.category ?? "intelligence").toLowerCase().replace(/\s+/g, "-")}/${a.slug}`}
                  className="text-sm font-semibold text-[#111827] hover:text-[#DC2626] transition-colors font-display"
                >
                  {a.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Main Grid: Articles + CVE Sidebar ─── */}
      <section className="max-w-7xl mx-auto px-8 py-14">
        <div className="flex gap-10">
          {/* Articles */}
          <div className="flex-1 min-w-0">
            {articles.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center gap-3 mt-12">
                  {page > 1 && (
                    <a
                      href={`/intelligence/operations?page=${page - 1}`}
                      className="px-5 py-2.5 text-sm font-medium border border-[#E2E8F0] rounded-lg hover:border-[#733DD9] hover:text-[#733DD9] transition-colors font-ui bg-white text-[#4B5563]"
                    >
                      Previous
                    </a>
                  )}
                  {articles.length === PAGE_SIZE && (
                    <a
                      href={`/intelligence/operations?page=${page + 1}`}
                      className="px-5 py-2.5 text-sm font-medium bg-[#733DD9] text-white rounded-lg hover:bg-[#5B21B6] transition-colors font-ui"
                    >
                      Next Reports →
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Database size={32} className="text-[#D1D5DB] mb-4" />
                <p className="text-sm text-[#9CA3AF] font-mono">
                  No intelligence reports available. Check back shortly.
                </p>
              </div>
            )}
          </div>

          {/* Right sidebar: CVEs + Tags */}
          <div className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 gap-6">
            {/* Critical CVEs */}
            {criticalCVEs.length > 0 && (
              <div className="sticky top-24 space-y-6">
                <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
                    <Bug size={13} className="text-[#DC2626]" />
                    <h3 className="text-[10px] uppercase tracking-[0.14em] text-[#DC2626] font-bold font-ui">
                      Critical CVEs
                    </h3>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {criticalCVEs.map((cve) => (
                      <Link
                        key={cve.id}
                        href={`/cve/${cve.cveId}`}
                        className="block px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
                      >
                        <p className="text-xs font-mono font-bold text-[#111827] mb-0.5">
                          {cve.cveId}
                        </p>
                        <p className="text-[11px] text-[#4B5563] leading-snug line-clamp-2 font-ui">
                          {cve.title ?? cve.description ?? "No description"}
                        </p>
                        {cve.cvssScore != null && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono font-bold text-[#DC2626]">
                            CVSS {Number(cve.cvssScore).toFixed(1)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-[#E2E8F0]">
                    <Link
                      href="/cve"
                      className="text-[10px] text-[#733DD9] hover:underline font-ui uppercase tracking-wider"
                    >
                      View all CVEs →
                    </Link>
                  </div>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
                      <Tag size={13} className="text-[#733DD9]" />
                      <h3 className="text-[10px] uppercase tracking-[0.14em] text-[#733DD9] font-bold font-ui">
                        Filter by Tag
                      </h3>
                    </div>
                    <div className="px-3 py-3 space-y-1">
                      {allTags.slice(0, 20).map((t) => (
                        <Link
                          key={t.tag}
                          href={`/search?q=${encodeURIComponent(t.tag)}`}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors font-ui group"
                        >
                          <span className="truncate">{t.tag}</span>
                          <span className="text-[10px] text-[#9CA3AF] font-mono ml-2 shrink-0">
                            {t.count}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
