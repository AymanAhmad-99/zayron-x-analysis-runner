import Link from "next/link";
import { ThreatAssessmentCard } from "./ThreatAssessmentCard";

interface HeroProps {
  headline?: string;
  subheadline?: string;
  summary?: string;
  feature?: React.ReactNode;
}

export function Hero({
  headline = "UNDERSTAND WHAT CHANGED.",
  subheadline = "KNOW WHY IT MATTERS.",
  summary = "A concise inter sans product statement. Evidence-driven cyber intelligence analyzing vulnerabilities, adversaries, malware, and infrastructure with cryptographic certainty."
}: HeroProps) {
  return (
    <section className="w-full border-b border-[#E1DFD7] bg-[#F5F4F0] pt-12 pb-16 md:pt-16 md:pb-24">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Chapter Indicator */}
        <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-6">
          CHAPTER 01 — IDENTITY
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Editorial Display Typography & CTAs */}
          <div className="lg:col-span-6 space-y-6">
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[54px] font-semibold text-[#111214] leading-[1.05] tracking-tight uppercase">
              {headline}
              <br />
              <span className="text-[#111214]">{subheadline}</span>
            </h1>

            <p className="text-sm md:text-base text-[#5A5D65] leading-relaxed max-w-lg">
              {summary}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/threats"
                className="text-xs font-bold uppercase tracking-[0.06em] bg-[#111214] text-[#FFFFFF] px-6 py-3 rounded-[4px] hover:bg-[#28292E] transition-colors shadow-none"
              >
                Explore Intelligence
              </Link>
              <Link
                href="/knowledge"
                className="text-xs font-bold uppercase tracking-[0.06em] bg-[#FFFFFF] text-[#111214] border border-[#E1DFD7] px-6 py-3 rounded-[4px] hover:border-[#111214] hover:bg-[#F5F4F0] transition-colors"
              >
                View Platform
              </Link>
            </div>
          </div>

          {/* Right Column: Floating Threat Assessment Card over Grayscale Context */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              {/* Contextual architectural backdrop styling */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#E1DFD7]/40 to-transparent rounded-[8px] -z-10" />
              <ThreatAssessmentCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
