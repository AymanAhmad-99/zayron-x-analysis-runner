import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact ZAYRON-X for inquiries, tips, or feedback.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="section-subheading">Contact</h1>
      <h2 className="font-display text-3xl font-bold text-[var(--color-obsidian)] mt-1 mb-8">
        Get in Touch
      </h2>
      <p className="text-[var(--color-stone)] mb-8 font-ui">
        Have a tip, feedback, or inquiry? Reach out to our team.
      </p>
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-bold text-[var(--color-obsidian)]">Security Research</h3>
            <p className="text-sm text-[var(--color-stone)] font-ui">
              Share vulnerability disclosures or threat intelligence tips.
            </p>
          </div>
          <div>
            <h3 className="font-display font-bold text-[var(--color-obsidian)]">Media Inquiries</h3>
            <p className="text-sm text-[var(--color-stone)] font-ui">
              For press and media related requests.
            </p>
          </div>
          <div>
            <h3 className="font-display font-bold text-[var(--color-obsidian)]">General</h3>
            <p className="text-sm text-[var(--color-stone)] font-ui">
              For all other inquiries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
