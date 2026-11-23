//! Generic Semantic Consistency & Contradiction Engine.
//! Validates typed cross-claim contradictions without hardcoding domain-specific products.
#![forbid(unsafe_code)]

use kernel_types::CoreClaim;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConsistencyCheckResult {
    pub is_valid: bool,
    pub conflicts: Vec<String>,
}

pub fn check_semantic_consistency(claims: &[CoreClaim]) -> ConsistencyCheckResult {
    let mut conflicts = Vec::new();

    let mut all_claim_text = String::new();
    for c in claims {
        all_claim_text.push_str(&c.predicate.to_lowercase());
        all_claim_text.push(' ');
        all_claim_text.push_str(&c.text.to_lowercase());
        all_claim_text.push(' ');
        all_claim_text.push_str(&c.object_value.to_lowercase());
        all_claim_text.push('\n');
    }

    // Condition A: Authentication Requirement Contradiction
    let asserts_unauth = all_claim_text.contains("unauthenticated")
        || all_claim_text.contains("no credentials required")
        || all_claim_text.contains("pre-auth")
        || all_claim_text.contains("zero privilege");

    let asserts_auth = all_claim_text.contains("valid credentials required")
        || all_claim_text.contains("authenticated user")
        || all_claim_text.contains("authenticated session")
        || all_claim_text.contains("administrative credentials")
        || all_claim_text.contains("operator privileges required");

    if asserts_unauth && asserts_auth {
        conflicts.push("Semantic Contradiction: Analysis simultaneously asserts unauthenticated access and mandatory authenticated credentials.".to_string());
    }

    // Condition B: Exploitation State Contradiction
    let asserts_exploited = all_claim_text.contains("known exploited")
        || all_claim_text.contains("active exploitation")
        || all_claim_text.contains("observed in the wild")
        || all_claim_text.contains("in-the-wild exploitation");

    let asserts_no_exploited = all_claim_text.contains("no evidence of exploitation")
        || all_claim_text.contains("no in-the-wild exploitation evidence")
        || all_claim_text.contains("unexploited in the wild");

    if asserts_exploited && asserts_no_exploited {
        conflicts.push("Semantic Contradiction: Analysis simultaneously asserts confirmed active exploitation and absence of exploitation evidence.".to_string());
    }

    ConsistencyCheckResult {
        is_valid: conflicts.is_empty(),
        conflicts,
    }
}
