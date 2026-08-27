import Link from "next/link";

interface ThreatAssessmentCardProps {
  headline?: string;
  assessment?: string;
  evidence?: string[];
  actor?: string;
  asset?: string;
  timestamp?: string;
  severity?: string;
  confidence?: string;
}

export function ThreatAssessmentCard({
  headline = "CVE-2027-1492 Exploitation of Institutional Infrastructure",
  assessment = "Active reconnaissance targeting government repositories and cloud telemetry pipelines.",
  evidence = ["Signal Vectorize Ingestion", "RAG Correlation", "Infrastructures"],
  actor = "APT41",
  asset = "Gov-EMEA-Data",
  timestamp = "21:58 | 2027-10-14",
  severity = "HIGH",
  confidence = "94% (Verified)"
}: ThreatAssessmentCardProps) {
  return (
    <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] shadow-[0_12px_32px_-4px_rgba(17,18,20,0.08),0_4px_12px_-2px_rgba(17,18,20,0.04)] p-5 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E1DFD7] pb-3 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8C8F98]">
          Threat Assessment
        </span>
        <button type="button" className="text-[#8C8F98] hover:text-[#111214] text-xs font-mono transition-colors" aria-label="Dismiss flyout">
          &times;
        </button>
      </div>

      {/* Severity & Confidence Metric Row */}
      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#E1DFD7] mb-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98]">
            Severity <span className="text-[#D9531E] font-normal">[Semantic Orange]</span>
          </div>
          <div className="text-base font-bold tracking-tight text-[#D9531E] mt-0.5">
            {severity}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98]">
            Confidence
          </div>
          <div className="text-base font-bold tracking-tight text-[#1D8A5E] mt-0.5">
            {confidence}
          </div>
        </div>
      </div>

      {/* Structured Content Key-Value Matrix */}
      <div className="space-y-3 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8F98] block mb-0.5">Headline</span>
          <h4 className="font-bold text-sm text-[#111214] leading-snug">
            {headline}
          </h4>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8F98] block mb-0.5">Assessment</span>
          <p className="text-[#5A5D65] leading-relaxed text-[12px]">
            {assessment}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8F98] block mb-1">Evidence</span>
          <div className="flex flex-wrap gap-1.5">
            {evidence.map((item, idx) => (
              <span key={idx} className="bg-[#F5F4F0] border border-[#E1DFD7] px-2 py-0.5 text-[10px] font-mono text-[#5A5D65] rounded-[3px]">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8F98] block mb-0.5">Entities</span>
            <span className="inline-block bg-[#111214] text-[#FFFFFF] text-[10px] font-bold px-2 py-0.5 rounded-[3px]">
              Actor: {actor}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8F98] block mb-0.5">Asset</span>
            <span className="text-[11px] font-mono text-[#111214] font-semibold">
              {asset}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Timestamp Row */}
      <div className="mt-4 pt-3 border-t border-[#E1DFD7] flex items-center justify-between text-[11px] text-[#8C8F98] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9531E] animate-pulse"></span>
          <span>Last Updated</span>
        </div>
        <span className="text-[#111214] font-medium">{timestamp}</span>
      </div>
    </div>
  );
}
