CREATE TABLE IF NOT EXISTS event_trace (
  trace_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  resource_id TEXT,
  error_code TEXT,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_trace_event ON event_trace(event_id, started_at);
