import React from 'react';
import { ArrowLeft, ShieldAlert, Activity, FileText, Globe, Target, Server, Search } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThreatBadge, EvidencePanel } from '@zayron/ui';
import { getVulnerabilityById } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function VulnerabilityDossier({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const cveQuery = resolvedParams.id;

  const res = await getVulnerabilityById(cveQuery);
  if (!res || !res.data) {
    notFound();
  }

  const vuln = res.data;
  const linkedEvents = vuln.linked_events || [];
  const relatedEvidence = vuln.related_evidence || [];
  const relatedIocs = vuln.related_iocs || [];

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-screen">
      {/* Dossier Header */}
      <header className="bg-[#F7F7F5] border-b border-[#111111]/10 pt-8 pb-12">
        <div className="container mx-auto px-6">
          <Link href="/vulnerabilities" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] hover:text-[#FF6B00] transition-colors mb-8">
            <ArrowLeft className="w-3 h-3" /> Back to Vulnerabilities
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <ThreatBadge 
                  severity={vuln.severity.toLowerCase() as any} 
                  score={vuln.cvss_score ?? (vuln.severity.toLowerCase() === 'critical' ? 9.8 : vuln.severity.toLowerCase() === 'high' ? 8.2 : 5.5)} 
                />
                {vuln.is_exploited_in_wild === 1 ? (
                  <span className="text-xs font-mono font-bold text-[#D92D20] border border-[#D92D20]/20 px-2 py-0.5 bg-red-50">
                    ACTIVE IN-WILD EXPLOITATION
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold text-[#2D2D2D] border border-[#111111]/20 px-2 py-0.5 bg-white">
                    TRACKED SECURITY ADVISORY
                  </span>
                )}
              </div>
              <h1 className="font-serif text-4xl lg:text-5xl font-bold text-[#111111] mb-6 tracking-tight">
                {vuln.cve_id}: {vuln.title}
              </h1>
              <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
                {vuln.description || 'No detailed advisory description recorded for this CVE identifier.'}
              </p>
            </div>
            
            {/* Quick Stats Panel */}
            <div className="bg-white border border-[#111111]/10 p-6 w-full lg:w-80 shrink-0 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] border-b border-[#111111]/10 pb-2 mb-4">Vulnerability Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans text-[#2D2D2D]">Severity</span>
                  <span className="font-mono font-bold text-[#111111] uppercase">{vuln.severity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans text-[#2D2D2D]">CVSS Score</span>
                  <span className="font-mono font-bold text-[#111111]">
                    {vuln.cvss_score ? vuln.cvss_score.toFixed(1) : 'Not available'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans text-[#2D2D2D]">EPSS Probability</span>
                  <span className="font-mono font-bold text-[#111111]">
                    {vuln.epss_score ? `${(vuln.epss_score * 100).toFixed(1)}%` : 'Not available'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-[#111111]/10 pt-4">
                  <span className="text-xs font-sans text-[#2D2D2D]">Published Date</span>
                  <span className="text-xs font-mono font-bold text-[#111111]">
                    {vuln.published_at ? new Date(vuln.published_at).toLocaleDateString('en-US') : 'Not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dossier Content */}
      <main className="container mx-auto px-6 py-12 flex-1 space-y-12">
        
        {/* Linked Intelligence Events */}
        <section className="space-y-6">
          <div className="border-b border-[#111111]/10 pb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-[#111111] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#FF6B00]" /> Observed Intelligence Events ({linkedEvents.length})
            </h2>
          </div>

          {linkedEvents.length === 0 ? (
            <div className="p-8 border border-[#111111]/10 bg-[#F7F7F5] text-sm text-[#2D2D2D]">
              No direct intelligence telemetry currently recorded for this CVE.
            </div>
          ) : (
            <div className="space-y-4">
              {linkedEvents.map((ev) => (
                <div key={ev.id} className="p-6 border border-[#111111]/10 bg-[#F7F7F5] space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-[#111111] text-base">{ev.title}</h3>
                    <span className="text-xs font-mono text-[#2D2D2D]">
                      Confidence: {(ev.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-[#2D2D2D] leading-relaxed">{ev.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Provenance & Evidence */}
        {relatedEvidence.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#111111]">
              Cryptographic Evidence & Provenance
            </h2>
            <EvidencePanel
              defaultExpanded={true}
              evidence={relatedEvidence.map((e) => ({
                id: e.id,
                sourceName: e.source_name || 'Telemetry Node',
                type: e.type,
                url: e.url,
                snippet: e.snippet,
                weight: e.weight,
                capturedAt: e.created_at,
              }))}
            />
          </section>
        )}

        {/* Linked IOCs */}
        {relatedIocs.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#111111]">
              Correlated Indicators of Compromise
            </h2>
            <div className="border border-[#111111]/10 overflow-x-auto">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-[#F7F7F5] border-b border-[#111111]/10 text-[10px] uppercase font-bold tracking-widest text-[#2D2D2D]">
                  <tr>
                    <th className="py-3 px-6">Type</th>
                    <th className="py-3 px-6">Value</th>
                    <th className="py-3 px-6">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111111]/5">
                  {relatedIocs.map((ioc) => (
                    <tr key={ioc.id}>
                      <td className="py-3 px-6 uppercase font-mono text-xs">{ioc.type}</td>
                      <td className="py-3 px-6 font-mono text-xs text-[#111111]">
                        <Link href={`/iocs/${encodeURIComponent(ioc.normalized_value)}`} className="text-[#FF6B00] hover:underline">
                          {ioc.normalized_value}
                        </Link>
                      </td>
                      <td className="py-3 px-6 font-mono text-xs">{(ioc.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
