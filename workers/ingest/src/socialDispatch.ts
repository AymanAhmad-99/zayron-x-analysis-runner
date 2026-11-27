/**
 * PHASE 9C — Unified Social Distribution Core & Verified-Free `:40` Cron Slots.
 *
 * Isolation invariant:
 *   Existing `:40` slots:
 *     - Telegram wire: 10:40, 14:40, 18:40
 *     - News ingest:   00:40, 08:40, 12:40, 16:40, 20:40
 *     - Radar backfill:01:40, 03:40, 05:40
 *     - PoC sync:      02:40, 04:40, 06:40
 *     - CISA KEV:      04:40
 *
 *   Phase 9C empty `:40` slots ONLY:
 *     - X (Twitter):   07:40, 11:40, 15:40, 19:40, 21:40, 23:40 UTC
 *     - LinkedIn:      13:40, 17:40 UTC
 *     - Email Digest:  09:40 UTC
 *     - 22:40 UTC kept free as safety reserve.
 */

export const SITE_ORIGIN = 'https://zayron-x.co';

export const X_PUBLISH_HOURS = [7, 11, 15, 19, 21, 23] as const;
export const LINKEDIN_PUBLISH_HOURS = [13, 17] as const;
export const EMAIL_DIGEST_HOURS = [9] as const;
export const PHASE_9C_SLOT_MINUTE = 40;

export function isXPublishSlot(when: Date = new Date()): boolean {
  return (
    when.getUTCMinutes() === PHASE_9C_SLOT_MINUTE &&
    (X_PUBLISH_HOURS as readonly number[]).includes(when.getUTCHours())
  );
}

export function isLinkedInPublishSlot(when: Date = new Date()): boolean {
  return (
    when.getUTCMinutes() === PHASE_9C_SLOT_MINUTE &&
    (LINKEDIN_PUBLISH_HOURS as readonly number[]).includes(when.getUTCHours())
  );
}

export function isEmailDigestSlot(when: Date = new Date()): boolean {
  return (
    when.getUTCMinutes() === PHASE_9C_SLOT_MINUTE &&
    (EMAIL_DIGEST_HOURS as readonly number[]).includes(when.getUTCHours())
  );
}

export type SocialPlatform = 'x' | 'linkedin';
export type SocialEntityType = 'news' | 'cve' | 'malware_advisory' | 'ioc_pulse';
export type SocialDispatchStatus = 'SENT' | 'FAILED' | 'SKIPPED_NO_CREDS';

export interface SocialCandidate {
  entity_type: SocialEntityType;
  base_entity_id: string;
  title: string;
  verdict: string;
  severity: string;
  canonical_url: string;
  og_image_url: string;
  cvss_score: number | null;
  epss_score: number | null;
  is_kev: boolean;
  source_name: string | null;
  category: string | null;
  remediation_hint: string | null;
  ecosystem: string | null;
  package_name: string | null;
  linked_cves: string[];
}

export interface SocialDispatchRecord {
  id: string;
  platform: SocialPlatform;
  entity_type: SocialEntityType;
  base_entity_id: string;
  external_post_id: string | null;
  reply_post_id: string | null;
  status: SocialDispatchStatus;
  error_message: string | null;
  dispatched_at: string;
}

export const SELECT_X_CVE_CANDIDATE_SQL = `
  SELECT cve_id, title, description, severity, cvss_score, epss_score, is_exploited_in_wild,
         affected_vendor, affected_product, strategic_brief_json
    FROM vulnerabilities
   WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
     AND (is_exploited_in_wild = 1 OR UPPER(COALESCE(severity, '')) = 'CRITICAL')
     AND NOT EXISTS (
       SELECT 1 FROM social_dispatches s
        WHERE s.platform = 'x' AND s.base_entity_id = vulnerabilities.cve_id AND s.status = 'SENT'
     )
   ORDER BY (CASE WHEN is_exploited_in_wild = 1 THEN 0 ELSE 1 END) ASC,
            COALESCE(epss_score, 0) DESC,
            COALESCE(cvss_score, 0) DESC,
            COALESCE(updated_at, created_at) DESC
   LIMIT 1`;

export const SELECT_LINKEDIN_CVE_CANDIDATE_SQL = `
  SELECT cve_id, title, description, severity, cvss_score, epss_score, is_exploited_in_wild,
         affected_vendor, affected_product, strategic_brief_json
    FROM vulnerabilities
   WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
     AND is_exploited_in_wild = 1
     AND UPPER(COALESCE(severity, '')) IN ('CRITICAL', 'HIGH')
     AND NOT EXISTS (
       SELECT 1 FROM social_dispatches s
        WHERE s.platform = 'linkedin' AND s.base_entity_id = vulnerabilities.cve_id AND s.status = 'SENT'
     )
   ORDER BY (CASE WHEN UPPER(COALESCE(severity, '')) = 'CRITICAL' THEN 0 ELSE 1 END) ASC,
            COALESCE(epss_score, 0) DESC,
            COALESCE(cvss_score, 0) DESC,
            COALESCE(updated_at, created_at) DESC
   LIMIT 1`;

export const SELECT_SOCIAL_NEWS_CANDIDATE_SQL = `
  SELECT slug, title, verdict, summary, category, severity, source_name, graph_enrichment_json, published_at
    FROM news_articles
   WHERE status = 'PUBLISHED'
     AND (? = 'x' OR UPPER(COALESCE(severity, '')) IN ('CRITICAL', 'HIGH'))
     AND NOT EXISTS (
       SELECT 1 FROM social_dispatches s
        WHERE s.platform = ? AND s.base_entity_id = news_articles.slug AND s.status = 'SENT'
     )
   ORDER BY (CASE UPPER(COALESCE(severity, ''))
              WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END) ASC,
            published_at DESC
   LIMIT 1`;

export const SELECT_X_MALWARE_CANDIDATE_SQL = `
  SELECT id, title, summary, family, severity, source, report_json, published_at
    FROM malware_reports
   WHERE id LIKE 'MAL-2026-%'
     AND NOT EXISTS (
       SELECT 1 FROM social_dispatches s
        WHERE s.platform = 'x' AND s.base_entity_id = malware_reports.id AND s.status = 'SENT'
     )
   ORDER BY COALESCE(published_at, created_at) DESC, id ASC
   LIMIT 1`;

function parseBrief(raw: unknown): Record<string, any> | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return null;
  }
}

function mapCveRow(row: any): SocialCandidate {
  const cveId = String(row.cve_id).trim().toUpperCase();
  const brief = parseBrief(row.strategic_brief_json);
  const verdict =
    String(brief?.executive_summary || brief?.verdict || row.description || `${cveId} verified advisory`).trim();
  const vendorProduct = [row.affected_vendor, row.affected_product].filter(Boolean).join(' ');
  const title = vendorProduct ? `${cveId} (${vendorProduct})` : cveId;
  const remediation =
    String(
      brief?.remediation?.immediate_action ||
        brief?.operational_prioritization?.recommended_action ||
        'Apply vendor security updates and validate compensating network controls.',
    ).trim();
  return {
    entity_type: 'cve',
    base_entity_id: cveId,
    title,
    verdict,
    severity: String(row.severity || 'HIGH').toUpperCase(),
    canonical_url: `${SITE_ORIGIN}/intelligence/vulnerabilities/${encodeURIComponent(cveId)}`,
    og_image_url: `${SITE_ORIGIN}/api/og/cve/${encodeURIComponent(cveId)}`,
    cvss_score: typeof row.cvss_score === 'number' ? row.cvss_score : Number.isFinite(Number(row.cvss_score)) ? Number(row.cvss_score) : null,
    epss_score: typeof row.epss_score === 'number' ? row.epss_score : Number.isFinite(Number(row.epss_score)) ? Number(row.epss_score) : null,
    is_kev: Number(row.is_exploited_in_wild) === 1,
    source_name: 'NVD / CISA KEV / FIRST EPSS',
    category: 'VULNERABILITY',
    remediation_hint: remediation,
    ecosystem: null,
    package_name: null,
    linked_cves: [cveId],
  };
}

function mapNewsRow(row: any): SocialCandidate {
  const slug = String(row.slug).trim();
  const enrichment = parseBrief(row.graph_enrichment_json);
  const cves = Array.isArray(enrichment?.cves)
    ? enrichment.cves.map((c: any) => String(c?.cve_id || '').trim()).filter(Boolean)
    : [];
  return {
    entity_type: 'news',
    base_entity_id: slug,
    title: String(row.title || slug).trim(),
    verdict: String(row.verdict || row.summary || row.title || '').trim(),
    severity: String(row.severity || 'HIGH').toUpperCase(),
    canonical_url: `${SITE_ORIGIN}/news/${encodeURIComponent(slug)}`,
    og_image_url: `${SITE_ORIGIN}/api/og/news/${encodeURIComponent(slug)}`,
    cvss_score: null,
    epss_score: null,
    is_kev: Boolean(enrichment?.cves?.some?.((c: any) => c?.cisa_kev)),
    source_name: row.source_name ? String(row.source_name) : null,
    category: row.category ? String(row.category) : 'ADVISORY',
    remediation_hint: 'Review affected assets against linked catalog telemetry and deploy available mitigations.',
    ecosystem: null,
    package_name: null,
    linked_cves: cves,
  };
}

function mapMalwareRow(row: any): SocialCandidate {
  const id = String(row.id).trim();
  const report = parseBrief(row.report_json);
  const ecosystem = report?.ecosystem ? String(report.ecosystem) : null;
  const pkg = report?.package_name ? String(report.package_name) : null;
  return {
    entity_type: 'malware_advisory',
    base_entity_id: id,
    title: String(row.title || id).trim(),
    verdict: String(row.summary || `Malicious ${ecosystem || 'open-source'} package advisory ${id}`).trim(),
    severity: String(row.severity || 'HIGH').toUpperCase(),
    canonical_url: `${SITE_ORIGIN}/intelligence/malware/advisories/${encodeURIComponent(id)}`,
    og_image_url: `${SITE_ORIGIN}/api/og/malware/${encodeURIComponent(id)}`,
    cvss_score: null,
    epss_score: null,
    is_kev: false,
    source_name: 'OpenSSF / OSV.dev',
    category: 'SUPPLY_CHAIN',
    remediation_hint: 'Audit lockfiles, purge compromised package versions, and rotate exposed CI/CD tokens.',
    ecosystem,
    package_name: pkg,
    linked_cves: [],
  };
}

/** Select the single highest-priority unsent candidate for a platform. */
export async function selectSocialCandidate(db: any, platform: SocialPlatform): Promise<SocialCandidate | null> {
  const cveSql = platform === 'x' ? SELECT_X_CVE_CANDIDATE_SQL : SELECT_LINKEDIN_CVE_CANDIDATE_SQL;
  const cveRow = await db.prepare(cveSql).first<any>().catch(() => null);
  if (cveRow?.cve_id) return mapCveRow(cveRow);

  const newsRow = await db.prepare(SELECT_SOCIAL_NEWS_CANDIDATE_SQL).bind(platform, platform).first<any>().catch(() => null);
  if (newsRow?.slug) return mapNewsRow(newsRow);

  if (platform === 'x') {
    const malRow = await db.prepare(SELECT_X_MALWARE_CANDIDATE_SQL).first<any>().catch(() => null);
    if (malRow?.id) return mapMalwareRow(malRow);
  }
  return null;
}

export async function recordSocialDispatch(db: any, record: SocialDispatchRecord): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO social_dispatches (
         id, platform, entity_type, base_entity_id, external_post_id, reply_post_id,
         status, error_message, dispatched_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.platform,
      record.entity_type,
      record.base_entity_id,
      record.external_post_id,
      record.reply_post_id,
      record.status,
      record.error_message ? record.error_message.slice(0, 400) : null,
      record.dispatched_at,
    )
    .run();
}

export async function fetchOgCardPng(
  ogImageUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<Uint8Array | null> {
  try {
    const response = await fetchFn(ogImageUrl, {
      headers: { accept: 'image/png' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const ct = (response.headers.get('content-type') ?? '').toLowerCase();
    if (ct && !ct.includes('image/png') && !ct.includes('application/octet-stream')) return null;
    const buf = new Uint8Array(await response.arrayBuffer());
    return buf.byteLength > 0 ? buf : null;
  } catch {
    return null;
  }
}
