import type { Metadata } from "next";
import { InstitutionalDocLayout, type DocSection } from "../components/InstitutionalDocLayout";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "About ZAYRON-X — Cyber Threat Intelligence Research",
  description:
    "ZAYRON-X is an independent cyber threat intelligence research practice: source-verified CVE advisories, static malware dossiers, and evidence-locked analytical assessments. Truth Is the Perimeter.",
  alternates: { canonical: "/about" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "About ZAYRON-X", url: "/about" },
};

const sections: DocSection[] = [
  {
    id: "doctrine",
    title: "Truth Is the Perimeter.",
    body: (
      <>
        <p className="doc-callout">
          ZAYRON-X is organized around a single operating rule. A claim that cannot be traced to evidence does not
          leave the building. Every advisory, dossier and assessment we publish carries the source, the observation and
          the confidence state that produced it.
        </p>
        <p>
          Defenders do not fail because information is scarce. They fail because unverified information arrives with the
          same visual authority as verified information. Our work is the deliberate separation of the two.
        </p>
      </>
    ),
  },
  {
    id: "what-we-do",
    title: "What ZAYRON-X does",
    body: (
      <>
        <p>
          ZAYRON-X is a cyber threat intelligence research practice. We ingest primary public authoritative feeds,
          reconcile them against each other, and publish structured intelligence that a security team can act on without
          re-verifying the underlying facts.
        </p>
        <ul>
          <li>
            <strong>Vulnerability intelligence.</strong> CVE records reconciled across NVD, CVE.org, CISA ADP, CISA KEV,
            FIRST EPSS and OSV.dev, with affected and fixed version branches and remediation windows.
          </li>
          <li>
            <strong>Malware dossiers.</strong> Static analysis of submitted samples: capability mapping, indicator
            extraction and family assessment, with runtime behaviour explicitly out of scope.
          </li>
          <li>
            <strong>Exploitation and prioritization.</strong> A deterministic signal index that maps published severity,
            exploitation probability and known-exploitation status onto remediation deadlines.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "independence",
    title: "Editorial independence",
    body: (
      <>
        <p>
          ZAYRON-X is independently operated and independently funded. We do not accept payment for coverage, ranking or
          favourable assessment of any vendor, product or vulnerability. Ingested data sources have no influence over
          published findings; they are inputs, not sponsors.
        </p>
        <p>
          Naming a source in our telemetry strip records a technical dependency. It does not describe a commercial
          relationship, a partnership, or an endorsement in either direction.
        </p>
      </>
    ),
  },
  {
    id: "presence",
    title: "Institutional presence",
    body: (
      <>
        <p>
          ZAYRON-X operates from the United States, with its institutional presence established in Montana. Collection,
          verification and publication run continuously, giving global coverage across every operating time zone rather
          than coverage limited to a single business day.
        </p>
        <p>
          The intelligence wire publishes verified items as they clear verification, so a defender in any region receives
          the same record at the same time as any other.
        </p>
      </>
    ),
  },
  {
    id: "standard",
    title: "The evidence standard",
    body: (
      <>
        <p>
          Four states are never collapsed into one another: what a source published, what an analyzer observed, what an
          assessment concludes, and what remains unknown. A static capability is not execution. A classification is not
          attribution. An absent detection is not a clean verdict.
        </p>
        <p>
          Where sources disagree, the disagreement is surfaced rather than resolved silently. Where a source revises a
          record, the revision replaces the fact in place and the correction is recorded. The full rule set is published
          in <a href="/methodology">Methodology &amp; Governance</a>.
        </p>
      </>
    ),
  },
  {
    id: "audience",
    title: "Who we serve",
    body: (
      <>
        <p>
          Security operations centres, vulnerability management teams, incident responders, threat intelligence analysts
          and enterprise risk owners. Our readers are practitioners who must justify a decision to someone else, and who
          need the underlying evidence to survive that scrutiny.
        </p>
        <p>
          Public CVE and malware intelligence remains openly accessible. Team and enterprise access adds volume,
          correlation and machine-readable delivery rather than gating the underlying facts.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          General and institutional enquiries: <a href="mailto:contact@zayron-x.co">contact@zayron-x.co</a>. Security
          reports and vulnerability disclosure: <a href="mailto:security@zayron-x.co">security@zayron-x.co</a>. Legal and
          contractual notices: <a href="mailto:legal@zayron-x.co">legal@zayron-x.co</a>.
        </p>
        <p>
          The intelligence wire is public: <a href="https://t.me/zayronxai">t.me/zayronxai</a>.
        </p>
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <InstitutionalDocLayout
      category="COMPANY"
      title="About ZAYRON-X"
      summary="An independent cyber threat intelligence research practice built on one rule: no claim leaves without its evidence."
      sections={sections}
    />
  );
}
