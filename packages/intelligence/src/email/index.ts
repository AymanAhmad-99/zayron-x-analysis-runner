/**
 * PHASE 9C-MAIL-PRO — Shared institutional email system.
 *
 * One module owns every outbound/inbound email artifact so the welcome
 * briefing, the daily digest, the desk auto-responders and the anti-loop
 * shield cannot drift apart:
 *
 *   - Brevo Transactional API (`POST https://api.brevo.com/v3/smtp/email`)
 *     exclusively — no Brevo marketing watermark, no third-party SDK.
 *   - 600px table-based HTML with INLINE CSS ONLY (no flexbox, no grid) so
 *     Gmail, Outlook and Apple Mail render identically.
 *   - A raster PNG wordmark: Gmail/Outlook strip inline `<svg>`, so the logo is
 *     always an `<img>` pointing at the hosted asset, with `alt` fallback text.
 *   - Every interpolated value is XSS-escaped and every HTML body has a matching
 *     plain-text body (deliverability + accessibility).
 */

export const ZX_SITE_ORIGIN = 'https://zayron-x.co';
export const ZX_API_ORIGIN = 'https://api.zayron-x.co';
export const ZX_EMAIL_LOGO_URL = `${ZX_SITE_ORIGIN}/brand/zayron-email-logo.png`;
export const ZX_UNSUBSCRIBE_BASE = `${ZX_API_ORIGIN}/api/v1/briefings/unsubscribe`;
export const ZX_TELEGRAM_URL = 'https://t.me/zayronxai';

/** Brand palette — dark-mode safe contrast on `#0B0F17`. */
export const ZX_COLORS = {
  obsidian: '#0B0F17',
  panel: '#111827',
  border: '#1F2A37',
  accent: '#FF4D00',
  body: '#E5E7EB',
  muted: '#9CA3AF',
  white: '#FFFFFF',
} as const;

/** The exact live free-tier contract, read from `workers/api/src/apiKeys.ts`. */
export const ZX_FREE_TIER = {
  requestsPerMinute: 30,
  dailyQuota: 500,
  bulkIocLimit: 50,
  endpointCount: 27,
  openApiVersion: '3.1',
} as const;

export const ZX_FROM = {
  intel: { email: 'intel@zayron-x.co', name: 'ZAYRON-X Intelligence' },
  security: { email: 'security@zayron-x.co', name: 'ZAYRON-X Security & Trust' },
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

/** Trim an API key and treat blank/undefined as "not configured" (fail closed). */
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
 * SHELL
 * ──────────────────────────────────────────────────────────────────────────── */

export interface EmailShellInput {
  preheader: string;
  headerLabel?: string;
  bodyHtml: string;
  footerHtml?: string;
  /** Hidden preheader text is the inbox-preview line; it must never render. */
  accentLabel?: string;
}

/**
 * Wraps body content in the canonical 600px obsidian masthead.
 * Pure table layout: Outlook (Word engine) ignores modern layout CSS.
 */
export function renderEmailShell(input: EmailShellInput): string {
  const headerLabel = input.headerLabel ?? 'ZAYRON-X INTELLIGENCE';
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapeHtml(headerLabel)}</title>
</head>
<body style="margin:0;padding:0;background:${ZX_COLORS.obsidian};">
<div style="display:none;font-size:1px;color:${ZX_COLORS.obsidian};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${ZX_COLORS.obsidian};margin:0;padding:0;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${ZX_COLORS.obsidian};border:1px solid ${ZX_COLORS.border};">
<tr><td height="3" style="height:3px;line-height:3px;font-size:0;background:${ZX_COLORS.accent};">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 18px 28px;background:${ZX_COLORS.obsidian};">
  <img src="${ZX_EMAIL_LOGO_URL}" width="184" height="34" alt="ZAYRON-X" style="display:block;border:0;outline:none;text-decoration:none;height:34px;width:184px;color:${ZX_COLORS.white};font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:1px;">
  <div style="margin-top:12px;font-family:${FONT_STACK};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${ZX_COLORS.accent};">${escapeHtml(input.accentLabel ?? 'Truth Is the Perimeter.')}</div>
</td></tr>
<tr><td style="height:1px;line-height:1px;font-size:0;background:${ZX_COLORS.border};">&nbsp;</td></tr>
<tr><td style="padding:26px 28px 8px 28px;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${ZX_COLORS.body};">
${input.bodyHtml}
</td></tr>
<tr><td style="padding:18px 28px 26px 28px;font-family:${FONT_STACK};font-size:12px;line-height:20px;color:${ZX_COLORS.muted};">
${input.footerHtml ?? ''}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function card(title: string, bodyHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;background:${ZX_COLORS.panel};border:1px solid ${ZX_COLORS.border};border-left:3px solid ${ZX_COLORS.accent};">
<tr><td style="padding:14px 16px;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${ZX_COLORS.body};">
<div style="font-size:13px;font-weight:700;color:${ZX_COLORS.white};letter-spacing:0.4px;margin-bottom:4px;">${escapeHtml(title)}</div>
${bodyHtml}
</td></tr></table>`;
}

function specRow(label: string, value: string): string {
  return `<tr>
<td style="padding:6px 10px;border-bottom:1px solid ${ZX_COLORS.border};font-family:${MONO_STACK};font-size:12px;color:${ZX_COLORS.muted};white-space:nowrap;">${escapeHtml(label)}</td>
<td style="padding:6px 10px;border-bottom:1px solid ${ZX_COLORS.border};font-family:${MONO_STACK};font-size:12px;color:${ZX_COLORS.white};">${escapeHtml(value)}</td>
</tr>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${ZX_COLORS.body};">${html}</p>`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * WELCOME BRIEFING
 * ──────────────────────────────────────────────────────────────────────────── */

export const WELCOME_SUBJECT =
  'Welcome to ZAYRON-X — Your Neural Threat Graph & Free API Are Live';
export const WELCOME_PREHEADER =
  '15-second triage, live KQL/SPL, STIX 2.1, Firewall EDL, and your free developer API — zero noise, zero paywall.';

export interface WelcomeBriefingInput {
  unsubscribeUrl: string;
}

export function buildWelcomeBriefingHtml(input: WelcomeBriefingInput): string {
  const api = ZX_FREE_TIER;
  const body = [
    paragraph(
      `You already know the feeling: six browser tabs, three vendor feeds, a Slack channel of unverified screenshots — and a <strong style="color:${ZX_COLORS.white};">patch window closing in four hours</strong>. The intelligence exists. The problem is that nothing is connected.`,
    ),
    paragraph(
      `ZAYRON-X is the unfair advantage for that moment. Every CVE, threat actor, campaign, MITRE technique, malware family and live C2 indicator lives in one <strong style="color:${ZX_COLORS.white};">bidirectional neural threat graph</strong> — cross-linked, source-attributed and verifiable in seconds instead of searches.`,
    ),
    card(
      'Neural pivoting, not search',
      `Start at a live briefing and move in one click to the authoritative CVE, the actor behind it, the ATT&amp;CK technique it implements, then the malware family's live C2 telemetry — with the evidence trail intact at every hop.`,
    ),
    card(
      '15-second defense ready',
      `Copy-paste <span style="font-family:${MONO_STACK};color:${ZX_COLORS.white};">KQL</span> (Microsoft Sentinel) and <span style="font-family:${MONO_STACK};color:${ZX_COLORS.white};">SPL</span> (Splunk) hunting queries, ATT&amp;CK Navigator JSON layers and CISA BOD 22-01 patch deadlines directly from every dossier.`,
    ),
    card(
      'Zero-noise integrity',
      `A hard separation between <span style="font-family:${MONO_STACK};color:${ZX_COLORS.white};">AUTHORITATIVE_VERIFIED</span> intelligence and unverified noise. Indicators are defanged everywhere, so a copy-paste can never detonate your own tooling.`,
    ),
    card(
      'Real-time supply-chain &amp; exploit radar',
      `Active CISA KEV additions, PoC-in-GitHub sightings, EPSS surges and malicious npm/PyPI packages (<span style="font-family:${MONO_STACK};color:${ZX_COLORS.white};">MAL-*</span>) surfaced as they land — not in a weekly PDF.`,
    ),
    `<div style="margin:26px 0 10px 0;font-family:${FONT_STACK};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${ZX_COLORS.accent};">What your free API gives you</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;background:${ZX_COLORS.panel};border:1px solid ${ZX_COLORS.border};">
<tr><td style="padding:10px 12px 4px 12px;font-family:${FONT_STACK};font-size:12px;color:${ZX_COLORS.muted};">Self-serve key in 10 seconds at <a href="${ZX_SITE_ORIGIN}/developers" style="color:${ZX_COLORS.accent};text-decoration:none;">zayron-x.co/developers</a> — no sales call.</td></tr>
<tr><td style="padding:6px 12px 12px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${specRow('OpenAPI', `${api.openApiVersion} · ${api.endpointCount} endpoints`)}
${specRow('Free tier', `${api.requestsPerMinute} requests / 60s · ${api.dailyQuota} records / day`)}
${specRow('Bulk IOC', `${api.bulkIocLimit} indicators / request`)}
${specRow('STIX 2.1', 'bundle export · ?since= incremental sync')}
${specRow('Firewall EDL', 'Palo Alto · Fortinet · Cisco')}
</table>
</td></tr></table>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;"><tr>
<td style="background:${ZX_COLORS.accent};border-radius:2px;">
<a href="${ZX_SITE_ORIGIN}/intelligence" style="display:inline-block;padding:13px 22px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:#0B0F17;text-decoration:none;">Explore Live Intelligence Graph &rarr;</a>
</td></tr></table>`,
    paragraph(
      `<a href="${ZX_SITE_ORIGIN}/developers" style="color:${ZX_COLORS.accent};text-decoration:none;font-weight:600;">Claim your free API key</a> &nbsp;·&nbsp; <a href="${ZX_TELEGRAM_URL}" style="color:${ZX_COLORS.accent};text-decoration:none;font-weight:600;">Join the live Telegram wire</a> &nbsp;·&nbsp; <a href="${ZX_SITE_ORIGIN}/news" style="color:${ZX_COLORS.accent};text-decoration:none;font-weight:600;">Read today's briefings</a>`,
    ),
    paragraph(
      `Two minutes is all it takes: read one dossier, copy the hunt query, pull the EDL. If it does not save you time on the first incident, reply to this email and tell me directly.`,
    ),
  ].join('\n');

  const footer = `
<div style="border-top:1px solid ${ZX_COLORS.border};padding-top:14px;">
Reply directly to <a href="mailto:intel@zayron-x.co" style="color:${ZX_COLORS.accent};text-decoration:none;">intel@zayron-x.co</a> — a human reads it.<br>
ZAYRON-X · Truth Is the Perimeter. · <a href="${ZX_SITE_ORIGIN}" style="color:${ZX_COLORS.muted};">zayron-x.co</a><br>
<span style="color:#6B7280;">You are receiving this because you subscribed to ZAYRON-X intelligence briefings.</span><br>
<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${ZX_COLORS.muted};text-decoration:underline;">Unsubscribe with one click</a>
</div>`;

  return renderEmailShell({
    preheader: WELCOME_PREHEADER,
    headerLabel: 'ZAYRON-X INTELLIGENCE BRIEFING',
    accentLabel: 'Truth Is the Perimeter.',
    bodyHtml: body,
    footerHtml: footer,
  });
}

export function buildWelcomeBriefingText(input: WelcomeBriefingInput): string {
  const api = ZX_FREE_TIER;
  return [
    'ZAYRON-X — TRUTH IS THE PERIMETER.',
    '',
    'Welcome. You already know the feeling: six browser tabs, three vendor feeds,',
    'a Slack channel of unverified screenshots — and a patch window closing in four hours.',
    '',
    'ZAYRON-X connects it: a bidirectional neural threat graph where every CVE, threat',
    'actor, campaign, MITRE technique, malware family and live C2 indicator is',
    'cross-linked, source-attributed and verifiable in seconds.',
    '',
    'HOW IT WORKS FOR YOU',
    '1. Neural pivoting — briefing -> authoritative CVE -> actor -> ATT&CK technique -> live C2 telemetry.',
    '2. 15-second defense ready — copy-paste KQL (Sentinel), SPL (Splunk), ATT&CK Navigator JSON and CISA BOD 22-01 deadlines.',
    '3. Zero-noise integrity — AUTHORITATIVE_VERIFIED intelligence strictly separated from unverified noise; IOCs defanged.',
    '4. Supply-chain & exploit radar — CISA KEV, PoC-in-GitHub, EPSS surges and malicious npm/PyPI packages (MAL-*).',
    '',
    'YOUR FREE API',
    `- OpenAPI ${api.openApiVersion}: ${api.endpointCount} endpoints`,
    `- Free tier: ${api.requestsPerMinute} requests / 60s, ${api.dailyQuota} records / day`,
    `- Bulk IOC lookup: ${api.bulkIocLimit} indicators / request`,
    '- STIX 2.1 bundle export with ?since= incremental sync',
    '- Firewall EDL blocklists for Palo Alto, Fortinet and Cisco',
    '- Self-serve key in 10 seconds: https://zayron-x.co/developers',
    '',
    'START HERE',
    'Explore Live Intelligence Graph: https://zayron-x.co/intelligence',
    'Claim free API key: https://zayron-x.co/developers',
    'Join live Telegram wire: https://t.me/zayronxai',
    "Read today's briefings: https://zayron-x.co/news",
    '',
    'Reply directly to intel@zayron-x.co — a human reads it.',
    'ZAYRON-X · Truth Is the Perimeter. · https://zayron-x.co',
    `Unsubscribe: ${input.unsubscribeUrl}`,
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
 * DAILY DIGEST (moved here so the digest shares the welcome visual language)
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
        `<li style="margin-bottom:10px;"><strong style="color:${ZX_COLORS.accent};">[${escapeHtml(n.severity)}]</strong> <a href="${ZX_SITE_ORIGIN}/news/${encodeURIComponent(n.slug)}" style="color:${ZX_COLORS.white};text-decoration:underline;">${escapeHtml(n.title)}</a><br><span style="color:${ZX_COLORS.muted};font-size:13px;">${escapeHtml(n.source_name)} — ${escapeHtml(n.verdict)}</span></li>`,
    )
    .join('');

  const kevItems = content.kevs
    .map((k) => {
      const target = [k.affected_vendor, k.affected_product].filter(Boolean).join(' ');
      const cvss = k.cvss_score !== null ? ` · CVSS ${k.cvss_score.toFixed(1)}` : '';
      return `<li style="margin-bottom:8px;"><a href="${ZX_SITE_ORIGIN}/intelligence/vulnerabilities/${encodeURIComponent(k.cve_id)}" style="color:${ZX_COLORS.white};text-decoration:underline;"><strong>${escapeHtml(k.cve_id)}</strong></a> <span style="color:${ZX_COLORS.muted};">(${escapeHtml(k.severity)}${cvss}${target ? ` · ${escapeHtml(target)}` : ''})</span></li>`;
    })
    .join('');

  const malItems = content.malware
    .map(
      (m) =>
        `<li style="margin-bottom:8px;"><a href="${ZX_SITE_ORIGIN}/intelligence/malware/advisories/${encodeURIComponent(m.id)}" style="color:${ZX_COLORS.white};text-decoration:underline;"><strong>${escapeHtml(m.id)}</strong></a> — ${escapeHtml(m.title)}</li>`,
    )
    .join('');

  const section = (heading: string, items: string) =>
    items
      ? `<h2 style="font-family:${FONT_STACK};font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${ZX_COLORS.muted};border-bottom:1px solid ${ZX_COLORS.border};padding-bottom:6px;margin:22px 0 10px 0;">${escapeHtml(heading)}</h2><ul style="padding-left:18px;margin:0;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${ZX_COLORS.body};">${items}</ul>`
      : '';

  const body = [
    `<div style="font-family:${MONO_STACK};font-size:11px;letter-spacing:1.5px;color:${ZX_COLORS.accent};text-transform:uppercase;">Daily Threat Briefing · ${escapeHtml(content.dateLabel)}</div>`,
    `<h1 style="font-family:${FONT_STACK};font-size:20px;line-height:28px;color:${ZX_COLORS.white};margin:8px 0 4px 0;">Verified Intelligence Summary (24h)</h1>`,
    section('Neural Newsroom', newsItems),
    section('CISA KEV Additions', kevItems),
    section('Supply-Chain Advisories (MAL-*)', malItems),
  ].join('\n');

  const footer = `
<div style="border-top:1px solid ${ZX_COLORS.border};padding-top:14px;">
Live alerts: <a href="${ZX_TELEGRAM_URL}" style="color:${ZX_COLORS.accent};text-decoration:none;">t.me/zayronxai</a> ·
RSS: <a href="${ZX_SITE_ORIGIN}/news/rss.xml" style="color:${ZX_COLORS.muted};">${ZX_SITE_ORIGIN}/news/rss.xml</a><br>
<a href="${escapeHtml(unsubscribeUrl)}" style="color:${ZX_COLORS.muted};text-decoration:underline;">Unsubscribe</a>
</div>`;

  return renderEmailShell({
    preheader: `Verified CVEs, KEV additions and supply-chain advisories for ${content.dateLabel}.`,
    headerLabel: 'ZAYRON-X DAILY THREAT BRIEFING',
    bodyHtml: body,
    footerHtml: footer,
  });
}

export function buildEmailDigestText(content: EmailDigestContent, unsubscribeUrl: string): string {
  const lines: string[] = [
    `ZAYRON-X DAILY THREAT BRIEFING (${content.dateLabel})`,
    '================================================',
    '',
  ];
  if (content.news.length > 0) {
    lines.push('NEURAL NEWSROOM');
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
  lines.push('Live wire: https://t.me/zayronxai');
  lines.push(`Unsubscribe: ${unsubscribeUrl}`);
  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────────────────────────
 * DESK AUTO-RESPONDERS
 * ──────────────────────────────────────────────────────────────────────────── */

export type MailDesk = 'intel' | 'security';

export const DESK_LABEL: Record<MailDesk, string> = {
  intel: 'ZAYRON-X Intelligence Desk',
  security: 'ZAYRON-X Security & Trust',
};

export const DESK_SLA: Record<MailDesk, string> = {
  intel: 'Analyst response within 1 business day',
  security: 'Initial triage within 4 hours for critical security reports',
};

/** `ZX-INTEL-YYYYMMDD-AB12` / `ZX-SEC-YYYYMMDD-AB12`. */
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

const INTEL_BULLETS = [
  'Neural Threat Graph — CVEs, actors, campaigns, techniques and malware families cross-linked',
  'Free STIX 2.1 / Firewall EDL API — 27 endpoints, 30 req/60s, 500 records/day',
  'Live CISA KEV, PoC-in-GitHub, EPSS and supply-chain (MAL-*) radar',
];

const SECURITY_BULLETS = [
  'Responsible disclosure handled by a named security owner',
  'Initial triage within 4 hours for critical security reports',
  'Coordinated fix, verification and public credit where appropriate',
];

export function buildMailDeskReceipt(input: MailDeskReceiptInput): {
  subject: string;
  html: string;
  text: string;
} {
  const label = DESK_LABEL[input.desk];
  const sla = DESK_SLA[input.desk];
  const bullets = input.desk === 'intel' ? INTEL_BULLETS : SECURITY_BULLETS;
  const subject = `[${input.referenceId}] ${label} — request received`;
  const greeting = input.desk === 'intel' ? 'Intelligence Desk' : 'Security & Trust';

  const body = [
    paragraph(`Your message reached the <strong style="color:${ZX_COLORS.white};">${escapeHtml(label)}</strong>. No ticket portal, no queue bot — this receipt is the acknowledgement.`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;background:${ZX_COLORS.panel};border:1px solid ${ZX_COLORS.border};">
<tr><td style="padding:12px 14px;font-family:${MONO_STACK};font-size:12px;color:${ZX_COLORS.body};line-height:20px;">
Reference: <strong style="color:${ZX_COLORS.white};">${escapeHtml(input.referenceId)}</strong><br>
Received (UTC): ${escapeHtml(input.receivedAtUtc)}<br>
Subject: ${escapeHtml(input.subject || '(no subject)')}<br>
SLA: <strong style="color:${ZX_COLORS.accent};">${escapeHtml(sla)}</strong>
</td></tr></table>`,
    `<div style="margin:0 0 8px 0;font-family:${FONT_STACK};font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${ZX_COLORS.muted};">What you are now connected to</div>`,
    `<ul style="margin:0 0 18px 0;padding-left:18px;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${ZX_COLORS.body};">${bullets.map((b) => `<li style="margin-bottom:6px;">${escapeHtml(b)}</li>`).join('')}</ul>`,
    input.desk === 'security'
      ? paragraph(
          `<strong style="color:${ZX_COLORS.white};">Please do not send raw credentials, private keys, or unencrypted malware samples.</strong> We will reply with a secure transfer path if we need the artifact itself.`,
        )
      : '',
    input.desk === 'security'
      ? paragraph(
          `We follow coordinated disclosure. If your report is a valid vulnerability in ZAYRON-X, we will confirm scope, agree a disclosure date and credit you unless you prefer otherwise.`,
        )
      : '',
    paragraph(
      `<a href="${ZX_SITE_ORIGIN}/intelligence" style="color:${ZX_COLORS.accent};text-decoration:none;font-weight:600;">Live intelligence graph</a> &nbsp;·&nbsp; <a href="${ZX_SITE_ORIGIN}/developers" style="color:${ZX_COLORS.accent};text-decoration:none;font-weight:600;">Free API</a> &nbsp;·&nbsp; <a href="${ZX_TELEGRAM_URL}" style="color:${ZX_COLORS.accent};text-decoration:none;font-weight:600;">Telegram wire</a>`,
    ),
  ]
    .filter(Boolean)
    .join('\n');

  const footer = `<div style="border-top:1px solid ${ZX_COLORS.border};padding-top:14px;">
${escapeHtml(label)} · ZAYRON-X · Truth Is the Perimeter.<br>
Reply to this message to continue the thread — reference <span style="font-family:${MONO_STACK};color:${ZX_COLORS.body};">${escapeHtml(input.referenceId)}</span>.<br>
<a href="${ZX_SITE_ORIGIN}/security" style="color:${ZX_COLORS.muted};">Security policy</a>
</div>`;

  const html = renderEmailShell({
    preheader: `${greeting}: ${input.referenceId} received. ${sla}.`,
    headerLabel: `${label.toUpperCase()} — AUTO-ACK`,
    accentLabel: input.desk === 'security' ? 'Security & Trust' : 'Truth Is the Perimeter.',
    bodyHtml: body,
    footerHtml: footer,
  });

  const text = [
    `ZAYRON-X — ${label.toUpperCase()}`,
    '',
    `Your message reached the ${label}.`,
    '',
    `Reference: ${input.referenceId}`,
    `Received (UTC): ${input.receivedAtUtc}`,
    `Subject: ${input.subject || '(no subject)'}`,
    `SLA: ${sla}`,
    '',
    'WHAT YOU ARE CONNECTED TO',
    ...bullets.map((b) => `- ${b}`),
    ...(input.desk === 'security'
      ? ['', 'Do not send raw credentials, private keys, or unencrypted malware samples.', 'We follow coordinated disclosure and will agree a date before publication.']
      : []),
    '',
    'Live intelligence graph: https://zayron-x.co/intelligence',
    'Free API: https://zayron-x.co/developers',
    'Telegram wire: https://t.me/zayronxai',
    '',
    `Reply to this message and keep ${input.referenceId} in the subject.`,
    'ZAYRON-X · Truth Is the Perimeter.',
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
  /** ISO timestamp of the last auto-reply to this sender+desk, if any. */
  lastAutoReplyAt?: string | null;
  now?: Date;
}

/**
 * Returns `{ suppress: true, reason }` whenever replying would create a mail
 * loop, answer a machine, or breach the 24-hour per-sender cooldown.
 * Pure and deterministic: the D1 cooldown is looked up by the caller.
 */
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

/** Parse `Name <email@host>` into a Brevo sender object. */
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

/**
 * Send one transactional message (or a `messageVersions` batch) through Brevo.
 * Always `POST /v3/smtp/email`; the key is never logged.
 */
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

/** Create/update a Brevo contact with the briefing attributes (fail-soft). */
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

/** Flip `emailBlacklisted` on the Brevo contact (1-click unsubscribe sync). */
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

/**
 * Build Brevo `messageVersions` chunks of <= 50 recipients. One POST per chunk
 * keeps the digest within the 5-subrequest ceiling.
 */
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
