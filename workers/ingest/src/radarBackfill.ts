/**
 * PHASE 9A (F5) — quiet-hours Cloudflare Radar ASN backfill.
 *
 * The IOC pass enriches at most `MAX_RADAR_IPS` (5) IPs per run, three runs a
 * day, which left 799 of 809 stored indicators without ASN data. This pass owns
 * three EMPTY quiet-hours ticks — 01:40, 03:40 and 05:40 UTC — none of which is
 * claimed by the `:20` IOC ingest, the `:00` pulse, the PoC sync (02/04/06:40),
 * the KEV backfill (04:40) or a Telegram slot.
 *
 * Budget: `RADAR_BACKFILL_MAX_SUBREQUESTS = 12` Radar IP-entity requests per
 * invocation, counted by the pass itself. No other external call is made.
 */

export const RADAR_BACKFILL_SLOT_HOURS: readonly number[] = [1, 3, 5];
export const RADAR_BACKFILL_MAX_SUBREQUESTS = 12;

export function isRadarBackfillSlot(when: Date = new Date()): boolean {
  return when.getUTCMinutes() === 40 && RADAR_BACKFILL_SLOT_HOURS.includes(when.getUTCHours());
}

export const RADAR_IP_ENTITY_ENDPOINT = 'https://api.cloudflare.com/client/v4/radar/entities/ip';

/**
 * Family-linked IPs first, then the highest-confidence remainder. Only
 * `ACTIVE` rows still missing an ASN are eligible, so a re-run is idempotent.
 */
export const RADAR_BACKFILL_CANDIDATES_SQL = `
  SELECT id, normalized_value
    FROM iocs
   WHERE type = 'ip'
     AND status = 'ACTIVE'
     AND asn IS NULL
   ORDER BY (CASE WHEN COALESCE(family, '') <> '' THEN 0 ELSE 1 END) ASC,
            confidence DESC,
            updated_at DESC
   LIMIT ?`;

export interface RadarBackfillEnv {
  DB: any;
  CF_RADAR_TOKEN?: string;
  [key: string]: unknown;
}

export interface RadarBackfillSummary {
  status: 'OK' | 'SKIPPED' | 'SLOT_ONLY' | 'NO_TOKEN';
  slot: boolean;
  candidates: number;
  enriched: number;
  subrequestsUsed: number;
  subrequestLimit: number;
  errors: string[];
}

/** One bounded pass. Never throws into the cron. */
export async function runRadarBackfill(
  env: RadarBackfillEnv,
  options: { when?: Date; force?: boolean; fetchFn?: typeof fetch; limit?: number } = {},
): Promise<RadarBackfillSummary> {
  const when = options.when ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;
  const slot = isRadarBackfillSlot(when);
  const summary: RadarBackfillSummary = {
    status: 'OK',
    slot,
    candidates: 0,
    enriched: 0,
    subrequestsUsed: 0,
    subrequestLimit: RADAR_BACKFILL_MAX_SUBREQUESTS,
    errors: [],
  };

  if (!slot && options.force !== true) {
    return { ...summary, status: 'SLOT_ONLY', errors: ['OUTSIDE_QUIET_SLOT'] };
  }
  const token = String(env?.CF_RADAR_TOKEN ?? '').trim();
  if (!token) return { ...summary, status: 'NO_TOKEN', errors: ['CF_RADAR_TOKEN_UNSET'] };

  const requested = Math.floor(Number(options.limit));
  const limit = Number.isFinite(requested)
    ? Math.min(RADAR_BACKFILL_MAX_SUBREQUESTS, Math.max(1, requested))
    : RADAR_BACKFILL_MAX_SUBREQUESTS;

  let rows: Array<{ id: string; normalized_value: string }> = [];
  try {
    const result = await env.DB.prepare(RADAR_BACKFILL_CANDIDATES_SQL).bind(limit).all();
    rows = (result?.results as Array<{ id: string; normalized_value: string }>) ?? [];
  } catch (error) {
    return { ...summary, errors: [`READ_FAILED:${String((error as Error)?.message ?? error).slice(0, 80)}`] };
  }
  summary.candidates = rows.length;

  const updates: any[] = [];
  for (const row of rows) {
    if (summary.subrequestsUsed >= limit) break;
    summary.subrequestsUsed += 1;
    try {
      const response = await fetchFn(
        `${RADAR_IP_ENTITY_ENDPOINT}?ip=${encodeURIComponent(row.normalized_value)}&format=json`,
        { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } },
      );
      if (!response.ok) {
        summary.errors.push(`HTTP_${response.status}`);
        continue;
      }
      const payload = (await response.json()) as any;
      const entity = payload?.result?.ip ?? payload?.result ?? null;
      const asn = entity?.asn ? String(entity.asn) : null;
      if (!asn) {
        summary.errors.push('NO_ASN_IN_RESPONSE');
        continue;
      }
      const asnName = typeof entity?.asnName === 'string' ? entity.asnName : null;
      const country = typeof entity?.location?.countryCode === 'string'
        ? entity.location.countryCode
        : typeof entity?.country === 'string' ? entity.country : null;
      updates.push(
        env.DB.prepare(
          `UPDATE iocs SET asn = COALESCE(?, asn), asn_name = COALESCE(?, asn_name),
                            country = COALESCE(?, country), radar_enriched_at = datetime('now'),
                            updated_at = datetime('now')
             WHERE id = ?`,
        ).bind(asn, asnName, country, row.id),
      );
      summary.enriched += 1;
    } catch (error) {
      summary.errors.push(`FETCH_FAILED:${String((error as Error)?.message ?? error).slice(0, 80)}`);
    }
  }

  if (updates.length > 0) {
    try {
      await env.DB.batch(updates);
    } catch (error) {
      summary.errors.push(`WRITE_FAILED:${String((error as Error)?.message ?? error).slice(0, 80)}`);
    }
  }
  summary.errors = summary.errors.slice(0, 8);
  return summary;
}

export const RADAR_BACKFILL_PROGRESS_SQL = `
  SELECT COUNT(*) AS total,
         SUM(CASE WHEN asn IS NULL THEN 1 ELSE 0 END) AS missing_asn
    FROM iocs WHERE status = 'ACTIVE' AND type = 'ip'`;
