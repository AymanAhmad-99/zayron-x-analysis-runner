import type { Metadata } from "next";
import { Navbar } from "../components/Navbar";
import { DeveloperPortal } from "../components/DeveloperPortal";
import { SiteFooter } from "../components/SiteFooter";
import { PipelineHealthBadge } from "../components/PipelineHealthBadge";
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
  // Read on the server at REQUEST time so the client bundle never depends on
  // `process.env` existing in the browser. The key is provisioned as a Worker
  // Secret, so it must NOT be inlined at build time: a `NEXT_PUBLIC_` variable
  // accessed as a literal is replaced by the bundler during `next build`, which
  // would freeze whatever value (often none) existed at build time. Dynamic
  // property access is evaluated at runtime and works identically whether the
  // value is a Variable or a Secret. Absent → the widget is not rendered.
  const runtimeEnv = process.env as Record<string, string | undefined>;
  const turnstileSiteKey = (runtimeEnv["NEXT_PUBLIC_" + "TURNSTILE_SITE_KEY"] ?? "").trim();

  return (
    <main className="site-atmosphere">
      <div className="page-content">
        <Navbar />
        <PipelineHealthBadge />
        <DeveloperPortal turnstileSiteKey={turnstileSiteKey} />
        <SiteFooter />
      </div>
    </main>
  );
}
