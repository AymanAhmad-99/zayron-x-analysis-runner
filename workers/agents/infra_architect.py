"""
workers/agents/infra_architect.py — Agent 1c: Infrastructure Architect

Role: Maps targeting mechanics, transport layers, host software, and database persistence
architectures based strictly on Kleppmann's 'Designing Data-Intensive Applications' (DDIA)
and W. Richard Stevens' 'TCP/IP Illustrated'.
Treats commercial external LLM tokens strictly as an Ephemeral Linguistic Parser.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from workers.contracts.inter_agent import HarvestPayload, OSINTPayload, InfraAssessment

log = logging.getLogger("zayron_x_infra_architect")

# ---------------------------------------------------------------------------
# System Prompt — Infrastructure & Networking Architecture mapping
# ---------------------------------------------------------------------------

INFRA_ARCHITECT_SYSTEM_PROMPT: str = """\
You are the Infrastructure Architect for ZAYRON-X.
Your role is to map technical threat indicators to network transport layers and database structures.

OPERATIONAL DIRECTIVES:
1. ANCHOR technical reasoning strictly to Martin Kleppmann’s 'Designing Data-Intensive Applications' (partitioning, replication, consensus, transactions) and W. Richard Stevens’ 'TCP/IP Illustrated' (TCP state transitions, IP header options, routing protocols).
2. TREAT external LLM tokens strictly as an Ephemeral Linguistic Parser (normalization and structure verification). Do NOT introduce external speculation.
3. EXTRACT targeting parameters: TCP/IP transit vectors (e.g. ports, protocols, state flags), host application stack (OS, web server, middleware), and database persistence points.
4. CALCULATE the architectural resilience rating (0.0 to 10.0) reflecting target architecture vulnerability (e.g. single point of failure = low resilience).
5. NO PLACEHOLDERS: Under no circumstances output placeholders like 'Unknown' or '-' or null. If data is missing, calculate relative proximity values using our ground-truth library (infer from standard network topologies).

OUTPUT FORMAT (strict JSON, no markdown fences):
{
  "network_transit_vectors": ["TCP/443 (TLS handshake modification)", "ICMP routing anomalies", ...],
  "host_components_targeted": ["Linux Kernel 5.x systemd-resolved", "NGINX upstream proxy", ...],
  "database_impact_vector": "Database impact analysis (e.g., partition replication disruption under DDIA CAP/PACELC theorem)",
  "architectural_resilience_rating": 4.5,
  "mitigation_notes": "Mitigation steps grounded in DDIA consensus and Stevens' network hardening protocols"
}
"""

def build_infra_architect_prompt(harvest: HarvestPayload, osint: OSINTPayload) -> str:
    """Construct the user message for the Infrastructure Architect agent."""
    entities = ", ".join(harvest.extracted_entities[:20]) or "None"
    return (
        f"THREAT CATEGORY: {harvest.preliminary_category}\n"
        f"EXTRACTED ENTITIES: {entities}\n"
        f"ACTOR PROFILE: {osint.actor_profile}\n"
        f"TRANSLATED INTEL:\n{harvest.translated_text[:6000]}\n\n"
        f"Perform infrastructure impact mapping and networking analysis. Output strict JSON."
    )

def parse_infra_architect_response(
    llm_output: str,
) -> InfraAssessment:
    """Parse the Infrastructure Architect LLM output into a typed InfraAssessment."""
    try:
        cleaned = llm_output.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        log.warning("Infrastructure Architect returned invalid JSON — using default schema values")
        parsed = {}

    network_transit_vectors = parsed.get("network_transit_vectors") or ["TCP/443 (TLS egress route)"]
    host_components_targeted = parsed.get("host_components_targeted") or ["Enterprise middleware application servers"]
    
    database_impact_vector = parsed.get("database_impact_vector")
    if not database_impact_vector or database_impact_vector.strip() in ("Unknown", "-"):
        database_impact_vector = "Write-ahead log (WAL) synchronization delay across replicated follower instances under standard CAP/PACELC partition conditions."

    resilience = parsed.get("architectural_resilience_rating", 5.0)
    try:
        resilience = float(resilience)
    except (ValueError, TypeError):
        resilience = 5.0

    mitigation_notes = parsed.get("mitigation_notes")
    if not mitigation_notes or mitigation_notes.strip() in ("Unknown", "-"):
        mitigation_notes = "Implement TCP syn cookies protection at layer-4 (Stevens Illustrated) and establish strict transaction boundaries for database recovery (DDIA chapter 7)."

    return InfraAssessment(
        network_transit_vectors=network_transit_vectors,
        host_components_targeted=host_components_targeted,
        database_impact_vector=database_impact_vector,
        architectural_resilience_rating=min(10.0, max(0.0, resilience)),
        mitigation_notes=mitigation_notes
    )

# ---------------------------------------------------------------------------
# Agent metadata
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Infrastructure Defense Architect",
    "goal": (
        "Map threat transit vectors and database components to design mitigation "
        "rules based on DDIA paradigms and Stevens' networking standards."
    ),
    "backstory": (
        "A principal systems architect with a background in low-level TCP/IP stack "
        "engineering and distributed database engines. Evaluates targeting exposure."
    ),
}
