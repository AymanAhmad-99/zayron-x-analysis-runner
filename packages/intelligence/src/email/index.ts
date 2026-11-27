/**
 * PHASE 9C-MAIL-V2 — Shared Editorial Minimalist Email System.
 *
 * Exact visual parity with live zayron-x.co (`apps/web/app/globals.css` +
 * `design-tokens.css`):
 *   - Canvas:       #050505
 *   - Surface:      #0d0d0c
 *   - Border:       #282724
 *   - Primary text: #f7f7f4
 *   - Muted text:   #a5a39c
 *   - Subtle meta:  #77756f
 *   - Accent CTA:   #ff6b00 (text #100b07)
 *
 * Table-based HTML5 with 100% inline CSS (zero flexbox, zero grid, zero inline
 * <svg>), raster PNG logo, XSS-escaped fields, and matching plain textContent.
 */

export const ZX_SITE_ORIGIN = 'https://zayron-x.co';
export const ZX_API_ORIGIN = 'https://api.zayron-x.co';
export const ZX_EMAIL_LOGO_URL = `${ZX_SITE_ORIGIN}/brand/zayron-email-logo.png`;
export const ZX_UNSUBSCRIBE_BASE = `${ZX_API_ORIGIN}/api/v1/briefings/unsubscribe`;
export const ZX_TELEGRAM_URL = 'https://t.me/zayronxai';

/** Exact website design tokens from `apps/web/app/globals.css` & `design-tokens.css`. */
export const ZX_COLORS = {
  bg: '#050505',
  surface: '#0d0d0c',
  border: '#282724',
  text: '#f7f7f4',
  muted: '#a5a39c',
  subtle: '#77756f',
  accent: '#ff6b00',
  accentInk: '#100b07',
} as const;

/** Live free-tier contract matching `workers/api/src/apiKeys.ts`. */
export const ZX_FREE_TIER = {
  requestsPerMinute: 30,
  dailyQuota: 500,
  bulkIocLimit: 50,
  endpointCount: 27,
  openApiVersion: '3.1',
} as const;

export const ZX_FROM = {
  intel: { email: 'intel@zayron-x.co', name: 'ZAYRON-X' },
  security: { email: 'security@zayron-x.co', name: 'ZAYRON-X Security' },
} as const;

export const BREVO_SMTP_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
export const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';
export const BREVO_MAX_SUBREQUESTS = 5;
export const BREVO_DIGEST_BATCH_SIZE = 50;
export const MAIL_COOLDOWN_HOURS = 24;

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK =
  "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function brevoApiKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildUnsubscribeUrl(token: string): string {
  return `${ZX_UNSUBSCRIBE_BASE}?token=${encodeURIComponent(token)}`;
}

export function replyToForDesk(desk: MailDesk): string {
  return ZX_FROM[desk].email;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SHELL & FOOTER
 * ──────────────────────────────────────────────────────────────────────────── */

export interface EmailShellInput {
  preheader: string;
  headerLabel?: string;
  bodyHtml: string;
  footerHtml?: string;
}

export function buildInstitutionalFooter(options: {
  unsubscribeUrl?: string;
  contextLine?: string;
} = {}): string {
  const contextLine =
    options.contextLine ??
    'You received this email because you registered with ZAYRON-X at zayron-x.co. ZAYRON-X will never ask for passwords or API secret keys by email.';
  const unsubHtml = options.unsubscribeUrl
    ? `<a href="${escapeHtml(options.unsubscribeUrl)}" style="color:${ZX_COLORS.muted};text-decoration:underline;">Unsubscribe</a> &nbsp;&middot;&nbsp; `
    : '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${ZX_COLORS.border};">
<tr><td style="padding-top:24px;font-family:${FONT_STACK};font-size:12px;line-height:20px;color:${ZX_COLORS.muted};">
  <div style="color:${ZX_COLORS.text};font-weight:600;margin-bottom:6px;">ZAYRON-X &middot; Cyber Threat Intelligence Platform</div>
  <div style="margin-bottom:10px;">
    <a href="${ZX_SITE_ORIGIN}/about" style="color:${ZX_COLORS.muted};text-decoration:none;">About Platform</a> &nbsp;&middot;&nbsp;
    <a href="${ZX_SITE_ORIGIN}/intelligence" style="color:${ZX_COLORS.muted};text-decoration:none;">Intelligence</a> &nbsp;&middot;&nbsp;
    <a href="${ZX_SITE_ORIGIN}/developers" style="color:${ZX_COLORS.muted};text-decoration:none;">API Docs</a> &nbsp;&middot;&nbsp;
    <a href="${ZX_SITE_ORIGIN}/.well-known/security.txt" style="color:${ZX_COLORS.muted};text-decoration:none;">Security</a> &nbsp;&middot;&nbsp;
    <a href="${ZX_SITE_ORIGIN}/privacy" style="color:${ZX_COLORS.muted};text-decoration:none;">Privacy</a>
  </div>
  <div style="margin-bottom:12px;color:${ZX_COLORS.subtle};">
    Website: <a href="${ZX_SITE_ORIGIN}" style="color:${ZX_COLORS.muted};text-decoration:none;">zayron-x.co</a> &nbsp;&middot;&nbsp;
    Intelligence Desk: <a href="mailto:intel@zayron-x.co" style="color:${ZX_COLORS.muted};text-decoration:none;">intel@zayron-x.co</a> &nbsp;&middot;&nbsp;
    Security &amp; Disclosure: <a href="mailto:security@zayron-x.co" style="color:${ZX_COLORS.muted};text-decoration:none;">security@zayron-x.co</a>
  </div>
  <div style="margin-bottom:10px;color:${ZX_COLORS.subtle};font-size:11px;line-height:18px;">${escapeHtml(contextLine)}</div>
  <div style="color:${ZX_COLORS.subtle};font-size:11px;line-height:18px;">
    ${unsubHtml}&copy; 2026 ZAYRON-X. All rights reserved.
  </div>
</td></tr>
</table>`;
}

export function buildInstitutionalFooterText(options: {
  unsubscribeUrl?: string;
  contextLine?: string;
} = {}): string {
  const contextLine =
    options.contextLine ??
    'You received this email because you registered with ZAYRON-X at zayron-x.co. ZAYRON-X will never ask for passwords or API secret keys by email.';
  const lines = [
    'ZAYRON-X · Cyber Threat Intelligence Platform',
    'About Platform: https://zayron-x.co/about | Intelligence: https://zayron-x.co/intelligence | API Docs: https://zayron-x.co/developers | Security: https://zayron-x.co/.well-known/security.txt | Privacy: https://zayron-x.co/privacy',
    'Website: zayron-x.co | Intelligence Desk: intel@zayron-x.co | Security & Disclosure: security@zayron-x.co',
    contextLine,
  ];
  if (options.unsubscribeUrl) lines.push(`Unsubscribe: ${options.unsubscribeUrl}`);
  lines.push('© 2026 ZAYRON-X. All rights reserved.');
  return lines.join('\n');
}

/**
 * Wraps body content in the 580px editorial minimalist container.
 * Pure table layout + 100% inline CSS for Gmail, Apple Mail, and Outlook.
 */
export function renderEmailShell(input: EmailShellInput): string {
  const headerLabel = input.headerLabel ?? 'ZAYRON-X';
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapeHtml(headerLabel)}</title>
</head>
<body style="margin:0;padding:0;background:${ZX_COLORS.bg};">
<div style="display:none;font-size:1px;color:${ZX_COLORS.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${ZX_COLORS.bg};margin:0;padding:0;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px;max-width:580px;background:${ZX_COLORS.surface};border:1px solid ${ZX_COLORS.border};">
<tr><td style="padding:36px 40px 24px 40px;background:${ZX_COLORS.surface};border-bottom:1px solid ${ZX_COLORS.border};">
  <a href="${ZX_SITE_ORIGIN}" style="text-decoration:none;">
    <img src="${ZX_EMAIL_LOGO_URL}" width="130" height="24" alt="ZAYRON-X" style="display:block;border:0;outline:none;text-decoration:none;height:24px;width:130px;color:${ZX_COLORS.text};font-family:${FONT_STACK};font-size:18px;font-weight:700;letter-spacing:0.5px;">
  </a>
</td></tr>
<tr><td style="padding:36px 40px 12px 40px;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${ZX_COLORS.muted};">
${input.bodyHtml}
</td></tr>
<tr><td style="padding:16px 40px 36px 40px;font-family:${FONT_STACK};font-size:12px;line-height:20px;color:${ZX_COLORS.muted};">
${input.footerHtml ?? buildInstitutionalFooter()}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function editorialRow(title: string, description: string, isLast = false): string {
  const border = isLast ? '' : `border-bottom:1px solid ${ZX_COLORS.border};`;
  return `<tr><td style="padding:16px 0;${border}font-family:${FONT_STACK};">
  <div style="font-size:14px;font-weight:600;line-height:20px;color:${ZX_COLORS.text};margin-bottom:4px;">${escapeHtml(title)}</div>
  <div style="font-size:14px;line-height:22px;color:${ZX_COLORS.muted};">${escapeHtml(description)}</div>
</td></tr>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 20px 0;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${ZX_COLORS.muted};">${html}</p>`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * WELCOME BRIEFING (EDITORIAL MINIMALIST V2)
 * ──────────────────────────────────────────────────────────────────────────── */

export const WELCOME_SUBJECT = 'Welcome to ZAYRON-X';
export const WELCOME_PREHEADER = 'Your ZAYRON-X Intelligence access is active.';

export interface WelcomeBriefingInput {
  unsubscribeUrl: string;
}

export function buildWelcomeBriefingHtml(input: WelcomeBriefingInput): string {
  const body = [
    `<h1 style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:24px;font-weight:600;line-height:32px;letter-spacing:-0.02em;color:${ZX_COLORS.text};">Welcome to ZAYRON-X.</h1>`,
    paragraph(
      `Your ZAYRON-X Intelligence access is active. Authoritative CVEs, threat actors, and live defense telemetry are unified in one verifiable platform.`,
    ),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px 0;border-top:1px solid ${ZX_COLORS.border};border-bottom:1px solid ${ZX_COLORS.border};">`,
    editorialRow(
      'Verified Threat Graph',
      'Live CVEs, threat actors, malware families, and MITRE ATT&CK techniques cross-linked end-to-end.',
    ),
    editorialRow(
      'Immediate Defense Output',
      'Ready-to-use KQL, SPL, and ATT&CK Navigator workflows on every dossier.',
    ),
    editorialRow(
      'Open Developer API',
      `Free programmatic access across ${ZX_FREE_TIER.endpointCount} endpoints, bulk IOC lookup, STIX 2.1, and Firewall EDL.`,
      true,
    ),
    `</table>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr>
<td style="background:${ZX_COLORS.accent};border-radius:2px;">
<a href="${ZX_SITE_ORIGIN}/intelligence" style="display:inline-block;padding:12px 22px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:${ZX_COLORS.accentInk};text-decoration:none;">Open Platform &rarr;</a>
</td></tr></table>`,
    `<p style="margin:0 0 12px 0;font-family:${FONT_STACK};font-size:14px;line-height:22px;"><a href="${ZX_SITE_ORIGIN}/about" style="color:${ZX_COLORS.text};text-decoration:underline;">Explore what ZAYRON-X does and delivers &rarr;</a></p>`,
  ].join('\n');

  return renderEmailShell({
    preheader: WELCOME_PREHEADER,
    headerLabel: 'Welcome to ZAYRON-X',
    bodyHtml: body,
    footerHtml: buildInstitutionalFooter({ unsubscribeUrl: input.unsubscribeUrl }),
  });
}

export function buildWelcomeBriefingText(input: WelcomeBriefingInput): string {
  return [
    'Welcome to ZAYRON-X.',
    '',
    'Your ZAYRON-X Intelligence access is active. Authoritative CVEs, threat actors, and live defense telemetry are unified in one verifiable platform.',
    '',
    '- Verified Threat Graph: Live CVEs, threat actors, malware families, and MITRE ATT&CK techniques cross-linked end-to-end.',
    '- Immediate Defense Output: Ready-to-use KQL, SPL, and ATT&CK Navigator workflows on every dossier.',
    `- Open Developer API: Free programmatic access across ${ZX_FREE_TIER.endpointCount} endpoints, bulk IOC lookup, STIX 2.1, and Firewall EDL.`,
    '',
    'Open Platform: https://zayron-x.co/intelligence',
    'Explore what ZAYRON-X does and delivers: https://zayron-x.co/about',
    '',
    buildInstitutionalFooterText({ unsubscribeUrl: input.unsubscribeUrl }),
  ].join('\n');
}

export function buildWelcomeBriefingEmail(input: WelcomeBriefingInput): {
  subject: string;
  preheader: string;
  html: string;
  text: string;
} {
  return {
    subject: WELCOME_SUBJECT,
    preheader: WELCOME_PREHEADER,
    html: buildWelcomeBriefingHtml(input),
    text: buildWelcomeBriefingText(input),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * DAILY DIGEST (SHARED EDITORIAL MINIMALIST SYSTEM)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface EmailDigestContent {
  dateLabel: string;
  news: Array<{ slug: string; title: string; severity: string; source_name: string; verdict: string }>;
  kevs: Array<{
    cve_id: string;
    severity: string;
    affected_vendor: string | null;
    affected_product: string | null;
    cvss_score: number | null;
  }>;
  malware: Array<{ id: string; title: string; severity: string }>;
}

export function buildEmailDigestHtml(content: EmailDigestContent, unsubscribeUrl: string): string {
  const newsItems = content.news
    .map(
      (n) =>
        `<tr><td style="padding:12px 0;border-bottom:1px solid ${ZX_COLORS.border};font-family:${FONT_STACK};">
  <div style="font-family:${MONO_STACK};font-size:11px;color:${ZX_COLORS.subtle};margin-bottom:4px;">${escapeHtml(n.severity)} &middot; ${escapeHtml(n.source_name)}</div>
  <a href="${ZX_SITE_ORIGIN}/news/${encodeURIComponent(n.slug)}" style="font-size:14px;font-weight:600;color:${ZX_COLORS.text};text-decoration:underline;">${escapeHtml(n.title)}</a>
  <div style="font-size:13px;line-height:20px;color:${ZX_COLORS.muted};margin-top:4px;">${escapeHtml(n.verdict)}</div>
</td></tr>`,
    )
    .join('');

  const kevItems = content.kevs
    .map((k) => {
      const target = [k.affected_vendor, k.affected_product].filter(Boolean).join(' ');
      const cvss = k.cvss_score !== null ? ` · CVSS ${k.cvss_score.toFixed(1)}` : '';
      return `<tr><td style="padding:10px 0;border-bottom:1px solid ${ZX_COLORS.border};font-family:${FONT_STACK};font-size:14px;">
  <a href="${ZX_SITE_ORIGIN}/intelligence/vulnerabilities/${encodeURIComponent(k.cve_id)}" style="font-family:${MONO_STACK};font-weight:600;color:${ZX_COLORS.text};text-decoration:underline;">${escapeHtml(k.cve_id)}</a>
  <span style="color:${ZX_COLORS.muted};"> &middot; ${escapeHtml(k.severity)}${escapeHtml(cvss)}${target ? ` &middot; ${escapeHtml(target)}` : ''}</span>
</td></tr>`;
    })
    .join('');

  const malItems = content.malware
    .map(
      (m) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${ZX_COLORS.border};font-family:${FONT_STACK};font-size:14px;">
  <a href="${ZX_SITE_ORIGIN}/intelligence/malware/advisories/${encodeURIComponent(m.id)}" style="font-family:${MONO_STACK};font-weight:600;color:${ZX_COLORS.text};text-decoration:underline;">${escapeHtml(m.id)}</a>
  <span style="color:${ZX_COLORS.muted};"> &mdash; ${escapeHtml(m.title)}</span>
</td></tr>`,
    )
    .join('');

  const section = (heading: string, rows: string) =>
    rows
      ? `<div style="margin:24px 0 8px 0;font-family:${MONO_STACK};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ZX_COLORS.subtle};">${escapeHtml(heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${ZX_COLORS.border};">${rows}</table>`
      : '';

  const body = [
    `<div style="font-family:${MONO_STACK};font-size:11px;letter-spacing:1.2px;color:${ZX_COLORS.subtle};text-transform:uppercase;margin-bottom:8px;">Daily Threat Briefing &middot; ${escapeHtml(content.dateLabel)}</div>`,
    `<h1 style="margin:0 0 12px 0;font-family:${FONT_STACK};font-size:22px;font-weight:600;line-height:30px;letter-spacing:-0.02em;color:${ZX_COLORS.text};">Verified Intelligence Summary</h1>`,
    section('Newsroom Briefings', newsItems),
    section('CISA KEV Additions', kevItems),
    section('Supply-Chain Advisories', malItems),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px 0;"><tr>
<td style="background:${ZX_COLORS.accent};border-radius:2px;">
<a href="${ZX_SITE_ORIGIN}/intelligence" style="display:inline-block;padding:12px 22px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:${ZX_COLORS.accentInk};text-decoration:none;">Open Platform &rarr;</a>
</td></tr></table>`,
  ].join('\n');

  return renderEmailShell({
    preheader: `Verified CVEs, KEV additions and supply-chain advisories for ${content.dateLabel}.`,
    headerLabel: 'ZAYRON-X Daily Threat Briefing',
    bodyHtml: body,
    footerHtml: buildInstitutionalFooter({ unsubscribeUrl }),
  });
}

export function buildEmailDigestText(content: EmailDigestContent, unsubscribeUrl: string): string {
  const lines: string[] = [
    `ZAYRON-X Daily Threat Briefing (${content.dateLabel})`,
    '',
  ];
  if (content.news.length > 0) {
    lines.push('NEWSROOM BRIEFINGS');
    for (const n of content.news) {
      lines.push(`- [${n.severity}] ${n.title} (${n.source_name})`);
      lines.push(`  ${ZX_SITE_ORIGIN}/news/${encodeURIComponent(n.slug)}`);
    }
    lines.push('');
  }
  if (content.kevs.length > 0) {
    lines.push('CISA KEV ADDITIONS');
    for (const k of content.kevs) {
      lines.push(
        `- ${k.cve_id} (${k.severity}) — ${ZX_SITE_ORIGIN}/intelligence/vulnerabilities/${encodeURIComponent(k.cve_id)}`,
      );
    }
    lines.push('');
  }
  if (content.malware.length > 0) {
    lines.push('SUPPLY-CHAIN ADVISORIES');
    for (const m of content.malware) {
      lines.push(
        `- ${m.id}: ${m.title} — ${ZX_SITE_ORIGIN}/intelligence/malware/advisories/${encodeURIComponent(m.id)}`,
      );
    }
    lines.push('');
  }
  lines.push(buildInstitutionalFooterText({ unsubscribeUrl }));
  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────────────────────────
 * DESK AUTO-RESPONDERS (intel@ & security@)
 * ──────────────────────────────────────────────────────────────────────────── */

export type MailDesk = 'intel' | 'security';

export const DESK_LABEL: Record<MailDesk, string> = {
  intel: 'ZAYRON-X',
  security: 'ZAYRON-X Security',
};

export const DESK_SLA: Record<MailDesk, string> = {
  intel: 'Analyst response within 1 business day',
  security: 'Initial triage within 4 hours for critical security reports',
};

export function formatMailReferenceId(desk: MailDesk, when: Date, hex: string): string {
  const day = when.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = (hex.toUpperCase().replace(/[^0-9A-F]/g, '') + '0000').slice(0, 4);
  return desk === 'intel' ? `ZX-INTEL-${day}-${suffix}` : `ZX-SEC-${day}-${suffix}`;
}

export function generateReferenceHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function deskForRecipient(address: string): MailDesk | null {
  const local = address.trim().toLowerCase().split('@')[0] ?? '';
  if (local === 'security') return 'security';
  if (local === 'intel') return 'intel';
  return null;
}

export interface MailDeskReceiptInput {
  desk: MailDesk;
  referenceId: string;
  subject: string;
  receivedAtUtc: string;
  senderEmail: string;
}

export function buildMailDeskReceipt(input: MailDeskReceiptInput): {
  subject: string;
  html: string;
  text: string;
} {
  const label = DESK_LABEL[input.desk];
  const sla = DESK_SLA[input.desk];
  const subject = `[${input.referenceId}] ${label} — request received`;
  const heading =
    input.desk === 'security' ? 'Security report received.' : 'Intelligence request received.';

  const metaRow = (k: string, v: string, last = false) =>
    `<tr>
<td style="padding:10px 0;${last ? '' : `border-bottom:1px solid ${ZX_COLORS.border};`}font-family:${MONO_STACK};font-size:12px;color:${ZX_COLORS.subtle};width:130px;vertical-align:top;">${escapeHtml(k)}</td>
<td style="padding:10px 0;${last ? '' : `border-bottom:1px solid ${ZX_COLORS.border};`}font-family:${MONO_STACK};font-size:12px;color:${ZX_COLORS.text};">${escapeHtml(v)}</td>
</tr>`;

  const body = [
    `<h1 style="margin:0 0 14px 0;font-family:${FONT_STACK};font-size:22px;font-weight:600;line-height:30px;letter-spacing:-0.02em;color:${ZX_COLORS.text};">${heading}</h1>`,
    paragraph(
      `Your message reached <strong style="color:${ZX_COLORS.text};">${escapeHtml(label)}</strong>. Reply to this thread with your reference ID to add context.`,
    ),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;border-top:1px solid ${ZX_COLORS.border};border-bottom:1px solid ${ZX_COLORS.border};">
${metaRow('Reference', input.referenceId)}
${metaRow('Received (UTC)', input.receivedAtUtc)}
${metaRow('Subject', input.subject || '(no subject)')}
${metaRow('Response SLA', sla, true)}
</table>`,
    input.desk === 'security'
      ? paragraph(
          `<strong style="color:${ZX_COLORS.text};">Do not send raw credentials, private keys, or unencrypted malware samples.</strong> We follow coordinated disclosure and will provide a secure transfer path if an artifact is needed.`,
        )
      : '',
    input.desk === 'security'
      ? `<p style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:14px;line-height:22px;"><a href="${ZX_SITE_ORIGIN}/.well-known/security.txt" style="color:${ZX_COLORS.text};text-decoration:underline;">View disclosure policy (security.txt) &rarr;</a></p>`
      : `<p style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:14px;line-height:22px;"><a href="${ZX_SITE_ORIGIN}/intelligence" style="color:${ZX_COLORS.text};text-decoration:underline;">Open Threat Intelligence &rarr;</a> &nbsp;&middot;&nbsp; <a href="${ZX_SITE_ORIGIN}/about" style="color:${ZX_COLORS.muted};text-decoration:underline;">About ZAYRON-X</a></p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const contextLine =
    input.desk === 'security'
      ? 'You received this receipt because you emailed security@zayron-x.co. ZAYRON-X will never ask for passwords or API secret keys by email.'
      : 'You received this receipt because you emailed intel@zayron-x.co. ZAYRON-X will never ask for passwords or API secret keys by email.';

  const html = renderEmailShell({
    preheader: `${input.referenceId} received. ${sla}.`,
    headerLabel: label,
    bodyHtml: body,
    footerHtml: buildInstitutionalFooter({ contextLine }),
  });

  const text = [
    heading,
    '',
    `Your message reached ${label}.`,
    '',
    `Reference: ${input.referenceId}`,
    `Received (UTC): ${input.receivedAtUtc}`,
    `Subject: ${input.subject || '(no subject)'}`,
    `Response SLA: ${sla}`,
    ...(input.desk === 'security'
      ? [
          '',
          'Do not send raw credentials, private keys, or unencrypted malware samples.',
          'Disclosure policy: https://zayron-x.co/.well-known/security.txt',
        ]
      : [
          '',
          'Open Threat Intelligence: https://zayron-x.co/intelligence',
          'About ZAYRON-X: https://zayron-x.co/about',
        ]),
    '',
    buildInstitutionalFooterText({ contextLine }),
  ].join('\n');

  return { subject, html, text };
}

/* ────────────────────────────────────────────────────────────────────────────
 * ANTI-LOOP SHIELD
 * ──────────────────────────────────────────────────────────────────────────── */

export type HeaderReader = { get(name: string): string | null };

function readHeader(headers: Record<string, string | undefined> | HeaderReader, name: string): string {
  if (typeof (headers as HeaderReader).get === 'function') {
    return ((headers as HeaderReader).get(name) ?? '').trim();
  }
  const record = headers as Record<string, string | undefined>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === name.toLowerCase());
  return (key ? String(record[key] ?? '') : '').trim();
}

const BLOCKED_LOCAL_PARTS = new Set([
  'noreply',
  'no-reply',
  'no_reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon',
  'postmaster',
  'bounce',
  'bounces',
  'abuse',
]);

export interface AutoReplyGuardInput {
  sender: string;
  desk: MailDesk;
  headers: Record<string, string | undefined> | HeaderReader;
  lastAutoReplyAt?: string | null;
  now?: Date;
}

export function shouldSuppressAutoReply(input: AutoReplyGuardInput): { suppress: boolean; reason: string } {
  const sender = (input.sender || '').trim().toLowerCase();
  if (!sender) return { suppress: true, reason: 'EMPTY_SENDER' };
  if (!sender.includes('@')) return { suppress: true, reason: 'INVALID_SENDER' };

  const local = sender.split('@')[0] ?? '';
  const domain = sender.split('@')[1] ?? '';
  if (BLOCKED_LOCAL_PARTS.has(local)) return { suppress: true, reason: 'MACHINE_SENDER' };
  if (domain === 'zayron-x.co' || domain.endsWith('.zayron-x.co')) {
    return { suppress: true, reason: 'SELF_MAIL' };
  }

  const autoSubmitted = readHeader(input.headers, 'Auto-Submitted').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') return { suppress: true, reason: 'AUTO_SUBMITTED' };

  const precedence = readHeader(input.headers, 'Precedence').toLowerCase();
  if (['bulk', 'junk', 'list', 'auto_reply'].includes(precedence)) {
    return { suppress: true, reason: 'PRECEDENCE_BULK' };
  }

  if (readHeader(input.headers, 'List-Id')) return { suppress: true, reason: 'LIST_ID' };
  if (readHeader(input.headers, 'List-Unsubscribe')) return { suppress: true, reason: 'LIST_UNSUBSCRIBE' };
  if (readHeader(input.headers, 'X-Autoreply')) return { suppress: true, reason: 'X_AUTOREPLY' };

  if (input.lastAutoReplyAt) {
    const last = Date.parse(input.lastAutoReplyAt);
    const now = (input.now ?? new Date()).getTime();
    if (Number.isFinite(last) && now - last < MAIL_COOLDOWN_HOURS * 60 * 60 * 1000) {
      return { suppress: true, reason: 'COOLDOWN_24H' };
    }
  }

  return { suppress: false, reason: 'OK' };
}

/* ────────────────────────────────────────────────────────────────────────────
 * BREVO TRANSACTIONAL CLIENT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface BrevoMessageVersion {
  to: BrevoRecipient[];
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  headers?: Record<string, string>;
}

export interface BrevoSendInput {
  apiKey: string;
  sender: BrevoRecipient;
  to?: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: BrevoRecipient;
  headers?: Record<string, string>;
  messageVersions?: BrevoMessageVersion[];
  fetchFn?: typeof fetch;
}

export interface BrevoSendResult {
  ok: boolean;
  status: number;
  messageId?: string;
  error?: string;
}

export function parseSenderAddress(from: string, fallbackName = 'ZAYRON-X'): BrevoRecipient {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from || '');
  if (match) return { name: match[1] || fallbackName, email: match[2].trim() };
  return { name: fallbackName, email: (from || '').trim() };
}

export function buildListUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export async function sendBrevoTransactional(input: BrevoSendInput): Promise<BrevoSendResult> {
  const key = brevoApiKey(input.apiKey);
  if (!key) return { ok: false, status: 0, error: 'MISSING_BREVO_API_KEY' };
  const fetchFn = input.fetchFn ?? fetch;

  const payload: Record<string, unknown> = {
    sender: input.sender,
    subject: input.subject,
    htmlContent: input.htmlContent,
    textContent: input.textContent,
  };
  if (input.to && input.to.length > 0) payload.to = input.to;
  if (input.replyTo) payload.replyTo = input.replyTo;
  if (input.headers) payload.headers = input.headers;
  if (input.messageVersions && input.messageVersions.length > 0) {
    payload.messageVersions = input.messageVersions;
  }

  try {
    const res = await fetchFn(BREVO_SMTP_EMAIL_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': key,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, status: res.status, error: `BREVO_HTTP_${res.status}` };
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { ok: true, status: res.status, messageId: data?.messageId };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: `BREVO_ERROR:${String((error as Error)?.message || error).slice(0, 120)}`,
    };
  }
}

export async function upsertBrevoContact(input: {
  apiKey: string;
  email: string;
  attributes: Record<string, unknown>;
  fetchFn?: typeof fetch;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const key = brevoApiKey(input.apiKey);
  if (!key) return { ok: false, status: 0, error: 'MISSING_BREVO_API_KEY' };
  const fetchFn = input.fetchFn ?? fetch;
  try {
    const res = await fetchFn(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': key,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        attributes: input.attributes,
        updateEnabled: true,
        emailBlacklisted: false,
      }),
    });
    return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, error: `BREVO_HTTP_${res.status}` };
  } catch (error) {
    return { ok: false, status: 0, error: `BREVO_ERROR:${String((error as Error)?.message || error).slice(0, 120)}` };
  }
}

export async function setBrevoEmailBlacklisted(input: {
  apiKey: string;
  email: string;
  blacklisted: boolean;
  fetchFn?: typeof fetch;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const key = brevoApiKey(input.apiKey);
  if (!key) return { ok: false, status: 0, error: 'MISSING_BREVO_API_KEY' };
  const fetchFn = input.fetchFn ?? fetch;
  try {
    const res = await fetchFn(`${BREVO_CONTACTS_URL}/${encodeURIComponent(input.email)}`, {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'api-key': key,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ emailBlacklisted: input.blacklisted }),
    });
    return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, error: `BREVO_HTTP_${res.status}` };
  } catch (error) {
    return { ok: false, status: 0, error: `BREVO_ERROR:${String((error as Error)?.message || error).slice(0, 120)}` };
  }
}

export interface DigestRecipient {
  email: string;
  unsubscribe_token: string;
}

export function buildDigestMessageVersions(
  recipients: DigestRecipient[],
  content: EmailDigestContent,
): BrevoMessageVersion[][] {
  const chunks: BrevoMessageVersion[][] = [];
  for (let i = 0; i < recipients.length; i += BREVO_DIGEST_BATCH_SIZE) {
    const slice = recipients.slice(i, i + BREVO_DIGEST_BATCH_SIZE);
    chunks.push(
      slice.map((recipient) => {
        const unsubscribeUrl = buildUnsubscribeUrl(recipient.unsubscribe_token);
        return {
          to: [{ email: recipient.email }],
          htmlContent: buildEmailDigestHtml(content, unsubscribeUrl),
          textContent: buildEmailDigestText(content, unsubscribeUrl),
          headers: buildListUnsubscribeHeaders(unsubscribeUrl),
        };
      }),
    );
  }
  return chunks;
}
