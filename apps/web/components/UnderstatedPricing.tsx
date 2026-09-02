import React from "react";
import Link from "next/link";

export function UnderstatedPricing() {
  const tiers = [
    { name: "Free", price: "$0", cadence: "/month", desc: "Essential intelligence for getting started.", features: ["Basic Threat Intelligence", "Limited Search", "Community Support"], cta: "Get Started Free", href: "/login" },
    { name: "Pro", price: "$20", cadence: "/month", desc: "Advanced intelligence for security teams.", features: ["Advanced Threat Intelligence", "Real-time Monitoring", "Advanced Search", "Priority Support"], cta: "Start Pro Trial", href: "/pricing", popular: true },
    { name: "Researcher", price: "$50", cadence: "/month", desc: "Complete intelligence for researchers.", features: ["Full Intelligence Access", "Historical Data", "API Access", "Dedicated Support"], cta: "Start Researcher Trial", href: "/pricing" },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.name} className={`p-6 rounded-xl border ${t.popular ? "border-[#FF6B00] bg-zinc-50 shadow-md" : "border-zinc-200 bg-white"}`}>
              <h3 className="font-bold text-lg text-zinc-900">{t.name}</h3>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{t.price} <span className="text-xs text-zinc-500">{t.cadence}</span></div>
              <p className="mt-2 text-xs text-zinc-600">{t.desc}</p>
              <ul className="mt-4 space-y-2 text-xs text-zinc-700">
                {t.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <Link href={t.href} className="mt-6 block text-center py-2 rounded bg-zinc-900 text-white text-xs font-bold hover:bg-black">
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
