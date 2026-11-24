"""Disposable SQLite validation for migration 0018; never connects to Cloudflare."""
from __future__ import annotations
import json, sqlite3, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "workers/source-fabric/migrations/0018_v3_control_plane.sql"
OUT = ROOT / "docs/forensics/doc04_control_plane_staging_validation_2026-09-09.json"

def attempt(db, sql, params=()):
    try:
        db.execute(sql, params); db.commit(); return {"status": "ACCEPTED"}
    except sqlite3.IntegrityError as e:
        db.rollback(); return {"status": "REJECTED", "error": str(e)}

def main():
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""
      CREATE TABLE knowledge_objects_v3 (object_id TEXT PRIMARY KEY, document_id TEXT NOT NULL, canonical_text TEXT NOT NULL, content_hash TEXT NOT NULL, knowledge_domain TEXT NOT NULL, epistemic_type TEXT NOT NULL, method_category TEXT NOT NULL);
      CREATE VIRTUAL TABLE knowledge_objects_v3_fts USING fts5(object_id UNINDEXED, document_id, canonical_text, knowledge_domain, epistemic_type, method_category);
    """)
    before = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type IN ('table','index') ORDER BY name")]
    sql = MIGRATION.read_text(encoding="utf-8")
    db.executescript(sql); first = "PASS"
    try: db.executescript(sql); second = "PASS"
    except sqlite3.Error as e: second = f"FAIL: {e}"
    after = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type IN ('table','index') ORDER BY name")]
    valid = {}
    valid["identity"] = attempt(db, "INSERT INTO v3_document_identities VALUES (?,?,?,?,?,?,?,?,?,?)", ("di-1","doc-test","Test","Publisher","1","source:test","UNRESOLVED","PROPOSED","2026-09-09","{}"))
    valid["identity_duplicate"] = attempt(db, "INSERT INTO v3_document_identities VALUES (?,?,?,?,?,?,?,?,?,?)", ("di-2","doc-test","Duplicate",None,None,"source:test","UNRESOLVED","PROPOSED","2026-09-09","{}"))
    valid["corpus"] = attempt(db, "INSERT INTO v3_corpus_revisions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", ("cr-1","STAGING","APPROVED","digest-1",1,"parser-v1","v3","PASSED","APPROVED","2026-09-09",None,"{}"))
    valid["document_link"] = attempt(db, "INSERT INTO v3_corpus_documents VALUES (?,?,?,?)", ("cr-1","di-1","source-digest","ir-1"))
    valid["invalid_relationship"] = attempt(db, "INSERT INTO v3_document_identity_relations VALUES (?,?,?,?,?,?)", ("rel-1","di-1","INVALID","missing","e","2026-09-09"))
    valid["seed_missing_corpus"] = attempt(db, "INSERT INTO v3_seed_revisions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", ("sr-bad","missing","digest-1","payload","STAGING","db","operator","idem-bad","APPROVED","NOT_STARTED","2026-09-09",None))
    valid["seed"] = attempt(db, "INSERT INTO v3_seed_revisions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", ("sr-1","cr-1","digest-1","payload","STAGING","db","operator","idem-1","APPROVED","NOT_STARTED","2026-09-09",None))
    valid["seed_duplicate_idempotency"] = attempt(db, "INSERT INTO v3_seed_revisions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", ("sr-2","cr-1","digest-1","payload2","STAGING","db","operator","idem-1","APPROVED","NOT_STARTED","2026-09-09",None))
    valid["deployment_missing_corpus"] = attempt(db, "INSERT INTO v3_deployment_revisions VALUES (?,?,?,?,?,?,?,?,?)", ("dr-bad","c","b","w","STAGING","missing","operator","2026-09-09","UNKNOWN"))
    valid["deployment"] = attempt(db, "INSERT INTO v3_deployment_revisions VALUES (?,?,?,?,?,?,?,?,?)", ("dr-1","c","b","w","STAGING","cr-1","operator","2026-09-09","PARTIAL"))
    valid["dataset"] = attempt(db, "INSERT INTO v3_production_dataset_states VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", ("ds-1","db","SOURCE_STATE","STAGING","dr-1","cr-1","sr-1","digest-1",1,1,0,"2026-09-09","PASSED","evidence"))
    result = {"artifact_type":"control-plane-staging-validation","staging":"in_memory_sqlite","production_touched":False,"migration":"workers/source-fabric/migrations/0018_v3_control_plane.sql","before_schema":before,"after_schema":after,"first_execution":first,"second_execution":second,"idempotency":"PASS" if second == "PASS" else "FAIL","v3_compatibility":"PASS" if "knowledge_objects_v3" in after and "knowledge_objects_v3_fts" in after else "FAIL","governance_tests":valid,"expected_control_plane_tables":["v3_document_identities","v3_document_identity_relations","v3_corpus_revisions","v3_corpus_documents","v3_ingestion_revisions","v3_seed_revisions","v3_deployment_revisions","v3_production_dataset_states"],"notes":["Historical production provenance was not backfilled.","SQLite staging validates SQL/constraints only; it is not a D1 runtime deployment test."]}
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))

if __name__ == "__main__": main()
