import { CategoryBadge } from '@/components/ui/CategoryBadge';
import type { SiloDefinition } from '@/lib/silos';
import type { Article } from '@/lib/types';
import { formatDate } from '@/lib/utils/formatDate';
import Link from 'next/link';

interface ArticleHeaderProps {
  article: Article;
  silo?: SiloDefinition | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function ArticleHeader({ article, silo }: ArticleHeaderProps) {
  const displayCategory = (article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-');

  return (
    <header className="border-b border-[#222222] bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#666666] mb-6 font-mono uppercase tracking-wider">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/intelligence/${displayCategory}`}
            className="hover:text-black transition-colors"
          >
            {article.category}
          </Link>
        </nav>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <CategoryBadge category={article.category ?? ''} />
          {article.isBreaking && <span className="tlp-badge tlp-red">BREAKING</span>}
          {article.isFeatured && <span className="tlp-badge tlp-amber">FEATURED</span>}
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl lg:text-5xl font-black text-black leading-[1.1] text-balance max-w-4xl">
          {article.title}
        </h1>

        {/* Subtitle */}
        {article.subtitle && (
          <p className="text-lg text-[#444444] mt-5 font-body leading-loose max-w-3xl">
            {article.subtitle}
          </p>
        )}

        {/* Author meta */}
        <div className="flex flex-wrap items-center gap-4 mt-8 pt-8 border-t border-[#222222]">
          <div className="w-11 h-11 bg-black text-white flex items-center justify-center font-display font-bold text-sm">
            {getInitials(article.author)}
          </div>
          <div>
            <span className="block text-sm font-bold text-black font-ui">{article.author}</span>
            <span className="text-xs text-[#666666] font-mono uppercase tracking-wider">
              {article.createdAt ? formatDate(article.createdAt) : ''} // {article.readTime} min
              read // {(article.views ?? 0).toLocaleString()} views
            </span>
          </div>

          {silo && (
            <span className="ml-auto tlp-badge tlp-white text-[10px]">
              TLP:{silo.id === 'cybersecurity' ? 'AMBER' : 'WHITE'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
