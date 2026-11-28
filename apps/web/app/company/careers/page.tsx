import type { Metadata } from "next";
import { CompanyPage } from "../../components/CompanyPage";

export const metadata: Metadata = {
  title: "Careers",
  robots: { index: false, follow: true },
};

export default function CareersPage() {
  return (
    <CompanyPage
      eyebrow="COMPANY / CAREERS"
      title="Careers"
      intro="We are building an evidence-driven threat-intelligence platform. We do not list roles that do not exist."
    >
      <section id="open-roles" aria-labelledby="careers-open">
        <h2 id="careers-open">Open Roles</h2>
        <p className="legal-note">
          There are no verified open positions at this time. We do not publish job listings to appear larger than we are.
        </p>
      </section>

      <section id="future" aria-labelledby="careers-future">
        <h2 id="careers-future">Future Opportunities</h2>
        <p>
          As the team grows, we expect to hire across threat research, detection engineering, platform engineering, and
          security operations. Roles will be posted here when they are genuine and open.
        </p>
      </section>

      <section id="general" aria-labelledby="careers-general">
        <h2 id="careers-general">General Talent Submission</h2>
        <p>
          You may introduce yourself at <a href="mailto:support@zayron-x.co">support@zayron-x.co</a> with a brief note on
          what you do and what you would like to work on. A submission is not an application for a specific role.
        </p>
      </section>
    </CompanyPage>
  );
}
