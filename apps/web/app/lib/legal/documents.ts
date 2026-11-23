import type { LegalDocument } from "./types";

/**
 * ZAYRON-X policy content.
 *
 * Authoring rules enforced here:
 *  - Every statement is supportable by the Phase A read-only audit or is
 *    explicitly qualified. Nothing is asserted as an achieved fact without
 *    evidence.
 *  - No fabricated entity name, address, EIN, agent, certification, audit,
 *    subprocessor, PGP key, SLA, retention period, or legal safe harbor.
 *  - This initial set is DRAFT / PENDING_COUNSEL_REVIEW. It is not counsel
 *    advice and is not approved for production publication until reviewed.
 *
 * Shared facts (Phase A, VERIFIED):
 *  - Public domain: https://zayron-x.co
 *  - Two operational public mailboxes only: support@zayron-x.co,
 *    enterprise@zayron-x.co
 *  - No customer accounts, subscriptions, or payment records are stored.
 *  - No completed checkout; no payment processor is integrated.
 *  - No first-party analytics identifiers, cookies, or local/session storage
 *    are set by the web application.
 *  - Cloudflare is the only verified subprocessor of the data the platform
 *    actually stores.
 *  - No public PGP key, no security SLA, and no DMCA designated agent exist.
 */

const VERSION = "0.9.1-draft";
const EFFECTIVE = "Not yet in effect — pending counsel review";
const UPDATED = "2026-10-04";
const APPLIES_TO = "Visitors and users of zayron-x.co and the ZAYRON-X intelligence services";
const ENTITY = "the ZAYRON-X operating entity (legal name, form, and Montana registration pending — see Legal Notices)";

export const legalDocuments: LegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    purpose:
      "These Terms govern access to and use of the ZAYRON-X website, intelligence services, and related materials, and form a binding agreement between you and ZAYRON-X.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["acceptable-use", "privacy", "intelligence-disclaimer", "refunds"],
    sections: [
      {
        id: "agreement",
        heading: "1. Agreement and Acceptance",
        blocks: [
          { kind: "p", text: "By accessing or using the services made available at zayron-x.co (the \"Services\"), you agree to these Terms of Service (\"Terms\"). If you do not agree, do not use the Services. If you use the Services on behalf of an organization, you represent that you are authorized to bind that organization to these Terms." },
          { kind: "p", text: "These Terms are provided by " + ENTITY + ". Because the entity is not yet formed, some corporate details are placeholders and will be updated once verified; see Legal Notices." },
        ],
      },
      {
        id: "definitions",
        heading: "2. Definitions",
        blocks: [
          { kind: "p", text: "\"Services\" means the ZAYRON-X website, intelligence services, and related materials made available at zayron-x.co." },
          { kind: "p", text: "\"Content\" means software, documentation, intelligence, reports, and other material made available through the Services." },
          { kind: "p", text: "\"Intelligence\" means information about vulnerabilities, malware, exploits, threat actors, campaigns, indicators, and related analysis, including source-derived facts and derived or inferred statements." },
          { kind: "p", text: "\"Artifact\" means a file, sample, or derived object referenced by Intelligence, including metadata and extracted strings." },
          { kind: "p", text: "\"you\" and \"your\" mean the individual or organization accessing the Services; \"we\", \"us\", and \"ZAYRON-X\" mean " + ENTITY + "." },
        ],
      },
      {
        id: "eligibility",
        heading: "3. Eligibility",
        blocks: [
          { kind: "p", text: "You must be at least 16 years old to use the Services, and at least the age of legal majority in your jurisdiction to enter into these Terms. The Services are not directed to children. We do not knowingly collect personal information from children." },
          { kind: "p", text: "You may not use the Services if you are barred under applicable law, including applicable export-control or sanctions laws (see Export Controls & Sanctions)." },
        ],
      },
      {
        id: "accounts",
        heading: "4. Accounts",
        blocks: [
          { kind: "note", text: "Current state (verified): the Services do not currently offer self-service account registration, login, subscriptions, or checkout. No customer account data is stored. Sections describing accounts apply if and when those features are introduced, and will be updated at that time." },
          { kind: "p", text: "Where account features are later made available, you are responsible for the confidentiality of your credentials and for all activity under your account, and you agree to provide accurate information and promptly notify us of unauthorized use." },
        ],
      },
      {
        id: "authorized-use",
        heading: "5. Authorized Use",
        blocks: [
          { kind: "p", text: "Subject to these Terms and the Acceptable Use Policy, ZAYRON-X grants you a limited, revocable, non-exclusive, non-transferable right to access and use the Services for lawful defensive security, threat intelligence, research, educational, and evaluation purposes." },
          { kind: "ul", items: [
            "You may access publicly available intelligence through the website and public interfaces.",
            "You must comply with any published access limits and authentication requirements.",
            "You may not circumvent technical or contractual access controls.",
          ] },
        ],
      },
      {
        id: "prohibited",
        heading: "6. Prohibited Conduct",
        blocks: [
          { kind: "p", text: "You must comply with the Acceptable Use Policy. In summary, you may not use the Services to conduct unauthorized access, malware or ransomware operations, phishing, botnet activity, denial-of-service, unauthorized scanning or exploitation, data exfiltration, unlawful automated collection, or any activity that violates applicable law, including export-control and sanctions laws." },
        ],
      },
      {
        id: "intelligence",
        heading: "7. Intelligence Content",
        blocks: [
          { kind: "p", text: "The Services provide threat intelligence that may be sourced from third parties, produced by automated or machine-assisted analysis, and subject to uncertainty, revision, or error. Intelligence is provided for informational and defensive purposes only and is not a substitute for independent professional judgment. See the Intelligence Content Disclaimer." },
        ],
      },
      {
        id: "malware",
        heading: "8. Malware-Related Content",
        blocks: [
          { kind: "p", text: "Some material relates to malware and other potentially harmful artifacts, metadata, indicators, and analytical findings. Such material is provided solely for legitimate defensive security research, detection, incident response, education, and threat-intelligence purposes, and is subject to the Malware Research & Content Handling Policy. You are responsible for handling any such material safely and lawfully." },
        ],
      },
      {
        id: "api",
        heading: "9. APIs and Automation",
        blocks: [
          { kind: "p", text: "Access to programmatic interfaces is subject to the Acceptable Use Policy and to any published rate limits. You may not use automated means to exceed rate limits, to redistribute bulk content except as permitted, or to build a competing service from extracted content." },
        ],
      },
      {
        id: "ip",
        heading: "10. Intellectual Property",
        blocks: [
          { kind: "p", text: "The Services, including software, documentation, design, report structure, databases, and analytical outputs, are owned by ZAYRON-X or its licensors and are protected by intellectual-property laws. Third-party content and data sources remain the property of their respective owners. See the Copyright & Intellectual Property Policy." },
        ],
      },
      {
        id: "availability",
        heading: "11. Availability, Maintenance, and Changes",
        blocks: [
          { kind: "p", text: "The Services are provided on an \"as available\" basis. We may modify, suspend, or discontinue all or part of the Services, and may perform maintenance, with or without notice, except where a separate written agreement provides otherwise. We do not promise any specific uptime or service level unless set out in a signed agreement." },
        ],
      },
      {
        id: "disclaimers",
        heading: "12. Disclaimers",
        blocks: [
          { kind: "p", text: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICES AND ALL CONTENT ARE PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT INTELLIGENCE IS COMPLETE, CURRENT, ACCURATE, OR SUITABLE FOR ANY PARTICULAR DECISION." },
        ],
      },
      {
        id: "liability",
        heading: "13. Limitation of Liability",
        blocks: [
          { kind: "p", text: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ZAYRON-X WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO THE SERVICES. OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIM WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO ZAYRON-X FOR THE SERVICES IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS. Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you." },
        ],
      },
      {
        id: "indemnity",
        heading: "14. Indemnification",
        blocks: [
          { kind: "p", text: "To the extent permitted by law, you agree to indemnify and hold harmless ZAYRON-X from third-party claims arising from your misuse of the Services or your violation of these Terms or applicable law, subject to applicable limitations and defenses." },
        ],
      },
      {
        id: "governing-law",
        heading: "15. Governing Law and Dispute Resolution",
        blocks: [
          { kind: "note", text: "Pending counsel review. The choice of governing law, venue, arbitration, and class-action terms is a legal decision that depends on the final entity formation and is intentionally not asserted here." },
          { kind: "p", text: "Once reviewed, this section will state the governing law and dispute-resolution mechanism. Nothing in these Terms limits rights that cannot lawfully be waived." },
        ],
      },
      {
        id: "general",
        heading: "16. General Provisions",
        blocks: [
          { kind: "ul", items: [
            "Severability: if a provision is unenforceable, the remainder stays in effect.",
            "Assignment: you may not assign these Terms without our consent; we may assign them in a corporate transaction.",
            "Force majeure: neither party is liable for delays caused by events beyond reasonable control.",
            "No waiver: failure to enforce a provision is not a waiver.",
            "Entire agreement: these Terms and the referenced policies are the entire agreement on this subject.",
            "Electronic contracting: you agree that electronic acceptance is valid.",
            "Notices: legal notices may be sent to the addresses in Contact.",
            "Survival: provisions that by their nature should survive termination will survive.",
          ] },
        ],
      },
      {
        id: "changes",
        heading: "17. Changes to These Terms",
        blocks: [
          { kind: "p", text: "We may update these Terms. Material changes will be reflected by a new version and effective date. Continued use after an update constitutes acceptance where permitted by law. Because these Terms are not yet in effect, no such prior version exists to preserve." },
        ],
      },
      {
        id: "contact",
        heading: "18. Contact",
        blocks: [
          { kind: "p", text: "Questions about these Terms: support@zayron-x.co. Enterprise and procurement matters: enterprise@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    purpose:
      "This Privacy Policy explains what information ZAYRON-X processes, why, how it is protected, and the rights available to individuals.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["cookies", "subprocessors", "dpa", "security"],
    sections: [
      {
        id: "scope",
        heading: "1. Scope",
        blocks: [
          { kind: "p", text: "This Policy describes how ZAYRON-X processes information in connection with the website at zayron-x.co and the intelligence services. It does not apply to third-party sites or services we link to." },
        ],
      },
      {
        id: "current-state",
        heading: "2. What We Process Today (Plain Statement)",
        blocks: [
          { kind: "p", text: "We describe reality, not a future roadmap. As of the last update, based on our internal audit:" },
          { kind: "ul", items: [
            "We do not operate customer self-service accounts, subscriptions, or checkout, and we store no customer account, billing, or organization records.",
            "The website does not set first-party analytics identifiers or non-essential cookies, and does not use browser local or session storage for tracking.",
            "The public contact form on the website does not currently transmit or store the values you enter. Because of that limitation we do not describe the form as delivering a message; see Contact.",
            "We process threat-intelligence data, some of which may incidentally contain personal information (for example, an email address or handle appearing in a research source), as described below.",
          ] },
        ],
      },
      {
        id: "categories",
        heading: "3. Categories of Information",
        blocks: [
          { kind: "p", text: "Depending on how you interact with us, the following categories may be processed:" },
          { kind: "ul", items: [
            "Intelligence and research data: vulnerabilities, indicators, malware metadata and derived artifacts, source messages, and analytical outputs. Such data is primarily non-personal but may incidentally contain personal information.",
            "Correspondence: content you send to our public mailboxes.",
            "Technical and security data: information processed by our infrastructure provider as part of operating and protecting the Services, such as IP and network metadata. See Subprocessors.",
          ] },
        ],
      },
      {
        id: "purposes",
        heading: "4. Purposes and Legal Bases",
        blocks: [
          { kind: "p", text: "We process information to provide and secure the Services, to conduct and publish defensive security research, to respond to communications, and to comply with law. Where a legal basis is required, we rely on one or more of: performance of a contract; our legitimate interests in operating a secure threat-intelligence service and conducting defensive security research; compliance with legal obligations; and, where required, consent." },
          { kind: "note", text: "Legitimate interests are applied to specific purposes, not as a blanket basis. Where we rely on legitimate interests, we consider necessity and proportionality. The specific basis for each processing activity is recorded in our internal data-processing register." },
        ],
      },
      {
        id: "minimization",
        heading: "5. Data Minimization and Purpose Limitation",
        blocks: [
          { kind: "p", text: "We seek to collect the minimum information needed for the stated purposes and to use it only for those purposes. Where data is not needed, we do not collect it; the absence of account, billing, and analytics processing above reflects that principle." },
        ],
      },
      {
        id: "malware-personal",
        heading: "6. Personal Information in Technical Artifacts",
        blocks: [
          { kind: "p", text: "Defensive security material may incidentally contain personal information, such as an email address, username, or handle embedded in a source message or sample-derived string. We distinguish four origins: publicly available intelligence; third-party sourced material; personal information incidentally embedded in technical artifacts; and information provided directly to us. Where such information appears, we aim to present it in a research context and to avoid unnecessary emphasis on individuals." },
        ],
      },
      {
        id: "sensitive",
        heading: "7. Sensitive Data",
        blocks: [
          { kind: "p", text: "We do not deliberately collect sensitive categories of personal data (such as precise geolocation, health, biometric, or protected-classification data) as part of the Services. If such data is incidentally present in research material, it is handled under our security and research controls." },
        ],
      },
      {
        id: "children",
        heading: "8. Children",
        blocks: [
          { kind: "p", text: "The Services are not directed to children, and we do not knowingly collect personal information from children. If you believe a child has provided personal information, contact support@zayron-x.co." },
        ],
      },
      {
        id: "cookies",
        heading: "9. Cookies and Similar Technologies",
        blocks: [
          { kind: "p", text: "The website does not currently set first-party tracking cookies or non-essential analytics identifiers. Our infrastructure provider may set strictly necessary security cookies as part of serving traffic. See the Cookie Policy." },
        ],
      },
      {
        id: "disclosure",
        heading: "10. Disclosures and Sharing",
        blocks: [
          { kind: "p", text: "We do not sell personal information, and we do not share it for cross-context behavioral advertising. We use service providers to operate the Services (currently, our cloud infrastructure provider) and may disclose information where required by law or to protect the Services. See Subprocessors." },
        ],
      },
      {
        id: "subprocessors",
        heading: "11. Service Providers",
        blocks: [
          { kind: "p", text: "We use a limited set of providers to operate the Services. Cloudflare is the only verified provider that processes the data we actually store. Providers are bound by confidentiality and security obligations. See the Subprocessors Directory and the Data Processing Addendum." },
        ],
      },
      {
        id: "retention",
        heading: "12. Retention",
        blocks: [
          { kind: "note", text: "We do not publish specific retention periods that are not yet established. Retention is being defined in our internal retention register; until then, we state that we retain information only as long as needed for the stated purposes, legal obligations, or the exercise or defense of legal claims." },
        ],
      },
      {
        id: "security",
        heading: "13. Security",
        blocks: [
          { kind: "p", text: "We apply technical and organizational measures to protect information, including environment separation between production and preview systems and access controls on internal interfaces. We do not claim certifications we do not hold. See the Security Policy for a factual account, including known limitations." },
        ],
      },
      {
        id: "transfers",
        heading: "14. International Transfers",
        blocks: [
          { kind: "p", text: "Our infrastructure provider operates a global network, so data may be processed in multiple regions. Where a transfer mechanism is legally required, we will rely on an appropriate mechanism. The specific mechanism is recorded in our internal applicability and transfer documentation and is subject to counsel review." },
        ],
      },
      {
        id: "rights",
        heading: "15. Your Rights",
        blocks: [
          { kind: "p", text: "Depending on where you live and whether a privacy law applies, you may have rights to access, correct, delete, obtain a copy of, or object to certain processing of your personal information, and to appeal a refusal. Because we do not operate accounts, most such requests will relate to correspondence or research material." },
          { kind: "p", text: "To make a request, contact support@zayron-x.co. We will acknowledge and process requests in accordance with applicable law, and may need to verify your identity. Because we do not sell or share personal information, a Global Privacy Control signal requires no opt-out action on our part at this time; if our practices change, we will support applicable opt-out signals." },
        ],
      },
      {
        id: "legal-requests",
        heading: "16. Legal Requests",
        blocks: [
          { kind: "p", text: "We may disclose information in response to valid legal process, to protect rights and safety, or in a corporate transaction, as required or permitted by law. We do not publish a transparency report, and we do not promise to notify individuals of every legal request." },
        ],
      },
      {
        id: "changes",
        heading: "17. Changes to This Policy",
        blocks: [
          { kind: "p", text: "We may update this Policy. Material changes will be reflected by a new version and effective date. Where required, we will provide additional notice." },
        ],
      },
      {
        id: "contact",
        heading: "18. Contact",
        blocks: [
          { kind: "p", text: "Privacy requests and questions: support@zayron-x.co. Enterprise privacy and data-protection matters: enterprise@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    purpose:
      "This Policy defines permitted and prohibited use of the ZAYRON-X Services, and draws a clear line between authorized defensive security work and malicious or unauthorized activity.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["terms", "vulnerability-disclosure", "export-controls", "malware-research"],
    sections: [
      {
        id: "purpose",
        heading: "1. Purpose",
        blocks: [
          { kind: "p", text: "The Services support defensive security, threat intelligence, and research. This Policy exists to prevent misuse while preserving legitimate, advanced security research. It is part of, and incorporated into, the Terms of Service." },
        ],
      },
      {
        id: "authorized",
        heading: "2. Authorized Defensive Security Research",
        blocks: [
          { kind: "p", text: "Legitimate defensive security research is permitted. This includes analyzing threats, building detections, validating vulnerabilities in systems you own or are authorized to test, and conducting coordinated research that respects the law and the rights of others." },
        ],
      },
      {
        id: "prohibited",
        heading: "3. Prohibited Conduct",
        blocks: [
          { kind: "p", text: "You may not use the Services to engage in, facilitate, or provide material support for:" },
          { kind: "ul", items: [
            "Unauthorized access to systems, accounts, or data, or credential theft;",
            "Developing, deploying, distributing, or operating malware or ransomware;",
            "Phishing, social engineering for malicious purposes, or fraud;",
            "Botnet command and control or participation;",
            "Unauthorized scanning, exploitation, or destructive testing of third-party systems;",
            "Denial-of-service or traffic-amplification activity;",
            "Exfiltration or unlawful monetization of data;",
            "Circumventing rate limits, access controls, or authentication;",
            "Unlawful automated collection, scraping, or bulk redistribution;",
            "Unlawful surveillance or tracking of individuals;",
            "Abuse of other users, infrastructure, or providers;",
            "Violations of export-control or sanctions laws;",
            "Any activity that violates applicable law.",
          ] },
        ],
      },
      {
        id: "api-limits",
        heading: "4. API and Automation Limits",
        blocks: [
          { kind: "p", text: "Automated access must respect published rate limits and authentication requirements. You may not use automation to overwhelm, probe, or degrade the Services, or to reconstruct a substantially similar dataset for redistribution." },
        ],
      },
      {
        id: "handling",
        heading: "5. Handling of Sensitive Material",
        blocks: [
          { kind: "p", text: "Where the Services provide indicators, metadata, or artifacts, you must handle them safely and lawfully. You are responsible for containment and for complying with any applicable laws regarding malware and controlled technology." },
        ],
      },
      {
        id: "enforcement",
        heading: "6. Enforcement",
        blocks: [
          { kind: "p", text: "We may suspend or terminate access, and may report unlawful activity to appropriate authorities, where we reasonably believe this Policy has been violated. Where a report concerns a security vulnerability in our own Services, the Vulnerability Disclosure Policy applies instead." },
        ],
      },
      {
        id: "contact",
        heading: "7. Reporting Abuse",
        blocks: [
          { kind: "p", text: "Report abuse or misuse to support@zayron-x.co. Enterprise matters: enterprise@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    purpose:
      "This Policy describes the cookies and similar technologies used by the ZAYRON-X website and the choices available to you.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: "Visitors to zayron-x.co",
    related: ["privacy", "security"],
    sections: [
      {
        id: "what",
        heading: "1. What Cookies Are",
        blocks: [
          { kind: "p", text: "Cookies are small text files stored by your browser. Similar technologies include local storage and pixel tags." },
        ],
      },
      {
        id: "current",
        heading: "2. Cookies We Use Today",
        blocks: [
          { kind: "p", text: "The ZAYRON-X web application does not currently set first-party tracking or analytics cookies and does not use browser local or session storage for tracking. Our infrastructure provider may set strictly necessary security cookies to protect and operate the site." },
        ],
      },
      {
        id: "categories",
        heading: "3. Categories",
        blocks: [
          { kind: "table", head: ["Category", "Purpose", "Status"], rows: [
            ["Strictly necessary", "Security and delivery by the infrastructure provider", "In use"],
            ["Preference", "Remembering choices", "Not used"],
            ["Analytics", "Understanding usage", "Not used"],
            ["Advertising", "Cross-context advertising", "Not used"],
          ] },
        ],
      },
      {
        id: "consent",
        heading: "4. Consent",
        blocks: [
          { kind: "p", text: "Where a law requires consent for non-essential cookies and tracking, we will obtain it before setting such technologies and provide an easy way to withdraw it. We will not bundle optional consent into acceptance of the Terms. Because we do not currently use non-essential cookies, no consent banner is required at this time." },
        ],
      },
      {
        id: "control",
        heading: "5. Managing Cookies",
        blocks: [
          { kind: "p", text: "You can control cookies through your browser settings. Blocking strictly necessary cookies may affect site functionality." },
        ],
      },
      {
        id: "contact",
        heading: "6. Contact",
        blocks: [
          { kind: "p", text: "Questions: support@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "security",
    title: "Security Policy",
    purpose:
      "This Policy states, factually, the security measures ZAYRON-X implements, and the limitations it does not overstate.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["vulnerability-disclosure", "privacy", "subprocessors"],
    sections: [
      {
        id: "approach",
        heading: "1. Approach",
        blocks: [
          { kind: "p", text: "We describe only verified controls. Where a control is partial or in progress, we say so. We do not claim certifications, audits, or guarantees we cannot evidence." },
        ],
      },
      {
        id: "verified",
        heading: "2. Verified Controls",
        blocks: [
          { kind: "ul", items: [
            "Environment separation: production and preview run as distinct workers with separate databases, queues, and service bindings.",
            "Write-surface hardening: production mutation endpoints are gated by a freeze control.",
            "Internal-token gating: internal knowledge and research endpoints require a shared internal token.",
            "Read gating: canonical malware reports are served through a dedicated read gate.",
            "Transport: traffic is served over HTTPS via our infrastructure provider.",
          ] },
        ],
      },
      {
        id: "limitations",
        heading: "3. Known Limitations",
        blocks: [
          { kind: "p", text: "In the interest of accuracy, we note material limitations that are tracked and being addressed:" },
          { kind: "ul", items: [
            "Some administrative and mutation endpoints are not yet protected by an application-level authentication layer.",
            "Cross-origin resource sharing is currently permissive and is being restricted.",
            "Application-level rate limiting is not yet implemented.",
            "A formal incident-response, backup, and disaster-recovery program is not yet documented.",
            "No public API-key model is in place because the API is not currently sold.",
          ] },
          { kind: "note", text: "These limitations are recorded in our internal security and legal blockers register. This Policy will be revised as controls are verified." },
        ],
      },
      {
        id: "malware-handling",
        heading: "4. Malware Handling",
        blocks: [
          { kind: "p", text: "We treat the extraction of metadata, strings, and indicators from submitted or sourced artifacts as distinct from executing them: EXTRACT is not EXECUTE. We do not claim a blanket \"zero execution\" guarantee for every analysis path. Where any isolated analysis environment is used, it is described in the Malware Research & Content Handling Policy." },
        ],
      },
      {
        id: "reporting",
        heading: "5. Reporting Security Issues",
        blocks: [
          { kind: "p", text: "Report suspected vulnerabilities in our Services to support@zayron-x.co. See the Vulnerability Disclosure Policy for scope and expectations. No PGP key is currently published." },
        ],
      },
      {
        id: "disclosure",
        heading: "6. Disclosure",
        blocks: [
          { kind: "p", text: "We do not publish details that would create security risk for the Services or their users." },
        ],
      },
    ],
  },
  {
    slug: "vulnerability-disclosure",
    title: "Vulnerability Disclosure Policy",
    purpose:
      "This Policy sets out how security researchers can report vulnerabilities in ZAYRON-X systems in good faith, and what they can expect from us.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: "Security researchers and the public",
    related: ["security", "acceptable-use", "legal-notices"],
    sections: [
      {
        id: "commitment",
        heading: "1. Our Commitment",
        blocks: [
          { kind: "p", text: "We welcome good-faith security research on ZAYRON-X systems and will work with researchers to understand and address reported issues. This Policy describes the boundaries within which research is authorized." },
        ],
      },
      {
        id: "in-scope",
        heading: "2. In Scope",
        blocks: [
          { kind: "ul", items: [
            "The website at zayron-x.co and its public application.",
            "The public API endpoints under zayron-x.co/api.",
          ] },
        ],
      },
      {
        id: "out-of-scope",
        heading: "3. Out of Scope",
        blocks: [
          { kind: "ul", items: [
            "Third-party services and providers, including the underlying infrastructure provider;",
            "Social engineering, phishing, or physical attacks against staff or facilities;",
            "Denial-of-service or resource-exhaustion testing;",
            "Automated high-volume scanning that degrades the Services;",
            "Access to data of others, or retention of any data accessed beyond what is needed to report.",
          ] },
        ],
      },
      {
        id: "authorized",
        heading: "4. Authorized Research",
        blocks: [
          { kind: "p", text: "Research is authorized when conducted in good faith, within scope, without harming users or data, and in compliance with this Policy and applicable law. You must stop testing and report promptly if you access data that is not your own or an issue that creates risk." },
        ],
      },
      {
        id: "prohibited",
        heading: "5. Prohibited Research",
        blocks: [
          { kind: "p", text: "You may not access, modify, or delete data that is not yours; degrade or deny service; use social engineering; or exploit an issue beyond the minimum needed to demonstrate it. Do not test accounts or systems you do not own or control." },
        ],
      },
      {
        id: "sensitive-data",
        heading: "6. Sensitive Data and Credentials",
        blocks: [
          { kind: "p", text: "If you encounter personal data or credentials, do not access, copy, or retain more than necessary; do not share them; and report the exposure. Delete your copies once the report is resolved." },
        ],
      },
      {
        id: "report",
        heading: "7. How to Report",
        blocks: [
          { kind: "p", text: "Send reports to support@zayron-x.co. Include a clear description, reproduction steps, affected assets, potential impact, and any evidence needed to validate the issue. No PGP key is currently published; if you need an encrypted channel, ask and we will coordinate one." },
        ],
      },
      {
        id: "coordination",
        heading: "8. Coordination and Disclosure",
        blocks: [
          { kind: "p", text: "We will acknowledge reports and coordinate remediation and disclosure in good faith. We ask that you give us a reasonable opportunity to fix issues before public disclosure. We do not promise a fixed response or remediation deadline unless we confirm one for your specific report." },
        ],
      },
      {
        id: "safe-harbor",
        heading: "9. Safe Harbor and Limitations",
        blocks: [
          { kind: "note", text: "COUNSEL_REQUIRED: this is a carefully scoped good-faith statement, not unconditional immunity, and it is subject to counsel review. ZAYRON-X does not represent that it will never pursue legal action." },
          { kind: "p", text: "As a statement of policy intent, ZAYRON-X does not intend to pursue legal action against researchers who conduct research in good faith, within scope, and in accordance with this Policy, and it welcomes coordinated disclosure. This statement of intent is not a waiver or a guarantee. It does not apply to activity outside this Policy, to violations of law, to harm to third parties, users, or data, or to malicious, destructive, fraudulent, or extortive conduct. Nothing here binds third parties or waives rights that cannot lawfully be waived." },
        ],
      },
      {
        id: "contact",
        heading: "10. Contact",
        blocks: [
          { kind: "p", text: "Security reports: support@zayron-x.co. A machine-readable pointer is available at /.well-known/security.txt." },
        ],
      },
    ],
  },
  {
    slug: "copyright",
    title: "Copyright & Intellectual Property Policy",
    purpose:
      "This Policy explains ownership of ZAYRON-X content, the use of third-party material, and how to report alleged copyright infringement.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["terms", "legal-notices"],
    sections: [
      {
        id: "ownership",
        heading: "1. ZAYRON-X Intellectual Property",
        blocks: [
          { kind: "p", text: "The Services, including software, documentation, report structure, design, and analytical outputs, are owned by ZAYRON-X or its licensors. \"ZAYRON-X\" and associated logos are marks used by " + ENTITY + ". We do not claim federal registration of any mark unless and until registration is verified." },
        ],
      },
      {
        id: "third-party",
        heading: "2. Third-Party Content",
        blocks: [
          { kind: "p", text: "Intelligence incorporates material from third-party sources. We seek to preserve source attribution. Third-party content remains the property of its owners and is used under the terms, licenses, or lawful bases applicable to each source." },
        ],
      },
      {
        id: "attribution",
        heading: "3. Attribution",
        blocks: [
          { kind: "p", text: "Where we present source-derived facts, we aim to make provenance discoverable and to distinguish source facts from our own derivation and interpretation (see the Intelligence Content Disclaimer)." },
        ],
      },
      {
        id: "notices",
        heading: "4. Notices of Alleged Infringement",
        blocks: [
          { kind: "p", text: "If you believe content on the Services infringes your copyright, send a notice to support@zayron-x.co with: identification of the work; identification and location of the allegedly infringing material; your contact information; a statement of good-faith belief; a statement, under penalty of perjury, that the information is accurate and that you are authorized to act; and your physical or electronic signature." },
        ],
      },
      {
        id: "counter",
        heading: "5. Counter-Notices",
        blocks: [
          { kind: "p", text: "If your content was removed in error, you may submit a counter-notice to support@zayron-x.co consistent with applicable law. We will process counter-notices as required." },
        ],
      },
      {
        id: "repeat",
        heading: "6. Repeat Infringers",
        blocks: [
          { kind: "p", text: "Where applicable, we maintain a policy for handling repeat infringers." },
        ],
      },
      {
        id: "dmca-status",
        heading: "7. Digital Millennium Copyright Act (DMCA) Status",
        blocks: [
          { kind: "note", text: "We do not claim eligibility for DMCA §512 safe harbor merely because we host content. Whether that framework applies, and whether a designated agent is required, depends on statutory analysis and the final entity formation." },
          { kind: "p", text: "We have not designated a DMCA agent and do not publish a designated-agent address. A statutory-registration checklist is maintained internally and will be completed before any safe-harbor representation is made." },
        ],
      },
      {
        id: "contact",
        heading: "8. Contact",
        blocks: [
          { kind: "p", text: "IP and copyright matters: support@zayron-x.co. Licensing: enterprise@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "export-controls",
    title: "Export Controls & Sanctions Policy",
    purpose:
      "This Policy explains how ZAYRON-X approaches U.S. and other applicable export-control and sanctions obligations, which require legal review for specific transactions.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["terms", "acceptable-use", "legal-notices"],
    sections: [
      {
        id: "framework",
        heading: "1. Framework",
        blocks: [
          { kind: "p", text: "Applicable export-control obligations may arise under the laws and regulations of the jurisdiction governing an export, reexport, transfer, release, transaction, customer, end user, or end use. This Policy does not assert that ZAYRON-X is subject to, or exempt from, any particular control." },
        ],
      },
      {
        id: "us",
        heading: "2. U.S. Export Controls",
        blocks: [
          { kind: "p", text: "Certain cybersecurity software, technical data, and related technology may be subject to U.S. export controls, including the Export Administration Regulations (EAR). Encryption functionality and intrusion or forensics-related capabilities may require classification or authorization depending on the item, destination, end user, and end use. We treat export-control classification as a matter requiring legal or compliance review where applicable." },
        ],
      },
      {
        id: "international",
        heading: "3. International Arrangements",
        blocks: [
          { kind: "p", text: "International export-control regimes and national laws may reflect or implement controls influenced by international arrangements. The actual legal obligations arise under applicable national law, not from an international arrangement as a standalone universal law." },
        ],
      },
      {
        id: "sanctions",
        heading: "4. Sanctions and Restricted Parties",
        blocks: [
          { kind: "p", text: "We do not knowingly provide the Services to parties or for end uses prohibited by applicable sanctions. Access may be restricted based on jurisdiction, end user, or end use. We do not make guarantees about customer eligibility and may require additional information." },
        ],
      },
      {
        id: "restricted",
        heading: "5. Restricted Destinations, Parties, and Uses",
        blocks: [
          { kind: "ul", items: [
            "Restricted destinations and comprehensively sanctioned regions;",
            "Parties on applicable restricted-party lists;",
            "End uses prohibited by applicable law, including certain proliferation and military end uses.",
          ] },
        ],
      },
      {
        id: "customer",
        heading: "6. Customer Responsibilities",
        blocks: [
          { kind: "p", text: "You are responsible for complying with export-control and sanctions laws applicable to you, including any restrictions on reexport, transfer, or use of information you obtain. Do not access or use the Services in violation of those laws." },
        ],
      },
      {
        id: "review",
        heading: "7. Additional Review",
        blocks: [
          { kind: "p", text: "Where a service, artifact, software, or technical data could fall under applicable controls, additional legal or compliance review may be required before access or transfer." },
        ],
      },
      {
        id: "contact",
        heading: "8. Contact",
        blocks: [
          { kind: "p", text: "Export-control and sanctions questions: enterprise@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "ai",
    title: "AI Transparency & Responsible AI Policy",
    purpose:
      "This Policy explains where ZAYRON-X uses AI-assisted analysis, how AI relates to verified evidence, and the limits on relying on generated output.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["intelligence-disclaimer", "malware-research", "privacy"],
    sections: [
      {
        id: "principle",
        heading: "1. Central Principle",
        blocks: [
          { kind: "p", text: "AI interpretation does not override verified evidence. A generated statement is not authoritative merely because it is fluent or confident." },
        ],
      },
      {
        id: "where",
        heading: "2. Where AI Is Used",
        blocks: [
          { kind: "p", text: "ZAYRON-X uses automated and machine-assisted analysis to help summarize, classify, and correlate intelligence. Deterministic and rule-based processing and source-derived facts provide the foundation; AI-generated interpretation is assistive." },
        ],
      },
      {
        id: "distinctions",
        heading: "3. Processing Distinctions",
        blocks: [
          { kind: "ul", items: [
            "Deterministic/rule-based processing: fixed, reproducible logic.",
            "Source-derived facts: statements traceable to a source.",
            "Statistical/machine-learning analysis: probabilistic outputs.",
            "AI-generated interpretation: generated text or classification.",
            "Human/system validation: checks that constrain publication.",
          ] },
        ],
      },
      {
        id: "pipeline",
        heading: "4. Evidence to Action",
        blocks: [
          { kind: "p", text: "The architecture preserves the sequence EVIDENCE → UNDERSTANDING → ANALYSIS → CONFIDENCE → ACTION. Generative output is bounded by retrieved evidence and validation gates." },
        ],
      },
      {
        id: "models",
        heading: "5. Model Execution and Providers",
        blocks: [
          { kind: "p", text: "Model execution is performed through our cloud infrastructure provider's managed AI service. Model names may include third-party model families, but that does not mean data is sent directly to those vendors; we describe direct processors only where the runtime path is verified." },
        ],
      },
      {
        id: "hallucination",
        heading: "6. Hallucination Mitigation and Uncertainty",
        blocks: [
          { kind: "p", text: "We constrain generation to retrieved context, validate structured output, and surface uncertainty. Automated output that cannot be grounded may be withheld or labeled." },
        ],
      },
      {
        id: "attribution",
        heading: "7. Attribution Restrictions",
        blocks: [
          { kind: "p", text: "AI-assisted output must not be presented as proof of attribution. See the Intelligence Content Disclaimer for the distinction between capability, execution, and attribution." },
        ],
      },
      {
        id: "decisions",
        heading: "8. Automated Decisions",
        blocks: [
          { kind: "p", text: "The Services are not designed to make legal or similarly significant decisions about individuals, and we do not use personal data for automated decision-making with such effects." },
        ],
      },
      {
        id: "contact",
        heading: "9. Contact",
        blocks: [
          { kind: "p", text: "AI and methodology questions: support@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "malware-research",
    title: "Malware Research & Content Handling Policy",
    purpose:
      "This Policy describes how ZAYRON-X handles malware-related material and the epistemic limits that apply to analysis.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["intelligence-disclaimer", "ai", "security", "acceptable-use"],
    sections: [
      {
        id: "purpose",
        heading: "1. Purpose",
        blocks: [
          { kind: "p", text: "Malware-related material is provided solely for legitimate defensive security research, detection, incident response, education, and threat-intelligence purposes." },
        ],
      },
      {
        id: "types",
        heading: "2. Categories of Material",
        blocks: [
          { kind: "ul", items: [
            "Hashes, metadata, and file attributes;",
            "Static-analysis results, extracted strings, and decoded structure;",
            "Indicators: domains, URLs, IP addresses, and file paths;",
            "Detection and capability signals (for example, rule matches and capability annotations);",
            "Behavioral observations and configuration;",
            "Framework mappings and derived classifications;",
            "Provenance and source attribution.",
          ] },
        ],
      },
      {
        id: "downloads",
        heading: "3. Downloadable Content",
        blocks: [
          { kind: "note", text: "Current state: the public website does not offer downloadable malware binaries. If downloads are introduced, this Policy will be updated to state the safeguards and authorization requirements before any download surface is published." },
        ],
      },
      {
        id: "epistemic",
        heading: "4. Epistemic Rules",
        blocks: [
          { kind: "p", text: "The following distinctions are mandatory in how we present analysis:" },
          { kind: "ul", items: [
            "UNRESOLVED is not BENIGN;",
            "NO_RESULT is not ABSENCE;",
            "ERROR is not ABSENCE;",
            "UNAVAILABLE is not ABSENCE;",
            "NOT_PERFORMED is not a NEGATIVE FINDING;",
            "STATIC CAPABILITY is not OBSERVED EXECUTION;",
            "CAPABILITY is not INTENT;",
            "CLASSIFICATION is not ATTRIBUTION;",
            "ATTRIBUTION is not PROOF OF OPERATOR IDENTITY.",
          ] },
        ],
      },
      {
        id: "extract-execute",
        heading: "5. Extraction vs. Execution",
        blocks: [
          { kind: "p", text: "EXTRACT is not EXECUTE. We distinguish metadata extraction and static analysis from any execution. We do not claim a blanket \"zero execution\" guarantee for every analysis path; where an isolated environment is used, it is treated as a controlled analysis surface, not a promise about all processing." },
        ],
      },
      {
        id: "personal-data",
        heading: "6. Personal Information in Artifacts",
        blocks: [
          { kind: "p", text: "Samples and sources may incidentally contain personal information. We present such material in a research context and avoid unnecessary emphasis on individuals, consistent with the Privacy Policy." },
        ],
      },
      {
        id: "third-party",
        heading: "7. Third-Party Malware Sources",
        blocks: [
          { kind: "p", text: "Material may be obtained from third-party research sources. We preserve provenance and do not present third-party material as our own." },
        ],
      },
      {
        id: "contact",
        heading: "8. Contact",
        blocks: [
          { kind: "p", text: "Research and handling questions: support@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "dpa",
    title: "Data Processing Addendum",
    purpose:
      "This Data Processing Addendum (DPA) template governs the processing of personal data by ZAYRON-X on behalf of an enterprise customer, where the customer is a controller and ZAYRON-X is a processor.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: "Enterprise customers that execute this DPA with ZAYRON-X",
    related: ["privacy", "subprocessors", "security"],
    sections: [
      {
        id: "status",
        heading: "1. Status",
        blocks: [
          { kind: "note", text: "DRAFT / TEMPLATE. This document is not final and has not been approved by counsel. It becomes effective only when executed by both parties. Do not rely on it as executed terms until signed." },
        ],
      },
      {
        id: "roles",
        heading: "2. Roles",
        blocks: [
          { kind: "p", text: "Where a customer provides personal data and ZAYRON-X processes it solely to provide the Services, the customer is the controller and ZAYRON-X is the processor. Where ZAYRON-X determines the purposes and means for its own security research and service operation, ZAYRON-X acts as a controller." },
        ],
      },
      {
        id: "scope",
        heading: "3. Subject Matter, Nature, and Purpose",
        blocks: [
          { kind: "p", text: "The subject matter is the provision of threat-intelligence services. Processing consists of storing, analyzing, correlating, and displaying intelligence and related data, and supporting the Services." },
        ],
      },
      {
        id: "duration",
        heading: "4. Duration",
        blocks: [
          { kind: "p", text: "Processing continues for the term of the agreement between the parties, plus any period required by law or for the establishment, exercise, or defense of legal claims." },
        ],
      },
      {
        id: "data",
        heading: "5. Categories of Data and Data Subjects",
        blocks: [
          { kind: "p", text: "Categories of data and data subjects depend on the customer's use and are set out in an annex to the executed DPA. Because the Services currently store no customer account data, most enterprise processing relates to intelligence the customer supplies or accesses." },
        ],
      },
      {
        id: "instructions",
        heading: "6. Instructions",
        blocks: [
          { kind: "p", text: "ZAYRON-X processes personal data only on documented instructions from the customer, except where required by law, in which case we will inform the customer unless prohibited." },
        ],
      },
      {
        id: "confidentiality",
        heading: "7. Confidentiality",
        blocks: [
          { kind: "p", text: "Personnel authorized to process personal data are bound by confidentiality obligations." },
        ],
      },
      {
        id: "security",
        heading: "8. Security Measures",
        blocks: [
          { kind: "p", text: "We implement the measures described in the Security Policy, including environment separation and access controls, subject to the limitations disclosed there." },
        ],
      },
      {
        id: "subprocessors",
        heading: "9. Subprocessors",
        blocks: [
          { kind: "p", text: "The customer authorizes the use of the subprocessors listed in the Subprocessors Directory. We will provide notice of intended changes and an opportunity to object as set out in the executed DPA." },
        ],
      },
      {
        id: "transfers",
        heading: "10. International Transfers",
        blocks: [
          { kind: "p", text: "Where personal data is transferred internationally, the parties will rely on an appropriate transfer mechanism, with supplementary measures where required. The applicable mechanism is recorded in the executed DPA." },
        ],
      },
      {
        id: "incident",
        heading: "11. Incident Cooperation",
        blocks: [
          { kind: "p", text: "We will notify the customer without undue delay after becoming aware of a personal-data breach affecting customer data and will reasonably cooperate in the investigation and any required notifications." },
        ],
      },
      {
        id: "assistance",
        heading: "12. Data-Subject Assistance",
        blocks: [
          { kind: "p", text: "We will provide reasonable assistance to enable the customer to respond to data-subject requests and to meet impact-assessment and consultation obligations." },
        ],
      },
      {
        id: "deletion",
        heading: "13. Deletion and Return",
        blocks: [
          { kind: "p", text: "On termination, we will delete or return personal data at the customer's choice, except where retention is required by law. Retention periods for such data are set out in the executed DPA and our retention register." },
        ],
      },
      {
        id: "audits",
        heading: "14. Audits",
        blocks: [
          { kind: "p", text: "We will make available information reasonably necessary to demonstrate compliance and will allow audits at reasonable times and scope, subject to confidentiality and security constraints." },
        ],
      },
      {
        id: "contact",
        heading: "15. Contact",
        blocks: [
          { kind: "p", text: "To request an executable DPA: enterprise@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "subprocessors",
    title: "Subprocessors",
    purpose:
      "This page lists the verified subprocessors that process data on behalf of ZAYRON-X, and distinguishes subprocessors from data sources and infrastructure dependencies.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: "Enterprise customers and visitors",
    related: ["dpa", "privacy", "security"],
    sections: [
      {
        id: "definition",
        heading: "1. Definition",
        blocks: [
          { kind: "p", text: "A subprocessor is a service provider that processes personal data on ZAYRON-X's behalf. Only providers actually used for that purpose are listed. This page does not list data sources or infrastructure dependencies that do not process personal data on our behalf." },
        ],
      },
      {
        id: "current",
        heading: "2. Verified Subprocessors",
        blocks: [
          { kind: "table", head: ["Provider", "Service", "Processing Function", "Geography"], rows: [
            ["Cloudflare, Inc.", "Workers, D1, R2, Queues, Vectorize, Workers AI, Workflows", "Hosting, compute, storage, managed AI execution", "Global network"],
          ] },
          { kind: "p", text: "Cloudflare is currently the only verified subprocessor of the data ZAYRON-X actually stores." },
        ],
      },
      {
        id: "sources",
        heading: "3. Data Sources and Dependencies (Not Subprocessors)",
        blocks: [
          { kind: "p", text: "We use public and third-party sources to obtain intelligence, and coding or automation platforms to operate. These are not subprocessors because they do not process personal data on our behalf. Examples include public vulnerability and threat sources and messaging or code-hosting platforms used as data sources or tooling." },
        ],
      },
      {
        id: "changes",
        heading: "4. Changes",
        blocks: [
          { kind: "p", text: "We will update this page when subprocessors change. Enterprise customers will be given notice and an opportunity to object as provided in an executed DPA." },
        ],
      },
      {
        id: "contact",
        heading: "5. Contact",
        blocks: [
          { kind: "p", text: "Subprocessor questions: enterprise@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund, Cancellation & Billing Policy",
    purpose:
      "This Policy explains billing, cancellation, and refund terms. It reflects the current state: ZAYRON-X does not yet accept payments.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: "Users and prospective customers",
    related: ["terms", "privacy"],
    sections: [
      {
        id: "current",
        heading: "1. Current State",
        blocks: [
          { kind: "note", text: "ZAYRON-X does not currently operate checkout, billing, subscriptions, or a payment processor. No payments are accepted and no subscriptions are active. Any prices shown are indicative of planned offerings, not purchasable products, until checkout is implemented and this Policy is updated." },
        ],
      },
      {
        id: "no-payment",
        heading: "2. No Payment Accepted",
        blocks: [
          { kind: "p", text: "Because no payment mechanism exists, there are no charges, no recurring billing, no trials, and no cancellation of paid plans at this time. Do not send payment based on any pricing display." },
        ],
      },
      {
        id: "future",
        heading: "3. Future Billing Terms",
        blocks: [
          { kind: "p", text: "When billing is introduced, this Policy will state the accepted methods, renewal and cancellation terms, refund eligibility, and how to contact us. Those terms will be published before any charge is taken." },
        ],
      },
      {
        id: "contact",
        heading: "4. Contact",
        blocks: [
          { kind: "p", text: "Billing questions: enterprise@zayron-x.co. General support: support@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "intelligence-disclaimer",
    title: "Intelligence Content Disclaimer",
    purpose:
      "This Disclaimer explains the epistemic status of ZAYRON-X intelligence: what is observed, derived, inferred, and uncertain, and how it may be used.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["ai", "malware-research", "terms"],
    sections: [
      {
        id: "nature",
        heading: "1. Nature of Intelligence",
        blocks: [
          { kind: "p", text: "Intelligence may be incomplete, conflicting, stale, machine-assisted, probabilistic, or subject to later revision. It is provided for informational and defensive purposes and is not a substitute for your own judgment or for independent verification before an operational or legal decision." },
        ],
      },
      {
        id: "distinctions",
        heading: "2. Distinctions We Preserve",
        blocks: [
          { kind: "ul", items: [
            "OBSERVATION: something recorded from a source or artifact;",
            "DERIVED CLAIM: a statement produced by applying logic to observations;",
            "INFERENCE: a conclusion drawn from evidence;",
            "ESTIMATE: a probabilistic or scored value;",
            "CAPABILITY: what something could do;",
            "EXECUTION: evidence that something did run;",
            "ATTRIBUTION: an assessment of who is responsible;",
            "CONFIDENCE: a bounded expression of certainty.",
          ] },
          { kind: "p", text: "Capability is not execution. Classification is not attribution. Attribution is not proof of operator identity." },
        ],
      },
      {
        id: "sources",
        heading: "3. Sources and Derivation",
        blocks: [
          { kind: "p", text: "We distinguish source facts from our own derivation and interpretation, and we avoid silently merging conflicting source values into a false single authoritative value. Where sources conflict, we aim to show the conflict." },
        ],
      },
      {
        id: "limits",
        heading: "4. Limits",
        blocks: [
          { kind: "p", text: "Intelligence is not guaranteed to be complete, current, or error-free, and is not evidence that any person or organization has acted unlawfully." },
        ],
      },
      {
        id: "contact",
        heading: "5. Contact",
        blocks: [
          { kind: "p", text: "Questions or corrections: support@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "legal-notices",
    title: "Legal Notices",
    purpose:
      "This page provides the formal legal notices for ZAYRON-X, including entity information and contact details, with explicit placeholders where facts are not yet verified.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: APPLIES_TO,
    related: ["terms", "copyright", "export-controls"],
    sections: [
      {
        id: "entity",
        heading: "1. Legal Entity",
        blocks: [
          { kind: "note", text: "The ZAYRON-X operating entity is intended to be organized in the State of Montana. As of the last update, the entity is not yet formed and the following details are not verified: legal name, entity type, principal office, registered agent, and registration number. These placeholders will be replaced with verified information once formation is complete. This page does not publish an entity name, address, agent, or registration number that has not been confirmed." },
        ],
      },
      {
        id: "contact",
        heading: "2. Contact",
        blocks: [
          { kind: "ul", items: [
            "Support, privacy requests, security reports, abuse reports, and general operational notices: support@zayron-x.co",
            "Enterprise sales, procurement, contracts, licensing, DPA requests, security questionnaires, and partnerships: enterprise@zayron-x.co",
          ] },
        ],
      },
      {
        id: "marks",
        heading: "3. Trademarks",
        blocks: [
          { kind: "p", text: "\"ZAYRON-X\" is a mark used by " + ENTITY + ". We do not claim federal registration of any mark unless and until registration is verified." },
        ],
      },
      {
        id: "third-party",
        heading: "4. Third-Party Names",
        blocks: [
          { kind: "p", text: "Third-party names and marks referenced in our content are the property of their respective owners. References are for identification or attribution and do not imply endorsement, sponsorship, or affiliation unless expressly stated and verified." },
        ],
      },
      {
        id: "law",
        heading: "5. Governing Law",
        blocks: [
          { kind: "note", text: "Pending entity formation and counsel review. No governing law or venue is asserted here." },
        ],
      },
      {
        id: "reporting",
        heading: "6. Reporting",
        blocks: [
          { kind: "p", text: "To report abuse, copyright concerns, or security issues, use support@zayron-x.co." },
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    purpose:
      "This Statement describes ZAYRON-X's approach to accessibility and how to report barriers.",
    version: VERSION,
    status: "PENDING_COUNSEL_REVIEW",
    effectiveDate: EFFECTIVE,
    lastUpdated: UPDATED,
    appliesTo: "Visitors to zayron-x.co",
    related: ["privacy"],
    sections: [
      {
        id: "commitment",
        heading: "1. Commitment",
        blocks: [
          { kind: "p", text: "We aim to make the Services usable by as many people as possible, including people who use assistive technology. We design with semantic headings, keyboard navigation, visible focus, sufficient contrast, and responsive layouts." },
        ],
      },
      {
        id: "standard",
        heading: "2. Target Standard",
        blocks: [
          { kind: "p", text: "We aim to align with widely recognized accessibility guidance. We do not claim formal conformance certification, which would require verified testing we have not yet completed." },
        ],
      },
      {
        id: "known",
        heading: "3. Known Limitations",
        blocks: [
          { kind: "p", text: "Some interactive visualizations may present accessibility challenges. We are working to improve them and to provide accessible alternatives. This Statement will be updated as testing is completed." },
        ],
      },
      {
        id: "feedback",
        heading: "4. Feedback",
        blocks: [
          { kind: "p", text: "If you encounter an accessibility barrier, contact support@zayron-x.co with a description of the issue and the page involved." },
        ],
      },
    ],
  },
];

export const legalDocumentBySlug: Record<string, LegalDocument> = Object.fromEntries(
  legalDocuments.map((doc) => [doc.slug, doc]),
);

export const legalSlugs = legalDocuments.map((doc) => doc.slug);
