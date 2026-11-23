# ZAYRON-X — SOURCE AUTHORITY & PROVENANCE MATRIX (05)

## 1. Provenance Architecture: Separation of Issuing Authority vs. Collection Channel

In genuine cyber threat intelligence, **how an item was discovered is distinct from who established the claim.**

```text
┌─────────────────────────────────────────────────────────────┐
│                    ORIGINAL ISSUING AUTHORITY               │
│ (Vendor Advisory / National CERT / Primary Research / CISA) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Published via RSS / Advisory / Blog
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     COLLECTION CHANNEL                      │
│     (Telegram Aggregator / Scraper Bot / X / OSINT Feed)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Raw Signal Telemetry Ingested
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   ZAYRON-X INGESTION ENGINE                 │
│      (SHA-256 Content Hash / Canonical Event Assignment)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Structured Evidence & Knowledge Trace
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                ANALYTICAL ASSESSMENT & REPORT               │
│   (Facts Grounded in Evidence; Assessments Grounded in CTI) │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Four-Tier Source Authority Hierarchy

| Tier | Category | Examples | Authority Weight | Permitted Role in Intelligence Reports |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Primary Authoritative Issuing Sources** | Microsoft MSRC, Red Hat Security, Ubuntu Security, Cisco PSIRT, Apple Security, CISA, NIST NVD, CERT-EU, JPCERT | 1.00 | Can establish **VERIFIED FACTS** regarding software vulnerabilities, affected versions, official CVE assignments, and vendor patches. |
| **Tier 2** | **High-Quality Technical Research & Telemetry** | Google Threat Analysis Group (TAG), Mandiant, Unit 42, Kaspersky GReAT, Citizen Lab, DFIR Blog authors (with verified artifacts), FIRST EPSS | 0.85 | Can establish **OBSERVED CAPABILITIES**, technical reverse-engineering artifacts, memory/network behaviors, and in-the-wild exploitation evidence. |
| **Tier 3** | **Secondary Aggregators & Early Warning Channels** | Telegram security channels (CVEfeed, BleepingComputer bot, DFIR feeds), OSINT aggregators, Reddit /r/netsec | 0.50 | **DISCOVERY ONLY.** Serves as a collection channel. Cannot establish verified facts without corroboration or extraction of original vendor advisory link. |
| **Tier 4** | **Unverified Social / Anonymous Claims** | Anonymous leak channels, paste sites, unverified social media posts | 0.20 | **QUARANTINED / UNVERIFIED.** Must be explicitly marked as unverified rumor; prohibited from establishing factual severity or attribution. |

---

## 3. Mandatory Source & Provenance Fields

Every evidence object and report must record provenance without conflation:

```typescript
export interface ProvenanceRecord {
  // Who created / asserted the claim
  issuing_authority: {
    name: string;               // e.g. "Red Hat, Inc."
    category: 'VENDOR' | 'CERT' | 'RESEARCHER' | 'STANDARD_BODY' | 'UNKNOWN';
    authority_tier: 1 | 2 | 3 | 4;
    official_url?: string;      // e.g. "https://access.redhat.com/security/cve/CVE-2026-85534"
  };

  // How ZAYRON-X obtained the signal
  collection_channel: {
    protocol: 'TELEGRAM' | 'RSS' | 'API' | 'WEB_SCRAPER';
    channel_name: string;       // e.g. "CVEfeed"
    channel_handle?: string;    // e.g. "cvefeed"
    message_id: string;         // e.g. "99123"
    observed_timestamp: string; // e.g. "2026-09-04T10:30:04Z"
  };

  // Cryptographic integrity
  telemetry_hash: {
    algorithm: 'SHA-256';
    digest: string;
  };
}
```
