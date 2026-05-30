import type { Metadata } from "next";
import { AnalystTeam } from "@/components/homepage/AnalystTeam";
import { getAnalysts } from "@/lib/db/queries/analysts";

export const metadata: Metadata = {
  title: "Threat Intelligence Analysts",
  description: "Meet the ZAYRON-X threat intelligence analyst team.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/analysts`,
  },
};

export const dynamic = "force-dynamic";

export default async function AnalystsPage() {
  let analystList: Awaited<ReturnType<typeof getAnalysts>> = [];
  try {
    analystList = await getAnalysts();
  } catch (err) {
    console.error("Failed to fetch analysts:", err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="section-subheading">Our Team</h1>
        <h2 className="font-display text-3xl font-bold text-[#111827] mt-1">
          Threat Intelligence Analysts
        </h2>
        <p className="text-sm text-[#4B5563] mt-2 font-ui max-w-2xl">
          Our team of experienced cybersecurity professionals monitors global threat landscapes,
          analyzes emerging vulnerabilities, and delivers actionable intelligence.
        </p>
      </div>

      {analystList.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-white border border-neutral-100 rounded-lg relative overflow-hidden shadow-sm">
            {/* Subtle network node architectural wireframe */}
            <svg className="w-full h-full text-neutral-200" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="0.75">
              <rect width="80" height="80" fill="#FFFFFF"/>
              <line x1="40" y1="15" x2="20" y2="50"/>
              <line x1="40" y1="15" x2="60" y2="50"/>
              <line x1="20" y1="50" x2="60" y2="50"/>
              <circle cx="40" cy="15" r="5" fill="#FFFFFF" stroke="#733DD9" strokeWidth="1.25"/>
              <circle cx="20" cy="50" r="5" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1"/>
              <circle cx="60" cy="50" r="5" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1"/>
              <circle cx="40" cy="45" r="18" strokeDasharray="2,2"/>
            </svg>
          </div>
          <h3 className="font-display text-xl font-bold text-[#111827] mb-2">
            Analyst Profiles Incoming
          </h3>
          <p className="text-sm text-[#4B5563] max-w-md mx-auto leading-relaxed">
            Our threat intelligence team profiles are being compiled. Analyst dossiers
            will appear here once the intelligence desk completes verification.
          </p>
        </div>
      ) : (
        <AnalystTeam analysts={analystList} />
      )}
    </div>
  );
}
