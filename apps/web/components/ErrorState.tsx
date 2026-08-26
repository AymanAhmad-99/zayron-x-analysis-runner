import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function ErrorState({ title, message, retry }: { title?: string, message: string, retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-[#FFFFFF] border border-[#D9DDE2] text-center min-h-[400px]">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-[#111111] mb-2">{title || "System Error"}</h2>
      <p className="text-sm text-[#56606B] max-w-md leading-relaxed mb-8">
        {message}
      </p>
      <div className="flex gap-4">
        {retry && (
          <button 
            onClick={retry}
            className="px-6 py-2 bg-[#111111] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider hover:bg-[#FF6A00] transition-colors"
          >
            Retry Request
          </button>
        )}
        <Link 
          href="/"
          className="px-6 py-2 bg-[#F7F7F5] text-[#111111] border border-[#D9DDE2] text-xs font-bold uppercase tracking-wider hover:border-[#111111] transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
