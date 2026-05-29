import { type Article } from "@/lib/db/schema";
import { ArticleCard } from "@/components/ui/ArticleCard";

interface FeaturedGridProps {
  articles: Article[];
}

export function FeaturedGrid({ articles }: FeaturedGridProps) {
  if (!articles.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="section-subheading">Featured Intelligence</h2>
          <h3 className="section-heading mt-1">In-Depth Analysis</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.slice(0, 6).map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
