import { ArrowRight, Clock, Shield } from '@/lib/icons';
import { getRecentArticles } from '@/lib/supabase/queries/articles';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';

// 3-TIER CACHE LAYER 2: Incremental Static Regeneration (ISR) via unstable_cache
// Aggressively cache the database fetch output at the Vercel/Cloudflare Edge boundary.
// Set time-based revalidation to 60 seconds, and bind it to a tag ('threat-news')
// so we can trigger a hard-purge on-demand via a backend secure webhook.
const getCachedRecentArticles = unstable_cache(
  async (limit: number) => {
    console.log('[ISR CACHE MISS] Querying PostgreSQL database for fresh threat bulletins...');
    try {
      return await getRecentArticles(limit);
    } catch (error: any) {
      console.error('[ISR CACHE ERROR] Failed to query recent articles:', error.message || error);
      return [];
    }
  },
  ['recent-threat-news'], // Cache namespace key
  {
    revalidate: 60, // Time-Based Revalidation: Cache stays valid at the edge for 60 seconds
    tags: ['threat-news'], // On-Demand Revalidation tag: allows instant webhook cache-busting
  },
);

export default async function NewsPage() {
  // Fetch from the Edge-cached layer (failsafe fallback to DB is managed internally)
  const articles = await getCachedRecentArticles(12);

  return (
    <main className="min-h-screen bg-white py-16 px-6 font-sans">
      <div className="max-w-[1200px] mx-auto">
        {/* Header Block */}
        <div className="border-b border-neutral-200 pb-8 mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#733DD9]" />
              </span>
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#050505]">
                Real-Time Ingestion
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#050505] tracking-tight uppercase">
              Threat Intelligence Bulletins
            </h1>
            <p className="text-neutral-500 text-xs mt-2 max-w-xl leading-relaxed">
              Planetary-scale cybersecurity news feeds, zero-day indicators, and nation-state
              exploit analysis parsed by ZAYRON-X core.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-neutral-400 font-mono shrink-0">
            <span>EDGE CACHING ACTIVE (ISR)</span>
            <span>·</span>
            <span>REVALIDATE: 60S</span>
          </div>
        </div>

        {/* Bulletins Grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => {
              const href = `/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`;
              return (
                <div
                  key={article.id}
                  className="bg-white border border-neutral-200 rounded p-6 flex flex-col justify-between hover:border-[#733DD9] transition-all duration-200 shadow-sm"
                >
                  <div>
                    {/* Eyebrow */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] font-mono font-bold text-[#733DD9] uppercase tracking-wider">
                        {article.category.replace('_', ' ')}
                      </span>
                      <span className="text-neutral-300 text-[8px]">·</span>
                      <span className="text-[9px] font-mono text-neutral-400">
                        {article.readTime} MIN READ
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[0.95rem] font-bold text-[#050505] mb-3 leading-snug hover:text-[#733DD9] transition-colors">
                      <Link href={href}>{article.title}</Link>
                    </h3>

                    {/* Excerpt */}
                    <p className="text-neutral-500 text-xs leading-loose mb-6 line-clamp-3">
                      {article.excerpt || `${article.content.substring(0, 120)}...`}
                    </p>
                  </div>

                  {/* Footer link */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <span className="text-[9px] font-mono text-neutral-400">
                      {new Date(article.createdAt || '').toLocaleDateString()}
                    </span>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#733DD9] hover:underline"
                    >
                      READ DOSSIER
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 border border-neutral-200 rounded bg-neutral-50/50">
            <Shield className="w-8 h-8 text-neutral-300 mx-auto mb-4" />
            <p className="text-xs font-mono text-neutral-500">
              No threat news found in the cache. Checking database...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
