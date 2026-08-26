import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReportById } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const reportSlug = resolvedParams.id;

  const res = await getReportById(reportSlug);
  if (!res || !res.data) {
    notFound();
  }

  const rpt = res.data;

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-screen">
      <header className="bg-[#F7F7F5] border-b border-[#111111]/10 pt-8 pb-12">
        <div className="container mx-auto px-6">
          <Link href="/reports" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] hover:text-[#FF6B00] transition-colors mb-8">
            <ArrowLeft className="w-3 h-3" /> Back to Reports
          </Link>
          
          <h1 className="font-serif text-5xl font-bold text-[#111111] mb-4">{rpt.title}</h1>
          <p className="text-lg text-[#2D2D2D] font-sans">{rpt.abstract}</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="p-8 border border-[#111111]/10 bg-[#F7F7F5] max-w-3xl">
          <h3 className="font-bold text-lg mb-2">Executive Summary</h3>
          <p className="text-sm text-[#2D2D2D] leading-relaxed">{rpt.abstract}</p>
        </div>
      </main>
    </div>
  );
}
