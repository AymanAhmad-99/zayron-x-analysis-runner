import React from 'react';
import { ArrowLeft, ShieldAlert, Activity, Database, Server } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EvidencePanel } from '@zayron/ui';
import { getIOCByValue } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function IOCDossier({
  params,
}: {
  params: Promise<{ value: string }>;
}) {
  const resolvedParams = await params;
  const iocQuery = decodeURIComponent(resolvedParams.value);

  const res = await getIOCByValue(iocQuery);
  if (!res || !res.data) {
    notFound();
  }

  const ioc = res.data;
  const evidenceList = ioc.evidence || [];

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-screen">
      {/* Dossier Header */}
      <header className="bg-[#F7F7F5] border-b border-[#111111]/10 pt-8 pb-12">
        <div className="container mx-auto px-6">
          <Link href="/iocs" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] hover:text-[#FF6B00] transition-colors mb-8">
            <ArrowLeft className="w-3 h-3" /> Back to Indicators
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#111111] text-white px-2 py-1 font-mono">
                  TYPE: {ioc.type.toUpperCase()}
                </span>
                <span className="text-xs font-mono font-bold text-[#D92D20] border border-[#D92D20]/20 px-2 py-0.5 bg-red-50">
                  CONFIDENCE: {(ioc.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <h1 className="font-mono text-3xl lg:text-4xl font-bold text-[#111111] mb-6 tracking-tight break-all">
                {ioc.normalized_value}
              </h1>
              <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
                Technical indicator observed in active threat telemetry and correlated by Zayron-X analysis pipelines.
              </p>
            </div>
            
            {/* Quick Stats Panel */}
            <div className="bg-white border border-[#111111]/10 p-6 w-full lg:w-80 shrink-0 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] border-b border-[#111111]/10 pb-2 mb-4">Indicator Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans text-[#2D2D2D]">Category</span>
                  <span className="font-mono font-bold text-[#111111] uppercase">{ioc.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans text-[#2D2D2D]">Confidence</span>
                  <span className="font-mono font-bold text-[#111111]">{(ioc.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#111111]/10 pt-4">
                  <span className="text-xs font-sans text-[#2D2D2D]">First Seen</span>
                  <span className="text-xs font-mono font-bold text-[#111111]">
                    {ioc.first_seen_at ? new Date(ioc.first_seen_at).toLocaleDateString('en-US') : 'Recorded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dossier Content */}
      <main className="container mx-auto px-6 py-12 flex-1 space-y-12">
        
        {/* Linked Intelligence Event */}
        {ioc.event_id && (
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#111111] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#FF6B00]" /> Linked Intelligence Event
            </h2>
            <div className="p-6 border border-[#111111]/10 bg-[#F7F7F5] space-y-2">
              <h3 className="font-bold text-[#111111] text-lg">{ioc.event_title}</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">{ioc.event_summary}</p>
            </div>
          </section>
        )}

        {/* Provenance & Evidence */}
        {evidenceList.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#111111]">
              Cryptographic Evidence & Provenance
            </h2>
            <EvidencePanel
              defaultExpanded={true}
              evidence={evidenceList.map((e) => ({
                id: e.id,
                sourceName: e.source_name || 'Telemetry Node',
                type: e.type,
                url: e.url,
                snippet: e.snippet,
                weight: e.weight,
                capturedAt: e.created_at,
              }))}
            />
          </section>
        )}
      </main>
    </div>
  );
}
