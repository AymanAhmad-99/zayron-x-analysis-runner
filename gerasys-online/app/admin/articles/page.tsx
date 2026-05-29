import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatDate";

export const metadata: Metadata = {
  title: "Articles",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;
  let articles: any[] = [];

  try {
    const { getAllArticlesAdmin } = await import("@/lib/db/queries/articles");
    articles = await getAllArticlesAdmin(page, 50);
  } catch {
    // DB not available
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-[#050505] tracking-tight">
            Intelligence
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-ui">
            Published articles and intelligence reports
          </p>
        </div>
        <span className="text-xs font-ui font-semibold text-neutral-600 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 shadow-sm">
          {articles.length} articles
        </span>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/30">
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest">
                Title
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden md:table-cell">
                Category
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">
                Status
              </th>
              <th className="text-right py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">
                Views
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-neutral-400 font-ui">
                  No articles yet. Intelligence reports will appear here once published.
                </td>
              </tr>
            ) : (
              articles.map((article, idx) => (
                <tr
                  key={article.id}
                  className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50/40 transition-colors"
                >
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-neutral-400 w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <span className="text-sm text-[#050505] font-semibold block max-w-xs truncate group-hover:text-[#733DD9] transition-colors">
                          {article.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-ui">
                          {article.author}
                        </span>
                      </div>
                    </div>
                    {article.isFeatured && (
                      <span className="text-[9px] uppercase font-bold text-neutral-500 font-ui ml-8">
                        Featured
                      </span>
                    )}
                    {article.isBreaking && (
                      <span className="text-[9px] uppercase font-bold text-red-600 font-ui ml-2">
                        Breaking
                      </span>
                    )}
                  </td>
                  <td className="py-6 px-8 hidden md:table-cell">
                    <span className="text-[10px] font-ui font-semibold text-neutral-600 uppercase tracking-wider">
                      {article.category}
                    </span>
                  </td>
                  <td className="py-6 px-8 hidden lg:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[9px] font-ui font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-transparent ${
                        article.isPublished
                          ? "text-emerald-600 border-emerald-500/20"
                          : "text-amber-600 border-amber-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          article.isPublished ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {article.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-6 px-8 text-right hidden lg:table-cell">
                    <span className="text-sm font-mono text-neutral-600">
                      {article.views?.toLocaleString() ?? 0}
                    </span>
                  </td>
                  <td className="py-6 px-8 hidden lg:table-cell">
                    <span className="text-xs font-mono text-neutral-500">
                      {article.createdAt ? formatDate(article.createdAt) : "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {articles.length > 0 && (
        <div className="flex justify-center gap-3 mt-8">
          {page > 1 && (
            <Link
              href={`/admin/articles?page=${page - 1}`}
              className="px-4 py-2 text-xs font-ui font-medium text-neutral-600 hover:text-[#733DD9] bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 transition-all duration-200 shadow-sm"
            >
              Previous
            </Link>
          )}
          <Link
            href={`/admin/articles?page=${page + 1}`}
            className="px-4 py-2 text-xs font-ui font-semibold text-white bg-[#733DD9] border border-[#733DD9] rounded-lg hover:bg-[#5B21B6] transition-all duration-200 shadow-sm"
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
