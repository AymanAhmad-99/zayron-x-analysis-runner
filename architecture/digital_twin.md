# Digital Twin

## Logical Representation
- Ingestion Layer: `radar_engine.py`, `cve_worker.py` -> `raw_feeds`
- Processing Layer: `omni_crew.py` (Harvester, Validator, Compliance, Quant, Weaver) -> `articles`
- Presentation Layer: Next.js Frontend