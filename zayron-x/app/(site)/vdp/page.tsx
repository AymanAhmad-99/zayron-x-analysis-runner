import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vulnerability Disclosure Policy',
  description: 'ZAYRON-X Vulnerability Disclosure Policy — responsible disclosure guidelines',
};

export default function VdpPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main id="main-content" className="max-w-[780px] mx-auto px-6 lg:px-10 py-16">
        <Link
          href="/"
          className="text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          ← ZAYRON-X HOME
        </Link>
        <h1 className="text-3xl font-black text-[#050505] dark:text-white mt-4 mb-2 tracking-tight">
          Vulnerability Disclosure Policy
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-12">
          Last updated: June 2, 2026
        </p>

        <div className="prose-zayron dark:prose-invert max-w-none">
          <h2>Our Commitment</h2>
          <p>
            ZAYRON-X Intelligence Corp. is committed to maintaining the security of our platform and
            protecting our users&apos; data. We value the security research community and believe
            that responsible disclosure of security vulnerabilities helps us keep our platform safe.
          </p>

          <h2>Scope</h2>
          <p>This policy applies to the following systems:</p>
          <ul>
            <li>
              <strong>zayron-x.com</strong> — Main web application
            </li>
            <li>
              <strong>api.zayron-x.com</strong> — Public API endpoints
            </li>
            <li>
              <strong>ZAYRON-X Cloudflare Workers</strong> — Edge compute infrastructure
            </li>
          </ul>
          <p>
            The following are <strong>out of scope</strong>:
          </p>
          <ul>
            <li>Social engineering attacks against employees</li>
            <li>Physical attacks against ZAYRON-X facilities</li>
            <li>Denial of Service (DoS/DDoS) attacks</li>
            <li>Third-party services not owned by ZAYRON-X (Supabase, Upstash, Google)</li>
          </ul>

          <h2>How to Report</h2>
          <p>
            Send vulnerability reports to:{' '}
            <a href="mailto:security@zayron-x.com">security@zayron-x.com</a>
          </p>
          <p>Please include:</p>
          <ul>
            <li>A detailed description of the vulnerability</li>
            <li>Steps to reproduce the issue</li>
            <li>The affected component or URL</li>
            <li>Your contact information for follow-up</li>
          </ul>
          <p>
            You may encrypt sensitive reports with our PGP key:{' '}
            <a href="/pgp-key.asc">Download PGP Key</a>
          </p>

          <h2>Safe Harbor</h2>
          <p>ZAYRON-X will not pursue legal action against researchers who:</p>
          <ul>
            <li>Report vulnerabilities in good faith</li>
            <li>Avoid privacy violations, data destruction, or service disruption</li>
            <li>Provide a reasonable time for remediation before public disclosure</li>
            <li>Comply with all applicable laws</li>
          </ul>

          <h2>Response Timeline</h2>
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Timeline</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Acknowledgment</td>
                <td>Within 48 hours</td>
              </tr>
              <tr>
                <td>Initial Triage</td>
                <td>Within 5 business days</td>
              </tr>
              <tr>
                <td>Remediation (Critical)</td>
                <td>Within 7 days</td>
              </tr>
              <tr>
                <td>Remediation (High)</td>
                <td>Within 30 days</td>
              </tr>
              <tr>
                <td>Remediation (Medium/Low)</td>
                <td>Within 90 days</td>
              </tr>
            </tbody>
          </table>

          <h2>Recognition</h2>
          <p>
            We maintain a Hall of Fame for researchers who responsibly disclose valid
            vulnerabilities. With your permission, we will acknowledge your contribution publicly.
          </p>

          <h2>Out of Scope Findings</h2>
          <p>The following are generally considered out of scope:</p>
          <ul>
            <li>Missing HTTP security headers (except CSP bypasses)</li>
            <li>Clickjacking on pages with no sensitive actions</li>
            <li>Self-XSS requiring user interaction to be exploited</li>
            <li>Rate limiting bypasses without demonstrated impact</li>
            <li>Theoretical vulnerabilities without a working proof of concept</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
