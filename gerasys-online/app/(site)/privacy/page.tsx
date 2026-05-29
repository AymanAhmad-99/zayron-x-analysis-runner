import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ZAYRON-X privacy policy.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="section-subheading">Legal</h1>
      <h2 className="font-display text-3xl font-bold text-[var(--color-obsidian)] mt-1 mb-8">
        Privacy Policy
      </h2>
      <div className="prose-zayron">
        <p>
          ZAYRON-X is committed to protecting your privacy. This policy outlines how
          we collect, use, and safeguard your information.
        </p>
        <h3>Information We Collect</h3>
        <p>
          We collect minimal information: email addresses for newsletter subscribers and
          anonymized analytics data through Umami (self-hosted, privacy-first analytics).
        </p>
        <h3>Data Usage</h3>
        <p>
          Your email is used exclusively for sending newsletter updates. We never share,
          sell, or distribute your personal information to third parties.
        </p>
        <h3>Cookies</h3>
        <p>
          We use minimal cookies required for essential functionality. No tracking cookies
          are used from third-party services.
        </p>
      </div>
    </div>
  );
}
