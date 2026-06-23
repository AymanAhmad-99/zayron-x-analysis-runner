'use client';

import { ArrowUpRight, FileText, Layers, Shield, Users } from '@/lib/icons';
import type { Analyst, Article, CVE } from '@/lib/types';

interface AutomatedRoiCalculatorProps {
  articles: Article[];
  cves: CVE[];
  analysts: Analyst[];
  categories: { category: string; count: number }[];
  cveCount: number;
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return 'Not available';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AutomatedRoiCalculator({
  articles,
  cves,
  analysts,
  categories,
  cveCount,
}: AutomatedRoiCalculatorProps) {
  const topCategories = [...categories].sort((a, b) => b.count - a.count).slice(0, 3);
  const latestArticles = articles.slice(0, 3);
  const latestCVEs = cves.slice(0, 3);

  const metrics = [
    {
      label: 'CVEs Tracked',
      value: cveCount.toLocaleString(),
      icon: Shield,
    },
    {
      label: 'Categories Covered',
      value: categories.length.toLocaleString(),
      icon: Layers,
    },
    {
      label: 'Analysts',
      value: analysts.length.toLocaleString(),
      icon: Users,
    },
    {
      label: 'Latest Loaded Briefings',
      value: articles.length.toLocaleString(),
      icon: FileText,
    },
  ];

  return (
    <section className="bg-[var(--color-bg-soft)] border-y border-[var(--color-border)] py-20 px-6 lg:px-10 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] bg-white">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent-intelligence)]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text)]">
              Platform Coverage Value
            </span>
          </div>
          <h2 className="mt-6 text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
            Platform Coverage Value
          </h2>
          <p className="mt-4 max-w-3xl text-[1rem] leading-7 text-[var(--color-text-muted)]">
            A real-time overview of the intelligence currently indexed by ZAYRON-X, based on
            published briefings, tracked CVEs, analyst coverage, and category distribution.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-8 items-start">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-6 md:p-7">
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4"
                  >
                    <div className="flex items-center gap-2 text-[var(--color-accent-intelligence)]">
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.16em]">
                        {metric.label}
                      </span>
                    </div>
                    <div className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                      {metric.value}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl bg-[var(--color-section-royal)] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
                    Category Distribution
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Top indexed categories</h3>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {topCategories.length > 0 ? (
                  topCategories.map((category) => (
                    <div
                      key={category.category}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-white">
                        {category.category}
                      </span>
                      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-accent-intelligence)]">
                        {category.count.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
                    No category distribution available yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
                    Latest Briefings
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--color-text)]">
                    Most recent published intelligence
                  </h3>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {latestArticles.length.toLocaleString()} shown
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {latestArticles.length > 0 ? (
                  latestArticles.map((article) => (
                    <a
                      key={article.id}
                      href={`/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`}
                      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-4 transition-colors hover:border-[var(--color-accent-intelligence)]/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium leading-5 text-[var(--color-text)]">
                            {article.title}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                            <span className="text-[var(--color-accent-intelligence)]">
                              {article.category ?? 'Intelligence'}
                            </span>
                            <span>/</span>
                            <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-4 text-sm text-[var(--color-text-muted)]">
                    No published briefings available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
                    Latest CVEs
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--color-text)]">
                    Recent vulnerability records
                  </h3>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {latestCVEs.length.toLocaleString()} shown
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {latestCVEs.length > 0 ? (
                  latestCVEs.map((cve) => (
                    <a
                      key={cve.id}
                      href={`/cve/${cve.cveId}`}
                      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-4 transition-colors hover:border-[var(--color-accent-intelligence)]/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium leading-5 text-[var(--color-text)]">
                            {cve.cveId}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                            <span>{formatDate(cve.publishedDate)}</span>
                            {cve.severity && (
                              <>
                                <span>/</span>
                                <span className="text-[var(--color-accent-intelligence)]">
                                  {cve.severity}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="mt-2 text-sm leading-5 text-[var(--color-text-muted)] line-clamp-2">
                            {cve.title || cve.description || 'No CVE summary available.'}
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-4 text-sm text-[var(--color-text-muted)]">
                    No CVE records available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
