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
  /** Advisory-source metadata recovered from the OSV boilerplate, never invented. */
  source_classification: { source: string | null; category: string | null };
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
 * A package identifier is the ONLY thing interpolated into a shell command, so
 * it is accepted only when it matches the strictest ecosystem character class.
 * Anything else yields `null` and the step falls back to prose (never `<pkg>`).
 */
export function safePackageToken(name: unknown): string | null {
  const raw = typeof name === 'string' ? name.trim() : '';
  if (!raw || raw.length > 128) return null;
  return /^[a-zA-Z0-9@._/-]+$/.test(raw) ? raw : null;
}

/**
 * OSV advisories embed exporter boilerplate in their detail text:
 *   `--- _= Per source details. Do not edit below this line.=_ ## Source: kam193 (165c4572…) --- Category: PROBABLY_PENTEST`
 * This turns that machine residue into readable paragraphs plus a compact
 * classification pair. It is deterministic and additive: no sentence of the
 * advisory's own narrative is invented or dropped (only markers and hashes).
 */
export function formatOsvNarrative(raw: unknown): {
  narrative: string;
  source: string | null;
  category: string | null;
} {
  let text = String(raw ?? '').replace(/\r\n?/g, '\n');
  if (!text.trim()) return { narrative: '', source: null, category: null };

  // The exporter marker has shipped in several fence spellings:
  // `_= Per source details. Do not edit below this line.=_` and the OSV
  // `_-= Per source details. Do not edit below this line.=-_` variant.
  text = text.replace(
    /[_=\-]*\s*Per source details\.?\s*Do not edit below this line\.?\s*[_=\-]*\s*/gi,
    '\n',
  );

  let source: string | null = null;
  const sourceMatch = /##\s*Source:\s*([^\n]+)/i.exec(text);
  if (sourceMatch) {
    // `kam193 (165c4572...)` → `kam193`; the hash is provenance plumbing.
    const cleaned = sourceMatch[1]
      // `kam193 (165c4572…) --- Category: PROBABLY_PENTEST` on one line.
      .split(/\s*-{3,}\s*/)[0]
      .replace(/Category:.*$/i, '')
      .replace(/\([0-9a-f]{6,}\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    source = cleaned || null;
  }

  let category: string | null = null;
  const categoryMatch = /Category:\s*([A-Za-z0-9_\-]+)/i.exec(text);
  if (categoryMatch) {
    category = categoryMatch[1]
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' ');
  }

  text = text
    // Markdown headings, including `## Source:` and `## Category:`.
    .replace(/^#{1,6}\s*.*$/gm, ' ')
    .replace(/Category:\s*[A-Za-z0-9_\-]+/gi, ' ')
    .replace(/Source:\s*[^\n]+/gi, ' ')
    // Horizontal rules and the `---` fences OSV pastes around metadata.
    .replace(/^\s*-{3,}\s*$/gm, ' ')
    .replace(/-{3,}/g, ' ')
    // Standalone hex digests (commit hashes, blob ids).
    .replace(/\b[0-9a-f]{12,64}\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { narrative: text, source, category };
}

/**
 * Ecosystem-accurate containment steps. These are the standard actions a
 * package consumer must take for a malicious release; they are deliberately
 * identical for every advisory in an ecosystem, because the point is
 * containment, not speculation about the payload.
 *
 * PHASE 8B — the real, sanitized package name is injected into the command so
 * an operator can paste it. When the advisory names no safe package token the
 * step stays prose; a literal `<package>` is never rendered.
 */
export function remediationFor(ecosystem: string, packageName?: string | null): string[] {
  const pkg = safePackageToken(packageName);
  const common = [
    'Treat any process that loaded this package under the malicious versions as compromised and isolate it.',
    'Rotate every credential, token and publishing secret that was reachable from the build or runtime environment.',
    'Audit outbound network telemetry for the period the package was installed.',
  ];
  switch (String(ecosystem || '').toLowerCase()) {
    case 'npm':
      return [
        pkg
          ? `Remove ${pkg} from package.json and delete its entry from package-lock.json.`
          : 'Remove the affected package from package.json and delete its entry from package-lock.json.',
        pkg
          ? `Run \`npm uninstall ${pkg}\`, then \`npm cache clean --force\` and reinstall with \`npm ci\` so no cached tarball is reused.`
          : 'Run `npm cache clean --force` and reinstall with `npm ci` so no cached tarball is reused.',
        pkg
          ? `Run \`npm audit\` and \`npm ls ${pkg}\` to confirm no transitive copy survives.`
          : 'Run `npm audit` and `npm ls` to confirm no transitive copy survives.',
        ...common,
      ];
    case 'pypi':
      return [
        pkg
          ? `Uninstall the package with \`pip uninstall -y ${pkg}\` and purge the wheel cache (\`pip cache purge\`).`
          : 'Uninstall the affected distribution with `pip uninstall -y` and purge the wheel cache (`pip cache purge`).',
        'Rebuild the virtualenv from hash-pinned requirements so the malicious wheel cannot be re-resolved.',
        'Run `pip-audit` (or `pip check`) after the rebuild to confirm the environment is clean.',
        ...common,
      ];
    case 'go':
      return [
        'Run `go clean -modcache`, then re-resolve modules against the checksum database.',
        pkg
          ? `Pin ${pkg} to a known-good version in go.mod and verify \`go mod verify\` passes.`
          : 'Pin the module to a known-good version in go.mod and verify `go mod verify` passes.',
        'Rebuild every binary that linked the affected module version.',
        ...common,
      ];
    case 'rubygems':
      return [
        pkg
          ? `Uninstall the gem (\`gem uninstall ${pkg}\`) and clear the local gem cache.`
          : 'Uninstall the affected gem and clear the local gem cache.',
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

  const explicitPackage =
    (typeof record.package_name === 'string' && record.package_name) ||
    (Array.isArray(record.packages) && typeof (record.packages as unknown[])[0] === 'string'
      ? String((record.packages as unknown[])[0])
      : null);
  // Fallback: the OSV title names the package (`Malicious code in <pkg>`).
  const titlePackage = /malicious\s+code\s+in\s+([^\s,]+)/i.exec(String(rawTitle ?? ''))?.[1] ?? null;
  const packageName = safePackageToken(explicitPackage) || safePackageToken(titlePackage) || null;

  const sanitizedDetails = formatOsvNarrative(code);
  const sanitizedSummary = formatOsvNarrative(summaryText || storedSummary);
  const classification = {
    source: sanitizedDetails.source ?? sanitizedSummary.source,
    category: sanitizedDetails.category ?? sanitizedSummary.category,
  };

  return {
    report_id: id,
    title: cleanAdvisoryTitle(rawTitle) || `Malicious package ${id}`,
    ecosystem,
    package_name: packageName,
    affected_versions: safeVersions(record.affected_versions),
    published_at: typeof record.published_at === 'string' ? record.published_at : row?.published_at ?? null,
    modified_at: typeof record.modified_at === 'string' ? record.modified_at : null,
    summary: sanitizedSummary.narrative || sanitizedDetails.narrative || '',
    details: sanitizedDetails.narrative || sanitizedSummary.narrative || '',
    severity: row?.severity ?? null,
    references: safeReferences(record.references),
    remediation: remediationFor(ecosystem, packageName),
    provenance: {
      database: 'OSV.dev',
      advisory: `https://osv.dev/vulnerability/${id}`,
    },
    source_classification: classification,
    sha256: row?.sha256 ?? null,
  };
}
