import { describe, it, expect, beforeAll } from "bun:test";
import { getRustKernelInstance, type RustKernelInstance } from "../rustKernelAdapter";

describe("ZAYRON-X Rust Deterministic Intelligence Kernel — Parity & Verification Suite", () => {
  let kernel: RustKernelInstance;

  beforeAll(async () => {
    kernel = await getRustKernelInstance();
    expect(kernel).toBeDefined();
  });

  // 1. CVE-2024-3400 Real Contamination Regression Gate
  it("Gate 1: CVE-2024-3400 strictly rejects GitLab cross-CVE contamination and ungrounded entities", () => {
    const input = {
      schema_version: "v1.0",
      request_id: "req_cve_pan_001",
      object_id: "CVE-2024-3400",
      canonical: {
        object_id: "CVE-2024-3400",
        domain: "VULNERABILITY",
        primary_identifier: "CVE-2024-3400",
        aliases: ["PAN-OS Command Injection", "GlobalProtect Zero-Day"],
        canonical_facts: {
          affected_product: {
            fact_id: "f_pan_01",
            fact_type: "AFFECTED_TARGET",
            name: "affected_product",
            value: "PAN-OS GlobalProtect",
            source_id: "palo_alto",
            is_immutable: true,
          },
          cvss_score: {
            fact_id: "f_pan_02",
            fact_type: "METRIC",
            name: "cvss_score",
            value: "10.0",
            source_id: "nvd",
            is_immutable: true,
          },
        },
        metadata: {},
      },
      bundle: {
        object_id: "CVE-2024-3400",
        domain: "VULNERABILITY",
        items: [
          {
            evidence_id: "ev_pan_01",
            object_id: "CVE-2024-3400",
            source_id: "palo_alto",
            source_type: "PRIMARY_VENDOR",
            url: "https://security.paloaltonetworks.com/CVE-2024-3400",
            statement:
              "A command injection vulnerability in PAN-OS GlobalProtect gateway allows an unauthenticated attacker to execute arbitrary code with root privileges.",
            temporal: null,
            provenance_hash: null,
          },
        ],
      },
      claims: [
        {
          claim_id: "c_gitlab_contam",
          domain: "VULNERABILITY",
          subject: "CVE-2024-3400",
          predicate: "mechanism",
          object_value: "path traversal",
          text: "Arbitrary file disclosure via GitLab repository commits API using relative traversal ../.",
          status: "CONFIRMED",
          evidence_refs: ["ev_pan_01"],
          confidence_score: 0.85,
          temporal: null,
        },
      ],
      profile: null,
      sources: [],
    };

    const result = kernel.execute(input);
    expect(result.success).toBe(false);
    expect(result.lifecycle_state).toBe("REJECTED");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e: string) => e.includes("ungrounded external entities") || e.includes("gitlab"))).toBe(true);
  });

  // 2. Canonical Fact Precedence Gate
  it("Gate 2: Canonical facts always defeat conflicting AI claims (Canonical Conflict Gate)", () => {
    const input = {
      schema_version: "v1.0",
      request_id: "req_cvss_gate_001",
      object_id: "CVE-2024-3400",
      canonical: {
        object_id: "CVE-2024-3400",
        domain: "VULNERABILITY",
        primary_identifier: "CVE-2024-3400",
        aliases: [],
        canonical_facts: {
          cvss_score: {
            fact_id: "f_nvd_cvss",
            fact_type: "METRIC",
            name: "cvss_score",
            value: "10.0",
            source_id: "nvd",
            is_immutable: true,
          },
        },
        metadata: {},
      },
      bundle: {
        object_id: "CVE-2024-3400",
        domain: "VULNERABILITY",
        items: [
          {
            evidence_id: "ev_01",
            object_id: "CVE-2024-3400",
            source_id: "nvd",
            source_type: "GOVERNMENT_REGULATOR",
            url: "https://nvd.nist.gov/vuln/detail/CVE-2024-3400",
            statement: "CVSS v3 base score of 10.0 Critical.",
            temporal: null,
            provenance_hash: null,
          },
        ],
      },
      claims: [
        {
          claim_id: "c_ai_cvss",
          domain: "VULNERABILITY",
          subject: "CVE-2024-3400",
          predicate: "cvss_score",
          object_value: "8.5",
          text: "The model assessed that CVSS score is 8.5 high severity.",
          status: "ASSESSED",
          evidence_refs: ["ev_01"],
          confidence_score: 0.9,
          temporal: null,
        },
      ],
      profile: null,
      sources: [],
    };

    const result = kernel.execute(input);
    expect(result.success).toBe(false);
    expect(result.lifecycle_state).toBe("REJECTED");
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts.some((c: string) => c.includes("contradicted canonical truth") || c.includes("cvss_score"))).toBe(true);
  });

  // 3. Cross-Domain Verification (Malware & Threat Actor)
  it("Gate 3: Cross-Domain Verification (Malware and Threat Actor domains)", () => {
    const actorInput = {
      schema_version: "v1.0",
      request_id: "req_actor_001",
      object_id: "APT28",
      canonical: {
        object_id: "APT28",
        domain: "THREAT_ACTOR",
        primary_identifier: "APT28",
        aliases: ["Fancy Bear", "Sednit", "Sofacy"],
        canonical_facts: {},
        metadata: {},
      },
      bundle: {
        object_id: "APT28",
        domain: "THREAT_ACTOR",
        items: [
          {
            evidence_id: "ev_cisa_01",
            object_id: "APT28",
            source_id: "cisa",
            source_type: "GOVERNMENT_REGULATOR",
            url: "https://cisa.gov/apt28",
            statement: "APT28 deployed credential harvesting malware against government targets.",
            temporal: null,
            provenance_hash: null,
          },
        ],
      },
      claims: [
        {
          claim_id: "c_actor_01",
          domain: "THREAT_ACTOR",
          subject: "APT28",
          predicate: "uses",
          object_value: "credential harvesting malware",
          text: "APT28 deployed credential harvesting malware against government targets.",
          status: "CONFIRMED",
          evidence_refs: ["ev_cisa_01"],
          confidence_score: 0.95,
          temporal: null,
        },
      ],
      profile: {
        domain: "THREAT_ACTOR",
        fields: [],
        allowed_relationships: ["USES", "TARGETS", "ATTRIBUTED_TO"],
        critical_facts: [],
      },
      sources: [],
    };

    const actorResult = kernel.execute(actorInput);
    expect(actorResult.success).toBe(true);
    expect(actorResult.lifecycle_state).toBe("VALIDATED");
    expect(actorResult.claim_validations[0].status).toBe("SUPPORTED");
  });

  // 4. Future Synthetic Domain Gate ("orbital_intrusion")
  it("Gate 4: Future synthetic domain ('orbital_intrusion') validates with ZERO kernel code changes", () => {
    const futureInput = {
      schema_version: "v1.0",
      request_id: "req_orbital_99",
      object_id: "SAT-INTRUSION-2029-X",
      canonical: {
        object_id: "SAT-INTRUSION-2029-X",
        domain: "FUTURE_DOMAIN",
        primary_identifier: "SAT-INTRUSION-2029-X",
        aliases: ["Constellation Transponder Takeover"],
        canonical_facts: {},
        metadata: {},
      },
      bundle: {
        object_id: "SAT-INTRUSION-2029-X",
        domain: "FUTURE_DOMAIN",
        items: [
          {
            evidence_id: "ev_orb_01",
            object_id: "SAT-INTRUSION-2029-X",
            source_id: "space_defense",
            source_type: "GOVERNMENT_REGULATOR",
            url: "https://space-defense.example.org/sat-telemetry",
            statement: "Unauthorized downlink command transmission observed targeting orbital payload transponder.",
            temporal: null,
            provenance_hash: null,
          },
        ],
      },
      claims: [
        {
          claim_id: "c_orb_01",
          domain: "FUTURE_DOMAIN",
          subject: "SAT-INTRUSION-2029-X",
          predicate: "targets",
          object_value: "orbital payload transponder",
          text: "Unauthorized downlink command transmission observed targeting orbital payload transponder.",
          status: "CONFIRMED",
          evidence_refs: ["ev_orb_01"],
          confidence_score: 0.99,
          temporal: null,
        },
      ],
      profile: {
        domain: "FUTURE_DOMAIN",
        fields: [],
        allowed_relationships: ["TARGETS", "COMMUNICATES_WITH"],
        critical_facts: [],
      },
      sources: [],
    };

    const futureResult = kernel.execute(futureInput);
    expect(futureResult.success).toBe(true);
    expect(futureResult.lifecycle_state).toBe("VALIDATED");
    expect(futureResult.claim_validations[0].status).toBe("SUPPORTED");
  });

  // 5. Fail-Closed Error Model
  it("Gate 5: Malformed JSON or schema violation returns fail-closed REJECTED lifecycle state with typed errors", () => {
    const malformed = {
      schema_version: "v999.0",
      request_id: "req_bad",
      object_id: "BAD_OBJ",
      canonical: null,
    };

    const result = kernel.execute(malformed);
    expect(result.success).toBe(false);
    expect(result.lifecycle_state).toBe("REJECTED");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
