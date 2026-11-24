import type { Metadata } from "next";
import { RouteShell } from "../components/RouteShell";
import { getSiteUrl, isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

/**
 * Gate 3A.5 — public methodology page.
 *
 * States the operating rules the product actually enforces: deterministic
 * static evidence, authoritative CVE sourcing, anti-hallucination gates and
 * honest limitation reporting. No marketing claims beyond those rules.
 */

const canonical = "/methodology";

export const metadata: Metadata = {
  title: "Methodology — how ZAYRON-X produces intelligence",
  description:
    "ZAYRON-X methodology: deterministic static evidence versus observed runtime (CAN_DO), authoritative NVD / CISA KEV / FIRST EPSS sourcing, anti-hallucination verification gates, and honest limitation reporting.",
  alternates: { canonical },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "Methodology | ZAYRON-X", url: canonical },
};

const principles: Array<{ title: string; body: string }> = [
  {
    title: "Deterministic static evidence, never inferred behaviour",
    body:
      "Every statement in a report is derived from a canonical observation produced by a named analyzer (LIEF, DIE, Magika, CAPA, YARA-X, FLOSS) or from an authoritative feed. Static capability is labelled CAN_DO: it states what the code is structured to do, and is never promoted to observed runtime behaviour. If a sample is not executed, the report says so on the page.",
  },
  {
    title: "Authoritative CVE sourcing",
    body:
      "Vulnerability facts come from NVD (CVSS score, vector, CWE, vendor/product, affected and fixed ranges), CISA KEV (known exploitation and remediation due date) and FIRST EPSS (exploitation probability and percentile). Each row carries a provenance state; only AUTHORITATIVE_VERIFIED rows are published, and anything that fails verification is quarantined rather than deleted.",
  },
  {
    title: "Anti-hallucination verification gates",
    body:
      "Model output is schema-validated, evidence-grounded and retried at most once with a structured repair. A failed or ungrounded assessment is withheld instead of being softened: the public page then shows the verified technical advisory only. Gate codes, model names and provider state stay server-side and never reach public HTML.",
  },
  {
    title: "Honest limitations and explicit unknowns",
    body:
      "An analyzer ERROR or NO_RESULT is reported as exactly that, never as a clean negative. An unresolved family is not a benign verdict. Absence of a detection is not absence of capability. Reports list what remains unknown next to what was established, with the evidence identifiers kept behind a disclosure.",
  },
  {
    title: "Immutable evidence lineage",
    body:
      "Claims point at canonical evidence identifiers, so a reader can trace any published sentence back to the observation that supports it. When an authoritative source revises a record, the revision replaces the fact in place; disagreements are surfaced as conflicts instead of being silently resolved.",
  },
];

export default function MethodologyPage() {
  const siteUrl = getSiteUrl();
  return (
    <RouteShell
      title="Methodology"
      eyebrow="TRUST / METHODOLOGY"
      activeHref="/company/trust"
      description="How ZAYRON-X turns raw telemetry into intelligence that can be audited."
    >
      <div className="vx-article" style={{ maxWidth: "820px" }}>
        <p style={{ fontSize: "1.02rem", lineHeight: 1.7 }}>
          ZAYRON-X publishes evidence-grounded cyber threat intelligence. This page states the rules the pipeline
          actually enforces, so a reader can hold the product to them.
        </p>
        {principles.map((principle) => (
          <section key={principle.title} style={{ marginTop: "1.6rem" }}>
            <h2 style={{ fontSize: "1.05rem", letterSpacing: ".02em" }}>{principle.title}</h2>
            <p style={{ lineHeight: 1.7, opacity: 0.92 }}>{principle.body}</p>
          </section>
        ))}
        <section style={{ marginTop: "1.6rem" }}>
          <h2 style={{ fontSize: "1.05rem" }}>Indexation policy</h2>
          <p style={{ lineHeight: 1.7, opacity: 0.92 }}>
            Only reports with real verified signal are advertised to search engines. Thin, unresolved stubs remain
            reachable by direct URL — so a hash lookup always resolves — but they are excluded from sitemaps and marked
            <code style={{ margin: "0 .3rem" }}>noindex</code>. A preview deployment is never indexable at all.
          </p>
        </section>
        <p style={{ marginTop: "2rem", opacity: 0.8, fontSize: ".9rem" }}>
          Related: <a href="/company/trust">Trust Center</a> · <a href="/legal/malware-research">Malware research policy</a> ·{" "}
          <a href={`${siteUrl}/.well-known/security.txt`}>security.txt</a>
        </p>
      </div>
    </RouteShell>
  );
}
