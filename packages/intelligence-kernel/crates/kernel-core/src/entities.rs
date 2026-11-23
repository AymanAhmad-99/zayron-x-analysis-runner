//! Deterministic Entity Resolution Engine
//! Evaluates candidate entity strings into explicit states:
//! RESOLVED, POSSIBLE, AMBIGUOUS, UNRESOLVED.
#![forbid(unsafe_code)]

use kernel_types::{CanonicalRecord, ObjectId, ResolutionStatus};

#[derive(Debug, Clone, PartialEq)]
pub struct EntityResolutionOutput {
    pub status: ResolutionStatus,
    pub canonical_id: Option<ObjectId>,
    pub matched_alias: Option<String>,
    pub confidence: f64,
    pub reason: String,
}

pub fn resolve_canonical_entity(
    candidate: &str,
    records: &[CanonicalRecord],
) -> EntityResolutionOutput {
    let norm = candidate.trim().to_lowercase();
    if norm.is_empty() {
        return EntityResolutionOutput {
            status: ResolutionStatus::Unresolved,
            canonical_id: None,
            matched_alias: None,
            confidence: 0.0,
            reason: "Empty candidate identifier.".to_string(),
        };
    }

    // 1. Exact Primary Identifier Match
    let exact_matches: Vec<_> = records
        .iter()
        .filter(|r| {
            r.object_id.as_str().to_lowercase() == norm
                || r.primary_identifier.to_lowercase() == norm
        })
        .collect();

    if exact_matches.len() == 1 {
        return EntityResolutionOutput {
            status: ResolutionStatus::Resolved,
            canonical_id: Some(exact_matches[0].object_id.clone()),
            matched_alias: Some(exact_matches[0].primary_identifier.clone()),
            confidence: 1.0,
            reason: "Exact match with canonical identifier.".to_string(),
        };
    } else if exact_matches.len() > 1 {
        return EntityResolutionOutput {
            status: ResolutionStatus::Ambiguous,
            canonical_id: None,
            matched_alias: None,
            confidence: 0.5,
            reason: format!(
                "Multiple canonical records match primary identifier '{}'.",
                candidate
            ),
        };
    }

    // 2. Declared Canonical Alias Match
    let mut alias_matches = Vec::new();
    for r in records {
        for alias in &r.aliases {
            if alias.trim().to_lowercase() == norm {
                alias_matches.push((r, alias.clone()));
            }
        }
    }

    if alias_matches.len() == 1 {
        return EntityResolutionOutput {
            status: ResolutionStatus::Resolved,
            canonical_id: Some(alias_matches[0].0.object_id.clone()),
            matched_alias: Some(alias_matches[0].1.clone()),
            confidence: 0.95,
            reason: format!("Matched declared canonical alias '{}'.", alias_matches[0].1),
        };
    } else if alias_matches.len() > 1 {
        return EntityResolutionOutput {
            status: ResolutionStatus::Ambiguous,
            canonical_id: None,
            matched_alias: None,
            confidence: 0.4,
            reason: format!(
                "Candidate alias matches multiple distinct canonical entities: [{}].",
                alias_matches
                    .iter()
                    .map(|m| m.0.primary_identifier.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
        };
    }

    // 3. Substring Lexical Containment (Without full alias declaration -> Possible)
    let partial_matches: Vec<_> = records
        .iter()
        .filter(|r| {
            norm.contains(&r.primary_identifier.to_lowercase())
                || r.primary_identifier.to_lowercase().contains(&norm)
        })
        .collect();

    if partial_matches.len() == 1 && norm.len() >= 4 {
        return EntityResolutionOutput {
            status: ResolutionStatus::Possible,
            canonical_id: Some(partial_matches[0].object_id.clone()),
            matched_alias: Some(partial_matches[0].primary_identifier.clone()),
            confidence: 0.6,
            reason: "Partial lexical containment; requires additional corroborating evidence."
                .to_string(),
        };
    }

    EntityResolutionOutput {
        status: ResolutionStatus::Unresolved,
        canonical_id: None,
        matched_alias: None,
        confidence: 0.0,
        reason: format!(
            "Candidate '{}' could not be resolved to any canonical entity or declared alias.",
            candidate
        ),
    }
}
