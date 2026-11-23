//! Temporal Validation & Inversion Detection Engine.
#![forbid(unsafe_code)]

use kernel_types::TemporalScope;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TemporalCheckResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
}

pub fn validate_temporal_scope(scope: &TemporalScope) -> TemporalCheckResult {
    let mut errors = Vec::new();

    if let (Some(from), Some(until)) = (&scope.valid_from, &scope.valid_until) {
        // String comparison for ISO-8601 YYYY-MM-DD or full timestamps is lexicographically valid
        if from > until {
            errors.push(format!(
                "Temporal Inversion: valid_from ('{}') is later than valid_until ('{}').",
                from, until
            ));
        }
    }

    TemporalCheckResult {
        is_valid: errors.is_empty(),
        errors,
    }
}
