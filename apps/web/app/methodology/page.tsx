import type { Metadata } from "next";
import { DocTable, InstitutionalDocLayout, type DocSection } from "../components/InstitutionalDocLayout";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "Methodology & Governance",
  description:
    "The verification standard behind ZAYRON-X intelligence: deterministic source gates, separation of authoritative fact from analytical synthesis, provenance locking, revision and correction standards, and non-fabrication guarantees.",
  alternates: { canonical: "/methodology" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "Methodology & Governance | ZAYRON-X", url: "/methodology" },
};

const sections: DocSection[] = [
  {
    id: "purpose",
    title: "Purpose and scope",
    body: (
      <>
        <p className="doc-callout">
          This document states the rules ZAYRON-X actually enforces when producing intelligence. It is a governance
          specification, not a marketing description: every rule below corresponds to a gate in the production pipeline,
          and every gate can refuse publication.
        </p>
        <p>
          It applies to all published vulnerability advisories, malware dossiers, exploitation records and analytical
          assessments across the ZAYRON-X platform and its public intelligence wire.
        </p>
      </>
    ),
  },
  {
    id: "verification",
    title: "Deterministic verification gates",
    body: (
      <>
        <p>
          Publication is the last step of a fixed sequence, not the first. A record advances only when every gate it is
          subject to returns a pass; a gate failure withholds the record rather than downgrading it.
        </p>
        <DocTable
          caption="Verification gates"
          head={["Gate", "Question it answers", "Failure outcome"]}
          rows={[
            ["Source authority", "Was this fact published by a named authoritative source?", "Record quarantined, never published"],
            ["Schema validation", "Does the structured record satisfy the published schema?", "One structured repair attempt, then withheld"],
            ["Evidence grounding", "Does every statement resolve to a canonical observation?", "Ungrounded statements removed; assessment withheld if it cannot stand"],
            ["Conflict detection", "Do authoritative sources disagree on this fact?", "Conflict surfaced on the record, not silently resolved"],
            ["Provenance lock", "Is the source, timestamp and identifier captured?", "Record not promoted until provenance is complete"],
            ["Revision check", "Has the source superseded this record?", "Superseded content replaced in place, prior revision retained"],
          ]}
        />
      </>
    ),
  },
  {
    id: "separation",
    title: "Authoritative fact and analytical synthesis",
    body: (
      <>
        <p>
          The platform maintains a hard boundary between two categories of content, and the boundary is visible to the
          reader.
        </p>
        <ul>
          <li>
            <strong>Authoritative fact.</strong> Values published by NVD, CVE.org, CISA ADP, CISA KEV, FIRST EPSS and
            OSV.dev: CVSS scores and vectors, CWE assignments, affected and fixed ranges, exploitation status,
            remediation due dates. These are reproduced, never estimated.
          </li>
          <li>
            <strong>Analytical synthesis.</strong> Deterministic derivations and grounded assessment: CVSS vector
            interpretation, triage posture, remediation mapping, capability description. These are labelled as
            assessment and are never presented as source fact.
          </li>
        </ul>
        <p>
          A missing authoritative value is published as <em>not established</em>. It is never interpolated, inferred from
          an adjacent field, or borrowed from a lower-quality source to complete a table.
        </p>
      </>
    ),
  },
  {
    id: "provenance",
    title: "Source provenance locking",
    body: (
      <>
        <p>
          Every published fact retains the identifier of the record it came from, the source that published it, and the
          timestamp at which it was observed. Provenance is immutable: a correction produces a new observation, it does
          not rewrite the history of the old one.
        </p>
        <p>
          Public pages render the source and the observation time alongside derived values, so a reader can reproduce the
          verification rather than trust it. Internal gate codes, model identifiers and provider state are operational
          data and are never exposed in public HTML.
        </p>
      </>
    ),
  },
  {
    id: "revision",
    title: "Revision and correction standard",
    body: (
      <>
        <p>
          Intelligence decays. Records are re-checked against their sources, and a record that changes carries the change
          forward explicitly.
        </p>
        <ul>
          <li>A source revision replaces the affected fact in place; the previous value is retained in the revision history.</li>
          <li>A retraction removes the public claim and leaves a correction notice on the record.</li>
          <li>A material correction is announced on the intelligence wire, not only applied silently.</li>
          <li>Corrections are never used to erase an error from the record; the error and its correction remain readable.</li>
        </ul>
      </>
    ),
  },
  {
    id: "non-fabrication",
    title: "Non-fabrication guarantees",
    body: (
      <>
        <p>Four guarantees are enforced by the pipeline rather than by editorial intention:</p>
        <ol>
          <li>
            No synthetic identifier, timestamp, score or reference is generated to fill an empty field. Absent data is
            rendered as absent.
          </li>
          <li>
            No exploitation claim is promoted to validated or confirmed without an authoritative source that states it.
            In the absence of such a source the record reads <em>not observed</em>.
          </li>
          <li>No attribution is asserted from static similarity alone.</li>
          <li>No source is cited that was not actually retrieved for that record.</li>
        </ol>
      </>
    ),
  },
  {
    id: "limitations",
    title: "Limitations and unknowns",
    body: (
      <>
        <p>
          Every report states what it could not establish. An analyzer error or an empty result is reported as an error
          or an empty result, never as a negative finding. An unresolved family is not a benign verdict.
        </p>
        <p>
          Static analysis describes what code is structured to do. It does not demonstrate execution, and it does not
          establish an operator. Capability statements are therefore scoped as capability throughout.
        </p>
      </>
    ),
  },
  {
    id: "governance",
    title: "Governance and accountability",
    body: (
      <>
        <p>
          This document is owned by the ZAYRON-X research function and reviewed on a fixed cadence, and whenever a
          publication gate changes. The revision identifier on this page changes when the rules change.
        </p>
        <p>
          A reader who believes a published claim is unsupported may raise it with{" "}
          <a href="mailto:contact@zayron-x.co">contact@zayron-x.co</a>; every such report is reviewed against the record
          and its evidence. Security reports follow the disclosure process in <a href="/security">Trust &amp; Security</a>.
        </p>
      </>
    ),
  },
  {
    id: "indexation",
    title: "Indexation policy",
    body: (
      <>
        <p>
          Only records carrying verified signal are advertised to search engines. Thin or unresolved records remain
          reachable by direct URL so that an identifier lookup always resolves, but they are excluded from the sitemap and
          marked non-indexable.
        </p>
      </>
    ),
  },
];

export default function MethodologyPage() {
  return (
    <InstitutionalDocLayout
      category="GOVERNANCE"
      title="Methodology &amp; Governance"
      summary="How ZAYRON-X converts primary telemetry into intelligence that can be audited, contested and corrected."
      sections={sections}
    />
  );
}
