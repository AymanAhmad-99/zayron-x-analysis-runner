import React from 'react';
import Link from 'next/link';
import { getVulnerabilities } from '@/lib/api';
import { SeverityBadge } from '@/components/SeverityBadge';
import { EmptyState } from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Vulnerability Intelligence Radar — ZAYRON-X',
  description: 'Evidence-grounded vulnerability registry tracking CVE disclosures, CISA KEV active exploitation, and FIRST EPSS probability scores.',
  alternates: { canonical: '/vulnerabilities' },
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
    <div className="flex-1 flex flex-col bg-[#F5F4F0] min-h-screen">
      {/* Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E1DFD7] pt-14 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#D9531E] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#D9531E] animate-pulse" />
              Vulnerability Radar
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-3 uppercase">
              Vulnerability Registry
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed">
              Monitored Common Vulnerabilities and Exposures (CVEs), real-time exploitation telemetry, EPSS probability, and authoritative remediation advisories.
            </p>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="border-b border-[#E1DFD7] bg-[#FFFFFF] sticky top-15 z-30 shadow-none">
        <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form method="GET" action="/vulnerabilities" className="relative w-full sm:w-96">
            <input
              type="text"
              name="q"
              defaultValue={queryFilter}
              placeholder="Search CVE ID, vendor, or product..."
              className="w-full px-3 py-2 bg-[#F5F4F0] border border-[#E1DFD7] rounded-[4px] text-xs font-mono text-[#111214] focus:outline-none focus:border-[#111214] transition-colors"
            />
          </form>

          <div className="flex items-center gap-3"><select name="severity" defaultValue={severityFilter} aria-label="Filter by severity" className="border border-[#D9D7D0] bg-[#F7F7F4] px-3 py-2 text-[10px] font-mono uppercase"><option value="">All severity</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select><div className="text-[11px] font-mono text-[#8C8F98]">{vulns.length} records</div></div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="max-w-[1280px] mx-auto px-6 py-10 flex-1 w-full">
        {vulns.length === 0 ? (
          <EmptyState message="No vulnerability records match your search criteria." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vulns.map((v) => (
              <Link
                key={v.id}
                href={`/vulnerabilities/${v.cve_id}`}
                className="group block bg-[#FFFFFF] border border-[#D9D7D0] rounded-[8px] p-5 hover:border-[#C94F00] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono font-bold text-sm text-[#111214] group-hover:text-[#D9531E] transition-colors">
                      {v.cve_id}
                    </span>
                    <SeverityBadge severity={v.severity || 'HIGH'} />
                  </div>

                  <h3 className="font-bold text-sm text-[#111214] mb-2 line-clamp-2 leading-snug">
                    {v.title || `${v.affected_vendor || 'Target'} ${v.affected_product || 'Component'} Vulnerability`}
                  </h3>

                  <p className="text-xs text-[#5A5D65] line-clamp-3 mb-6 leading-relaxed">
                    {v.description || 'Verified vulnerability entry cataloged in the ZAYRON-X threat intelligence repository.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E1DFD7] flex items-center justify-between text-xs font-mono text-[#8C8F98]">
                  <span>{v.is_exploited_in_wild ? '🚨 KEV Exploited' : 'EPSS Tracked'}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#111214] group-hover:text-[#D9531E]">
                    Dossier &rarr;
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
