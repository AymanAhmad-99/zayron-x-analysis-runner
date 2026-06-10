"""
shared/models/fbr_calculator.py — Centralized Financial Blast Radius (FBR) Engine

Single Source of Truth for all FBR computations across the ZAYRON-X architecture.
Implements Douglas Hubbard's quantitative assessment rules and CVSS v4.0 exponential scaling.
"""

import math

class FBRCalculator:
    # --- Sector Weights ---
    SECTOR_WEIGHTS = {
        "Healthcare": 1.8,
        "Financial Services": 1.6,
        "Energy": 1.5,
        "Government": 1.5,
        "Defense": 1.5,
        "Critical Infrastructure": 1.5,
        "Technology": 1.2,
        "Telecommunications": 1.3,
        "Manufacturing": 1.2,
        "Retail": 1.1,
        "Education": 1.0,
        "Other": 1.0,
    }

    # --- Geographic Exposure ---
    GEO_EXPOSURE = {
        "EU": 1.4,
        "US": 1.2,
        "UK": 1.3,
        "APAC": 1.1,
        "Other": 1.0,
    }

    # Base cost per compromised record/node
    BASE_BREACH_COST_PER_RECORD = 165.0

    @classmethod
    def get_sector_weight(cls, sector: str) -> float:
        return cls.SECTOR_WEIGHTS.get(sector, 1.0)

    @classmethod
    def get_geo_exposure(cls, geo: str) -> float:
        return cls.GEO_EXPOSURE.get(geo, 1.0)

    @classmethod
    def infer_sector(cls, product: str) -> str:
        product_lower = product.lower()

        sector_keywords = {
            "Healthcare": ["medical", "health", "hospital", "pharma", "dicom", "hl7", "epic", "cerner"],
            "Financial Services": ["banking", "payment", "swift", "financial", "atm", "pos", "trading"],
            "Energy": ["scada", "ics", "plc", "energy", "power", "grid", "oil", "gas", "siemens"],
            "Government": ["government", "federal", "dod", "military", "nsa", "cisa"],
            "Technology": ["cisco", "microsoft", "google", "apple", "oracle", "sap", "vmware",
                           "fortinet", "palo alto", "juniper", "adobe", "linux", "apache",
                           "nginx", "wordpress", "drupal", "jenkins"],
            "Telecommunications": ["telecom", "5g", "lte", "voip", "sip", "ericsson", "nokia"],
            "Manufacturing": ["manufacturing", "industrial", "automation", "rockwell"],
        }

        for sector, keywords in sector_keywords.items():
            for kw in keywords:
                if kw in product_lower:
                    return sector

        return "Technology"  # Default

    @classmethod
    def calculate_impact(
        cls,
        base_cvss: float,
        sector_weight: float,
        geo_factor: float,
        compliance_penalty_ceiling: float = 0.0,
    ) -> dict:
        """
        Calculates the FBR score and assigns risk tiers.
        """
        cvss_factor = (base_cvss / 10.0) ** 2
        fbr_usd = (cls.BASE_BREACH_COST_PER_RECORD * 10000 * cvss_factor * sector_weight * geo_factor)
        fbr_usd += compliance_penalty_ceiling

        if fbr_usd > 10_000_000:
            risk_tier = "Critical"
            loss_frequency = "High"
            is_premium = True
        elif fbr_usd > 2_000_000:
            risk_tier = "High"
            loss_frequency = "Medium"
            is_premium = True
        elif fbr_usd > 500_000:
            risk_tier = "Medium"
            loss_frequency = "Low"
            is_premium = False
        else:
            risk_tier = "Low"
            loss_frequency = "Low"
            is_premium = False

        return {
            "fbr_score_usd": round(fbr_usd, 2),
            "loss_frequency": loss_frequency,
            "risk_tier": risk_tier,
            "is_premium_tier_data": is_premium,
        }
