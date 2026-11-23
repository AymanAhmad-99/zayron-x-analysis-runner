import { CompanyPage } from "../../components/CompanyPage";

export default function AboutPage() {
  return (
    <CompanyPage
      eyebrow="COMPANY / ABOUT"
      title="About ZAYRON-X"
      intro="ZAYRON-X builds evidence-driven cyber threat intelligence for defenders."
    >
      <section id="mission" aria-labelledby="about-mission">
        <h2 id="about-mission">Mission</h2>
        <p>
          Help defenders see the threat clearly, understand the evidence behind it, and act with confidence — without
          mistaking a claim for a fact.
        </p>
      </section>

      <section id="philosophy" aria-labelledby="about-philosophy">
        <h2 id="about-philosophy">Product Philosophy</h2>
        <p>
          We separate what is observed from what is derived, inferred, or estimated. We preserve provenance, surface
          conflict rather than hiding it, and avoid presenting capability as execution or classification as attribution.
          This discipline is the product, not a disclaimer bolted onto it.
        </p>
      </section>

      <section id="evidence" aria-labelledby="about-evidence">
        <h2 id="about-evidence">Evidence Model</h2>
        <p>
          Our working rule is EVIDENCE → POLICY → CONTROL → VERIFICATION → PUBLIC CLAIM. Public statements are made only
          when they can be supported, and are qualified or omitted otherwise.
        </p>
      </section>

      <section id="research" aria-labelledby="about-research">
        <h2 id="about-research">Research Philosophy</h2>
        <p>
          We support legitimate defensive security research and coordinated disclosure. Advanced defensive work is
          permitted; malicious or unauthorized activity is not. See the{" "}
          <a href="/legal/acceptable-use">Acceptable Use Policy</a> and{" "}
          <a href="/legal/vulnerability-disclosure">Vulnerability Disclosure Policy</a>.
        </p>
      </section>

      <section id="organization" aria-labelledby="about-org">
        <h2 id="about-org">Organization</h2>
        <p className="legal-note">
          The ZAYRON-X operating entity is intended to be organized in Montana. Corporate details — legal name, form,
          office, and registration — are not yet verified and are not published until confirmed. See{" "}
          <a href="/legal/legal-notices">Legal Notices</a>.
        </p>
      </section>
    </CompanyPage>
  );
}
