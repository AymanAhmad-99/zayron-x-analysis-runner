import type { Metadata } from "next";
import { InstitutionalDocLayout, type DocSection } from "../components/InstitutionalDocLayout";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "About ZAYRON-X — Cyber Threat Intelligence Platform",
  description:
    "ZAYRON-X is an independent global cyber threat intelligence platform unifying authoritative CVEs, CISA KEV advisories, threat actors, MITRE ATT&CK techniques, and malware telemetry into one verified graph.",
  alternates: { canonical: "/about" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "About ZAYRON-X", url: "/about" },
};

const sections: DocSection[] = [
  {
    id: "what-it-is",
    title: "What ZAYRON-X is",
    body: (
      <>
        <p className="doc-callout">
          ZAYRON-X is an independent global cyber threat intelligence platform unifying authoritative security data into
          one verified graph. Every advisory, dossier, and assessment carries its source, observation, and confidence
          state — Truth Is the Perimeter.
        </p>
        <p>
          Defenders do not fail because information is scarce. They fail because unverified noise arrives with the same
          visual authority as verified fact. ZAYRON-X separates the two by construction.
        </p>
      </>
    ),
  },
  {
    id: "what-it-does",
    title: "What ZAYRON-X does",
    body: (
      <>
        <p>
          ZAYRON-X ingests primary authoritative security feeds and correlates them continuously with zero fabricated
          noise across one connected threat graph:
        </p>
        <ul>
          <li>
            <strong>Live CVEs &amp; CISA KEV advisories.</strong> Records reconciled across NVD, CVE.org, CISA ADP, CISA
            KEV, FIRST EPSS, and OSV.dev with affected/fixed branches and remediation deadlines.
          </li>
          <li>
            <strong>Threat actors &amp; MITRE ATT&amp;CK techniques.</strong> Bidirectional attribution linking threat
            groups, active campaigns, ATT&amp;CK techniques, and exploited vulnerabilities.
          </li>
          <li>
            <strong>Supply-chain alerts &amp; malware telemetry.</strong> OpenSSF/OSV malicious-package advisories (
            <code>MAL-*</code>), defanged active C2 indicators, and static malware dossiers.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "what-it-delivers",
    title: "What ZAYRON-X delivers",
    body: (
      <>
        <p>Every intelligence surface is engineered for operational speed and machine-readable automation:</p>
        <ul>
          <li>
            <strong>15-second analyst triage.</strong> Direct verdicts, CVSS/EPSS context, and KEV deadlines in one{" "}
            <a href="/intelligence">unified intelligence workspace</a>.
          </li>
          <li>
            <strong>Copy-ready detection &amp; hunting workflows.</strong> Microsoft Sentinel KQL queries, Splunk SPL
            searches, and ATT&amp;CK Navigator layers on every dossier.
          </li>
          <li>
            <strong>Free Developer API.</strong> OpenAPI 3.1 programmatic access across 27 endpoints, bulk IOC lookup
            (50 indicators/request), STIX 2.1 bundles, and Firewall EDL feeds at{" "}
            <a href="/developers">zayron-x.co/developers</a>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "evidence-standard",
    title: "The evidence standard",
    body: (
      <>
        <p>
          Four states are never collapsed into one another: what a source published, what an analyzer observed, what an
          assessment concludes, and what remains unknown. Where sources disagree, the disagreement is surfaced rather
          than resolved silently. See <a href="/methodology">Methodology &amp; Governance</a>.
        </p>
      </>
    ),
  },
  {
    id: "independence",
    title: "Editorial independence & presence",
    body: (
      <>
        <p>
          ZAYRON-X is independently operated from Montana, United States, with continuous global collection and
          verification. We do not accept payment for coverage, ranking, or favourable assessment of any vendor or
          product.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact desks",
    body: (
      <>
        <p>
          Intelligence &amp; briefings desk: <a href="mailto:intel@zayron-x.co">intel@zayron-x.co</a>. Security &amp;
          vulnerability disclosure: <a href="mailto:security@zayron-x.co">security@zayron-x.co</a>. General enquiries:{" "}
          <a href="mailto:contact@zayron-x.co">contact@zayron-x.co</a>. Legal notices:{" "}
          <a href="mailto:legal@zayron-x.co">legal@zayron-x.co</a>.
        </p>
        <p>
          Live intelligence wire: <a href="https://t.me/zayronxai">t.me/zayronxai</a>.
        </p>
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <InstitutionalDocLayout
      category="PLATFORM OVERVIEW"
      title="About ZAYRON-X"
      summary="Independent global cyber threat intelligence platform unifying authoritative security data into one verified graph."
      sections={sections}
    />
  );
}
