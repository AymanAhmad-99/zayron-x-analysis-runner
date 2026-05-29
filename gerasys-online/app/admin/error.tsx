"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "@/lib/icons";
import Link from "next/link";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("ZAYRON-X Admin Error:", error); }, [error]);
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <AlertTriangle size={36} className="text-[#D97706] mx-auto mb-5" />
        <h1 className="font-display text-2xl font-bold text-white mb-2">Admin Error</h1>
        <p className="text-sm text-[#64748B] font-ui mb-5">
          An unexpected error occurred in the admin panel.
        </p>
        {error.message && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-6 text-left">
            <p className="text-[12px] text-[#94A3B8] font-mono break-all">{error.message}</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-semibold rounded-lg transition-all font-ui">
            <RefreshCw size={13} /> Retry
          </button>
          <Link href="/admin" className="flex items-center gap-2 px-4 py-2 border border-white/[0.1] text-[#94A3B8] hover:text-white text-sm font-semibold rounded-lg transition-all font-ui">
            <ArrowLeft size={13} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
