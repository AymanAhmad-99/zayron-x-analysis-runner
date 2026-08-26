import React from 'react';
import { Search as SearchIcon, FileText, Target, Activity, Database, ShieldAlert, Layers, Command, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { searchGlobal } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q || '';

  const searchResults = query ? await searchGlobal(query) : null;
  const results = searchResults?.data;
  const totalMatches = searchResults?.meta?.total_matches || 0;

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-screen">
      {/* Search Header */}
      <header className="bg-[#F7F7F5] border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-serif text-4xl font-bold text-[#111111] mb-6 text-center">Global Intelligence Search</h1>
            
            <form method="GET" action="/search" className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <SearchIcon className="h-6 w-6 text-[#111111]" />
              </div>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search CVEs, Threat Actors, Malware, IOCs, or Telemetry..."
                className="w-full bg-white border border-[#111111]/20 text-[#111111] placeholder:text-[#2D2D2D]/60 text-lg rounded-none py-4 pl-14 pr-16 focus:outline-none focus:border-[#FF6B00] transition-colors"
                autoFocus
              />
              <button 
                type="submit"
                className="absolute inset-y-2 right-2 px-4 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF6B00] transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Search Results */}
      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {!query ? (
            <div className="text-center py-16 space-y-4">
              <Database className="w-12 h-12 text-[#FF6B00] mx-auto opacity-30" />
              <h3 className="font-serif text-2xl font-bold text-[#111111]">Search the Intelligence Graph</h3>
              <p className="text-sm text-[#2D2D2D] max-w-md mx-auto">
                Query across sovereign threat actors, active CVE exploits, malware signatures, and verified IOCs.
              </p>
              <div className="flex justify-center gap-2 pt-4">
                {['APT29', 'CVE-2026-1453', 'Cobalt Strike', '194.26.29.112'].map((example) => (
                  <Link
                    key={example}
                    href={`/search?q=${encodeURIComponent(example)}`}
                    className="px-3 py-1 bg-[#F7F7F5] border border-[#111111]/10 text-xs font-mono font-bold hover:border-[#111111]"
                  >
                    {example}
                  </Link>
                ))}
              </div>
            </div>
          ) : totalMatches === 0 ? (
            <div className="text-center py-16 space-y-4 bg-[#F7F7F5] border border-[#111111]/10 p-12">
              <ShieldAlert className="w-12 h-12 text-[#FF6B00] mx-auto opacity-40" />
              <h3 className="font-serif text-2xl font-bold text-[#111111]">No Records Found</h3>
              <p className="text-sm text-[#2D2D2D]">
                No intelligence records matched &quot;{query}&quot;. Try querying another CVE, Actor alias, or IP.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-[#111111]/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#2D2D2D]">
                  Search Results for &quot;{query}&quot;
                </span>
                <span className="text-xs font-mono text-[#2D2D2D] font-bold">
                  {totalMatches} matched records
                </span>
              </div>

              {/* Threat Actors */}
              {results?.actors && results.actors.length > 0 && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]">
                    <Target className="w-4 h-4 text-[#FF6B00]" /> Threat Actors ({results.actors.length})
                  </h3>
                  <div className="divide-y divide-[#111111]/10 border border-[#111111]/10 bg-white">
                    {results.actors.map((actor) => (
                      <Link 
                        key={actor.id} 
                        href={`/actors/${actor.slug}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors group block"
                      >
                        <div>
                          <h4 className="font-bold text-base text-[#111111] group-hover:text-[#FF6B00]">{actor.name}</h4>
                          <p className="text-xs text-[#2D2D2D]">{actor.description || 'Verified threat actor'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#2D2D2D] opacity-40 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Vulnerabilities */}
              {results?.vulnerabilities && results.vulnerabilities.length > 0 && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]">
                    <ShieldAlert className="w-4 h-4 text-[#FF6B00]" /> Vulnerabilities ({results.vulnerabilities.length})
                  </h3>
                  <div className="divide-y divide-[#111111]/10 border border-[#111111]/10 bg-white">
                    {results.vulnerabilities.map((vuln) => (
                      <Link 
                        key={vuln.id} 
                        href={`/vulnerabilities/${vuln.cve_id}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors group block"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#111111] group-hover:text-[#FF6B00]">{vuln.cve_id}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#F7F7F5] border border-[#111111]/10">{vuln.severity}</span>
                          </div>
                          <p className="text-xs text-[#2D2D2D] mt-1">{vuln.title}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#2D2D2D] opacity-40 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Malware */}
              {results?.malware && results.malware.length > 0 && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]">
                    <Layers className="w-4 h-4 text-[#FF6B00]" /> Malware Families ({results.malware.length})
                  </h3>
                  <div className="divide-y divide-[#111111]/10 border border-[#111111]/10 bg-white">
                    {results.malware.map((mw) => (
                      <Link 
                        key={mw.id} 
                        href={`/malware/${mw.slug}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors group block"
                      >
                        <div>
                          <h4 className="font-bold text-base text-[#111111] group-hover:text-[#FF6B00]">{mw.name}</h4>
                          <p className="text-xs text-[#2D2D2D]">{mw.description || 'Malware family'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#2D2D2D] opacity-40 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Indicators of Compromise */}
              {results?.iocs && results.iocs.length > 0 && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]">
                    <Database className="w-4 h-4 text-[#FF6B00]" /> Indicators of Compromise ({results.iocs.length})
                  </h3>
                  <div className="divide-y divide-[#111111]/10 border border-[#111111]/10 bg-white">
                    {results.iocs.map((ioc) => (
                      <Link 
                        key={ioc.id} 
                        href={`/iocs/${encodeURIComponent(ioc.normalized_value)}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors group block"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono uppercase bg-[#F7F7F5] px-2 py-0.5 border border-[#111111]/10 font-bold">{ioc.type}</span>
                          <span className="font-mono text-sm font-bold text-[#111111] group-hover:text-[#FF6B00] break-all">{ioc.normalized_value}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#2D2D2D] opacity-40 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Intelligence Events */}
              {results?.events && results.events.length > 0 && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]">
                    <Activity className="w-4 h-4 text-[#FF6B00]" /> Telemetry & Events ({results.events.length})
                  </h3>
                  <div className="divide-y divide-[#111111]/10 border border-[#111111]/10 bg-white">
                    {results.events.map((ev) => (
                      <div key={ev.id} className="p-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm text-[#111111]">{ev.title}</h4>
                          <span className="text-[10px] font-mono uppercase bg-[#F7F7F5] px-1.5 py-0.5 border border-[#111111]/10">{ev.severity}</span>
                        </div>
                        <p className="text-xs text-[#2D2D2D] line-clamp-2">{ev.summary}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Published Articles */}
              {results?.articles && results.articles.length > 0 && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]">
                    <FileText className="w-4 h-4 text-[#FF6B00]" /> Intelligence Articles ({results.articles.length})
                  </h3>
                  <div className="divide-y divide-[#111111]/10 border border-[#111111]/10 bg-white">
                    {results.articles.map((art) => (
                      <div key={art.id} className="p-4">
                        <h4 className="font-bold text-sm text-[#111111]">{art.title}</h4>
                        <span className="text-[10px] text-[#2D2D2D] uppercase font-mono">{art.category}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
