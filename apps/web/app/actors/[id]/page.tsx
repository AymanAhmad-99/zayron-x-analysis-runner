import React from 'react';
import { ArrowLeft, Target, Globe, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActorById } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ActorDossier({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const actorSlug = resolvedParams.id;

  const res = await getActorById(actorSlug);
  if (!res || !res.data) {
    notFound();
  }

  const actor = res.data;
  const linkedEvents = actor.linked_events || [];
  const relatedIocs = actor.related_iocs || [];
  const campaigns = actor.campaigns || [];

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-screen">
      {/* Dossier Header */}
      <header className="bg-[#F7F7F5] border-b border-[#111111]/10 pt-8 pb-12">
        <div className="container mx-auto px-6">
          <Link href="/actors" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] hover:text-[#FF6B00] transition-colors mb-8">
            <ArrowLeft className="w-3 h-3" /> Back to Actors
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-700 border border-red-700/20 px-2 py-1">
                  Threat Actor
                </span>
                <span className="text-[10px] font-mono text-[#2D2D2D]">
                  ID: {actor.id}
                </span>
              </div>
              <h1 className="font-serif text-5xl font-bold text-[#111111] mb-2 tracking-tight uppercase">
                {actor.name}
              </h1>
              {actor.aliases && (
                <h2 className="font-sans text-xl text-[#2D2D2D] mb-6">
                  Aliases: {actor.aliases}
                </h2>
              )}
              <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
                {actor.description || 'Verified threat actor tracked in Zayron-X intelligence registry.'}
              </p>
            </div>
            
            {/* Quick Stats Panel */}
            <div className="bg-white border border-[#111111]/10 p-6 w-full lg:w-80 shrink-0 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] border-b border-[#111111]/10 pb-2 mb-4">Actor Profile</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans text-[#2D2D2D]">Origin / Region</span>
                  <span className="text-xs font-bold text-[#111111] flex items-center gap-1">
                    <Globe className="w-3 h-3"/> {actor.country || 'Global'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans text-[#2D2D2D]">Motivation</span>
                  <span className="text-xs font-bold text-[#111111]">{actor.motivation || 'Espionage / Crime'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#111111]/10 pt-4">
                  <span className="text-xs font-sans text-[#2D2D2D]">First Seen</span>
                  <span className="font-mono text-xs text-[#111111]">
                    {actor.first_seen ? new Date(actor.first_seen).toLocaleDateString('en-US') : 'Recorded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dossier Content */}
      <main className="container mx-auto px-6 py-12 flex-1 space-y-12">
        
        {/* Linked Campaigns */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#111111] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#FF6B00]" /> Correlated Campaigns ({campaigns.length})
          </h2>
          {campaigns.length === 0 ? (
            <div className="p-6 border border-[#111111]/10 bg-[#F7F7F5] text-sm text-[#2D2D2D]">
              No active named campaigns currently linked to {actor.name} in the intelligence graph.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp: any) => (
                <Link key={camp.id} href={`/campaigns/${camp.slug}`} className="p-4 border border-[#111111]/10 bg-white hover:border-[#111111]">
                  <h4 className="font-bold text-base text-[#111111] mb-1">{camp.name}</h4>
                  <p className="text-xs text-[#2D2D2D]">{camp.description}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Linked Intelligence Events */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#111111] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#FF6B00]" /> Observed Activity Events ({linkedEvents.length})
          </h2>

          {linkedEvents.length === 0 ? (
            <div className="p-6 border border-[#111111]/10 bg-[#F7F7F5] text-sm text-[#2D2D2D]">
              No direct telemetry events mentioning {actor.name} in current ingestion batches.
            </div>
          ) : (
            <div className="space-y-4">
              {linkedEvents.map((ev) => (
                <div key={ev.id} className="p-6 border border-[#111111]/10 bg-[#F7F7F5] space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-[#111111] text-base">{ev.title}</h3>
                    <span className="text-xs font-mono text-[#2D2D2D]">
                      Confidence: {(ev.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-[#2D2D2D] leading-relaxed">{ev.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Linked IOCs */}
        {relatedIocs.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#111111]">
              Correlated Infrastructure & Indicators ({relatedIocs.length})
            </h2>
            <div className="border border-[#111111]/10 overflow-x-auto">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-[#F7F7F5] border-b border-[#111111]/10 text-[10px] uppercase font-bold tracking-widest text-[#2D2D2D]">
                  <tr>
                    <th className="py-3 px-6">Type</th>
                    <th className="py-3 px-6">Indicator Value</th>
                    <th className="py-3 px-6">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111111]/5">
                  {relatedIocs.map((ioc) => (
                    <tr key={ioc.id}>
                      <td className="py-3 px-6 uppercase font-mono text-xs">{ioc.type}</td>
                      <td className="py-3 px-6 font-mono text-xs text-[#111111]">
                        <Link href={`/iocs/${encodeURIComponent(ioc.normalized_value)}`} className="text-[#FF6B00] hover:underline">
                          {ioc.normalized_value}
                        </Link>
                      </td>
                      <td className="py-3 px-6 font-mono text-xs">{(ioc.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
