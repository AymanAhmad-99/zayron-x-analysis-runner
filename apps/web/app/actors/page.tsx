import React from 'react';
import { Search, Target, Globe, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getActors } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ActorsDatabase({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const searchFilter = resolvedParams?.q || '';

  const res = await getActors({ q: searchFilter });
  const actors = res?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <h1 className="font-serif text-5xl font-bold text-[#111111] mb-6">Threat Actor Index</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Global registry of state-sponsored APTs, cybercriminal syndicates, and threat actors extracted from telemetry and threat advisories.
            </p>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="border-b border-[#111111]/10 bg-white sticky top-16 z-30 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form method="GET" action="/actors" className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#2D2D2D]" />
            <input 
              type="text" 
              name="q"
              defaultValue={searchFilter}
              placeholder="Search by actor name or alias..." 
              className="w-full pl-9 pr-3 py-2 bg-[#F7F7F5] border border-[#111111]/10 rounded-none text-sm font-sans focus:outline-none focus:border-[#FF6B00] transition-colors"
            />
          </form>
          <div className="text-xs font-mono font-bold text-[#2D2D2D]">
            {actors.length} Threat Actors Cataloged
          </div>
        </div>
      </div>

      {/* Main Content Area - Grid */}
      <div className="container mx-auto px-6 py-12 flex-1">
        {actors.length === 0 ? (
          <div className="bg-white border border-[#111111]/10 p-12 text-center space-y-4">
            <Target className="w-12 h-12 text-[#FF6B00] mx-auto opacity-40" />
            <h3 className="font-serif text-2xl font-bold text-[#111111]">No Threat Actors Found</h3>
            <p className="text-sm text-[#2D2D2D]">No actor records matched your search query.</p>
            <Link href="/actors" className="inline-block px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest">
              Reset Query
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {actors.map((actor) => (
              <Link 
                key={actor.id} 
                href={`/actors/${actor.slug}`} 
                className="group block border border-[#111111]/10 bg-white p-6 hover:border-[#111111] transition-colors"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-serif text-2xl font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors">
                    {actor.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-[#F7F7F5] text-[#111111] border border-[#111111]/20 px-2 py-1">
                    {actor.country || 'Global Threat'}
                  </span>
                </div>
                
                <div className="space-y-4 mb-6">
                  {actor.aliases && (
                    <div className="flex items-center gap-3 text-sm text-[#2D2D2D]">
                      <Target className="w-4 h-4 text-[#111111]" />
                      <span className="font-bold">Aliases:</span> {actor.aliases}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-[#2D2D2D]">
                    <Globe className="w-4 h-4 text-[#111111]" />
                    <span className="font-bold">Motivation:</span> {actor.motivation || 'Targeted Espionage / Cybercrime'}
                  </div>
                </div>

                <p className="text-xs text-[#2D2D2D] line-clamp-3 mb-6 leading-relaxed">
                  {actor.description || 'Verified threat actor tracked in Zayron-X intelligence registry.'}
                </p>

                <div className="flex items-center justify-between border-t border-[#111111]/10 pt-4 text-xs font-bold uppercase tracking-widest text-[#111111] group-hover:text-[#FF6B00] transition-colors">
                  <span>Open Dossier</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
