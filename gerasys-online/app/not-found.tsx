import Link from "next/link";
import { ArrowLeft, Shield } from "@/lib/icons";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-black bg-grid relative">
      <div className="relative z-10 text-center px-4 max-w-lg">
        <Shield size={48} className="text-[#E50000] mx-auto mb-6 opacity-50" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#E50000] font-bold font-mono mb-4">
          INTELLIGENCE NOT FOUND
        </p>
        <h1 className="font-ui text-7xl font-black text-white mb-3 tracking-tight">
          404
        </h1>
        <p className="text-[#888888] text-lg font-ui leading-relaxed mb-8">
          The requested intelligence dossier does not exist or has been
          declassified.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="btn-primary"
          >
            <ArrowLeft size={14} />
            Return to Command Center
          </Link>
        </div>
        <p className="text-[11px] text-[#333333] mt-8 font-mono uppercase tracking-wider">
          If you believe this is an operational error, contact the intelligence
          desk.
        </p>
      </div>
    </div>
  );
}
