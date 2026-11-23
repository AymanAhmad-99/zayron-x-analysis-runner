//! ZAYRON-X Deterministic Intelligence Kernel Core
#![forbid(unsafe_code)]

pub mod conflicts;
pub mod consistency;
pub mod entities;
pub mod facts;
pub mod membership;
pub mod normalization;
pub mod proof;
pub mod state_machine;
pub mod temporal;

pub use proof::{
    authorize, ground, issue_pass, verify, ClaimState, Derivation, EvidenceSet, GroundedReport,
    PassCertificate, ProofClaimId, PublishabilityError, PublishabilityProof, PublishableReport,
    SemanticallyVerifiedReport, UnverifiedReport, ValidationProof, VerificationError,
};

use kernel_types::{ClaimVerificationStatus, KernelInput, KernelOutput, LifecycleState};

pub const KERNEL_VERSION: &str = "1.0.0-deterministic";

/// Primary Kernel Entrypoint: Evaluates candidate input deterministically.
///
/// STRUCTURAL INVARIANT: `success: true` and `LifecycleState::Validated` CANNOT
/// be assigned unless a proof-carrying `PassCertificate` has been issued through
/// the monotonic typestate chain `Unverified -> Grounded -> SemanticallyVerified -> Publishable -> PassCertificate`.
pub fn execute_kernel(input: KernelInput) -> KernelOutput {
    let mut warnings = Vec::new();
    let mut unknowns = Vec::new();
    let mut limitations = Vec::new();

    // 1. Generate standard claim validation telemetry
    let mut claim_validations = Vec::with_capacity(input.claims.len());
    for claim in &input.claims {
        let validation =
            membership::validate_claim_against_evidence(claim, &input.canonical, &input.bundle);
        if validation.status == ClaimVerificationStatus::Unsupported {
            unknowns.push(format!("{}: UNKNOWN", claim.predicate));
        } else if validation.status == ClaimVerificationStatus::PartiallySupported {
            warnings.push(format!(
                "Claim '{}' partially supported: {}",
                claim.claim_id,
                validation.reasons.join("; ")
            ));
        }
        claim_validations.push(validation);
    }

    limitations.push("Analysis strictly bound to verified evidence references.".to_string());
    limitations
        .push("Canonical facts take immutable precedence over generated claims.".to_string());

    // 2. Execute Typestate Verification Pipeline
    let unverified = proof::UnverifiedReport::new(input.clone());

    let certificate_result = proof::ground(unverified)
        .map_err(proof::PipelineError::Grounding)
        .and_then(|g| proof::verify(g).map_err(proof::PipelineError::Verification))
        .and_then(|v| proof::authorize(v).map_err(proof::PipelineError::Publishability))
        .map(proof::issue_pass);

    let (success, lifecycle_state, errors, conflicts) = match certificate_result {
        Ok(cert) => {
            // PROOF CERTIFICATE SECURED: input satisfied all ground truth and consistency invariants.
            let _ = cert;
            (true, LifecycleState::Validated, Vec::new(), Vec::new())
        }
        Err(err) => {
            let mut errs = Vec::new();
            let mut confs = Vec::new();

            match err {
                proof::PipelineError::Grounding(g_err) => match g_err {
                    proof::GroundingError::MissingCriticalFact(critical) => {
                        errs.push(format!(
                            "Missing critical intelligence fact for domain: '{}'.",
                            critical
                        ));
                    }
                    proof::GroundingError::UngroundedEntity(entity) => {
                        errs.push(format!(
                            "Analysis contains ungrounded external entities or claims: {}",
                            entity
                        ));
                    }
                    proof::GroundingError::MalformedEvidence(msg) => {
                        errs.push(format!("Malformed evidence bundle: {}", msg));
                    }
                },
                proof::PipelineError::Verification(v_err) => match v_err {
                    proof::VerificationError::CanonicalConflict {
                        field,
                        canonical,
                        claimed,
                    } => {
                        let msg = format!(
                            "Canonical Fact Conflict: Claim value '{}' contradicts canonical fact '{}' with value '{}'.",
                            claimed, field, canonical
                        );
                        confs.push(format!("Claim contradicted canonical truth in field '{}'.", field));
                        errs.push(msg);
                    }
                    proof::VerificationError::CrossLayerInconsistency { field, reason } => {
                        let msg = format!("Cross-Layer Inconsistency in '{}': {}", field, reason);
                        errs.push(msg);
                    }
                    proof::VerificationError::UnsupportedPromotion { domain, detail } => {
                        let msg = format!("Unsupported Promotion in {}: {}", domain, detail);
                        errs.push(msg);
                    }
                    proof::VerificationError::SemanticContradiction(reason) => {
                        confs.push(reason.clone());
                        errs.push(reason);
                    }
                    proof::VerificationError::TemporalInvalid(reason) => {
                        errs.push(format!("Temporal Scope Invalid: {}", reason));
                    }
                    proof::VerificationError::UnreconciledConflict { field, detail } => {
                        let msg = format!("Unreconciled Conflict in '{}': {}", field, detail);
                        confs.push(msg.clone());
                        errs.push(msg);
                    }
                    proof::VerificationError::ClaimUnsupported { claim_id, detail } => {
                        errs.push(format!("Unsupported claim '{}': {}", claim_id, detail));
                    }
                },
                proof::PipelineError::Publishability(p_err) => match p_err {
                    proof::PublishabilityError::UnresolvedConflicts(conf_list) => {
                        confs.extend(conf_list.clone());
                        errs.extend(conf_list);
                    }
                    proof::PublishabilityError::UnsupportedClaims(unsupp_list) => {
                        errs.extend(unsupp_list);
                    }
                    proof::PublishabilityError::StateTransitionForbidden { from, to } => {
                        errs.push(format!(
                            "Illegal lifecycle transition from {:?} to {:?}",
                            from, to
                        ));
                    }
                },
            }

            (false, LifecycleState::Rejected, errs, confs)
        }
    };

    KernelOutput {
        kernel_version: KERNEL_VERSION.to_string(),
        schema_version: input.schema_version,
        request_id: input.request_id,
        object_id: input.canonical.object_id,
        success,
        lifecycle_state,
        claim_validations,
        errors,
        warnings,
        conflicts,
        unknowns,
        limitations,
    }
}
