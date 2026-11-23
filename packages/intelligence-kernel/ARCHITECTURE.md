# ZAYRON-X Deterministic Intelligence Kernel — Architecture

## 1. Executive Summary

The ZAYRON-X Deterministic Intelligence Kernel is the permanent, domain-agnostic mathematical referee and validation authority for the ZAYRON-X threat intelligence platform.

Implemented in production-grade Rust (Edition 2024, toolchain pinned), the kernel enforces:
- **Canonical Fact Integrity**: Canonical truth is immutable and authoritative. AI proposals conflicting with canonical truth receive an explicit `CONTRADICTED` state.
- **Evidence Membership**: Claims must resolve to concrete evidence items. Ungrounded external entities, hallucinations, and cross-domain/cross-record contamination are deterministically caught and rejected.
- **Entity Resolution**: Multi-layered deterministic entity resolution (`RESOLVED`, `POSSIBLE`, `AMBIGUOUS`, `UNRESOLVED`) without fuzzy guessing as authoritative truth.
- **Semantic & Temporal Consistency**: Incompatible predicates (e.g. pre-auth vs authentication required, active exploitation vs unexploited) and invalid temporal scopes (e.g. observation prior to disclosure) trigger fail-closed rejection.
- **Source Independence & Conflict Management**: Syndicated or shared-ownership sources (via `independence_group`) do not artificially amplify confidence. Conflicting claims are explicitly preserved in `limitations` rather than averaged or discarded.
- **Domain-Agnostic Operation**: Zero hardcoded CVE names, product blocklists, or malware families. Adding a new domain (including future domains like `orbital_intrusion`) requires only schema and profile definitions, never algorithm modifications.

## 2. Platform Architecture Boundary

```text
               ZAYRON-X PLATFORM
             TypeScript/Cloudflare
                     |
                     v
             WASM / JSON ABI Boundary
                     |
                     v
          RUST DETERMINISTIC KERNEL
                     |
    +----------------+----------------+
    |                |                |
    v                v                v
FACT INTEGRITY   CLAIM VALIDATION   ENTITY RESOLUTION
    |                |                |
    v                v                v
TEMPORAL SCOPE   CONSISTENCY       CONFLICT ENGINE
    |                |                |
    +----------------+----------------+
                     |
                     v
             KERNEL RESULT DTO
                     |
                     v
          TypeScript Orchestration
                     |
                     v
           Editorial Publication
```

## 3. Crate Architecture

Located at `packages/intelligence-kernel/`:

- `crates/kernel-types`: Core types, strongly-typed newtype identifiers (`ObjectId`, `EvidenceId`, `ClaimId`, `SourceId`, `FactId`), enums (`IntelligenceDomain`, `ClaimVerificationStatus`, `AuthorityTier`, `LifecycleState`), and DTO contracts. Strictly `#![forbid(unsafe_code)]`.
- `crates/kernel-core`: Pure deterministic algorithms for normalization, canonical fact integrity, evidence membership, semantic consistency, temporal intervals, conflict resolution, and state transitions. Strictly `#![forbid(unsafe_code)]`.
- `crates/kernel-wasm`: Cloudflare Workers-compatible WebAssembly interface (`wasm32-unknown-unknown`) exposing `process_kernel_request_json`, `kernel_alloc`, `kernel_dealloc`, and `kernel_execute_wasm`. Unsafe operations are strictly isolated to memory pointer marshaling at the FFI boundary.
- `crates/kernel-fixtures`: Cross-domain golden fixtures verifying CVE-2024-3400 contamination rejection, canonical fact precedence, threat actor domains, and synthetic future domains (`orbital_intrusion`).
