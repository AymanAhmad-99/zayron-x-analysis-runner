//! Source Independence & Conflict Preservation Engine.
//! Syndicated sources sharing an independence_group do not count as independent corroboration.
#![forbid(unsafe_code)]

use kernel_types::{ConflictStatus, SourceDefinition, SourceId};

#[derive(Debug, Clone, PartialEq)]
pub struct ConflictRecord {
    pub conflict_id: String,
    pub subject: String,
    pub predicate: String,
    pub conflicting_values: Vec<String>,
    pub status: ConflictStatus,
    pub resolution_notes: String,
}

pub fn are_sources_independent(
    s1_id: &SourceId,
    s2_id: &SourceId,
    registry: &[SourceDefinition],
) -> bool {
    if s1_id == s2_id {
        return false;
    }

    let s1 = registry.iter().find(|s| &s.source_id == s1_id);
    let s2 = registry.iter().find(|s| &s.source_id == s2_id);

    match (s1, s2) {
        (Some(src1), Some(src2)) => {
            if let (Some(grp1), Some(grp2)) = (&src1.independence_group, &src2.independence_group)
                && grp1 == grp2
            {
                return false; // Syndicated / Same ownership group
            }
            true
        }
        _ => false,
    }
}
