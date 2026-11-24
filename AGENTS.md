# ZAYRON-X — CODING AGENT EXECUTION POLICY (BOUNDED CONTEXT GUARD)

## 1. HARD RULE: BOUNDED TASK SCOPE
For every task:
> **Inspect ONLY the files directly required to complete the requested change.**
> The agent MUST NOT perform repository-wide exploration unless a concrete blocker requires it.

---

## 2. MANDATORY INSPECTION ORDER
1. **STEP 1 — Locate the Target**:
   Identify the exact route, worker, module, function, schema, migration, or frontend component directly related to the task.
2. **STEP 2 — Read Only the Target File(s)**:
   Start with the smallest possible file set. Default maximum: **3 files**.
3. **STEP 3 — Trace Only Direct Dependencies**:
   If the target imports another module, inspect only that direct dependency. Do NOT recursively inspect the whole dependency tree.
4. **STEP 4 — Implement**:
   Make the smallest viable change.
5. **STEP 5 — Validate**:
   Run only the checks relevant to the changed area. Do NOT run a full repository audit unless explicitly requested.

---

## 3. HARD FILE LIMITS
- **Default Limit**: Maximum **5 files** inspected before implementation.
- **Exception**: The agent may exceed 5 files ONLY when it records:
  ```text
  SCOPE_EXPANSION_REQUIRED:
  <exact blocker>
  <exact additional file required>
  ```
  Then inspect only the specific additional file(s) required to resolve that blocker.

---

## 4. SEARCH LIMITS
- Search sequence MUST be:
  `TARGET → DIRECT DEPENDENCY → IMPLEMENT → TEST`
  NOT:
  `REPOSITORY → ARCHITECTURE → HISTORY → DOCUMENTATION → IMPLEMENT`
- FORBIDDEN:
  - Entire repository semantic searches
  - Repeated searches for the same symbol
  - Scanning every worker, route, migration, or documentation directory

---

## 5. PREVENT READING LARGE FILES UNNECESSARILY
- If a file is large, do NOT read the entire file.
- Locate the required function, class, type, route, import, or schema and view only the relevant line range (30–100 lines).

---

## 6. NO HISTORICAL OR ARCHITECTURAL EXPLORATION
- Do NOT inspect previous task reports, old audit documents, old migration reports, previous implementation notes, archived files, or obsolete test pages. Current code is the sole source of truth.
- Do NOT spend context reconstructing or explaining the entire ZAYRON-X architecture. Understand only enough architecture to safely modify the requested component.
- Do NOT produce full-repository summaries of workers, routes, tables, or pages unless explicitly requested.

---

## 7. NO DUPLICATE INVESTIGATION
- Once a fact is established from a file, reuse that knowledge.
- Do NOT repeatedly reopen or reread the same file unless it has changed.

---

## 8. TARGETED VERIFICATION ONLY
- **API change**: Targeted typecheck/dry-run build + 1 relevant endpoint check.
- **Frontend change**: Targeted build/typecheck + target preview page check.
- **Database change**: Migration validation + affected query/API check.
- Do NOT run unrelated platform-wide audits or test suites.

---

## 9. PRESERVE EXISTING ARCHITECTURE
Always prefer existing infrastructure over creating new abstractions:
- Existing function
- Existing API route
- Existing worker
- Existing D1 schema
- Existing frontend component / route
- Existing Cloudflare binding

---

## 10. CLOUDFLARE AI RUNTIME MODEL
- **§10 UPDATE (authorised 2026-11-24, Phase 4A.2):** the ZAYRON-X strategic intelligence runtime model is
  `@cf/google/gemma-4-26b-a4b-it` (Workers AI, primary) with `@cf/ibm-granite/granite-4.0-h-micro` as the
  ultra-light fallback. `@cf/meta/llama-3.1-8b-instruct` was retired upstream (`5028` deprecated) and must not be
  used for new work. Gemini is an OPTIONAL, explicitly enabled fallback only.
- Any further change to the runtime model requires an explicit, written executive authorisation recorded here.
- Coding-agent model switch is completely separate from the ZAYRON-X runtime engine. Do NOT change the runtime
  model without that authorisation.

---

## 11. PRE-EXECUTION TOKEN GUARD
When receiving a task, the agent must formulate internally:
```text
TARGET:
<exact component>

FILES_NEEDED:
<minimal file list>

CHANGE:
<one sentence>

VALIDATION:
<minimal validation>
```
Do NOT begin with broad discovery. Keep one-component tasks strictly bounded.
