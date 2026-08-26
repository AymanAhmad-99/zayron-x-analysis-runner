import React from 'react';
import { Eye, Plus, Bell, Trash2, Target, Globe, Hash } from 'lucide-react';
import Link from 'next/link';
import { EntityPill } from '@zayron/ui';

export default function WatchlistsPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end">
            <div className="max-w-4xl">
              <h1 className="font-serif text-5xl font-bold text-[#111111] mb-2">Watchlists</h1>
              <p className="text-lg text-[#2D2D2D] font-sans">
                Manage custom tracking logic for automated threat intelligence alerts.
              </p>
            </div>
            <div className="hidden md:flex gap-4">
              <Link href="/alerts" className="px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-colors flex items-center gap-2">
                <Bell className="w-4 h-4" /> View Alerts
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 flex-1">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl font-bold text-[#111111]">Active Watchlists (3)</h2>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#111111]/20 bg-white text-[#111111] text-xs font-bold uppercase tracking-widest hover:border-[#111111] transition-colors">
            <Plus className="w-4 h-4" /> New Watchlist
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Watchlist 1 */}
          <div className="bg-white border border-[#111111]/10 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-sans text-xl font-bold text-[#111111]">Critical State-Sponsored Actors</h3>
              <div className="flex gap-2">
                <button className="text-[#2D2D2D] hover:text-[#111111] transition-colors p-1"><Bell className="w-4 h-4" /></button>
                <button className="text-[#2D2D2D] hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-sm text-[#2D2D2D] mb-6">Alert on any new TTPs, campaigns, or intelligence reports associated with Tier 1 actors.</p>
            
            <div className="mt-auto space-y-4 border-t border-[#111111]/10 pt-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]">Entities Monitored</span>
                <div className="flex flex-wrap gap-2">
                  <EntityPill type="actor" value="APT29" href="/actors/apt29" />
                  <EntityPill type="actor" value="Lazarus Group" />
                  <EntityPill type="actor" value="Sandworm" />
                </div>
              </div>
              <div className="flex justify-between items-center bg-[#F7F7F5] p-2 border border-[#111111]/10">
                <span className="text-xs font-sans text-[#2D2D2D]">Notification Preference</span>
                <span className="text-xs font-bold text-[#111111]">Immediate (High/Critical only)</span>
              </div>
            </div>
          </div>

          {/* Watchlist 2 */}
          <div className="bg-white border border-[#111111]/10 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-sans text-xl font-bold text-[#111111]">Logistics & Supply Chain</h3>
              <div className="flex gap-2">
                <button className="text-[#2D2D2D] hover:text-[#111111] transition-colors p-1"><Bell className="w-4 h-4" /></button>
                <button className="text-[#2D2D2D] hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-sm text-[#2D2D2D] mb-6">Alert on keyword matches within Zayron-X strategic reports or campaign intelligence.</p>
            
            <div className="mt-auto space-y-4 border-t border-[#111111]/10 pt-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]">Keywords Monitored</span>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold bg-[#F7F7F5] border border-[#111111]/20 px-2 py-1 flex items-center gap-1"><Hash className="w-3 h-3"/> Logistics</span>
                  <span className="text-xs font-bold bg-[#F7F7F5] border border-[#111111]/20 px-2 py-1 flex items-center gap-1"><Hash className="w-3 h-3"/> Maritime</span>
                  <span className="text-xs font-bold bg-[#F7F7F5] border border-[#111111]/20 px-2 py-1 flex items-center gap-1"><Hash className="w-3 h-3"/> Supply Chain</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-[#F7F7F5] p-2 border border-[#111111]/10">
                <span className="text-xs font-sans text-[#2D2D2D]">Notification Preference</span>
                <span className="text-xs font-bold text-[#111111]">Daily Digest</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
