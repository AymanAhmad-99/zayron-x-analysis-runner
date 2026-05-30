import type { Metadata } from "next";
import { searchArticles } from "@/lib/db/queries/articles";
import { ArticleCard } from "@/components/ui/ArticleCard";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const metadata: Metadata = {
  title: "Search Intelligence",
  description: "Search ZAYRON-X threat intelligence database.",
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  let articles: Awaited<ReturnType<typeof searchArticles>> = [];
  if (query) {
    try {
      articles = await searchArticles(query);
    } catch (error) {
      console.error(`SearchPage data fetch failed for "${query}":`, error);
    }
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="section-label">Search</p>
          <h1 className="font-display text-3xl font-bold text-[#0F172A] mt-2">
            {query ? `Results for "${query}"` : "Search Intelligence Database"}
          </h1>
          {query && (
            <p className="text-[#475569] mt-2 font-ui">
              {articles.length} result{articles.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>

        {!query && (
          <div className="text-center py-20 text-[#94A3B8] font-ui">
            Enter a search query to find intelligence reports.
          </div>
        )}

        {query && articles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#94A3B8] font-ui">No results found.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}
