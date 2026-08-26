'use client';

import { SovereignGateModal } from '@/components/platform/SovereignGateModal';
import { Check, Copy, Download, Lock, Play } from '@/lib/icons';
import { useState } from 'react';

interface ThreatDetailClientProps {
  threatId: string;
  threatTitle: string;
  isSubscriber: boolean;
  yaraRules: string | null;
  sigmaRules: string | null;
  rawIocs: string | null;
  unmaskedEntities: string | null;
}

export function ThreatDetailClient({
  threatId,
  threatTitle,
  isSubscriber,
  yaraRules,
  sigmaRules,
  rawIocs,
  unmaskedEntities,
}: ThreatDetailClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemediating, setIsRemediating] = useState(false);
  const [remediated, setRemediated] = useState(false);
  const [copiedYara, setCopiedYara] = useState(false);
  const [copiedSigma, setCopiedSigma] = useState(false);

  const handleRemediate = async () => {
    if (!isSubscriber) {
      setIsModalOpen(true);
      return;
    }

    setIsRemediating(true);
    try {
      const csrfToken =
        typeof document !== 'undefined'
          ? document.cookie.match(/(?:^|; )csrf-token=([^;]*)/)?.[1]
          : null;

      const res = await fetch('/api/remediate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ threatId, threatTitle }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRemediated(true);
        alert(
          `[AUTONOMOUS REMEDIATION SUCCESS]\n\nSuccessfully deployed patch mitigation rules across ${data.telemetry.nodesPatched} nodes.\nMitigated impact: $${data.telemetry.blastRadiusMitigatedUSD.toLocaleString()} USD.`,
        );
      } else {
        alert(`Error: ${data.error || 'Failed to trigger remediation.'}`);
      }
    } catch {
      alert('Network communication error.');
    } finally {
      setIsRemediating(false);
    }
  };

  const handleDownloadSitrep = () => {
    if (!isSubscriber) {
      setIsModalOpen(true);
      return;
    }
    window.open(`/api/download-sitrep?threatId=${threatId}`, '_blank');
  };

  const copyToClipboard = (text: string, type: 'yara' | 'sigma') => {
    navigator.clipboard.writeText(text);
    if (type === 'yara') {
      setCopiedYara(true);
      setTimeout(() => setCopiedYara(false), 2000);
    } else {
      setCopiedSigma(true);
      setTimeout(() => setCopiedSigma(false), 2000);
    }
  };

  return (
    <div className="space-y-12 relative">
      {/* Premium Content Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* YARA Section */}
        <div className="border border-neutral-200 p-6 bg-white relative">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
            <span className="text-[10px] font-mono tracking-widest text-[#733DD9] font-bold uppercase">
              [ YARA SIGNATURE PATTERN ]
            </span>
            {isSubscriber && yaraRules && (
              <button
                onClick={() => copyToClipboard(yaraRules, 'yara')}
                className="text-[10px] font-mono uppercase text-neutral-500 hover:text-[#733DD9] cursor-pointer flex items-center gap-1"
              >
                {copiedYara ? <Check size={12} /> : <Copy size={12} />}
                {copiedYara ? 'Copied' : 'Copy Code'}
              </button>
            )}
          </div>

          {isSubscriber && yaraRules ? (
            <pre className="bg-[#050505] text-[#FAFAFA] p-4 text-[11px] font-mono overflow-x-auto select-all max-h-[250px] rounded-none">
              <code>{yaraRules}</code>
            </pre>
          ) : (
            <div className="relative select-none">
              <pre className="bg-[#FAFAFA] text-neutral-300 p-4 text-[11px] font-mono overflow-x-auto filter blur-[2.5px] rounded-none">
                <code>
                  {`rule LockBit_4_0_Black_Ransom {\n  meta:\n    description = "[ RESTRICTED_INTEL ]"\n    author = "ZAYRON-X"\n  strings:\n    $rest_1 = "rest"\n  condition:\n    any of them\n}`}
                </code>
              </pre>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20">
                <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 bg-white/90 border border-neutral-200 px-3 py-1.5 shadow-sm">
                  [ INTEL BLOCKED ]
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sigma Section */}
        <div className="border border-neutral-200 p-6 bg-white relative">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
            <span className="text-[10px] font-mono tracking-widest text-[#733DD9] font-bold uppercase">
              [ SIGMA DETECTION BLUEPRINT ]
            </span>
            {isSubscriber && sigmaRules && (
              <button
                onClick={() => copyToClipboard(sigmaRules, 'sigma')}
                className="text-[10px] font-mono uppercase text-neutral-500 hover:text-[#733DD9] cursor-pointer flex items-center gap-1"
              >
                {copiedSigma ? <Check size={12} /> : <Copy size={12} />}
                {copiedSigma ? 'Copied' : 'Copy Code'}
              </button>
            )}
          </div>

          {isSubscriber && sigmaRules ? (
            <pre className="bg-[#050505] text-[#FAFAFA] p-4 text-[11px] font-mono overflow-x-auto select-all max-h-[250px] rounded-none">
              <code>{sigmaRules}</code>
            </pre>
          ) : (
            <div className="relative select-none">
              <pre className="bg-[#FAFAFA] text-neutral-300 p-4 text-[11px] font-mono overflow-x-auto filter blur-[2.5px] rounded-none">
                <code>
                  {
                    'title: [ RESTRICTED_INTEL ]\nid: rest-id\nstatus: blocked\nlogsource:\n  product: windows\ndetection:\n  condition: selection'
                  }
                </code>
              </pre>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20">
                <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 bg-white/90 border border-neutral-200 px-3 py-1.5 shadow-sm">
                  [ INTEL BLOCKED ]
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Indicators & Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Indicators of Compromise */}
        <div className="border border-neutral-200 p-6 bg-white">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#050505] font-black border-b border-neutral-100 pb-3 mb-4">
            Indicators of Compromise (IoCs)
          </h4>
          {isSubscriber && rawIocs ? (
            <div className="text-xs font-mono text-neutral-700 leading-relaxed bg-[#FAFAFA] p-4 border border-neutral-100">
              {rawIocs.split('\n').map((line, idx) => (
                <div key={idx} className="py-0.5">
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center bg-[#FAFAFA] border border-dashed border-neutral-200">
              <span className="text-[10px] font-mono uppercase text-neutral-400">
                [ IOC VECTORS QUARANTINED ]
              </span>
            </div>
          )}
        </div>

        {/* Target Entities */}
        <div className="border border-neutral-200 p-6 bg-white">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#050505] font-black border-b border-neutral-100 pb-3 mb-4">
            Unmasked Affected Entities
          </h4>
          {isSubscriber && unmaskedEntities ? (
            <div className="flex flex-wrap gap-2">
              {unmaskedEntities.split(',').map((ent, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono uppercase tracking-wider bg-white border border-[#733DD9]/20 text-[#733DD9] px-2.5 py-1"
                >
                  {ent.trim()}
                </span>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center bg-[#FAFAFA] border border-dashed border-neutral-200">
              <span className="text-[10px] font-mono uppercase text-neutral-400">
                [ VICTIM IDENTITIES REDACTED ]
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action / Gate Overlay (Frosted Glass Vault over redacted structures) */}
      {!isSubscriber && (
        <div className="absolute inset-0 z-30 flex items-center justify-center backdrop-blur-md bg-white/40 border border-neutral-300 p-8 text-center overflow-hidden">
          {/* Symmetrical wireframes */}
          <div className="absolute inset-0 opacity-[0.01] bg-[radial-gradient(#000_1px,transparent_1px)] bg-[size:16px_16px]" />

          <div className="max-w-xl mx-auto space-y-5 relative z-40 py-8 bg-white border border-neutral-200 shadow-xl p-8">
            <div className="w-12 h-12 border border-neutral-200 flex items-center justify-center mx-auto bg-[#FAFAFA] rounded-none">
              <Lock className="w-5 h-5 text-[#733DD9]" />
            </div>

            <h3 className="text-sm font-black tracking-widest text-[#050505] uppercase font-sans">
              REMEDIATION BLUEPRINT LOCKED
            </h3>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Payload redaction enforced. Cryptographic indicators and automated remediation
              blueprints require clearance tier synchronization.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#050505] text-white hover:shadow-[0_0_15px_rgba(115,61,217,0.4)] font-mono font-bold text-xs uppercase tracking-widest py-4 px-8 mt-2 cursor-pointer transition-all duration-300 rounded-none border-none"
            >
              AUTHENTICATE & SECURE ACCESS ($25/MO)
            </button>
          </div>
        </div>
      )}

      {/* Subscriber Active Actions */}
      {isSubscriber && (
        <div className="border border-neutral-200 p-8 bg-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#733DD9] font-bold">
              [ SECURE PLATFORM CONTROL ACTIVE ]
            </span>
            <h4 className="text-sm font-black text-[#050505] uppercase tracking-wide">
              AUTONOMOUS INCIDENT MITIGATION
            </h4>
            <p className="text-xs text-neutral-500 max-w-md">
              Deploy custom active patches and download full formal intelligence dossier below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadSitrep}
              className="bg-white text-[#050505] border border-neutral-200 hover:border-[#733DD9] hover:text-[#733DD9] font-mono font-bold text-xs uppercase tracking-wider py-3.5 px-6 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download size={13} />
              DOWNLOAD SITREP
            </button>

            <button
              onClick={handleRemediate}
              disabled={isRemediating || remediated}
              className="bg-[#050505] text-white hover:bg-[#733DD9] disabled:opacity-50 disabled:hover:bg-[#050505] font-mono font-bold text-xs uppercase tracking-wider py-3.5 px-6 flex items-center gap-2 cursor-pointer transition-colors"
            >
              {remediated ? <Check size={13} /> : <Play size={13} />}
              {isRemediating ? 'PROCESSING...' : remediated ? 'REMEDIATED' : 'AUTO-REMEDIATE'}
            </button>
          </div>
        </div>
      )}

      {/* Access Gate Modal */}
      <SovereignGateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
