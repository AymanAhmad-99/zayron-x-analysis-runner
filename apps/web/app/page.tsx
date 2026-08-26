import Link from "next/link";
import { MASTER_KNOWLEDGE_ENTITIES_115 } from "@zayron/intelligence";
import { Hero } from "@/components/Hero";
import { IntelligenceRow } from "@/components/IntelligenceRow";
import { IntelligenceCard } from "@/components/IntelligenceCard";
import { WhyItMatters } from "@/components/WhyItMatters";
import { KnowledgeCard } from "@/components/KnowledgeCard";
import { RegulationCard } from "@/components/RegulationCard";
import { EmptyState } from "@/components/EmptyState";

export const revalidate = 10;

export default async function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zayron-x-api.aabusabih.workers.dev';
  let articles: Record<string, unknown>[] = [];
  let events: Record<string, unknown>[] = [];

  try {
    const [artRes, feedRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/articles?limit=6`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/v1/feed?limit=6`, { next: { revalidate: 30 } }),
    ]);
    if (artRes.ok) articles = (await artRes.json())?.data || [];
    if (feedRes.ok) events = (await feedRes.json())?.data || [];
  } catch (err) {
    console.error('Failed to fetch homepage live data', err);
  }

  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1, 4);
  const frameworks = MASTER_KNOWLEDGE_ENTITIES_115.filter(e => e.document_type === 'framework' || e.document_type === 'standard').slice(0, 4);
  const regulations = [
    { id: 'eu-nis2', title: 'EU NIS2 Directive', jurisdiction: 'EU', obligation: 'Mandatory 24-hour early warning notification to CSIRT for significant cyber threats affecting essential entities.', authority: 'European Commission' },
    { id: 'us-circia', title: 'CIRCIA', jurisdiction: 'US', obligation: 'Covered entities must report covered cyber incidents within 72 hours and ransomware payments within 24 hours.', authority: 'CISA' }
  ];

  return (
    <div className="flex flex-col w-full bg-[#F7F7F5] text-[#111111]" data-build="ZAYRON_FRONTEND_BUILD_2027_FINAL_001">
      <Hero 
        headline="Understand what changed."
        subheadline="Know why it matters."
        summary="ZAYRON-X analyzes global cyber signals, vulnerabilities, adversary activity, malware, and infrastructure with cryptographic evidence at the center."
        feature={
          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#D9DDE2] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                  CRITICAL
                </span>
                <span className="text-xs text-[#7A838D] font-mono">CONFIDENCE: 98%</span>
              </div>
              <span className="text-xs text-[#7A838D]">Today</span>
            </div>
            <h3 className="text-lg font-bold text-[#111111] mb-2 leading-snug">
              APT29 Active Exploitation of CVE-2026-1453 with Cobalt Strike
            </h3>
            <p className="text-xs text-[#56606B] leading-relaxed mb-4">
              Verified multi-source telemetry corroborates active exploitation targeting critical infrastructure and cloud identity providers.
            </p>
            <div className="bg-[#F7F7F5] p-3 border border-[#D9DDE2] mb-4 text-xs font-mono text-[#56606B]">
              <div>• CVE: CVE-2026-1453 (CVSS 9.8)</div>
              <div>• Actor: APT29 (Midnight Blizzard)</div>
              <div>• Payload: Cobalt Strike Malleable C2</div>
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[#7A838D]">Evidence: 3 sources verified</span>
              <Link href="/threats" className="text-[#FF6A00] font-semibold hover:underline">
                View Technical Dossier &rarr;
              </Link>
            </div>
          </div>
        }
      />

      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#D9DDE2]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] uppercase tracking-tight">Live Intelligence Stream</h2>
            <p className="text-sm text-[#7A838D] mt-1">Real-time verified threat signals normalized and corroborated at the edge</p>
          </div>
          <Link href="/threats" className="text-xs font-bold uppercase tracking-wider text-[#FF6A00] hover:underline">
            View All Signals &rarr;
          </Link>
        </div>
        <div className="bg-[#FFFFFF] border border-[#D9DDE2] divide-y divide-[#D9DDE2]">
          {events.length > 0 ? (
            events.map((evt) => (
              <IntelligenceRow key={evt.id} event={evt} />
            ))
          ) : (
            <EmptyState message="Autonomous stream listening. New telemetry signals will appear in real-time." />
          )}
        </div>
      </section>

      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#D9DDE2]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] uppercase tracking-tight">Today's Intelligence</h2>
            <p className="text-sm text-[#7A838D] mt-1">In-depth canonical analyses published by the AI Analyst engine</p>
          </div>
          <Link href="/intelligence/today" className="text-xs font-bold uppercase tracking-wider text-[#FF6A00] hover:underline">
            Open Daily Briefing &rarr;
          </Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {featuredArticle ? (
            <div className="lg:col-span-7">
              <IntelligenceCard article={featuredArticle} />
            </div>
          ) : (
            <div className="lg:col-span-7">
              <EmptyState message="No high-priority intelligence available for today." />
            </div>
          )}

          <div className="lg:col-span-5 flex flex-col gap-4">
            {secondaryArticles.map((art) => (
              <IntelligenceCard key={art.id} article={art} />
            ))}
          </div>
        </div>
      </section>

      <div className="px-6 max-w-7xl mx-auto">
        <WhyItMatters 
          confirmed="Cryptographically verified hashes, official CVE disclosures, and directly observed telemetry packets from primary sources."
          defensive="Specific detection engineering rules, perimeter patching mandates (CISA BOD 22-01), and immediate containment steps for SOC teams."
          unknown="Unattributed threat actor links, secondary downstream payload delivery, and unverified third-party claims explicitly separated from facts."
        />
      </div>

      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#D9DDE2]">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6">
            <div className="text-[10px] font-bold tracking-wider text-[#111111] uppercase mb-2">Vulnerability Watch</div>
            <h3 className="text-lg font-bold text-[#111111] mb-2">Active Exploits & KEV</h3>
            <p className="text-sm text-[#56606B] leading-relaxed mb-4">
              Real-time monitoring of CISA KEV catalog inclusions, FIRST EPSS v3 probability scores, and critical zero-day advisories.
            </p>
            <Link href="/vulnerabilities" className="text-[11px] uppercase tracking-wider text-[#111111] font-bold hover:text-[#FF6A00] transition-colors">
              Explore Vulnerabilities &rarr;
            </Link>
          </div>

          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6">
            <div className="text-[10px] font-bold tracking-wider text-[#111111] uppercase mb-2">Threat Actor Watch</div>
            <h3 className="text-lg font-bold text-[#111111] mb-2">Nation-State & APT Tracking</h3>
            <p className="text-sm text-[#56606B] leading-relaxed mb-4">
              Dossiers on Volt Typhoon, APT29, Lazarus Group, and cybercrime syndicates tracking infrastructure and attribution.
            </p>
            <Link href="/actors" className="text-[11px] uppercase tracking-wider text-[#111111] font-bold hover:text-[#FF6A00] transition-colors">
              Explore Threat Actors &rarr;
            </Link>
          </div>

          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6">
            <div className="text-[10px] font-bold tracking-wider text-[#111111] uppercase mb-2">Malware Watch</div>
            <h3 className="text-lg font-bold text-[#111111] mb-2">Payloads & C2 Beacons</h3>
            <p className="text-sm text-[#56606B] leading-relaxed mb-4">
              Analysis of infostealers, ransomware strains, and malleable C2 frameworks with real-time IOC distribution.
            </p>
            <Link href="/malware" className="text-[11px] uppercase tracking-wider text-[#111111] font-bold hover:text-[#FF6A00] transition-colors">
              Inspect Malware Families &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#D9DDE2]">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A838D] mb-2 block">Institutional Memory</span>
            <h3 className="text-2xl font-bold text-[#111111] mb-3">GLOBAL CYBER KNOWLEDGE</h3>
            <p className="text-sm text-[#56606B] leading-relaxed mb-6">
              Indexed standard frameworks providing auditable semantic grounding for every analytical inference.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {frameworks.map((f) => (
                <KnowledgeCard key={f.id} framework={f} />
              ))}
            </div>
            <Link href="/knowledge" className="text-[11px] font-bold uppercase tracking-wider text-[#111111] hover:text-[#FF6A00] transition-colors">
              Access Knowledge Center &rarr;
            </Link>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6BFF] mb-2 block">Jurisdictional Compliance</span>
            <h3 className="text-2xl font-bold text-[#111111] mb-3">REGULATORY INTELLIGENCE</h3>
            <p className="text-sm text-[#56606B] leading-relaxed mb-6">
              Technical incident reporting obligations, supervisory authorities, and compliance deadlines.
            </p>
            <div className="flex flex-col gap-4 mb-6">
              {regulations.map((r) => (
                <RegulationCard key={r.id} regulation={r} />
              ))}
            </div>
            <Link href="/regulations" className="text-[11px] font-bold uppercase tracking-wider text-[#2F6BFF] hover:underline">
              Explore Regulatory Matrix &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A838D] mb-2 block">Platform Architecture</span>
          <h2 className="text-3xl font-bold text-[#111111]">HOW ZAYRON-X OPERATES</h2>
          <p className="text-sm text-[#7A838D] mt-2">A deterministic, evidence-first intelligence pipeline operating 24/7 at the edge.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-center">
          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-5">
            <div className="text-[10px] font-bold text-[#111111] font-mono tracking-wider mb-2">01. SIGNALS</div>
            <div className="text-sm font-bold text-[#111111] mb-1">Telemetry Ingest</div>
            <p className="text-[11px] text-[#7A838D] leading-relaxed">25 global channels normalized into English.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-5">
            <div className="text-[10px] font-bold text-[#111111] font-mono tracking-wider mb-2">02. EVIDENCE</div>
            <div className="text-sm font-bold text-[#111111] mb-1">Crypto Anchors</div>
            <p className="text-[11px] text-[#7A838D] leading-relaxed">Cryptographic SHA-256 hash & provenance.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-5">
            <div className="text-[10px] font-bold text-[#111111] font-mono tracking-wider mb-2">03. GRAPH</div>
            <div className="text-sm font-bold text-[#111111] mb-1">Correlation</div>
            <p className="text-[11px] text-[#7A838D] leading-relaxed">Multi-source entity resolution & linking.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-5">
            <div className="text-[10px] font-bold text-[#111111] font-mono tracking-wider mb-2">04. CONTEXT</div>
            <div className="text-sm font-bold text-[#111111] mb-1">RAG Grounding</div>
            <p className="text-[11px] text-[#7A838D] leading-relaxed">Anchored against Tier 0 MITRE/NIST corpus.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-5">
            <div className="text-[10px] font-bold text-[#FF6A00] font-mono tracking-wider mb-2">05. PUBLISH</div>
            <div className="text-sm font-bold text-[#111111] mb-1">Distribution</div>
            <p className="text-[11px] text-[#7A838D] leading-relaxed">Canonical report + 6 social platform derivatives.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
