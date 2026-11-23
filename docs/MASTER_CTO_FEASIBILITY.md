# MASTER CTO FEASIBILITY

## 3 engineers? After consolidation — yes.
One processor (single brain), 4 workers, 3 queues, 1 migration journal, SQL-visible lifecycle. On-call is a spreadsheet of run IDs. Today — no: 8 brains, 3 evidence stores, snowflake schema, unreproducible prod make 3-engineer operation impossible.

## 8 engineers? Yes, with the domain boundaries.
CVE/malware/campaign teams add domain packages (model+mappers+fixtures) against shared infra without crossing boundaries. The current monolith router + barrel-export package would put 8 engineers in one merge conflict.

## 100× data volume (10k CVEs/day)? What breaks first, in order:
1. **Ingest flatten** (already the #1 integrity bug) — must be replaced by structured mappers (P1 anyway).
2. **Queue batch size 10 / single consumer group** — fine to ~10k/day with batching; DLQ mandatory before scale-up.
3. **D1 single-writer patterns** in api inline SQL — move to processor batched writes; D1 handles this class at 10k/day.
4. **NVD rate limits** — processor pacing + incremental sync windows; KEV is tiny.
5. **Vectorize reindex** — only if knowledge corpus grows 100×; rebuildable by design.
6. **AI narrative cost** — budget module gates; make narrative on-demand (already is via workflows).
Nothing breaks architecturally because Option A's ceilings are measured, not assumed.

## Cost model (order of magnitude, Workers Paid)
100 CVEs/day: negligible (<$30/mo infra) · 1,000/day: still trivial compute; D1 storage growth dominates (~GBs/yr, R2 offload for raw) · 10,000/day: queue+D1 operations become visible ($100s/mo), AI narrative is the only explosion point (gate it). Cost explosion points: per-CVE Gemini calls (frozen), unbounded Vectorize re-embedding, no-DLQ retry storms (a failed message retried forever = compute bleed; today's frozen-no-ack is exactly this).
