import React from 'react';
import { ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaignById } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function CampaignDossier({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const campaignSlug = resolvedParams.id;

  const res = await getCampaignById(campaignSlug);
  if (!res || !res.data) {
    notFound();
  }

  const camp = res.data;

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-screen">
      <header className="bg-[#F7F7F5] border-b border-[#111111]/10 pt-8 pb-12">
        <div className="container mx-auto px-6">
          <Link href="/campaigns" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] hover:text-[#FF6B00] transition-colors mb-8">
            <ArrowLeft className="w-3 h-3" /> Back to Campaigns
          </Link>
          
          <h1 className="font-serif text-5xl font-bold text-[#111111] mb-2">{camp.name}</h1>
          <p className="text-lg text-[#2D2D2D] font-sans">{camp.description}</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="p-8 border border-[#111111]/10 bg-[#F7F7F5]">
          <h3 className="font-bold text-lg mb-2">Campaign Intelligence</h3>
          <p className="text-sm text-[#2D2D2D]">Tracked under attribution slug: {camp.slug}</p>
        </div>
      </main>
    </div>
  );
}
