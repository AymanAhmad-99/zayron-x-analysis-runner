import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "ZAYRON-X Daily Intelligence Briefing — Today's Operational Threat Overview",
  description: "Executive and technical daily cyber threat intelligence briefing covering active exploits, nation-state actors, malware campaigns, and defensive countermeasures.",
};

export const revalidate = 300; // 5 minutes ISR

function SeverityBadge({ severity }: { severity?: string }) {
  const s = (severity || 'MEDIUM').toUpperCase();
  const cls: Record<string, string> = {
    CRITICAL: 'badge-critical',
    HIGH:     'badge-high',
    MEDIUM:   'badge-medium',
    LOW:      'badge-low',
  };
  return <span className={cls[s] ?? cls.MEDIUM}>{s}</span>;
}

export default async function TodayIntelligencePage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zayron-x-api.aabusabih.workers.dev';
  let articles: any[] = [];

  try {
    const res = await fetch(`${baseUrl}/api/v1/articles?limit=10`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      articles = data?.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch today articles', err);
  }

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const criticalArticle = articles.find((a) => a.severity === 'critical') || articles[0];
  const otherArticles = articles.filter((a) => a.id !== criticalArticle?.id);

  return (
    <div className="flex flex-col w-full bg-[#F7F7F5] text-[#111111]">

      {/* ── PAGE HEADER ── */}
      <section className="w-full border-b border-[#D9DDE2] bg-[#FFFFFF] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FF6A00]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-pulse" />
              Live Intelligence
            </span>
            <span className="text-[#D9DDE2]">·</span>
            <span className="text-xs text-[#7A838D]">{today}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111111] mb-4 leading-tight">
            Daily Intelligence<br />Briefing
          </h1>
          <p className="text-lg text-[#56606B] leading-relaxed max-w-2xl">
            Consolidated operational cyber threat intelligence for today.
            Synthesized from multi-source telemetry, verified vulnerability disclosures, and active adversary campaign tracking.
          </p>
        </div>
      </section>

      {/* ── TOP CRITICAL INTELLIGENCE ── */}
      {criticalArticle && (
        <section className="w-full py-16 border-b border-[#D9DDE2] bg-[#FFFFFF]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="zx-micro text-[#FF6A00] mb-6">Top Intelligence</div>
            <div className="border border-[#FF6A00]/25 bg-[#FFFFFF] p-8 rounded-sm">
              <div className="flex items-center gap-3 mb-5">
                <SeverityBadge severity={criticalArticle.severity} />
                <span className="text-xs text-[#7A838D]">
                  Confidence: <span className="font-bold text-[#111111]">{Math.round((criticalArticle.confidence || 0.95) * 100)}%</span>
                </span>
                <span className="text-xs text-[#7A838D]">{criticalArticle.published_at?.slice(0, 10) || today}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] mb-4 leading-snug max-w-4xl">
                {criticalArticle.title}
              </h2>
              <p className="text-base text-[#56606B] leading-relaxed max-w-3xl mb-8">
                {criticalArticle.excerpt || criticalArticle.dek || 'Adversary telemetry indicates confirmed weaponization of remote code execution vulnerabilities across enterprise targets.'}
              </p>
              <div className="flex items-center gap-6 pt-6 border-t border-[#D9DDE2]">
                <Link
                  href={`/threats/${criticalArticle.slug || criticalArticle.id}`}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#111111] text-white px-5 py-2.5 rounded-sm hover:bg-[#FF6A00] transition-colors"
                >
                  Read Full Assessment →
                </Link>
                <span className="text-xs text-[#7A838D]">
                  {criticalArticle.evidence_count || 0} evidence anchors
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── INTELLIGENCE WATCH MATRIX ── */}
      <section className="w-full py-16 border-b border-[#D9DDE2]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="zx-micro text-[#7A838D] mb-8">Today's Intelligence Matrix</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Threat Actor Watch */}
            <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6 rounded-sm hover:border-[#111111] transition-colors">
              <div className="zx-micro text-[#FF6A00] mb-3">Threat Actor Watch</div>
              <h3 className="text-base font-bold text-[#111111] mb-2">Volt Typhoon & APT29 Activity</h3>
              <p className="text-xs text-[#56606B] leading-relaxed mb-5">
                Active Living-off-the-Land and credential access techniques observed targeting critical infrastructure and cloud identity stores.
              </p>
              <Link href="/actors" className="text-xs font-semibold text-[#111111] hover:text-[#FF6A00] transition-colors">
                Explore Threat Actors →
              </Link>
            </div>

            {/* Vulnerability Watch */}
            <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6 rounded-sm hover:border-[#111111] transition-colors">
              <div className="zx-micro text-[#2F6BFF] mb-3">Vulnerability Watch</div>
              <h3 className="text-base font-bold text-[#111111] mb-2">CISA KEV & Zero-Day Updates</h3>
              <p className="text-xs text-[#56606B] leading-relaxed mb-5">
                Active perimeter vulnerabilities in VPN and edge gateways tracked under emergency remediation directives.
              </p>
              <Link href="/vulnerabilities" className="text-xs font-semibold text-[#2F6BFF] hover:underline">
                View KEV Catalog →
              </Link>
            </div>

            {/* Malware Watch */}
            <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6 rounded-sm hover:border-[#111111] transition-colors">
              <div className="zx-micro text-[#7A838D] mb-3">Malware Watch</div>
              <h3 className="text-base font-bold text-[#111111] mb-2">Lumma & Cobalt Strike C2</h3>
              <p className="text-xs text-[#56606B] leading-relaxed mb-5">
                Infostealer exfiltration traffic and malleable C2 beacons identified across multiple hosting providers.
              </p>
              <Link href="/malware" className="text-xs font-semibold text-[#111111] hover:text-[#FF6A00] transition-colors">
                Inspect Malware Families →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTELLIGENCE STREAM ── */}
      {otherArticles.length > 0 ? (
        <section className="w-full py-16 bg-[#FFFFFF]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div className="zx-micro text-[#7A838D]">Today's Intelligence Stream</div>
              <span className="text-xs text-[#7A838D]">{otherArticles.length} items</span>
            </div>
            <div className="divide-y divide-[#D9DDE2]">
              {otherArticles.map((art) => (
                <div key={art.id} className="py-5 flex items-start gap-5 hover:bg-[#F7F7F5] -mx-6 px-6 transition-colors">
                  <div className="flex-shrink-0 w-16 text-right">
                    <SeverityBadge severity={art.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[11px] text-[#7A838D] font-mono">
                        {art.published_at?.slice(0, 10) || today}
                      </span>
                      <span className="text-[11px] text-[#7A838D]">
                        Confidence: {Math.round((art.confidence || 0.8) * 100)}%
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#111111] mb-1 leading-snug">{art.title}</h4>
                    <p className="text-xs text-[#56606B] line-clamp-2 leading-relaxed">
                      {art.excerpt || art.dek || 'Adversary activity analyzed.'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Link
                      href={`/threats/${art.slug || art.id}`}
                      className="text-xs font-semibold text-[#111111] hover:text-[#FF6A00] transition-colors whitespace-nowrap"
                    >
                      Read →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="w-full py-16 bg-[#FFFFFF]">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm text-[#7A838D] leading-relaxed max-w-md mx-auto">
              No additional intelligence assessments currently meet the publication threshold for today's brief.
            </p>
            <Link
              href="/threats"
              className="inline-flex items-center gap-2 mt-6 text-xs font-semibold text-[#111111] hover:text-[#FF6A00] transition-colors"
            >
              Browse full intelligence archive →
            </Link>
          </div>
        </section>
      )}

      {/* ── TELEGRAM CTA ── */}
      <section className="w-full py-12 border-t border-[#D9DDE2]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="zx-micro text-[#7A838D] mb-1">Daily Intelligence Distribution</div>
            <p className="text-sm font-semibold text-[#111111]">
              Receive today's briefing on Telegram
            </p>
            <p className="text-xs text-[#56606B] mt-1">
              Same canonical intelligence, formatted for rapid operational review.
            </p>
          </div>
          <a
            href="https://t.me/zayronx"
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 text-xs font-bold uppercase tracking-wider border border-[#111111] px-5 py-2.5 rounded-sm hover:bg-[#111111] hover:text-white transition-colors"
          >
            Follow on Telegram →
          </a>
        </div>
      </section>
    </div>
  );
}
