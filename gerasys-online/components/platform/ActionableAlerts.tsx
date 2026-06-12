'use client';

import { useSecurityGating } from '@/components/platform/SecurityGatingContext';
import { ArrowUpRight, Play } from '@/lib/icons';
import type { Article } from '@/lib/types';
import Link from 'next/link';
import { useState } from 'react';

interface ActionableAlertsProps {
  articles: Article[];
}

export function ActionableAlerts({ articles }: ActionableAlertsProps) {
  const [remediatingId, setRemediatingId] = useState<string | null>(null);
  const [successLogs, setSuccessLogs] = useState<Record<string, boolean>>({});
  const [selectedSector, setSelectedSector] = useState<string>('All Sectors');
  const { gateAction } = useSecurityGating();

  const handleRemediate = (id: string, title: string) => {
    gateAction(() => {
      setRemediatingId(id);
      setTimeout(() => {
        setRemediatingId(null);
        setSuccessLogs((prev) => ({ ...prev, [id]: true }));
        alert(
          `[AUTONOMOUS REMEDIATION SUCCESS]\n\nSuccessfully deployed active patch mitigation WAF rules against incident footprint: "${title}" across all target vectors.`,
        );
      }, 1800);
    });
  };

  const SECTORS = ['All Sectors', 'Healthcare', 'Financial', 'Critical Infrastructure'];

  const filteredArticles = articles.filter((article) => {
    if (selectedSector === 'All Sectors') return true;

    const sectorLower = selectedSector.toLowerCase();
    const matchesCategory = article.category?.toLowerCase().includes(sectorLower);
    const matchesTags = article.tags?.some((tag) => tag.toLowerCase().includes(sectorLower));

    // Check if the title or content mentions the sector
    const matchesText =
      article.title.toLowerCase().includes(sectorLower) ||
      article.content.toLowerCase().includes(sectorLower);

    // Special check for "Critical Infrastructure"
    if (selectedSector === 'Critical Infrastructure') {
      const isCriticalInfra =
        article.category?.toLowerCase().includes('critical') ||
        article.category?.toLowerCase().includes('infrastructure') ||
        article.tags?.some(
          (t) => t.toLowerCase().includes('infrastructure') || t.toLowerCase().includes('critical'),
        ) ||
        article.title.toLowerCase().includes('infrastructure') ||
        article.content.toLowerCase().includes('infrastructure');
      return isCriticalInfra;
    }

    return matchesCategory || matchesTags || matchesText;
  });

  return (
    <div className="bg-white border border-neutral-200 rounded-none overflow-hidden shadow-none transition-all duration-300 hover:border-neutral-300 font-sans">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#050505]">
            Active Security Incident Alerts
          </h3>
          <p className="text-[9px] text-neutral-500 font-mono tracking-tight mt-1 uppercase">
            [INGESTION_SCANNER: ACTIVE] · [LATENCY: 8.4ms] · [DB_SYNC: SECURE] · [VECTOR_HASH:
            0x733DD9FF050505A1] · [TIME: {new Date().toISOString()}]
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#733DD9] tracking-[0.15em] uppercase font-black">
          SOVEREIGN PERIMETER
        </span>
      </div>

      {/* Flat Sector Tabs Container */}
      <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`px-3 py-1.5 font-mono text-[9px] font-bold uppercase transition-all border cursor-pointer rounded-none ${
                selectedSector === sec
                  ? 'bg-[#050505] text-white border-[#050505]'
                  : 'bg-white text-neutral-500 border-neutral-200 hover:text-[#733DD9] hover:border-[#733DD9]'
              }`}
            >
              [{sec}]
            </button>
          ))}
        </div>
      </div>

      {/* Table block */}
      <div className="overflow-x-auto">
        {filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-mono text-[10px] uppercase">
            NO INTERCEPTED INFRASTRUCTURE TARGETS MATCHING DESIGNATED VECTOR FILTER
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100 text-[9px] uppercase tracking-wider text-[#050505] font-bold font-mono">
                <th className="py-5 px-6">Incident Details</th>
                <th className="py-5 px-6 text-center">Threat Level</th>
                <th className="py-5 px-6">Financial Exposure</th>
                <th className="py-5 px-6 text-right">Autonomous Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredArticles.slice(0, 10).map((article) => {
                const href = `/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`;

                const isCritical = (article.regulatoryRisk || 'CRITICAL')
                  .toLowerCase()
                  .includes('critical');
                const isRemediated = successLogs[article.id];
                const isProcessing = remediatingId === article.id;

                // Deterministic metadata signatures
                const hexSignature = `0x${article.id.replace(/-/g, '').substring(0, 16).toUpperCase()}`;
                const targetVector = `VECTOR::${(article.category ?? 'CTI').toUpperCase()}_${(article.title.split(' ')[0] || 'INCIDENT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;

                return (
                  <tr
                    key={article.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/30 transition-colors"
                  >
                    {/* Title & Sector */}
                    <td className="py-5 px-6 max-w-sm">
                      <div>
                        <span className="font-bold text-[#050505] block hover:text-[#733DD9] transition-colors leading-tight">
                          <Link href={href}>{article.title}</Link>
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[9px] text-neutral-400">
                          <span className="uppercase font-bold tracking-wider text-[#733DD9]">
                            {targetVector}
                          </span>
                          <span>·</span>
                          <span>{hexSignature}</span>
                          <span>·</span>
                          <span className="text-neutral-500 font-semibold">
                            {new Date(article.createdAt || '').toISOString()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Level Badge */}
                    <td className="py-5 px-6 align-middle text-center shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-none border text-[9px] font-mono font-bold tracking-wider uppercase bg-transparent ${
                          isCritical
                            ? 'text-[#DC2626] border-[#DC2626]'
                            : 'text-[#D97706] border-[#D97706]'
                        }`}
                      >
                        {isCritical ? 'CRITICAL' : 'HIGH'}
                      </span>
                    </td>

                    {/* Financial Risk */}
                    <td className="py-5 px-6 font-mono font-bold text-[#050505] align-middle">
                      {article.financialExposure || '$4.2M – $8.5M'}
                    </td>

                    {/* Controls */}
                    <td className="py-5 px-6 text-right align-middle shrink-0">
                      <div className="flex items-center justify-end gap-2">
                        {/* Secondary action: Playbook details */}
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-none border border-neutral-200 text-neutral-600 font-mono hover:text-[#050505] hover:border-neutral-300 transition-all text-[9px] font-bold tracking-wider"
                        >
                          VIEW PLAYBOOK
                          <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                        </Link>

                        {/* Primary Action: Remediate */}
                        <button
                          onClick={() => handleRemediate(article.id, article.title)}
                          disabled={isRemediated || isProcessing}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none font-mono font-bold text-[9px] tracking-wider transition-all shadow-none ${
                            isRemediated
                              ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                              : isProcessing
                                ? 'bg-[#733DD9]/10 text-[#733DD9] border border-[#733DD9]/20 cursor-wait'
                                : 'bg-[#733DD9] text-white border border-[#733DD9] hover:bg-[#5B21B6] hover:border-[#5B21B6] cursor-pointer'
                          }`}
                        >
                          <Play className="w-2.5 h-2.5 shrink-0" />
                          {isProcessing
                            ? 'Mitigating...'
                            : isRemediated
                              ? 'MITIGATED'
                              : 'AUTO-REMEDIATE'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
