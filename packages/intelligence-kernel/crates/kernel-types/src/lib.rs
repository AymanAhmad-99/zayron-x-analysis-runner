//! Strongly typed domain-agnostic contracts for ZAYRON-X Deterministic Intelligence Kernel.
#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt;

/// Strong ID wrappers to prevent cross-object confusion
macro_rules! define_id {
    ($name:ident) => {
        #[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
        pub struct $name(pub String);

        impl $name {
            pub fn new(s: impl Into<String>) -> Self {
                Self(s.into())
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{}", self.0)
            }
        }

        impl From<&str> for $name {
            fn from(s: &str) -> Self {
                Self(s.to_string())
            }
        }

        impl From<String> for $name {
            fn from(s: String) -> Self {
                Self(s)
            }
        }
    };
}

define_id!(ObjectId);
define_id!(EvidenceId);
define_id!(ClaimId);
define_id!(SourceId);
define_id!(EntityId);
define_id!(FactId);
define_id!(RelationshipId);
define_id!(PolicyVersion);
define_id!(SchemaVersion);
define_id!(CveId);
define_id!(FieldId);

/// Explicit source roles for evidence attribution
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SourceRole {
    TechnicalAuthority,
    CvssAuthority,
    ExploitationAuthority,
    CpeAuthority,
    TaxonomyAuthority,
    SupplementarySource,
}

/// Closed set of supported intelligence domains (extensible via domain profile declarations)
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IntelligenceDomain {
    Vulnerability,
    Malware,
    Ransomware,
    Exploit,
    ThreatActor,
    Campaign,
    Incident,
    Infrastructure,
    Ioc,
    Tool,
    Technique,
    #[serde(untagged)]
    Custom(String),
}

/// Verification status of an analytical claim
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ClaimVerificationStatus {
    Supported,
    PartiallySupported,
    Unsupported,
    Contradicted,
    Ambiguous,
    Unknown,
}

/// Authority Tier classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuthorityTier {
    PrimaryVendor,
    GovernmentRegulator,
    AuthoritativeCatalog,
    FirstPartyTelemetry,
    TrustedResearch,
    SecondaryMedia,
    UnverifiedCommunity,
}

/// Canonical Fact Type classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CanonicalFactType {
    Identity,
    Classification,
    Severity,
    Metric,
    AffectedTarget,
    FixTarget,
    ExploitationStatus,
    Attribution,
    Temporal,
    Capability,
    Infrastructure,
    Indicator,
}

/// Typed STIX 2.1 compatible relationships
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RelationshipType {
    Affects,
    Exploits,
    Uses,
    Deploys,
    Targets,
    Delivers,
    HostedOn,
    CommunicatesWith,
    AttributedTo,
    ObservedIn,
    MitigatedBy,
    RelatedTo,
}

/// Entity resolution states
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResolutionStatus {
    Resolved,
    Possible,
    Ambiguous,
    Unresolved,
}

/// Conflict resolution status
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConflictStatus {
    Resolved,
    Unresolved,
    Contested,
    Superseded,
}

/// Lifecycle state machine for intelligence artifacts
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LifecycleState {
    Ingested,
    Normalized,
    Correlated,
    Analyzed,
    Validating,
    Validated,
    Governed,
    Publishable,
    Published,
    Superseded,
    Rejected,
}

/// Explicit temporal scope with ISO-8601 timestamps
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TemporalScope {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid_from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid_until: Option<String>,
    pub assessment_time: String,
}

/// A single immutable canonical fact
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CanonicalFact {
    pub fact_id: FactId,
    pub fact_type: CanonicalFactType,
    pub name: String,
    pub value: serde_json::Value,
    pub source_id: SourceId,
    pub is_immutable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temporal: Option<TemporalScope>,
}

/// Immutable Canonical Record (Deterministic ground truth anchor)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CanonicalRecord {
    pub object_id: ObjectId,
    pub domain: IntelligenceDomain,
    pub primary_identifier: String,
    pub aliases: Vec<String>,
    pub canonical_facts: BTreeMap<String, CanonicalFact>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub metadata: BTreeMap<String, serde_json::Value>,
}

/// Single evidence item
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EvidenceItem {
    pub evidence_id: EvidenceId,
    pub object_id: ObjectId,
    pub source_id: SourceId,
    pub source_type: AuthorityTier,
    pub url: String,
    pub statement: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temporal: Option<TemporalScope>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provenance_hash: Option<String>,
}

/// Evidence Bundle representing authoritative source corpus
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EvidenceBundle {
    pub object_id: ObjectId,
    pub domain: IntelligenceDomain,
    pub items: Vec<EvidenceItem>,
}

/// Structured analytical claim
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CoreClaim {
    pub claim_id: ClaimId,
    pub domain: IntelligenceDomain,
    pub subject: String,
    pub predicate: String,
    pub object_value: String,
    pub text: String,
    pub status: String, // e.g. CONFIRMED, ASSESSED
    pub evidence_refs: Vec<EvidenceId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temporal: Option<TemporalScope>,
}

/// Explicit domain profile declaration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProfileField {
    pub name: String,
    pub fact_type: CanonicalFactType,
    pub required: bool,
    pub allow_inference: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_fallback: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisProfile {
    pub domain: IntelligenceDomain,
    pub fields: Vec<ProfileField>,
    pub allowed_relationships: Vec<RelationshipType>,
    pub critical_facts: Vec<String>,
}

/// Source metadata definition
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SourceDefinition {
    pub source_id: SourceId,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    pub authority_tier: AuthorityTier,
    pub supported_domains: Vec<IntelligenceDomain>,
    pub supported_fact_types: Vec<CanonicalFactType>,
    pub trust_score: f64,
    pub is_authoritative: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub independence_group: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub admiralty_reliability: Option<char>,
}

/// Strongly typed claim verification output
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ClaimValidationOutput {
    pub claim_id: ClaimId,
    pub status: ClaimVerificationStatus,
    pub reasons: Vec<String>,
    pub matched_canonical_fields: Vec<String>,
    pub matched_evidence_ids: Vec<EvidenceId>,
}

/// Full Kernel Input DTO
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KernelInput {
    pub schema_version: SchemaVersion,
    pub request_id: String,
    pub canonical: CanonicalRecord,
    pub bundle: EvidenceBundle,
    pub claims: Vec<CoreClaim>,
    #[serde(default)]
    pub profile: Option<AnalysisProfile>,
    #[serde(default)]
    pub sources: Vec<SourceDefinition>,
}

/// Full Kernel Output DTO
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KernelOutput {
    pub kernel_version: String,
    pub schema_version: SchemaVersion,
    pub request_id: String,
    pub object_id: ObjectId,
    pub success: bool,
    pub lifecycle_state: LifecycleState,
    pub claim_validations: Vec<ClaimValidationOutput>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub conflicts: Vec<String>,
    pub unknowns: Vec<String>,
    pub limitations: Vec<String>,
}
