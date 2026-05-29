"""
workers/config.py — ZAYRON-X Multi-Agent Configuration

Centralized environment loading, model selection, and token budget enforcement.
All agents read configuration from this module exclusively.
"""

from __future__ import annotations

import os
import sys

# ---------------------------------------------------------------------------
# Single Source of Truth Unified .env Loading
# ---------------------------------------------------------------------------

try:
    from dotenv import load_dotenv

    # Centralized Single Source of Truth loading:
    # Forcefully loads from the project root .env, or falls back to the working directory .env.
    _root_env = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.isfile(_root_env):
        load_dotenv(dotenv_path=_root_env, override=True)
    else:
        load_dotenv(dotenv_path=".env", override=True)
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Gemini API Configuration
# ---------------------------------------------------------------------------

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# Model assignments — Prioritize the highest-tier Gemini Pro models for heavy cognitive tasks
# to leverage the 1-year premium subscription context window (2M tokens).
# Default fallback is gemini-1.5-pro-latest (or models/gemini-1.5-pro-002) for complex reasoning,
# and gemini-1.5-flash-latest (or models/gemini-1.5-flash-002) for rapid, low-weight parsing.
GEMINI_PRO_MODEL: str = os.getenv("GEMINI_PRO_MODEL", "gemini-1.5-pro-latest")
GEMINI_FLASH_MODEL: str = os.getenv("GEMINI_FLASH_MODEL", "gemini-1.5-flash-latest")

# ---------------------------------------------------------------------------
# Supabase Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

# ---------------------------------------------------------------------------
# Crew Operational Parameters
# ---------------------------------------------------------------------------

CREW_POLL_INTERVAL_MIN: int = int(os.getenv("CREW_POLL_INTERVAL", "5"))
CREW_BATCH_SIZE: int = int(os.getenv("CREW_BATCH_SIZE", "3"))
MAX_RETRIES_PER_AGENT: int = int(os.getenv("MAX_RETRIES_PER_AGENT", "2"))

# ---------------------------------------------------------------------------
# Vercel ISR Revalidation
# ---------------------------------------------------------------------------

REVALIDATION_URL: str = os.getenv(
    "REVALIDATION_URL",
    os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000") + "/api/revalidate",
)
REVALIDATION_SECRET: str = os.getenv("REVALIDATION_SECRET", "")

# ---------------------------------------------------------------------------
# Token Budgets (per-agent output ceiling)
# ---------------------------------------------------------------------------

TOKEN_BUDGET_HARVESTER: int = 2_000
TOKEN_BUDGET_VALIDATOR: int = 2_000
TOKEN_BUDGET_COMPLIANCE: int = 3_000
TOKEN_BUDGET_QUANT: int = 1_500
TOKEN_BUDGET_WEAVER: int = 8_000

# ---------------------------------------------------------------------------
# Anti-FUD Vocabulary Gate — banned phrases (deterministic enforcement)
# ---------------------------------------------------------------------------

ANTI_FUD_BANNED_PHRASES: list[str] = [
    "unprecedented threat",
    "devastating attack",
    "game-changing",
    "catastrophic breach",
    "nightmare scenario",
    "apocalyptic",
    "terrifying",
    "alarming",
    "shocking discovery",
    "wake-up call",
    "ticking time bomb",
    "cyber armageddon",
    "cyber pearl harbor",
    "digital doomsday",
    "existential threat",
    "worst-case scenario",
    "in today's digital landscape",
    "in the ever-evolving world",
    "let's delve into",
    "it is important to note",
    "it's worth noting",
    "as a cybersecurity expert",
    "underscores the need for",
    "highlights the importance of",
    "a stark reminder",
    "sheds light on",
    "in conclusion",
    "to summarize",
    "as we have seen",
    "cannot be overstated",
    "it goes without saying",
    "needless to say",
    "of utmost importance",
    "plays a crucial role",
    "is a testament to",
    "serves as a reminder",
    "in an increasingly",
    "as cyber threats continue to",
    "as technology advances",
    "let's explore",
    "let us examine",
]

# ---------------------------------------------------------------------------
# CTI Analyst Pool (shared with existing engines)
# ---------------------------------------------------------------------------

CTI_AUTHORS: list[str] = [
    "Marcus Kovac",
    "Dr. Tariq Youssef",
    "Sarah Chen",
    "Elena Voss",
    "David Hughes",
    "Aiko Tanaka",
    "Dmitri Volkov",
    "Omar Al-Fayed",
]

# ---------------------------------------------------------------------------
# Sector Weight Matrix (FBR computation)
# ---------------------------------------------------------------------------

SECTOR_WEIGHTS: dict[str, float] = {
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

GEO_EXPOSURE: dict[str, float] = {
    "EU": 1.4,
    "US": 1.2,
    "UK": 1.3,
    "APAC": 1.1,
    "Other": 1.0,
}

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_config() -> list[str]:
    """Return a list of configuration errors. Empty list = valid."""
    errors: list[str] = []
    if not GEMINI_API_KEY:
        errors.append("GEMINI_API_KEY is not set")
    if not SUPABASE_URL:
        errors.append("SUPABASE_URL is not set")
    if not SUPABASE_SERVICE_KEY:
        errors.append("SUPABASE_SERVICE_KEY is not set")
    return errors
