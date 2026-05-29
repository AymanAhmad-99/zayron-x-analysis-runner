import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About ZAYRON-X",
  description: "About ZAYRON-X — elite nation-state grade cyber threat intelligence platform.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="section-subheading">About</h1>
      <h2 className="font-display text-3xl font-bold text-[var(--color-obsidian)] mt-1 mb-8">
        About ZAYRON-X
      </h2>

      <div className="prose-zayron">
        <p>
          ZAYRON-X is an elite nation-state grade cyber threat intelligence platform dedicated to providing
          actionable intelligence on global cybersecurity threats. Our team monitors the
          threat landscape 24/7, analyzing everything from nation-state APT operations to
          emerging ransomware campaigns and critical vulnerabilities.
        </p>
        <p>
          We aggregate and analyze data from open-source intelligence (OSINT) feeds, technical
          reports, and our own research to deliver timely, accurate, and relevant threat
          intelligence to security professionals worldwide.
        </p>
        <h3>Our Mission</h3>
        <p>
          To democratize access to high-quality threat intelligence and help organizations
          of all sizes defend against cyber threats effectively.
        </p>
        <h3>Data Sources</h3>
        <p>
          Our intelligence is gathered from a wide range of open sources including security
          vendor reports, government advisories, academic research, and technical analysis
          from the global cybersecurity community.
        </p>
      </div>
    </div>
  );
}
