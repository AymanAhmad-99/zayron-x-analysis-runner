import React from 'react';
import Link from 'next/link';
import { getActors } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Threat Actor Index — ZAYRON-X',
  description: 'Global registry of state-sponsored APTs, cybercriminal syndicates, and threat actors extracted from telemetry and threat advisories.',
};

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
    <div className="flex-1 flex flex-col bg-[#F5F4F0] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E1DFD7] pt-14 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#D9531E] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#D9531E] animate-pulse" />
              Adversary Profiles
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-3 uppercase">
              Threat Actor Index
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed">
              Global registry of state-sponsored APTs, cybercriminal syndicates, and threat actors extracted from telemetry and threat advisories.
            </p>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="border-b border-[#E1DFD7] bg-[#FFFFFF] sticky top-15 z-30 shadow-none">
        <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form method="GET" action="/actors" className="relative w-full md:w-96">
            <input 
              type="text" 
              name="q"
              defaultValue={searchFilter}
              placeholder="Search by actor name or alias..." 
              className="w-full px-3 py-2 bg-[#F5F4F0] border border-[#E1DFD7] rounded-[4px] text-xs font-mono text-[#111214] focus:outline-none focus:border-[#111214] transition-colors"
            />
          </form>
          <div className="text-[11px] font-mono text-[#8C8F98]">
            {actors.length} Threat Actors Cataloged
          </div>
        </div>
      </div>

      {/* Main Content Area - Grid */}
      <div className="max-w-[1280px] mx-auto px-6 py-10 flex-1 w-full">
        {actors.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] p-12 text-center space-y-4">
            <h3 className="font-editorial text-xl font-bold text-[#111214]">No Threat Actors Found</h3>
            <p className="text-xs text-[#5A5D65]">No actor records matched your search query.</p>
            <Link href="/actors" className="inline-block px-4 py-2 bg-[#111214] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider rounded-[4px]">
              Reset Query
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {actors.map((actor) => (
              <Link 
                key={actor.id} 
                href={`/actors/${actor.slug}`} 
                className="group block border border-[#E1DFD7] bg-[#FFFFFF] rounded-[6px] p-6 hover:border-[#111214] transition-colors flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-editorial text-xl font-bold text-[#111214] group-hover:text-[#D9531E] transition-colors">
                      {actor.name}
                    </h3>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-[#F5F4F0] text-[#111214] border border-[#E1DFD7] px-2 py-0.5 rounded-[3px]">
                      {actor.country || 'Global Threat'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-xs">
                    {actor.aliases && (
                      <div className="text-[11px] text-[#5A5D65] font-mono">
                        <span className="font-bold text-[#111214]">Aliases:</span> {actor.aliases}
                      </div>
                    )}
                    <div className="text-[11px] text-[#5A5D65]">
                      <span className="font-bold text-[#111214]">Motivation:</span> {actor.motivation || 'Targeted Espionage / Cybercrime'}
                    </div>
                  </div>

                  <p className="text-xs text-[#5A5D65] line-clamp-3 mb-6 leading-relaxed">
                    {actor.description || 'Verified threat actor tracked in Zayron-X intelligence registry.'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#E1DFD7] pt-4 text-[11px] font-bold uppercase tracking-wider text-[#111214] group-hover:text-[#D9531E] transition-colors">
                  <span>Open Dossier</span>
                  <span>&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
