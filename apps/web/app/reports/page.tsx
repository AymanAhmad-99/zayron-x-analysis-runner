import React from 'react';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { getReports } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cyber Threat Reports | ZAYRON-X', description: 'Published intelligence report records and research material available through ZAYRON-X.', alternates: { canonical: '/reports' } };

export default async function ReportsDatabase() {
  const res = await getReports();
  const reports = res?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F4] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#C94F00]">RESEARCH / ARCHIVE</div><h1 className="font-editorial text-5xl font-bold uppercase tracking-[-.035em] text-[#050505] mb-6">Intelligence Reports</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Structured research publications available from the current ZAYRON-X report archive.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 flex-1">
        {reports.length === 0 ? (
          <div className="bg-white border border-[#252B33]/15 rounded-lg p-12 text-center space-y-4 max-w-2xl mx-auto">
            <BookOpen className="w-10 h-10 text-[#FF6A00] mx-auto" />
            <h3 className="text-xl font-bold text-[#111111] font-sans">Strategic Intelligence Reports</h3>
            <p className="text-xs text-[#56606B] leading-relaxed max-w-md mx-auto">
              Strategic reports appear as correlated intelligence reaches the required multi-source evidence threshold.
            </p>
            <div className="pt-4">
              <Link 
                href="/threats" 
                className="inline-block px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold rounded hover:bg-[#FF6A00] transition-colors"
              >
                Explore Live Telemetry &rarr;
              </Link>
            </div>
          </div>

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reports.map((rpt) => (
              <Link 
                key={rpt.id} 
                href={`/reports/${rpt.slug}`}
                className="group flex flex-col bg-white border border-[#D9D7D0] rounded-[8px] hover:border-[#C94F00] transition-colors p-5"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-2">Technical Report</span>
                <h3 className="font-serif text-2xl font-bold text-[#111111] mb-2">{rpt.title}</h3>
                <p className="text-sm text-[#56606B] mb-4">{rpt.abstract || 'UNKNOWN'}</p>
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider group-hover:text-[#FF6B00]">Read Report →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
