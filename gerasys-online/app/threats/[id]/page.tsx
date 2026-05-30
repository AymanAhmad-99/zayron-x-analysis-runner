import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ThreatDetailClient } from "@/components/platform/ThreatDetailClient";
import { Shield, ChevronRight, TrendingUp } from "@/lib/icons";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  // Await client creation securely
  const supabase = await createClient();
  const { data: threat } = await supabase
    .from("threat_artifacts")
    .select("title, severity")
    .eq("id", id)
    .single();

  if (!threat) return { title: "Threat Incident Dossier Not Found" };

  return {
    title: `${threat.title} — ZAYRON-X Active CTI Monitoring`,
    description: `Active threat incident monitoring telemetry. Severity: ${threat.severity}. Mapped target sectors under surveillance.`,
  };
}

export const revalidate = 0; // Dynamic server component

export default async function ThreatDetailsPage({ params }: Props) {
  const { id } = await params;

  // 1. Establish secure client session and authenticate profile
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSubscriber = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("clearance_level")
      .eq("id", user.id)
      .single();
    
    isSubscriber = profile?.clearance_level === "SUBSCRIBER";
  }

  // 2. Query dynamic RLS-enforced threat view
  const { data: threat } = await supabase
    .from("threat_artifacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!threat) {
    notFound();
  }

  // 3. Absolute Zero-Leak Redaction (Server-Side Verification)
  // Strip out premium content completely if not subscriber
  const yaraRules = isSubscriber ? threat.yara_rules : null;
  const sigmaRules = isSubscriber ? threat.sigma_rules : null;
  const rawIocs = isSubscriber ? threat.raw_iocs : null;
  const unmaskedEntities = isSubscriber ? threat.unmasked_target_entities : null;

  // Format FBR Exposure
  const formattedFBR = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(threat.fbr_total);

  return (
    <div className="bg-white min-h-screen text-[#050505] font-sans selection:bg-[#733DD9] selection:text-white">
      {/* Symmetrical Header */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 border-b border-neutral-100 flex items-center justify-between">
        <nav className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
          <Link href="/" className="hover:text-[#733DD9] transition-colors">
            HOME
          </Link>
          <ChevronRight size={10} />
          <span className="text-[#050505] font-bold uppercase tracking-wider">
            THREAT TELEMETRY
          </span>
          <ChevronRight size={10} />
          <span className="text-neutral-500 font-mono select-none uppercase">
            {threat.id.slice(0, 8)}
          </span>
        </nav>

        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] bg-neutral-50 border border-neutral-200 text-neutral-500 px-3 py-1">
          STATUS: {isSubscriber ? "CLEARANCE AUTHORIZED" : "RESTRICTED ACCESS"}
        </span>
      </div>

      {/* Main Panel grid */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 lg:gap-24 items-start">
          
          {/* Main Left Content Panel */}
          <main className="space-y-12">
            
            {/* Header Content */}
            <div className="space-y-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#733DD9]/5 border border-[#733DD9]/10 text-xs font-bold uppercase tracking-wider text-[#733DD9]">
                <Shield size={13} className="text-[#733DD9]" />
                INCIDENT TELEMETRY DOSSIER
              </span>
              
              <h1 className="text-[2.2rem] md:text-[3.2rem] font-black text-[#050505] leading-[1.1] tracking-tight max-w-4xl font-sans uppercase">
                {threat.title}
              </h1>

              <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider select-none">
                INCIDENT ID: {threat.id} · RECORDED AT: {new Date(threat.created_at).toLocaleDateString()}
              </p>
            </div>

            <hr className="border-neutral-100" />

            {/* Micro-interactive Client Component */}
            <ThreatDetailClient
              threatId={threat.id}
              threatTitle={threat.title}
              isSubscriber={isSubscriber}
              yaraRules={yaraRules}
              sigmaRules={sigmaRules}
              rawIocs={rawIocs}
              unmaskedEntities={unmaskedEntities}
            />

          </main>

          {/* Symmetrical Right Dashboard Panel */}
          <aside className="space-y-8 bg-neutral-50/50 p-8 border border-neutral-200 shadow-none">
            
            <div className="pb-4 border-b border-neutral-200">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#733DD9] block mb-1">
                [ INCIDENT PARAMETERS ]
              </span>
              <h3 className="text-sm font-black uppercase text-[#050505]">
                operational profile
              </h3>
            </div>

            {/* KPI Stack */}
            <div className="space-y-6">
              
              {/* Severity Card */}
              <div className="bg-white border border-neutral-200 p-5 relative overflow-hidden">
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block mb-1">
                  SEVERITY ASSESSMENT
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-[#050505] tracking-tighter">
                    {threat.severity}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#733DD9] bg-[#733DD9]/5 border border-[#733DD9]/10 px-2 py-0.5">
                    CVSS {threat.cvss_score}
                  </span>
                </div>
              </div>

              {/* FBR Card */}
              <div className="bg-white border border-neutral-200 p-5 relative overflow-hidden">
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block mb-1">
                  FINANCIAL BLAST RADIUS (FBR)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-[#050505] tracking-tighter">
                    {formattedFBR}
                  </span>
                  <TrendingUp className="w-5 h-5 text-neutral-300" />
                </div>
              </div>

              {/* Target Sector Card */}
              <div className="bg-white border border-neutral-200 p-5 relative overflow-hidden">
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block mb-1">
                  AFFECTED VECTOR SECTOR
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#050505] uppercase tracking-wide">
                    {threat.sector}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#733DD9] animate-pulse" />
                </div>
              </div>

            </div>

            {/* OpSec Legal Information */}
            <div className="pt-6 border-t border-neutral-200 text-[10px] text-neutral-400 font-mono leading-relaxed space-y-2">
              <p>
                [ CONFIDENTIAL SECURITY INTEL ]
              </p>
              <p>
                This dossier contains real-time active indicators mapped from the ZAYRON-X intelligence stream. Redaction patterns are strictly enforced in compliance with the Zero-Trust mandate of Palo Alto Directorate.
              </p>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
}
