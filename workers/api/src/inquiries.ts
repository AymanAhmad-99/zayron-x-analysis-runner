/**
 * PHASE 10A — Enterprise & Intelligence Inquiry intake.
 *
 * - Strict, bounded validation for `company`, `email` and `inquiry`.
 * - One row in `enterprise_inquiries` (migration 0043) with a `ZX-INQ-YYYYMMDD-XXXX`
 *   reference the submitter and the founder can both quote.
 * - The raw client IP is never persisted: only a truncated SHA-256 digest.
 * - Two transactional emails are built here and dispatched by the caller through
 *   `ctx.waitUntil`, so Brevo availability can never change the HTTP result.
 *   Fail-closed: without `BREVO_API_KEY` this module performs ZERO network calls.
 */

import {
  ZX_COLORS,
  ZX_FROM,
  ZX_SITE_ORIGIN,
  brevoApiKey,
  buildInstitutionalFooter,
  buildInstitutionalFooterText,
  escapeHtml,
  renderEmailShell,
  sendBrevoTransactional,
} from '@zayron/intelligence';

export const INQUIRY_DESK_EMAIL = 'intel@zayron-x.co';
export const INQUIRY_COMPANY_MIN = 2;
export const INQUIRY_COMPANY_MAX = 120;
export const INQUIRY_MIN = 10;
export const INQUIRY_MAX = 2000;
export const INQUIRY_RESPONSE_SLA = '1 business day';

export class InquiryError extends Error {
  constructor(
    public readonly status: 400 | 403 | 503,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InquiryError';
  }
}

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** Collapse control characters and repeated whitespace without altering meaning. */
function cleanText(value: string): string {
  return value.replace(CONTROL_CHARS, ' ').replace(/\r\n?/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}

export function normalizeInquiryCompany(raw: unknown): string {
  const value = cleanText(typeof raw === 'string' ? raw : '');
  if (value.length < INQUIRY_COMPANY_MIN || value.length > INQUIRY_COMPANY_MAX) {
    throw new InquiryError(
      400,
      'INVALID_COMPANY',
      `Company name must be between ${INQUIRY_COMPANY_MIN} and ${INQUIRY_COMPANY_MAX} characters`,
    );
  }
  return value;
}

export function normalizeInquiryEmail(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value || value.length > 254 || /[\r\n\0]/.test(value) || !EMAIL_PATTERN.test(value)) {
    throw new InquiryError(400, 'INVALID_EMAIL', 'A valid work email address is required');
  }
  return value;
}

export function normalizeInquiryBody(raw: unknown): string {
  const value = cleanText(typeof raw === 'string' ? raw : '');
  if (value.length < INQUIRY_MIN || value.length > INQUIRY_MAX) {
    throw new InquiryError(
      400,
      'INVALID_INQUIRY',
      `Inquiry must be between ${INQUIRY_MIN} and ${INQUIRY_MAX} characters`,
    );
  }
  return value;
}

/** `ZX-INQ-YYYYMMDD-XXXX` — four uppercase hex characters from `crypto`. */
export function formatInquiryReference(when: Date, hex: string): string {
  const day = when.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = (hex.toUpperCase().replace(/[^0-9A-F]/g, '') + '0000').slice(0, 4);
  return `ZX-INQ-${day}-${suffix}`;
}

export function generateInquiryHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const REFERENCE_PATTERN = /^ZX-INQ-\d{8}-[0-9A-F]{4}$/;

export function isInquiryReference(value: unknown): boolean {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value);
}

/** Non-reversible client identity for abuse correlation. Never the raw address. */
export async function hashClientIp(clientIp: string): Promise<string | null> {
  const value = (clientIp || '').trim();
  if (!value || value.toLowerCase() === 'unknown') return null;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * EMAIL TEMPLATES (EDITORIAL MINIMALIST V2 — same shell as the briefing suite)
 * ──────────────────────────────────────────────────────────────────────────── */

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

function metaRow(label: string, value: string, last = false): string {
  const border = last ? '' : `border-bottom:1px solid ${ZX_COLORS.border};`;
  return `<tr>
<td style="padding:10px 0;${border}font-family:${MONO_STACK};font-size:12px;color:${ZX_COLORS.subtle};width:140px;vertical-align:top;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(label)}</td>
<td style="padding:10px 0;${border}font-family:${FONT_STACK};font-size:14px;line-height:21px;color:${ZX_COLORS.text};">${escapeHtml(value)}</td>
</tr>`;
}

export interface InquiryAlertInput {
  referenceId: string;
  company: string;
  email: string;
  inquiry: string;
  receivedAtUtc: string;
}

/** Executive lead alert delivered to `intel@zayron-x.co` with the submitter as reply-to. */
export function buildInquiryAlertEmail(input: InquiryAlertInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[${input.referenceId}] Enterprise inquiry — ${input.company}`;
  const contextLine =
    'This alert was generated by the ZAYRON-X enterprise inquiry endpoint. Reply to this message to answer the submitter directly.';

  const body = [
    `<h1 style="margin:0 0 14px 0;font-family:${FONT_STACK};font-size:24px;font-weight:600;line-height:32px;letter-spacing:-0.02em;color:${ZX_COLORS.text};">Enterprise inquiry received.</h1>`,
    `<p style="margin:0 0 22px 0;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${ZX_COLORS.muted};">A verified inquiry was submitted from the ZAYRON-X homepage. Reply to this email to reach <strong style="color:${ZX_COLORS.text};">${escapeHtml(input.company)}</strong> directly — the reply-to address is the submitter.</p>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;border-top:1px solid ${ZX_COLORS.border};border-bottom:1px solid ${ZX_COLORS.border};">`,
    metaRow('Reference', input.referenceId),
    metaRow('Company', input.company),
    metaRow('Sender email', input.email),
    metaRow('Received (UTC)', input.receivedAtUtc, true),
    `</table>`,
    `<div style="font-family:${MONO_STACK};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${ZX_COLORS.subtle};margin-bottom:8px;">Inquiry</div>`,
    `<div style="border-left:2px solid ${ZX_COLORS.accent};padding:2px 0 2px 16px;margin-bottom:26px;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${ZX_COLORS.text};white-space:pre-wrap;">${escapeHtml(input.inquiry)}</div>`,
    `<p style="margin:0;font-family:${FONT_STACK};font-size:13px;line-height:21px;color:${ZX_COLORS.subtle};">Response commitment shown to the submitter: ${escapeHtml(INQUIRY_RESPONSE_SLA)}.</p>`,
  ].join('\n');

  const html = renderEmailShell({
    preheader: `${input.referenceId} · ${input.company} · ${input.email}`,
    headerLabel: 'ZAYRON-X Intelligence Desk',
    bodyHtml: body,
    footerHtml: buildInstitutionalFooter({ contextLine }),
  });

  const text = [
    'Enterprise inquiry received.',
    '',
    `Reference: ${input.referenceId}`,
    `Company: ${input.company}`,
    `Sender email: ${input.email}`,
    `Received (UTC): ${input.receivedAtUtc}`,
    '',
    'Inquiry:',
    input.inquiry,
    '',
    `Response commitment: ${INQUIRY_RESPONSE_SLA}.`,
    'Reply to this email to answer the submitter directly.',
    '',
    buildInstitutionalFooterText({ contextLine }),
  ].join('\n');

  return { subject, html, text };
}

/** Calm receipt sent to the submitter from `ZAYRON-X <intel@zayron-x.co>`. */
export function buildInquiryReceiptEmail(input: {
  referenceId: string;
  company: string;
  receivedAtUtc: string;
}): { subject: string; html: string; text: string } {
  const subject = `[${input.referenceId}] ZAYRON-X — inquiry received`;
  const contextLine =
    'You received this receipt because you submitted an inquiry at zayron-x.co. ZAYRON-X will never ask for passwords or API secret keys by email.';

  const body = [
    `<h1 style="margin:0 0 14px 0;font-family:${FONT_STACK};font-size:24px;font-weight:600;line-height:32px;letter-spacing:-0.02em;color:${ZX_COLORS.text};">Inquiry received.</h1>`,
    `<p style="margin:0 0 22px 0;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${ZX_COLORS.muted};">Thank you — your message reached the ZAYRON-X intelligence desk. An analyst will reply within <strong style="color:${ZX_COLORS.text};">${escapeHtml(INQUIRY_RESPONSE_SLA)}</strong>.</p>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;border-top:1px solid ${ZX_COLORS.border};border-bottom:1px solid ${ZX_COLORS.border};">`,
    metaRow('Reference', input.referenceId),
    metaRow('Company', input.company),
    metaRow('Received (UTC)', input.receivedAtUtc),
    metaRow('Response SLA', INQUIRY_RESPONSE_SLA, true),
    `</table>`,
    `<p style="margin:0 0 14px 0;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${ZX_COLORS.muted};">Reply to this email with your reference ID to add context, documents or constraints.</p>`,
    `<p style="margin:0;font-family:${FONT_STACK};font-size:14px;line-height:22px;"><a href="${ZX_SITE_ORIGIN}" style="color:${ZX_COLORS.text};text-decoration:underline;">zayron-x.co</a> &nbsp;&middot;&nbsp; <a href="${ZX_SITE_ORIGIN}/developers" style="color:${ZX_COLORS.muted};text-decoration:underline;">Developer API</a></p>`,
  ].join('\n');

  const html = renderEmailShell({
    preheader: `${input.referenceId} received. Response within ${INQUIRY_RESPONSE_SLA}.`,
    headerLabel: 'ZAYRON-X Intelligence Desk',
    bodyHtml: body,
    footerHtml: buildInstitutionalFooter({ contextLine }),
  });

  const text = [
    'Inquiry received.',
    '',
    `Thank you — your message reached the ZAYRON-X intelligence desk. An analyst will reply within ${INQUIRY_RESPONSE_SLA}.`,
    '',
    `Reference: ${input.referenceId}`,
    `Company: ${input.company}`,
    `Received (UTC): ${input.receivedAtUtc}`,
    `Response SLA: ${INQUIRY_RESPONSE_SLA}`,
    '',
    'Reply to this email with your reference ID to add context, documents or constraints.',
    '',
    buildInstitutionalFooterText({ contextLine }),
  ].join('\n');

  return { subject, html, text };
}

/* ────────────────────────────────────────────────────────────────────────────
 * PERSISTENCE + DISPATCH
 * ──────────────────────────────────────────────────────────────────────────── */

export interface StoredInquiry {
  reference_id: string;
  company: string;
  email: string;
  inquiry: string;
  created_at: string;
}

export async function submitEnterpriseInquiry(input: {
  db: any;
  company: unknown;
  email: unknown;
  inquiry: unknown;
  clientIp?: string;
  now?: Date;
}): Promise<{ ok: true; reference_id: string; record: StoredInquiry }> {
  const company = normalizeInquiryCompany(input.company);
  const email = normalizeInquiryEmail(input.email);
  const inquiry = normalizeInquiryBody(input.inquiry);

  const when = input.now ?? new Date();
  const referenceId = formatInquiryReference(when, generateInquiryHex());
  const createdAt = when.toISOString();
  const id = `inq_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const ipHash = await hashClientIp(input.clientIp ?? '');

  await input.db
    .prepare(
      `INSERT INTO enterprise_inquiries (id, reference_id, company, email, inquiry, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, referenceId, company, email, inquiry, ipHash, createdAt)
    .run();

  return {
    ok: true,
    reference_id: referenceId,
    record: { reference_id: referenceId, company, email, inquiry, created_at: createdAt },
  };
}

export interface InquiryDispatchResult {
  alert: 'SENT' | 'SKIPPED_NO_CREDS' | 'FAILED';
  receipt: 'SENT' | 'SKIPPED_NO_CREDS' | 'FAILED';
  errors: string[];
}

/**
 * Send both emails. Fail-closed: `brevoApiKey` absent → two `SKIPPED_NO_CREDS`
 * results and zero fetch calls. The alert is delivered to `intel@zayron-x.co`
 * with `replyTo` set to the submitter so the founder can answer in one click.
 */
export async function dispatchEnterpriseInquiry(input: {
  record: StoredInquiry;
  brevoApiKey?: string;
  fetchFn?: typeof fetch;
}): Promise<InquiryDispatchResult> {
  const key = brevoApiKey(input.brevoApiKey);
  if (!key) return { alert: 'SKIPPED_NO_CREDS', receipt: 'SKIPPED_NO_CREDS', errors: [] };

  const errors: string[] = [];
  const receivedAtUtc = input.record.created_at;
  const alert = buildInquiryAlertEmail({
    referenceId: input.record.reference_id,
    company: input.record.company,
    email: input.record.email,
    inquiry: input.record.inquiry,
    receivedAtUtc,
  });
  const receipt = buildInquiryReceiptEmail({
    referenceId: input.record.reference_id,
    company: input.record.company,
    receivedAtUtc,
  });

  const alertSend = await sendBrevoTransactional({
    apiKey: key,
    sender: ZX_FROM.intel,
    to: [{ email: INQUIRY_DESK_EMAIL }],
    replyTo: { email: input.record.email, name: input.record.company },
    subject: alert.subject,
    htmlContent: alert.html,
    textContent: alert.text,
    fetchFn: input.fetchFn,
  });
  if (!alertSend.ok) errors.push(alertSend.error ?? 'ALERT_SEND_FAILED');

  const receiptSend = await sendBrevoTransactional({
    apiKey: key,
    sender: ZX_FROM.intel,
    to: [{ email: input.record.email, name: input.record.company }],
    replyTo: ZX_FROM.intel,
    subject: receipt.subject,
    htmlContent: receipt.html,
    textContent: receipt.text,
    fetchFn: input.fetchFn,
  });
  if (!receiptSend.ok) errors.push(receiptSend.error ?? 'RECEIPT_SEND_FAILED');

  return {
    alert: alertSend.ok ? 'SENT' : 'FAILED',
    receipt: receiptSend.ok ? 'SENT' : 'FAILED',
    errors,
  };
}
