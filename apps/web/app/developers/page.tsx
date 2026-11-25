import type { Metadata } from "next";
import { Navbar } from "../components/Navbar";
import { DeveloperPortal } from "../components/DeveloperPortal";
import { SiteFooter } from "../components/SiteFooter";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "ZAYRON-X Intelligence API — Developers",
  description:
    "Source-verified vulnerability intelligence over a versioned OpenAPI 3.1 REST API. Self-serve 48-character bearer tokens, edge rate limits, KEV and EPSS filters.",
  alternates: { canonical: "/developers" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "ZAYRON-X Intelligence API | ZAYRON-X", url: "/developers" },
};

export default function DevelopersPage() {
  // Read on the server so the client bundle never depends on `process.env`
  // existing in the browser. Absent → the Turnstile widget is not rendered.
  const turnstileSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();

  return (
    <main className="site-atmosphere">
      <div className="page-content">
        <Navbar />
        <DeveloperPortal turnstileSiteKey={turnstileSiteKey} />
        <SiteFooter />
      </div>
    </main>
  );
}
