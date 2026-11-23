# PRODUCTION CHANGE POLICY
## ZAYRON-X Engineering — Mandatory Operating Procedure
### Version: 1.0 | Created: 2026-09-09 | Trigger: Production incident during dossier Phase 0

---

## PURPOSE

This policy exists because a production D1 mutation occurred during a read-only
discovery phase. It is designed to prevent process violations of this class.

---

## MANDATORY ACTION CLASSIFICATION

Every action must be classified BEFORE execution:

| Class | Definition | Authorization Required |
|---|---|---|
| READ_ONLY | No data is created, modified, or deleted | Agent may execute during any phase |
| STAGING_MUTATION | Modifies staging/preview/local environment only | Agent may execute when staging is explicitly in scope |
| PRODUCTION_MUTATION | Modifies production D1, R2, Vectorize, Workers, Queues | Requires explicit human confirmation |

---

## PRODUCTION MUTATION DEFINITION

Any command that results in:
- D1 INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE, CREATE TABLE
- D1 migration application (wrangler d1 migrations apply)
- D1 seed via worker endpoint (/internal/v3-pilot-d1-seed or similar)
- R2 put, delete, or overwrite
- Vectorize upsert, delete, or namespace clear
- Worker deployment (wrangler deploy)
- Secret rotation (wrangler secret put)
- Queue message send
- Any wrangler command with --remote flag that writes

IS A PRODUCTION MUTATION.

---

## PRE-MUTATION CHECKLIST

Before any production mutation, the agent MUST:

1. State explicitly: "This is a PRODUCTION_MUTATION"
2. Identify: TARGET_DATABASE_NAME, TARGET_DATABASE_ID, TARGET_ENVIRONMENT
3. Verify against known production IDs:
   - zayron-x-db: c19c8f45-801b-4034-bd76-402e5e5389b5
   - zayron-x-intelligence-db: 91ed8f95-95ad-4451-bb18-e0d1dbadbe53
4. State the exact rows/objects that will be affected
5. State the rollback/recovery mechanism
6. STOP and request explicit human authorization

---

## PROHIBITED DURING DISCOVERY PHASES

During any audit, forensic, or dossier phase:

DO NOT:
- Execute DELETE on production data
- Execute INSERT on production data (including seed operations)
- Apply migrations with --remote
- Deploy workers
- Modify Vectorize
- Rotate credentials without explicit instruction

---

## DATABASE SAFETY ASSERTION

Every wrangler CLI command targeting D1 must be prefixed with a comment:
  # TARGET: [database_name] | [database_id] | [environment]
  # CLASSIFICATION: [READ_ONLY | STAGING_MUTATION | PRODUCTION_MUTATION]
  # AUTHORIZED: [YES by <source> | NO — STOP]

Example:
  # TARGET: zayron-x-intelligence-db | 91ed8f95-... | PRODUCTION
  # CLASSIFICATION: READ_ONLY
  # AUTHORIZED: YES — audit read
  npx wrangler d1 execute zayron-x-intelligence-db --command "SELECT COUNT(*) FROM knowledge_objects_v3" --remote

---

## CREDENTIAL HANDLING

1. Never include bearer tokens as literal arguments in shell commands
2. Use environment variables: $env:PILOT_TOKEN or $(Get-Content .pilot-token.tmp)
3. Never print credentials in output that will be captured in logs
4. Any credential appearing in a session transcript is treated as COMPROMISED

---

## APPLIES TO

- All AI agents working on this repository
- All human engineers executing wrangler commands against production
- All scripts targeting production D1, R2, Vectorize, or Workers

---

## PROCESS: DISCOVER → VERIFY → FREEZE → DECIDE → MODIFY

This is the mandatory sequence. No step may be skipped.

DISCOVER: Read-only investigation only
VERIFY: Confirm findings with additional read evidence
FREEZE: Create checkpoint document with current state
DECIDE: Obtain explicit human authorization for any mutation
MODIFY: Execute only the authorized mutation, then verify
