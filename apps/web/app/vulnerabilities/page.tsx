import React from 'react';
import { Search, ShieldAlert, FileText, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { ThreatBadge } from '@zayron/ui';
import { getVulnerabilities } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function VulnerabilitiesDatabase({
  searchParams,
}: {
  searchParams?: Promise<{ severity?: string; q?: string; page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const severityFilter = resolvedParams?.severity || '';
  const searchFilter = resolvedParams?.q || '';
  const page = Number(resolvedParams?.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const res = await getVulnerabilities({
    limit,
    offset,
    severity: severityFilter,
    q: searchFilter,
  });

  const vulnerabilities = res?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <h1 className="font-serif text-5xl font-bold text-[#111111] mb-6">Vulnerability Intelligence</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Analyst-grade CVE database and zero-day tracking. Powered by the Zayron-X normalization engine to correlate observed evidence and in-the-wild exploitation.
            </p>
          </div>
        </div>
      </header>

      {/* Database Search & Filters */}
      <div className="border-b border-[#111111]/10 bg-white sticky top-16 z-30 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form method="GET" action="/vulnerabilities" className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#2D2D2D]" />
            <input 
              type="text" 
              name="q"
              defaultValue={searchFilter}
              placeholder="Search CVE ID, Product, Vendor..." 
              className="w-full pl-9 pr-3 py-2 bg-[#F7F7F5] border border-[#111111]/10 rounded-none text-sm font-sans focus:outline-none focus:border-[#FF6B00] transition-colors"
            />
          </form>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-mono font-bold text-[#2D2D2D]">
              {vulnerabilities.length} Records Loaded
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area - Table */}
      <div className="container mx-auto px-6 py-12 flex-1">
        {vulnerabilities.length === 0 ? (
          <div className="bg-white border border-[#111111]/10 p-12 text-center space-y-4">
            <ShieldAlert className="w-12 h-12 text-[#FF6B00] mx-auto opacity-40" />
            <h3 className="font-serif text-2xl font-bold text-[#111111]">No Vulnerabilities Found</h3>
            <p className="text-sm text-[#2D2D2D]">No CVE records matched your search query.</p>
            <Link href="/vulnerabilities" className="inline-block px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest">
              Reset Query
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#111111]/10 overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-[#F7F7F5] border-b border-[#111111]/10 text-[10px] uppercase font-bold tracking-widest text-[#2D2D2D]">
                <tr>
                  <th className="py-4 px-6 w-48">CVE ID</th>
                  <th className="py-4 px-6 w-32">Severity</th>
                  <th className="py-4 px-6">Title & Summary</th>
                  <th className="py-4 px-6 w-48">Status</th>
                  <th className="py-4 px-6 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111111]/5">
                {vulnerabilities.map((vuln) => (
                  <tr 
                    key={vuln.id}
                    className="hover:bg-[#F7F7F5]/50 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-[#FF6B00]"
                  >
                    <td className="py-5 px-6 align-top">
                      <Link 
                        href={`/vulnerabilities/${vuln.cve_id}`} 
                        className="font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors inline-block font-mono"
                      >
                        {vuln.cve_id}
                      </Link>
                      <div className="text-[10px] font-mono text-[#2D2D2D] mt-1 uppercase">
                        {vuln.published_at ? new Date(vuln.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unpublished'}
                      </div>
                    </td>
                    <td className="py-5 px-6 align-top">
                      <ThreatBadge 
                        severity={vuln.severity.toLowerCase() as any} 
                        score={vuln.cvss_score ?? (vuln.severity.toLowerCase() === 'critical' ? 9.8 : vuln.severity.toLowerCase() === 'high' ? 8.2 : 5.5)} 
                      />
                    </td>
                    <td className="py-5 px-6 align-top">
                      <h4 className="font-bold text-[#111111] mb-1">{vuln.title}</h4>
                      <p className="text-[#2D2D2D] line-clamp-2 leading-relaxed text-xs">
                        {vuln.description || 'No description available for this vulnerability record.'}
                      </p>
                    </td>
                    <td className="py-5 px-6 align-top">
                      {vuln.is_exploited_in_wild === 1 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 border border-red-700/20 text-[10px] font-bold uppercase tracking-widest">
                          <ShieldAlert className="w-3 h-3" /> In-Wild Exploit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#F7F7F5] text-[#2D2D2D] border border-[#111111]/20 text-[10px] font-bold uppercase tracking-widest">
                          <FileText className="w-3 h-3" /> Tracked Advisory
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-6 align-middle text-right">
                      <Link href={`/vulnerabilities/${vuln.cve_id}`}>
                        <ChevronRight className="w-5 h-5 text-[#2D2D2D] opacity-40 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
