import React from 'react';
import Link from 'next/link';
import { getVulnerabilities } from '@/lib/api';
import { SeverityBadge } from '@/components/SeverityBadge';
import { EmptyState } from '@/components/EmptyState';
import { Bug, Search, ChevronRight, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Vulnerability Intelligence Radar — ZAYRON-X',
  description: 'Evidence-grounded vulnerability registry tracking CVE disclosures, CISA KEV active exploitation, and FIRST EPSS probability scores.',
};

export default async function VulnerabilitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; severity?: string }>;
}) {
  const resolvedParams = await searchParams;
  const queryFilter = resolvedParams?.q || '';
  const severityFilter = resolvedParams?.severity || '';

  const res = await getVulnerabilities({
    q: queryFilter || undefined,
    severity: severityFilter || undefined,
    limit: 50,
  });

  const vulns = res?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Header */}
      <header className="bg-[#FFFFFF] border-b border-[#D9DDE2] pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF6A00] uppercase tracking-wider mb-2">
              <Bug className="w-4 h-4 text-[#FF6A00]" />
              Vulnerability Radar
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111111] mb-4">
              Vulnerability Registry
            </h1>
            <p className="text-base sm:text-lg text-[#56606B] leading-relaxed">
              Monitored Common Vulnerabilities and Exposures (CVEs), real-time exploitation telemetry, EPSS probability, and authoritative remediation advisories.
            </p>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="border-b border-[#D9DDE2] bg-[#FFFFFF] sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form method="GET" action="/vulnerabilities" className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7A838D]" />
            <input
              type="text"
              name="q"
              defaultValue={queryFilter}
              placeholder="Search CVE ID, vendor, or product..."
              className="w-full pl-9 pr-3 py-2 bg-[#F7F7F5] border border-[#D9DDE2] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#FF6A00] transition-colors"
            />
          </form>

          <div className="text-xs font-mono text-[#7A838D]">
            {vulns.length} Vulnerabilities Tracked
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        {vulns.length === 0 ? (
          <EmptyState message="No vulnerability records match your search criteria." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vulns.map((v) => (
              <Link
                key={v.id}
                href={`/vulnerabilities/${v.cve_id}`}
                className="group block bg-[#FFFFFF] border border-[#D9DDE2] p-6 hover:border-[#111111] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono font-bold text-base text-[#111111] group-hover:text-[#FF6A00] transition-colors">
                      {v.cve_id}
                    </span>
                    <SeverityBadge severity={v.severity || 'HIGH'} />
                  </div>

                  <h3 className="font-bold text-sm text-[#111111] mb-2 line-clamp-2 leading-snug">
                    {v.title || `${v.affected_vendor || 'Target'} ${v.affected_product || 'Component'} Vulnerability`}
                  </h3>

                  <p className="text-xs text-[#56606B] line-clamp-3 mb-6 leading-relaxed">
                    {v.description || 'Verified vulnerability entry cataloged in the ZAYRON-X threat intelligence repository.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#D9DDE2] flex items-center justify-between text-xs font-mono text-[#7A838D]">
                  <span>{v.is_exploited_in_wild ? '🚨 KEV Exploited' : 'EPSS Tracked'}</span>
                  <span className="flex items-center gap-1 text-[#111111] font-semibold group-hover:text-[#FF6A00]">
                    Dossier <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
