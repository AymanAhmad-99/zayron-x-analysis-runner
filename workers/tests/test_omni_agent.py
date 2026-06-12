import sys
import os
import json
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, ".")

from workers.omni_crew import process_feed_omni, OmniAgentResponse, DomainClassification
from workers.contracts.inter_agent import ExecutiveSITREP


class TestOmniAgentFlow(unittest.IsolatedAsyncioTestCase):
    async def test_process_feed_omni_success(self):
        # Mock GeminiClient's generate method
        mock_client = AsyncMock()
        
        # Build a mock OmniAgentResponse payload
        omni_response_data = {
            "classification": "Vulnerability",
            "translation": "Critical remote code execution vulnerability in Apache HTTP Server.",
            "threat_actor_profile": "Inferred threat actor targeting web server instances.",
            "infrastructure_impact": "Direct memory corruption and remote command execution on standard web ports.",
            "regulatory_compliance": ["ISO 27001 Control A.12.6.1", "GDPR Article 32"],
            "financial_blast_radius": 7.8,
            "html_sitrep": "<h2>KEY TAKEAWAYS</h2><ul><li>Critical Apache vulnerability.</li></ul><h2>Executive Brief</h2><p>Logic/Mind: Apache remote command execution vectors.</p><h2>TECHNICAL DEEP-DIVE</h2><p>Memory overflow exploits.</p> " + " ".join(["detailed CTI analysis details regarding Apache vulnerability"] * 30),
            "raw_iocs": [
                {"type": "IPv4", "value": "185.220.101.44", "context": "C2 Server", "confidence": "High"},
                {"type": "IPv4", "value": "127.0.0.1", "context": "Loopback (should be dropped)", "confidence": "Low"},
                {"type": "Domain", "value": "malicious-c2.com", "context": "Malicious Domain", "confidence": "High"}
            ],
            "title": "Critical RCE in Apache HTTP Server",
            "executive_summary": "<p>A critical remote code execution vulnerability in Apache HTTP Server was identified and analyzed.</p>",
            "severity": "Critical",
            "mitre_attack_ttps": ["T1190"],
            "yara_rules": ["rule apache_rce { condition: true }"],
            "sigma_rules": [],
            "snort_signatures": [],
            "iso_27001_controls": ["A.12.6.1"],
            "nist_csf_functions": ["PROTECT - PR.IP-01"],
            "gdpr_implications": "High probability of data exposure liability.",
            "financial_exposure": "$1.5M - $4.0M",
            "regulatory_risk": "NIS2 essential entity classification.",
            "mitigation_impact": "Immediate patch installation.",
            "assessment_25_point": {
                "cve_vulnerability_mapping": "CVE-2026-99999",
                "cvss_vector_analysis": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
                "exploit_complexity_score": "Low exploit complexity",
                "affected_software_hardware": "Apache HTTP Server 2.4.x",
                "infrastructure_dependency_depth": "Critical web proxy dependency",
                "network_traversal_mechanics": "Direct TCP/80 command execution",
                "threat_origin_forensics": "Anonymous security disclosures",
                "iso_27001_compliance": "Control A.12.6.1 violation",
                "nist_csf_alignment": "PROTECT function mapping",
                "gdpr_liability_check": "Article 32 obligations triggered",
                "regulatory_fine_exposure": "Expected fine under Article 83 ceilings",
                "nis2_impact_classification": "Energy sector essential entity",
                "compliance_risk_level": "High compliance exposure",
                "yara_signature_readiness": "Custom YARA rules compiled",
                "sigma_log_patterns": "Syslog detection query",
                "cloudflare_waf_rules": "Block query parameters rule",
                "mitigation_playbook_difficulty": "Standard package upgrade path",
                "hunting_queries": "Search for system command execution",
                "insider_behavioral_remediation": "N/A - External vulnerability",
                "financial_blast_radius": "$1.5M exposure",
                "downtime_cost_exposure": "$250,000 per hour downtime",
                "breach_cost_exposure": "$2.0M average breach cost",
                "sector_financial_multiplier": "1.2 sector weight",
                "mitigation_roi_percentage": "380% ROI avoiding breach",
                "insurance_impact": "Premium rate adjustments expected"
            },
            "affected_sectors": ["Technology"],
            "cvss_v4_score": 9.8,
            "cvss_v4_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
            "source_reliability_grade": "B"
        }

        mock_client.generate.return_value = (json.dumps(omni_response_data), 120, 60)

        # Patch quota check to bypass redis REST call during test
        with patch('workers.omni_crew.quota_get_today', return_value=0), \
             patch('workers.omni_crew.quota_increment', return_value=1):
             
            sitrep, p, c = await process_feed_omni(
                mock_client,
                "Apache RCE vulnerability found in production",
                "rss_vuln_feed"
            )

            # Assert return type & content
            self.assertIsInstance(sitrep, ExecutiveSITREP)
            self.assertEqual(sitrep.title, "Critical RCE in Apache HTTP Server")
            self.assertEqual(sitrep.severity, "Critical")
            self.assertEqual(sitrep.fbr_score, 7.8)
            self.assertEqual(p, 120)
            self.assertEqual(c, 60)

            # Assert IoC validation gate: 127.0.0.1 is loopback and should be dropped!
            # 185.220.101.44 (valid IPv4) and malicious-c2.com (valid Domain) should be preserved.
            self.assertEqual(len(sitrep.iocs), 2)
            self.assertEqual(sitrep.iocs[0]["value"], "185.220.101.44")
            self.assertEqual(sitrep.iocs[1]["value"], "malicious-c2.com")


if __name__ == '__main__':
    unittest.main()
