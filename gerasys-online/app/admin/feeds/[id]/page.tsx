import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/utils/formatDate";
import type { CategoryType } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Feed Detail",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}

async function handlePromote(formData: FormData) {
  "use server";

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const excerpt = (formData.get("excerpt") as string) || content.substring(0, 240);
  const author = (formData.get("author") as string) || "Zayron Intel";
  const category = (formData.get("category") as string) || "Intelligence";

  try {
    const { getRawFeedById } = await import("@/lib/db/queries/rawFeeds");
    const { createArticle } = await import("@/lib/db/queries/articles");
    const { promoteRawFeed } = await import("@/lib/db/queries/rawFeeds");

    const feed = await getRawFeedById(id);
    if (!id || !title || !content) return;

    await createArticle({
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      content,
      excerpt,
      author,
      category: category as CategoryType,
      isPublished: true,
      isFeatured: false,
      isBreaking: false,
      tags: feed ? [feed.sourceChannel] : [],
    });

    await promoteRawFeed(id);
  } catch {
    // DB not available
  }

  redirect("/admin/feeds");
}

export default async function FeedDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { action } = await searchParams;
  let feed: any = null;

  try {
    const { getRawFeedById } = await import("@/lib/db/queries/rawFeeds");
    feed = await getRawFeedById(id);
  } catch {
    // DB not available
  }

  if (!feed) notFound();

  const isPromote = action === "promote";

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#6B6258] mb-6 font-ui">
        <a href="/admin/feeds" className="hover:text-copper transition-colors">
          Raw Feeds
        </a>
        <span className="text-[#2a2a2a]">/</span>
        <span className="text-[#8C8074] font-semibold truncate max-w-[200px]">
          {id.substring(0, 8)}...
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Raw content */}
          <div className="bg-[#0D0D0D] rounded-xl border border-[#2a2a2a] p-6">
            <h2 className="text-[10px] font-ui font-semibold text-[#6B6258] uppercase tracking-widest mb-3">
              Raw Content
            </h2>
            <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-[#8C8074] bg-[#1a1a1a] p-4 rounded-lg border border-[#2a2a2a] max-h-[400px] overflow-y-auto">
              {feed.rawContent}
            </pre>
          </div>

          {/* Translated */}
          {feed.translatedContent && (
            <div className="bg-[#0D0D0D] rounded-xl border border-[#2a2a2a] p-6">
              <h2 className="text-[10px] font-ui font-semibold text-copper uppercase tracking-widest mb-3">
                Translation
              </h2>
              <div className="text-sm leading-relaxed text-white">
                {feed.translatedContent}
              </div>
            </div>
          )}

          {/* Analysis */}
          {feed.analysis && (
            <div className="bg-[#0D0D0D] rounded-xl border border-[#2a2a2a] p-6">
              <h2 className="text-[10px] font-ui font-semibold text-copper uppercase tracking-widest mb-3">
                Analyst Notes
              </h2>
              <p className="text-sm text-white/80 leading-relaxed">
                {feed.analysis}
              </p>
            </div>
          )}

          {/* Promote form */}
          {isPromote && (
            <div className="bg-[#0D0D0D] rounded-xl border-2 border-emerald-500/30 p-6">
              <h2 className="font-display text-base font-bold text-emerald-400 mb-4">
                Promote to Article
              </h2>
              <form action={handlePromote} className="space-y-4">
                <input type="hidden" name="id" value={feed.id} />
                <div>
                  <label className="block text-xs font-semibold text-[#6B6258] mb-1 font-ui uppercase tracking-wider">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={feed.translatedTitle ?? ""}
                    placeholder="Article title"
                    className="w-full text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-copper/50 font-ui"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6258] mb-1 font-ui uppercase tracking-wider">
                    Content
                  </label>
                  <textarea
                    name="content"
                    rows={10}
                    defaultValue={feed.translatedContent ?? feed.rawContent}
                    className="w-full text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-copper/50 font-mono leading-relaxed"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6258] mb-1 font-ui uppercase tracking-wider">
                      Excerpt
                    </label>
                    <input
                      type="text"
                      name="excerpt"
                      defaultValue={feed.translatedContent?.substring(0, 240) ?? ""}
                      placeholder="Brief summary"
                      className="w-full text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-copper/50 font-ui"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6258] mb-1 font-ui uppercase tracking-wider">
                      Author
                    </label>
                    <input
                      type="text"
                      name="author"
                      defaultValue="Zayron Intel"
                      className="w-full text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-copper/50 font-ui"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6258] mb-1 font-ui uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue="Intelligence"
                    className="w-full text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-copper/50 font-ui"
                  >
                    {["Intelligence", "Vulnerabilities", "Ransomware", "Nation State", "Tools"].map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-ui"
                  >
                    Publish Article
                  </button>
                  <a
                    href="/admin/feeds"
                    className="px-5 py-2.5 text-sm text-[#6B6258] hover:text-white transition-colors font-ui"
                  >
                    Cancel
                  </a>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-[#0D0D0D] rounded-xl border border-[#2a2a2a] p-5">
            <h3 className="text-[10px] font-ui font-semibold text-[#6B6258] uppercase tracking-widest mb-3">
              Metadata
            </h3>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-[#6B6258] font-ui">Channel</dt>
                <dd className="font-mono font-semibold text-white">{feed.sourceChannel}</dd>
              </div>
              <div>
                <dt className="text-[#6B6258] font-ui">Language</dt>
                <dd className="font-mono font-semibold text-white">{feed.originalLanguage}</dd>
              </div>
              <div>
                <dt className="text-[#6B6258] font-ui">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[9px] font-ui font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      feed.status === "pending"
                        ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                        : feed.status === "translated"
                        ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                        : feed.status === "promoted"
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                        : "text-[#6B6258] bg-[#1a1a1a] border border-[#2a2a2a]"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        feed.status === "pending"
                          ? "bg-amber-400"
                          : feed.status === "translated"
                          ? "bg-blue-400"
                          : feed.status === "promoted"
                          ? "bg-emerald-400"
                          : "bg-[#6B6258]"
                      }`}
                    />
                    {feed.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[#6B6258] font-ui">AI Generated</dt>
                <dd className="font-semibold">
                  {feed.aiGeneratedFlag ? (
                    <span className="text-red-400">Flagged</span>
                  ) : (
                    <span className="text-[#6B6258]">Not detected</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B6258] font-ui">Received</dt>
                <dd className="font-mono text-white">
                  {feed.timestamp ? formatDate(feed.timestamp) : "—"}
                </dd>
              </div>
              {feed.promptTokens && (
                <div>
                  <dt className="text-[#6B6258] font-ui">Prompt Tokens</dt>
                  <dd className="font-mono text-white">{feed.promptTokens.toLocaleString()}</dd>
                </div>
              )}
              {feed.completionTokens && (
                <div>
                  <dt className="text-[#6B6258] font-ui">Completion Tokens</dt>
                  <dd className="font-mono text-white">
                    {feed.completionTokens.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-[#0D0D0D] rounded-xl border border-[#2a2a2a] p-5">
            <h3 className="text-[10px] font-ui font-semibold text-[#6B6258] uppercase tracking-widest mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              {feed.status === "pending" && (
                <a
                  href={`/admin/feeds/${feed.id}?action=translate`}
                  className="block w-full text-center text-sm font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-500 transition-colors font-ui"
                >
                  Translate
                </a>
              )}
              {(feed.status === "pending" || feed.status === "translated") && (
                <a
                  href={`/admin/feeds/${feed.id}?action=promote`}
                  className="block w-full text-center text-sm font-semibold bg-copper text-white px-4 py-2.5 rounded-lg hover:bg-copper/80 transition-colors font-ui"
                >
                  Promote to Article
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
