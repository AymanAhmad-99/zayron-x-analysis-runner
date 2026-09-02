import React from 'react';
import { Search, Database, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getIOCs } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'IOC Intelligence | ZAYRON-X', description: 'Normalized indicators and linked observations from the current intelligence data contract.', alternates: { canonical: '/iocs' } };

export default async function IOCsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const typeFilter = resolvedParams?.type || '';
  const searchFilter = resolvedParams?.q || '';

  const res = await getIOCs({ type: typeFilter, q: searchFilter });
  const iocs = res?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#C94F00]">DATA / IOC INTELLIGENCE</div><h1 className="font-editorial text-5xl font-bold uppercase tracking-[-.035em] text-[#050505] mb-6">Indicators of Compromise</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Searchable technical indicator records returned by the current ZAYRON-X intelligence data source.
            </p>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="border-b border-[#111111]/10 bg-white sticky top-16 z-30 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form id="ioc-search" method="GET" action="/iocs" className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#2D2D2D]" />
            <input 
              type="text" 
              name="q"
              defaultValue={searchFilter}
              placeholder="Search IP, Domain, Hash..." 
              className="w-full pl-9 pr-3 py-2 bg-[#F7F7F5] border border-[#111111]/10 rounded-none text-sm font-sans focus:outline-none focus:border-[#FF6B00] transition-colors"
            />
          </form>
          <div className="flex items-center gap-3"><select name="type" form="ioc-search" defaultValue={typeFilter} aria-label="Filter by IOC type" className="border border-[#D9D7D0] bg-[#F7F7F4] px-3 py-2 text-[10px] font-mono uppercase"><option value="">All types</option><option value="ip">IP</option><option value="domain">Domain</option><option value="url">URL</option><option value="hash">Hash</option><option value="email">Email</option></select><div className="text-xs font-mono font-bold text-[#56606B]">{iocs.length} records</div></div>
        </div>
      </div>

      {/* Main Content Area - Table */}
      <div className="container mx-auto px-6 py-12 flex-1">
        {iocs.length === 0 ? (
          <div className="bg-white border border-[#111111]/10 p-12 text-center space-y-4">
            <Database className="w-12 h-12 text-[#FF6B00] mx-auto opacity-40" />
            <h3 className="font-serif text-2xl font-bold text-[#111111]">No Indicators Found</h3>
            <p className="text-sm text-[#2D2D2D]">No IOC records matched your search query.</p>
            <Link href="/iocs" className="inline-block px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest">
              Reset Query
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#111111]/10 overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-[#F7F7F5] border-b border-[#111111]/10 text-[10px] uppercase font-bold tracking-widest text-[#2D2D2D]">
                <tr>
                  <th className="py-4 px-6 w-32">Type</th>
                  <th className="py-4 px-6">Normalized Indicator</th>
                  <th className="py-4 px-6 w-32">Confidence</th>
                  <th className="py-4 px-6">Observed Event</th>
                  <th className="py-4 px-6 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111111]/5">
                {iocs.map((ioc) => (
                  <tr 
                    key={ioc.id} 
                    className="hover:bg-[#F7F7F5]/50 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-[#FF6B00]"
                  >
                    <td className="py-4 px-6 uppercase font-mono text-xs text-[#2D2D2D] align-top">
                      <span className="bg-[#F7F7F5] px-2 py-1 border border-[#111111]/10 font-bold">
                        {ioc.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-top">
                      <Link 
                        href={`/iocs/${encodeURIComponent(ioc.normalized_value)}`}
                        className="font-mono text-sm font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors break-all"
                      >
                        {ioc.normalized_value}
                      </Link>
                    </td>
                    <td className="py-4 px-6 align-top font-mono text-xs">
                      {(ioc.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-4 px-6 align-top text-xs text-[#2D2D2D]">
                      {ioc.event_title || 'Unlinked telemetry'}
                    </td>
                    <td className="py-4 px-6 align-middle text-right">
                      <Link href={`/iocs/${encodeURIComponent(ioc.normalized_value)}`}>
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
