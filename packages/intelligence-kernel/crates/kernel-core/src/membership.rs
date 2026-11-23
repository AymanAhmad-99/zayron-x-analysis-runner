//! Domain-agnostic evidence membership validator.
//! ZERO hardcoded vendor, malware, actor, or CVE blocklists.
#![forbid(unsafe_code)]

use crate::facts::check_canonical_fact_integrity;
use kernel_types::{
    CanonicalRecord, ClaimValidationOutput, ClaimVerificationStatus, CoreClaim, EvidenceBundle,
};
use std::collections::{BTreeSet, HashSet};

/// Standard stopwords to avoid penalizing common grammatical words
fn is_stopword(word: &str) -> bool {
    matches!(
        word,
        "about"
            | "above"
            | "across"
            | "after"
            | "against"
            | "along"
            | "among"
            | "around"
            | "because"
            | "before"
            | "behind"
            | "below"
            | "beneath"
            | "beside"
            | "between"
            | "beyond"
            | "during"
            | "inside"
            | "into"
            | "near"
            | "outside"
            | "over"
            | "through"
            | "throughout"
            | "under"
            | "underneath"
            | "upon"
            | "with"
            | "within"
            | "without"
            | "which"
            | "where"
            | "while"
            | "this"
            | "that"
            | "these"
            | "those"
            | "there"
            | "their"
            | "theirs"
            | "other"
            | "another"
            | "such"
            | "more"
            | "most"
            | "some"
            | "any"
            | "each"
            | "every"
            | "either"
            | "neither"
            | "both"
            | "many"
            | "much"
            | "several"
            | "only"
            | "same"
            | "have"
            | "having"
            | "been"
            | "will"
            | "would"
            | "shall"
            | "should"
            | "could"
            | "might"
            | "must"
            | "allow"
            | "allows"
            | "allowed"
            | "enables"
            | "result"
            | "resulting"
            | "creates"
            | "leading"
            | "system"
            | "software"
            | "component"
            | "components"
            | "application"
            | "service"
            | "interface"
            | "affect"
            | "affects"
            | "affected"
            | "impact"
            | "impacts"
            | "impacted"
            | "target"
            | "targets"
            | "targeted"
            | "cause"
            | "causes"
            | "caused"
            | "relate"
            | "relates"
            | "related"
            | "include"
            | "includes"
            | "included"
    )
}

fn is_common_technical_token(term: &str) -> bool {
    matches!(
        term,
        "vulnerability"
            | "execution"
            | "injection"
            | "privilege"
            | "privileges"
            | "remote"
            | "network"
            | "security"
            | "attacker"
            | "adversary"
            | "exploit"
            | "exploitation"
            | "authentication"
            | "unauthenticated"
            | "authenticated"
            | "operator"
            | "credentials"
            | "compromise"
            | "integrity"
            | "confidentiality"
            | "availability"
            | "advisory"
            | "update"
            | "updates"
            | "patch"
            | "hotfix"
            | "firmware"
            | "version"
            | "versions"
            | "payload"
            | "command"
            | "commands"
            | "arbitrary"
            | "buffer"
            | "overflow"
            | "traversal"
            | "vector"
            | "endpoint"
            | "endpoints"
            | "server"
            | "servers"
            | "client"
            | "clients"
            | "gateway"
            | "gateways"
            | "device"
            | "devices"
            | "appliance"
            | "appliances"
            | "firewall"
            | "firewalls"
            | "router"
            | "routers"
            | "switch"
            | "kernel"
            | "driver"
            | "memory"
            | "socket"
            | "malware"
            | "trojan"
            | "ransomware"
            | "backdoor"
            | "loader"
            | "dropper"
            | "stealer"
            | "beacon"
            | "implant"
            | "c2"
            | "telemetry"
            | "campaign"
            | "actor"
            | "threat"
            | "hash"
            | "domain"
            | "ip"
            | "ipv4"
            | "ipv6"
            | "url"
            | "sha256"
            | "md5"
    )
}

pub fn validate_claim_against_evidence(
    claim: &CoreClaim,
    canonical: &CanonicalRecord,
    bundle: &EvidenceBundle,
) -> ClaimValidationOutput {
    let mut reasons = Vec::new();
    let mut matched_canonical_fields = Vec::new();
    let mut matched_evidence_ids = Vec::new();

    // 1. Fact Integrity Check (AI vs Canonical Truth)
    let fact_check = check_canonical_fact_integrity(claim, canonical);
    if fact_check.has_conflict {
        reasons.push(format!(
            "Canonical Fact Conflict: Claim value '{}' contradicts canonical fact '{}' with value '{}'.",
            claim.object_value,
            fact_check.conflicting_fact_name.unwrap_or_default(),
            fact_check.canonical_value.unwrap_or_default()
        ));
        return ClaimValidationOutput {
            claim_id: claim.claim_id.clone(),
            status: ClaimVerificationStatus::Contradicted,
            reasons,
            matched_canonical_fields,
            matched_evidence_ids,
        };
    }

    // 2. Subject Resolution
    let norm_subject = claim.subject.trim().to_lowercase();
    let canon_id = canonical.primary_identifier.trim().to_lowercase();
    let is_subject_canonical = norm_subject == canon_id
        || canonical
            .aliases
            .iter()
            .any(|a| a.trim().to_lowercase() == norm_subject)
        || norm_subject.contains(&canon_id);

    if is_subject_canonical {
        matched_canonical_fields.push("primary_identifier".to_string());
    }

    // 3. Evidence References Check
    let available_evidence_ids: HashSet<_> = bundle.items.iter().map(|e| &e.evidence_id).collect();
    if claim.evidence_refs.is_empty() {
        if claim.status == "CONFIRMED" {
            reasons.push(
                "Claim marked CONFIRMED but provides no supporting evidence references."
                    .to_string(),
            );
            return ClaimValidationOutput {
                claim_id: claim.claim_id.clone(),
                status: ClaimVerificationStatus::Unsupported,
                reasons,
                matched_canonical_fields,
                matched_evidence_ids,
            };
        }
    } else {
        for ref_id in &claim.evidence_refs {
            if available_evidence_ids.contains(ref_id) {
                matched_evidence_ids.push(ref_id.clone());
            } else {
                reasons.push(format!(
                    "Claim references nonexistent evidence ID: '{}'.",
                    ref_id
                ));
            }
        }
        if matched_evidence_ids.is_empty() {
            reasons
                .push("None of the supplied evidence references exist in the bundle.".to_string());
            return ClaimValidationOutput {
                claim_id: claim.claim_id.clone(),
                status: ClaimVerificationStatus::Unsupported,
                reasons,
                matched_canonical_fields,
                matched_evidence_ids,
            };
        }
    }

    // 4. Evidence Corpus Lexical Containment (ZERO Hardcoded blocklists)
    let mut authoritative_corpus = String::new();
    authoritative_corpus.push_str(&canonical.primary_identifier.to_lowercase());
    authoritative_corpus.push(' ');
    authoritative_corpus.push_str(canonical.object_id.as_str().to_lowercase().as_str());
    authoritative_corpus.push(' ');
    for alias in &canonical.aliases {
        authoritative_corpus.push_str(&alias.to_lowercase());
        authoritative_corpus.push(' ');
    }
    for fact in canonical.canonical_facts.values() {
        authoritative_corpus.push_str(&fact.value.to_string().to_lowercase());
        authoritative_corpus.push(' ');
    }
    for item in &bundle.items {
        authoritative_corpus.push_str(&item.statement.to_lowercase());
        authoritative_corpus.push(' ');
    }

    // Extract significant candidate tokens (alphanumeric, length >= 4)
    let candidate_words: BTreeSet<String> = claim
        .text
        .split(|c: char| !c.is_alphanumeric() && c != '-' && c != '_')
        .filter(|w| w.len() >= 4)
        .map(|w| w.to_lowercase())
        .filter(|w| !is_stopword(w))
        .collect();

    let mut unsupported_terms = Vec::new();
    for word in &candidate_words {
        if !authoritative_corpus.contains(word) && !is_common_technical_token(word) {
            unsupported_terms.push(word.clone());
        }
    }

    if unsupported_terms.len() > 2 {
        reasons.push(format!(
            "Claim introduces ungrounded external entities or terminology: [{}]",
            unsupported_terms.join(", ")
        ));
        return ClaimValidationOutput {
            claim_id: claim.claim_id.clone(),
            status: ClaimVerificationStatus::Unsupported,
            reasons,
            matched_canonical_fields,
            matched_evidence_ids,
        };
    } else if !unsupported_terms.is_empty() {
        reasons.push(format!(
            "Claim partially supported, but contains unverified peripheral terms: [{}]",
            unsupported_terms.join(", ")
        ));
        return ClaimValidationOutput {
            claim_id: claim.claim_id.clone(),
            status: ClaimVerificationStatus::PartiallySupported,
            reasons,
            matched_canonical_fields,
            matched_evidence_ids,
        };
    }

    ClaimValidationOutput {
        claim_id: claim.claim_id.clone(),
        status: ClaimVerificationStatus::Supported,
        reasons,
        matched_canonical_fields,
        matched_evidence_ids,
    }
}
