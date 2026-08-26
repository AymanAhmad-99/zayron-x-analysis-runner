import React from 'react';
import { Activity, ShieldAlert, Target, AlertTriangle, Layers, FileText } from 'lucide-react';
import Link from 'next/link';
import { ThreatBadge } from '@zayron/ui';

export default function Dashboard() {
  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end">
            <div className="max-w-4xl">
              <h1 className="font-serif text-5xl font-bold text-[#111111] mb-2">Operations Dashboard</h1>
              <p className="text-lg text-[#2D2D2D] font-sans">
                Global Threat Pulse and Pipeline Telemetry
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] mb-1">Status</span>
              <span className="text-xs font-bold bg-green-50 text-green-700 border border-green-700/20 px-2 py-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> System Nominal
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Metrics */}
          <div className="bg-white border border-[#111111]/10 p-6 flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Active Threats
            </span>
            <span className="font-mono text-4xl font-bold text-[#111111]">1,402</span>
          </div>
          <div className="bg-white border border-[#111111]/10 p-6 flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] flex items-center gap-2">
              <Target className="w-3 h-3" /> Tracked Campaigns
            </span>
            <span className="font-mono text-4xl font-bold text-[#111111]">43</span>
          </div>
          <div className="bg-white border border-[#111111]/10 p-6 flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] flex items-center gap-2">
              <Activity className="w-3 h-3" /> Pipeline Events / 24h
            </span>
            <span className="font-mono text-4xl font-bold text-[#111111]">1.2M</span>
          </div>
          <div className="bg-white border border-[#111111]/10 p-6 flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Critical Zero-Days
            </span>
            <span className="font-mono text-4xl font-bold text-[#D92D20]">4</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="font-serif text-2xl font-bold text-[#111111] border-b border-[#111111]/10 pb-2 mb-6">Priority Intelligence</h2>
              <div className="space-y-4">
                <Link href="/campaigns/swift-drop" className="block bg-white border border-[#111111]/10 p-5 hover:border-[#111111] transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <ThreatBadge severity="critical" score={9.8} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] bg-[#F7F7F5] px-2 py-0.5">Campaign Active</span>
                    </div>
                    <span className="text-xs font-mono text-[#2D2D2D]">2h ago</span>
                  </div>
                  <h3 className="font-sans text-lg font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors mb-2">
                    Operation SwiftDrop Targeting European Logistics
                  </h3>
                  <p className="text-sm text-[#2D2D2D] line-clamp-2">
                    Ongoing spearphishing campaign leveraging CVE-2026-1453 and deploying RustyKey infostealer.
                  </p>
                </Link>
                
                <Link href="/vulnerabilities/CVE-2026-1453" className="block bg-white border border-[#111111]/10 p-5 hover:border-[#111111] transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <ThreatBadge severity="critical" score={10.0} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] bg-[#F7F7F5] px-2 py-0.5">Zero-Day</span>
                    </div>
                    <span className="text-xs font-mono text-[#2D2D2D]">12h ago</span>
                  </div>
                  <h3 className="font-sans text-lg font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors mb-2">
                    CVE-2026-1453: Enterprise VPN Authentication Bypass
                  </h3>
                  <p className="text-sm text-[#2D2D2D] line-clamp-2">
                    Critical vulnerability allowing unauthenticated remote access to enterprise networks. Active exploitation confirmed.
                  </p>
                </Link>
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <div className="bg-white border border-[#111111]/10 p-6">
              <h2 className="font-serif text-lg font-bold text-[#111111] border-b border-[#111111]/10 pb-2 mb-4">Latest Reports</h2>
              <div className="space-y-4">
                <Link href="/reports/rpt-8942" className="block group">
                  <h4 className="text-sm font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors mb-1">Evolution of APT29 TTPs</h4>
                  <span className="text-[10px] font-mono text-[#2D2D2D]">Published Aug 15, 2026</span>
                </Link>
                <div className="w-full h-px bg-[#111111]/10"></div>
                <Link href="/reports/rpt-8941" className="block group">
                  <h4 className="text-sm font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors mb-1">Q2 2026 Ransomware Trends</h4>
                  <span className="text-[10px] font-mono text-[#2D2D2D]">Published Jul 30, 2026</span>
                </Link>
              </div>
              <Link href="/reports" className="inline-block mt-6 text-[10px] font-bold uppercase tracking-widest text-[#111111] hover:text-[#FF6B00] transition-colors">
                View All Reports →
              </Link>
            </div>
            
            <div className="bg-[#111111] p-6 text-white">
              <h2 className="font-serif text-lg font-bold border-b border-white/20 pb-2 mb-4">System Alerts</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                  <span className="text-white/80">API rate limit nearing threshold (85%) for Threat Feed endpoint.</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                  <span className="text-white/80">Ingestion pipeline latency elevated (400ms).</span>
                </li>
              </ul>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
