import React from 'react';
import { IntelligenceCard, EvidencePanel } from '@zayron/ui';
import { Search, Filter, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getThreatFeed, getAIAnalysis } from '@/lib/api';
import { AIAnswer } from '@zayron/ui';

export const dynamic = 'force-dynamic';

export default async function ThreatsPage({
  searchParams,
}: {
  searchParams?: Promise<{ severity?: string; type?: string; q?: string; page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const severityFilter = resolvedParams?.severity || '';
  const typeFilter = resolvedParams?.type || '';
  const searchFilter = resolvedParams?.q || '';
  const page = Number(resolvedParams?.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const [feedResponse, aiResponse] = await Promise.all([
    getThreatFeed({
      limit,
      offset,
      severity: severityFilter,
      type: typeFilter,
      q: searchFilter,
    }),
    getAIAnalysis(searchFilter ? `Analyze threats matching '${searchFilter}'` : undefined),
  ]);

  const threats = feedResponse?.data || [];
  const totalCount = feedResponse?.meta?.count || threats.length;

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#FF6B00] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse"></span>
              Live Pipeline Stream
            </div>
            <h1 className="font-serif text-5xl font-bold text-[#111111] mb-6">Global Threat Radar</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Real-time intelligence feed of active campaigns, zero-day exploitation, and actor infrastructure. Captured by sovereign radar sources and normalized with cryptographic evidence hashes.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Real URL-driven Filters */}
          <aside className="w-full lg:w-64 shrink-0 space-y-8 bg-white p-6 border border-[#111111]/10">
            <form method="GET" action="/threats" className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#111111] border-b border-[#111111]/10 pb-2">
                  Keyword Filter
                </h3>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#2D2D2D]" />
                  <input 
                    type="text" 
                    name="q"
                    defaultValue={searchFilter}
                    placeholder="CVE, Actor, IP..." 
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F7F5] border border-[#111111]/20 rounded-none text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#111111] border-b border-[#111111]/10 pb-2">
                  Severity
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'All Severities', val: '' },
                    { label: 'Critical', val: 'critical', color: 'bg-[#D92D20]' },
                    { label: 'High', val: 'high', color: 'bg-[#FF6B00]' },
                    { label: 'Medium', val: 'medium', color: 'bg-amber-500' },
                    { label: 'Low', val: 'low', color: 'bg-blue-500' },
                  ].map((sev) => (
                    <label key={sev.val} className="flex items-center gap-2 text-xs font-sans text-[#2D2D2D] cursor-pointer">
                      <input 
                        type="radio" 
                        name="severity" 
                        value={sev.val} 
                        defaultChecked={severityFilter.toLowerCase() === sev.val}
                        className="text-[#FF6B00] focus:ring-[#FF6B00]" 
                      />
                      {sev.color && <span className={`w-2 h-2 ${sev.color}`}></span>}
                      {sev.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button 
                  type="submit" 
                  className="w-full py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF6B00] transition-colors"
                >
                  Apply Filters
                </button>
                {(severityFilter || searchFilter || typeFilter) && (
                  <Link 
                    href="/threats" 
                    className="px-3 py-2 border border-[#111111]/20 text-xs font-bold uppercase tracking-widest hover:bg-[#F7F7F5] text-center"
                  >
                    Reset
                  </Link>
                )}
              </div>
            </form>
          </aside>

          {/* Center Column: Live Feed */}
          <main className="flex-1 w-full space-y-6">
            {aiResponse?.data && (
              <div className="bg-white border border-[#111111]/10 p-6 shadow-sm">
                <AIAnswer
                  query={searchFilter || 'Telemetry Assessment'}
                  answer={aiResponse.data.assessment}
                  confidence={aiResponse.data.confidence_score}
                  citations={aiResponse.data.source_citations.map((c) => ({
                    title: c.claim,
                    sourceName: c.source_name,
                  }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between border-b border-[#111111]/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2D2D2D]">
                Showing {threats.length} live records (Page {page})
              </span>
              <span className="text-xs font-mono text-[#2D2D2D]">
                Feed Status: REAL D1 ENGINE
              </span>
            </div>

            {threats.length === 0 ? (
              <div className="bg-white border border-[#111111]/10 p-12 text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-[#FF6B00] mx-auto opacity-40" />
                <h3 className="font-serif text-2xl font-bold text-[#111111]">No Threat Events Matching Filter</h3>
                <p className="text-sm text-[#2D2D2D] max-w-md mx-auto">
                  No live intelligence events matched your filter parameters. Clear the filter criteria or wait for new telemetry ingest cycles.
                </p>
                <Link 
                  href="/threats" 
                  className="inline-block px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF6B00] transition-colors"
                >
                  Reset All Filters
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {threats.map((threat) => (
                  <article key={threat.id} className="space-y-2">
                    <IntelligenceCard
                      id={threat.id}
                      title={threat.title}
                      summary={threat.summary || 'No summary provided.'}
                      severity={threat.severity as any}
                      confidence={threat.confidence}
                      firstSeenAt={threat.first_seen_at}
                      sourceName={threat.evidence?.[0]?.source_display_name || 'Verified Stream'}
                      cves={threat.entities?.cves || []}
                      actors={threat.entities?.actors || []}
                    />

                    {threat.evidence && threat.evidence.length > 0 && (
                      <div className="pl-6">
                        <EvidencePanel
                          defaultExpanded={false}
                          evidence={threat.evidence.map((e) => ({
                            id: e.id,
                            sourceName: e.source_display_name || 'Telemetry Node',
                            type: e.type,
                            url: e.url,
                            snippet: e.snippet,
                            weight: e.weight,
                            capturedAt: e.created_at,
                          }))}
                        />
                      </div>
                    )}
                  </article>
                ))}

                {/* Pagination Controls */}
                <div className="border-t border-[#111111]/10 bg-white p-4 flex items-center justify-between">
                  {page > 1 ? (
                    <Link
                      href={`/threats?page=${page - 1}${severityFilter ? `&severity=${severityFilter}` : ''}${searchFilter ? `&q=${searchFilter}` : ''}`}
                      className="px-4 py-2 border border-[#111111]/20 text-xs font-bold uppercase tracking-widest hover:bg-[#F7F7F5] transition-colors"
                    >
                      ← Previous Page
                    </Link>
                  ) : <div />}

                  <span className="text-xs font-mono font-bold text-[#2D2D2D]">
                    Page {page}
                  </span>

                  {threats.length === limit ? (
                    <Link
                      href={`/threats?page=${page + 1}${severityFilter ? `&severity=${severityFilter}` : ''}${searchFilter ? `&q=${searchFilter}` : ''}`}
                      className="px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF6B00] transition-colors"
                    >
                      Next Page →
                    </Link>
                  ) : <div />}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
