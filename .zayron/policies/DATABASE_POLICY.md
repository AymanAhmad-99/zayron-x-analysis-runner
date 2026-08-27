# ZAYRON-X Database Policy

## Rules
- Production D1 is read-only during normal feature development.
- Schema changes require migrations.
- Production data must never be deleted as a debugging shortcut.
- Migration history is immutable.
- Database replacements require architecture approval.
- Destructive SQL requires explicit authorization.

## Forbidden for ordinary tasks
Unless explicitly authorized:
- DROP
- TRUNCATE
- DELETE against production
