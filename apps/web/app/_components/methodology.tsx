import React from "react";

const EyeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const HexIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" y1="22" x2="12" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const steps = [
  {
    icon: <EyeIcon />,
    title: "1. SEE THE THREAT",
    body: "Identify indicators of compromise with real-time telemetry and structured threat visibility.",
  },
  {
    icon: <HexIcon />,
    title: "2. UNDERSTAND THE EVIDENCE",
    body: "Correlate vulnerabilities and malware campaigns to fully grasp the adversary's objective.",
  },
  {
    icon: <CheckIcon />,
    title: "3. ACT WITH CONFIDENCE",
    body: "Execute informed defensive strategies backed by verified, context-rich intelligence.",
  },
];

export function Methodology() {
  return (
    <section className="w-full bg-[#F6F4EE] border-t border-black/[0.08] py-20">
      <div className="max-w-[1380px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

        {/* Left — Heading + Description */}
        <div className="lg:col-span-4">
          <h2
            className="uppercase text-[32px] lg:text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            INTELLIGENCE WITHOUT THE NOISE.
          </h2>
          <p
            className="mt-5 text-[13.5px] leading-[1.7] text-[#52525B]"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            ZAYRON-X transforms complex cyber threat information into structured, understandable intelligence — helping security teams shift from signal to evidence-driven action.
          </p>
        </div>

        {/* Right — 3 Step Cards */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.title} className="flex flex-col">
                {/* Icon */}
                <div className="mb-4">{step.icon}</div>
                <h3
                  className="uppercase text-[11px] font-bold tracking-[0.1em] text-[#0A0A0A] mb-3 leading-snug"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[13px] leading-[1.65] text-[#52525B]"
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
