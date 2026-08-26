import React from 'react';
import { ShieldAlert, Bell, Eye, Settings, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { ThreatBadge } from '@zayron/ui';

export default function AlertsPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end">
            <div className="max-w-4xl">
              <h1 className="font-serif text-5xl font-bold text-[#111111] mb-2">Real-Time Alerts</h1>
              <p className="text-lg text-[#2D2D2D] font-sans">
                Active notifications triggered by your custom Zayron-X watchlists.
              </p>
            </div>
            <div className="hidden md:flex gap-4">
              <Link href="/watchlists" className="px-4 py-2 border border-[#111111]/20 text-[#111111] text-xs font-bold uppercase tracking-widest hover:border-[#111111] transition-colors flex items-center gap-2">
                <Eye className="w-4 h-4" /> Manage Watchlists
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="max-w-4xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-[#111111]/10 pb-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2D2D2D]">Unread (2)</span>
              <button className="text-xs font-bold text-[#FF6B00]">Mark All as Read</button>
            </div>
            <button className="text-xs font-bold text-[#111111] flex items-center gap-1"><Settings className="w-3 h-3"/> Alert Preferences</button>
          </div>

          <div className="bg-white border border-[#111111]/10 shadow-sm">
            {/* Unread Alert 1 */}
            <div className="p-6 border-b border-[#111111]/10 border-l-4 border-l-[#FF6B00] bg-orange-50/30 hover:bg-[#F7F7F5] transition-colors group cursor-pointer">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <ThreatBadge severity="critical" score={9.8} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]">Watchlist Trigger: APT29</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#111111]">10 mins ago</span>
              </div>
              <h4 className="font-sans text-lg font-bold text-[#111111] mb-2">New TTPs Correlated with APT29 Watchlist</h4>
              <p className="text-sm text-[#2D2D2D]">Zayron-X inference engine detected a 92% behavioral match for APT29 in a newly identified European spearphishing campaign.</p>
              <div className="mt-4 flex gap-4">
                <Link href="/campaigns/swift-drop" className="text-xs font-bold uppercase tracking-widest text-[#111111] hover:text-[#FF6B00] transition-colors">View Campaign →</Link>
              </div>
            </div>

            {/* Unread Alert 2 */}
            <div className="p-6 border-b border-[#111111]/10 border-l-4 border-l-[#FF6B00] bg-orange-50/30 hover:bg-[#F7F7F5] transition-colors group cursor-pointer">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <ThreatBadge severity="high" score={8.2} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]">Watchlist Trigger: Keyword &quot;Logistics&quot;</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#111111]">1 hour ago</span>
              </div>
              <h4 className="font-sans text-lg font-bold text-[#111111] mb-2">Emerging Threat Report Published</h4>
              <p className="text-sm text-[#2D2D2D]">A new strategic report &quot;Targeting of European Logistics Sector&quot; has been published matching your sector watchlist.</p>
              <div className="mt-4 flex gap-4">
                <Link href="/reports/rpt-8101" className="text-xs font-bold uppercase tracking-widest text-[#111111] hover:text-[#FF6B00] transition-colors">Read Report →</Link>
              </div>
            </div>

            {/* Read Alert */}
            <div className="p-6 border-b border-[#111111]/10 border-l-4 border-l-transparent bg-white hover:bg-[#F7F7F5] transition-colors group cursor-pointer opacity-70">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <ThreatBadge severity="medium" score={6.5} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]">Watchlist Trigger: CVE-2026-1002</span>
                </div>
                <span className="text-xs font-mono text-[#2D2D2D]">2 days ago</span>
              </div>
              <h4 className="font-sans text-lg font-bold text-[#111111] mb-2">PoC Exploit Code Released</h4>
              <p className="text-sm text-[#2D2D2D]">Proof of Concept exploit code for CVE-2026-1002 was identified on public GitHub repositories.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
