import type { Metadata } from "next";
import { InstitutionalDocLayout, type DocSection } from "../components/InstitutionalDocLayout";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "Terms of Use & Intelligence Disclaimer",
  description:
    "Terms governing use of ZAYRON-X: acceptable use, intellectual property, the professional intelligence disclaimer, warranty limitations, liability and governing law.",
  alternates: { canonical: "/legal" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "Terms of Use & Intelligence Disclaimer | ZAYRON-X", url: "/legal" },
};

const sections: DocSection[] = [
  {
    id: "acceptance",
    title: "Acceptance",
    body: (
      <>
        <p>
          These terms govern access to and use of <strong>zayron-x.co</strong>, its APIs, and the intelligence published
          through them (the &ldquo;Service&rdquo;). By using the Service you accept these terms. If you use the Service on
          behalf of an organization, you confirm you are authorized to bind that organization.
        </p>
        <p>
          These terms are issued by ZAYRON-X, an operating presence established in the United States (Montana) with global
          coverage. Notices: <a href="mailto:legal@zayron-x.co">legal@zayron-x.co</a>.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "The Service",
    body: (
      <>
        <p>
          ZAYRON-X publishes cyber threat intelligence derived from primary public authoritative sources and from static
          analysis. Public records are openly accessible. Paid access adds volume, correlation, machine-readable delivery
          and support; it does not alter the underlying published facts.
        </p>
        <p>
          The Service is provided on an evolving basis. Features may be added, changed or withdrawn. We do not represent
          that any particular record, feed or endpoint will remain available indefinitely.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You may not use the Service to:</p>
        <ul>
          <li>conduct unauthorized access, intrusion, reconnaissance against a system you do not own or have permission to test, or any unlawful activity;</li>
          <li>circumvent rate limits, authentication or access controls, or resell the Service except as expressly permitted;</li>
          <li>introduce malicious code, perform denial-of-service testing, or interfere with other users&apos; access;</li>
          <li>scrape at a volume that degrades the Service, or republish content as your own original research;</li>
          <li>use published indicators to target any person or system, or to attribute conduct to a named individual without independent authority.</li>
        </ul>
        <p>
          You are responsible for complying with the laws that apply to you when using threat intelligence, including
          export-control and sanctions regimes.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Intelligence disclaimer",
    body: (
      <>
        <p className="doc-callout">
          Intelligence is probabilistic, incomplete and time-sensitive. A published record describes the state of the
          evidence at the observation time; it is not a guarantee about any system, vendor, actor or outcome.
        </p>
        <p>
          Static capability is not evidence of execution. A classification is not attribution. The absence of a detection
          is not a negative finding. Prioritization tiers and remediation windows are publication standards, not
          instructions tailored to your environment.
        </p>
        <p>
          The Service does not provide legal, regulatory, insurance or investment advice. Operational decisions,
          including patching, isolation and disclosure decisions, remain yours.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    body: (
      <>
        <p>
          The platform, its presentation and its original analytical content are owned by ZAYRON-X. Upstream facts remain
          the property of their publishers and are reproduced under their respective terms; trademarks named on this site
          belong to their owners and imply no endorsement.
        </p>
        <p>
          You may cite and quote published intelligence with attribution to ZAYRON-X and a link to the source record.
          Systematic republication, resale or model training on our content requires written permission.
        </p>
      </>
    ),
  },
  {
    id: "warranty",
    title: "Disclaimer of warranties",
    body: (
      <>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the maximum extent permitted by
          law, ZAYRON-X disclaims all implied warranties, including merchantability, fitness for a particular purpose,
          accuracy and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that any
          record is complete.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          To the maximum extent permitted by law, ZAYRON-X is not liable for indirect, incidental, special, consequential
          or punitive damages, or for lost profits, lost revenue, business interruption, or loss of data arising from use
          of the Service. Where liability cannot be excluded, it is limited to the amount you paid for the Service in the
          twelve months preceding the claim, or one hundred US dollars where no amount was paid.
        </p>
        <p>Nothing in these terms excludes liability that cannot lawfully be excluded.</p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These terms are governed by the laws of the State of Montana, United States, without regard to conflict-of-law
          rules. The state and federal courts located in Montana have exclusive jurisdiction, subject to any mandatory
          consumer protection that applies in your country of residence.
        </p>
        <p>
          Before commencing proceedings, you agree to raise the dispute with{" "}
          <a href="mailto:legal@zayron-x.co">legal@zayron-x.co</a> and allow thirty days for good-faith resolution.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and severability",
    body: (
      <>
        <p>
          We may revise these terms; a revision carries a new identifier and effective date, and material changes are
          announced on the Service. If a provision is held unenforceable, the remaining provisions continue in force.
        </p>
        <p>
          Related documents: <a href="/privacy">Privacy Policy</a> · <a href="/cookies">Cookie Policy</a> ·{" "}
          <a href="/methodology">Methodology &amp; Governance</a> · <a href="/security">Trust &amp; Security</a>.
        </p>
      </>
    ),
  },
];

export default function LegalPage() {
  return (
    <InstitutionalDocLayout
      category="LEGAL"
      title="Terms of Use &amp; Intelligence Disclaimer"
      summary="The terms that govern use of ZAYRON-X, including acceptable use, intellectual property, and the professional limits of published intelligence."
      sections={sections}
    />
  );
}
