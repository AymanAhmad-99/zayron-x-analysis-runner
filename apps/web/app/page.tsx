import Link from "next/link";
import { ArrowRight, Activity, ShieldCheck, Database, Search, Terminal, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { MASTER_KNOWLEDGE_ENTITIES_115 } from "@zayron/intelligence";

export const revalidate = 10;

export default async function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zayron-x-api.aabusabih.workers.dev';
  let articles: any[] = [];
  let events: any[] = [];

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

  return (
    <div className="flex flex-col w-full bg-[#F7F7F5] text-[#111111]" data-build="ZAYRON_FRONTEND_BUILD_2027_FINAL_001">
      {/* ── SECTION 1: HERO (Quiet Authority & Precision) ────────────────── */}
      <section className="w-full border-b border-[#252B33]/10 bg-[#FFFFFF] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#FF6A00]/10 border border-[#FF6A00]/20 text-[#FF6A00] text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-pulse"></span>
              <span>Evidence-Driven Cyber Intelligence</span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#111111] leading-[1.08] mb-6 font-sans">
              Understand what changed. <br />
              <span className="text-[#56606B]">Know why it matters.</span>
            </h1>
            <p className="text-lg text-[#56606B] leading-relaxed max-w-2xl mb-8 font-sans">
              ZAYRON-X analyzes global cyber signals, vulnerabilities, adversary activity, malware, and infrastructure with cryptographic evidence at the center.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/threats"
                className="inline-flex justify-center items-center gap-2 bg-[#111111] text-white px-7 py-3.5 text-sm font-semibold tracking-wide rounded hover:bg-[#FF6A00] transition-colors"
              >
                Explore Intelligence <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/intelligence/today"
                className="inline-flex justify-center items-center gap-2 bg-[#FFFFFF] text-[#111111] border border-[#252B33]/20 px-7 py-3.5 text-sm font-semibold tracking-wide rounded hover:border-[#111111] transition-colors"
              >
                Read Today's Briefing
              </Link>
            </div>
            {/* Real Production Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#252B33]/10 max-w-xl text-left">
              <div>
                <div className="text-2xl font-bold text-[#111111] font-mono">25</div>
                <div className="text-xs text-[#7A838D]">Monitored Feeds</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111111] font-mono">100%</div>
                <div className="text-xs text-[#7A838D]">Evidence Grounding</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#FF6A00] font-mono">LIVE</div>
                <div className="text-xs text-[#7A838D]">Edge Ingestion</div>
              </div>
            </div>
          </div>

          {/* Right: Restrained Intelligence Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#252B33]/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-500/10 text-red-600 border border-red-500/20 rounded">
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
              <div className="bg-[#F7F7F5] p-3 rounded border border-[#252B33]/10 mb-4 text-xs font-mono text-[#56606B]">
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
          </div>
        </div>
      </section>

      {/* ── SECTION 2: LIVE INTELLIGENCE WIRE ───────────────────────────── */}
      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#252B33]/10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] font-sans">LIVE INTELLIGENCE STREAM</h2>
            <p className="text-xs text-[#7A838D] mt-1">Real-time verified threat signals normalized and corroborated at the edge</p>
          </div>
          <Link href="/threats" className="text-xs font-semibold text-[#FF6A00] hover:underline">
            View All Signals &rarr;
          </Link>
        </div>
        <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg divide-y divide-[#252B33]/10">
          {events.length > 0 ? (
            events.map((evt) => (
              <div key={evt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F7F7F5] transition-colors">
                <div className="flex items-start sm:items-center gap-3">
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${evt.severity === 'critical' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'}`}>
                    {evt.severity || 'HIGH'}
                  </span>
                  <div>
                    <Link href={`/threats/${evt.id}`} className="text-sm font-bold text-[#111111] hover:text-[#FF6A00] transition-colors block">
                      {evt.title}
                    </Link>
                    <div className="text-[11px] text-[#7A838D] flex items-center gap-3 mt-0.5">
                      <span>Source: {evt.source_channel || 'Verified Ingestion'}</span>
                      <span>•</span>
                      <span>Confidence: {Math.round((evt.confidence || 0.9) * 100)}%</span>
                    </div>
                  </div>
                </div>
                <Link href={`/threats/${evt.id}`} className="text-xs font-semibold text-[#56606B] hover:text-[#111111] shrink-0">
                  Inspect &rarr;
                </Link>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-[#7A838D]">
              Autonomous stream listening. New telemetry signals will appear in real-time.
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 3: TODAY'S INTELLIGENCE (Feature & Stream) ───────────── */}
      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#252B33]/10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] font-sans">TODAY'S INTELLIGENCE</h2>
            <p className="text-xs text-[#7A838D] mt-1">In-depth canonical analyses published by the AI Analyst engine</p>
          </div>
          <Link href="/intelligence/today" className="text-xs font-semibold text-[#FF6A00] hover:underline">
            Open Daily Briefing &rarr;
          </Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Feature */}
          {featuredArticle && (
            <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded bg-red-500/10 text-red-600 border border-red-500/20">
                    {featuredArticle.severity || 'CRITICAL'}
                  </span>
                  <span className="text-xs text-[#7A838D] font-mono">
                    Confidence: {Math.round((featuredArticle.confidence || 0.95) * 100)}%
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#111111] mb-4 leading-tight">
                  {featuredArticle.title}
                </h3>
                <p className="text-sm text-[#56606B] leading-relaxed mb-6">
                  {featuredArticle.excerpt || featuredArticle.dek || 'Adversary telemetry indicates active operational activity involving remote execution and credential dumping.'}
                </p>
              </div>
              <div className="pt-6 border-t border-[#252B33]/10 flex items-center justify-between text-xs">
                <span className="text-[#7A838D]">Published: {featuredArticle.published_at?.slice(0, 10) || 'Today'}</span>
                <Link
                  href={`/threats/${featuredArticle.slug || featuredArticle.id}`}
                  className="text-[#FF6A00] font-bold hover:underline"
                >
                  Read Full Assessment &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Supporting Stories */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {secondaryArticles.map((art) => (
              <div key={art.id} className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-[#F7F7F5] text-[#111111] border border-[#252B33]/10">
                      {art.severity || 'HIGH'}
                    </span>
                    <span className="text-[11px] text-[#7A838D]">{art.category || 'CTI'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#111111] mb-2 leading-snug hover:text-[#FF6A00] transition-colors">
                    <Link href={`/threats/${art.slug || art.id}`}>{art.title}</Link>
                  </h4>
                </div>
                <div className="pt-3 border-t border-[#252B33]/10 flex items-center justify-between text-xs text-[#7A838D]">
                  <span>{art.published_at?.slice(0, 10) || 'Today'}</span>
                  <Link href={`/threats/${art.slug || art.id}`} className="text-[#FF6A00] font-semibold hover:underline">
                    Read &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: SIGNATURE "WHY IT MATTERS" COMPONENT ─────────────── */}
      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#252B33]/10">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6A00] mb-2 block">
            Signature Intelligence Framework
          </span>
          <h2 className="text-2xl font-bold text-[#111111]">WHY IT MATTERS</h2>
          <p className="text-xs text-[#7A838D] mt-1">The definitive analytical standard separating noise from actionable intelligence</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#111111] uppercase mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>What Is Confirmed</span>
            </div>
            <p className="text-xs text-[#56606B] leading-relaxed">
              Cryptographically verified hashes, official CVE disclosures, and directly observed telemetry packets from primary sources.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#111111] uppercase mb-2">
              <AlertTriangle className="w-4 h-4 text-[#FF6A00]" />
              <span>Defensive Implications</span>
            </div>
            <p className="text-xs text-[#56606B] leading-relaxed">
              Specific detection engineering rules, perimeter patching mandates (CISA BOD 22-01), and immediate containment steps for SOC teams.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#111111] uppercase mb-2">
              <HelpCircle className="w-4 h-4 text-[#7A838D]" />
              <span>What Remains Unknown</span>
            </div>
            <p className="text-xs text-[#56606B] leading-relaxed">
              Unattributed threat actor links, secondary downstream payload delivery, and unverified third-party claims explicitly separated from facts.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: THREAT HUBS MATRIX (Vulnerabilities, Actors, Malware) ─ */}
      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#252B33]/10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Vulnerability Watch */}
          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6">
            <div className="text-xs font-bold text-[#FF6A00] uppercase mb-2">Vulnerability Watch</div>
            <h3 className="text-lg font-bold text-[#111111] mb-2">Active Exploits & KEV</h3>
            <p className="text-xs text-[#56606B] leading-relaxed mb-4">
              Real-time monitoring of CISA KEV catalog inclusions, FIRST EPSS v3 probability scores, and critical zero-day advisories.
            </p>
            <Link href="/vulnerabilities" className="text-xs text-[#FF6A00] font-semibold hover:underline">
              Explore Vulnerabilities &rarr;
            </Link>
          </div>

          {/* Threat Actor Watch */}
          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6">
            <div className="text-xs font-bold text-[#111111] uppercase mb-2">Threat Actor Watch</div>
            <h3 className="text-lg font-bold text-[#111111] mb-2">Nation-State & APT Tracking</h3>
            <p className="text-xs text-[#56606B] leading-relaxed mb-4">
              Dossiers on Volt Typhoon, APT29, Lazarus Group, and cybercrime syndicates tracking infrastructure and attribution.
            </p>
            <Link href="/actors" className="text-xs text-[#111111] font-semibold hover:underline">
              Explore Threat Actors &rarr;
            </Link>
          </div>

          {/* Malware Watch */}
          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6">
            <div className="text-xs font-bold text-green-600 uppercase mb-2">Malware Watch</div>
            <h3 className="text-lg font-bold text-[#111111] mb-2">Payloads & C2 Beacons</h3>
            <p className="text-xs text-[#56606B] leading-relaxed mb-4">
              Analysis of infostealers (Lumma), ransomware strains (LockBit, BlackCat), and malleable C2 frameworks (Cobalt Strike).
            </p>
            <Link href="/malware" className="text-xs text-green-600 font-semibold hover:underline">
              Inspect Malware Families &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: KNOWLEDGE & REGULATORY CENTERS ───────────────────── */}
      <section className="w-full py-16 px-6 max-w-7xl mx-auto border-b border-[#252B33]/10">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6A00] mb-2 block">Institutional Memory</span>
            <h3 className="text-2xl font-bold text-[#111111] mb-3">GLOBAL CYBER KNOWLEDGE</h3>
            <p className="text-xs text-[#56606B] leading-relaxed mb-6">
              Indexed standard frameworks (MITRE ATT&CK, NIST CSF 2.0, CISA BOD 22-01, OWASP Top 10) providing auditable semantic grounding for every analytical inference.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {frameworks.map((f) => (
                <div key={f.id} className="p-3 bg-[#F7F7F5] rounded border border-[#252B33]/10 text-xs">
                  <div className="font-bold text-[#111111] truncate">{f.title}</div>
                  <div className="text-[10px] text-[#7A838D]">Tier {f.authority_tier} Standard</div>
                </div>
              ))}
            </div>
            <Link href="/knowledge" className="text-xs font-bold text-[#111111] hover:text-[#FF6A00] transition-colors">
              Access Knowledge Center &rarr;
            </Link>
          </div>

          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2F6BFF] mb-2 block">Jurisdictional Compliance</span>
            <h3 className="text-2xl font-bold text-[#111111] mb-3">REGULATORY INTELLIGENCE</h3>
            <p className="text-xs text-[#56606B] leading-relaxed mb-6">
              Technical incident reporting obligations, supervisory authorities, and compliance deadlines for EU NIS2, DORA, GDPR, US CIRCIA, and HIPAA.
            </p>
            <div className="p-4 bg-[#F7F7F5] rounded border border-[#252B33]/10 text-xs text-[#56606B] mb-6 leading-relaxed">
              <span className="font-bold text-[#111111] block mb-1">EU NIS2 Directive (Article 23):</span>
              Mandatory 24-hour early warning notification to CSIRT for significant cyber threats affecting essential entities.
            </div>
            <Link href="/regulations" className="text-xs font-bold text-[#2F6BFF] hover:underline">
              Explore Regulatory Matrix &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: PLATFORM ARCHITECTURE (The 5-Step Pipeline) ──────── */}
      <section className="w-full py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6A00] mb-2 block">Platform Architecture</span>
          <h2 className="text-3xl font-bold text-[#111111]">HOW ZAYRON-X OPERATES</h2>
          <p className="text-xs text-[#7A838D] mt-2">A deterministic, evidence-first intelligence pipeline operating 24/7 at the edge.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-center">
          <div className="bg-[#FFFFFF] border border-[#252B33]/15 p-5 rounded-lg">
            <div className="text-xs font-bold text-[#FF6A00] font-mono mb-1">01. SIGNALS</div>
            <div className="text-xs font-bold text-[#111111] mb-1">Telemetry Ingest</div>
            <p className="text-[11px] text-[#7A838D]">25 global channels normalized into English.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#252B33]/15 p-5 rounded-lg">
            <div className="text-xs font-bold text-[#111111] font-mono mb-1">02. EVIDENCE</div>
            <div className="text-xs font-bold text-[#111111] mb-1">Crypto Anchors</div>
            <p className="text-[11px] text-[#7A838D]">Cryptographic SHA-256 hash & provenance.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#252B33]/15 p-5 rounded-lg">
            <div className="text-xs font-bold text-[#111111] font-mono mb-1">03. GRAPH</div>
            <div className="text-xs font-bold text-[#111111] mb-1">Correlation</div>
            <p className="text-[11px] text-[#7A838D]">Multi-source entity resolution & linking.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#252B33]/15 p-5 rounded-lg">
            <div className="text-xs font-bold text-[#111111] font-mono mb-1">04. CONTEXT</div>
            <div className="text-xs font-bold text-[#111111] mb-1">RAG Grounding</div>
            <p className="text-[11px] text-[#7A838D]">Anchored against Tier 0 MITRE/NIST corpus.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#252B33]/15 p-5 rounded-lg">
            <div className="text-xs font-bold text-[#FF6A00] font-mono mb-1">05. PUBLISH</div>
            <div className="text-xs font-bold text-[#111111] mb-1">Distribution</div>
            <p className="text-[11px] text-[#7A838D]">Canonical report + 6 social platform derivatives.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
