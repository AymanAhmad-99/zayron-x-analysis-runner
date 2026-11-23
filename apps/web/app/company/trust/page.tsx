import { CompanyPage } from "../../components/CompanyPage";
import { legalDocumentBySlug } from "../../lib/legal/documents";

const legal = (slug: string) => `/legal/${slug}`;

export default function TrustCenterPage() {
  return (
    <CompanyPage
      eyebrow="COMPANY / TRUST CENTER"
      title="Trust Center"
      intro="A factual account of how ZAYRON-X handles security, privacy, and data — including what we do not yet claim. Every statement here is intended to be supportable by evidence."
    >
      <section id="security" aria-labelledby="trust-security">
        <h2 id="trust-security">Security</h2>
        <p>
          We separate production and preview environments, gate internal interfaces, and freeze production write
          surfaces. We disclose known limitations rather than overstate controls. Full detail is in the{" "}
          <a href={legal("security")}>{legalDocumentBySlug.security.title}</a>.
        </p>
      </section>

      <section id="privacy" aria-labelledby="trust-privacy">
        <h2 id="trust-privacy">Privacy</h2>
        <p>
          We process the minimum needed and do not sell personal information or share it for advertising. Our{" "}
          <a href={legal("privacy")}>{legalDocumentBySlug.privacy.title}</a> describes exactly what is and is not
          processed today, including the absence of customer accounts and analytics.
        </p>
      </section>

      <section id="data-handling" aria-labelledby="trust-data">
        <h2 id="trust-data">Data Handling</h2>
        <ul>
          <li>Enterprise processing terms are set out in our draft <a href={legal("dpa")}>{legalDocumentBySlug.dpa.title}</a>.</li>
          <li>Cookies and tracking are described in the <a href={legal("cookies")}>{legalDocumentBySlug.cookies.title}</a>.</li>
          <li>Handling of malware-related material follows our <a href={legal("malware-research")}>{legalDocumentBySlug["malware-research"].title}</a>.</li>
        </ul>
      </section>

      <section id="infrastructure" aria-labelledby="trust-infra">
        <h2 id="trust-infra">Infrastructure</h2>
        <p>
          The Services run on a serverless edge platform. Our only verified subprocessor is Cloudflare, listed in the{" "}
          <a href={legal("subprocessors")}>{legalDocumentBySlug.subprocessors.title}</a>.
        </p>
      </section>

      <section id="vulnerability-disclosure" aria-labelledby="trust-vdp">
        <h2 id="trust-vdp">Vulnerability Disclosure</h2>
        <p>
          We welcome good-faith security research. Scope, expectations, and our carefully scoped safe-harbor statement
          are in the <a href={legal("vulnerability-disclosure")}>{legalDocumentBySlug["vulnerability-disclosure"].title}</a>.
        </p>
      </section>

      <section id="compliance" aria-labelledby="trust-compliance">
        <h2 id="trust-compliance">Compliance Posture</h2>
        <p>
          <strong>No certifications, attestations, or audits are claimed.</strong> ZAYRON-X does not currently hold SOC 2,
          ISO 27001, PCI DSS, HIPAA, FedRAMP, or HITRUST certification or attestation, and we do not present readiness as
          achievement. Where a status is shown, the following vocabulary is used precisely and is not interchangeable:
        </p>
        <dl>
          <dt>CERTIFIED</dt>
          <dd>An independent certification has been issued and can be evidenced. Not currently applicable.</dd>
          <dt>ATTESTED</dt>
          <dd>An independent attestation report has been issued. Not currently applicable.</dd>
          <dt>AUDITED</dt>
          <dd>An independent audit has been completed. Not currently applicable.</dd>
          <dt>ALIGNED</dt>
          <dd>Practices are designed with reference to a standard. Used only where specifically evidenced.</dd>
          <dt>READINESS</dt>
          <dd>Preparation toward a future assessment. Not a claim of achievement.</dd>
          <dt>IN PROGRESS</dt>
          <dd>Work underway, not complete.</dd>
          <dt>PLANNED</dt>
          <dd>Intended for the future, not started.</dd>
        </dl>
      </section>

      <section id="documents" aria-labelledby="trust-docs">
        <h2 id="trust-docs">Enterprise Documentation</h2>
        <ul>
          <li><a href={legal("dpa")}>Data Processing Addendum (draft template)</a></li>
          <li><a href={legal("subprocessors")}>Subprocessors</a></li>
          <li><a href={legal("export-controls")}>{legalDocumentBySlug["export-controls"].title}</a></li>
          <li><a href={legal("copyright")}>{legalDocumentBySlug.copyright.title}</a></li>
        </ul>
      </section>

      <section id="questionnaires" aria-labelledby="trust-questionnaires">
        <h2 id="trust-questionnaires">Security Questionnaires</h2>
        <p>
          We respond to enterprise security and privacy questionnaires. Send requests to{" "}
          <a href="mailto:enterprise@zayron-x.co">enterprise@zayron-x.co</a>. Responses reflect verified controls and
          disclosed limitations.
        </p>
      </section>

      <section id="contact" aria-labelledby="trust-contact">
        <h2 id="trust-contact">Contact</h2>
        <ul>
          <li>Support, privacy, security reports, abuse: <a href="mailto:support@zayron-x.co">support@zayron-x.co</a></li>
          <li>Enterprise, procurement, DPA, questionnaires: <a href="mailto:enterprise@zayron-x.co">enterprise@zayron-x.co</a></li>
        </ul>
      </section>
    </CompanyPage>
  );
}
