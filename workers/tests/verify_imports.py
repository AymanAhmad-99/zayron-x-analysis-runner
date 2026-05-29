"""Verify the full import chain for the workers package."""
import sys
sys.path.insert(0, ".")

# 1. Shared models
from shared.models import ArticleInsert, ArticleSITREP, validate_iocs
print("OK: shared.models imports")

# 2. Config
from workers.config import (
    GEMINI_API_KEY, ANTI_FUD_BANNED_PHRASES, SECTOR_WEIGHTS, validate_config
)
print(f"OK: config - {len(ANTI_FUD_BANNED_PHRASES)} banned phrases, {len(SECTOR_WEIGHTS)} sectors")

# 3. Contracts
from workers.contracts.inter_agent import (
    HarvestPayload, ValidatedIntel, ComplianceReport,
    FinancialAssessment, ExecutiveSITREP
)
print("OK: contracts - all 5 inter-agent models")

# 4. Agent modules
from workers.agents.harvester import AGENT_CONFIG as H
from workers.agents.validator import AGENT_CONFIG as V
from workers.agents.compliance import AGENT_CONFIG as C
from workers.agents.quant import AGENT_CONFIG as Q
from workers.agents.weaver import AGENT_CONFIG as W
print(f"OK: agents - {H['role']}, {V['role']}, {C['role']}, {Q['role']}, {W['role']}")

# 5. Persistence
from workers.persistence import claim_pending_feeds, persist_sitrep, trigger_revalidation
print("OK: persistence")

# 6. Anti-FUD gate test
from workers.agents.weaver import scan_anti_fud
test_clean = "The adversary deployed ransomware targeting healthcare systems."
test_dirty = "This is an unprecedented threat that is a wake-up call."
clean_violations = scan_anti_fud(test_clean)
dirty_violations = scan_anti_fud(test_dirty)
print(f"OK: Anti-FUD gate - clean text: {len(clean_violations)} violations, dirty text: {len(dirty_violations)} violations")
assert len(clean_violations) == 0, "Clean text should pass"
assert len(dirty_violations) >= 2, "Dirty text should fail"

# 7. FBR computation test
from workers.agents.quant import compute_fbr
fbr = compute_fbr(9.1, ["Healthcare", "Financial Services"], ComplianceReport(gdpr_fine_exposure_eur=20_000_000))
print(f"OK: FBR computation - score={fbr} (CVSS=9.1, Healthcare, EUR20M fine)")

# 8. Contract validation test
payload = HarvestPayload(
    raw_text="Test CVE-2025-12345 vulnerability in Cisco ASA",
    translated_text="Test CVE-2025-12345 vulnerability in Cisco ASA",
    source_channel="test",
    preliminary_category="Vulnerability Research",
    has_cve_reference=True,
)
print(f"OK: HarvestPayload - category={payload.preliminary_category}")

print("\n=== FULL IMPORT CHAIN VERIFIED ===")
