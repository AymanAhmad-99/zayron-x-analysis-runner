export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { CveDetailCard } from '@/components/cve/CveDetailCard';
import { getAllCVEIds, getCVEById } from '@/lib/db/queries/cves';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ cveId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cveId } = await params;
  let cve: Awaited<ReturnType<typeof getCVEById>> = null;
  try {
    cve = await getCVEById(cveId);
  } catch (error) {
    console.error(`generateMetadata failed for CVE "${cveId}":`, error);
  }
  if (!cve) return { title: 'CVE Not Found' };

  return {
    title: `${cve.cveId} — ${cve.severity} severity, CVSS ${cve.cvssScore}`,
    description: cve.description ?? `${cve.cveId} vulnerability details and analysis.`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/cve/${cve.cveId}`,
    },
  };
}

export default async function CVEDetailPage({ params }: Props) {
  const { cveId } = await params;
  let cve: Awaited<ReturnType<typeof getCVEById>> = null;
  try {
    cve = await getCVEById(cveId);
  } catch (error) {
    console.error(`CVEDetailPage data fetch failed for "${cveId}":`, error);
  }
  if (!cve) notFound();

  // Establish secure client session and authenticate profile
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSubscriber = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('clearance_level')
      .eq('id', user.id)
      .single();

    isSubscriber = profile?.clearance_level === 'SUBSCRIBER';
  }

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <nav className="flex items-center gap-2 text-xs text-[#475569] mb-6 font-ui">
          <a href="/" className="hover:text-[#D2B48C] transition-colors">
            Home
          </a>
          <span>/</span>
          <a href="/cve" className="hover:text-[#D2B48C] transition-colors">
            CVEs
          </a>
          <span>/</span>
          <span className="text-[#0F172A] font-medium">{cve.cveId}</span>
        </nav>
        <CveDetailCard cve={cve} isSubscriber={isSubscriber} />
      </div>
    </div>
  );
}
