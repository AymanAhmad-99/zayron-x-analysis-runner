import { getCached } from '@/lib/cache/redis';
import { getArticles } from '@/lib/db/queries/articles';
import { Shield, Globe, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 60; // ISR validation

function categorySlug(value: string | null | undefined) {
  return (value ?? 'intelligence').toLowerCase().replace(/\s+/g, '-');
}

export default async function TodayIntelligencePage() {
  // Fetch latest articles
  const articles = await getCached(process.env, 'today:articles', () => getArticles(1, 30), 60) || [];
  
  const todayArticles = articles.filter(a => {
    const pubDate = new Date(a.publishedAt || a.createdAt);
    const now = new Date();
    return (now.getTime() - pubDate.getTime()) < 24 * 60 * 60 * 1000;
  });

  const criticalVulnerabilities = todayArticles.filter(a => a.severity === 'critical');

  return (
    <main className="min-h-screen bg-[#F7F7F5] pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-12 border-b border-[#252B33]/10 pb-8">
          <h1 className="text-4xl font-serif text-[#111111] mb-2">Today's Intelligence Briefing</h1>
          <p className="text-[#56606B]">A consolidated view of critical cyber threats and events detected in the past 24 hours.</p>
        </header>

        {todayArticles.length === 0 ? (
          <div className="bg-white border border-[#252B33]/15 rounded-lg p-12 text-center shadow-sm">
            <Shield className="h-12 w-12 text-[#FF6A00] mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-bold text-[#111111] mb-2">No critical intelligence alerts published today.</h2>
            <p className="text-[#56606B]">ZAYRON-X telemetry continues to monitor active streams. The dashboard will automatically update upon verified signal ingestion.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-[#111111] mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#FF6A00]" />
                Top Intelligence
              </h2>
              {todayArticles.map(article => (
                <Link key={article.id} href={`/intelligence/${categorySlug(article.category)}/${article.slug}`} className="block bg-white border border-[#252B33]/15 rounded-lg p-6 shadow-sm hover:border-[#FF6A00] transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                      article.severity === 'critical' ? 'bg-red-50 text-red-600' :
                      article.severity === 'high' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {article.severity || 'Medium'}
                    </span>
                    <span className="text-xs text-[#7A838D] font-mono">
                      {new Date(article.publishedAt || article.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#111111] mb-2">{article.title}</h3>
                  <p className="text-sm text-[#56606B] line-clamp-3">{article.excerpt || article.dek || 'No executive summary available.'}</p>
                </Link>
              ))}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-[#111111] mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Critical Vulnerabilities
              </h2>
              <div className="bg-white border border-red-500/20 rounded-lg p-5 shadow-sm">
                {criticalVulnerabilities.length > 0 ? (
                  <ul className="space-y-4">
                    {criticalVulnerabilities.map(vuln => (
                      <li key={vuln.id} className="border-b border-[#252B33]/10 pb-4 last:border-0 last:pb-0">
                         <Link href={`/intelligence/${categorySlug(vuln.category)}/${vuln.slug}`} className="hover:text-red-600 transition-colors">
                           <h4 className="text-sm font-bold text-[#111111]">{vuln.title}</h4>
                           <p className="text-xs text-[#56606B] mt-1 line-clamp-2">{vuln.dek || vuln.excerpt}</p>
                         </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#56606B]">No critical vulnerabilities detected today.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
