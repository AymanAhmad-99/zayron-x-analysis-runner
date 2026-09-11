import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIntelligenceById, type CanonicalIntelligenceReport } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getIntelligenceById(id).catch(() => null);
  const report = res?.report;
  if (!report) {
    return { title: 'Intelligence Report | Z.X.INTELLIGENCE' };
  }
  return {
    title: `${report.title} — Z.X.INTELLIGENCE`,
    description: report.summary,
    alternates: { canonical: `/intelligence/${id}` },
  };
}

export default async function IntelligenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getIntelligenceById(id).catch(() => null);
  const report: CanonicalIntelligenceReport | undefined = res?.report;

  if (!report) {
    notFound();
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-[#DC2626] text-white border-[#DC2626]';
      case 'HIGH':
        return 'bg-[#EA580C] text-white border-[#EA580C]';
      case 'MEDIUM':
        return 'bg-[#F59E0B] text-black border-[#F59E0B]';
      case 'LOW':
        return 'bg-[#10B981] text-white border-[#10B981]';
      default:
        return 'bg-[#6B7280] text-white border-[#6B7280]';
    }
  };

  const confidenceScore = Math.round((report.confidence?.overall_confidence || 0.85) * 100);
  const repType = (report as any).report_type || report.structured_report?.report_type;
  const isRansomware = repType === 'RANSOMWARE' || /\b(ransomware|lockbit|blackcat)\b/i.test(report.title || '');
  const isMalware = !isRansomware && (repType === 'MALWARE' || (report.entities?.malware && report.entities.malware.length > 0));
  const isActor = repType === 'THREAT_ACTOR' || (!isRansomware && !isMalware && (report.entities?.actors && report.entities.actors.length > 0));
  const isCampaign = repType === 'CAMPAIGN' || (report.entities?.campaigns && report.entities.campaigns.length > 0);
  const isIncident = repType === 'INCIDENT_TELEMETRY';
  const isVulnerability = repType === 'VULNERABILITY' || (report.entities?.cves && report.entities.cves.length > 0);

  const archetypeBadge = isRansomware ? 'RANSOMWARE DOSSIER'
    : isMalware ? 'MALWARE DOSSIER'
    : isActor ? 'THREAT ACTOR DOSSIER'
    : isCampaign ? 'CAMPAIGN DOSSIER'
    : isIncident ? 'INCIDENT DOSSIER'
    : isVulnerability ? 'VULNERABILITY DOSSIER'
    : 'THREAT INTELLIGENCE DOSSIER';

  const sections = report.structured_report?.sections || [];
  const epistemic = report.epistemic_breakdown || {
    verified_facts: [
      ...(report.entities?.cves || []).map(c => `Registered CVE ID: ${c.cve_id}`),
      `Observed telemetry from ${report.source_title}`,
      `Collection vehicle: ${report.source_handle ? `@${report.source_handle}` : report.source_title}`,
      `Payload hash: ${report.content_hash ? report.content_hash.slice(0, 16) : 'N/A'}...`,
    ],
    analyst_assessment: [
      report.ai_analysis?.why_it_matters || report.summary || 'Empirical telemetry under analytical evaluation against defensive baselines.',
    ],
    unknowns: [
      'Complete downstream enterprise victim footprint unobserved in initial reporting.',
      report.entities?.actors && report.entities.actors.length > 0
        ? `Threat actor identified (${report.entities.actors[0].name}); secondary campaign coordination unconfirmed.`
        : 'No validated threat actor attribution identified in current corpus.',
    ],
  };

  return (
    <main className="min-h-screen bg-[#F7F7F4] text-[#050505]">
      <div className="mx-auto max-w-[1100px] px-6 py-12 lg:py-16">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/intelligence"
            className="font-mono text-xs font-bold uppercase tracking-wider text-[#C94F00] hover:text-black transition-colors inline-flex items-center gap-1.5"
          >
            ← BACK TO INTELLIGENCE FEED
          </Link>
        </div>

        {/* 1. Header & Metadata Ribbon */}
        <header className="rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EFEA] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider border ${getSeverityBadge(report.severity)}`}>
                {report.severity || 'MEDIUM'}
              </span>
              <span className="rounded bg-[#050505] px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-white">
                {archetypeBadge}
              </span>
              {report.priority && (
                <span className="rounded bg-[#F0EFEA] px-2.5 py-1 text-xs font-mono font-bold text-black border border-[#D9D7D0]">
                  PRIORITY: {report.priority}
                </span>
              )}
            </div>
            <div className="font-mono text-xs font-bold">
              <span className="text-[#737373] uppercase">CONFIDENCE: </span>
              <span className="text-[#10B981]">{confidenceScore}% ({report.confidence?.rating || 'HIGH'})</span>
            </div>
          </div>

          <div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold uppercase leading-tight tracking-tight text-[#050505]">
              {report.title}
            </h1>
          </div>

          {/* Technical Metadata Strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded bg-[#F7F7F4] p-4 text-xs font-mono text-[#525252] border border-[#E2E1DC]">
            <div>
              <span className="block text-[10px] uppercase text-[#737373]">Intelligence ID</span>
              <span className="font-bold text-[#050505] break-all">{report.intelligence_id}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-[#737373]">Engine Standard</span>
              <span className="font-bold text-[#050505]">
                {report.structured_report?.report_version ? `CANONICAL v${report.structured_report.report_version}` : 'CANONICAL v2.0'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-[#737373]">Issuing Authority</span>
              <span className="font-bold text-[#050505]">
                {report.source_references?.[0]?.title || (report.source_title.includes('Telegram') ? 'Security Advisory Source' : report.source_title)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-[#737373]">Collection Channel</span>
              {report.source_handle ? (
                <a
                  href={`https://t.me/${report.source_handle.replace(/^@+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#C94F00] hover:underline"
                >
                  @{report.source_handle.replace(/^@+/, '')}
                </a>
              ) : (
                <span className="font-bold text-[#050505]">Telegram Telemetry</span>
              )}
            </div>
          </div>
        </header>

        {/* ── EPISTEMIC DISTINCTION PANELS (NON-NEGOTIABLE CANON) ── */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Panel A: Verified Facts */}
          <div className="rounded border-2 border-[#10B981] bg-white p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#059669]">
                VERIFIED FACTS
              </h2>
              <span className="rounded bg-[#D1FAE5] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#065F46]">
                EMPIRICAL
              </span>
            </div>
            <ul className="space-y-2 text-xs font-sans text-[#1F2937] leading-relaxed">
              {epistemic.verified_facts.map((fact, idx) => (
                <li key={idx}>• {fact}</li>
              ))}
            </ul>
          </div>

          {/* Panel B: Analyst Assessment */}
          <div className="rounded border-2 border-[#3B82F6] bg-white p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                ANALYST ASSESSMENT
              </h2>
              <span className="rounded bg-[#DBEAFE] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#1E40AF]">
                INFERENCE
              </span>
            </div>
            <ul className="space-y-2 text-xs font-sans text-[#1F2937] leading-relaxed">
              {epistemic.analyst_assessment.map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
            <div className="pt-2 text-[11px] font-mono text-[#4B5563]">
              Confidence Model: <strong>{confidenceScore}% ({report.confidence?.rating || 'HIGH'})</strong>
            </div>
          </div>

          {/* Panel C: Unknown / Unresolved */}
          <div className="rounded border-2 border-[#F59E0B] bg-white p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#D97706]">
                UNKNOWN / UNRESOLVED
              </h2>
              <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#92400E]">
                DISCLOSED GAPS
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#4B5563] leading-relaxed">
              {epistemic.unknowns.map((unk, idx) => (
                <li key={idx}>• {unk}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── CANONICAL 10-SECTION REPORT CONTAINER ── */}
        <div className="mt-8 space-y-6">
          {sections.length > 0 ? (
            sections.map((sec, idx) => (
              <section key={idx} className="rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-3">
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#C94F00]">
                    {sec.section_number} / {sec.title}
                  </h2>
                  <span className="font-mono text-[10px] text-[#737373] uppercase">
                    {sec.category || 'CANONICAL SECTION'}
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-[#262626] font-sans whitespace-pre-line pt-1">
                  {sec.content}
                </div>
              </section>
            ))
          ) : (
            <>
              {/* Fallback to Executive Summary if structured sections are not initialized */}
              <section className="rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-3">
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#C94F00]">
                    01 / EXECUTIVE ASSESSMENT
                  </h2>
                </div>
                <p className="text-base leading-relaxed text-[#262626] font-sans">
                  {report.summary}
                </p>
              </section>
            </>
          )}
        </div>

        {/* ── CORRELATED TECHNICAL ENTITIES ── */}
        <section className="mt-8 rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-6">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#C94F00]">
            CORRELATED TECHNICAL ENTITIES
          </h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* CVEs */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase text-[#737373]">Vulnerabilities (CVEs)</h3>
              {report.entities?.cves && report.entities.cves.length > 0 ? (
                <div className="space-y-2">
                  {report.entities.cves.map((c) => (
                    <div key={c.cve_id} className="rounded border border-[#FCA5A5] bg-[#FEF2F2] p-2 text-xs font-mono">
                      <span className="font-bold text-[#B91C1C]">{c.cve_id}</span>
                      <span className="block text-[10px] text-[#737373]">Status: {c.status || 'OBSERVED'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#737373] italic">No validated CVEs in this signal.</p>
              )}
            </div>

            {/* Threat Actors */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase text-[#737373]">Threat Actors</h3>
              {report.entities?.actors && report.entities.actors.length > 0 ? (
                <div className="space-y-2">
                  {report.entities.actors.map((a) => (
                    <div key={a.name} className="rounded border border-[#93C5FD] bg-[#EFF6FF] p-2 text-xs font-mono">
                      <span className="font-bold text-[#1D4ED8]">{a.name}</span>
                      <span className="block text-[10px] text-[#737373]">Attribution: {a.status || 'REPORTED'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#737373] italic">No validated threat actor attribution.</p>
              )}
            </div>

            {/* Malware Families */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase text-[#737373]">Malware Families</h3>
              {report.entities?.malware && report.entities.malware.length > 0 ? (
                <div className="space-y-2">
                  {report.entities.malware.map((m) => (
                    <div key={m.name} className="rounded border border-[#D8B4FE] bg-[#FAF5FF] p-2 text-xs font-mono">
                      <span className="font-bold text-[#7E22CE]">{m.name}</span>
                      <span className="block text-[10px] text-[#737373]">Family: {m.family || 'Identified Payload'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#737373] italic">No malware families observed.</p>
              )}
            </div>
          </div>

          {/* MITRE ATT&CK Techniques */}
          {report.entities?.techniques && report.entities.techniques.length > 0 && (
            <div className="pt-4 border-t border-[#F0EFEA]">
              <h3 className="font-mono text-xs font-bold uppercase text-[#737373] mb-2">MITRE ATT&CK Techniques</h3>
              <div className="flex flex-wrap gap-2">
                {report.entities.techniques.map((t) => (
                  <span key={t.id} className="rounded bg-[#050505] px-2.5 py-1 text-xs font-mono text-white">
                    {t.id}: {t.name} ({t.tactic})
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── INDICATORS OF COMPROMISE (IoCs) ── */}
        {report.indicators && report.indicators.length > 0 && (
          <section className="mt-8 rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-4">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#C94F00]">
              INDICATORS OF COMPROMISE (IoCs)
            </h2>
            <div className="divide-y divide-[#F0EFEA] border border-[#E2E1DC] rounded font-mono text-xs">
              {report.indicators.map((ioc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-[#F7F7F4]">
                  <div>
                    <span className="rounded bg-[#E5E7EB] px-1.5 py-0.5 text-[10px] font-bold uppercase text-black mr-2">
                      {ioc.type}
                    </span>
                    <span className="text-[#050505] font-bold select-all">{ioc.value}</span>
                  </div>
                  <span className="text-[10px] text-[#737373] uppercase">EMPIRICAL TELEMETRY</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── KNOWLEDGE APPLIED TRACE (AUDIT RECORD) ── */}
        <section className="mt-8 rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#C94F00]">
              KNOWLEDGE APPLIED TRACE
            </h2>
            <span className="rounded bg-[#050505] px-2 py-0.5 text-[10px] font-mono font-bold text-white uppercase">
              RAG AUDIT RECORD
            </span>
          </div>

          <p className="text-xs text-[#525252]">
            Authoritative books, standards, and manuals retrieved across the complete knowledge corpus. A document is marked <strong>USED</strong> only when retrieved chunks materially influenced generation.
          </p>

          <div className="space-y-3 pt-2">
            {report.knowledge_trace && report.knowledge_trace.length > 0 ? (
              report.knowledge_trace.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded border p-4 text-xs font-mono transition-all ${
                    item.status === 'USED'
                      ? 'border-[#10B981] bg-[#F0FDF4]'
                      : 'border-[#E5E7EB] bg-[#F9FAFB] opacity-80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-[#050505] text-sm">
                      {item.title} {item.edition ? `(${item.edition})` : ''}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        item.status === 'USED'
                          ? 'bg-[#10B981] text-white'
                          : 'bg-[#E5E7EB] text-[#4B5563]'
                      }`}
                    >
                      {item.status === 'USED' ? 'USED IN ASSESSMENT' : 'CONSIDERED / NOT USED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#4B5563] mb-2">
                    <div><span className="text-[#737373]">Domain:</span> {item.domain}</div>
                    <div><span className="text-[#737373]">Authority:</span> Tier {item.authority_tier}</div>
                    <div><span className="text-[#737373]">Chunk:</span> {item.chunk_id}</div>
                    <div><span className="text-[#737373]">Relevance Score:</span> {item.retrieval_score}</div>
                  </div>

                  <div className="text-[11px] text-[#1F2937]">
                    <strong>Why Retrieved:</strong> {item.why_retrieved || 'Retrieval rationale unavailable'}
                  </div>

                  {item.report_sections_influenced && item.report_sections_influenced.length > 0 && (
                    <div className="text-[11px] text-[#059669] mt-1">
                      <strong>Sections Influenced:</strong> {item.report_sections_influenced.join(', ')}
                    </div>
                  )}

                  {item.rejection_reason && (
                    <div className="text-[11px] text-[#6B7280] italic mt-1">
                      Reason not used: {item.rejection_reason}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-xs font-mono text-[#6B7280]">
                No external knowledge corpus documents satisfied evidentiary preconditions for this raw advisory signal.
              </div>
            )}
          </div>
        </section>

        {/* ── CANONICAL SOURCE REFERENCES & EVIDENCE PROVENANCE ── */}
        <section className="mt-8 rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#C94F00]">
              SOURCE REFERENCES & EVIDENCE PROVENANCE
            </h2>
            <span className="font-mono text-[10px] text-[#737373] uppercase">
              {report.source_references?.length || 0} REFERENCES VERIFIED
            </span>
          </div>

          <div className="space-y-4">
            {report.source_references && report.source_references.length > 0 ? (
              report.source_references.map((ref: any, idx: number) => (
                <div key={ref.reference_id || idx} className="rounded border border-[#E5E7EB] bg-[#FDFBF7] p-4 text-xs font-mono space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#1F2937]">
                      [{idx + 1}] {ref.title || ref.handle || 'Source Document'}
                    </span>
                    <span className="rounded bg-[#E5E7EB] px-1.5 py-0.5 text-[9px] font-bold text-[#374151]">
                      Tier {ref.authority_tier ?? 1} Authority
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#4B5563]">
                    <div><span className="text-[#737373]">Source ID:</span> {ref.source_id || 'N/A'}</div>
                    <div><span className="text-[#737373]">Document/Message ID:</span> {ref.message_id || ref.document_id || 'N/A'}</div>
                    <div><span className="text-[#737373]">Published:</span> {ref.published_at || 'N/A'}</div>
                  </div>

                  {ref.url && (
                    <div className="text-[11px] pt-1">
                      <span className="text-[#737373]">Link: </span>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:underline break-all"
                      >
                        {ref.url}
                      </a>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-xs font-mono text-[#6B7280]">
                No explicit external source references registered for this intelligence record.
              </div>
            )}
          </div>

          {/* Stored Evidence Items */}
          {report.evidence && report.evidence.length > 0 && (
            <div className="pt-4 border-t border-[#F0EFEA] space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase text-[#737373]">
                Evidentiary Excerpts ({report.evidence.length})
              </h3>
              <div className="space-y-3">
                {report.evidence.map((ev: any, idx: number) => (
                  <div key={ev.evidence_id || idx} className="rounded border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs font-sans space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#6B7280]">
                      <span className="font-bold text-[#1F2937]">{ev.evidence_id || `EV-${idx + 1}`}</span>
                      <span>{ev.evidence_type || 'EXCERPT'}</span>
                    </div>
                    {ev.claim && (
                      <div className="text-[11px] font-medium text-[#111827]">
                        Claim: {ev.claim}
                      </div>
                    )}
                    {ev.quoted_excerpt && (
                      <blockquote className="border-l-2 border-[#D97706] pl-2 text-[11px] italic text-[#4B5563]">
                        "{ev.quoted_excerpt}"
                      </blockquote>
                    )}
                    {ev.source_url && (
                      <div className="font-mono text-[10px] text-[#2563EB]">
                        <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {ev.source_url}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── INSPECT RAW INTELLIGENCE SCHEMA ── */}
        <section className="mt-8 rounded border border-[#D9D7D0] bg-white p-6 sm:p-8 space-y-3">
          <details className="group">
            <summary className="cursor-pointer font-mono text-xs font-bold uppercase text-[#737373] hover:text-black flex items-center justify-between">
              <span>INSPECT CANONICAL INTELLIGENCE SCHEMA ({report.schema_version || '1.0.0'})</span>
              <span className="text-[#C94F00] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-4 rounded bg-[#050505] p-4 text-xs font-mono text-[#A3E635] overflow-x-auto">
              <pre>{JSON.stringify(report, null, 2)}</pre>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
