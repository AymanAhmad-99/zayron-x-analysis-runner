import React from 'react';
import { Search, ShieldAlert, Activity, Target, Layers } from 'lucide-react';
import { IntelligenceCard } from '@zayron/ui';
import Link from 'next/link';
import { getThreatFeed } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function IntelligenceFeedPage({
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

  const feedResponse = await getThreatFeed({
    limit,
    offset,
    severity: severityFilter,
    type: typeFilter,
    q: searchFilter,
  });

  const events = feedResponse?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <h1 className="font-serif text-5xl font-bold text-[#111111] mb-6">Global Intelligence Feed</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Real-time aggregation of emerging threats, actor activity, and critical vulnerabilities. Processed, validated, and scored by sovereign Zayron-X pipelines.
            </p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          
          {/* Left Column: Filters */}
          <aside className="w-full lg:w-64 shrink-0 space-y-8 bg-white p-6 border border-[#111111]/10">
            <form method="GET" action="/intelligence" className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#111111] border-b border-[#111111]/10 pb-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#2D2D2D]" /> Discovery
                </h3>
                <input 
                  type="text" 
                  name="q"
                  defaultValue={searchFilter}
                  placeholder="Search keywords..." 
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#111111]/20 rounded-none text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#111111] border-b border-[#111111]/10 pb-2">
                  Severity Level
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'All Severities', val: '' },
                    { label: 'Critical', val: 'critical' },
                    { label: 'High', val: 'high' },
                    { label: 'Medium', val: 'medium' },
                    { label: 'Low', val: 'low' },
                  ].map((sev) => (
                    <label key={sev.val} className="flex items-center gap-2 text-xs font-sans text-[#2D2D2D] cursor-pointer">
                      <input 
                        type="radio" 
                        name="severity" 
                        value={sev.val} 
                        defaultChecked={severityFilter.toLowerCase() === sev.val}
                        className="text-[#FF6B00] focus:ring-[#FF6B00]" 
                      />
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
                  Apply Filter
                </button>
              </div>
            </form>
          </aside>

          {/* Right Column: Live Feed Items */}
          <main className="flex-1 w-full space-y-6">
            <div className="flex items-center justify-between border-b border-[#111111]/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2D2D2D]">
                Showing {events.length} Normalized Events
              </span>
              <span className="text-xs font-mono text-[#2D2D2D]">
                LIVE PRODUCTION STREAM
              </span>
            </div>

            {events.length === 0 ? (
              <div className="bg-white border border-[#111111]/10 p-12 text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-[#FF6B00] mx-auto opacity-40" />
                <h3 className="font-serif text-2xl font-bold text-[#111111]">No Intelligence Events</h3>
                <p className="text-sm text-[#2D2D2D]">No records match the current criteria.</p>
                <Link href="/intelligence" className="inline-block px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest">
                  Reset Filter
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((ev) => (
                  <IntelligenceCard
                    key={ev.id}
                    id={ev.id}
                    title={ev.title}
                    summary={ev.summary || 'No summary provided.'}
                    severity={ev.severity as any}
                    confidence={ev.confidence}
                    firstSeenAt={ev.first_seen_at}
                    sourceName={ev.evidence?.[0]?.source_display_name || 'Verified Stream'}
                    cves={ev.entities?.cves || []}
                    actors={ev.entities?.actors || []}
                  />
                ))}

                {/* Pagination */}
                <div className="border-t border-[#111111]/10 bg-white p-4 flex items-center justify-between">
                  {page > 1 ? (
                    <Link
                      href={`/intelligence?page=${page - 1}${severityFilter ? `&severity=${severityFilter}` : ''}${searchFilter ? `&q=${searchFilter}` : ''}`}
                      className="px-4 py-2 border border-[#111111]/20 text-xs font-bold uppercase tracking-widest hover:bg-[#F7F7F5]"
                    >
                      ← Previous
                    </Link>
                  ) : <div />}

                  <span className="text-xs font-mono font-bold text-[#2D2D2D]">Page {page}</span>

                  {events.length === limit ? (
                    <Link
                      href={`/intelligence?page=${page + 1}${severityFilter ? `&severity=${severityFilter}` : ''}${searchFilter ? `&q=${searchFilter}` : ''}`}
                      className="px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF6B00]"
                    >
                      Next →
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
