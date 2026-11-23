# CREDENTIAL EXPOSURE REPORT
## ZAYRON-X — 2026-09-09
### Classification: SECURITY INCIDENT — CREDENTIAL EXPOSURE

DO NOT include credential values in this document.
This document contains ONLY classification, location, and required action.

---

## CREDENTIAL 1 — SOURCE-FABRIC INTERNAL API TOKEN

### Credential Class
Worker internal bearer token (Authorization: Bearer [VALUE])
Used to authenticate internal-only endpoints on the source-fabric worker
(e.g. /internal/v3-pilot-d1-seed, /internal/v3-pilot-fts5-query)

### Exposure Mechanism
The token value was included as a literal argument in shell commands
executed during this AI agent session and appeared in:
- Command outputs captured in session context
- Tool call arguments in the conversation transcript at:
  C:\Users\aabus\.gemini\antigravity-ide\brain\7cc75381-20cb-4305-af56-6d9290bffb9c\.system_generated\logs\transcript.jsonl

### Exposure Location
- AI agent conversation logs (local filesystem only)
- Not in any committed git file (VERIFIED: .gitignore covers .env)
- Not in any production-deployed artifact

### Systems Affected
- workers/source-fabric (production worker: zayron-x-source-fabric.aabusabih.workers.dev)
- All /internal/* endpoints protected by this token

### Token Classification
This token is an INTERNAL_PILOT_TOKEN class credential.
It is stored as a Cloudflare Worker secret (set via `wrangler secret put`).
It does not appear in any committed source file.
Evidence: .env.example does not contain this token variable.
The token was retrieved during a prior session and used in this session.

### Whether Still Active
UNKNOWN — not verified as revoked. Treat as ACTIVE and COMPROMISED.

### Required Rotation Action
1. Run: npx wrangler secret put PILOT_INTERNAL_TOKEN --name zayron-x-source-fabric
   (generates new value, overwrites the secret in Cloudflare)
2. Update any local .env or script references to the new value
3. Verify source-fabric /health endpoint responds after rotation
4. Do NOT commit the new value to any file

### Authority to Rotate
YES — safe to rotate via wrangler secret put without data loss.
Worker will use new secret immediately on next request.
All in-flight requests using old token will fail authentication (low risk — internal only).

### Residual Risk After Rotation
LOW — the token only gates internal audit/seed endpoints, not user-facing routes.
The token does not grant D1 direct access, Vectorize write access, or R2 write access
beyond what the source-fabric worker itself is authorized to do.

---

## CREDENTIAL 2 — TELEGRAM API_HASH IN SOURCE CODE

### Credential Class
Telegram MTProto application credential (API_HASH)
Used by the telegram-collector-do Durable Object for Telegram API authentication

### Exposure Location
COMMITTED TO SOURCE CODE:
  workers/telegram-collector-do/wrangler.toml
  [vars] section — plaintext value

### Exposure Status
EXPOSED IN SOURCE REPOSITORY
This value appears in a tracked file.
Any person with repository access can read this value.

### Systems Affected
- workers/telegram-collector-do (Telegram collection pipeline)
- The Telegram application registered under API_ID = 37585861

### Required Action
1. DO NOT commit any further changes to this file before remediation
2. Move API_HASH to a Cloudflare secret: `wrangler secret put API_HASH --name zayron-telegram-collector-do`
3. Remove API_HASH from wrangler.toml [vars] section
4. Also evaluate API_ID — it is a numeric ID (not secret by itself) but should be reviewed
5. Consider whether the Telegram API application needs to be regenerated at my.telegram.org
   (existing sessions may remain valid even after hash is removed from code)

### Authority to Remove from Source
YES — removing from wrangler.toml vars and moving to secret is safe.
The Durable Object will need to reference it via env.API_HASH after the change.

### Residual Risk
MEDIUM — anyone with prior repository access already has this value.
If repository was public at any point, this credential is fully exposed.
Telegram API hashes cannot be independently rotated without regenerating the application.

---

## CREDENTIAL 3 — CLOUDFLARE ACCOUNT_ID IN .env

### Credential Class
Cloudflare Account ID (not a secret — publicly referenced in wrangler.toml and docs)
Value: 56534d53775d8280011a325dcf36ed09

### Exposure Status
Present in .env (not committed if .gitignore covers it)
Also present in root wrangler.toml comments and source-fabric script references

### Risk Classification
LOW — Account IDs are not authentication credentials.
They are required to construct Cloudflare API URLs but cannot authenticate without tokens.

### Required Action
No rotation required. Verify .env is in .gitignore.

---

## SUMMARY TABLE

| # | Credential | Class | Location | Status | Action Required |
|---|---|---|---|---|---|
| 1 | Source-fabric internal token | Worker secret | Session transcript only | COMPROMISED | Rotate via wrangler secret put |
| 2 | Telegram API_HASH | Application credential | Committed source file | EXPOSED IN SOURCE | Move to secret, evaluate regeneration |
| 3 | Cloudflare Account ID | Non-secret identifier | .env + wrangler.toml | LOW RISK | Verify not in git history |

---

Generated: 2026-09-09T23:08:00+03:00
Classification: SECURITY — DO NOT SHARE TOKEN VALUES
