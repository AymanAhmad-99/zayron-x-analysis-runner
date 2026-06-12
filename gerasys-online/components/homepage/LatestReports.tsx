import { CategoryBadge } from '@/components/ui/CategoryBadge';
import type { Article } from '@/lib/types';
import { timeAgo } from '@/lib/utils/formatDate';
import Link from 'next/link';

interface LatestReportsProps {
  articles: Article[];
}

export function LatestReports({ articles }: LatestReportsProps) {
  if (!articles.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="section-label">Latest Intelligence</p>
        <h2 className="section-heading mt-2">Recent Reports</h2>
        <p className="section-subheading mt-3">
          The most recent threat intelligence reports from the Gerasys desk.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        <ul>
          {articles.slice(0, 5).map((article, i) => (
            <li key={article.id}>
              <Link
                href={`/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`}
                className="flex items-start gap-4 py-4 group border-b border-[#222222]"
              >
                <span className="text-2xl font-black text-black font-display tabular-nums w-8 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <CategoryBadge category={article.category} className="mb-1.5" />
                  <h3 className="text-base font-bold text-black group-hover:underline transition-all line-clamp-2 font-display">
                    {article.title}
                  </h3>
                  <span className="text-xs text-[#666666] mt-1 block font-mono uppercase tracking-wider">
                    {timeAgo(article.createdAt!)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Trending column */}
        <div className="bg-white border border-[#222222] p-6 lg:border-l-0">
          <h3 className="font-display font-black text-lg text-black mb-4">Trending Now</h3>
          <ul className="space-y-3">
            {articles.slice(0, 5).map((article, i) => (
              <li key={article.id}>
                <Link
                  href={`/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`}
                  className="flex items-center gap-3 group"
                >
                  <span className="text-[10px] font-bold text-[#999999] font-mono w-5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-black group-hover:underline transition-all line-clamp-1 font-medium">
                    {article.title}
                  </span>
                  <span className="text-xs text-[#666666] ml-auto shrink-0 font-mono">
                    {article.views ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
