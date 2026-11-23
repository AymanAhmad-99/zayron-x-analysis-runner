# R2 failure semantics

Required behavior is fail-closed for missing, inaccessible, malformed, wrong-seed, wrong-chunk, length-mismatch, and digest-mismatch payloads. No D1 V3/FTS writes may occur. Runtime evidence is pending because the R2 registration flow is not yet complete.
