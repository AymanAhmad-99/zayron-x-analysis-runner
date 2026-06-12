'use client';

import { SeverityBadge } from '@/components/cve/SeverityBadge';
import { useSecurityGating } from '@/components/platform/SecurityGatingContext';
import { Activity, Download, Eye, Lock } from '@/lib/icons';
import type { CVE } from '@/lib/types';
import { formatDate } from '@/lib/utils/formatDate';
import { useEffect, useState } from 'react';

interface CveDetailCardProps {
  cve: CVE;
  isSubscriber: boolean;
}

// Sector weights from shared/models/fbr_calculator.py
const SECTOR_WEIGHTS: Record<string, number> = {
  Healthcare: 1.8,
  'Financial Services': 1.6,
  Energy: 1.5,
  Government: 1.5,
  Defense: 1.5,
  'Critical Infrastructure': 1.5,
  Technology: 1.2,
  Telecommunications: 1.3,
  Manufacturing: 1.2,
  Retail: 1.1,
  Education: 1.0,
  Other: 1.0,
};

function inferSector(product: string | null | undefined): string {
  if (!product) return 'Technology';
  const p = product.toLowerCase();

  const keywords: Record<string, string[]> = {
    Healthcare: ['medical', 'health', 'hospital', 'pharma', 'dicom', 'hl7', 'epic', 'cerner'],
    'Financial Services': ['banking', 'payment', 'swift', 'financial', 'atm', 'pos', 'trading'],
    Energy: ['scada', 'ics', 'plc', 'energy', 'power', 'grid', 'oil', 'gas', 'siemens'],
    Government: ['government', 'federal', 'dod', 'military', 'nsa', 'cisa'],
    Technology: [
      'cisco',
      'microsoft',
      'google',
      'apple',
      'oracle',
      'sap',
      'vmware',
      'fortinet',
      'palo alto',
      'juniper',
      'adobe',
      'linux',
      'apache',
      'nginx',
      'wordpress',
      'drupal',
      'jenkins',
    ],
    Telecommunications: ['telecom', '5g', 'lte', 'voip', 'sip', 'ericsson', 'nokia'],
    Manufacturing: ['manufacturing', 'industrial', 'automation', 'rockwell'],
  };

  for (const [sector, kws] of Object.entries(keywords)) {
    for (const kw of kws) {
      if (p.includes(kw)) return sector;
    }
  }
  return 'Technology';
}

function calculateFBR(cvssScore: number | null | undefined, product: string | null | undefined) {
  const score = cvssScore ?? 0.0;
  const sector = inferSector(product);
  const sectorWeight = SECTOR_WEIGHTS[sector] || 1.0;
  const geoFactor = 1.2; // US geo-multiplier used in cve_worker daemon
  const baseBreachCost = 165.0;

  const cvssFactor = (score / 10.0) ** 2;
  const fbrUsd = baseBreachCost * 10000 * cvssFactor * sectorWeight * geoFactor;
  const fbrJod = fbrUsd * 0.709; // Pegged rate: 1 USD = 0.709 JOD

  return {
    usd: fbrUsd,
    jod: fbrJod,
    sector,
  };
}

function formatCurrency(val: number, currency = 'USD') {
  if (currency === 'JOD') {
    return `JOD ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(val);
}

function isSectionGated(sectionHtml: string): 'brief' | 'defensive' | null {
  const lower = sectionHtml.toLowerCase();
  if (
    lower.includes('<h2>executive brief</h2>') ||
    lower.includes('<h2>executive threat brief</h2>')
  ) {
    return 'brief';
  }
  if (
    lower.includes('<h2>defensive engineering</h2>') ||
    lower.includes('<h2>detection engineering</h2>')
  ) {
    return 'defensive';
  }
  return null;
}

export function CveDetailCard({ cve, isSubscriber }: CveDetailCardProps) {
  const { gateAction } = useSecurityGating();
  const [epssData, setEpssData] = useState<{ epss: number; percentile: number } | null>(null);
  const [loadingEpss, setLoadingEpss] = useState(true);

  // Live EPSS Score Fetching
  useEffect(() => {
    if (!cve.cveId) return;
    setLoadingEpss(true);
    fetch(`https://api.first.org/data/v1/epss?cve=${cve.cveId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'OK' && json.data && json.data.length > 0) {
          setEpssData({
            epss: Number.parseFloat(json.data[0].epss),
            percentile: Number.parseFloat(json.data[0].percentile),
          });
        }
      })
      .catch((err) => console.error('Error fetching EPSS score:', err))
      .finally(() => setLoadingEpss(false));
  }, [cve.cveId]);

  // Copy rule button injector for defensive/detection rules
  useEffect(() => {
    const preBlocks = document.querySelectorAll('.prose-zayron pre');
    preBlocks.forEach((pre) => {
      if (pre.getAttribute('data-decorated')) return;
      pre.setAttribute('data-decorated', 'true');

      (pre as HTMLElement).style.position = 'relative';

      const button = document.createElement('button');
      button.textContent = 'COPY';
      button.className =
        'absolute top-2 right-2 px-2 py-1 text-[9px] font-bold text-white bg-[#733DD9] hover:bg-[#5f2ebd] transition-all rounded font-mono cursor-pointer active:scale-95 z-10';

      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const codeText = pre.querySelector('code')?.textContent || pre.textContent || '';
        gateAction(() => {
          navigator.clipboard.writeText(codeText);
          alert('[SUCCESS] Autogenerated detection rule copied to clipboard successfully.');
        });
      });

      pre.appendChild(button);
    });
  }, [cve.description, gateAction]);

  // Calculate dynamic impact (FBR)
  const fbr = calculateFBR(
    cve.cvssScore ? Number.parseFloat(cve.cvssScore.toString()) : 0,
    cve.affectedProduct,
  );

  // Split description HTML by <h2> tag for selective paywall gating
  const description = cve.description || '';
  const hasHtml = description.startsWith('<') || description.includes('</');
  const sections = hasHtml ? description.split(/(?=<h2>)/g) : [description];

  return (
    <article className="bg-white border border-[#E2E8F0] rounded-none overflow-hidden shadow-sm hover:scale-102 hover:shadow-lg hover:border-[#733DD9] transition-all duration-300">
      <div className="p-6 lg:p-8">
        {/* Header Area */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 border-b border-neutral-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#733DD9] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#733DD9]" />
              </span>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#733DD9] uppercase">
                VULNERABILITY INTEL ANALYSIS
              </span>
            </div>
            <h1 className="font-mono text-2xl lg:text-3xl font-black text-neutral-900 uppercase tracking-tight">
              {cve.cveId}
            </h1>
            {cve.title && (
              <p className="text-neutral-500 mt-1 font-mono text-xs uppercase">{cve.title}</p>
            )}
          </div>
          <SeverityBadge severity={cve.severity} />
        </div>

        {/* Dynamic Metric Grid (Bloomberg Style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 p-6 bg-neutral-50 border border-neutral-200">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
              CVSS Base Score
            </span>
            <p className="font-mono text-2xl font-black text-neutral-900 mt-1">
              {cve.cvssScore ?? '—'}
            </p>
          </div>

          {/* Exploitability (Live EPSS Visualization) */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
              Exploitability (EPSS)
            </span>
            {loadingEpss ? (
              <div className="h-6 w-24 bg-neutral-200 animate-pulse rounded mt-2" />
            ) : epssData ? (
              <div className="mt-1 space-y-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-xl font-bold text-neutral-900">
                    {(epssData.epss * 100).toFixed(3)}%
                  </span>
                  <span className="text-[8px] text-neutral-400 font-mono">
                    (p={Math.round(epssData.percentile * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-none overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-500 ${
                      epssData.epss > 0.1
                        ? 'bg-red-600'
                        : epssData.epss > 0.02
                          ? 'bg-orange-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, epssData.percentile * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="font-mono text-sm font-semibold text-neutral-400 mt-2">Unavailable</p>
            )}
          </div>

          {/* Impact (Dynamic Financial Exposure Linked to fbr_calculator) */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
              Financial Impact (FBR)
            </span>
            <div className="font-mono text-[11px] font-black text-neutral-900 mt-1.5 space-y-0.5">
              <div className="text-neutral-900">{formatCurrency(fbr.usd, 'USD')}</div>
              <div className="text-[#733DD9]">{formatCurrency(fbr.jod, 'JOD')}</div>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
              Current Status
            </span>
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-mono font-bold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {cve.status ?? 'ACTIVE'}
            </span>
          </div>

          {cve.vendor && (
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
                Vendor
              </span>
              <p className="font-mono text-xs font-bold text-neutral-800 mt-1 uppercase">
                {cve.vendor}
              </p>
            </div>
          )}

          {cve.affectedProduct && (
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
                Affected Product
              </span>
              <p className="font-mono text-xs font-bold text-neutral-800 mt-1 uppercase">
                {cve.affectedProduct}
              </p>
            </div>
          )}

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
              Inferred Sector
            </span>
            <p className="font-mono text-xs font-bold text-[#733DD9] mt-1 uppercase">
              {fbr.sector}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#475569] font-ui block">
              Published Date
            </span>
            <p className="font-mono text-xs font-bold text-neutral-800 mt-1">
              {cve.publishedDate ? formatDate(cve.publishedDate) : '—'}
            </p>
          </div>
        </div>

        {/* CVE Description & Intel Dossier (Prose) */}
        {description && (
          <div className="space-y-6">
            {sections.map((section, index) => {
              const gatedType = !isSubscriber ? isSectionGated(section) : null;

              if (gatedType) {
                return (
                  <div
                    key={index}
                    className="relative group/gated my-8 border border-dashed border-neutral-300 p-6 bg-neutral-50/10"
                  >
                    {/* Blurred content wrapper */}
                    <div
                      className="blur-[5px] select-none pointer-events-none opacity-20 prose-zayron max-w-none text-sm text-[#334155] leading-relaxed font-sans space-y-4"
                      dangerouslySetInnerHTML={{ __html: section }}
                    />

                    {/* Premium Glassmorphic Paywall overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-[3px] z-10">
                      <div className="bg-white border border-neutral-200 p-6 text-center max-w-md shadow-lg flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-[#733DD9]">
                          <Lock className="w-5 h-5 animate-pulse" />
                        </div>
                        <h4 className="font-mono text-xs font-black uppercase text-neutral-900 tracking-wider">
                          {gatedType === 'brief'
                            ? 'Restricted Executive Briefing'
                            : 'Restricted Defensive Signature'}
                        </h4>
                        <p className="text-[10px] text-neutral-500 font-mono leading-normal">
                          {gatedType === 'brief'
                            ? 'Complete cyber risk summaries, impact projections, and operational advisories require premium clearance.'
                            : 'Autogenerated YARA rules, Sigma telemetry detection queries, and Cloudflare WAF block configurations require premium clearance.'}
                        </p>
                        <a
                          href="/pricing"
                          className="mt-2 px-5 py-2.5 bg-[#733DD9] hover:bg-[#5f2ebd] active:scale-95 transition-all text-white font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                          Unlock Full Analysis ──▶ Upgrade to Premium (25$)
                        </a>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  className="prose-zayron max-w-none text-sm text-[#334155] leading-relaxed font-sans space-y-4"
                >
                  {hasHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: section }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{section}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {cve.cvssVector && (
          <div className="mt-8 pt-6 border-t border-neutral-100">
            <h2 className="font-mono text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-3">
              CVSS Vector String
            </h2>
            <code className="text-[10px] bg-black text-neutral-300 px-3 py-2.5 block overflow-x-auto font-mono border border-slate-800">
              {cve.cvssVector}
            </code>
          </div>
        )}
      </div>
    </article>
  );
}
