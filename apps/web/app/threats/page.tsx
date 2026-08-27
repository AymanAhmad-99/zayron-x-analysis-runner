import React from 'react';
import Link from 'next/link';
import { getThreatFeed } from '@/lib/api';
import { IntelligenceRow } from '@/components/IntelligenceRow';
import { EmptyState } from '@/components/EmptyState';
import { Shield, Filter } from 'lucide-react';

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
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Header */}
      <header className="bg-[#FFFFFF] border-b border-[#D9DDE2] pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF6A00] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse" />
              Live Telemetry Stream
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111111] mb-4">
              Intelligence Wire
            </h1>
            <p className="text-base sm:text-lg text-[#56606B] leading-relaxed">
              Continuous chronological observation of verified cyber signals, adversary infrastructure, malware payloads, and active vulnerability weaponization.
            </p>
          </div>
        </div>
      </header>

      {/* Filter / Search Bar */}
      <div className="border-b border-[#D9DDE2] bg-[#FFFFFF] sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs font-medium">
            <Link
              href="/threats"
              className={`px-3 py-1.5 border transition-colors ${!severityFilter ? 'bg-[#111111] text-[#FFFFFF] border-[#111111]' : 'bg-[#FFFFFF] text-[#56606B] border-[#D9DDE2] hover:border-[#111111]'}`}
            >
              All Signals
            </Link>
            <Link
              href="/threats?severity=CRITICAL"
              className={`px-3 py-1.5 border transition-colors ${severityFilter === 'CRITICAL' ? 'bg-red-600 text-[#FFFFFF] border-red-600' : 'bg-[#FFFFFF] text-red-600 border-[#D9DDE2] hover:border-red-600'}`}
            >
              Critical Risk
            </Link>
            <Link
              href="/threats?severity=HIGH"
              className={`px-3 py-1.5 border transition-colors ${severityFilter === 'HIGH' ? 'bg-[#FF6A00] text-[#FFFFFF] border-[#FF6A00]' : 'bg-[#FFFFFF] text-[#FF6A00] border-[#D9DDE2] hover:border-[#FF6A00]'}`}
            >
              High Severity
            </Link>
            <Link
              href="/threats?severity=MEDIUM"
              className={`px-3 py-1.5 border transition-colors ${severityFilter === 'MEDIUM' ? 'bg-yellow-600 text-[#FFFFFF] border-yellow-600' : 'bg-[#FFFFFF] text-yellow-600 border-[#D9DDE2] hover:border-yellow-600'}`}
            >
              Medium
            </Link>
          </div>

          <div className="text-xs font-mono text-[#7A838D]">
            {events.length} Telemetry Events Observed
          </div>
        </div>
      </div>

      {/* Main Stream Rows */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        {events.length === 0 ? (
          <EmptyState message="No threat telemetry signals matched the selected criteria." />
        ) : (
          <div className="bg-[#FFFFFF] border border-[#D9DDE2] divide-y divide-[#D9DDE2]">
            {events.map((evt) => (
              <IntelligenceRow key={evt.id} event={evt} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
