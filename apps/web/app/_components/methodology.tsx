import React from "react";

export function Methodology() {
  const steps = [
    {
      title: "1. SEE THE THREAT",
      body: "Identify indicators of compromise with real-time telemetry and structured threat visibility.",
      icon: (
        <svg
          className="w-5 h-5 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FF5500"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      title: "2. UNDERSTAND THE EVIDENCE",
      body: "Correlate vulnerabilities and malware campaigns to fully grasp the adversary's objective.",
      icon: (
        <svg
          className="w-5 h-5 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FF5500"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.29 7 12 12 20.71 7" />
          <line x1="12" y1="22" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      title: "3. ACT WITH CONFIDENCE",
      body: "Execute informed defensive strategies backed by verified, context-rich intelligence.",
      icon: (
        <svg
          className="w-5 h-5 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FF5500"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full bg-[#F6F4EE] border-t border-black/[0.08] py-20">
      <div className="max-w-[1380px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Left Column */}
        <div className="lg:col-span-4 xl:col-span-4">
          <h2
            className="uppercase text-[32px] lg:text-[34px] font-[800] leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            INTELLIGENCE WITHOUT THE NOISE.
          </h2>
          <p
            className="mt-5 text-[14px] leading-[1.65] text-[#52525B]"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            ZAYRON-X transforms complex cyber threat information into structured, understandable intelligence - helping security teams shift from signal to evidence-driven action.
          </p>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 xl:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.title} className="flex flex-col">
                {step.icon}
                <h3 className="uppercase text-[11.5px] font-bold tracking-wide text-[#0A0A0A] mb-2.5">
                  {step.title}
                </h3>
                <p
                  className="text-[13px] leading-relaxed text-[#52525B]"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
