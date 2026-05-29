"""
ZAYRON-X — IoC (Indicator of Compromise) Pydantic Model

This is the deterministic hallucination gate. Every IoC extracted by the LLM
must pass through this validator. It uses pure Python logic (regex, ipaddress)
to reject:
  - SHA-256 of empty string (the #1 LLM hallucination artifact)
  - MD5 of empty string
  - Bogon / RFC 5737 / loopback / private IPs
  - Common LLM placeholder IPs and domains
  - Malformed hash lengths

This validator CANNOT be fooled by a creative LLM. It is deterministic.
"""

from __future__ import annotations

import ipaddress
import logging
import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

log = logging.getLogger("zayron_x_ioc_validator")

# ---------------------------------------------------------------------------
# Known hallucination artifacts — hashes of empty/trivial inputs
# ---------------------------------------------------------------------------

EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
EMPTY_MD5 = "d41d8cd98f00b204e9800998ecf8427e"
TRIVIAL_SHA256S = frozenset({
    EMPTY_SHA256,
    # SHA-256 of "\n"
    "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
    # SHA-256 of "test"
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
})

TRIVIAL_MD5S = frozenset({
    EMPTY_MD5,
    # MD5 of "test"
    "098f6bcd4621d373cade4e832627b4f6",
})

# Common LLM-fabricated placeholder IPs
PLACEHOLDER_IPS = frozenset({
    "1.2.3.4", "1.1.1.1", "8.8.8.8", "8.8.4.4",
    "192.168.1.1", "192.168.0.1", "10.0.0.1", "172.16.0.1",
    "127.0.0.1", "0.0.0.0", "255.255.255.255",
})

# Common LLM-fabricated placeholder domains
PLACEHOLDER_DOMAINS = frozenset({
    "example.com", "example.org", "example.net",
    "malware.com", "evil.com", "attacker.com", "hacker.com",
    "malicious-domain.com", "c2-server.com", "threat-actor.com",
    "test.com", "localhost",
})


class IoC(BaseModel):
    """Strict model for a single Indicator of Compromise.

    Every field is validated deterministically — the LLM's creative
    confidence is irrelevant. Either the value passes format and
    semantic checks, or it is rejected.
    """

    type: Literal["SHA256", "MD5", "SHA1", "IPv4", "IPv6", "Domain", "URL", "Email"]
    value: str = Field(..., min_length=1)
    context: str = Field(default="")
    confidence: Literal["High", "Medium", "Low"] = Field(default="Medium")

    @field_validator("value")
    @classmethod
    def validate_ioc_value(cls, v: str, info) -> str:
        ioc_type = info.data.get("type", "")

        if ioc_type == "SHA256":
            if not re.fullmatch(r"[a-fA-F0-9]{64}", v):
                raise ValueError(f"Invalid SHA-256 format: {v[:20]}...")
            if v.lower() in TRIVIAL_SHA256S:
                raise ValueError(
                    f"HALLUCINATION REJECTED: SHA-256 '{v[:16]}...' is a known "
                    f"trivial hash (empty string / test data)"
                )

        elif ioc_type == "MD5":
            if not re.fullmatch(r"[a-fA-F0-9]{32}", v):
                raise ValueError(f"Invalid MD5 format: {v[:20]}...")
            if v.lower() in TRIVIAL_MD5S:
                raise ValueError(
                    f"HALLUCINATION REJECTED: MD5 '{v[:16]}...' is a known "
                    f"trivial hash (empty string / test data)"
                )

        elif ioc_type == "SHA1":
            if not re.fullmatch(r"[a-fA-F0-9]{40}", v):
                raise ValueError(f"Invalid SHA-1 format: {v[:20]}...")

        elif ioc_type == "IPv4":
            try:
                addr = ipaddress.IPv4Address(v)
            except ipaddress.AddressValueError:
                raise ValueError(f"Invalid IPv4 address: {v}")

            if addr.is_private or addr.is_loopback or addr.is_reserved:
                raise ValueError(
                    f"REJECTED: Non-routable IP {v} "
                    f"(private={addr.is_private}, loopback={addr.is_loopback})"
                )
            if v in PLACEHOLDER_IPS:
                raise ValueError(f"HALLUCINATION REJECTED: Placeholder IP {v}")

        elif ioc_type == "IPv6":
            try:
                addr = ipaddress.IPv6Address(v)
            except ipaddress.AddressValueError:
                raise ValueError(f"Invalid IPv6 address: {v}")
            if addr.is_private or addr.is_loopback or addr.is_reserved:
                raise ValueError(f"REJECTED: Non-routable IPv6 {v}")

        elif ioc_type == "Domain":
            if not re.fullmatch(
                r"[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?"
                r"(\.[a-zA-Z]{2,})+",
                v,
            ):
                raise ValueError(f"Invalid domain format: {v}")
            if v.lower() in PLACEHOLDER_DOMAINS:
                raise ValueError(f"HALLUCINATION REJECTED: Placeholder domain {v}")

        elif ioc_type == "URL":
            if not v.startswith(("http://", "https://")):
                raise ValueError(f"Invalid URL (must start with http/https): {v[:50]}")

        elif ioc_type == "Email":
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}", v):
                raise ValueError(f"Invalid email format: {v}")

        return v


def validate_iocs(raw_iocs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate a list of raw IoC dicts from LLM output.

    Returns only the IoCs that pass all deterministic checks.
    Invalid IoCs are logged and silently dropped — they never reach the DB.

    Args:
        raw_iocs: List of dicts with keys: type, value, context, confidence

    Returns:
        List of validated IoC dicts (safe for database insertion)
    """
    validated: list[dict[str, Any]] = []

    for i, raw in enumerate(raw_iocs):
        if not isinstance(raw, dict):
            log.warning("IoC #%d: not a dict, skipping: %s", i, type(raw))
            continue

        try:
            ioc = IoC(**raw)
            validated.append(ioc.model_dump())
        except Exception as exc:
            log.warning(
                "IoC #%d DROPPED — %s: %s (raw: %s)",
                i, type(exc).__name__, exc, str(raw)[:100],
            )

    dropped = len(raw_iocs) - len(validated)
    if dropped > 0:
        log.info(
            "IoC validation: %d/%d passed, %d dropped (hallucination gate)",
            len(validated), len(raw_iocs), dropped,
        )

    return validated
