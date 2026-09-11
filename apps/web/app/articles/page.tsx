import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText } from "lucide-react";
import { getArticles, type ArticleItem } from "@/lib/api";
import { CANONICAL_PUBLISHED_REPORTS } from "@zayron/intelligence";
import { cleanHeadline, sanitizeReportContent } from "@/lib/sanitizer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Intelligence Research & Technical Advisories — ZAYRON-X",
  description: "Analytical research publications, zero-day threat analysis, and adversary campaign dossiers produced by the ZAYRON-X analytical pipeline.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesIndexPage() {
  const articlesRes = await getArticles({ limit: 50 }).catch(() => null);
  const isDegraded = articlesRes === null || articlesRes.meta?.degraded === true;
  let articles: ArticleItem[] = articlesRes?.data || [];

  if (articles.length === 0) {
    articles = CANONICAL_PUBLISHED_REPORTS.slice(0, 24).map((r) => ({
      id: r.intelligence_id || r.slug,
      slug: r.slug,
      title: cleanHeadline(r.title, r.cve_id),
      dek: sanitizeReportContent(r.summary),
      category: r.cve_id ? "VULNERABILITY ADVISORY" : "THREAT ANALYSIS",
      published_at: r.published_at,
    })) as any[];
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0B] text-[#F4F4F5] min-h-screen">
      {/* Header */}
      <header className="bg-[#0A0A0B] border-b border-[rgba(255,255,255,0.08)] pt-16 pb-12">
        <div className="zx-container">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold text-[#B5541F] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B5541F] animate-pulse" />
              RESEARCH &amp; ADVISORIES
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white display-depth-title">
              Intelligence Research
            </h1>
            <p className="text-sm text-[#8B93A1] leading-relaxed">
              In-depth analytical publications, vulnerability deep-dives, and threat actor reverse-engineering dossiers compiled by the ZAYRON-X analytical pipeline.
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="zx-container py-12 flex-1 w-full">
        {articles.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#131315] max-w-xl mx-auto space-y-3">
            <FileText className="w-10 h-10 text-[#B5541F] mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-white">No Published Research Articles</h3>
            <p className="text-xs text-[#8B93A1] leading-relaxed">
              {isDegraded
                ? "D1 article telemetry is operating in edge degraded mode. New publications will appear upon telemetry verification."
                : "Editorial research articles are generated when telemetry crosses multi-source corroboration and high-confidence thresholds."}
            </p>
            <div className="pt-2">
              <Link
                href="/threats"
                className="inline-block px-5 py-2.5 bg-white text-[#0A0A0B] text-xs font-semibold rounded-full hover:bg-[#E4E4E7] transition-colors"
              >
                Explore Live Telemetry &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((art) => (
              <Link
                key={art.id}
                href={`/articles/${art.slug || art.id}`}
                className="group flex flex-col justify-between p-6 rounded-xl bg-[#131315] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-all"
                style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)" }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#B5541F]">
                      {art.category || "THREAT ADVISORY"}
                    </span>
                    <BookOpen className="w-4 h-4 text-[#71717A]" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-[#D4D4D8] transition-colors">
                    {art.title}
                  </h3>
                  <p className="text-xs text-[#8B93A1] leading-relaxed line-clamp-3 mb-6">
                    {art.dek || art.excerpt || art.ai_summary || "Detailed cyber threat intelligence assessment."}
                  </p>
                </div>
                <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs font-mono text-[#71717A]">
                  <span>{art.published_at ? art.published_at.slice(0, 10) : "RECENT"}</span>
                  <span className="font-bold text-white group-hover:text-[#B5541F] flex items-center gap-1">
                    Read Advisory <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
