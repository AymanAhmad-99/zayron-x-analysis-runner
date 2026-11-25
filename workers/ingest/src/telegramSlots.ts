/**
 * PHASE 7D — the 10-slot EU/US business-hours Telegram wire router.
 *
 * ONE cron expression (`0,20,40 * * * *`) drives everything. Every slot below
 * sits exactly on that grid, so a slot is decided by the UTC hour+minute of the
 * tick and nothing else — no scheduler state, no counters, no drift.
 *
 * This module is pure: the router is unit-tested in plain bun and the cron
 * handler only asks it "what should this tick do?".
 */

/** What a slot publishes. */
export type TelegramWireSlotKind = 'cve' | 'malware' | 'ioc' | 'radar';

export interface TelegramWireSlot {
  /** Position in the trading day, 1-based, for logs. */
  index: number;
  /** `HH:MM` UTC. */
  utc: string;
  /** UTC minute of day (hour * 60 + minute) — the routing key. */
  minuteOfDay: number;
  kind: TelegramWireSlotKind;
  /** Dispatched with `sendPhoto` (falls back to `sendMessage`). */
  visual: boolean;
  label: string;
}

/** The single cron trigger. Nothing else may be added: Free plan allows 5. */
export const TELEGRAM_WIRE_CRON = '0,20,40 * * * *';

const slot = (
  index: number,
  hour: number,
  minute: number,
  kind: TelegramWireSlotKind,
  visual: boolean,
  label: string,
): TelegramWireSlot => ({
  index,
  utc: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  minuteOfDay: hour * 60 + minute,
  kind,
  visual,
  label,
});

/**
 * EU/US business hours only (08:00 → 20:00 UTC). 4 visual cards, 6 text
 * posts. Slot order is the publication order and is also the priority order
 * for the smart CVE fallback.
 */
export const TELEGRAM_WIRE_SLOTS: readonly TelegramWireSlot[] = [
  slot(1, 8, 0, 'cve', true, 'CVE #1 — overnight P0/P1'),
  slot(2, 9, 20, 'malware', false, 'Supply-chain malware #1 (OpenSSF)'),
  slot(3, 10, 40, 'cve', false, 'CVE #2 — KEV / high EPSS'),
  slot(4, 12, 0, 'ioc', true, 'Active IOC / C2 brief #1'),
  slot(5, 13, 20, 'cve', false, 'CVE #3 — US East open'),
  slot(6, 14, 40, 'radar', true, 'Global threat / radar & IOC pulse'),
  slot(7, 16, 0, 'cve', false, 'CVE #4 — US West open'),
  slot(8, 17, 20, 'malware', false, 'Supply-chain malware #2 (OpenSSF)'),
  slot(9, 18, 40, 'ioc', false, 'Active IOC / EDL update #2'),
  slot(10, 20, 0, 'cve', true, 'CVE #5 — US afternoon peak'),
] as const;

/** First quiet minute (20:01 UTC) and the end of quiet hours (07:59 UTC). */
export const TELEGRAM_QUIET_AFTER_MINUTE = 20 * 60;
export const TELEGRAM_QUIET_UNTIL_MINUTE = 8 * 60;

/** CISA KEV is always breaking; an unlisted P0 needs this EPSS (either scale). */
export const TELEGRAM_P0_BREAKING_EPSS = 0.7;

export function utcMinuteOfDay(when: Date): number {
  return when.getUTCHours() * 60 + when.getUTCMinutes();
}

/**
 * Quiet hours: anything after 20:00 and before 08:00. The 20:00 slot itself is
 * inside business hours, so the boundary is exclusive on the late side.
 */
export function isTelegramQuietHours(when: Date): boolean {
  const minute = utcMinuteOfDay(when);
  return minute > TELEGRAM_QUIET_AFTER_MINUTE || minute < TELEGRAM_QUIET_UNTIL_MINUTE;
}

/** The slot whose `HH:MM` is exactly this tick, or `null`. */
export function resolveTelegramWireSlot(when: Date): TelegramWireSlot | null {
  const minute = utcMinuteOfDay(when);
  return TELEGRAM_WIRE_SLOTS.find((entry) => entry.minuteOfDay === minute) ?? null;
}

/**
 * COLLISION GUARD. IOC ingest runs at **:20** of every 8th hour
 * (`00:20`, `08:20`, `16:20`), never on the `:00` Telegram/NVD grid and never
 * on a `:40` slot, so no invocation carries both a full ingest pass and a post.
 */
export function isIocIngestTick(when: Date, everyHours = 8): boolean {
  const hour = when.getUTCHours();
  const minute = when.getUTCMinutes();
  return minute === 20 && hour % Math.max(1, Math.floor(everyHours)) === 0;
}

/** The heavy NVD/KEV/EPSS/pulse pass keeps its original 4-hourly cadence. */
export function isAuthoritativePulseTick(when: Date): boolean {
  return when.getUTCMinutes() === 0 && when.getUTCHours() % 4 === 0;
}

export interface BreakingP0Input {
  /** Newly flagged in CISA KEV — always breaking. */
  kevNewlyFlagged?: boolean;
  priority?: string | null;
  epssScore?: number | null;
}

/**
 * Quiet-hours override. ONLY a newly flagged CISA KEV listing or a `P0` brief
 * with EPSS ≥ 70% may break quiet hours. Everything else waits for 08:00.
 */
export function isBreakingP0(input: BreakingP0Input): boolean {
  if (input.kevNewlyFlagged === true) return true;
  const priority = String(input.priority ?? '').trim().toUpperCase();
  if (priority !== 'P0') return false;
  const raw = Number(input.epssScore);
  if (!Number.isFinite(raw)) return false;
  // EPSS is served as 0..1 by FIRST, but accept an already-scaled percentage.
  const percent = raw <= 1 ? raw * 100 : raw;
  return percent >= TELEGRAM_P0_BREAKING_EPSS * 100;
}

/** Prefix a dispatched payload with the breaking marker (quiet-hours posts). */
export function withBreakingPrefix(html: string): string {
  return `<b>[BREAKING P0]</b>\n${html}`;
}
