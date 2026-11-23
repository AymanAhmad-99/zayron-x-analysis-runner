//! Cross-Domain, Golden Parity, and Property Tests for ZAYRON-X Intelligence Kernel.
#![forbid(unsafe_code)]

#[cfg(test)]
mod tests {
    use kernel_core::entities::resolve_canonical_entity;
    use kernel_core::execute_kernel;
    use kernel_types::*;
    use std::collections::BTreeMap;

    fn make_canonical_vuln(id: &str, cvss: &str) -> CanonicalRecord {
        let mut facts = BTreeMap::new();
        facts.insert(
            "severity".to_string(),
            CanonicalFact {
                fact_id: FactId::new("f1"),
                fact_type: CanonicalFactType::Severity,
                name: "severity".to_string(),
                value: serde_json::json!("CRITICAL"),
                source_id: SourceId::new("nvd"),
                is_immutable: true,
                temporal: None,
            },
        );
        facts.insert(
            "cvss_score".to_string(),
            CanonicalFact {
                fact_id: FactId::new("f2"),
                fact_type: CanonicalFactType::Metric,
                name: "cvss_score".to_string(),
                value: serde_json::json!(cvss),
                source_id: SourceId::new("nvd"),
                is_immutable: true,
                temporal: None,
            },
        );
        facts.insert(
            "affected_target".to_string(),
            CanonicalFact {
                fact_id: FactId::new("f3"),
                fact_type: CanonicalFactType::AffectedTarget,
                name: "affected_target".to_string(),
                value: serde_json::json!("PAN-OS GlobalProtect"),
                source_id: SourceId::new("palo_alto"),
                is_immutable: true,
                temporal: None,
            },
        );
        facts.insert(
            "exploitation_status".to_string(),
            CanonicalFact {
                fact_id: FactId::new("f4"),
                fact_type: CanonicalFactType::ExploitationStatus,
                name: "exploitation_status".to_string(),
                value: serde_json::json!("KNOWN_EXPLOITED"),
                source_id: SourceId::new("cisa"),
                is_immutable: true,
                temporal: None,
            },
        );

        CanonicalRecord {
            object_id: ObjectId::new(id),
            domain: IntelligenceDomain::Vulnerability,
            primary_identifier: id.to_string(),
            aliases: vec!["CVE-2024-3400-Alias".to_string()],
            canonical_facts: facts,
            metadata: BTreeMap::new(),
        }
    }

    // 1. Real CVE-2024-3400 PAN-OS Regression (Zero GitLab Contamination)
    #[test]
    fn test_cve_2024_3400_pan_os_zero_gitlab_contamination() {
        let canonical = make_canonical_vuln("CVE-2024-3400", "10.0");
        let bundle = EvidenceBundle {
            object_id: ObjectId::new("CVE-2024-3400"),
            domain: IntelligenceDomain::Vulnerability,
            items: vec![EvidenceItem {
                evidence_id: EvidenceId::new("ev_pan_01"),
                object_id: ObjectId::new("CVE-2024-3400"),
                source_id: SourceId::new("palo_alto"),
                source_type: AuthorityTier::PrimaryVendor,
                url: "https://security.paloaltonetworks.com/CVE-2024-3400".to_string(),
                statement: "Command injection in PAN-OS GlobalProtect allows unauthenticated remote code execution as root.".to_string(),
                temporal: None,
                provenance_hash: None,
            }],
        };

        // Attempt GitLab-contaminated claim injection
        let contaminated_claim = CoreClaim {
            claim_id: ClaimId::new("c_gitlab_contam"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-2024-3400".to_string(),
            predicate: "mechanism".to_string(),
            object_value: "path traversal".to_string(),
            text: "Arbitrary file disclosure via GitLab repository commits API using relative traversal ../.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_pan_01")],
            confidence_score: Some(0.85),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_cve_pan".to_string(),
            canonical,
            bundle,
            claims: vec![contaminated_claim],
            profile: None,
            sources: vec![],
        };

        let output = execute_kernel(input);
        assert!(!output.success, "Contaminated claim must fail closed");
        assert_eq!(output.lifecycle_state, LifecycleState::Rejected);
        assert!(
            output
                .errors
                .iter()
                .any(|e| e.contains("ungrounded external entities"))
        );
    }

    // 2. Canonical Conflict Gate (Canonical Truth ALWAYS Wins)
    #[test]
    fn test_canonical_fact_conflict_gate() {
        let canonical = make_canonical_vuln("CVE-2024-3400", "10.0");
        let bundle = EvidenceBundle {
            object_id: ObjectId::new("CVE-2024-3400"),
            domain: IntelligenceDomain::Vulnerability,
            items: vec![EvidenceItem {
                evidence_id: EvidenceId::new("ev_pan_01"),
                object_id: ObjectId::new("CVE-2024-3400"),
                source_id: SourceId::new("palo_alto"),
                source_type: AuthorityTier::PrimaryVendor,
                url: "https://security.paloaltonetworks.com/CVE-2024-3400".to_string(),
                statement: "Command injection in PAN-OS GlobalProtect.".to_string(),
                temporal: None,
                provenance_hash: None,
            }],
        };

        let ai_cvss_claim = CoreClaim {
            claim_id: ClaimId::new("c_cvss_hallucination"),
            domain: IntelligenceDomain::Vulnerability,
            subject: "CVE-2024-3400".to_string(),
            predicate: "cvss_score".to_string(),
            object_value: "8.5".to_string(), // AI claims 8.5
            text: "CVSS score is 8.5.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_pan_01")],
            confidence_score: Some(0.9),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_cvss_conflict".to_string(),
            canonical,
            bundle,
            claims: vec![ai_cvss_claim],
            profile: None,
            sources: vec![],
        };

        let output = execute_kernel(input);
        assert!(!output.success);
        assert!(
            output
                .conflicts
                .iter()
                .any(|c| c.contains("contradicted canonical truth"))
        );
    }

    // 3. Cross-Domain: Threat Actor
    #[test]
    fn test_threat_actor_domain() {
        let mut facts = BTreeMap::new();
        facts.insert(
            "identifier".to_string(),
            CanonicalFact {
                fact_id: FactId::new("f1"),
                fact_type: CanonicalFactType::Identity,
                name: "identifier".to_string(),
                value: serde_json::json!("APT28"),
                source_id: SourceId::new("cisa"),
                is_immutable: true,
                temporal: None,
            },
        );

        let canonical = CanonicalRecord {
            object_id: ObjectId::new("actor_apt28"),
            domain: IntelligenceDomain::ThreatActor,
            primary_identifier: "APT28".to_string(),
            aliases: vec!["Fancy Bear".to_string()],
            canonical_facts: facts,
            metadata: BTreeMap::new(),
        };

        let bundle = EvidenceBundle {
            object_id: ObjectId::new("actor_apt28"),
            domain: IntelligenceDomain::ThreatActor,
            items: vec![EvidenceItem {
                evidence_id: EvidenceId::new("ev_apt28_01"),
                object_id: ObjectId::new("actor_apt28"),
                source_id: SourceId::new("cisa"),
                source_type: AuthorityTier::GovernmentRegulator,
                url: "https://cisa.gov/apt28".to_string(),
                statement:
                    "APT28 deployed credential harvesting malware against government targets."
                        .to_string(),
                temporal: None,
                provenance_hash: None,
            }],
        };

        let claim = CoreClaim {
            claim_id: ClaimId::new("c_apt28"),
            domain: IntelligenceDomain::ThreatActor,
            subject: "APT28".to_string(),
            predicate: "capabilities".to_string(),
            object_value: "credential harvesting".to_string(),
            text: "Adversary deployed credential harvesting operations.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_apt28_01")],
            confidence_score: Some(0.95),
            temporal: None,
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_actor".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: None,
            sources: vec![],
        };

        let output = execute_kernel(input);
        assert!(output.success);
        assert_eq!(output.lifecycle_state, LifecycleState::Validated);
    }

    // 4. Future Synthetic Domain: "orbital_intrusion" (Architectural Invariant Proof)
    #[test]
    fn test_future_synthetic_domain_orbital_intrusion() {
        let future_domain = IntelligenceDomain::Custom("orbital_intrusion".to_string());
        let mut facts = BTreeMap::new();
        facts.insert(
            "constellation".to_string(),
            CanonicalFact {
                fact_id: FactId::new("f_sat_01"),
                fact_type: CanonicalFactType::Identity,
                name: "constellation".to_string(),
                value: serde_json::json!("AegisSat-9"),
                source_id: SourceId::new("ground_station_telemetry"),
                is_immutable: true,
                temporal: None,
            },
        );

        let canonical = CanonicalRecord {
            object_id: ObjectId::new("orb_99"),
            domain: future_domain.clone(),
            primary_identifier: "AegisSat-9".to_string(),
            aliases: vec![],
            canonical_facts: facts,
            metadata: BTreeMap::new(),
        };

        let bundle = EvidenceBundle {
            object_id: ObjectId::new("orb_99"),
            domain: future_domain.clone(),
            items: vec![EvidenceItem {
                evidence_id: EvidenceId::new("ev_downlink_01"),
                object_id: ObjectId::new("orb_99"),
                source_id: SourceId::new("ground_station"),
                source_type: AuthorityTier::FirstPartyTelemetry,
                url: "https://space.telemetry/downlink/99".to_string(),
                statement: "Telemetry confirms unauthorized uplink commands sent to satellite payload transponder.".to_string(),
                temporal: None,
                provenance_hash: None,
            }],
        };

        let claim = CoreClaim {
            claim_id: ClaimId::new("c_uplink"),
            domain: future_domain.clone(),
            subject: "AegisSat-9".to_string(),
            predicate: "attack_vector".to_string(),
            object_value: "unauthorized uplink".to_string(),
            text: "Unauthorized uplink commands intercepted on payload transponder.".to_string(),
            status: "CONFIRMED".to_string(),
            evidence_refs: vec![EvidenceId::new("ev_downlink_01")],
            confidence_score: Some(0.99),
            temporal: None,
        };

        let profile = AnalysisProfile {
            domain: future_domain,
            fields: vec![ProfileField {
                name: "constellation".to_string(),
                fact_type: CanonicalFactType::Identity,
                required: true,
                allow_inference: false,
                default_fallback: None,
            }],
            allowed_relationships: vec![RelationshipType::Targets],
            critical_facts: vec!["constellation".to_string()],
        };

        let input = KernelInput {
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "req_future_domain".to_string(),
            canonical,
            bundle,
            claims: vec![claim],
            profile: Some(profile),
            sources: vec![],
        };

        // Must succeed without ANY modifications to Rust kernel code
        let output = execute_kernel(input);
        assert!(
            output.success,
            "Kernel must validate future domain without code modifications"
        );
        assert_eq!(output.lifecycle_state, LifecycleState::Validated);
    }

    // 5. Entity Alias Resolution States
    #[test]
    fn test_entity_alias_resolution_states() {
        let record = CanonicalRecord {
            object_id: ObjectId::new("actor_cozy"),
            domain: IntelligenceDomain::ThreatActor,
            primary_identifier: "APT29".to_string(),
            aliases: vec!["Cozy Bear".to_string(), "NOBELIUM".to_string()],
            canonical_facts: BTreeMap::new(),
            metadata: BTreeMap::new(),
        };
        let records = vec![record];

        // Exact match
        let res_exact = resolve_canonical_entity("APT29", &records);
        assert_eq!(res_exact.status, ResolutionStatus::Resolved);
        assert_eq!(res_exact.canonical_id, Some(ObjectId::new("actor_cozy")));

        // Declared Alias Match
        let res_alias = resolve_canonical_entity("Cozy Bear", &records);
        assert_eq!(res_alias.status, ResolutionStatus::Resolved);
        assert_eq!(res_alias.matched_alias, Some("Cozy Bear".to_string()));

        // Unknown entity
        let res_unknown = resolve_canonical_entity("GhostPhantom_999", &records);
        assert_eq!(res_unknown.status, ResolutionStatus::Unresolved);
    }
}
