-- Repair the published NVD article slug created from unstable NVD response metadata.
UPDATE articles
SET slug = 'cve-2026-76783', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
WHERE canonical_intel_event_id = 'evt_nvd_d51282c1-cd0'
  AND is_published = 1;
