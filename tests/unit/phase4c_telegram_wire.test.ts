/**
 * Phase 4C — EXECUTIVE TELEGRAM INTELLIGENCE WIRE.
 *
 * The wire publishes to a PUBLIC channel, so the formatting and dispatch rules
 * are contractual: escaped HTML, an underlined anchor instead of a raw URL, a
 * hashtag policy that cannot be stuffed, a hard daily cap and a ledger that
 * makes a second post for the same entity impossible.
 */
import { describe, expect, test } from 'bun:test';
import {
  TELEGRAM_MAX_MESSAGE_CHARS,
  TELEGRAM_MIN_HASHTAGS,
  briefSentences,
  composeHashtags,
  cveHashtag,
  escapeTelegramHtml,
  formatCveTelegramDispatch,
  formatMalwareTelegramDispatch,
  malwareDispatchSignals,
  sanitizeHashtagToken,
  shortenSha256,
  validateTelegramDispatch,
} from '../../packages/intelligence/src/syndication/telegramFormatter';
import {
  TELEGRAM_AUTOMATED_MIN_SPACING_MINUTES,
  TELEGRAM_DEFAULT_DAILY_CAP,
  TELEGRAM_DEFAULT_PER_TICK,
  isDispatchableDossier,
  resolveChatId,
  resolveDailyCap,
  resolvePerTick,
  runTelegramDispatchPass,
  telegramOutboundEnabled,
} from '../../workers/ingest/src/telegramDispatch';

const CVE_RECORD = {
  cve_id: 'CVE-2026-132147',
  severity: 'CRITICAL',
  cvss_score: 9.8,
  epss_score: 0.124,
  known_exploited: true,
  kev_due_date: '2026-12-05',
  vendor: 'Debian',
  product: 'SP Page Builder <extension> & "Joomla"',
  cwe_ids: ['CWE-22'],
  affected_versions: ['<= 3.8.5', '3.9.0'],
  cisa_ssvc: { automatable: 'yes' },
  public_poc_status: 'OBSERVED',
  brief: {
    executive_bluf: 'Unauthenticated path traversal reaches every tenant file. Patch in 24 hours; the KEV listing makes exposure a board-level risk.',
    operational_prioritization: { priority: 'P0', remediation_sla: '24–48 hours' },
  },
};

const MALWARE_REPORT = {
  sha256: 'ddb6373001735b759216f2481fe85d57eb016ab32797bbe5bdc21362ce13b973',
  sample_identity: { sha256: 'ddb6373001735b759216f2481fe85d57eb016ab32797bbe5bdc21362ce13b973', format_class: 'PE32' },
  static_findings: {
    statements: [
      { statement: 'Static tooling reported 7 capability candidate(s) (create process, inject thread, read file, write file, encode data, connect socket, persist registry)' },
    ],
  },
  infrastructure: {
    items: [
      { indicator_value: 'c2.example-malicious.test', indicator_type: 'DOMAIN' },
      { indicator_value: 'http://w3.org/2001/XMLSchema', indicator_type: 'URL' },
      { indicator_value: '192.168.1.10', indicator_type: 'IPV4' },
    ],
  },
  family: { resolved_family: 'AgentTesla' },
};

const MALWARE_BRIEF = {
  executive_bluf: 'The sample CONTAINS credential harvesting and outbound socket capability; nothing was executed. Containment should start with egress control.',
  capability_chain: 'Static capability chain: process injection, file read/write and socket connect are present.',
  soc_hunting_playbook: { triage_checks: ['x'], hunting_checks: ['y'], containment: ['z'] },
  family_and_limits: { family_provenance: 'Single-source MalwareBazaar tag.', static_limits: ['No runtime observation.'] },
};

/* ─────────────────────────────── escaping ─────────────────────────────────── */

describe('telegram formatter — escaping', () => {
  test('escapes &, < and > without double-escaping the ampersand last', () => {
    expect(escapeTelegramHtml('a & b <script>alert(1)</script> > c')).toBe(
      'a &amp; b &lt;script&gt;alert(1)&lt;/script&gt; &gt; c',
    );
    expect(escapeTelegramHtml(null)).toBe('');
  });

  test('a CVE product containing markup can never break parse_mode HTML', () => {
    const payload = formatCveTelegramDispatch(CVE_RECORD);
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;extension&gt;');
    expect(payload.html).toContain('&amp;');
    expect(validateTelegramDispatch(payload.html, payload.hashtags)).toEqual([]);
  });
});

/* ──────────────────────────── link and hashtags ───────────────────────────── */

describe('telegram formatter — executive CTA link', () => {
  test('renders an underlined blue anchor and NO raw URL in the body', () => {
    const payload = formatCveTelegramDispatch(CVE_RECORD);
    expect(payload.html).toContain(
      '<a href="https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-132147"><u>Inspect Full Technical Advisory &amp; Defender Playbook ↗</u></a>',
    );
    const withoutAnchors = payload.html.replace(/href="[^"]*"/gi, '');
    expect(withoutAnchors).not.toContain('https://');
    expect(payload.url).toBe('https://zayron-x.co/intelligence/vulnerabilities/CVE-2026-132147');
  });

  test('malware dossier CTA points at the canonical report route', () => {
    const payload = formatMalwareTelegramDispatch({
      report_id: 'mir_66cd231d1563b12f',
      sha256: MALWARE_REPORT.sha256,
      family: 'AgentTesla',
      severity: 'HIGH',
      format_class: 'PE32',
      capability_candidates: 7,
      primary_network_indicators: 1,
      brief: MALWARE_BRIEF,
    });
    expect(payload.html).toContain(
      '<a href="https://zayron-x.co/malware/intelligence/reports/mir_66cd231d1563b12f"><u>Access Full Static Dossier, ATT&amp;CK Chain &amp; Hunting Rules ↗</u></a>',
    );
    expect(validateTelegramDispatch(payload.html, payload.hashtags)).toEqual([]);
  });
});

describe('telegram formatter — hashtag policy', () => {
  test('CVE post carries the mandatory tags plus verified vendor and KEV tags', () => {
    const payload = formatCveTelegramDispatch(CVE_RECORD);
    expect(payload.hashtags.length).toBeGreaterThanOrEqual(TELEGRAM_MIN_HASHTAGS);
    expect(payload.hashtags.length).toBeLessThanOrEqual(7);
    expect(payload.hashtags).toContain('#USA');
    expect(payload.hashtags).toContain('#CyberSecurity');
    expect(payload.hashtags).toContain('#ThreatIntel');
    expect(payload.hashtags).toContain('#Debian');
    expect(payload.hashtags).toContain('#CISAKEV');
    expect(payload.hashtags).toContain('#CVE_2026_132147');
  });

  test('#CISAKEV is never fabricated: an unlisted CVE does not carry it', () => {
    const payload = formatCveTelegramDispatch({
      ...CVE_RECORD,
      cve_id: 'CVE-2026-999999',
      known_exploited: false,
      kev_due_date: null,
      public_poc_status: 'NOT_OBSERVED',
    });
    expect(payload.hashtags).not.toContain('#CISAKEV');
    expect(payload.html).toContain('NOT_LISTED');
    expect(payload.hashtags).toContain('#USA');
  });

  test('CVE id hashtag replaces hyphens with underscores', () => {
    expect(cveHashtag('CVE-2026-132147')).toBe('#CVE_2026_132147');
    expect(cveHashtag('cve-2026-132147')).toBe('#CVE_2026_132147');
  });

  test('hyphens terminate a Telegram tag, so sanitized tokens never contain one', () => {
    expect(sanitizeHashtagToken('SP Page Builder-ext')).toBe('SPPageBuilderext');
    expect(sanitizeHashtagToken('Zoë-Software')).toBe('ZoeSoftware');
  });

  test('tag list is deduped case-insensitively and capped at 7', () => {
    const tags = composeHashtags(['#USA', '#CyberSecurity', '#ThreatIntel', '#threatintel', '#A1', '#B2', '#C3', '#D4', '#E5']);
    expect(tags).toHaveLength(7);
    expect(tags.filter((tag) => tag.toLowerCase() === '#threatintel')).toHaveLength(1);
    expect(tags[2]).toBe('#ThreatIntel');
  });
});

/* ─────────────────────────────── validator ────────────────────────────────── */

describe('telegram validator', () => {
  test('rejects a raw URL outside an anchor', () => {
    const html = 'See https://zayron-x.co/x for more.\n#USA #CyberSecurity #ThreatIntel #InfoSec #Malware';
    expect(validateTelegramDispatch(html)).toContain('RAW_URL_IN_BODY');
  });

  test('rejects fewer than five hashtags and any missing mandatory tag', () => {
    expect(validateTelegramDispatch('text\n#USA #CyberSecurity').some((e) => e.startsWith('TOO_FEW_HASHTAGS'))).toBe(true);
    const noUsa = 'text\n#CyberSecurity #ThreatIntel #InfoSec #Malware #DFIR';
    expect(validateTelegramDispatch(noUsa)).toContain('MISSING_HASHTAG:#USA');
  });

  test('rejects an over-long message and a missing underlined CTA', () => {
    const long = 'x'.repeat(TELEGRAM_MAX_MESSAGE_CHARS + 1);
    expect(validateTelegramDispatch(long).some((e) => e.startsWith('MESSAGE_TOO_LONG'))).toBe(true);
    expect(validateTelegramDispatch('plain\n#USA #CyberSecurity #ThreatIntel #InfoSec #DFIR')).toContain('MISSING_UNDERLINED_CTA');
  });

  test('a rendered CVE post stays inside the executive target band', () => {
    const payload = formatCveTelegramDispatch(CVE_RECORD);
    expect(payload.html.length).toBeGreaterThan(400);
    expect(payload.html.length).toBeLessThan(1400);
  });
});

/* ───────────────────────────── text helpers ───────────────────────────────── */

describe('telegram text helpers', () => {
  test('brief is bounded to two sentences', () => {
    const text = 'One. Two. Three. Four.';
    expect(briefSentences(text, 2)).toBe('One. Two.');
  });

  test('two full sentences are returned without any mid-sentence cut', () => {
    const text = 'The flaw exposes lateral movement within a single tenant boundary. '
      + 'Patch within 24 hours because exploitation is already observed in the wild. '
      + 'A third sentence is dropped entirely.';
    const brief = briefSentences(text, 2);
    expect(brief).not.toContain('…');
    expect(brief.endsWith('.')).toBe(true);
    expect(brief).toBe(
      'The flaw exposes lateral movement within a single tenant boundary. '
      + 'Patch within 24 hours because exploitation is already observed in the wild.',
    );
  });

  test('an over-long second sentence is dropped whole instead of chopped', () => {
    const text = `Short opening sentence ends here. ${'a'.repeat(400)} trailing clause never closes`;
    const brief = briefSentences(text, 2, 320);
    expect(brief).toBe('Short opening sentence ends here.');
    expect(brief).not.toContain('…');
  });

  test('a rendered CVE brief never ends in a mid-phrase ellipsis', () => {
    const html = formatCveTelegramDispatch({
      ...CVE_RECORD,
      brief: {
        executive_bluf: 'Authenticated attackers reach adjacent tenants through a path traversal in the asset resolver. '
          + 'Lateral movement within the shared hosting tier is possible once a single session is captured, which raises blast radius to estate level. '
          + 'Patch now.',
        operational_prioritization: { priority: 'P0', remediation_sla: '24–48 hours' },
      },
    }).html;
    const assessment = html.split('<b>EXECUTIVE ASSESSMENT</b>\n')[1].split('\n')[0];
    expect(assessment).not.toContain('…');
    expect(/[.!?]$/.test(assessment)).toBe(true);
  });

  test('every dispatch carries the channel attribution line above the hashtags', () => {
    const cve = formatCveTelegramDispatch(CVE_RECORD);
    const malware = formatMalwareTelegramDispatch({
      report_id: 'mir_66cd231d1563b12f',
      sha256: MALWARE_REPORT.sha256,
      family: 'AgentTesla',
      severity: 'HIGH',
      format_class: 'PE32',
      capability_candidates: 7,
      primary_network_indicators: 1,
      brief: MALWARE_BRIEF,
    });
    for (const payload of [cve, malware]) {
      const lines = payload.html.split('\n');
      const tagLine = lines.findIndex((line) => line.startsWith('#USA'));
      expect(lines[tagLine - 1]).toBe('@zayronxai');
      expect(validateTelegramDispatch(payload.html, payload.hashtags)).toEqual([]);
    }
  });

  test('sha256 is shortened without losing the 64-hex identity', () => {
    expect(shortenSha256(MALWARE_REPORT.sha256)).toBe('ddb637300173…ce13b973');
    expect(shortenSha256('nope')).toBe('UNAVAILABLE');
  });
});

/* ──────────────────────────── dispatcher policy ───────────────────────────── */

describe('telegram dispatcher — closed by default', () => {
  test('outbound opens only for the literal "true"', () => {
    expect(telegramOutboundEnabled({ DB: null })).toBe(false);
    expect(telegramOutboundEnabled({ DB: null, TELEGRAM_OUTBOUND_ENABLED: 'TRUE ' } as any)).toBe(true);
    expect(telegramOutboundEnabled({ DB: null, TELEGRAM_OUTBOUND_ENABLED: 'yes' } as any)).toBe(false);
  });

  test('daily cap defaults to 6 and can never be raised above it', () => {
    expect(resolveDailyCap({ DB: null })).toBe(TELEGRAM_DEFAULT_DAILY_CAP);
    expect(resolveDailyCap({ DB: null, TELEGRAM_MAX_DAILY_DISPATCHES: '50' })).toBe(6);
    expect(resolveDailyCap({ DB: null, TELEGRAM_MAX_DAILY_DISPATCHES: '0' })).toBe(6);
    expect(resolveDailyCap({ DB: null, TELEGRAM_MAX_DAILY_DISPATCHES: '2' })).toBe(2);
  });

  test('channel resolves to an @handle', () => {
    expect(resolveChatId({ DB: null, TELEGRAM_TARGET_CHANNEL: 'zayronxai' })).toBe('@zayronxai');
    expect(resolveChatId({ DB: null, TELEGRAM_TARGET_CHANNEL: '@zayronxai' })).toBe('@zayronxai');
    expect(resolveChatId({ DB: null })).toBe('');
  });

  test('a thin dossier is not dispatched, a grounded one is', () => {
    expect(isDispatchableDossier({ capability_candidates: 0, primary_network_indicators: 0, family: null })).toBe(false);
    expect(isDispatchableDossier({ capability_candidates: 5, primary_network_indicators: 0, family: null })).toBe(true);
  });

  test('signals demote schema noise and non-routable addresses', () => {
    const signals = malwareDispatchSignals(MALWARE_REPORT);
    expect(signals.capability_candidates).toBe(7);
    expect(signals.primary_network_indicators).toBe(1);
    expect(signals.family).toBe('AgentTesla');
    expect(signals.sha256).toBe(MALWARE_REPORT.sha256);
  });
});

/* ──────────────────────────── dispatcher behaviour ────────────────────────── */

function cveRow(overrides: Record<string, unknown> = {}) {
  return {
    cve_id: 'CVE-2026-132147',
    severity: 'CRITICAL',
    cvss_score: 9.8,
    epss_score: 0.124,
    epss_percentile: 0.99,
    is_exploited_in_wild: 1,
    kev_due_date: '2026-12-05',
    affected_vendor: 'Debian',
    affected_product: 'SP Page Builder',
    cwe_ids_json: JSON.stringify(['CWE-22']),
    affected_versions_json: JSON.stringify(['<= 3.8.5']),
    ssvc_json: JSON.stringify({ automatable: 'yes' }),
    public_poc_status: 'OBSERVED',
    strategic_brief_json: JSON.stringify(CVE_RECORD.brief),
    ...overrides,
  };
}

function malwareRow() {
  return {
    id: 'mir_66cd231d1563b12f',
    sha256: MALWARE_REPORT.sha256,
    family: null,
    severity: 'HIGH',
    report_json: JSON.stringify(MALWARE_REPORT),
    strategic_brief_json: JSON.stringify(MALWARE_BRIEF),
  };
}

function makeDb(seed: { cves?: any[]; malware?: any[]; sentToday?: number; lastSentAt?: string | null }) {
  const ledger: Array<{ args: unknown[] }> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async all() {
              if (sql.includes('FROM vulnerabilities')) return { results: seed.cves ?? [] };
              if (sql.includes('FROM malware_reports')) return { results: seed.malware ?? [] };
              return { results: [] };
            },
            async first() {
              if (sql.includes('COUNT(*)')) return { total: seed.sentToday ?? 0 };
              if (sql.includes('MAX(dispatched_at)')) return { last_sent_at: seed.lastSentAt ?? null };
              return null;
            },
            async run() {
              ledger.push({ args });
              return { success: true };
            },
          };
        },
      };
    },
  };
  return { db, ledger };
}

describe('telegram dispatcher — dry run and idempotency', () => {
  test('dry run renders the exact payload and never touches the network or ledger', async () => {
    const { db, ledger } = makeDb({ cves: [cveRow()] });
    let called = 0;
    const summary = await runTelegramDispatchPass(
      { DB: db, TELEGRAM_TARGET_CHANNEL: 'zayronxai', TELEGRAM_OUTBOUND_ENABLED: 'false' } as any,
      { dryRun: true, limit: 1, fetchFn: (async () => { called += 1; throw new Error('must not send'); }) as any },
    );
    expect(called).toBe(0);
    expect(ledger).toHaveLength(0);
    expect(summary.status).toBe('OK');
    expect(summary.dispatched).toHaveLength(1);
    expect(summary.dispatched[0].entity_id).toBe('CVE-2026-132147');
    expect(summary.dispatched[0].error_code).toBe('DRY_RUN');
    expect(summary.dispatched[0].html).toContain('<u>Inspect Full Technical Advisory');
  });

  test('a live pass is refused while the wire is closed', async () => {
    const { db, ledger } = makeDb({ cves: [cveRow()] });
    const summary = await runTelegramDispatchPass(
      { DB: db, TELEGRAM_TARGET_CHANNEL: 'zayronxai' } as any,
      { fetchFn: (async () => { throw new Error('must not send'); }) as any },
    );
    expect(summary.status).toBe('DISABLED');
    expect(summary.dispatched).toHaveLength(0);
    expect(ledger).toHaveLength(0);
  });

  test('open wire without a bot token reports NO_BOT_TOKEN and sends nothing', async () => {
    const { db } = makeDb({ cves: [cveRow()] });
    const summary = await runTelegramDispatchPass(
      { DB: db, TELEGRAM_TARGET_CHANNEL: 'zayronxai', TELEGRAM_OUTBOUND_ENABLED: 'true' } as any,
      { fetchFn: (async () => { throw new Error('must not send'); }) as any },
    );
    expect(summary.status).toBe('NO_BOT_TOKEN');
  });

  test('one live dispatch posts once, records SENT and yields the t.me link', async () => {
    const { db, ledger } = makeDb({ cves: [cveRow()] });
    const sent: any[] = [];
    const summary = await runTelegramDispatchPass(
      {
        DB: db,
        TELEGRAM_TARGET_CHANNEL: 'zayronxai',
        TELEGRAM_OUTBOUND_ENABLED: 'true',
        TELEGRAM_BOT_TOKEN: 'TEST_TOKEN_VALUE',
      } as any,
      {
        limit: 1,
        fetchFn: (async (url: string, init: any) => {
          sent.push({ url, body: JSON.parse(init.body) });
          return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 4242 } }) };
        }) as any,
      },
    );
    expect(sent).toHaveLength(1);
    // The token is used, never rendered into the payload or the loggable summary.
    expect(sent[0].url).toContain('/botTEST_TOKEN_VALUE/sendMessage');
    expect(JSON.stringify(summary)).not.toContain('TEST_TOKEN_VALUE');
    expect(sent[0].body.parse_mode).toBe('HTML');
    expect(sent[0].body.link_preview_options).toEqual({ is_disabled: true });
    expect(sent[0].body.chat_id).toBe('@zayronxai');
    expect(sent[0].body.text).not.toContain('https://zayron-x.co/x');
    expect(summary.dispatched[0].status).toBe('SENT');
    expect(summary.dispatched[0].telegram_message_id).toBe('4242');
    expect(summary.dispatched[0].link).toBe('https://t.me/zayronxai/4242');
    expect(ledger).toHaveLength(1);
    expect(ledger[0].args).toContain('SENT');
    expect(ledger[0].args).toContain('4242');
  });

  test('the daily cap stops dispatch at 6, and a reached cap sends nothing', async () => {
    const atCap = makeDb({ cves: [cveRow()], sentToday: 6 });
    let called = 0;
    const reached = await runTelegramDispatchPass(
      { DB: atCap.db, TELEGRAM_TARGET_CHANNEL: 'zayronxai', TELEGRAM_OUTBOUND_ENABLED: 'true', TELEGRAM_BOT_TOKEN: 'T' } as any,
      { fetchFn: (async () => { called += 1; throw new Error('must not send'); }) as any },
    );
    expect(called).toBe(0);
    expect(reached.sent_today).toBe(6);
    expect(reached.remaining).toBe(0);
    expect(reached.skipped[0].reason).toBe('DAILY_CAP_REACHED');
  });

  test('a Telegram rejection is recorded as FAILED, never retried silently', async () => {
    const { db, ledger } = makeDb({ cves: [cveRow()] });
    const summary = await runTelegramDispatchPass(
      { DB: db, TELEGRAM_TARGET_CHANNEL: 'zayronxai', TELEGRAM_OUTBOUND_ENABLED: 'true', TELEGRAM_BOT_TOKEN: 'T' } as any,
      {
        limit: 1,
        fetchFn: (async () => ({ ok: false, status: 403, json: async () => ({ ok: false, error_code: 403, description: 'Forbidden: bot is not a member' }) })) as any,
      },
    );
    expect(summary.dispatched[0].status).toBe('FAILED');
    expect(summary.dispatched[0].error_code).toBe('TELEGRAM_403');
    expect(summary.dispatched[0].link).toBeNull();
    expect(ledger[0].args).toContain('FAILED');
  });

  test('malware dispatch renders the v1 brief inside CAN_DO language', async () => {
    const { db } = makeDb({ malware: [malwareRow()] });
    const summary = await runTelegramDispatchPass(
      { DB: db, TELEGRAM_TARGET_CHANNEL: 'zayronxai' } as any,
      { dryRun: true, entityType: 'malware' },
    );
    const html = summary.dispatched[0]?.html ?? '';
    expect(html).toContain('🟣 <b>ZAYRON-X | STATIC MALWARE DOSSIER</b>');
    expect(html).toContain('CAN_DO, not execution');
    expect(html).toContain('single-source feed tag');
    expect(html).toContain('ddb637300173…ce13b973');
    expect(summary.dispatched[0].entity_type).toBe('malware');
  });
});

/* ────────────────────────── cron pacing (anti-burst) ──────────────────────── */

function okFetch(sent: any[]) {
  return (async (url: string, init: any) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 5000 + sent.length } }) };
  }) as any;
}

function threeCves() {
  return [cveRow(), cveRow({ cve_id: 'CVE-2026-000002' }), cveRow({ cve_id: 'CVE-2026-000003' })];
}

const OPEN_ENV = {
  TELEGRAM_TARGET_CHANNEL: 'zayronxai',
  TELEGRAM_OUTBOUND_ENABLED: 'true',
  TELEGRAM_BOT_TOKEN: 'T',
};

describe('telegram dispatcher — cron pacing', () => {
  test('per-tick defaults to 1 and can never exceed the daily cap', () => {
    expect(TELEGRAM_DEFAULT_PER_TICK).toBe(1);
    expect(resolvePerTick({ DB: null })).toBe(1);
    expect(resolvePerTick({ DB: null, TELEGRAM_MAX_PER_TICK: '0' })).toBe(1);
    expect(resolvePerTick({ DB: null, TELEGRAM_MAX_PER_TICK: 'abc' })).toBe(1);
    expect(resolvePerTick({ DB: null, TELEGRAM_MAX_PER_TICK: '2' })).toBe(2);
    expect(resolvePerTick({ DB: null, TELEGRAM_MAX_PER_TICK: '99' })).toBe(TELEGRAM_DEFAULT_DAILY_CAP);
    // A per-tick value above a lowered daily cap is clamped to that cap.
    expect(resolvePerTick({ DB: null, TELEGRAM_MAX_PER_TICK: '5', TELEGRAM_MAX_DAILY_DISPATCHES: '2' })).toBe(2);
  });

  test('an automated tick publishes ONE post even with a three-CVE backlog', async () => {
    const { db, ledger } = makeDb({ cves: threeCves() });
    const sent: any[] = [];
    const summary = await runTelegramDispatchPass(
      { DB: db, ...OPEN_ENV } as any,
      { automated: true, fetchFn: okFetch(sent) },
    );
    expect(sent).toHaveLength(1);
    expect(ledger).toHaveLength(1);
    expect(summary.automated).toBe(true);
    expect(summary.per_tick).toBe(1);
    expect(summary.dispatched).toHaveLength(1);
    expect(summary.sent_today).toBe(1);
  });

  test('automated dispatch is suppressed inside the 180-minute anti-burst window', async () => {
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const { db, ledger } = makeDb({ cves: threeCves(), lastSentAt: elevenMinutesAgo });
    let called = 0;
    const summary = await runTelegramDispatchPass(
      { DB: db, ...OPEN_ENV } as any,
      { automated: true, fetchFn: (async () => { called += 1; throw new Error('must not send'); }) as any },
    );
    expect(called).toBe(0);
    expect(ledger).toHaveLength(0);
    expect(summary.dispatched).toHaveLength(0);
    expect(summary.skipped[0].reason).toBe('AUTOMATED_SPACING_COOLDOWN');
    expect(summary.last_sent_at).toBe(elevenMinutesAgo);
    expect(summary.spacing_remaining_minutes).toBeGreaterThan(0);
    expect(summary.spacing_remaining_minutes).toBeLessThanOrEqual(TELEGRAM_AUTOMATED_MIN_SPACING_MINUTES);
  });

  test('the window is exactly 180 minutes: 179 blocks, 181 allows one post', async () => {
    const blocked = makeDb({ cves: threeCves(), lastSentAt: new Date(Date.now() - 179 * 60 * 1000).toISOString() });
    let blockedCalls = 0;
    const held = await runTelegramDispatchPass(
      { DB: blocked.db, ...OPEN_ENV } as any,
      { automated: true, fetchFn: (async () => { blockedCalls += 1; throw new Error('must not send'); }) as any },
    );
    expect(blockedCalls).toBe(0);
    expect(held.skipped[0].reason).toBe('AUTOMATED_SPACING_COOLDOWN');

    const clear = makeDb({ cves: threeCves(), lastSentAt: new Date(Date.now() - 181 * 60 * 1000).toISOString() });
    const sent: any[] = [];
    const released = await runTelegramDispatchPass(
      { DB: clear.db, ...OPEN_ENV } as any,
      { automated: true, fetchFn: okFetch(sent) },
    );
    expect(sent).toHaveLength(1);
    expect(released.dispatched[0].status).toBe('SENT');
  });

  test('the operator route ignores the cooldown and the per-tick ceiling', async () => {
    const { db } = makeDb({
      cves: threeCves(),
      lastSentAt: new Date(Date.now() - 60 * 1000).toISOString(),
    });
    const sent: any[] = [];
    const summary = await runTelegramDispatchPass(
      { DB: db, ...OPEN_ENV } as any,
      { limit: 3, fetchFn: okFetch(sent) },
    );
    expect(summary.automated).toBe(false);
    expect(sent).toHaveLength(3);
    expect(summary.skipped).toHaveLength(0);
  });

  test('a dry run stays exempt from the cooldown so the payload is still reviewable', async () => {
    const { db } = makeDb({ cves: threeCves(), lastSentAt: new Date(Date.now() - 60 * 1000).toISOString() });
    const summary = await runTelegramDispatchPass(
      { DB: db, ...OPEN_ENV } as any,
      { automated: true, dryRun: true },
    );
    expect(summary.dispatched).toHaveLength(1);
    expect(summary.dispatched[0].error_code).toBe('DRY_RUN');
  });
});

/* ─────────────────────────── migration contract ───────────────────────────── */

describe('telegram ledger migration', () => {
  test('0033 declares the dedupe constraint and the allowed states', async () => {
    const sql = await Bun.file(new URL('../../db/migrations/0033_telegram_dispatches.sql', import.meta.url)).text();
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS telegram_dispatches');
    expect(sql).toContain('UNIQUE (entity_type, entity_id, channel)');
    expect(sql).toContain("CHECK (status IN ('SENT', 'FAILED', 'SKIPPED'))");
  });

  test('the selection query excludes anything already SENT or SKIPPED', async () => {
    const source = await Bun.file(new URL('../../workers/ingest/src/telegramDispatch.ts', import.meta.url)).text();
    expect(source).toContain("d.status IN ('SENT', 'SKIPPED')");
    expect(source).toContain("strategic_brief_version = 'ai_analyst_assessment.v4'");
    expect(source).toContain("strategic_brief_version = 'malware_strategic_brief.v1'");
  });
});

/* ───────────────── scheduled ordering & operator observability ─────────────── */

describe('cron ordering — the wire runs before the heavy pulse', () => {
  test('the scheduled handler dispatches before any ingest subrequest', async () => {
    const source = await Bun.file(new URL('../../workers/ingest/src/index.ts', import.meta.url)).text();
    const dispatch = source.indexOf('runTelegramDispatchPass(env as any, { automated: true })');
    const pulse = source.indexOf('runAuthoritativePulse(env as any');
    // Both calls must exist in this exact order: a Worker invocation shares one
    // subrequest budget, so a pulse that runs first can starve the wire (this is
    // precisely what made the 00:00 UTC tick post nothing).
    expect(dispatch).toBeGreaterThan(-1);
    expect(pulse).toBeGreaterThan(-1);
    expect(dispatch).toBeLessThan(pulse);
  });

  test('each pass stays in its own try/catch so one cannot abort the other', async () => {
    const source = await Bun.file(new URL('../../workers/ingest/src/index.ts', import.meta.url)).text();
    expect(source).toContain("type: 'TELEGRAM_DISPATCH_PASS_FAILED'");
    expect(source).toContain("type: 'AUTHORITATIVE_CVE_PULSE_FAILED'");
  });
});

describe('render gate observability', () => {
  test('a rejected payload is logged with its entity id and validator errors', async () => {
    const source = await Bun.file(new URL('../../workers/ingest/src/telegramDispatch.ts', import.meta.url)).text();
    expect(source).toContain('TELEGRAM_RENDER_REJECTED');
    expect(source).toContain('reason: \'RENDER_REJECTED\'');
    // The log must carry the failures, not just the fact that one happened.
    const log = source.slice(source.indexOf('TELEGRAM_RENDER_REJECTED'));
    expect(log).toContain('entity_id: payload.entity_id');
    expect(log).toContain('errors,');
  });
});
