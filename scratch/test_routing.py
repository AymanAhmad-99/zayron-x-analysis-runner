import asyncio
import sys
import os
import aiohttp

# Ensure project root is in path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from workers.contracts.inter_agent import ExecutiveSITREP
from workers.persistence import persist_sitrep

# Make sure env is loaded
from dotenv import load_dotenv
load_dotenv(override=True)

# Generate dummy text with more than 200 words to pass Pydantic validation
long_dummy_text = " ".join(["word"] * 250)

async def main():
    print("Starting persistence routing test...")
    async with aiohttp.ClientSession() as session:
        import time
        suffix = str(int(time.time()))
        vuln_sitrep = ExecutiveSITREP(
            title=f"CVE-2026-99999 Critical Remote Code Execution in Zayron Core {suffix}",
            executive_summary="A critical vulnerability has been disclosed in Zayron Core.",
            content="This is a detailed analysis of the RCE vulnerability. " + long_dummy_text,
            category="vulnerabilities",
            severity="Critical",
            cvss_v4_score=9.8,
            affected_sectors=["Technology"],
            iocs=[],
            yara_rules=[],
            sigma_rules=[],
            anti_fud_passed=True
        )
        success_vuln = await persist_sitrep(session, vuln_sitrep, "source_content_vuln_" + suffix, "test_channel")
        print(f"Vulnerability persistence success: {success_vuln}")

        # Test 2: Threat Intel Routing
        print("\n--- Test 2: Threat Intel Routing ---")
        threat_sitrep = ExecutiveSITREP(
            title=f"APT41 Active Exfiltration Targeting Financial Services Sector {suffix}",
            executive_summary="APT41 is active again targeting banking infrastructure.",
            content="Detailed report on APT41 campaigns and their target alignment. " + long_dummy_text,
            category="threat_intel",
            severity="High",
            cvss_v4_score=8.5,
            affected_sectors=["Financial Services"],
            iocs=[{"type": "IPv4", "value": "198.51.100.42", "confidence": "High"}],
            yara_rules=["rule APT41_Exfil { condition: true }"],
            sigma_rules=["title: APT41 Exfiltration Detected"],
            anti_fud_passed=True
        )
        success_threat = await persist_sitrep(session, threat_sitrep, "source_content_threat_" + suffix, "test_channel")
        print(f"Threat persistence success: {success_threat}")

if __name__ == "__main__":
    asyncio.run(main())
