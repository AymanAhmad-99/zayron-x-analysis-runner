/**
 * PHASE 7.3 — OpenSSF/OSV supply-chain advisory dossiers.
 *
 * An OSV `MAL-*` record is an ADVISORY, not a static-analysis run: it has no
 * artifact, no CAPA output and no execution trace. This module therefore builds
 * a dossier only from what the stored `report_json` actually contains (title,
 * ecosystem, package, affected versions, dates, details, references) and adds a
 * remediation checklist derived from the named ecosystem's containment steps.
 *
 * Nothing here is invented: a field the advisory does not carry is `null`, and
 * the remediation steps are a fixed, ecosystem-keyed table of standard
 * containment actions (lockfile audit, credential rotation, cache purge), never
 * a claim about the specific malware's behaviour.
 */

export interface SupplyChainAffectedVersion {
  introduced: string | null;
  fixed: string | null;
  last_affected: string | null;
}

export interface SupplyChainDossier {
  report_id: string;
  title: string;
  ecosystem: string;
  package_name: string | null;
  affected_versions: SupplyChainAffectedVersion[];
  published_at: string | null;
  modified_at: string | null;
  summary: string;
  details: string;
  severity: string | null;
  references: Array<{ url: string; type?: string }>;
  remediation: string[];
  provenance: { database: string; advisory: string };
  sha256: string | null;
}

export interface SupplyChainRow {
  id: string;
  title: string | null;
  family: string | null;
  summary: string | null;
  severity: string | null;
  sha256: string | null;
  report_json: string | null;
  published_at: string | null;
}

const ECOSYSTEM_LABELS = new Set(['npm', 'PyPI', 'Go', 'RubyGems', 'Maven', 'NuGet', 'Packagist', 'Hex', 'Pub', 'crates.io']);

/**
 * `Malicious code in @scope/pkg (npm)` → `Malicious code in @scope/pkg`.
 *
 * Older rows were stored with the package name duplicated in front
 * (`polylabel-web-lib: Malicious code in polylabel-web-lib`), so that prefix is
 * removed at READ time too — the stored record is never rewritten.
 */
export function cleanAdvisoryTitle(title: unknown): string {
  const base = String(title ?? '')
    .replace(/\s*\((?:npm|PyPI|Go|RubyGems|Maven|NuGet|Packagist|Hex|Pub|crates\.io)\)\s*$/i, '')
    .trim();
  return base.replace(/^[^:]{1,120}:\s*(?=malicious\s+code\s+in\s)/i, '').trim();
}

/** Ecosystem of an advisory, from its explicit field or its title suffix. */
export function advisoryEcosystem(record: Record<string, unknown>, fallbackTitle?: unknown): string {
  const explicit = String(record?.ecosystem ?? '').trim();
  if (ECOSYSTEM_LABELS.has(explicit)) return explicit;
  const list = Array.isArray(record?.ecosystems) ? (record.ecosystems as unknown[]) : [];
  for (const entry of list) {
    const label = String(entry ?? '').trim();
    if (ECOSYSTEM_LABELS.has(label)) return label;
  }
  const suffix = /\(([A-Za-z.]+)\)\s*$/.exec(String(fallbackTitle ?? ''));
  if (suffix && ECOSYSTEM_LABELS.has(suffix[1])) return suffix[1];
  return explicit || 'open-source';
}

/**
 * Ecosystem-accurate containment steps. These are the standard actions a
 * package consumer must take for a malicious release; they are deliberately
 * identical for every advisory in an ecosystem, because the point is
 * containment, not speculation about the payload.
 */
export function remediationFor(ecosystem: string): string[] {
  const common = [
    'Treat any process that loaded this package under the malicious versions as compromised and isolate it.',
    'Rotate every credential, token and publishing secret that was reachable from the build or runtime environment.',
    'Audit outbound network telemetry for the period the package was installed.',
  ];
  switch (String(ecosystem || '').toLowerCase()) {
    case 'npm':
      return [
        'Remove the package from package.json and delete its entry from package-lock.json.',
        'Run `npm cache clean --force` and reinstall with `npm ci` so no cached tarball is reused.',
        'Run `npm audit` and `npm ls <package>` to confirm no transitive copy survives.',
        ...common,
      ];
    case 'pypi':
      return [
        'Uninstall the package with `pip uninstall -y <package>` and purge the wheel cache (`pip cache purge`).',
        'Rebuild the virtualenv from hash-pinned requirements so the malicious wheel cannot be re-resolved.',
        'Run `pip-audit` (or `pip check`) after the rebuild to confirm the environment is clean.',
        ...common,
      ];
    case 'go':
      return [
        'Run `go clean -modcache`, then re-resolve modules against the checksum database.',
        'Pin the module to a known-good version in go.mod and verify `go mod verify` passes.',
        'Rebuild every binary that linked the affected module version.',
        ...common,
      ];
    case 'rubygems':
      return [
        'Uninstall the gem (`gem uninstall <package>`) and clear the local gem cache.',
        'Update the Gemfile.lock to a clean version and run `bundle install` from scratch.',
        'Run `bundle audit` after the rebuild to confirm no malicious release remains.',
        ...common,
      ];
    default:
      return [
        'Remove the affected package version from the dependency manifest and lockfile.',
        'Purge the package manager cache and reinstall from a verified source.',
        'Rebuild and redeploy every artifact that contained the affected version.',
        ...common,
      ];
  }
}

function parseJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function safeReferences(value: unknown): Array<{ url: string; type?: string }> {
  const list = Array.isArray(value) ? value : [];
  const out: Array<{ url: string; type?: string }> = [];
  for (const entry of list.slice(0, 20)) {
    if (typeof entry === 'string') {
      if (/^https?:\/\//i.test(entry)) out.push({ url: entry });
      continue;
    }
    const record = entry as Record<string, unknown> | null;
    const url = typeof record?.url === 'string' ? record.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) continue;
    const type = typeof record?.type === 'string' ? record.type : undefined;
    out.push({ url, ...(type ? { type } : {}) });
  }
  return out;
}

function safeVersions(value: unknown): SupplyChainAffectedVersion[] {
  const list = Array.isArray(value) ? value : [];
  const out: SupplyChainAffectedVersion[] = [];
  for (const entry of list.slice(0, 20)) {
    const record = entry as Record<string, unknown> | null;
    if (!record || typeof record !== 'object') continue;
    const introduced = typeof record.introduced === 'string' ? record.introduced : null;
    const fixed = typeof record.fixed === 'string' ? record.fixed : null;
    const lastAffected = typeof record.last_affected === 'string' ? record.last_affected : null;
    if (!introduced && !fixed && !lastAffected) continue;
    out.push({ introduced, fixed, last_affected: lastAffected });
  }
  return out;
}

/** Build the full dossier served by `GET /api/v1/malware/supply-chain/reports/:id`. */
export function buildSupplyChainDossier(row: SupplyChainRow): SupplyChainDossier | null {
  const id = String(row?.id || '').trim().toUpperCase();
  if (!/^MAL-\d{4}-\d+$/.test(id)) return null;

  const record = parseJson(row?.report_json ?? null);
  const rawTitle = row?.title ?? record.title ?? record.summary;
  const ecosystem = advisoryEcosystem(record, rawTitle);
  const code = typeof record.details === 'string' ? record.details : '';
  const summaryText = typeof record.summary === 'string' ? record.summary : '';
  const storedSummary = typeof row?.summary === 'string' ? row.summary : '';

  return {
    report_id: id,
    title: cleanAdvisoryTitle(rawTitle) || `Malicious package ${id}`,
    ecosystem,
    package_name:
      (typeof record.package_name === 'string' && record.package_name) ||
      (Array.isArray(record.packages) && typeof (record.packages as unknown[])[0] === 'string'
        ? String((record.packages as unknown[])[0])
        : null),
    affected_versions: safeVersions(record.affected_versions),
    published_at: typeof record.published_at === 'string' ? record.published_at : row?.published_at ?? null,
    modified_at: typeof record.modified_at === 'string' ? record.modified_at : null,
    summary: summaryText || storedSummary || '',
    details: code || summaryText || storedSummary || '',
    severity: row?.severity ?? null,
    references: safeReferences(record.references),
    remediation: remediationFor(ecosystem),
    provenance: {
      database: 'OSV.dev',
      advisory: `https://osv.dev/vulnerability/${id}`,
    },
    sha256: row?.sha256 ?? null,
  };
}
