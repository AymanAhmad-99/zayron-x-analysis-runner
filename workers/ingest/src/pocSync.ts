/**
 * PHASE 8A — keyless `nomi-sec/PoC-in-GitHub` index sync.
 *
 * WHAT IT IS
 *   Two to four unauthenticated GitHub requests that read the upstream yearly
 *   directory listing and the JSON index of the newest CVE files, then upsert
 *   the REAL repository entries into `cve_pocs`. Nothing is invented: a CVE
 *   with no upstream repository simply has no row, and the API answers
 *   `pocs: []` (rendered as "No verified public PoC tracked").
 *
 * WHEN IT RUNS
 *   ONLY on the quiet-hours `:40` ticks at **02:40** and **06:40 UTC**. This is
 *   the isolation invariant of Phase 8A:
 *     · `:20` belongs to the IOC ingest pass (`00:20`/`08:20`/`16:20`);
 *     · the ten Telegram wire slots own 08:00, 09:20, 10:40, 12:00, 13:20,
 *       14:40, 16:00, 17:20, 18:40 and 20:00;
 *     · the heavy NVD/KEV/EPSS pulse owns `:00` every fourth hour.
 *   Neither 02:40 nor 06:40 collides with any of them, so this sync never
 *   competes for a shared Worker invocation subrequest budget.
 *
 * BUDGET
 *   `POC_MAX_SUBREQUESTS = 4` — one directory listing plus at most three raw
 *   CVE index files. The pass counts its own fetches and stops at the ceiling.
 */

export const POC_REPO = 'nomi-sec/PoC-in-GitHub';
export const POC_BRANCH = 'master';
export const POC_MAX_SUBREQUESTS = 4;
export const POC_MAX_FILES = POC_MAX_SUBREQUESTS - 1;
export const POC_QUIET_SLOT_HOURS: readonly number[] = [2, 6];

/** The `:40` quiet-hours ticks this sync is allowed to own. */
export function isPocSyncSlot(when: Date = new Date()): boolean {
  return when.getUTCMinutes() === 40 && POC_QUIET_SLOT_HOURS.includes(when.getUTCHours());
}

/** `CVE-2026-135713.json` → `CVE-2026-135713`; anything else → `null`. */
export function pocCveFromFileName(name: unknown): string | null {
  const value = String(name ?? '').trim();
  const match = /^(CVE-\d{4}-\d{4,})\.json$/i.exec(value);
  return match ? match[1].toUpperCase() : null;
}

/** Newest CVE files from a GitHub contents listing (numeric, descending). */
export function newestPocFileNames(json: unknown, limit = POC_MAX_FILES): string[] {
  const entries = Array.isArray(json) ? json : [];
  const cvss = entries
    .map((entry) => pocCveFromFileName((entry as { name?: unknown })?.name))
    .filter((id): id is string => Boolean(id));
  const numeric = (id: string) => Number(id.split('-')[2]) || 0;
  return cvss
    .sort((a, b) => numeric(b) - numeric(a))
    .slice(0, Math.max(0, limit));
}

export interface PocIndexEntry {
  fullName: string;
  htmlUrl: string;
  stars: number;
  description: string | null;
  discoveredAt: string | null;
}

/** Strict projection of the upstream repository objects — nothing inferred. */
export function parsePocIndex(json: unknown): PocIndexEntry[] {
  const entries = Array.isArray(json) ? json : [];
  const out: PocIndexEntry[] = [];
  const seen = new Set<string>();
  for (const raw of entries) {
    const entry = raw as Record<string, unknown> | null;
    if (!entry || typeof entry !== 'object') continue;
    const fullName = typeof entry.full_name === 'string' ? entry.full_name.trim() : '';
    const htmlUrl = typeof entry.html_url === 'string' ? entry.html_url.trim() : '';
    if (!fullName || !/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/.test(htmlUrl)) continue;
    if (seen.has(fullName)) continue;
    seen.add(fullName);
    const stars = Number(entry.stargazers_count);
    const description = typeof entry.description === 'string' && entry.description.trim()
      ? entry.description.trim().slice(0, 500)
      : null;
    const discoveredAt = typeof entry.created_at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(entry.created_at)
      ? entry.created_at
      : null;
    out.push({
      fullName,
      htmlUrl,
      stars: Number.isFinite(stars) && stars > 0 ? Math.floor(stars) : 0,
      description,
      discoveredAt,
    });
  }
  return out;
}

export interface PocSyncSummary {
  status: 'OK' | 'SKIPPED' | 'SLOT_ONLY';
  year: number;
  slot: boolean;
  files_read: number;
  pocs_written: number;
  subrequestsUsed: number;
  subrequestLimit: number;
  cvss: string[];
  errors: string[];
}

export interface PocSyncEnv {
  DB: any;
  POC_SYNC_ENABLED?: string;
  [key: string]: unknown;
}

/**
 * One bounded sync. `force` exists only for the operator route: the scheduled
 * tick always goes through {@link isPocSyncSlot} first.
 */
export async function runPocSync(
  env: PocSyncEnv,
  options: { fetchFn?: typeof fetch; when?: Date; force?: boolean } = {},
): Promise<PocSyncSummary> {
  const when = options.when ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;
  const year = when.getUTCFullYear();
  const slot = isPocSyncSlot(when);
  const summary: PocSyncSummary = {
    status: 'OK',
    year,
    slot,
    files_read: 0,
    pocs_written: 0,
    subrequestsUsed: 0,
    subrequestLimit: POC_MAX_SUBREQUESTS,
    cvss: [],
    errors: [],
  };

  if (!slot && options.force !== true) {
    summary.status = 'SLOT_ONLY';
    summary.errors.push('OUTSIDE_QUIET_SLOT');
    return summary;
  }
  if (env?.POC_SYNC_ENABLED !== 'true' && options.force !== true) {
    summary.status = 'SKIPPED';
    summary.errors.push('POC_SYNC_DISABLED');
    return summary;
  }

  const call = async (url: string): Promise<unknown | null> => {
    if (summary.subrequestsUsed >= POC_MAX_SUBREQUESTS) return null;
    summary.subrequestsUsed += 1;
    try {
      const response = await fetchFn(url, {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'zayron-x-poc-sync',
        },
      });
      if (!response.ok) {
        summary.errors.push(`HTTP_${response.status}:${url.split('/').pop()}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      summary.errors.push(`FETCH_FAILED:${String((error as Error)?.message || error).slice(0, 80)}`);
      return null;
    }
  };

  const listing = await call(
    `https://api.github.com/repos/${POC_REPO}/contents/${year}?ref=${POC_BRANCH}`,
  );
  const names = newestPocFileNames(listing, POC_MAX_FILES);
  if (names.length === 0) {
    summary.errors.push('NO_CVE_FILES_LISTED');
    summary.status = summary.errors.length > 0 ? 'OK' : summary.status;
    return summary;
  }

  for (const cveId of names) {
    const index = await call(
      `https://raw.githubusercontent.com/${POC_REPO}/${POC_BRANCH}/${year}/${cveId}.json`,
    );
    if (index == null) continue;
    summary.files_read += 1;
    summary.cvss.push(cveId);
    for (const entry of parsePocIndex(index)) {
      const id = `poc_${cveId.toLowerCase()}_${entry.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`.slice(0, 120);
      try {
        await env.DB.prepare(
          `INSERT INTO cve_pocs (id, cve_id, repo_full_name, html_url, stars, description, discovered_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
           ON CONFLICT(cve_id, repo_full_name) DO UPDATE SET
             stars = excluded.stars,
             description = COALESCE(excluded.description, cve_pocs.description),
             discovered_at = COALESCE(excluded.discovered_at, cve_pocs.discovered_at),
             synced_at = excluded.synced_at`,
        ).bind(id, cveId, entry.fullName, entry.htmlUrl, entry.stars, entry.description, entry.discoveredAt).run();
        summary.pocs_written += 1;
      } catch (error) {
        summary.errors.push(`WRITE_FAILED:${cveId}:${String((error as Error)?.message || error).slice(0, 60)}`);
      }
    }
  }

  return summary;
}

/** Every CVE→repository row for one CVE, strongest signal first. */
export const POC_SELECTION_SQL = `
  SELECT cve_id, repo_full_name, html_url, stars, description, discovered_at
    FROM cve_pocs
   WHERE cve_id = ?
   ORDER BY stars DESC, COALESCE(discovered_at, synced_at) DESC
   LIMIT 10`;
