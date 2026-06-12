"""
workers/agents/validator.py — Deterministic IoC Extractor & Validator (NO LLM)

Role: Regex-based extraction of raw IoC candidates from text, followed by
deterministic hallucination gate validation via shared.models.ioc.validate_iocs.

This module contains ZERO LLM calls. All operations are pure Python deterministic logic.
LLM-based validation and MITRE TTP mapping are handled by the Omni-Agent in omni_crew.py.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.models import validate_iocs

log = logging.getLogger("zayron_x_validator")

# ---------------------------------------------------------------------------
# Regex Patterns for Deterministic IoC Candidate Extraction
# ---------------------------------------------------------------------------

# NOTE: These patterns extract CANDIDATES — they are then passed through the
# strict validate_iocs() hallucination gate before any DB insertion.

_IPV4_PATTERN = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
)
_IPV6_PATTERN = re.compile(
    r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|"
    r"\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|"
    r"\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b"
)
_SHA256_PATTERN = re.compile(r"\b[a-fA-F0-9]{64}\b")
_MD5_PATTERN = re.compile(r"\b[a-fA-F0-9]{32}\b")
_SHA1_PATTERN = re.compile(r"\b[a-fA-F0-9]{40}\b")
_DOMAIN_PATTERN = re.compile(
    r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2,})\b"
)
_URL_PATTERN = re.compile(r"https?://[^\s\">\'<]{5,}")
_EMAIL_PATTERN = re.compile(r"\b[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}\b")

# Domains to exclude from extraction (common false positives in CTI feeds)
_COMMON_FALSE_POSITIVE_DOMAINS = frozenset({
    "github.com", "twitter.com", "t.me", "telegram.me", "reddit.com",
    "virustotal.com", "shodan.io", "abuse.ch", "urlhaus.abuse.ch",
    "cert.gov", "nvd.nist.gov", "cve.mitre.org", "cvedetails.com",
    "google.com", "microsoft.com", "apple.com", "cloudflare.com",
    "t.co", "bit.ly", "ow.ly", "tinyurl.com",
})


# ---------------------------------------------------------------------------
# Core Deterministic Extraction Function
# ---------------------------------------------------------------------------

def extract_ioc_candidates(text: str) -> list[dict[str, Any]]:
    """
    Deterministically extract IoC candidates from raw text using regex patterns.

    Returns a list of raw IoC dicts suitable for passing to validate_iocs().
    Candidates are NOT validated yet — they are raw extractions with context.

    The validate_iocs() hallucination gate will silently drop any fabricated
    or non-routable values before they reach the database.
    """
    if not text:
        return []

    candidates: list[dict[str, Any]] = []
    seen_values: set[str] = set()

    def _add(ioc_type: str, value: str, context: str = "") -> None:
        v = value.strip()
        if v and v.lower() not in seen_values:
            seen_values.add(v.lower())
            candidates.append({
                "type": ioc_type,
                "value": v,
                "context": context[:120],
                "confidence": "Low",  # Regex-extracted, not LLM-confirmed
            })

    # SHA-256 (64 hex chars) — must be matched before MD5 and SHA1
    for m in _SHA256_PATTERN.finditer(text):
        _add("SHA256", m.group(), "Regex extracted SHA-256 hash")

    # SHA-1 (40 hex chars)
    for m in _SHA1_PATTERN.finditer(text):
        val = m.group()
        # Avoid matching a substring of a SHA-256
        if val.lower() not in {c["value"].lower()[:40] for c in candidates if c["type"] == "SHA256"}:
            _add("SHA1", val, "Regex extracted SHA-1 hash")

    # MD5 (32 hex chars)
    for m in _MD5_PATTERN.finditer(text):
        val = m.group()
        # Avoid matching if this is already part of a longer hash
        already_longer = any(
            c["value"].lower().startswith(val.lower())
            for c in candidates
            if c["type"] in ("SHA256", "SHA1")
        )
        if not already_longer:
            _add("MD5", val, "Regex extracted MD5 hash")

    # IPv4 addresses
    for m in _IPV4_PATTERN.finditer(text):
        _add("IPv4", m.group(), "Regex extracted IPv4 address")

    # IPv6 addresses
    for m in _IPV6_PATTERN.finditer(text):
        _add("IPv6", m.group(), "Regex extracted IPv6 address")

    # URLs (before domain extraction to avoid double-counting)
    url_domains: set[str] = set()
    for m in _URL_PATTERN.finditer(text):
        url = m.group().rstrip(".,;:)'\"")
        _add("URL", url, "Regex extracted URL")
        # Track domain from URL to avoid duplicate Domain entry
        domain_match = re.search(r"https?://([^/?\s]+)", url)
        if domain_match:
            url_domains.add(domain_match.group(1).lower())

    # Domains (excluding common false positives and already-captured URL domains)
    for m in _DOMAIN_PATTERN.finditer(text):
        dom = m.group().lower()
        if dom not in _COMMON_FALSE_POSITIVE_DOMAINS and dom not in url_domains:
            # Only include domains that look potentially malicious
            # (exclude common TLDs with no subdomain that appear to be vendor refs)
            if "." in dom and not dom.endswith((".png", ".jpg", ".css", ".js", ".html")):
                _add("Domain", m.group(), "Regex extracted domain")

    # Emails
    for m in _EMAIL_PATTERN.finditer(text):
        email = m.group()
        # Skip emails that look like code or version references
        if not any(c.isdigit() and text[m.start()-1:m.start()] == "v" for c in email):
            _add("Email", email, "Regex extracted email")

    log.debug(
        "IoC candidate extraction: %d candidates from %d chars of text",
        len(candidates), len(text)
    )
    return candidates


def extract_and_validate_iocs(text: str) -> list[dict[str, Any]]:
    """
    Full pipeline: regex extraction followed by deterministic hallucination gate.

    Returns only IoCs that pass ALL validation rules (format check, bogon filter,
    empty-string hash detection). Safe for database insertion.
    """
    candidates = extract_ioc_candidates(text)
    validated = validate_iocs(candidates)
    log.info(
        "IoC pipeline: %d candidates extracted, %d passed hallucination gate",
        len(candidates), len(validated)
    )
    return validated


def extract_cve_ids(text: str) -> list[str]:
    """Extract CVE identifiers from text using regex."""
    pattern = re.compile(r"CVE-\d{4}-\d{4,}", re.IGNORECASE)
    found = pattern.findall(text)
    return list({c.upper() for c in found})


def extract_mitre_ttps(text: str) -> list[str]:
    """
    Extract MITRE ATT&CK T-code references from text using regex.
    Returns only properly formatted T-codes (e.g., T1566, T1566.001).
    """
    pattern = re.compile(r"\bT\d{4}(?:\.\d{3})?\b")
    found = pattern.findall(text)
    return list(dict.fromkeys(found))  # Deduplicated, order-preserving


# ---------------------------------------------------------------------------
# Agent metadata
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Deterministic IoC Extractor & Validator",
    "goal": (
        "Extract raw IoC candidates from intelligence feeds using regex patterns, "
        "then filter them through the deterministic hallucination gate. No LLM calls."
    ),
    "backstory": (
        "A zero-trust IoC pipeline enforcer. Uses pure Python regex and IP address "
        "library validation to reject loopback IPs, private ranges, empty-string hashes, "
        "and known LLM hallucination artifacts before any database insertion."
    ),
}
