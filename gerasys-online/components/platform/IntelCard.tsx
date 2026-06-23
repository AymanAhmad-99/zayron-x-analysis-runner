import { ArrowUpRight } from '@/lib/icons';
import type { Article } from '@/lib/types';
import { formatCategoryLabel } from '@/lib/utils/slugify';
import Link from 'next/link';

interface IntelCardProps {
  article: Article;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function IntelCard({ article }: IntelCardProps) {
  const href = `/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`;
  const tags = (article.tags ?? []).filter(Boolean);
  const exposure = article.financialExposure?.trim();
  const risk = article.regulatoryRisk?.trim();
  const impact = article.mitigationImpact?.trim();
  const publishedDate = formatDate(article.publishedAt || article.createdAt);

  return (
    <Link href={href} className="group block">
      <article className="flex flex-col md:flex-row gap-6 md:gap-8 p-6 md:p-8 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-300">
        <div className="md:w-1/3 shrink-0 flex flex-col justify-between p-5 rounded-lg bg-neutral-50 border border-neutral-200 text-[#050505] font-mono relative overflow-hidden min-h-[140px]">
          <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />

          <div className="relative z-10 flex items-center justify-between border-b border-neutral-200/80 pb-2 mb-2">
            <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--color-accent-intelligence)] font-bold">
              Briefing Details
            </span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-accent-intelligence)]" />
            </span>
          </div>

          <div className="relative z-10 space-y-2 py-1">
            {exposure && (
              <div className="flex justify-between items-center text-[10px] gap-3">
                <span className="text-neutral-400">EXPOSURE:</span>
                <span className="text-[#050505] font-semibold text-right">{exposure}</span>
              </div>
            )}
            {risk && (
              <div className="flex justify-between items-center text-[10px] gap-3">
                <span className="text-neutral-400">REGULATORY:</span>
                <span
                  className={`font-bold text-right ${
                    risk.toLowerCase().includes('critical') ? 'text-[#DC2626]' : 'text-[#D97706]'
                  }`}
                >
                  {risk}
                </span>
              </div>
            )}
            {impact && (
              <div className="flex justify-between items-center text-[10px] gap-3">
                <span className="text-neutral-400">IMPACT:</span>
                <span className="text-[var(--color-accent-intelligence)] font-semibold text-right">
                  {impact}
                </span>
              </div>
            )}
            {!exposure && !risk && !impact && (
              <div className="text-[10px] leading-relaxed text-neutral-500">
                Additional risk context is not classified for this briefing.
              </div>
            )}
          </div>

          <div className="relative z-10 border-t border-neutral-200/80 pt-2 mt-2 flex items-center justify-between gap-3 text-[8px] text-neutral-400">
            <span>{formatCategoryLabel(article.category)}</span>
            <span>{publishedDate || 'Date unavailable'}</span>
          </div>
        </div>

        <div className="md:w-2/3 flex flex-col justify-between min-h-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[0.68rem] font-semibold uppercase tracking-widest text-[var(--color-accent-intelligence)]">
              {formatCategoryLabel(article.category)}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-[0.7rem] text-[#94A3B8] font-medium font-mono">
              {publishedDate}
            </span>
          </div>

          <h3 className="text-[1.15rem] md:text-[1.3rem] font-semibold leading-snug text-[#0F172A] mb-3 group-hover:text-[var(--color-accent-intelligence)] transition-colors duration-300 line-clamp-2">
            {article.title}
          </h3>

          {article.excerpt && (
            <p className="text-[0.85rem] leading-loose text-[#64748B] mb-4 line-clamp-2">
              {article.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between mt-auto gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold border border-neutral-200 text-neutral-700 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-intelligence)]" />
              Published Briefing
            </span>

            <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[var(--color-accent-intelligence)] group-hover:text-[var(--color-accent-intelligence-hover)] transition-colors font-mono">
              View Briefing
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[0.6rem] font-mono font-medium uppercase tracking-wider text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="text-[0.6rem] font-mono text-[#CBD5E1]">+{tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export function IntelEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 flex items-center justify-center mb-5 bg-white border border-neutral-100 rounded-lg relative overflow-hidden shadow-sm">
        <svg
          className="w-full h-full text-neutral-200"
          viewBox="0 0 80 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          <title>No intelligence briefings available</title>
          <rect width="80" height="80" fill="#FFFFFF" />
          <line x1="0" y1="40" x2="80" y2="40" strokeDasharray="2,2" />
          <line x1="40" y1="0" x2="40" y2="80" strokeDasharray="2,2" />
          <circle cx="40" cy="40" r="25" />
          <circle
            cx="40"
            cy="40"
            r="12"
            stroke="var(--color-accent-intelligence)"
            strokeWidth="1"
          />
          <circle cx="40" cy="40" r="2" fill="var(--color-accent-intelligence)" stroke="none" />
          <path d="M 10,10 L 20,10 M 10,10 L 10,20" />
          <path d="M 70,10 L 60,10 M 70,10 L 70,20" />
          <path d="M 10,70 L 20,70 M 10,70 L 10,60" />
          <path d="M 70,70 L 60,70 M 70,70 L 70,60" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
        No intelligence briefings available yet
      </h3>
      <p className="text-[0.85rem] text-[#94A3B8] max-w-md leading-relaxed">
        Published intelligence briefings will appear here when article data is available.
      </p>
    </div>
  );
}
