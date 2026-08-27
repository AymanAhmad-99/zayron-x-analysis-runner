import React from 'react';
import Link from 'next/link';
import { getThreatFeed } from '@/lib/api';
import { IntelligenceRow } from '@/components/IntelligenceRow';
import { EmptyState } from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Threat Intelligence Stream — ZAYRON-X',
  description: 'Real-time telemetry stream of verified cyber threat signals, active exploits, malware hashes, and infrastructure indicators.',
};

export default async function ThreatsPage({
  searchParams,
}: {
  searchParams?: Promise<{ severity?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const severityFilter = resolvedParams?.severity || '';
  const queryFilter = resolvedParams?.q || '';

  const feedRes = await getThreatFeed({
    limit: 50,
    severity: severityFilter || undefined,
    q: queryFilter || undefined,
  });

  const events = feedRes?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F5F4F0] min-h-screen">
      {/* Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E1DFD7] pt-14 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#D9531E] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#D9531E] animate-pulse" />
              Live Telemetry Stream
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-3 uppercase">
              Intelligence Wire
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed">
              Continuous chronological observation of verified cyber signals, adversary infrastructure, malware payloads, and active vulnerability weaponization.
            </p>
          </div>
        </div>
      </header>

      {/* Filter / Search Bar */}
      <div className="border-b border-[#E1DFD7] bg-[#FFFFFF] sticky top-15 z-30 shadow-none">
        <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-[11px] font-bold uppercase tracking-[0.06em]">
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
      </main>
    </div>
  );
}
