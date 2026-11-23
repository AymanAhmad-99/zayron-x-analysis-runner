# ZAYRON-X Deterministic Intelligence Kernel — Security Policy & Invariants

## 1. Safety Policy

- **Safe Rust by Default**: The entire domain model, validation logic, entity resolution, and temporal engine are compiled under `#![forbid(unsafe_code)]`.
- **FFI Boundary Isolation**: The only crate permitting `unsafe` is `kernel-wasm`, where unsafe is strictly limited to raw memory layout and pointer exchanges across the WebAssembly FFI boundary. Every unsafe operation is accompanied by safety invariants and pre-conditions.

## 2. Invariants & Guarantees

1. **Deterministic Idempotency**:
   - For all normalization operations: `normalize(normalize(x)) == normalize(x)`.
   - The same input with the same kernel version produces identical output bits. No system clock calls, no random numbers, no unseeded iterators.
2. **Canonical Truth Precedence**:
   - A canonical fact cannot be overwritten, degraded, or averaged by analytical proposals.
   - Any conflicting proposal is classified as `CONTRADICTED` and causes the validation gate to fail closed (`REJECTED`).
3. **Evidence Grounding (Lexical & Citation Containment)**:
   - Claims marked `CONFIRMED` without verified evidence IDs are rejected as `UNSUPPORTED`.
   - Claims introducing ungrounded external entities or terminology not present in the canonical record or evidence bundle are flagged and rejected.
4. **Source Independence**:
   - Multiple citations sharing an `independence_group` (e.g. syndicated news outlets or same-parent entities) are collapsed and do not count as independent corroboration.
5. **No AI Authority Inside the Kernel**:
   - The Rust kernel has zero network access, zero dynamic model inference, and zero heuristics based on hardcoded entity names or CVE IDs.
