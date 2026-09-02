import React from 'react';
import Link from 'next/link';
import { getThreatFeed } from '@/lib/api';
import { IntelligenceRow } from '@/components/IntelligenceRow';
import { EmptyState } from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Threat Intelligence Stream — ZAYRON-X',
  description: 'Real-time telemetry stream of verified cyber threat signals, active exploits, malware hashes, and infrastructure indicators.',
  alternates: { canonical: '/threats' },
};

export default async function ThreatsPage({
  searchParams,
}: {
  searchParams?: Promise<{ severity?: string; status?: string; type?: string; q?: string; offset?: string }>;
}) {
  const resolvedParams = await searchParams;
  const severityFilter = resolvedParams?.severity || '';
  const statusFilter = resolvedParams?.status || '';
  const typeFilter = resolvedParams?.type || '';
  const queryFilter = resolvedParams?.q || '';
  const offset = Number(resolvedParams?.offset || 0);

  const feedRes = await getThreatFeed({
    limit: 50,
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    q: queryFilter || undefined,
    offset,
  });

  const events = feedRes?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F4] min-h-screen">
      {/* Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E1DFD7] pt-14 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#D9531E] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#D9531E] animate-pulse" />
              OPERATIONAL / THREAT LANDSCAPE
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-3 uppercase">
              Intelligence Wire
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed">
              A chronological operational feed of event records returned by the ZAYRON-X intelligence API.
            </p>
          </div>
        </div>
      </header>

      {/* Filter / Search Bar */}
      <div className="border-b border-[#E1DFD7] bg-[#FFFFFF] sticky top-15 z-30 shadow-none">
        <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form method="GET" action="/threats" className="flex flex-wrap items-center gap-2 w-full text-[10px] font-mono uppercase">
            <input name="q" defaultValue={queryFilter} placeholder="Search events" className="min-w-40 flex-1 border border-[#D9D7D0] bg-[#F7F7F4] px-3 py-2" />
            <select name="severity" defaultValue={severityFilter} className="border border-[#D9D7D0] bg-white px-2 py-2"><option value="">Severity</option><option>critical</option><option>high</option><option>medium</option><option>low</option></select>
            <select name="status" defaultValue={statusFilter} className="border border-[#D9D7D0] bg-white px-2 py-2"><option value="">Status</option><option>VERIFIED</option><option>QUARANTINED</option><option>PUBLISHED</option></select>
            <input name="type" defaultValue={typeFilter} placeholder="Type" className="w-24 border border-[#D9D7D0] bg-white px-2 py-2" /><button className="bg-[#050505] px-3 py-2 text-white hover:bg-[#C94F00]">Apply</button>
          </form>
          <div className="hidden">
            <Link
              href="/threats"
              className={`px-3 py-1.5 border rounded-[4px] transition-colors ${!severityFilter ? 'bg-[#111214] text-[#FFFFFF] border-[#111214]' : 'bg-[#FFFFFF] text-[#5A5D65] border-[#E1DFD7] hover:border-[#111214]'}`}
            >
              All Signals
            </Link>
            <Link
              href="/threats?severity=CRITICAL"
              className={`px-3 py-1.5 border rounded-[4px] transition-colors ${severityFilter === 'CRITICAL' ? 'bg-[#C82323] text-[#FFFFFF] border-[#C82323]' : 'bg-[#FFFFFF] text-[#C82323] border-[#E1DFD7] hover:border-[#C82323]'}`}
            >
              Critical Risk
            </Link>
            <Link
              href="/threats?severity=HIGH"
              className={`px-3 py-1.5 border rounded-[4px] transition-colors ${severityFilter === 'HIGH' ? 'bg-[#D9531E] text-[#FFFFFF] border-[#D9531E]' : 'bg-[#FFFFFF] text-[#D9531E] border-[#E1DFD7] hover:border-[#D9531E]'}`}
            >
              High Severity
            </Link>
            <Link
              href="/threats?severity=MEDIUM"
              className={`px-3 py-1.5 border rounded-[4px] transition-colors ${severityFilter === 'MEDIUM' ? 'bg-[#D9821E] text-[#FFFFFF] border-[#D9821E]' : 'bg-[#FFFFFF] text-[#D9821E] border-[#E1DFD7] hover:border-[#D9821E]'}`}
            >
              Medium
            </Link>
          </div>

          <div className="text-[11px] font-mono text-[#8C8F98]">
            {events.length} Telemetry Events Observed
          </div>
        </div>
      </div>

      {/* Main Stream Rows */}
      <main className="max-w-[1280px] mx-auto px-6 py-10 flex-1 w-full">
        {events.length === 0 ? (
          <EmptyState message="No threat telemetry signals matched the selected criteria." />
        ) : (
          <div className="bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] divide-y divide-[#E1DFD7] shadow-sm overflow-hidden">
            {events.map((evt) => (
              <IntelligenceRow key={evt.id} event={evt} />
            ))}
          </div>
        )}
        {events.length > 0 && <div className="mt-6 flex justify-between font-mono text-xs"><Link href={`/threats?${new URLSearchParams({ ...(severityFilter && { severity: severityFilter }), ...(statusFilter && { status: statusFilter }), ...(typeFilter && { type: typeFilter }), ...(queryFilter && { q: queryFilter }), offset: String(Math.max(0, offset - 50)) })}`}>← Previous</Link><Link href={`/threats?${new URLSearchParams({ ...(severityFilter && { severity: severityFilter }), ...(statusFilter && { status: statusFilter }), ...(typeFilter && { type: typeFilter }), ...(queryFilter && { q: queryFilter }), offset: String(offset + 50) })}`}>Next →</Link></div>}
      </main>
    </div>
  );
}
