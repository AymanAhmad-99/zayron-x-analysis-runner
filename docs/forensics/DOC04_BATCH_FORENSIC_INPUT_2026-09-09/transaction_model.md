# Transaction Model

- The claim update is a separate D1 statement before the object batch.
- V3 and FTS statements are placed in the same `SOURCE_STATE.batch(stmts)` call.
- The final `RUNNING → SUCCEEDED` update is a separate D1 statement after the batch.
- There is no explicit `BEGIN`, `COMMIT`, or application-managed transaction in the Worker source.
- There is no chunk transaction and no compensating object cleanup.
- The controlled malformed-object test observed zero V3 and zero FTS rows after failure, consistent with atomic behavior for that D1 batch.
- The code does not establish a general rollback guarantee for all large-batch/runtime failures.
- Before the latest local fix, a 10,000-object failure left the seed revision `RUNNING`; after the fix, post-claim exceptions set it to `FAILED`.
