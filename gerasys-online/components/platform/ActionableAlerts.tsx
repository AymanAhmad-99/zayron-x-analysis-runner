'use client';

import { ArrowUpRight } from '@/lib/icons';
import type { Article } from '@/lib/types';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface ActionableAlertsProps {
  articles: Article[];
}

function formatArticleDate(article: Article) {
  const date = article.publishedAt || article.createdAt;
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ActionableAlerts({ articles }: ActionableAlertsProps) {
  const filters = useMemo(() => {
    const categories = Array.from(
      new Set(articles.map((article) => article.category).filter(Boolean)),
    ) as string[];
    return ['All', ...categories];
  }, [articles]);

  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const filteredArticles = articles.filter((article) => {
    if (selectedFilter === 'All') return true;
    return article.category === selectedFilter;
  });

  return (
    <div className="bg-white border border-neutral-200 rounded-none overflow-hidden shadow-none transition-all duration-300 hover:border-neutral-300 font-sans">
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#050505]">
            Actionable Intelligence Briefings
          </h3>
          <p className="text-[11px] text-neutral-500 mt-1">
            Recent intelligence articles organized for quick review.
          </p>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-accent-intelligence)] tracking-[0.15em] uppercase font-black">
          Briefing Queue
        </span>
      </div>

      <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 font-mono text-[9px] font-bold uppercase transition-all border cursor-pointer rounded-none ${
                selectedFilter === filter
                  ? 'bg-[#050505] text-white border-[#050505]'
                  : 'bg-white text-neutral-500 border-neutral-200 hover:text-[var(--color-accent-intelligence)] hover:border-[var(--color-accent-intelligence)]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            No intelligence briefings available yet.
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100 text-[9px] uppercase tracking-wider text-[#050505] font-bold font-mono">
                <th className="py-5 px-6">Briefing</th>
                <th className="py-5 px-6 text-center">Risk</th>
                <th className="py-5 px-6">Context</th>
                <th className="py-5 px-6 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredArticles.slice(0, 10).map((article) => {
                const href = `/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`;
                const risk = article.regulatoryRisk?.trim();
                const financialExposure = article.financialExposure?.trim();
                const sourceChannel = article.sourceChannel?.trim();
                const summary = article.excerpt?.trim() || article.subtitle?.trim();
                const formattedDate = formatArticleDate(article);

                return (
                  <tr
                    key={article.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/30 transition-colors"
                  >
                    <td className="py-5 px-6 max-w-sm">
                      <div>
                        <span className="font-bold text-[#050505] block hover:text-[var(--color-accent-intelligence)] transition-colors leading-tight">
                          <Link href={href}>{article.title}</Link>
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[9px] text-neutral-400 uppercase tracking-wider">
                          <span className="text-[var(--color-accent-intelligence)] font-bold">
                            {article.category ?? 'Intelligence'}
                          </span>
                          {formattedDate && (
                            <>
                              <span>·</span>
                              <span className="text-neutral-500 font-semibold">{formattedDate}</span>
                            </>
                          )}
                          {sourceChannel && (
                            <>
                              <span>·</span>
                              <span>{sourceChannel}</span>
                            </>
                          )}
                        </div>
                        {summary && (
                          <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed line-clamp-2">
                            {summary}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-5 px-6 align-middle text-center shrink-0">
                      {risk ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-none border border-neutral-200 text-[9px] font-mono font-bold tracking-wider uppercase bg-transparent text-[#050505]">
                          {risk}
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                          Risk not classified
                        </span>
                      )}
                    </td>

                    <td className="py-5 px-6 font-mono text-[#050505] align-middle">
                      {financialExposure ? (
                        <span className="font-bold">{financialExposure}</span>
                      ) : sourceChannel ? (
                        <span className="text-neutral-500">{sourceChannel}</span>
                      ) : summary ? (
                        <span className="text-neutral-500 line-clamp-2">{summary}</span>
                      ) : (
                        <span className="text-neutral-400">No additional context</span>
                      )}
                    </td>

                    <td className="py-5 px-6 text-right align-middle shrink-0">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-none border border-neutral-200 text-neutral-600 font-mono hover:text-[var(--color-accent-intelligence)] hover:border-[var(--color-accent-intelligence)] transition-all text-[9px] font-bold tracking-wider uppercase"
                      >
                        View Briefing
                        <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
