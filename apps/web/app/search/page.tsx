import React from 'react';
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
    <div className="flex-1 flex flex-col bg-[#F5F4F0] min-h-screen">
      {/* Search Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E1DFD7] pt-14 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-[10px] font-mono font-bold text-[#D9531E] uppercase tracking-wider mb-2">
              Cross-Entity Search
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#111214] mb-6 uppercase">
              Global Intelligence Search
            </h1>
            
            <form method="GET" action="/search" className="relative group">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search CVEs, Threat Actors, Malware, IOCs, or Telemetry..."
                className="w-full bg-[#F5F4F0] border border-[#E1DFD7] text-[#111214] placeholder:text-[#8C8F98] text-sm font-mono rounded-[4px] py-3.5 pl-4 pr-24 focus:outline-none focus:border-[#111214] transition-colors"
                autoFocus
              />
              <button 
                type="submit"
                className="absolute inset-y-1.5 right-1.5 px-4 bg-[#111214] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider rounded-[3px] hover:bg-[#28292E] transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Search Results */}
      <div className="max-w-[1280px] mx-auto px-6 py-10 flex-1 w-full">
        <div className="max-w-4xl mx-auto space-y-10">
          {!query ? (
            <div className="text-center py-16 space-y-4 bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] p-8 shadow-sm">
              <h3 className="font-editorial text-xl font-bold text-[#111214]">Search the Intelligence Graph</h3>
              <p className="text-xs text-[#5A5D65] max-w-md mx-auto">
                Query across sovereign threat actors, active CVE exploits, malware signatures, and verified IOCs.
              </p>
              <div className="flex justify-center flex-wrap gap-2 pt-2">
                {['APT29', 'CVE-2026-1453', 'Cobalt Strike', '194.26.29.112'].map((example) => (
                  <Link
                    key={example}
                    href={`/search?q=${encodeURIComponent(example)}`}
                    className="px-3 py-1 bg-[#F5F4F0] border border-[#E1DFD7] rounded-[3px] text-xs font-mono font-bold text-[#111214] hover:border-[#111214]"
                  >
                    {example}
                  </Link>
                ))}
              </div>
            </div>
          ) : totalMatches === 0 ? (
            <div className="text-center py-16 space-y-4 bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] p-12 shadow-sm">
              <h3 className="font-editorial text-xl font-bold text-[#111214]">No Records Found</h3>
              <p className="text-xs text-[#5A5D65]">
                No intelligence records matched &quot;{query}&quot;. Try querying another CVE, Actor alias, or IP.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-[#E1DFD7] pb-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#111214]">
                  Search Results for &quot;{query}&quot;
                </span>
                <span className="font-mono text-[#8C8F98]">
                  {totalMatches} matched records
                </span>
              </div>

              {/* Threat Actors */}
              {results?.actors && results.actors.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111214]">
                    Threat Actors ({results.actors.length})
                  </h3>
                  <div className="divide-y divide-[#E1DFD7] border border-[#E1DFD7] bg-[#FFFFFF] rounded-[6px] overflow-hidden shadow-sm">
                    {results.actors.map((actor: any) => (
                      <Link 
                        key={actor.id} 
                        href={`/actors/${actor.slug}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F5F4F0] transition-colors group block"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-[#111214] group-hover:text-[#D9531E]">{actor.name}</h4>
                          <p className="text-xs text-[#5A5D65]">{actor.description || 'Verified threat actor'}</p>
                        </div>
                        <span className="text-xs text-[#8C8F98] group-hover:text-[#111214]">&rarr;</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Vulnerabilities */}
              {results?.vulnerabilities && results.vulnerabilities.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111214]">
                    Vulnerabilities ({results.vulnerabilities.length})
                  </h3>
                  <div className="divide-y divide-[#E1DFD7] border border-[#E1DFD7] bg-[#FFFFFF] rounded-[6px] overflow-hidden shadow-sm">
                    {results.vulnerabilities.map((vuln: any) => (
                      <Link 
                        key={vuln.id} 
                        href={`/vulnerabilities/${vuln.cve_id}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F5F4F0] transition-colors group block"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#111214] group-hover:text-[#D9531E]">{vuln.cve_id}</span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#F5F4F0] border border-[#E1DFD7] rounded-[2px]">{vuln.severity}</span>
                          </div>
                          <p className="text-xs text-[#5A5D65] mt-1">{vuln.title}</p>
                        </div>
                        <span className="text-xs text-[#8C8F98] group-hover:text-[#111214]">&rarr;</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Malware */}
              {results?.malware && results.malware.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111214]">
                    Malware Families ({results.malware.length})
                  </h3>
                  <div className="divide-y divide-[#E1DFD7] border border-[#E1DFD7] bg-[#FFFFFF] rounded-[6px] overflow-hidden shadow-sm">
                    {results.malware.map((mw: any) => (
                      <Link 
                        key={mw.id} 
                        href={`/malware/${mw.slug}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F5F4F0] transition-colors group block"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-[#111214] group-hover:text-[#D9531E]">{mw.name}</h4>
                          <p className="text-xs text-[#5A5D65]">{mw.description || 'Malware family'}</p>
                        </div>
                        <span className="text-xs text-[#8C8F98] group-hover:text-[#111214]">&rarr;</span>
                      </Link>
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
