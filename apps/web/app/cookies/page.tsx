import type { Metadata } from "next";
import { DocTable, InstitutionalDocLayout, type DocSection } from "../components/InstitutionalDocLayout";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "The complete ZAYRON-X cookie inventory: strictly necessary security and performance cookies only, with no advertising or cross-site tracking.",
  alternates: { canonical: "/cookies" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "Cookie Policy | ZAYRON-X", url: "/cookies" },
};

const sections: DocSection[] = [
  {
    id: "position",
    title: "Position",
    body: (
      <>
        <p className="doc-callout">
          ZAYRON-X does not run an advertising business. There are no advertising cookies, no cross-site tracking pixels,
          no data-broker tags and no fingerprinting scripts on this site.
        </p>
        <p>
          Cookies and equivalent local storage are used only where the service cannot operate securely without them. That
          limits the inventory to two categories: strictly necessary and security.
        </p>
      </>
    ),
  },
  {
    id: "inventory",
    title: "Cookie inventory",
    body: (
      <>
        <DocTable
          caption="Cookies set by ZAYRON-X"
          head={["Name", "Category", "Purpose", "Duration"]}
          rows={[
            ["__cf_bm", "Strictly necessary (security)", "Bot management: distinguishes humans from automated traffic", "30 minutes"],
            ["cf_clearance", "Strictly necessary (security)", "Records the outcome of a browser challenge", "Up to 1 year"],
            ["__cfruid", "Strictly necessary (security)", "Rate limiting and session affinity at the edge", "Session"],
            ["zayron_session", "Strictly necessary (account)", "Authenticated session state, where accounts are enabled", "Session to 30 days"],
            ["zayron_csrf", "Strictly necessary (security)", "Cross-site request forgery protection on authenticated forms", "Session"],
          ]}
        />
        <p>
          Edge security cookies are set by the infrastructure provider as part of serving the request. They are not used
          to build a profile and are not shared for advertising.
        </p>
      </>
    ),
  },
  {
    id: "performance",
    title: "Performance measurement",
    body: (
      <>
        <p>
          We do not load third-party analytics that set cookies. Aggregate operational metrics — request counts, error
          rates and latency — are measured at the edge without a persistent client identifier.
        </p>
      </>
    ),
  },
  {
    id: "control",
    title: "Your control",
    body: (
      <>
        <p>
          Strictly necessary cookies cannot be disabled without breaking authentication and security protections, and no
          consent is required for them under the ePrivacy Directive. You may still block or delete cookies in your browser
          settings; the site will continue to serve public intelligence, but authenticated features may not function.
        </p>
        <p>
          Browser-level controls such as tracking protection, private browsing and third-party cookie blocking do not
          impair public access to this site.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <>
        <p>
          The inventory above is the authoritative list. If a new cookie becomes necessary, it is added here before or at
          the same time as deployment, and this document's revision identifier changes.
        </p>
      </>
    ),
  },
];

export default function CookiesPage() {
  return (
    <InstitutionalDocLayout
      category="LEGAL"
      title="Cookie Policy"
      summary="The complete inventory of cookies set by ZAYRON-X, and why no advertising or tracking cookie exists on this site."
      sections={sections}
    />
  );
}
