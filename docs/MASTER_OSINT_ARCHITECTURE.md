# MASTER OSINT ARCHITECTURE

## Where OSINT connects today
Telegram (31 registered channels + collector DO) → source_messages → text normalization → entity resolution (static registries) → intelligence_events. KEV/NVD/MSRC enter via the same queue but are flattened to text — authority distinctions are metadata-only.

## Target flow (conceptual, matching §30)
RAW SOURCE → SOURCE VALIDATION (schema + signature + size caps) → EXTRACTION (structured adapters — they already exist: parseNvdCpeData, parseCisaVulnrichment, parseCsafDocument, mapCisaKevRecord) → SIGNAL (typed, with source class) → ENTITY RESOLUTION (D1-backed identity, not static registries) → EVIDENCE (epistemic class attached) → CORROBORATION (existing evaluateCorroboration + detectSourceConflicts) → CLAIM → ASSESSMENT.

## Source adapter matrix (extensible boundary)
| Source | Adapter exists | Structured parse | Authority class | Gap |
|---|---|---|---|---|
| CISA KEV | ✅ cisaKevAdapter | ✅ | AUTHORITATIVE | feed not wired to enrichment evidence port in workers (P1 wiring) |
| NVD/CNA | ✅ CVESourceAdapter + parseNvdCpeData + vulnrichment | ✅ | AUTHORITATIVE | queue path bypasses it (flatten) |
| Vendor (MSRC/CSAF) | ✅ normalizeVendorAdvisory/parseCsafDocument | ✅ | PRIMARY | queue path bypasses it |
| GitHub advisories | ✅ parseGhsaAdvisories | ✅ | source-dependent | un-wired |
| EPSS (FIRST) | ❌ (port interface exists post-P0.1) | — | SIGNAL | needs fetch adapter + D1 cache |
| Exploit sources | ✅ exploitDbAdapter | ✅ | PRIMARY (existence) | un-wired to queue path |
| CERTs/blogs/RSS | partial (rss text) | ❌ | TRUSTED SECONDARY | adapters needed |
| Telegram | ✅ collector + TelegramSourceAdapter | text-first by nature | OSINT/SIGNAL | fine as signals; must never outrank authoritative |
| MISP/ThreatFox/MalwareBazaar | ✅ adapters | ✅ | OSINT | malware domain (P2) |

## Invariant
**Adding a source = adding an adapter + registration + fixtures.** It must NOT require touching the CVE processor. Today it does (ingest.scheduled hardcodes 4 fetches); the processor-based target removes this coupling.
