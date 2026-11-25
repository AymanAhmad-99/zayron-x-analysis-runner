/**
 * PHASE 7C — Sigma / Nuclei detection coverage sync.
 *
 * TWO GitHub metadata requests maximum (one tree listing per repository), at
 * most once every 24 hours, and nothing is downloaded or executed. The result is
 * an index of rule FILES that actually exist upstream, so the UI can offer a
 * direct link and a copyable rule id without ever inventing a rule.
 *
 * Fail-closed: a GitHub rate limit (60/hr unauthenticated), a missing `tree`, or
 * a malformed path simply writes nothing and reports the failure.
 */

import type { Budget } from './iocIngest';

export const NUCLEI_TREE =
  'https://api.github.com/repos/projectdiscovery/nuclei-templates/git/trees/main?recursive=1';
// SigmaHQ/sigma still defaults to `master`; the tree API 404s on `main`.
export const SIGMA_TREE = 'https://api.github.com/repos/SigmaHQ/sigma/git/trees/master?recursive=1';

export const NUCLEI_REPO = 'projectdiscovery/nuclei-templates';
export const SIGMA_REPO = 'SigmaHQ/sigma';

export const SIGMA_FAMILIES = [
  'qakbot',
  'emotet',
  'lumma',
  'asynctat',
  'asyncrat',
  'redline',
  'cobaltstrike',
] as const;

/** Canonical family labels a Sigma filename keyword maps onto. */
export const FAMILY_LABELS: Record<string, string> = {
  qakbot: 'QakBot',
  emotet: 'Emotet',
  lumma: 'Lumma',
  asynctat: 'AsyncRAT',
  asyncrat: 'AsyncRAT',
  redline: 'RedLine',
  cobaltstrike: 'Cobalt Strike',
};

/** Hard caps so one free-tier tick can never write an unbounded index. */
const MAX_NUCLEI_RULES = 1200;
const MAX_SIGMA_RULES = 400;
const SYNC_TTL_MS = 24 * 60 * 60 * 1000;

export interface DetectionRuleWrite {
  id: string;
  source: 'nuclei' | 'sigma';
  rule_id: string;
  kind: 'cve' | 'family';
  match_key: string;
  name: string;
  path: string;
  severity: string | null;
  repo: string;
  url: string;
}

interface TreeEntry {
  path?: string;
  type?: string;
}

/** GitHub tree payload → entries, tolerating a truncated/absent tree. */
export function treeEntries(payload: unknown): TreeEntry[] {
  const tree = (payload as { tree?: unknown })?.tree;
  return Array.isArray(tree) ? (tree as TreeEntry[]) : [];
}

/**
 * Nuclei CVE templates live at `http/cves/<year>/CVE-<year>-<id>.yaml`.
 * Only paths that name a real CVE become rows.
 */
export function parseNucleiCveTemplates(
  entries: TreeEntry[],
  options: { max?: number; minYear?: number } = {},
): DetectionRuleWrite[] {
  const max = options.max ?? MAX_NUCLEI_RULES;
  const minYear = options.minYear ?? 2021;
  const out: DetectionRuleWrite[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const path = String(entry?.path || '');
    if (!/\.ya?ml$/i.test(path)) continue;
    if (!/cves?\//i.test(path)) continue;
    const match = /(CVE-\d{4}-\d{4,})\.ya?ml$/i.exec(path);
    if (!match) continue;
    const cve = match[1].toUpperCase();
    const year = Number(cve.slice(4, 8));
    if (Number.isFinite(year) && year < minYear) continue;
    if (seen.has(cve)) continue;
    seen.add(cve);
    const ruleId = path.split('/').pop()!.replace(/\.ya?ml$/i, '');
    out.push({
      id: `nuclei:${path}`,
      source: 'nuclei',
      rule_id: ruleId,
      kind: 'cve',
      match_key: cve,
      name: `${ruleId} (Nuclei template)`,
      path,
      severity: null,
      repo: NUCLEI_REPO,
      url: `https://github.com/${NUCLEI_REPO}/blob/main/${path}`,
    });
    if (out.length >= max) break;
  }
  return out;
}

/** Which canonical family (if any) a Sigma filename mentions. */
export function matchSigmaFamily(path: string): string | null {
  const name = String(path || '').toLowerCase();
  for (const keyword of SIGMA_FAMILIES) {
    if (name.includes(keyword)) return FAMILY_LABELS[keyword] ?? keyword;
  }
  return null;
}

/**
 * Sigma rules are named `..._<threat>_...yml`. A rule file becomes a row only
 * when its own name names a tracked family — never by guessing a TTP mapping.
 */
export function parseSigmaFamilyRules(entries: TreeEntry[], options: { max?: number } = {}): DetectionRuleWrite[] {
  const max = options.max ?? MAX_SIGMA_RULES;
  const out: DetectionRuleWrite[] = [];
  for (const entry of entries) {
    const path = String(entry?.path || '');
    if (!/^rules\/.*\.ya?ml$/i.test(path)) continue;
    if (/\/deprecated\//i.test(path)) continue;
    const family = matchSigmaFamily(path);
    if (!family) continue;
    const ruleId = path.split('/').pop()!.replace(/\.ya?ml$/i, '');
    out.push({
      id: `sigma:${path}`,
      source: 'sigma',
      rule_id: ruleId,
      kind: 'family',
      match_key: family.toLowerCase(),
      name: `${family}: ${ruleId}`,
      path,
      severity: null,
      repo: SIGMA_REPO,
      url: `https://github.com/${SIGMA_REPO}/blob/master/${path}`,
    });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Staggered cadence guard.
 *
 * The IOC pass shares one Worker invocation with the executive wire and the
 * authoritative pulse, so it runs only in the first slot of each 8-hour block
 * (00:xx, 08:xx, 16:xx UTC) — three times a day, minutes away from every other
 * heavy pass.
 */
export function isIocIngestSlot(when: Date = new Date(), slotHours = 8): boolean {
  const hour = when.getUTCHours();
  const minute = when.getUTCMinutes();
  return hour % Math.max(1, slotHours) === 0 && minute < 30;
}

export interface DetectionSyncResult {
  status: 'OK' | 'SKIPPED' | 'FAILED';
  reason?: string;
  subrequests: number;
  nuclei: number;
  sigma: number;
  written: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function syncDetectionRules(
  env: { DB: D1Database },
  options: { budget?: Budget; now?: number; force?: boolean } = {},
): Promise<DetectionSyncResult> {
  const now = options.now ?? Date.now();
  const budget = options.budget;

  try {
    const last = await env.DB.prepare(
      `SELECT MAX(synced_at) AS last_at FROM detection_rules`,
    ).first<{ last_at: string | null }>();
    const lastAt = last?.last_at ? Date.parse(last.last_at.endsWith('Z') ? last.last_at : `${last.last_at.replace(' ', 'T')}Z`) : NaN;
    if (!options.force && Number.isFinite(lastAt) && now - lastAt < SYNC_TTL_MS) {
      return { status: 'SKIPPED', reason: 'FRESH_CACHE', subrequests: 0, nuclei: 0, sigma: 0, written: 0 };
    }
  } catch {
    // A missing table (migration not applied yet) is not a reason to fail the
    // whole IOC pass; the sync below will report the real error.
  }

  const rules: DetectionRuleWrite[] = [];
  let subrequests = 0;

  for (const [label, url, parse] of [
    ['nuclei', NUCLEI_TREE, parseNucleiCveTemplates],
    ['sigma', SIGMA_TREE, parseSigmaFamilyRules],
  ] as const) {
    if (budget && !budget.spend()) break;
    subrequests += 1;
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'zayron-x-detection-sync/1.0',
          'x-github-api-version': '2022-11-28',
        },
      });
      if (!response.ok) continue;
      const entries = treeEntries(await response.json());
      rules.push(...(parse as (e: TreeEntry[]) => DetectionRuleWrite[])(entries));
    } catch {
      // One repository failing must not lose the other's results.
      continue;
    }
  }

  if (rules.length === 0) {
    return { status: 'FAILED', reason: 'NO_RULES_PARSED', subrequests, nuclei: 0, sigma: 0, written: 0 };
  }

  const statements = rules.map((rule) =>
    env.DB.prepare(
      `INSERT INTO detection_rules (id, source, rule_id, kind, match_key, name, path, severity, repo, url, synced_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         rule_id = excluded.rule_id,
         kind = excluded.kind,
         match_key = excluded.match_key,
         name = excluded.name,
         severity = excluded.severity,
         url = excluded.url,
         synced_at = datetime('now')`,
    ).bind(
      rule.id,
      rule.source,
      rule.rule_id,
      rule.kind,
      rule.match_key,
      rule.name.slice(0, 300),
      rule.path,
      rule.severity,
      rule.repo,
      rule.url,
    ),
  );

  let written = 0;
  for (const batch of chunk(statements, 50)) {
    await env.DB.batch(batch);
    written += batch.length;
  }

  return {
    status: 'OK',
    subrequests,
    nuclei: rules.filter((r) => r.source === 'nuclei').length,
    sigma: rules.filter((r) => r.source === 'sigma').length,
    written,
  };
}
