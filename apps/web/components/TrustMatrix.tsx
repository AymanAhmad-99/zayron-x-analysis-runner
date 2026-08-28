export function TrustMatrix() {
  const points = [
    { title: "Evidence-driven methodology", desc: "Every assessment is corroborated with cryptographic hashes and primary telemetry." },
    { title: "Cloud-native infrastructure", desc: "Zero-server footprint running deterministically across global Cloudflare edge zones." },
    { title: "Structured intelligence framework", desc: "Direct semantic taxonomy linking Tier-0 MITRE, NIST, and CVE knowledge bases." },
    { title: "Auditable intelligence provenance", desc: "Complete transparent audit trails from raw MTProto ingestion to published report." },
    { title: "Canonical source chain", desc: "Strict verification gates discarding synthetic, unverified, or duplicate rumors." },
    { title: "No unverifiable, true claims", desc: "Explicit separation between confirmed facts, analytical inferences, and unknown variables." }
  ];

  return (
    <section className="w-full py-20 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-2">
        CHAPTER 10 — TRUST
      </div>
      <h2 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-[#111214] mb-8">
        Restrained Institutional Trust
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {points.map((p, idx) => (
          <div key={idx} className="border-l-2 border-[#111214] pl-4 py-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#111214] mb-1">
              {p.title}
            </h4>
            <p className="text-xs text-[#5A5D65] leading-relaxed">
              {p.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
