import type { Article } from '@/lib/types';
import Link from 'next/link';

interface TrendingWidgetProps {
  articles: Article[];
}

export function TrendingWidget({ articles }: TrendingWidgetProps) {
  if (!articles.length) return null;

  return (
    <div className="bg-white border border-[#222222] p-5">
      <h3 className="font-display font-black text-black text-base mb-4">Trending</h3>
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
              <div className="min-w-0 flex-1">
                <span className="text-sm text-black group-hover:underline transition-all line-clamp-1 font-medium block">
                  {article.title}
                </span>
                <span className="text-xs text-[#666666] font-mono uppercase tracking-wider">
                  {article.views?.toLocaleString()} views
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
