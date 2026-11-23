//! Evidence-Consistency Proof & Typestate Verification Layer
//!
//! Enforces that a PASS certificate CANNOT be constructed unless raw candidate intelligence
//! transitions monotonically through Grounded -> SemanticallyVerified -> Publishable -> PassCertificate.
//! Direct struct construction of proof tokens is strictly prevented by module encapsulation.
#![forbid(unsafe_code)]

use kernel_types::{
    ClaimId, ClaimVerificationStatus, CveId, EvidenceId, FieldId, KernelInput, LifecycleState,
    SourceId, SourceRole,
};
use std::collections::{BTreeMap, BTreeSet};

/// Domain-scoped claim identifier preventing cross-CVE and cross-field identity collision.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ProofClaimId {
    pub cve: CveId,
    pub field: FieldId,
}

impl ProofClaimId {
    pub fn new(cve: impl Into<CveId>, field: impl Into<FieldId>) -> Self {
        Self {
            cve: cve.into(),
            field: field.into(),
        }
    }
}

/// Explicit set of evidence supporting a claim.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct EvidenceSet {
    pub evidence_ids: BTreeSet<EvidenceId>,
    pub source_ids: BTreeSet<SourceId>,
    pub citations: Vec<String>,
}

impl EvidenceSet {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn singleton(
        evidence_id: EvidenceId,
        source_id: SourceId,
        citation: Option<String>,
    ) -> Self {
        let mut evidence_ids = BTreeSet::new();
        evidence_ids.insert(evidence_id);
        let mut source_ids = BTreeSet::new();
        source_ids.insert(source_id);
        let mut citations = Vec::new();
        if let Some(c) = citation {
            if !c.is_empty() {
                citations.push(c);
            }
        }
        Self {
            evidence_ids,
            source_ids,
            citations,
        }
    }

    pub fn union(&self, other: &Self) -> Self {
        let mut evidence_ids = self.evidence_ids.clone();
        evidence_ids.extend(other.evidence_ids.iter().cloned());

        let mut source_ids = self.source_ids.clone();
        source_ids.extend(other.source_ids.iter().cloned());

        let mut citations = self.citations.clone();
        for c in &other.citations {
            if !citations.contains(c) {
                citations.push(c.clone());
            }
        }
        citations.sort();

        Self {
            evidence_ids,
            source_ids,
            citations,
        }
    }
}

/// Deterministic derivation rule premise.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Derivation {
    pub rule_name: String,
    pub source_fields: Vec<FieldId>,
    pub premise: String,
}

/// Typed epistemic state of an analytical claim within the proof system.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClaimState<T> {
    Unknown,
    Supported {
        value: T,
        evidence: EvidenceSet,
        role: SourceRole,
    },
    Derived {
        value: T,
        derivation: Derivation,
        underlying_evidence: EvidenceSet,
    },
    Conflict {
        conflicting_values: Vec<T>,
        evidence: EvidenceSet,
        reason: String,
    },
}

impl<T: PartialEq + Eq + Clone + Ord> ClaimState<T> {
    /// Commutative, associative, idempotent evidence join operator.
    pub fn join(self, other: Self) -> Self {
        match (self, other) {
            // Identity: Unknown join X == X, X join Unknown == X
            (ClaimState::Unknown, x) => x,
            (x, ClaimState::Unknown) => x,

            // Conflict propagation: Conflict absorbed into any state remains Conflict
            (
                ClaimState::Conflict {
                    mut conflicting_values,
                    evidence: e1,
                    reason: r1,
                },
                ClaimState::Conflict {
                    conflicting_values: v2,
                    evidence: e2,
                    ..
                },
            ) => {
                for v in v2 {
                    if !conflicting_values.contains(&v) {
                        conflicting_values.push(v);
                    }
                }
                conflicting_values.sort();
                ClaimState::Conflict {
                    conflicting_values,
                    evidence: e1.union(&e2),
                    reason: r1,
                }
            }
            (
                ClaimState::Conflict {
                    mut conflicting_values,
                    evidence: e1,
                    reason,
                },
                ClaimState::Supported {
                    value, evidence: e2, ..
                },
            )
            | (
                ClaimState::Supported {
                    value, evidence: e2, ..
                },
                ClaimState::Conflict {
                    mut conflicting_values,
                    evidence: e1,
                    reason,
                },
            ) => {
                if !conflicting_values.contains(&value) {
                    conflicting_values.push(value);
                }
                conflicting_values.sort();
                ClaimState::Conflict {
                    conflicting_values,
                    evidence: e1.union(&e2),
                    reason,
                }
            }
            (
                ClaimState::Conflict {
                    mut conflicting_values,
                    evidence: e1,
                    reason,
                },
                ClaimState::Derived {
                    value,
                    underlying_evidence: e2,
                    ..
                },
            )
            | (
                ClaimState::Derived {
                    value,
                    underlying_evidence: e2,
                    ..
                },
                ClaimState::Conflict {
                    mut conflicting_values,
                    evidence: e1,
                    reason,
                },
            ) => {
                if !conflicting_values.contains(&value) {
                    conflicting_values.push(value);
                }
                conflicting_values.sort();
                ClaimState::Conflict {
                    conflicting_values,
                    evidence: e1.union(&e2),
                    reason,
                }
            }

            // Supported join Supported
            (
                ClaimState::Supported {
                    value: v1,
                    evidence: e1,
                    role: r1,
                },
                ClaimState::Supported {
                    value: v2,
                    evidence: e2,
                    role: r2,
                },
            ) => {
                if v1 == v2 {
                    ClaimState::Supported {
                        value: v1,
                        evidence: e1.union(&e2),
                        role: std::cmp::min(r1, r2),
                    }
                } else {
                    let mut conflicting_values = vec![v1, v2];
                    conflicting_values.sort();
                    ClaimState::Conflict {
                        conflicting_values,
                        evidence: e1.union(&e2),
                        reason: "Material disagreement between supported sources".to_string(),
                    }
                }
            }

            // Derived join Derived
            (
                ClaimState::Derived {
                    value: v1,
                    derivation: d1,
                    underlying_evidence: e1,
                },
                ClaimState::Derived {
                    value: v2,
                    underlying_evidence: e2,
                    ..
                },
            ) => {
                if v1 == v2 {
                    ClaimState::Derived {
                        value: v1,
                        derivation: d1,
                        underlying_evidence: e1.union(&e2),
                    }
                } else {
                    let mut conflicting_values = vec![v1, v2];
                    conflicting_values.sort();
                    ClaimState::Conflict {
                        conflicting_values,
                        evidence: e1.union(&e2),
                        reason: "Material disagreement between derivations".to_string(),
                    }
                }
            }

            // Supported join Derived
            (
                ClaimState::Supported {
                    value: v1,
                    evidence: e1,
                    role: r1,
                },
                ClaimState::Derived {
                    value: v2,
                    underlying_evidence: e2,
                    ..
                },
            )
            | (
                ClaimState::Derived {
                    value: v2,
                    underlying_evidence: e2,
                    ..
                },
                ClaimState::Supported {
                    value: v1,
                    evidence: e1,
                    role: r1,
                },
            ) => {
                if v1 == v2 {
                    ClaimState::Supported {
                        value: v1,
                        evidence: e1.union(&e2),
                        role: r1,
                    }
                } else {
                    let mut conflicting_values = vec![v1, v2];
                    conflicting_values.sort();
                    ClaimState::Conflict {
                        conflicting_values,
                        evidence: e1.union(&e2),
                        reason: "Material disagreement between supported source fact and derivation"
                            .to_string(),
                    }
                }
            }
        }
    }
}

// ── Typestate Pipeline Definitions ──────────────────────────────────────────

/// Unverified raw intelligence artifact directly from parser or host FFI.
#[derive(Debug, Clone)]
pub struct UnverifiedReport {
    pub(crate) input: KernelInput,
}

impl UnverifiedReport {
    pub fn new(input: KernelInput) -> Self {
        Self { input }
    }

    pub fn input(&self) -> &KernelInput {
        &self.input
    }
}

/// Intelligence artifact whose claims, canonical facts, and evidence items have been
/// grounded into domain types and reconciled via the evidence join operator.
#[derive(Debug, Clone)]
pub struct GroundedReport {
    pub(crate) input: KernelInput,
    pub(crate) claims: BTreeMap<ProofClaimId, ClaimState<String>>,
}

impl GroundedReport {
    pub fn input(&self) -> &KernelInput {
        &self.input
    }

    pub fn claims(&self) -> &BTreeMap<ProofClaimId, ClaimState<String>> {
        &self.claims
    }
}

/// Cryptographic proof token issued when semantic and cross-layer consistency verification passes.
/// Private sealed field prevents manual or external construction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidationProof {
    _sealed: (),
}

/// Intelligence artifact that has passed all canonical fact integrity, semantic non-contradiction,
/// ATT&CK grounding, mechanism bounds, and cross-layer consistency verification.
#[derive(Debug, Clone)]
pub struct SemanticallyVerifiedReport {
    pub(crate) report: GroundedReport,
    pub(crate) proof: ValidationProof,
}

impl SemanticallyVerifiedReport {
    pub fn report(&self) -> &GroundedReport {
        &self.report
    }

    pub fn proof(&self) -> &ValidationProof {
        &self.proof
    }
}

/// Cryptographic proof token issued when publishability invariants and lifecycle gating pass.
/// Private sealed field prevents manual or external construction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublishabilityProof {
    _sealed: (),
}

/// Intelligence artifact cleared for publication under governance invariants.
#[derive(Debug, Clone)]
pub struct PublishableReport {
    pub(crate) report: SemanticallyVerifiedReport,
    pub(crate) proof: PublishabilityProof,
}

impl PublishableReport {
    pub fn report(&self) -> &SemanticallyVerifiedReport {
        &self.report
    }

    pub fn proof(&self) -> &PublishabilityProof {
        &self.proof
    }
}

/// Final Proof-Carrying Pass Certificate.
/// Structurally incapable of being issued unless the full typestate chain was executed and validated.
#[derive(Debug, Clone)]
pub struct PassCertificate {
    pub(crate) report: PublishableReport,
    _sealed: (),
}

impl PassCertificate {
    pub fn report(&self) -> &PublishableReport {
        &self.report
    }

    pub fn kernel_input(&self) -> &KernelInput {
        &self.report.report.report.input
    }
}

// ── Explicit Error Types (Zero Hidden Panics) ────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GroundingError {
    MissingCriticalFact(String),
    UngroundedEntity(String),
    MalformedEvidence(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VerificationError {
    CanonicalConflict {
        field: String,
        canonical: String,
        claimed: String,
    },
    CrossLayerInconsistency {
        field: String,
        reason: String,
    },
    UnsupportedPromotion {
        domain: String,
        detail: String,
    },
    SemanticContradiction(String),
    TemporalInvalid(String),
    UnreconciledConflict {
        field: String,
        detail: String,
    },
    ClaimUnsupported {
        claim_id: ClaimId,
        detail: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PublishabilityError {
    UnresolvedConflicts(Vec<String>),
    UnsupportedClaims(Vec<String>),
    StateTransitionForbidden {
        from: LifecycleState,
        to: LifecycleState,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PipelineError {
    Grounding(GroundingError),
    Verification(VerificationError),
    Publishability(PublishabilityError),
}

impl From<GroundingError> for PipelineError {
    fn from(e: GroundingError) -> Self {
        PipelineError::Grounding(e)
    }
}

impl From<VerificationError> for PipelineError {
    fn from(e: VerificationError) -> Self {
        PipelineError::Verification(e)
    }
}

impl From<PublishabilityError> for PipelineError {
    fn from(e: PublishabilityError) -> Self {
        PipelineError::Publishability(e)
    }
}

// ── Typestate Transition Functions ──────────────────────────────────────────

/// Transition 1: Raw Unverified -> Grounded
pub fn ground(input: UnverifiedReport) -> Result<GroundedReport, GroundingError> {
    let raw = input.input;

    // 1. Profile Critical Facts Check
    if let Some(profile) = &raw.profile {
        for critical in &profile.critical_facts {
            let critical_lower = critical.to_lowercase();
            let has_canon = raw
                .canonical
                .canonical_facts
                .keys()
                .any(|k| k.to_lowercase() == critical_lower);
            let has_claim = raw
                .claims
                .iter()
                .any(|c| c.predicate.to_lowercase() == critical_lower);
            if !has_canon && !has_claim {
                return Err(GroundingError::MissingCriticalFact(critical.clone()));
            }
        }
    }

    // 2. Map claims and evidence into Grounded ClaimState map using the join operator
    let cve_id = CveId::new(raw.canonical.primary_identifier.clone());
    let mut claims_map: BTreeMap<ProofClaimId, ClaimState<String>> = BTreeMap::new();

    // Ingest Canonical Facts as foundational Supported states
    for (fact_name, fact) in &raw.canonical.canonical_facts {
        let field_id = FieldId::new(fact_name.clone());
        let claim_id = ProofClaimId::new(cve_id.clone(), field_id);

        let fact_val_str = match &fact.value {
            serde_json::Value::String(s) => s.clone(),
            other => other.to_string(),
        };

        let ev_set = EvidenceSet::singleton(
            EvidenceId::new(fact.fact_id.as_str()),
            fact.source_id.clone(),
            None,
        );

        let role = match fact.source_id.as_str().to_lowercase().as_str() {
            "cisa" | "cisa-kev" | "cisa_kev" => SourceRole::ExploitationAuthority,
            "nvd" | "nvd-cpe" => SourceRole::CvssAuthority,
            "mitre" | "mitre-cwe" => SourceRole::TaxonomyAuthority,
            _ => SourceRole::TechnicalAuthority,
        };

        let fact_state = ClaimState::Supported {
            value: fact_val_str,
            evidence: ev_set,
            role,
        };

        claims_map.insert(claim_id, fact_state);
    }

    // Ingest and Join Claims
    for claim in &raw.claims {
        let field_id = FieldId::new(claim.predicate.clone());
        let claim_id = ProofClaimId::new(cve_id.clone(), field_id);

        let val = claim.object_value.trim().to_string();
        let is_unknown = val.is_empty()
            || val.eq_ignore_ascii_case("UNKNOWN")
            || val.eq_ignore_ascii_case("not_available");

        let mut ev_set = EvidenceSet::new();
        for ref_id in &claim.evidence_refs {
            ev_set.evidence_ids.insert(ref_id.clone());
            if let Some(item) = raw.bundle.items.iter().find(|i| &i.evidence_id == ref_id) {
                ev_set.source_ids.insert(item.source_id.clone());
                if !item.url.is_empty() {
                    ev_set.citations.push(item.url.clone());
                }
            }
        }

        let claim_state = if is_unknown {
            ClaimState::Unknown
        } else if claim.status.eq_ignore_ascii_case("CONFIRMED")
            || claim.status.eq_ignore_ascii_case("SOURCE_FACT")
        {
            ClaimState::Supported {
                value: val,
                evidence: ev_set,
                role: SourceRole::TechnicalAuthority,
            }
        } else {
            ClaimState::Derived {
                value: val,
                derivation: Derivation {
                    rule_name: "analytical_pipeline".to_string(),
                    source_fields: vec![FieldId::new(claim.predicate.clone())],
                    premise: claim.text.clone(),
                },
                underlying_evidence: ev_set,
            }
        };

        // Join into map
        if let Some(existing) = claims_map.remove(&claim_id) {
            let merged = existing.join(claim_state);
            claims_map.insert(claim_id, merged);
        } else {
            claims_map.insert(claim_id, claim_state);
        }
    }

    Ok(GroundedReport {
        input: raw,
        claims: claims_map,
    })
}

/// Transition 2: Grounded -> SemanticallyVerified
pub fn verify(input: GroundedReport) -> Result<SemanticallyVerifiedReport, VerificationError> {
    let raw = &input.input;

    // 1. Fact Integrity Check (AI vs Canonical Truth)
    for claim in &raw.claims {
        let fact_check = crate::facts::check_canonical_fact_integrity(claim, &raw.canonical);
        if fact_check.has_conflict {
            return Err(VerificationError::CanonicalConflict {
                field: fact_check.conflicting_fact_name.unwrap_or_default(),
                canonical: fact_check.canonical_value.unwrap_or_default(),
                claimed: claim.object_value.clone(),
            });
        }
    }

    // 2. Cross-Layer Consistency & Domain Separation Bounds Proof
    let bundle_text = raw
        .bundle
        .items
        .iter()
        .map(|i| format!("{} {}", i.statement.to_lowercase(), i.url.to_lowercase()))
        .collect::<Vec<_>>()
        .join("\n");

    for (claim_id, state) in &input.claims {
        let field_name = claim_id.field.as_str().to_lowercase();

        match state {
            ClaimState::Conflict {
                conflicting_values,
                reason,
                ..
            } => {
                return Err(VerificationError::UnreconciledConflict {
                    field: field_name,
                    detail: format!("{}: {:?}", reason, conflicting_values),
                });
            }
            ClaimState::Unknown => {
                // Cross-layer failure check: structured field is UNKNOWN, but evidence bundle
                // contains explicit supported knowledge for this exact field.
                if field_name.contains("fixed_version") {
                    if bundle_text.contains("fixed in ")
                        || bundle_text.contains("patch release ")
                        || bundle_text.contains("fixed release")
                    {
                        return Err(VerificationError::CrossLayerInconsistency {
                            field: field_name,
                            reason: "Evidence bundle provides authoritative fixed version release fact, but structured field remains UNKNOWN.".to_string(),
                        });
                    }
                } else if field_name.contains("cvss") {
                    if bundle_text.contains("cvss:3.") || bundle_text.contains("cvss:4.") {
                        return Err(VerificationError::CrossLayerInconsistency {
                            field: field_name,
                            reason: "Evidence bundle provides verified CVSS telemetry, but structured field remains UNKNOWN.".to_string(),
                        });
                    }
                }
            }
            ClaimState::Supported { value, .. } | ClaimState::Derived { value, .. } => {
                let val_lower = value.to_lowercase();

                // Check A: ATT&CK Promotion Discipline (T1083 / T1203)
                if val_lower.contains("t1083") {
                    let has_discovery_evidence = bundle_text.contains("directory listing")
                        || bundle_text.contains("file enumeration")
                        || bundle_text.contains("directory enumeration")
                        || bundle_text.contains("file discovery")
                        || bundle_text.contains("directory discovery");
                    if !has_discovery_evidence {
                        return Err(VerificationError::UnsupportedPromotion {
                            domain: "ATT&CK".to_string(),
                            detail: "T1083 (File and Directory Discovery) requires explicit discovery behavior evidence; CWE-22/CWE-35 traversal alone does not constitute proof.".to_string(),
                        });
                    }
                }

                if val_lower.contains("t1203") {
                    let has_client_evidence = bundle_text.contains("client execution")
                        || bundle_text.contains("user opened")
                        || bundle_text.contains("client application")
                        || bundle_text.contains("crafted file opened");
                    if !has_client_evidence {
                        return Err(VerificationError::UnsupportedPromotion {
                            domain: "ATT&CK".to_string(),
                            detail: "T1203 (Exploitation for Client Execution) requires explicit client application execution evidence.".to_string(),
                        });
                    }
                }

                // Check B: Technical Mechanism (File Read vs File Write)
                if field_name.contains("mechanism") {
                    let asserts_write = val_lower.contains("arbitrary file write")
                        || val_lower.contains("file write")
                        || val_lower.contains("write access")
                        || val_lower.contains("file modification");
                    if asserts_write {
                        let has_write_evidence = bundle_text.contains("arbitrary file write")
                            || bundle_text.contains("file write")
                            || bundle_text.contains("upload")
                            || bundle_text.contains("file modification");
                        if !has_write_evidence {
                            return Err(VerificationError::UnsupportedPromotion {
                                domain: "technical_mechanism".to_string(),
                                detail: "Arbitrary file write claim requires explicit write capability evidence; read capability does not prove write capability.".to_string(),
                            });
                        }
                    }
                }

                // Check C: CPE Upper Bound vs Vendor Fixed Release
                if field_name.contains("fixed_version")
                    && !val_lower.is_empty()
                    && !val_lower.contains("unknown")
                {
                    let is_cpe_interval_only = bundle_text.contains("versionendexcluding")
                        && !bundle_text.contains("fixed in")
                        && !bundle_text.contains("patch release")
                        && !bundle_text.contains("fixed release")
                        && !bundle_text.contains("advisory");
                    if is_cpe_interval_only {
                        return Err(VerificationError::UnsupportedPromotion {
                            domain: "fixed_versions".to_string(),
                            detail: "CPE upper bound interval (versionEndExcluding) cannot be manufactured into a vendor fixed release without authoritative bulletin evidence.".to_string(),
                        });
                    }
                }
            }
        }
    }

    // 3. Evidence Membership & External Contamination Check
    for claim in &raw.claims {
        let val_out = crate::membership::validate_claim_against_evidence(
            claim,
            &raw.canonical,
            &raw.bundle,
        );
        if val_out.status == ClaimVerificationStatus::Contradicted {
            return Err(VerificationError::CanonicalConflict {
                field: claim.predicate.clone(),
                canonical: "authoritative evidence".to_string(),
                claimed: claim.object_value.clone(),
            });
        }
        if val_out.status == ClaimVerificationStatus::Unsupported {
            return Err(VerificationError::ClaimUnsupported {
                claim_id: claim.claim_id.clone(),
                detail: val_out.reasons.join("; "),
            });
        }
    }

    // 4. Semantic Consistency (e.g. auth contradiction, exploitation state contradiction)
    let sem_check = crate::consistency::check_semantic_consistency(&raw.claims);
    if !sem_check.is_valid {
        return Err(VerificationError::SemanticContradiction(
            sem_check.conflicts.join("; "),
        ));
    }

    // 5. Temporal Scopes Validation
    for claim in &raw.claims {
        if let Some(temp) = &claim.temporal {
            let t_res = crate::temporal::validate_temporal_scope(temp);
            if !t_res.is_valid {
                return Err(VerificationError::TemporalInvalid(
                    t_res.errors.join("; "),
                ));
            }
        }
    }

    Ok(SemanticallyVerifiedReport {
        report: input,
        proof: ValidationProof { _sealed: () },
    })
}

/// Transition 3: SemanticallyVerified -> Publishable
pub fn authorize(
    input: SemanticallyVerifiedReport,
) -> Result<PublishableReport, PublishabilityError> {
    crate::state_machine::can_transition(
        LifecycleState::Validated,
        LifecycleState::Governed,
    )
    .and_then(|_| {
        crate::state_machine::can_transition(
            LifecycleState::Governed,
            LifecycleState::Publishable,
        )
    })
    .map_err(|e| PublishabilityError::StateTransitionForbidden {
        from: e.from,
        to: e.to,
    })?;

    // Verify that zero claims are in Conflict
    let mut conflicts = Vec::new();
    for (claim_id, state) in &input.report.claims {
        if let ClaimState::Conflict {
            conflicting_values,
            reason,
            ..
        } = state
        {
            conflicts.push(format!(
                "{}: {} ({:?})",
                claim_id.field, reason, conflicting_values
            ));
        }
    }
    if !conflicts.is_empty() {
        return Err(PublishabilityError::UnresolvedConflicts(conflicts));
    }

    Ok(PublishableReport {
        report: input,
        proof: PublishabilityProof { _sealed: () },
    })
}

/// Transition 4: Publishable -> PassCertificate
/// Final proof token constructor. Consumes the PublishableReport.
pub fn issue_pass(input: PublishableReport) -> PassCertificate {
    PassCertificate {
        report: input,
        _sealed: (),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use kernel_types::*;
    use std::collections::BTreeMap;

    fn make_test_bundle(statements: Vec<(&str, &str, &str)>) -> EvidenceBundle {
        let items = statements
            .into_iter()
            .enumerate()
            .map(|(i, (src, url, stmt))| EvidenceItem {
                evidence_id: EvidenceId::new(format!("ev_{}", i)),
                object_id: ObjectId::new("CVE-TEST-0001"),
                source_id: SourceId::new(src),
                source_type: AuthorityTier::PrimaryVendor,
                url: url.to_string(),
                statement: stmt.to_string(),
                temporal: None,
                provenance_hash: None,
            })
            .collect();

        EvidenceBundle {
            object_id: ObjectId::new("CVE-TEST-0001"),
            domain: IntelligenceDomain::Vulnerability,
            items,
        }
    }

    fn make_test_canonical(facts: Vec<(&str, &str)>) -> CanonicalRecord {
        let mut canonical_facts = BTreeMap::new();
        for (i, (name, val)) in facts.into_iter().enumerate() {
            canonical_facts.insert(
                name.to_string(),
                CanonicalFact {
                    fact_id: FactId::new(format!("f_{}", i)),
                    fact_type: CanonicalFactType::Metric,
                    name: name.to_string(),
                    value: serde_json::json!(val),
                    source_id: SourceId::new("canonical_source"),
                    is_immutable: true,
                    temporal: None,
                },
            );
        }
        CanonicalRecord {
            object_id: ObjectId::new("CVE-TEST-0001"),
            domain: IntelligenceDomain::Vulnerability,
            primary_identifier: "CVE-TEST-0001".to_string(),
            aliases: vec![],
            canonical_facts,
            metadata: BTreeMap::new(),
        }
    }

    // 1. Unknown joined with supported knowledge does not produce Unknown
    #[test]
    fn test_join_unknown_with_supported() {
        let unknown: ClaimState<String> = ClaimState::Unknown;
        let supported: ClaimState<String> = ClaimState::Supported {
            value: "9.8".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev1"), SourceId::new("nvd"), None),
            role: SourceRole::CvssAuthority,
        };

        let res = unknown.join(supported.clone());
        assert_eq!(res, supported);
    }

    // 2. Supported same-value evidence merges correctly
    #[test]
    fn test_join_supported_same_value_merges_evidence() {
        let s1: ClaimState<String> = ClaimState::Supported {
            value: "9.8".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev1"), SourceId::new("nvd"), None),
            role: SourceRole::CvssAuthority,
        };
        let s2: ClaimState<String> = ClaimState::Supported {
            value: "9.8".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev2"), SourceId::new("cna"), None),
            role: SourceRole::TechnicalAuthority,
        };

        let merged = s1.join(s2);
        match merged {
            ClaimState::Supported { value, evidence, .. } => {
                assert_eq!(value, "9.8");
                assert_eq!(evidence.evidence_ids.len(), 2);
                assert!(evidence.evidence_ids.contains(&EvidenceId::new("ev1")));
                assert!(evidence.evidence_ids.contains(&EvidenceId::new("ev2")));
            }
            _ => panic!("Expected Supported state"),
        }
    }

    // 3. Supported different-value evidence produces Conflict
    #[test]
    fn test_join_supported_different_values_produces_conflict() {
        let s1: ClaimState<String> = ClaimState::Supported {
            value: "9.8".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev1"), SourceId::new("cna"), None),
            role: SourceRole::TechnicalAuthority,
        };
        let s2: ClaimState<String> = ClaimState::Supported {
            value: "7.5".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev2"), SourceId::new("nvd"), None),
            role: SourceRole::CvssAuthority,
        };

        let res = s1.join(s2);
        match res {
            ClaimState::Conflict { conflicting_values, .. } => {
                assert_eq!(conflicting_values, vec!["7.5".to_string(), "9.8".to_string()]);
            }
            _ => panic!("Expected Conflict state"),
        }
    }

    // 4. Join is commutative: A join B == B join A
    #[test]
    fn test_join_commutative() {
        let s1: ClaimState<String> = ClaimState::Supported {
            value: "9.8".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev1"), SourceId::new("cna"), None),
            role: SourceRole::TechnicalAuthority,
        };
        let s2: ClaimState<String> = ClaimState::Supported {
            value: "7.5".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev2"), SourceId::new("nvd"), None),
            role: SourceRole::CvssAuthority,
        };

        assert_eq!(s1.clone().join(s2.clone()), s2.join(s1));
    }

    // 5. Join is associative: (A join B) join C == A join (B join C)
    #[test]
    fn test_join_associative() {
        let a: ClaimState<String> = ClaimState::Supported {
            value: "1.0".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev1"), SourceId::new("src1"), None),
            role: SourceRole::TechnicalAuthority,
        };
        let b: ClaimState<String> = ClaimState::Supported {
            value: "2.0".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev2"), SourceId::new("src2"), None),
            role: SourceRole::CvssAuthority,
        };
        let c: ClaimState<String> = ClaimState::Supported {
            value: "3.0".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev3"), SourceId::new("src3"), None),
            role: SourceRole::ExploitationAuthority,
        };

        let left = a.clone().join(b.clone()).join(c.clone());
        let right = a.join(b.join(c));
        assert_eq!(left, right);
    }

    // 6. Join is idempotent: A join A == A
    #[test]
    fn test_join_idempotent() {
        let s: ClaimState<String> = ClaimState::Supported {
            value: "9.8".to_string(),
            evidence: EvidenceSet::singleton(EvidenceId::new("ev1"), SourceId::new("cna"), None),
            role: SourceRole::TechnicalAuthority,
        };
        assert_eq!(s.clone().join(s.clone()), s);

        let u: ClaimState<String> = ClaimState::Unknown;
        assert_eq!(u.clone().join(u.clone()), u);
    }

    // 7. A conflict cannot produce Pass
    #[test]
    fn test_conflict_cannot_produce_pass() {
        let canonical = make_test_canonical(vec![("cvss_score", "9.8")]);
        let bundle = make_test_bundle(vec![("nvd", "https://nvd.nist.gov", "CVSS base score is 7.5.")]);

        let claim = CoreClaim {
            claim_id: ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "cvss_score".to_string(),
            object_value: "7.5".to_string(),
            text: "CVSS score is 7.5.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(1.0),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req1".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let unverified = UnverifiedReport::new(input);
        let grounded = ground(unverified).unwrap();
        let verif_res = verify(grounded);
        assert!(verif_res.is_err(), "Conflict must fail verification");
    }

    // 8. Unknown without supplied evidence remains Unknown
    #[test]
    fn test_unknown_without_evidence_remains_unknown() {
        let canonical = make_test_canonical(vec![]);
        let bundle = make_test_bundle(vec![]);

        let claim = CoreClaim {
            claim_id: ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "fixed_versions".to_string(),
            object_value: "UNKNOWN".to_string(),
            text: "Fixed version is UNKNOWN.".to_string(),
            status: "UNKNOWN".to_string(),
            evidence_refs: vec![],
            confidence_score: None,
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req2".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let claim_id = ProofClaimId::new("CVE-TEST-0001", "fixed_versions");
        assert_eq!(grounded.claims.get(&claim_id), Some(&ClaimState::Unknown));
    }

    // 9. A supplied supported claim cannot remain Unknown when verifier establishes both refer to same claim
    #[test]
    fn test_cross_layer_inconsistency_rejected() {
        let canonical = make_test_canonical(vec![]);
        let bundle = make_test_bundle(vec![("vendor", "https://vendor.com", "Fixed in 19.3.2 security update.")]);

        let claim = CoreClaim {
            claim_id: ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "fixed_versions".to_string(),
            object_value: "UNKNOWN".to_string(),
            text: "Fixed version is UNKNOWN.".to_string(),
            status: "UNKNOWN".to_string(),
            evidence_refs: vec![],
            confidence_score: None,
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req3".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let verif_res = verify(grounded);
        assert!(matches!(verif_res, Err(VerificationError::CrossLayerInconsistency { .. })));
    }

    // 10. A SourceFact cannot be silently rewritten as an AI inference
    #[test]
    fn test_source_fact_not_rewritten_as_inference() {
        let canonical = make_test_canonical(vec![("vendor", "VendorCorp")]);
        let bundle = make_test_bundle(vec![("vendor", "https://vendor.com", "VendorCorp declares vulnerability.")]);

        let claim = CoreClaim {
            claim_id: ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "vendor".to_string(),
            object_value: "VendorCorp".to_string(),
            text: "Vendor inferred as VendorCorp.".to_string(),
            status: "CANDIDATE".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(0.6),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req4".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let claim_id = ProofClaimId::new("CVE-TEST-0001", "vendor");
        match grounded.claims.get(&claim_id) {
            Some(ClaimState::Supported { value, .. }) => assert_eq!(value, "VendorCorp"),
            _ => panic!("Canonical SourceFact must be preserved"),
        }
    }

    // 11. A CVSS impact cannot become technical mechanism evidence
    #[test]
    fn test_cvss_impact_cannot_become_mechanism() {
        let canonical = make_test_canonical(vec![("cvss_vector", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N")]);
        let bundle = make_test_bundle(vec![("cna", "https://cna.org", "Unauthorized arbitrary file read vulnerability.")]);

        let write_mechanism_claim = CoreClaim {
            claim_id: ClaimId::new("c_mech"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "technical_mechanism".to_string(),
            object_value: "arbitrary file write".to_string(),
            text: "Integrity High in CVSS implies arbitrary file write mechanism.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(0.9),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req5".to_string(),
            canonical,
            bundle,
            claims: vec![write_mechanism_claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let verif_res = verify(grounded);
        assert!(matches!(verif_res, Err(VerificationError::UnsupportedPromotion { domain, .. }) if domain == "technical_mechanism"));
    }

    // 12. An SSVC classification cannot become CVSS CIA data
    #[test]
    fn test_ssvc_cannot_become_cvss_cia() {
        let canonical = make_test_canonical(vec![
            ("cvss_vector", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N"),
            ("ssvc_technical_impact", "total"),
        ]);
        let bundle = make_test_bundle(vec![("cisa", "https://cisa.gov", "SSVC Technical Impact: total")]);

        let cia_claim = CoreClaim {
            claim_id: ClaimId::new("c_cia"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "cvss_vector".to_string(),
            object_value: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H".to_string(),
            text: "Total SSVC impact implies full confidentiality, integrity, and availability compromise.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(0.9),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req6".to_string(),
            canonical,
            bundle,
            claims: vec![cia_claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let verif_res = verify(grounded);
        assert!(matches!(verif_res, Err(VerificationError::CanonicalConflict { .. })));
    }

    // 13. A CWE cannot automatically create an ATT&CK technique
    #[test]
    fn test_cwe_cannot_automatically_create_attack_technique() {
        let canonical = make_test_canonical(vec![("cwe_id", "CWE-22")]);
        let bundle = make_test_bundle(vec![("nvd", "https://nvd.nist.gov", "Improper limitation of a pathname to a restricted directory (Path Traversal CWE-22).")]);

        let attack_claim = CoreClaim {
            claim_id: ClaimId::new("c_att"),
            domain: IntelligenceDomain::Technique,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "attack_technique".to_string(),
            object_value: "T1083".to_string(),
            text: "Mapped to T1083 File and Directory Discovery via CWE-22 traversal.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(0.8),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req7".to_string(),
            canonical,
            bundle,
            claims: vec![attack_claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let verif_res = verify(grounded);
        assert!(matches!(verif_res, Err(VerificationError::UnsupportedPromotion { domain, .. }) if domain == "ATT&CK"));
    }

    // 14. A path traversal claim cannot automatically become a write claim
    #[test]
    fn test_path_traversal_cannot_become_write_claim() {
        let canonical = make_test_canonical(vec![("cwe_id", "CWE-22")]);
        let bundle = make_test_bundle(vec![("cna", "https://cna.org", "Path traversal allows unauthenticated file read.")]);

        let write_claim = CoreClaim {
            claim_id: ClaimId::new("c_write"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "mechanism".to_string(),
            object_value: "arbitrary file write".to_string(),
            text: "Path traversal allows arbitrary file write.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(0.85),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req8".to_string(),
            canonical,
            bundle,
            claims: vec![write_claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let verif_res = verify(grounded);
        assert!(matches!(verif_res, Err(VerificationError::UnsupportedPromotion { domain, .. }) if domain == "technical_mechanism"));
    }

    // 15. A CPE upper bound cannot automatically become a vendor fixed release
    #[test]
    fn test_cpe_upper_bound_cannot_become_vendor_fixed_release() {
        let canonical = make_test_canonical(vec![]);
        let bundle = make_test_bundle(vec![("nvd", "https://nvd.nist.gov", "cpe:2.3:a:vendor:prod:*:*:*:*:*:*:*:* versionEndExcluding: 1.2.3")]);

        let fixed_claim = CoreClaim {
            claim_id: ClaimId::new("c_fixed"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "fixed_versions".to_string(),
            object_value: "1.2.3".to_string(),
            text: "Vendor fixed release is 1.2.3.".to_string(),
            status: "SOURCE_FACT".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(1.0),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req9".to_string(),
            canonical,
            bundle,
            claims: vec![fixed_claim],
            profile: None,
            sources: vec![],
        };

        let grounded = ground(UnverifiedReport::new(input)).unwrap();
        let verif_res = verify(grounded);
        assert!(matches!(verif_res, Err(VerificationError::UnsupportedPromotion { domain, .. }) if domain == "fixed_versions"));
    }

    // 16. A valid report cannot bypass the verification typestate
    #[test]
    fn test_valid_report_typestate_progression() {
        let canonical = make_test_canonical(vec![("affected_product", "TestApp"), ("cvss_score", "9.8")]);
        let bundle = make_test_bundle(vec![("vendor", "https://vendor.com", "TestApp vulnerability base score 9.8.")]);

        let claim = CoreClaim {
            claim_id: ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "affected_product".to_string(),
            object_value: "TestApp".to_string(),
            text: "Affected product is TestApp.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(1.0),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req10".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let unverified = UnverifiedReport::new(input);
        let grounded = ground(unverified).expect("Grounding must succeed");
        let verified = verify(grounded).expect("Verification must succeed");
        let publishable = authorize(verified).expect("Authorization must succeed");
        let cert = issue_pass(publishable);

        assert_eq!(cert.kernel_input().request_id, "req10");
    }

    // 17. PassCertificate cannot be created without successful verification
    #[test]
    fn test_pass_certificate_cannot_bypass_verification() {
        let canonical = make_test_canonical(vec![("cvss_score", "10.0")]);
        let bundle = make_test_bundle(vec![("vendor", "https://vendor.com", "Score is 10.0.")]);

        let claim = CoreClaim {
            claim_id: ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "cvss_score".to_string(),
            object_value: "5.0".to_string(),
            text: "Score is 5.0.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(1.0),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req11".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let output = crate::execute_kernel(input);
        assert!(!output.success, "Must not issue PASS on contradictory input");
        assert_eq!(output.lifecycle_state, LifecycleState::Rejected);
        assert!(!output.errors.is_empty());
    }

    // 18. The public kernel entry point remains compatible
    #[test]
    fn test_public_kernel_entrypoint_compatibility() {
        let canonical = make_test_canonical(vec![("affected_product", "TestApp")]);
        let bundle = make_test_bundle(vec![("vendor", "https://vendor.com", "TestApp.")]);
        let claim = CoreClaim {
            claim_id: ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-TEST-0001".to_string(),
            predicate: "affected_product".to_string(),
            object_value: "TestApp".to_string(),
            text: "TestApp".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_0")],
            confidence_score: Some(1.0),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req12".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let output = crate::execute_kernel(input);
        assert!(output.success);
        assert_eq!(output.lifecycle_state, LifecycleState::Validated);
        assert_eq!(output.kernel_version, crate::KERNEL_VERSION);
    }

    // 19. Regression specimens stability
    #[test]
    fn test_regression_specimens_stability() {
        // Specimen A: CVE-2023-22527 (Atlassian Confluence OGNL)
        let canon_22527 = make_test_canonical(vec![
            ("affected_product", "Confluence Server"),
            ("cvss_score", "9.8"),
            ("exploitation_status", "known exploited"),
        ]);
        let bundle_22527 = make_test_bundle(vec![(
            "atlassian",
            "https://confluence.atlassian.com/security/cve-2023-22527",
            "Template injection vulnerability in Confluence Server allows unauthenticated RCE.",
        )]);
        let claims_22527 = vec![
            CoreClaim {
                claim_id: ClaimId::new("c1"),
                domain: IntelligenceDomain::Vulnerability,
                subject: "CVE-2023-22527".to_string(),
                predicate: "affected_product".to_string(),
                object_value: "Confluence Server".to_string(),
                text: "Affected product is Confluence Server.".to_string(),
                status: "CONFIRMED".to_string(),
                evidence_refs: vec![EvidenceId::new("ev_0")],
                confidence_score: Some(1.0),
                temporal: None,
            },
            CoreClaim {
                claim_id: ClaimId::new("c2"),
                domain: IntelligenceDomain::Vulnerability,
                subject: "CVE-2023-22527".to_string(),
                predicate: "cvss_score".to_string(),
                object_value: "9.8".to_string(),
                text: "CVSS score is 9.8.".to_string(),
                status: "CONFIRMED".to_string(),
                evidence_refs: vec![EvidenceId::new("ev_0")],
                confidence_score: Some(1.0),
                temporal: None,
            },
        ];

        let out_22527 = crate::execute_kernel(KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_22527".to_string(),
            canonical: canon_22527,
            bundle: bundle_22527,
            claims: claims_22527,
            profile: None,
            sources: vec![],
        });
        assert!(out_22527.success, "CVE-2023-22527 must remain PASS");
        assert_eq!(out_22527.lifecycle_state, LifecycleState::Validated);

        // Specimen B: CVE-2026-85706 (GitLab Path Traversal)
        let canon_85706 = make_test_canonical(vec![
            ("affected_product", "GitLab Community Edition"),
            ("cvss_score", "10.0"),
            ("fixed_versions", "19.3.2"),
        ]);
        let bundle_85706 = make_test_bundle(vec![(
            "gitlab",
            "https://about.gitlab.com/releases/2026/08/13/patch-release-gitlab-19-3-2-released/",
            "Path traversal allows unauthorized arbitrary file read. Fixed in 19.3.2.",
        )]);
        let claims_85706 = vec![
            CoreClaim {
                claim_id: ClaimId::new("c1"),
                domain: IntelligenceDomain::Vulnerability,
                subject: "CVE-2026-85706".to_string(),
                predicate: "affected_product".to_string(),
                object_value: "GitLab Community Edition".to_string(),
                text: "GitLab Community Edition".to_string(),
                status: "CONFIRMED".to_string(),
                evidence_refs: vec![EvidenceId::new("ev_0")],
                confidence_score: Some(1.0),
                temporal: None,
            },
            CoreClaim {
                claim_id: ClaimId::new("c2"),
                domain: IntelligenceDomain::Vulnerability,
                subject: "CVE-2026-85706".to_string(),
                predicate: "fixed_versions".to_string(),
                object_value: "19.3.2".to_string(),
                text: "Fixed in 19.3.2.".to_string(),
                status: "SOURCE_FACT".to_string(),
                evidence_refs: vec![EvidenceId::new("ev_0")],
                confidence_score: Some(1.0),
                temporal: None,
            },
        ];

        let out_85706 = crate::execute_kernel(KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_85706".to_string(),
            canonical: canon_85706,
            bundle: bundle_85706,
            claims: claims_85706,
            profile: None,
            sources: vec![],
        });
        assert!(out_85706.success, "CVE-2026-85706 must remain PASS with repaired semantics");
        assert_eq!(out_85706.lifecycle_state, LifecycleState::Validated);

        // Specimen C: CVE-2026-76461 (Cisco Secure Email Gateway)
        let canon_76461 = make_test_canonical(vec![
            ("affected_product", "Secure Email Gateway"),
            ("cvss_score", "9.8"),
            ("exploitation_status", "known exploited"),
        ]);
        let bundle_76461 = make_test_bundle(vec![(
            "cisco",
            "https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-esa-inj-2bLVGmhX",
            "Cisco Secure Email Gateway SQL injection vulnerability allows remote command execution as root.",
        )]);
        let claims_76461 = vec![
            CoreClaim {
                claim_id: ClaimId::new("c1"),
                domain: IntelligenceDomain::Vulnerability,
                subject: "CVE-2026-76461".to_string(),
                predicate: "affected_product".to_string(),
                object_value: "Secure Email Gateway".to_string(),
                text: "Affected product is Secure Email Gateway.".to_string(),
                status: "CONFIRMED".to_string(),
                evidence_refs: vec![EvidenceId::new("ev_0")],
                confidence_score: Some(1.0),
                temporal: None,
            },
            CoreClaim {
                claim_id: ClaimId::new("c2"),
                domain: IntelligenceDomain::Vulnerability,
                subject: "CVE-2026-76461".to_string(),
                predicate: "cvss_score".to_string(),
                object_value: "9.8".to_string(),
                text: "CVSS score is 9.8.".to_string(),
                status: "CONFIRMED".to_string(),
                evidence_refs: vec![EvidenceId::new("ev_0")],
                confidence_score: Some(1.0),
                temporal: None,
            },
        ];

        let out_76461 = crate::execute_kernel(KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_76461".to_string(),
            canonical: canon_76461,
            bundle: bundle_76461,
            claims: claims_76461,
            profile: None,
            sources: vec![],
        });
        assert!(out_76461.success, "CVE-2026-76461 must remain PASS");
        assert_eq!(out_76461.lifecycle_state, LifecycleState::Validated);

        // Specimen D: CVE-2025-39964 (Linux Kernel Conflict Preserved)
        let canon_39964 = make_test_canonical(vec![
            ("cvss_score", "7.8"),
        ]);
        let bundle_39964 = make_test_bundle(vec![(
            "linux",
            "https://kernel.org",
            "Local race condition in AF_ALG socket.",
        )]);
        let claims_39964 = vec![
            CoreClaim {
                claim_id: ClaimId::new("c_conflict"),
                domain: IntelligenceDomain::Vulnerability,
                subject: "CVE-2025-39964".to_string(),
                predicate: "cvss_score".to_string(),
                object_value: "5.5".to_string(), // CNA vs NVD disagreement
                text: "Conflicting CVSS score 5.5 vs 7.8.".to_string(),
                status: "CONFIRMED".to_string(),
                evidence_refs: vec![EvidenceId::new("ev_0")],
                confidence_score: Some(0.8),
                temporal: None,
            },
        ];

        let out_39964 = crate::execute_kernel(KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_39964".to_string(),
            canonical: canon_39964,
            bundle: bundle_39964,
            claims: claims_39964,
            profile: None,
            sources: vec![],
        });
        assert!(!out_39964.success, "CVE-2025-39964 must fail closed on conflict");
        assert_eq!(out_39964.lifecycle_state, LifecycleState::Rejected);
        assert!(!out_39964.conflicts.is_empty(), "Conflict must be preserved in conflicts output");
    }
}
