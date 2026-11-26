-- PHASE 9A — NEURAL MESH
-- One row per (technique, entity) edge. Seeded offline by
-- tools/seed-technique-edges.mjs so no runtime query ever scans a JSON column.
-- Comments in this file must not contain semicolons (wrangler splits on them).

CREATE TABLE IF NOT EXISTS technique_edges (
  technique_id   TEXT NOT NULL,
  technique_name TEXT NOT NULL,
  tactic         TEXT NOT NULL DEFAULT 'unmapped',
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('actor', 'campaign', 'malware')),
  entity_slug    TEXT NOT NULL,
  entity_name    TEXT NOT NULL,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (technique_id, entity_type, entity_slug)
);

CREATE INDEX IF NOT EXISTS idx_technique_edges_entity
  ON technique_edges (entity_type, entity_slug);

CREATE INDEX IF NOT EXISTS idx_technique_edges_technique
  ON technique_edges (technique_id);

-- PHASE 9A — IOC to malware-family linkage. The column already exists on the
-- live table, so this is a no-op there and a forward-compatible declaration for
-- any environment created from scratch.
CREATE INDEX IF NOT EXISTS idx_iocs_malware_id
  ON iocs (malware_id);
