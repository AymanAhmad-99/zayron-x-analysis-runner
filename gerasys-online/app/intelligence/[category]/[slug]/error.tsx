"use client";
import { useEffect } from "react";
import { Shield, RefreshCw, ArrowLeft } from "@/lib/icons";
import Link from "next/link";

export default function ArticleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("ZAYRON-X Article Error:", error); }, [error]);
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Shield size={40} className="text-[#DC2626] mx-auto mb-5 opacity-60" />
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#DC2626] font-bold font-mono mb-3">
          Intelligence Stream Interrupted
        </p>
        <h1 className="font-display text-4xl font-bold text-[#09090B] mb-3">SIGINT Loss</h1>
        <p className="text-[#71717A] text-sm font-ui leading-relaxed mb-6">
          This intelligence report could not be retrieved. The signal may have been temporarily disrupted.
        </p>
        {error.message && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 mb-6 text-left">
            <p className="text-[11px] text-[#DC2626] font-mono break-all">{error.message}</p>
            {error.digest && <p className="text-[10px] text-[#A1A1AA] font-mono mt-1">REF: {error.digest}</p>}
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            <RefreshCw size={13} /> Re-establish Uplink
          </button>
          <Link href="/" className="btn-outline">
            <ArrowLeft size={13} /> Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
