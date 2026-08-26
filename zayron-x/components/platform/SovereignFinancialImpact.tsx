'use client';

import { ShieldAlert, ShieldCheck, Zap } from '@/lib/icons';
import { useEffect, useState } from 'react';

const ASSET_PROFILES = [
  {
    id: 'smb',
    label: 'Corporate Workspace & Domain Core (SMB)',
    baseValue: 150000,
    description: 'Office 365, internal messaging, single corporate domain, local workstations.',
  },
  {
    id: 'fintech',
    label: 'High-Growth FinTech Gateway (API Nodes)',
    baseValue: 4800000,
    description: 'Customer ledger DB, payment API endpoints, high-availability clusters.',
  },
  {
    id: 'enterprise',
    label: 'Enterprise Hybrid Cloud Core (Multi-Region)',
    baseValue: 42000000,
    description: 'AWS/Azure Kubernetes clusters, LDAP, data warehousing, active AD forest.',
  },
  {
    id: 'critical',
    label: 'Sovereign Strategic Operations (SCADA / DNS)',
    baseValue: 350000000,
    description: 'Power grid command nodes, Tier-1 root server arrays, national SCADA systems.',
  },
] as const;

const THREAT_VECTORS = [
  {
    id: 'phishing',
    label: 'Phishing & Stealer Injection',
    multiplier: 0.15,
    description: 'Credential stealing via spear-phishing or loader-infected attachments.',
  },
  {
    id: 'cve',
    label: 'Zero-Day Remote Code Execution (RCE)',
    multiplier: 1.4,
    description: 'Unauthenticated perimeter entry bypass targeting web interfaces.',
  },
  {
    id: 'ransomware',
    label: 'Double-Extortion Ransomware Payload',
    multiplier: 2.5,
    description: 'Volume shadow copy wipe, local drive encryption, database exfiltration.',
  },
  {
    id: 'apt',
    label: 'Nation-State Advanced Persistent Threat (APT)',
    multiplier: 3.8,
    description: 'Active system persistence, persistent C2 channels, stealth data leakage.',
  },
] as const;

export function SovereignFinancialImpact() {
  const [selectedAsset, setSelectedAsset] = useState<string>('smb');
  const [selectedThreat, setSelectedThreat] = useState<string>('phishing');
  const [impactScore, setImpactScore] = useState<number>(22500);
  const [displayScore, setDisplayScore] = useState<number>(22500);

  // Calculate whenever parameters change
  useEffect(() => {
    const asset = ASSET_PROFILES.find((a) => a.id === selectedAsset);
    const threat = THREAT_VECTORS.find((t) => t.id === selectedThreat);
    if (asset && threat) {
      const calculated = Math.round(asset.baseValue * threat.multiplier);
      setImpactScore(calculated);
    }
  }, [selectedAsset, selectedThreat]);

  // Tick up display score smoothly for premium micro-animation feel
  useEffect(() => {
    if (displayScore === impactScore) return;

    const duration = 800; // ms
    const startTime = performance.now();
    const startVal = displayScore;
    const targetVal = impactScore;

    let animFrame: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing out quad
      const easedProgress = progress * (2 - progress);
      const current = Math.round(startVal + (targetVal - startVal) * easedProgress);
      setDisplayScore(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [impactScore]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300 my-8 font-sans">
      {/* Title Ribbon */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-dashed border-neutral-200">
        <Zap className="w-5 h-5 text-[#733DD9]" fill="#733DD9" />
        <span className="text-[11px] font-mono tracking-[0.2em] font-black uppercase text-[#733DD9]">
          Sovereign Financial Impact Engine
        </span>
      </div>

      <p className="text-xs text-[#050505] leading-relaxed mb-6">
        Simulate corporate exposure by aligning threat telemetry against sovereign asset profiles.
        Dynamic vector calculation maps baseline breach damage thresholds in real-time.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Left Column — Assets */}
        <div className="space-y-4">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#050505]">
            1. Target Asset Profile
          </label>
          <div className="space-y-2">
            {ASSET_PROFILES.map((profile) => (
              <button
                key={profile.id}
                onClick={() => setSelectedAsset(profile.id)}
                className={`w-full text-left p-3.5 border rounded transition-all flex flex-col justify-between ${
                  selectedAsset === profile.id
                    ? 'border-[#733DD9] bg-[#733DD9]/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-bold text-[#050505]">{profile.label}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    Base: {formatCurrency(profile.baseValue)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {profile.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column — Threat Vectors */}
        <div className="space-y-4">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#050505]">
            2. Active Threat Vector
          </label>
          <div className="space-y-2">
            {THREAT_VECTORS.map((vector) => (
              <button
                key={vector.id}
                onClick={() => setSelectedThreat(vector.id)}
                className={`w-full text-left p-3.5 border rounded transition-all flex flex-col justify-between ${
                  selectedThreat === vector.id
                    ? 'border-[#733DD9] bg-[#733DD9]/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-bold text-[#050505]">{vector.label}</span>
                  <span className="text-[10px] font-mono text-[#733DD9] font-extrabold uppercase">
                    x{vector.multiplier}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {vector.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Display Ribbon */}
      <div className="bg-neutral-50 text-[#050505] p-6 rounded border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white bg-[#733DD9] px-2 py-0.5 rounded font-black">
            Exposure Assessment
          </span>
          <p className="text-xs text-neutral-500 mt-2 font-medium">
            Projected Breach & Regulatory Fine Value:
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#050505] font-mono leading-none">
            {formatCurrency(displayScore)}
          </span>
          <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-[#733DD9]" />
            <span>SOVEREIGN RISK ASSESSMENT: APPLICABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
