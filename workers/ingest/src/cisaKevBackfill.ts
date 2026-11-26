/**
 * PHASE 8C — CISA KEV catalog backfill (`known_exploited_vulnerabilities.json`).
 *
 * ONE unauthenticated request, on ONE quiet-hours tick (`04:40 UTC`), writing at
 * most 120 real catalog entries. Nothing is inferred: the catalog's own
 * `cveID`, `vulnerabilityName`, `shortDescription`, `vendorProject`, `product`,
 * `dateAdded`, `dueDate` and `knownRansomwareCampaignUse` are the only values
 * stored, and a richer existing NVD row is never overwritten.
 *
 * ISOLATION INVARIANT
 *   · `:20` belongs to the IOC ingest pass;
 *   · `:00` every fourth hour belongs to the NVD/KEV/EPSS pulse;
 *   · the ten Telegram wire slots own their fixed minutes;
 *   · `:40` quiet hours (02/04/06) belong to the PoC index and this catalog.
 * The `04:40` tick runs BOTH PoC and KEV, so the shared ceiling is 6 subrequests:
 * the PoC sync is given 5 and this pass uses exactly 1.
 */

export const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
export const CISA_KEV_SUBREQUESTS = 1;
export const CISA_KEV_QUIET_SLOT_HOURS: readonly number[] = [4];
export const CISA_KEV_MAX_ENTRIES = 120;
export const QUIET_TICK_SUBREQUEST_CEILING = 6;

/** The `:40` tick this backfill is allowed to own: 04:40 UTC only. */
export function isCisaKevSlot(when: Date = new Date()): boolean {
  return when.getUTCMinutes() === 40 && CISA_KEV_QUIET_SLOT_HOURS.includes(when.getUTCHours());
}

/**
 * The subrequest split for a quiet `:40` tick. On the shared 04:40 tick the PoC
 * pass is narrowed by exactly the KEV pass's single request, so the invocation
 * never exceeds the 6-subrequest ceiling.
 */
export function quietTickBudget(when: Date = new Date()): { cisaKev: number; poc: number } {
  return isCisaKevSlot(when)
    ? { cisaKev: CISA_KEV_SUBREQUESTS, poc: QUIET_TICK_SUBREQUEST_CEILING - CISA_KEV_SUBREQUESTS }
    : { cisaKev: 0, poc: QUIET_TICK_SUBREQUEST_CEILING };
}

export interface KevEntry {
  cve: string;
  title: string;
  description: string | null;
  vendor: string | null;
  product: string | null;
  dateAdded: string | null;
  dueDate: string | null;
  ransomware: string | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string | null {
  const out = typeof value === 'string' ? value.trim() : '';
  return out ? out.slice(0, max) : null;
}

/** Strict projection of the catalog's own records, newest addition first. */
export function selectKevEntries(json: unknown, limit = CISA_KEV_MAX_ENTRIES): KevEntry[] {
  const raw = (json as { vulnerabilities?: unknown })?.vulnerabilities;
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const entries: KevEntry[] = [];
  for (const row of rows) {
    const record = row as Record<string, unknown> | null;
    const cve = String(record?.cveID ?? '').trim().toUpperCase();
    if (!/^CVE-\d{4}-\d{4,}$/.test(cve) || seen.has(cve)) continue;
    const title = text(record?.vulnerabilityName, 300);
    if (!title) continue;
    seen.add(cve);
    entries.push({
      cve,
      title,
      description: text(record?.shortDescription, 1200),
      vendor: text(record?.vendorProject, 120),
      product: text(record?.product, 120),
      dateAdded: DATE.test(String(record?.dateAdded ?? '')) ? String(record?.dateAdded) : null,
      dueDate: DATE.test(String(record?.dueDate ?? '')) ? String(record?.dueDate) : null,
      ransomware: text(record?.knownRansomwareCampaignUse, 40),
    });
  }
  return entries
    .sort((a, b) => String(b.dateAdded ?? '').localeCompare(String(a.dateAdded ?? '')) || a.cve.localeCompare(b.cve))
    .slice(0, Math.max(1, limit));
}

export const KEV_UPSERT_SQL = `
  INSERT INTO vulnerabilities (
    id, cve_id, title, description, severity, is_exploited_in_wild,
    affected_vendor, affected_product, published_at,
    kev_due_date, kev_date_added, known_ransomware_campaign_use,
    provenance_state, provenance_source, provenance_updated_at,
    created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, 'UNKNOWN', 1,
    ?, ?, ?,
    ?, ?, ?,
    'AUTHORITATIVE_VERIFIED', 'cisa-kev', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  )
  ON CONFLICT(cve_id) DO UPDATE SET
    is_exploited_in_wild = 1,
    kev_due_date = COALESCE(excluded.kev_due_date, vulnerabilities.kev_due_date),
    kev_date_added = COALESCE(excluded.kev_date_added, vulnerabilities.kev_date_added),
    known_ransomware_campaign_use = COALESCE(excluded.known_ransomware_campaign_use, vulnerabilities.known_ransomware_campaign_use),
    affected_vendor = COALESCE(NULLIF(vulnerabilities.affected_vendor, ''), excluded.affected_vendor),
    affected_product = COALESCE(NULLIF(vulnerabilities.affected_product, ''), excluded.affected_product),
    description = COALESCE(NULLIF(vulnerabilities.description, ''), excluded.description),
    provenance_state = CASE
      WHEN COALESCE(vulnerabilities.provenance_state, '') IN ('', 'UNVERIFIED') THEN 'AUTHORITATIVE_VERIFIED'
      ELSE vulnerabilities.provenance_state
    END,
    provenance_source = COALESCE(vulnerabilities.provenance_source, 'cisa-kev'),
    provenance_updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

export interface CisaKevSummary {
  status: 'OK' | 'SKIPPED' | 'SLOT_ONLY';
  slot: boolean;
  catalog_version: string | null;
  entries_read: number;
  entries_written: number;
  subrequestsUsed: number;
  subrequestLimit: number;
  errors: string[];
}

export interface CisaKevEnv {
  DB: any;
  CISA_KEV_SYNC_ENABLED?: string;
  [key: string]: unknown;
}

/**
 * One bounded pass. `force` exists only for the operator route; the scheduled
 * tick always resolves the slot first. It never touches Telegram.
 */
export async function runCisaKevBackfill(
  env: CisaKevEnv,
  options: { fetchFn?: typeof fetch; when?: Date; force?: boolean; limit?: number } = {},
): Promise<CisaKevSummary> {
  const when = options.when ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;
  const slot = isCisaKevSlot(when);
  const summary: CisaKevSummary = {
    status: 'OK',
    slot,
    catalog_version: null,
    entries_read: 0,
    entries_written: 0,
    subrequestsUsed: 0,
    subrequestLimit: CISA_KEV_SUBREQUESTS,
    errors: [],
  };

  if (!slot && options.force !== true) {
    summary.status = 'SLOT_ONLY';
    summary.errors.push('OUTSIDE_QUIET_SLOT');
    return summary;
  }
  if (env?.CISA_KEV_SYNC_ENABLED !== 'true' && options.force !== true) {
    summary.status = 'SKIPPED';
    summary.errors.push('CISA_KEV_SYNC_DISABLED');
    return summary;
  }

  summary.subrequestsUsed = 1;
  let catalog: unknown;
  try {
    const response = await fetchFn(CISA_KEV_URL, {
      headers: { accept: 'application/json', 'user-agent': 'zayron-x-kev-backfill' },
    });
    if (!response.ok) {
      summary.errors.push(`HTTP_${response.status}`);
      return summary;
    }
    catalog = await response.json();
  } catch (error) {
    summary.errors.push(`FETCH_FAILED:${String((error as Error)?.message || error).slice(0, 80)}`);
    return summary;
  }

  summary.catalog_version = text((catalog as { dateReleased?: unknown })?.dateReleased, 40);
  const entries = selectKevEntries(catalog, options.limit ?? CISA_KEV_MAX_ENTRIES);
  summary.entries_read = entries.length;

  const statements = entries.map((entry) =>
    env.DB.prepare(KEV_UPSERT_SQL).bind(
      `vuln_${entry.cve.toLowerCase()}`,
      entry.cve,
      entry.title,
      entry.description,
      entry.vendor,
      entry.product,
      entry.dateAdded,
      entry.dueDate,
      entry.dateAdded,
      entry.ransomware,
    ),
  );

  for (let index = 0; index < statements.length; index += 25) {
    const chunk = statements.slice(index, index + 25);
    try {
      if (typeof env.DB.batch === 'function') {
        await env.DB.batch(chunk);
        summary.entries_written += chunk.length;
      } else {
        for (const statement of chunk) {
          await statement.run();
          summary.entries_written += 1;
        }
      }
    } catch (error) {
      summary.errors.push(`WRITE_FAILED:${String((error as Error)?.message || error).slice(0, 80)}`);
    }
  }

  return summary;
}

/** Density read for the operator: how many KEV rows this store now holds. */
export const KEV_DENSITY_SQL = `
  SELECT COUNT(*) AS kev_total,
         MAX(kev_date_added) AS newest_addition
    FROM vulnerabilities
   WHERE is_exploited_in_wild = 1`;
