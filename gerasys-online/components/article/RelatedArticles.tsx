import { ArticleCard } from '@/components/ui/ArticleCard';
import type { Article } from '@/lib/types';

interface RelatedArticlesProps {
  articles: Article[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (!articles.length) return null;

  return (
    <section className="mt-12 pt-8 border-t border-[#1E293B]">
      <h2 className="font-display text-xl font-bold text-[#F1F5F9] mb-6">Related Intelligence</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.slice(0, 3).map((article, index) => (
          <ArticleCard
            key={article.id}
            article={article}
            variant="default"
            neighborOffset={index * 23}
          />
        ))}
      </div>
    </section>
  );
}
