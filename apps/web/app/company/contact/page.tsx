import { CompanyPage } from "../../components/CompanyPage";

export default function ContactPage() {
  return (
    <CompanyPage
      eyebrow="COMPANY / CONTACT"
      title="Contact"
      intro="Two operational channels connect you to ZAYRON-X. Use the one that matches your need so your message reaches the right place."
    >
      <section id="support" aria-labelledby="contact-support">
        <h2 id="contact-support">Support</h2>
        <p>
          <a href="mailto:support@zayron-x.co">support@zayron-x.co</a>
        </p>
        <ul>
          <li>Technical support and account assistance</li>
          <li>Privacy requests and rights inquiries</li>
          <li>Security vulnerability reports</li>
          <li>Abuse reports and content concerns</li>
          <li>General operational and legal notices</li>
        </ul>
      </section>

      <section id="enterprise" aria-labelledby="contact-enterprise">
        <h2 id="contact-enterprise">Enterprise</h2>
        <p>
          <a href="mailto:enterprise@zayron-x.co">enterprise@zayron-x.co</a>
        </p>
        <ul>
          <li>Enterprise sales, licensing, and procurement</li>
          <li>Contracts and commercial discussions</li>
          <li>Data Processing Addendum (DPA) requests</li>
          <li>Security questionnaires</li>
          <li>Partnerships</li>
        </ul>
      </section>

      <section id="note" aria-labelledby="contact-note">
        <h2 id="contact-note">A note on the website form</h2>
        <p className="legal-note">
          The website contact form does not currently transmit or store submissions. Until it is connected to a working
          intake process, please contact us by email at the addresses above.
        </p>
      </section>
    </CompanyPage>
  );
}
