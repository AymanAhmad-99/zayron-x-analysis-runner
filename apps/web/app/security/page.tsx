import type { Metadata } from "next";
import { DocTable, InstitutionalDocLayout, type DocSection } from "../components/InstitutionalDocLayout";
import { PipelineHealthBadge } from "../components/PipelineHealthBadge";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "Trust, Security & Vulnerability Disclosure",
  description:
    "ZAYRON-X trust and security architecture, boundary separation, and formal vulnerability disclosure policy with safe harbor and response service levels.",
  alternates: { canonical: "/security" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "Trust, Security & Vulnerability Disclosure | ZAYRON-X", url: "/security" },
};

const sections: DocSection[] = [
  {
    id: "posture",
    title: "Security posture",
    body: (
      <>
        <p className="doc-callout">
          ZAYRON-X is a read-heavy, evidence-first platform. It ingests public authoritative data, verifies it, and
          publishes structured records. It does not execute submitted binaries, and it does not accept untrusted code into
          its request path.
        </p>
        <p>
          The security design follows from that shape: minimize what can accept input, isolate what processes untrusted
          content, and keep every credential outside the public surface.
        </p>
      </>
    ),
  },
  {
    id: "architecture",
    title: "Architecture",
    body: (
      <>
        <ul>
          <li>
            <strong>Edge isolation.</strong> Public traffic terminates at the Cloudflare edge; the application runs as an
            isolated Worker runtime with no persistent host.
          </li>
          <li>
            <strong>Zero binary execution.</strong> No uploaded sample is run, emulated, or unpacked in the request path.
            Analysis is static and isolated from production data.
          </li>
          <li>
            <strong>Service-boundary calls.</strong> Server-side calls reach the API through an internal service binding
            rather than a public network hop.
          </li>
          <li>
            <strong>Least-privilege data access.</strong> Read paths and write paths are separate; public rendering reads
            verified records only.
          </li>
          <li>
            <strong>Secret containment.</strong> Credentials live in the platform secret store, are never bundled into
            client code, and are never logged.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "boundaries",
    title: "Read/write boundary",
    body: (
      <>
        <p>
          The public surface is a projection of verified records. It cannot mutate intelligence state. Analytical and
          ingest operations run in a separate worker context with their own credentials, and their output is written
          through the verification pipeline described in <a href="/methodology">Methodology &amp; Governance</a>.
        </p>
        <p>
          Public responses that depend on a user context are marked non-cacheable; shared content is cached at the edge
          with versioned keys so a revision cannot be served from a stale entry.
        </p>
      </>
    ),
  },
  {
    id: "vdp",
    title: "Vulnerability disclosure policy",
    body: (
      <>
        <p>
          We welcome reports of security vulnerabilities in ZAYRON-X systems and services. Report to{" "}
          <a href="mailto:security@zayron-x.co">security@zayron-x.co</a>. A machine-readable copy of this policy is
          published at{" "}
          <a href="/.well-known/security.txt">/.well-known/security.txt</a> under RFC 9116.
        </p>
        <p>Please include the affected URL or component, a description of the issue, reproduction steps, and any proof of concept required to confirm it. Do not include live third-party data.</p>
        <DocTable
          caption="Response service levels"
          head={["Stage", "Target"]}
          rows={[
            ["Acknowledgement of report", "2 business days"],
            ["Initial triage and severity assessment", "5 business days"],
            ["Remediation plan communicated", "10 business days"],
            ["Critical issue remediation", "30 days"],
            ["High issue remediation", "60 days"],
            ["Moderate or low issue remediation", "90 days"],
          ]}
        />
      </>
    ),
  },
  {
    id: "scope",
    title: "In scope and out of scope",
    body: (
      <>
        <p>
          In scope: ZAYRON-X web properties, APIs, worker configurations and authentication flows operated by ZAYRON-X.
        </p>
        <p>
          Out of scope: denial-of-service testing, social engineering, physical access attempts, automated scanning that
          degrades service, and any testing against third-party providers named in our telemetry strip. Findings in
          upstream providers should be reported to that provider.
        </p>
      </>
    ),
  },
  {
    id: "safe-harbor",
    title: "Safe harbor",
    body: (
      <>
        <p>
          If you make a good-faith effort to comply with this policy during your research, we will consider your research
          authorized, will work with you to understand and resolve the issue promptly, and will not pursue or support
          legal action against you for that research.
        </p>
        <p>
          Good faith means: you do not access, modify, exfiltrate or retain data beyond what is necessary to demonstrate
          the issue; you do not degrade service for other users; you do not exploit the issue beyond proof of concept;
          and you report promptly and do not disclose publicly before remediation or mutual agreement.
        </p>
        <p>
          This commitment does not bind any third party and does not waive any right with respect to activity that falls
          outside it.
        </p>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "Coordinated disclosure",
    body: (
      <>
        <p>
          We prefer coordinated disclosure. We will agree a publication date with the reporter once remediation is
          available, and we will credit the reporter where they wish to be credited. If an issue is being exploited in
          the wild, we may publish defensive guidance earlier and will tell the reporter that we are doing so.
        </p>
      </>
    ),
  },
];

export default function SecurityPage() {
  return (
    <InstitutionalDocLayout
      category="TRUST"
      title="Trust, Security &amp; Disclosure"
      summary="Platform security architecture, the read/write boundary, and a formal vulnerability disclosure policy with safe harbor."
      sections={sections}
      statusSlot={<PipelineHealthBadge />}
    />
  );
}
