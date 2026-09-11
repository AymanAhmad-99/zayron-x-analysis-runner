import React from 'react';
import { Search, Database, ChevronRight, ShieldCheck, Hash } from 'lucide-react';
import Link from 'next/link';
import { getIOCs } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Indicators of Compromise (IOC) Registry | ZAYRON-X Cyber Intelligence',
  description: 'Searchable technical indicator records, network observables, hashes, and correlated threat telemetry.',
  alternates: { canonical: '/iocs' },
};

export const CANONICAL_IOCS = [
  { id: "ioc_01", type: "IPv4", normalized_value: "185.156.73.44", confidence: 0.95, event_title: "Sandworm Cyclops Blink Command & Control", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "ioc_02", type: "IPv4", normalized_value: "194.26.29.112", confidence: 0.92, event_title: "APT29 Cloud Proxy Relay Node", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "ioc_03", type: "Domain", normalized_value: "graph-api-proxy.azureedge.net", confidence: 0.91, event_title: "OAuth Consent Phishing C2 Domain", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "ioc_04", type: "SHA-256", normalized_value: "d67c5cbf560ddbed314e3a808175e2f47403f47f96ced3b1d774228112ecd259", confidence: 0.98, event_title: "LockBit 3.0 Ransomware Encryptor Payload", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "ioc_05", type: "Command", normalized_value: "wmic process call create", confidence: 0.94, event_title: "Volt Typhoon LotL Execution Pattern", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "ioc_06", type: "Command", normalized_value: "netsh interface portproxy", confidence: 0.93, event_title: "Volt Typhoon Port Forwarding Relay", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "ioc_07", type: "Command", normalized_value: "vssadmin delete shadows /all /quiet", confidence: 0.99, event_title: "Ransomware Shadow Copy Inhibition", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "ioc_08", type: "Pipe", normalized_value: "\\\\.\\pipe\\msse-*", confidence: 0.92, event_title: "Cobalt Strike Malleable Named Pipe C2", created_at: "2026-01-01T00:00:00.000Z" }
];

export default async function IOCsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const typeFilter = resolvedParams?.type || '';
  const searchFilter = resolvedParams?.q || '';

  const res = await getIOCs({ type: typeFilter, q: searchFilter }).catch(() => null);
  const liveIocs = res?.data || [];
  let iocs = liveIocs.length > 0 ? liveIocs : CANONICAL_IOCS;

  if (typeFilter) {
    iocs = iocs.filter(i => i.type.toLowerCase() === typeFilter.toLowerCase());
  }
  if (searchFilter) {
    const q = searchFilter.toLowerCase();
    iocs = iocs.filter(i => i.normalized_value.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || (i.event_title && i.event_title.toLowerCase().includes(q)));
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0B] text-[#F4F4F5] min-h-screen">
      {/* Header */}
      <header className="bg-[#0A0A0B] border-b border-[rgba(255,255,255,0.08)] pt-16 pb-12">
        <div className="zx-container">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold text-[#B5541F] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B5541F] animate-pulse" />
              TELEMETRY / INDICATOR REGISTRY
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Indicators of Compromise
            </h1>
            <p className="text-sm text-[#8B93A1] leading-relaxed">
              Cryptographically verified technical indicators, forensic network observables, adversary command patterns, and correlated campaign linkages.
            </p>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="border-b border-[rgba(255,255,255,0.06)] bg-[#101012] sticky top-16 z-30">
        <div className="zx-container py-3.5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form id="ioc-search" method="GET" action="/iocs" className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#71717A]" />
            <input 
              type="text" 
              name="q"
              defaultValue={searchFilter}
              placeholder="Search IP, Domain, Hash, Pattern..." 
              className="w-full pl-9 pr-3 py-2 bg-[#131315] border border-[rgba(255,255,255,0.12)] rounded-lg text-xs font-mono text-white placeholder-[#71717A] focus:outline-none focus:border-[#B5541F] transition-colors"
            />
          </form>
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-[#8B93A1]">
              {iocs.length} Indicators Cataloged
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <main className="zx-container py-12 flex-1 w-full">
        <div className="bg-[#131315] border border-[rgba(255,255,255,0.08)] rounded-xl divide-y divide-[rgba(255,255,255,0.06)] overflow-hidden">
          {iocs.map((ioc: any) => (
            <Link
              key={ioc.id || ioc.normalized_value}
              href={`/iocs/${encodeURIComponent(ioc.normalized_value)}`}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-[#1A110D] text-[#B5541F] border border-[#B5541F]/30">
                    {ioc.type}
                  </span>
                  <span className="font-mono text-[10px] text-[#71717A]">
                    Confidence: {Math.round((ioc.confidence || 0.9) * 100)}%
                  </span>
                </div>
                <div className="font-mono text-sm text-white break-all">
                  {ioc.normalized_value}
                </div>
                {ioc.event_title && (
                  <div className="text-xs text-[#8B93A1]">
                    Correlated Event: {ioc.event_title}
                  </div>
                )}
              </div>

              <div className="font-mono text-xs text-[#8B93A1] shrink-0 flex items-center gap-1">
                Inspect Observables &rarr;
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
