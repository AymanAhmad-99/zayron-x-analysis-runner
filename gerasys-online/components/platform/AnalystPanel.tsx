import type { Analyst } from "@/lib/db/schema";
import { Globe } from "@/lib/icons";

interface AnalystPanelProps {
  analysts: Analyst[];
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

export function AnalystPanel({ analysts }: AnalystPanelProps) {
  if (analysts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-5">
          <Globe className="w-6 h-6 text-[#733DD9]" />
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
          Analyst dossiers compiling
        </h3>
        <p className="text-[0.85rem] text-[#94A3B8] max-w-md leading-relaxed">
          Global threat intelligence analyst profiles will appear here after verification by the intelligence directorate.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-[1.1rem] font-semibold text-[#0F172A]">Global Analyst Corps</h2>
        <p className="text-[0.78rem] text-[#94A3B8] mt-0.5">
          {analysts.length} verified intelligence professionals across {new Set(analysts.map(a => a.nationality).filter(Boolean)).size} nations
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {analysts.map((analyst) => (
          <div
            key={analyst.id}
            className="bg-white rounded-xl border border-slate-100 p-6 hover:border-slate-200 hover:shadow-sm transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-500 flex items-center justify-center shrink-0">
                <span className="text-[0.7rem] font-mono font-bold tracking-wide text-neutral-600">{getInitials(analyst.name)}</span>
              </div>

              {/* Info */}
              <div className="min-w-0">
                <h3 className="text-[0.9rem] font-semibold text-[#0F172A] leading-tight">
                  {analyst.name}
                </h3>
                {analyst.nationality && (
                  <p className="text-[0.68rem] font-medium text-[#733DD9] tracking-wide mt-0.5">
                    {analyst.nationality}
                  </p>
                )}
                <p className="text-[0.75rem] text-[#64748B] mt-1 leading-snug">
                  {analyst.title}
                </p>
                {(analyst.articleCount ?? 0) > 0 && (
                  <p className="text-[0.62rem] text-[#94A3B8] font-mono tracking-wide mt-0.5">
                    {(analyst.articleCount ?? 0).toLocaleString()} report{(analyst.articleCount ?? 0) !== 1 ? "s" : ""} authored
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            <p className="text-[0.75rem] text-[#94A3B8] leading-relaxed mt-4 line-clamp-3">
              {analyst.bio}
            </p>

            {/* Specializations */}
            {analyst.specializations && analyst.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
                {analyst.specializations.map((spec) => (
                  <span
                    key={spec}
                    className="text-[0.6rem] font-mono font-medium uppercase tracking-wider text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
