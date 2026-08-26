import React from 'react';
import { Target, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { getCampaigns } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const res = await getCampaigns();
  const campaigns = res?.data || [];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      {/* Editorial Header */}
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <h1 className="font-serif text-5xl font-bold text-[#111111] mb-6">Threat Campaigns</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Tracked adversary campaigns correlating multi-stage attack chains, targeted sectors, and geopolitical motivations.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 flex-1">
        {campaigns.length === 0 ? (
          <div className="bg-white border border-[#111111]/10 p-12 text-center space-y-4 max-w-2xl mx-auto">
            <Target className="w-12 h-12 text-[#FF6B00] mx-auto opacity-40" />
            <h3 className="font-serif text-2xl font-bold text-[#111111]">No Active Campaigns Clustered</h3>
            <p className="text-sm text-[#2D2D2D] leading-relaxed">
              Campaign correlation requires multi-event graph linkages. Current telemetry is tracked at the individual intelligence event and threat actor level.
            </p>
            <div className="pt-2">
              <Link 
                href="/threats" 
                className="inline-block px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF6B00] transition-colors"
              >
                View Live Threat Radar →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((camp) => (
              <Link 
                key={camp.id} 
                href={`/campaigns/${camp.slug}`}
                className="p-6 bg-white border border-[#111111]/10 hover:border-[#111111] transition-colors block"
              >
                <h3 className="font-serif text-2xl font-bold text-[#111111] mb-2">{camp.name}</h3>
                <p className="text-sm text-[#2D2D2D] mb-4">{camp.description}</p>
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">Inspect Campaign →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
