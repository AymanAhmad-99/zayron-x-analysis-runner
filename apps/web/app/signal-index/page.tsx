import type { Metadata } from "next";
import { DocTable, InstitutionalDocLayout, type DocSection } from "../components/InstitutionalDocLayout";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "Signal Index & Prioritization Standard",
  description:
    "The ZAYRON-X deterministic prioritization matrix: how CVSS, FIRST EPSS, CISA KEV and CISA SSVC map to P0–P3 priority tiers and remediation SLAs of 24–48 hours through 30 days.",
  alternates: { canonical: "/signal-index" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "Signal Index & Prioritization Standard | ZAYRON-X", url: "/signal-index" },
};

const sections: DocSection[] = [
  {
    id: "purpose",
    title: "Purpose",
    body: (
      <>
        <p className="doc-callout">
          The Signal Index converts published severity and exploitation evidence into a single priority tier and a
          remediation window. It is deterministic: the same inputs always produce the same tier, and the rule that
          produced a tier is readable on the record.
        </p>
        <p>
          The standard exists because severity alone is a poor queue. A critical score with no exploitation evidence and
          a moderate score under active exploitation require different deadlines, and defenders need that difference
          stated rather than inferred.
        </p>
      </>
    ),
  },
  {
    id: "inputs",
    title: "Input signals",
    body: (
      <>
        <DocTable
          caption="Prioritization inputs"
          head={["Signal", "Publisher", "What it contributes"]}
          rows={[
            ["CVSS base score and vector", "NVD / CNA", "Intrinsic technical severity, attack vector and impact class"],
            ["EPSS probability and percentile", "FIRST", "Probability of exploitation activity in the near term"],
            ["KEV listing and due date", "CISA", "Confirmed exploitation in the wild and a federal remediation deadline"],
            ["SSVC decision points", "CISA ADP", "Exploitation, automatable and technical impact assessments"],
          ]}
        />
        <p>
          An absent input is treated as absent. It is not replaced with a default, a mid-range estimate or a
          vendor-supplied substitute, and the resulting tier states which inputs were unavailable.
        </p>
      </>
    ),
  },
  {
    id: "tiers",
    title: "Priority tiers",
    body: (
      <>
        <DocTable
          caption="Priority tiers"
          head={["Tier", "Definition", "Typical trigger"]}
          rows={[
            [
              <strong key="p0">P0 — Immediate</strong>,
              "Exploitation confirmed, or a technical condition that produces it at scale, against widely deployed software.",
              "CISA KEV listing, or active exploitation stated by an authoritative source",
            ],
            [
              <strong key="p1">P1 — Urgent</strong>,
              "High technical severity with credible exploitation pressure, or an automatable weakness in an exposed service.",
              "CVSS ≥ 9.0, or EPSS ≥ 0.50, or SSVC exploitation active",
            ],
            [
              <strong key="p2">P2 — Elevated</strong>,
              "Material severity without confirmed exploitation, or exploitation probability above baseline.",
              "CVSS 7.0–8.9 with EPSS above the published baseline",
            ],
            [
              <strong key="p3">P3 — Standard</strong>,
              "Lower severity, local preconditions, or no exploitation evidence of any kind.",
              "CVSS < 7.0 with no KEV listing and baseline EPSS",
            ],
          ]}
        />
        <p>
          Where signals conflict, the higher tier governs. A KEV listing always produces P0 regardless of score; a low
          EPSS value never demotes a KEV-listed record.
        </p>
      </>
    ),
  },
  {
    id: "sla",
    title: "Remediation windows",
    body: (
      <>
        <DocTable
          caption="Remediation service levels"
          head={["Tier", "Remediation window", "Interim posture"]}
          rows={[
            ["P0", "24–48 hours", "Patch, isolate, or apply the vendor mitigation; treat as compromised until proven otherwise"],
            ["P1", "72 hours", "Emergency change window; compensating control required if the patch is unavailable"],
            ["P2", "7 days", "Standard change window with monitoring for exploitation indicators"],
            ["P3", "30 days", "Scheduled maintenance"],
          ]}
        />
        <p>
          Where CISA publishes a KEV due date, that date takes precedence over the window above and is shown on the
          record. A remediation window is a publication standard, not a guarantee about any third party&apos;s patching.
        </p>
      </>
    ),
  },
  {
    id: "determinism",
    title: "Deterministic rules",
    body: (
      <>
        <ul>
          <li>Tier assignment is computed from stored source values, not re-scored per viewer or per request.</li>
          <li>The tier, the inputs used, and any absent input are recorded on the advisory.</li>
          <li>Model output cannot raise or lower a tier. Analytical text may explain a tier; it cannot alter it.</li>
          <li>A source revision recomputes the tier, and the change is visible in the revision history.</li>
        </ul>
      </>
    ),
  },
  {
    id: "non-goals",
    title: "Non-goals",
    body: (
      <>
        <p>
          The Signal Index does not estimate the likelihood that a specific organization will be targeted, does not price
          risk, and does not replace an organization&apos;s own asset context. It orders published evidence; the
          deployment decision remains with the defender who holds the asset inventory.
        </p>
      </>
    ),
  },
];

export default function SignalIndexPage() {
  return (
    <InstitutionalDocLayout
      category="STANDARD"
      title="Signal Index &amp; Prioritization"
      summary="A deterministic mapping from published severity and exploitation evidence to P0–P3 priority and remediation deadlines."
      sections={sections}
    />
  );
}
