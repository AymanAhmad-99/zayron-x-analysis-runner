"use client";

import { useEffect } from "react";
import { Shield, RefreshCw, ArrowLeft } from "@/lib/icons";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SiteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("ZAYRON-X — Site Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-black bg-grid relative px-4">
      <div className="relative z-10 text-center max-w-lg">
        {/* Classified error stamp */}
        <div className="mb-6">
          <Shield size={48} className="text-[#E50000] mx-auto mb-4 opacity-70" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E50000] font-bold font-mono mb-3">
            INTELLIGENCE STREAM INTERRUPTED
          </p>
          <h1 className="font-ui text-5xl font-black text-white mb-3 uppercase tracking-tight">
            SIGINT Loss
          </h1>
          <p className="text-[#888888] text-sm font-ui leading-relaxed max-w-md mx-auto">
            A signal interruption has occurred in the intelligence pipeline.
            This may be a temporary infrastructure disruption.
          </p>
        </div>

        {/* Error details — tactical style */}
        <div className="bg-[#0A0A0A] border border-[#E50000]/20 p-5 mb-8 max-w-md mx-auto text-left">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#E50000] font-bold font-mono mb-2">
            Error Classification
          </p>
          <p className="text-xs text-[#CCCCCC] font-mono leading-relaxed break-all">
            {error.message || "UNKNOWN SIGNAL DEGRADATION"}
          </p>
          {error.digest && (
            <p className="text-[10px] text-[#555555] font-mono mt-2">
              REF: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="btn-primary"
          >
            <RefreshCw size={14} />
            Re-establish Uplink
          </button>
          <Link
            href="/"
            className="btn-outline"
          >
            <ArrowLeft size={14} />
            Command Center
          </Link>
        </div>

        <p className="text-[10px] text-[#333333] font-mono mt-8 uppercase tracking-wider">
          If the interruption persists, contact the intelligence desk.
        </p>
      </div>
    </div>
  );
}
