import sys
import os
import json
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, ".")

from workers.omni_crew import MultiAgentSwarmOrchestrator, AgentTrace, AgentMessage
from workers.contracts.inter_agent import ExecutiveSITREP


class TestMultiAgentSwarm(unittest.IsolatedAsyncioTestCase):
    async def test_swarm_orchestrator_flow(self):
        # Mock GeminiClient's generate method
        mock_client = AsyncMock()
        
        # We will mock the five generate calls
        # 1. Ingestion Agent (Harvester) -> HarvestPayload json
        ingestion_resp = json.dumps({
            "detected_language": "ru",
            "translated_text": "Critical zero-day exploit leaked targeting ExxonMobil Active Directory services.",
            "preliminary_category": "APT Activity",
            "extracted_entities": ["ExxonMobil", "Active Directory"],
            "has_cve_reference": False,
            "has_ioc_indicators": True,
            "word_count": 10
        })
        
        # 2. Validator Agent -> ValidatedIntel json
        validator_resp = json.dumps({
            "iocs": [{"type": "IPv4", "value": "185.220.101.44", "context": "C2 server", "confidence": "High"}],
            "mitre_ttps": ["T1190 — Exploit Public-Facing Application"],
            "cve_ids": [],
            "affected_products": ["Active Directory"],
            "affected_sectors": ["Energy"],
            "source_reliability_grade": "A",
            "cross_ref_score": 0.9,
            "severity": "Critical",
            "cvss_v4_score": 9.8,
            "cvss_v4_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
            "validation_notes": "Highly credible threat intelligence feed."
        })
        
        # 3. Enrichment Agent -> ComplianceReport json
        compliance_resp = json.dumps({
            "iso_27001_controls": ["A.12.6.1"],
            "nist_csf_functions": ["DETECT — DE.CM-01"],
            "gdpr_articles": ["Article 32"],
            "gdpr_fine_exposure_eur": 10000000,
            "nis2_applicable": True,
            "nis2_classification": "Essential entity — Energy sector",
            "pci_dss_requirements": [],
            "hipaa_applicable": False,
            "notification_obligations": ["GDPR Art.33: 72h"],
            "compliance_risk_level": "Critical",
            "regulatory_summary": "Extremely high NIS2 and GDPR compliance exposures."
        })
        
        # 4. Enrichment Agent -> FinancialAssessment json
        quant_resp = json.dumps({
            "breach_cost_low": 5000000,
            "breach_cost_high": 15000000,
            "cost_justification": "Energy sector targeting with AD control loss.",
            "sector_multiplier": 1.5,
            "geo_multiplier": 1.2,
            "regulatory_fine_ceiling": 10000000,
            "affected_org_estimate": 1,
            "financial_exposure_summary": "$5.0M - $15.0M estimated risk",
            "mitigation_roi": "350% ROI on AD credential protection"
        })
        
        # 5. Enrichment Agent -> ExecutiveSITREP json (Weaver)
        long_content = "<h2>KEY TAKEAWAYS</h2><ul><li>Critical Active Directory compromise threat.</li></ul><h2>Executive Brief</h2><p>Logic/Mind: ExxonMobil AD controllers targeted.</p><h2>TECHNICAL DEEP-DIVE</h2><p>AD Golden Ticket exploit chain.</p> " + " ".join(["detailed CTI analysis details regarding ExxonMobil intrusion vectors and security posture alignment"] * 30)
        weaver_resp = json.dumps({
            "title": "APT Attack on ExxonMobil AD Controllers",
            "executive_summary": "<p>A critical zero-day exploit targeting ExxonMobil Active Directory services was identified.</p>",
            "teaser_text": "Critical exploit leaked targeting ExxonMobil Active Directory services.",
            "is_public_teaser": True,
            "premium_payload": long_content,
            "category": "threat_intel",
            "severity": "Critical",
            "mitre_attack_ttps": ["T1190"],
            "yara_rules": [],
            "sigma_rules": [],
            "cloudflare_waf_rules": "",
            "snort_signatures": [],
            "iocs": [{"type": "IPv4", "value": "185.220.101.44", "context": "C2 server", "confidence": "High"}],
            "iso_27001_controls": ["A.12.6.1"],
            "nist_csf_functions": ["DETECT — DE.CM-01"],
            "gdpr_implications": "GDPR fine exposure range",
            "financial_exposure": "$5M - $15M",
            "regulatory_risk": "NIS2 critical classification",
            "mitigation_impact": "350% ROI",
            "affected_sectors": ["Energy"],
            "cvss_v4_score": 9.8,
            "cvss_v4_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
            "yara_rule": "rule auto {}",
            "ai_image_prompt": "cybersecurity AD target",
            "assessment_25_point": {}
        })

        mock_client.generate.side_effect = [
            (ingestion_resp, 100, 50),
            (validator_resp, 120, 60),
            (compliance_resp, 150, 75),
            (quant_resp, 110, 55),
            (weaver_resp, 300, 150),
        ]

        # Patch quota check to bypass redis REST call during test
        with patch('workers.omni_crew.quota_get_today', return_value=0), \
             patch('workers.omni_crew.quota_increment', return_value=1):
             
            orchestrator = MultiAgentSwarmOrchestrator(mock_client)
            sitrep, traces = await orchestrator.process_feed(
                "Critical threat targeting ExxonMobil AD leaked.",
                "telegram_chan"
            )

            # Check return type
            self.assertIsInstance(sitrep, ExecutiveSITREP)
            self.assertEqual(sitrep.title, "APT Attack on ExxonMobil AD Controllers")
            self.assertEqual(sitrep.severity, "Critical")

            # Check trace counts and contents
            self.assertEqual(len(traces), 5)
            self.assertEqual(traces[0].agent_name, "IngestionAgent")
            self.assertEqual(traces[1].agent_name, "ValidatorAgent")
            self.assertEqual(traces[2].agent_name, "EnrichmentAgent:Compliance")
            self.assertEqual(traces[3].agent_name, "EnrichmentAgent:Quant")
            self.assertEqual(traces[4].agent_name, "EnrichmentAgent:Weaver")

            # Ensure traceability fields are populated
            for t in traces:
                self.assertTrue(t.parsed_output_ok)
                self.assertIsNotNone(t.prompt_sent)
                self.assertIsNotNone(t.raw_response)
                self.assertGreater(t.tokens_prompt, 0)
                self.assertGreater(t.tokens_completion, 0)


if __name__ == '__main__':
    unittest.main()
