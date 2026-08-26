/**
 * ZAYRON-X — Authoritative Live Sync, Diff Engine & Versioning Registry
 * Manages scheduled machine-readable sync adapters, content hashing, and version diffs.
 */

export interface LiveSyncSourceRecord {
  source_id: string;
  source_name: string;
  source_url: string;
  data_format: 'JSON' | 'CSV' | 'XML' | 'STIX';
  retrieval_method: 'HTTP_GET_API' | 'POLLING_FEED';
  sync_frequency: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'VERSION_DRIVEN';
  last_sync: string;
  next_sync: string;
  etag?: string;
  content_hash: string;
  version: string;
  status: 'SYNCED' | 'IDLE' | 'FAILED';
  failure_count: number;
}

export interface KnowledgeDiffResult {
  document_id: string;
  previous_version: string;
  current_version: string;
  added_sections: string[];
  removed_sections: string[];
  changed_sections: Array<{
    section: string;
    change_type: 'MODIFIED' | 'ADDED' | 'DEPRECATED';
    summary: string;
  }>;
  has_meaningful_change: boolean;
  requires_ai_synthesis: boolean;
}

export const AUTHORITATIVE_SYNC_SOURCES: LiveSyncSourceRecord[] = [
  {
    source_id: "sync_cisa_kev",
    source_name: "CISA Known Exploited Vulnerabilities (KEV) Catalog",
    source_url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    data_format: "JSON",
    retrieval_method: "HTTP_GET_API",
    sync_frequency: "REALTIME",
    last_sync: "2026-08-25T16:00:00Z",
    next_sync: "2026-08-25T18:00:00Z",
    etag: 'W/"cisa-kev-20260825"',
    content_hash: "hash_cisa_kev_20260825",
    version: "Live BOD 22-01 Catalog",
    status: "SYNCED",
    failure_count: 0
  },
  {
    source_id: "sync_first_epss",
    source_name: "FIRST EPSS v3 Daily Probability Scores",
    source_url: "https://epss.cyentia.com/epss_scores-current.csv.gz",
    data_format: "CSV",
    retrieval_method: "HTTP_GET_API",
    sync_frequency: "DAILY",
    last_sync: "2026-08-25T06:00:00Z",
    next_sync: "2026-08-26T06:00:00Z",
    etag: 'W/"epss-v3-20260825"',
    content_hash: "hash_first_epss_20260825",
    version: "EPSS v3",
    status: "SYNCED",
    failure_count: 0
  },
  {
    source_id: "sync_nvd_cve",
    source_name: "NIST National Vulnerability Database (NVD API 2.0)",
    source_url: "https://services.nvd.nist.gov/rest/json/cves/2.0",
    data_format: "JSON",
    retrieval_method: "HTTP_GET_API",
    sync_frequency: "DAILY",
    last_sync: "2026-08-25T12:00:00Z",
    next_sync: "2026-08-26T12:00:00Z",
    etag: 'W/"nvd-api-v2-20260825"',
    content_hash: "hash_nvd_api_20260825",
    version: "NVD 2.0",
    status: "SYNCED",
    failure_count: 0
  },
  {
    source_id: "sync_mitre_attack",
    source_name: "MITRE ATT&CK Enterprise STIX 2.1 Repository",
    source_url: "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json",
    data_format: "STIX",
    retrieval_method: "HTTP_GET_API",
    sync_frequency: "VERSION_DRIVEN",
    last_sync: "2026-08-20T00:00:00Z",
    next_sync: "2026-09-01T00:00:00Z",
    etag: 'W/"mitre-attack-v15-1"',
    content_hash: "hash_mitre_v15_1",
    version: "v15.1",
    status: "SYNCED",
    failure_count: 0
  },
  {
    source_id: "sync_msrc_cvrf",
    source_name: "Microsoft Security Response Center (MSRC) API",
    source_url: "https://api.msrc.microsoft.com/cvrf/v2.0/updates",
    data_format: "JSON",
    retrieval_method: "HTTP_GET_API",
    sync_frequency: "DAILY",
    last_sync: "2026-08-25T14:00:00Z",
    next_sync: "2026-08-26T14:00:00Z",
    etag: 'W/"msrc-patch-tuesday"',
    content_hash: "hash_msrc_20260825",
    version: "2026-August-Security-Update",
    status: "SYNCED",
    failure_count: 0
  }
];

/**
 * Computes deterministic diff between old and new knowledge document versions.
 */
export function calculateKnowledgeDiff(
  documentId: string,
  oldText: string,
  newText: string,
  oldVersion: string,
  newVersion: string
): KnowledgeDiffResult {
  const oldLines = oldText.split('\n').filter((l) => l.trim().length > 0);
  const newLines = newText.split('\n').filter((l) => l.trim().length > 0);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const added = newLines.filter((l) => !oldSet.has(l));
  const removed = oldLines.filter((l) => !newSet.has(l));

  const hasMeaningful = added.length > 0 || removed.length > 0 || oldVersion !== newVersion;
  const requiresAi = added.some((l) => l.toLowerCase().includes('critical') || l.toLowerCase().includes('zero-day') || l.toLowerCase().includes('mandate'));

  return {
    document_id: documentId,
    previous_version: oldVersion,
    current_version: newVersion,
    added_sections: added.slice(0, 10),
    removed_sections: removed.slice(0, 10),
    changed_sections: [
      {
        section: 'Document Body Content',
        change_type: added.length > 0 ? 'MODIFIED' : 'ADDED',
        summary: `Added ${added.length} lines, removed ${removed.length} lines between version ${oldVersion} and ${newVersion}.`,
      },
    ],
    has_meaningful_change: hasMeaningful,
    requires_ai_synthesis: requiresAi,
  };
}
