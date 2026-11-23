//! Canonical Fact Integrity Checker
//! Canonical truth ALWAYS wins. If AI or candidate facts contradict canonical truth,
//! the result is CONTRADICTED.
#![forbid(unsafe_code)]

use kernel_types::{CanonicalRecord, CoreClaim};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactIntegrityCheck {
    pub has_conflict: bool,
    pub conflicting_fact_name: Option<String>,
    pub canonical_value: Option<String>,
}

pub fn check_canonical_fact_integrity(
    claim: &CoreClaim,
    canonical: &CanonicalRecord,
) -> FactIntegrityCheck {
    let norm_predicate = claim.predicate.trim().to_lowercase();

    for (name, fact) in &canonical.canonical_facts {
        let fact_name_lower = name.trim().to_lowercase();
        if norm_predicate == fact_name_lower || norm_predicate.contains(&fact_name_lower) {
            let canon_str = fact
                .value
                .to_string()
                .trim()
                .trim_matches('"')
                .to_lowercase();
            let claim_str = claim.object_value.trim().trim_matches('"').to_lowercase();

            // Direct inequality check on discrete values
            if !canon_str.is_empty()
                && !claim_str.is_empty()
                && canon_str != claim_str
                && !claim_str.contains(&canon_str)
            {
                return FactIntegrityCheck {
                    has_conflict: true,
                    conflicting_fact_name: Some(name.clone()),
                    canonical_value: Some(canon_str),
                };
            }
        }
    }

    FactIntegrityCheck {
        has_conflict: false,
        conflicting_fact_name: None,
        canonical_value: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use kernel_types::{
        CanonicalFact, CanonicalFactType, FactId, IntelligenceDomain, ObjectId, SourceId,
    };
    use std::collections::BTreeMap;

    #[test]
    fn test_canonical_fact_conflict() {
        let mut facts = BTreeMap::new();
        facts.insert(
            "cvss_score".to_string(),
            CanonicalFact {
                fact_id: FactId::new("f1"),
                fact_type: CanonicalFactType::Metric,
                name: "cvss_score".to_string(),
                value: serde_json::json!("10.0"),
                source_id: SourceId::new("nvd"),
                is_immutable: true,
                temporal: None,
            },
        );

        let canonical = CanonicalRecord {
            object_id: ObjectId::new("cve-2024-3400"),
            domain: IntelligenceDomain::Vulnerability,
            primary_identifier: "CVE-2024-3400".to_string(),
            aliases: vec![],
            canonical_facts: facts,
            metadata: BTreeMap::new(),
        };

        let ai_claim = CoreClaim {
            claim_id: kernel_types::ClaimId::new("c1"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-2024-3400".to_string(),
            predicate: "cvss_score".to_string(),
            object_value: "8.5".to_string(), // AI hallucinates 8.5
            text: "CVSS score is assessed as 8.5 high severity.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![],
            confidence_score: Some(0.9),
            temporal: None,
        };

        let result = check_canonical_fact_integrity(&ai_claim, &canonical);
        assert!(result.has_conflict);
        assert_eq!(result.conflicting_fact_name, Some("cvss_score".to_string()));
        assert_eq!(result.canonical_value, Some("10.0".to_string()));
    }
}
