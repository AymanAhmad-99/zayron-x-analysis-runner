# Retry semantics

Retry eligible: `PLANNED`, `FAILED`, expired `RUNNING`. Active `RUNNING` is rejected; `COMPLETED` is replay/no-op.
