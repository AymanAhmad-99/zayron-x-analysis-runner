/**
 * ZAYRON-X — Canonical Published Reports In-Memory Registry
 * Fast-path O(1) resolver & D1 exhaustion safety layer for valid published intelligence reports.
 */

export interface StoredCanonicalReport {
  intelligence_id: string;
  cve_id: string | null;
  slug: string;
  title: string;
  summary: string;
  body: string;
  severity: string;
  confidence_score: number;
  deduplication_key: string;
  content_hash: string;
  published_at: string;
  entities: Record<string, any>;
  evidence: Array<{
    id: string;
    type: string;
    snippet: string;
    weight: number;
    source_name: string;
    source_url: string;
    created_at: string;
  }>;
}

export const CANONICAL_PUBLISHED_REPORTS: StoredCanonicalReport[] = [
  {
    "intelligence_id": "intel_0000000025c98a4d",
    "cve_id": "CVE-2026-27347",
    "slug": "cve-2026-27347",
    "title": "CVE-2026-27347: 🚨 CVE-2026-27347",
    "summary": "🚨 CVE-2026-27347\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in Crocoblock JetPopup allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects JetPopup: from n/a through 2.0.20.2.\n\n📅 Publi...",
    "body": "🚨 CVE-2026-27347\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in Crocoblock JetPopup allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects JetPopup: from n/a through 2.0.20.2.\n\n📅 Published Date: 2026-09-04T10:49:09.887Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-27347",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99125:0000000025c98a4d",
    "content_hash": "0000000025c98a4d017e",
    "published_at": "2026-09-04T11:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-27347",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000025c9",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-27347\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in Crocoblock JetPopup allows Exploiting Incorrectly Configure",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T11:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005ac14069",
    "cve_id": "CVE-2026-84428",
    "slug": "cve-2026-84428",
    "title": "CVE-2026-84428: 🚨 CVE-2026-84428",
    "summary": "🚨 CVE-2026-84428\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 implement the case-insensitive nature of HTTP header names by lowercasing names in a route's header schema before compiling it, but the transformation is incomplete: it low...",
    "body": "🚨 CVE-2026-84428\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 implement the case-insensitive nature of HTTP header names by lowercasing names in a route's header schema before compiling it, but the transformation is incomplete: it lowercases the properties keys and the root-level required array, and does not lowercase the trigger and dependent names inside the JSON Schema Draft 7 dependencies keyword. Because Node stores request header names in lowercase, a canonical-case dependency such as requiring an authentication header whenever a privileged-mode header is present never matches, and the presence assertion is silently skipped. An unauthenticated remote client can therefore send the header that activates a privileged branch while omitting the header the dependency was meant to require, bypassing the conditional check. Users should upgrade to fastify 5.12.2 or later.\n\n📅 Published Date: 2026-09-04T10:24:27.809Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84428",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99124:000000005ac14069",
    "content_hash": "000000005ac14069040f",
    "published_at": "2026-09-04T10:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84428",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005ac1",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84428\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 implement the case-insensitive nature of HTTP header names by lowercasin",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005908d3e5",
    "cve_id": null,
    "slug": "intel_000000005908d3e5",
    "title": "August 2026 Patch Tuesday fixed 398 CVEs, one of the largest updates on record. SharePoint, Exchange",
    "summary": "August 2026 Patch Tuesday fixed 398 CVEs, one of the largest updates on record. SharePoint, Exchange Server, Azure Arc, Defender, and Chrome had high-risk flaws, including actively exploited issues. #PatchTuesday #CVE #Microsoft\n➡️ https://www.hendryadrian.com/september-2026-patch-tuesday-forecast-a...",
    "body": "August 2026 Patch Tuesday fixed 398 CVEs, one of the largest updates on record. SharePoint, Exchange Server, Azure Arc, Defender, and Chrome had high-risk flaws, including actively exploited issues. #PatchTuesday #CVE #Microsoft\n➡️ https://www.hendryadrian.com/september-2026-patch-tuesday-forecast-all-we-need-is-more-time/",
    "severity": "HIGH",
    "confidence_score": 0.81,
    "deduplication_key": "tg_0:35395:000000005908d3e5",
    "content_hash": "000000005908d3e50144",
    "published_at": "2026-09-04T10:45:05.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005908",
        "type": "TELEGRAM_TELEMETRY",
        "snippet": "August 2026 Patch Tuesday fixed 398 CVEs, one of the largest updates on record. SharePoint, Exchange Server, Azure Arc, Defender, and Chrome had high-risk flaws, including actively exploited issues. #",
        "weight": 0.81,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:45:05.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001041de64",
    "cve_id": "CVE-2026-85534",
    "slug": "cve-2026-85534",
    "title": "CVE-2026-85534: 🚨 CVE-2026-85534",
    "summary": "🚨 CVE-2026-85534\n\n📢 Source: redhat\n\n💣 CVSS Score: 5.9 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nA flaw was found in libsoup. When a client sends an HTTP/2 request body from a non-pollable input stream, the library can buffer more data than the current flow-control window later allows. A malicious ...",
    "body": "🚨 CVE-2026-85534\n\n📢 Source: redhat\n\n💣 CVSS Score: 5.9 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nA flaw was found in libsoup. When a client sends an HTTP/2 request body from a non-pollable input stream, the library can buffer more data than the current flow-control window later allows. A malicious HTTP/2 server can shrink SETTINGS_INITIAL_WINDOW_SIZE while that buffered read is still in progress. The client then copies the full buffer into a smaller DATA callback without a runtime bounds check, which can abort the process or fail the HTTP/2 session.\n\n📅 Published Date: 2026-09-04T10:19:22.562Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85534",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99123:000000001041de64",
    "content_hash": "000000001041de640288",
    "published_at": "2026-09-04T10:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85534",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001041",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85534\n\n📢 Source: redhat\n\n💣 CVSS Score: 5.9 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nA flaw was found in libsoup. When a client sends an HTTP/2 request body from a non-pollable input stre",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000004795e41c",
    "cve_id": "CVE-2026-85512",
    "slug": "cve-2026-85512",
    "title": "CVE-2026-85512: 🚨 CVE-2026-85512",
    "summary": "🚨 CVE-2026-85512\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in SourceCodester Class and Exam Timetabling System 1.0. This vulnerability affects unknown code of the file /admin/session.php. The manipulation of the argument ID resul...",
    "body": "🚨 CVE-2026-85512\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in SourceCodester Class and Exam Timetabling System 1.0. This vulnerability affects unknown code of the file /admin/session.php. The manipulation of the argument ID results in missing authorization. The attack can be executed remotely. The exploit has been released to the public and may be used for attacks.\n\n📅 Published Date: 2026-09-04T10:15:10.908Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85512",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99122:000000004795e41c",
    "content_hash": "000000004795e41c0212",
    "published_at": "2026-09-04T10:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85512",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000004795",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85512\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in SourceCodester Class and Exam Timetabling System 1.0. This vulnerab",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005e817ec9",
    "cve_id": "CVE-2026-79707",
    "slug": "cve-2026-79707",
    "title": "CVE-2026-79707: 🚨 CVE-2026-79707",
    "summary": "🚨 CVE-2026-79707\n\n📢 Source: GoogleCloud\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA Path Traversal vulnerability in the builder endpoint in Google Cloud Agent Development Kit (ADK) versions 1.9.0 through 1.21.0 on Python allows an unauthenticated remote attacker to read arbitrary ...",
    "body": "🚨 CVE-2026-79707\n\n📢 Source: GoogleCloud\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA Path Traversal vulnerability in the builder endpoint in Google Cloud Agent Development Kit (ADK) versions 1.9.0 through 1.21.0 on Python allows an unauthenticated remote attacker to read arbitrary files using a crafted file_path query parameter.\n\n📅 Published Date: 2026-09-04T10:06:34.152Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-79707",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99120:000000005e817ec9",
    "content_hash": "000000005e817ec901b8",
    "published_at": "2026-09-04T10:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-79707",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005e81",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-79707\n\n📢 Source: GoogleCloud\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA Path Traversal vulnerability in the builder endpoint in Google Cloud Agent Development Kit (ADK) ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000026df1b95",
    "cve_id": "CVE-2026-84045",
    "slug": "cve-2026-84045",
    "title": "CVE-2026-84045: 🚨 CVE-2026-84045",
    "summary": "🚨 CVE-2026-84045\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe E-cab Taxi Booking Manager for Woocommerce WordPress plugin before 2.0.5 does not validate a client-supplied trip distance and base-price value on the server before pricing a booking, allowing unauthen...",
    "body": "🚨 CVE-2026-84045\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe E-cab Taxi Booking Manager for Woocommerce WordPress plugin before 2.0.5 does not validate a client-supplied trip distance and base-price value on the server before pricing a booking, allowing unauthenticated attackers to manipulate the order total down to zero and place real taxi-booking orders at an arbitrary price.\n\n📅 Published Date: 2026-09-04T10:02:33.451Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84045",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99121:0000000026df1b95",
    "content_hash": "0000000026df1b9501fe",
    "published_at": "2026-09-04T10:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84045",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000026df",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84045\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe E-cab Taxi Booking Manager for Woocommerce WordPress plugin before 2.0.5 does not validate a client-s",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000063682c39",
    "cve_id": "CVE-2026-4644",
    "slug": "cve-2026-4644",
    "title": "CVE-2026-4644: 🚨 CVE-2026-4644",
    "summary": "🚨 CVE-2026-4644\n\n📢 Source: GoogleCloud\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA Missing Authorization vulnerability in HTTP Connector in Google Cloud Integration Connectors versions prior to 2025-12-11 on Google Cloud Platform allows an authenticated user to escalate privileges...",
    "body": "🚨 CVE-2026-4644\n\n📢 Source: GoogleCloud\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA Missing Authorization vulnerability in HTTP Connector in Google Cloud Integration Connectors versions prior to 2025-12-11 on Google Cloud Platform allows an authenticated user to escalate privileges and take over a Google Cloud Project using unauthorized service account attachment.\n\n\n\nThis vulnerability was patched on 11 December 2025, and no customer action is needed.\n\n📅 Published Date: 2026-09-04T10:19:13.421Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-4644",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99119:0000000063682c39",
    "content_hash": "0000000063682c390234",
    "published_at": "2026-09-04T10:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-4644",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006368",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-4644\n\n📢 Source: GoogleCloud\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA Missing Authorization vulnerability in HTTP Connector in Google Cloud Integration Connectors versi",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000002994d2b",
    "cve_id": "CVE-2026-82923",
    "slug": "cve-2026-82923",
    "title": "CVE-2026-82923: 🚨 CVE-2026-82923",
    "summary": "🚨 CVE-2026-82923\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe AI Website Builder WordPress plugin (GitHub build) 1.0.0 does not perform any authorisation or nonce check on its REST API routes, allowing unauthenticated attackers to install and activate plugins and...",
    "body": "🚨 CVE-2026-82923\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe AI Website Builder WordPress plugin (GitHub build) 1.0.0 does not perform any authorisation or nonce check on its REST API routes, allowing unauthenticated attackers to install and activate plugins and themes, import content from a URL under their control, write a file of their choosing into the uploads directory, and delete site content and media. On a host that serves PHP from the uploads directory, that file write is remote code execution.\n\n📅 Published Date: 2026-09-04T10:00:35.005Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-82923",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99115:0000000002994d2b",
    "content_hash": "0000000002994d2b027d",
    "published_at": "2026-09-04T10:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-82923",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000299",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-82923\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe AI Website Builder WordPress plugin (GitHub build) 1.0.0 does not perform any authorisation or nonce ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000002d946f77",
    "cve_id": "CVE-2026-84043",
    "slug": "cve-2026-84043",
    "title": "CVE-2026-84043: 🚨 CVE-2026-84043",
    "summary": "🚨 CVE-2026-84043\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe ePayco Payment Gateway for WooCommerce WordPress plugin before 8.4.7 does not properly verify the authenticity of payment confirmation requests, allowing unauthenticated attackers to mark orders as pai...",
    "body": "🚨 CVE-2026-84043\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe ePayco Payment Gateway for WooCommerce WordPress plugin before 8.4.7 does not properly verify the authenticity of payment confirmation requests, allowing unauthenticated attackers to mark orders as paid without a valid gateway signature.\n\n📅 Published Date: 2026-09-04T10:00:35.651Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84043",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99116:000000002d946f77",
    "content_hash": "000000002d946f7701ac",
    "published_at": "2026-09-04T10:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84043",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002d94",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84043\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe ePayco Payment Gateway for WooCommerce WordPress plugin before 8.4.7 does not properly verify the aut",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000006f0993ed",
    "cve_id": "CVE-2026-84469",
    "slug": "cve-2026-84469",
    "title": "CVE-2026-84469: 🚨 CVE-2026-84469",
    "summary": "🚨 CVE-2026-84469\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 decide whether to compile a request schema based on JavaScript truthiness, but JSON Schema Draft 7 defines the boolean false as a valid schema that rejects every instance. ...",
    "body": "🚨 CVE-2026-84469\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 decide whether to compile a request schema based on JavaScript truthiness, but JSON Schema Draft 7 defines the boolean false as a valid schema that rejects every instance. When an application assigns false to a route's body, querystring, params, or headers schema to deny all input, fastify treats it as a missing schema, compiles no validator, and runs the route handler on any request. An unauthenticated remote client can therefore reach a handler that a valid deny-all schema was intended to make unreachable, a complete validation bypass that can lead to unauthorized state changes or execution of disabled operations. Users should upgrade to fastify 5.12.2 or later.\n\n📅 Published Date: 2026-09-04T09:59:36.406Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84469",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99118:000000006f0993ed",
    "content_hash": "000000006f0993ed037c",
    "published_at": "2026-09-04T10:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84469",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006f09",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84469\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 decide whether to compile a request schema based on JavaScript truthines",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000004d2710",
    "cve_id": "CVE-2026-84044",
    "slug": "cve-2026-84044",
    "title": "CVE-2026-84044: 🚨 CVE-2026-84044",
    "summary": "🚨 CVE-2026-84044\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Restaurant Menu and Food Ordering WordPress plugin before 2.4.12 does not verify that a PayPal payment notification genuinely originates from PayPal, allowing unauthenticated attackers to forge a payme...",
    "body": "🚨 CVE-2026-84044\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Restaurant Menu and Food Ordering WordPress plugin before 2.4.12 does not verify that a PayPal payment notification genuinely originates from PayPal, allowing unauthenticated attackers to forge a payment notification and mark their own order as paid and completed without making any payment.\n\n📅 Published Date: 2026-09-04T10:00:36.313Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84044",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99117:00000000004d2710",
    "content_hash": "00000000004d271001e2",
    "published_at": "2026-09-04T10:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84044",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000004d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84044\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Restaurant Menu and Food Ordering WordPress plugin before 2.4.12 does not verify that a PayPal paymen",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005328eb95",
    "cve_id": "CVE-2026-81666",
    "slug": "cve-2026-81666",
    "title": "CVE-2026-81666: 🚨 CVE-2026-81666",
    "summary": "🚨 CVE-2026-81666\n\n📢 Source: redhat\n\n💣 CVSS Score: 6.5 (MEDIUM)\n\n📡 Remotely Exploitable: False\n\nAn integer overflow was found in Corosync's handling of membership commit token messages. The length-validation check for these messages can be bypassed on 32-bit systems due to an integer overflow in ...",
    "body": "🚨 CVE-2026-81666\n\n📢 Source: redhat\n\n💣 CVSS Score: 6.5 (MEDIUM)\n\n📡 Remotely Exploitable: False\n\nAn integer overflow was found in Corosync's handling of membership commit token messages. The length-validation check for these messages can be bypassed on 32-bit systems due to an integer overflow in the calculation of the expected message length, allowing a crafted network packet to trigger an out-of-bounds memory access that crashes the Corosync daemon. This results in a denial of service for the affected cluster node. The overflow does not occur on 64-bit systems, where the length calculation is correctly performed in 64-bit arithmetic.\n\n📅 Published Date: 2026-09-04T09:46:06.130Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-81666",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99113:000000005328eb95",
    "content_hash": "000000005328eb9502e1",
    "published_at": "2026-09-04T10:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-81666",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005328",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-81666\n\n📢 Source: redhat\n\n💣 CVSS Score: 6.5 (MEDIUM)\n\n📡 Remotely Exploitable: False\n\nAn integer overflow was found in Corosync's handling of membership commit token messages. The length-",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000695b1073",
    "cve_id": "CVE-2026-76169",
    "slug": "cve-2026-76169",
    "title": "CVE-2026-76169: 🚨 CVE-2026-76169",
    "summary": "🚨 CVE-2026-76169\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions >= 4.0.0 and before 5.12.2 can route a malformed URL sent under one plugin prefix to the custom not-found handler of a different sibling plugin, and invoke it without the preHandler hook...",
    "body": "🚨 CVE-2026-76169\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions >= 4.0.0 and before 5.12.2 can route a malformed URL sent under one plugin prefix to the custom not-found handler of a different sibling plugin, and invoke it without the preHandler hook declared for that handler. The internal not-found router for encapsulated handlers dispatches malformed paths through a single shared handler pointer before URL decoding, ignoring the prefix and skipping the selected handler's normal lifecycle. An unauthenticated attacker can therefore reach an authentication-protected private fallback through an unrelated public prefix and read its full response, bypassing the authentication hook and breaking prefix encapsulation. Users should upgrade to fastify 5.12.2 or later.\n\n📅 Published Date: 2026-09-04T09:51:03.556Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-76169",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99114:00000000695b1073",
    "content_hash": "00000000695b1073038f",
    "published_at": "2026-09-04T10:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-76169",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000695b",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-76169\n\n📢 Source: openjs\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions >= 4.0.0 and before 5.12.2 can route a malformed URL sent under one plugin prefix to t",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000025b8e472",
    "cve_id": "CVE-2026-13148",
    "slug": "cve-2026-13148",
    "title": "CVE-2026-13148: 🚨 CVE-2026-13148",
    "summary": "🚨 CVE-2026-13148\n\n📢 Source: Softing\n\n💣 CVSS Score: 6.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing release of memory after effective lifetime vulnerability in Softing smartLink allows resource leak exposure.\n\nThis issue affects smartLink HW-PN: from 1.04 before 1.10.\n\n📅 Published Date: 2026...",
    "body": "🚨 CVE-2026-13148\n\n📢 Source: Softing\n\n💣 CVSS Score: 6.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing release of memory after effective lifetime vulnerability in Softing smartLink allows resource leak exposure.\n\nThis issue affects smartLink HW-PN: from 1.04 before 1.10.\n\n📅 Published Date: 2026-09-04T09:44:58.319Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-13148",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99112:0000000025b8e472",
    "content_hash": "0000000025b8e472016f",
    "published_at": "2026-09-04T10:00:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-13148",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000025b8",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-13148\n\n📢 Source: Softing\n\n💣 CVSS Score: 6.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing release of memory after effective lifetime vulnerability in Softing smartLink allows resource",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T10:00:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000025205468",
    "cve_id": "CVE-2026-85541",
    "slug": "cve-2026-85541",
    "title": "CVE-2026-85541: 🚨 CVE-2026-85541",
    "summary": "🚨 CVE-2026-85541\n\n📢 Source: twcert\n\n💣 CVSS Score: 5.4 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nDreamMaker developed by Interinfo has a Reflected Cross-site Scripting vulnerability. Authenticated remote attackers can execute arbitrary JavaScript codes in user's browser via a malicious website.\n\n📅...",
    "body": "🚨 CVE-2026-85541\n\n📢 Source: twcert\n\n💣 CVSS Score: 5.4 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nDreamMaker developed by Interinfo has a Reflected Cross-site Scripting vulnerability. Authenticated remote attackers can execute arbitrary JavaScript codes in user's browser via a malicious website.\n\n📅 Published Date: 2026-09-04T09:35:26.412Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85541",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99110:0000000025205468",
    "content_hash": "00000000252054680184",
    "published_at": "2026-09-04T09:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85541",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002520",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85541\n\n📢 Source: twcert\n\n💣 CVSS Score: 5.4 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nDreamMaker developed by Interinfo has a Reflected Cross-site Scripting vulnerability. Authenticated re",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000007aa9a32a",
    "cve_id": "CVE-2026-85547",
    "slug": "cve-2026-85547",
    "title": "CVE-2026-85547: 🚨 CVE-2026-85547",
    "summary": "🚨 CVE-2026-85547\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 6.2 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nA cross-site request forgery (CSRF) vulnerability exists in MISP due to form-security and CSRF protections being disabled based on whether an incoming request was identified as a REST request.\n\nMISP's RE...",
    "body": "🚨 CVE-2026-85547\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 6.2 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nA cross-site request forgery (CSRF) vulnerability exists in MISP due to form-security and CSRF protections being disabled based on whether an incoming request was identified as a REST request.\n\nMISP's REST detection can be influenced by request properties such as the URL suffix or the HTTP Accept header. Because Accept: application/json can be supplied by a cross-origin page without requiring a CORS preflight, an attacker could cause a request originating from another website to be treated as REST traffic. MISP would consequently disable its normal form-security and CSRF validation even though the request was authenticated using the victim's existing browser session.\n\nAn unauthenticated remote attacker could exploit this behavior by convincing an authenticated MISP user to visit or interact with a malicious web page. The attacker's page could then issue crafted requests to susceptible state-changing MISP endpoints using the victim's privileges. Depending on the permissions of the victim and the targeted endpoint, this could allow unauthorized modification, creation, publication, or removal of data and other state changes.\n\nThe vulnerability originates from granting the form-security exemption based on _isRest() rather than on the authentication mechanism used by the request. The patch changes this behavior so that CSRF and form-security exemptions are granted only when the request actually carries a MISP API key. Session-authenticated REST-style requests remain subject to CSRF protection.\nThe fix also introduces support for transmitting CSRF tokens through the X-CSRF-Token header for legitimate same-origin AJAX requests. Such a header cannot normally be attached by a cross-origin page without triggering a CORS preflight, preventing it from being used to reproduce the original attack.\n\n📅 Published Date: 2026-09-04T09:40:54.018Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85547",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99111:000000007aa9a32a",
    "content_hash": "000000007aa9a32a07d3",
    "published_at": "2026-09-04T09:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85547",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000007aa9",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85547\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 6.2 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nA cross-site request forgery (CSRF) vulnerability exists in MISP due to form-security and CSRF protecti",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000028ffc120",
    "cve_id": "CVE-2026-85540",
    "slug": "cve-2026-85540",
    "title": "CVE-2026-85540: 🚨 CVE-2026-85540",
    "summary": "🚨 CVE-2026-85540\n\n📢 Source: twcert\n\n💣 CVSS Score: 8.8 (HIGH)\n\n📡 Remotely Exploitable: True\n\nDreamMaker developed by Interinfo has a SQL Injection vulnerability. Authenticated remote attackers can inject arbitrary SQL commands to read, modify, and delete database contents.\n\n📅 Published Date: 202...",
    "body": "🚨 CVE-2026-85540\n\n📢 Source: twcert\n\n💣 CVSS Score: 8.8 (HIGH)\n\n📡 Remotely Exploitable: True\n\nDreamMaker developed by Interinfo has a SQL Injection vulnerability. Authenticated remote attackers can inject arbitrary SQL commands to read, modify, and delete database contents.\n\n📅 Published Date: 2026-09-04T09:34:46.643Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85540",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99109:0000000028ffc120",
    "content_hash": "0000000028ffc1200170",
    "published_at": "2026-09-04T09:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85540",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000028ff",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85540\n\n📢 Source: twcert\n\n💣 CVSS Score: 8.8 (HIGH)\n\n📡 Remotely Exploitable: True\n\nDreamMaker developed by Interinfo has a SQL Injection vulnerability. Authenticated remote attackers can ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000558996db",
    "cve_id": "CVE-2026-84504",
    "slug": "cve-2026-84504",
    "title": "CVE-2026-84504: 🚨 CVE-2026-84504",
    "summary": "🚨 CVE-2026-84504\n\n📢 Source: openjs\n\n💣 CVSS Score: 8.1 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 treat the object resolved by a successful Ajv async validator as the value result protocol used by custom validator compilers. If a request that passes its route schema con...",
    "body": "🚨 CVE-2026-84504\n\n📢 Source: openjs\n\n💣 CVSS Score: 8.1 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 treat the object resolved by a successful Ajv async validator as the value result protocol used by custom validator compilers. If a request that passes its route schema contains a property named value at the root, fastify replaces the entire request body with that property's value before the handler runs, so the handler receives a different object than the one that satisfied the schema. An authenticated low-privilege caller can use this to make nested data replace the validated body and trigger an operation the route schema did not authorize, leading to unauthorized state changes and data disclosure. Users should upgrade to fastify 5.12.2 or later.\n\n📅 Published Date: 2026-09-04T09:40:18.120Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84504",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99108:00000000558996db",
    "content_hash": "00000000558996db036c",
    "published_at": "2026-09-04T09:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84504",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005589",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84504\n\n📢 Source: openjs\n\n💣 CVSS Score: 8.1 (HIGH)\n\n📡 Remotely Exploitable: False\n\nfastify versions before 5.12.2 treat the object resolved by a successful Ajv async validator as the val",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000080b47aa",
    "cve_id": "CVE-2026-85546",
    "slug": "cve-2026-85546",
    "title": "CVE-2026-85546: 🚨 CVE-2026-85546",
    "summary": "🚨 CVE-2026-85546\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 8.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nMISP contains a cross-site request forgery (CSRF) vulnerability in the sharing group quick-edit functionality. The addOrg, removeOrg, addServer, and removeServer actions share the __initialiseSGQuickEdit()...",
    "body": "🚨 CVE-2026-85546\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 8.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nMISP contains a cross-site request forgery (CSRF) vulnerability in the sharing group quick-edit functionality. The addOrg, removeOrg, addServer, and removeServer actions share the __initialiseSGQuickEdit() helper, where the HTTP method validation intended to restrict these operations to POST requests was commented out.\n\nAs a result, these state-changing actions could be invoked using GET requests. An attacker could craft a URL targeting one of the affected actions and cause an authenticated MISP user with sufficient privileges to request it, for example through a malicious link or embedded web resource.\n\nSuccessful exploitation could modify the membership of a MISP sharing group without the victim intentionally performing the operation. Depending on the action performed, an attacker could add or remove organisations or servers from a sharing group, potentially granting unintended access to information distributed through that sharing group or disrupting legitimate information sharing.\n\nThe patch restores HTTP method enforcement centrally in __initialiseSGQuickEdit() by calling allowMethod(['post']), ensuring that all four affected quick-edit operations require POST requests and are therefore subject to the application's normal protections for state-changing requests.\n\n📅 Published Date: 2026-09-04T09:27:36.525Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85546",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99107:00000000080b47aa",
    "content_hash": "00000000080b47aa05c2",
    "published_at": "2026-09-04T09:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85546",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000080b",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85546\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 8.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nMISP contains a cross-site request forgery (CSRF) vulnerability in the sharing group quick-edit functiona",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000372dddda",
    "cve_id": "CVE-2026-27086",
    "slug": "cve-2026-27086",
    "title": "CVE-2026-27086: 🚨 CVE-2026-27086",
    "summary": "🚨 CVE-2026-27086\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 6.5 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nImproper Neutralization of Input During Web Page Generation ('Cross-site Scripting') vulnerability in Xtemos WoodMart allows DOM-Based XSS.\n\nThis issue affects WoodMart: from n/a before 8.3.8.\n\n📅 P...",
    "body": "🚨 CVE-2026-27086\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 6.5 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nImproper Neutralization of Input During Web Page Generation ('Cross-site Scripting') vulnerability in Xtemos WoodMart allows DOM-Based XSS.\n\nThis issue affects WoodMart: from n/a before 8.3.8.\n\n📅 Published Date: 2026-09-04T09:22:57.652Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-27086",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99105:00000000372dddda",
    "content_hash": "00000000372dddda0182",
    "published_at": "2026-09-04T09:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-27086",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000372d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-27086\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 6.5 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nImproper Neutralization of Input During Web Page Generation ('Cross-site Scripting') vulnerability",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000285737d5",
    "cve_id": "CVE-2026-85184",
    "slug": "cve-2026-85184",
    "title": "CVE-2026-85184: 🚨 CVE-2026-85184",
    "summary": "🚨 CVE-2026-85184\n\n📢 Source: openjs\n\n💣 CVSS Score: 9.1 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\n@fastify/middie versions >= 9.1.0 and before 9.3.4 decide whether to run path-scoped middleware by matching against the raw request target, while the Fastify router resolves an absolute-form request ...",
    "body": "🚨 CVE-2026-85184\n\n📢 Source: openjs\n\n💣 CVSS Score: 9.1 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\n@fastify/middie versions >= 9.1.0 and before 9.3.4 decide whether to run path-scoped middleware by matching against the raw request target, while the Fastify router resolves an absolute-form request target to its path before dispatching. Because the two layers evaluate different strings, a request using an absolute-form target reaches the route handler while the path-scoped middleware, such as authentication or authorization, is skipped. An unauthenticated network attacker can use this to bypass path-based access controls in a Fastify application that relies on middie for those controls. Users should upgrade to @fastify/middie 9.3.4 or later.\n\n📅 Published Date: 2026-09-04T09:15:51.216Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85184",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99106:00000000285737d5",
    "content_hash": "00000000285737d5034b",
    "published_at": "2026-09-04T09:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85184",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002857",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85184\n\n📢 Source: openjs\n\n💣 CVSS Score: 9.1 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\n@fastify/middie versions >= 9.1.0 and before 9.3.4 decide whether to run path-scoped middleware by ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000c18b21b",
    "cve_id": "CVE-2026-81302",
    "slug": "cve-2026-81302",
    "title": "CVE-2026-81302: 🚨 CVE-2026-81302",
    "summary": "🚨 CVE-2026-81302\n\n📢 Source: jpcert\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nPALLET CONTROL products contain an incorrect default permission vulnerability, which may allow a local attacker to execute arbitrary code with SYSTEM privileges on the affected product.\n\n📅 Published Dat...",
    "body": "🚨 CVE-2026-81302\n\n📢 Source: jpcert\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nPALLET CONTROL products contain an incorrect default permission vulnerability, which may allow a local attacker to execute arbitrary code with SYSTEM privileges on the affected product.\n\n📅 Published Date: 2026-09-04T09:04:08.947Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-81302",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99102:000000000c18b21b",
    "content_hash": "000000000c18b21b0176",
    "published_at": "2026-09-04T09:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-81302",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000c18",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-81302\n\n📢 Source: jpcert\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nPALLET CONTROL products contain an incorrect default permission vulnerability, which may allow a local ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005f438f1c",
    "cve_id": "CVE-2026-81665",
    "slug": "cve-2026-81665",
    "title": "CVE-2026-81665: 🚨 CVE-2026-81665",
    "summary": "🚨 CVE-2026-81665\n\n📢 Source: redhat\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nA heap-based buffer overflow was found in Corosync's Totem Process Group (totempg) message reassembly. When processing fragmented multicast messages, the buffer used to reassemble fragments lacks a runti...",
    "body": "🚨 CVE-2026-81665\n\n📢 Source: redhat\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nA heap-based buffer overflow was found in Corosync's Totem Process Group (totempg) message reassembly. When processing fragmented multicast messages, the buffer used to reassemble fragments lacks a runtime bounds check in release builds. A network-adjacent attacker able to send crafted multicast protocol messages to the cluster could cause a heap buffer overflow with attacker-controlled data. This can crash the Corosync daemon, causing a denial of service to the entire cluster, and may potentially allow further exploitation given sufficient heap-corruption control.\n\n📅 Published Date: 2026-09-04T09:05:35.890Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-81665",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99103:000000005f438f1c",
    "content_hash": "000000005f438f1c02f8",
    "published_at": "2026-09-04T09:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-81665",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005f43",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-81665\n\n📢 Source: redhat\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nA heap-based buffer overflow was found in Corosync's Totem Process Group (totempg) message reassembly. ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000164cafe7",
    "cve_id": "CVE-2026-85538",
    "slug": "cve-2026-85538",
    "title": "CVE-2026-85538: 🚨 CVE-2026-85538",
    "summary": "🚨 CVE-2026-85538\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 8.3 (HIGH)\n\n📡 Remotely Exploitable: True\n\nAn incorrect authorization vulnerability in MISP allowed authenticated users to delete attributes from events despite lacking the required perm_modify or perm_modify_org permissions.\n\nThe affected attribut...",
    "body": "🚨 CVE-2026-85538\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 8.3 (HIGH)\n\n📡 Remotely Exploitable: True\n\nAn incorrect authorization vulnerability in MISP allowed authenticated users to delete attributes from events despite lacking the required perm_modify or perm_modify_org permissions.\n\nThe affected attribute deletion paths relied on organization membership checks performed by MispAttribute::deleteAttribute() but did not consistently enforce MISP's event modification authorization rules. Consequently, a user belonging to the organization associated with an event could potentially delete individual attributes or perform bulk attribute deletion even when their assigned role was not authorized to modify the event.\n\nThis created an inconsistency between attribute editing and deletion: editing an attribute correctly used MISP's ACL::canModifyEvent() authorization logic, whereas the affected deletion operations could bypass these permission checks.\n\nAn authenticated attacker with access to an affected MISP instance and membership in the organization owning an event could exploit this flaw to remove attributes from that event, potentially causing unauthorized modification or loss of threat intelligence data.\n\nThe patch introduces a common authorization check for all affected deletion paths. Before deletion, MISP now resolves the associated events and verifies that the current user is authorized to modify each event using the same authorization mechanism used by normal event and attribute modification operations.\n\n📅 Published Date: 2026-09-04T09:05:41.350Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85538",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99104:00000000164cafe7",
    "content_hash": "00000000164cafe7064d",
    "published_at": "2026-09-04T09:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85538",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000164c",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85538\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 8.3 (HIGH)\n\n📡 Remotely Exploitable: True\n\nAn incorrect authorization vulnerability in MISP allowed authenticated users to delete attributes from ev",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000019c49abc",
    "cve_id": "CVE-2026-85533",
    "slug": "cve-2026-85533",
    "title": "CVE-2026-85533: 🚨 CVE-2026-85533",
    "summary": "🚨 CVE-2026-85533\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nAn authorization flaw in MISP allowed an authenticated user to submit a sharing_group_id without verifying that the user was authorized to use the referenced Sharing Group.\n\nIn several attribute and Galaxy...",
    "body": "🚨 CVE-2026-85533\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nAn authorization flaw in MISP allowed an authenticated user to submit a sharing_group_id without verifying that the user was authorized to use the referenced Sharing Group.\n\nIn several attribute and Galaxy Cluster creation and editing workflows, validation of the submitted Sharing Group was performed only when the request explicitly set the distribution field to 4 (\"Sharing Group\"). An attacker could therefore craft a request containing a sharing_group_id while omitting the distribution parameter, or otherwise avoiding the distribution == 4 condition, causing the Sharing Group authorization check to be skipped.\n\nThis could allow a user with permission to create or modify the affected MISP objects to associate data with a Sharing Group that they are not authorized to use. Depending on the affected object's existing distribution settings and subsequent processing, this could bypass intended information-sharing boundaries and result in unauthorized placement or distribution of data to members of another Sharing Group.\n\nThe issue affected attribute attachment and editing operations as well as Galaxy Cluster creation and editing. The fix ensures that authorization is performed whenever a non-empty sharing_group_id is submitted, independently of the distribution parameter. It also centralizes the authorization decision in SharingGroup::canUse() and explicitly rejects empty Sharing Group identifiers rather than allowing them to be interpreted as an unrestricted query.\n\n📅 Published Date: 2026-09-04T08:53:46.725Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85533",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99101:0000000019c49abc",
    "content_hash": "0000000019c49abc0688",
    "published_at": "2026-09-04T09:00:05.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85533",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000019c4",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85533\n\n📢 Source: CIRCL\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nAn authorization flaw in MISP allowed an authenticated user to submit a sharing_group_id without verifyin",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:00:05.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001b376dfc",
    "cve_id": "CVE-2026-27432",
    "slug": "cve-2026-27432",
    "title": "CVE-2026-27432: 🚨 CVE-2026-27432",
    "summary": "🚨 CVE-2026-27432\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.4 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nAuthorization Bypass Through User-Controlled Key vulnerability in sc Internet Vivoo WP Rentals allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects WP Rentals...",
    "body": "🚨 CVE-2026-27432\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.4 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nAuthorization Bypass Through User-Controlled Key vulnerability in sc Internet Vivoo WP Rentals allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects WP Rentals: from n/a before 3.16.0.\n\n📅 Published Date: 2026-09-04T08:45:06.734Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-27432",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99100:000000001b376dfc",
    "content_hash": "000000001b376dfc01a1",
    "published_at": "2026-09-04T09:00:05.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-27432",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001b37",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-27432\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.4 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nAuthorization Bypass Through User-Controlled Key vulnerability in sc Internet Vivoo WP Rentals all",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T09:00:05.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000121bd99a",
    "cve_id": "CVE-2026-85528",
    "slug": "cve-2026-85528",
    "title": "CVE-2026-85528: 🚨 CVE-2026-85528",
    "summary": "🚨 CVE-2026-85528\n\n📢 Source: SNOWFLAKE\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nImproper input validation of the auto-configuration account identifier in Snowflake JDBC Driver versions 4.2.0 through 4.3.3 allowed a credential-bearing login request to be redirected to an attacker...",
    "body": "🚨 CVE-2026-85528\n\n📢 Source: SNOWFLAKE\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nImproper input validation of the auto-configuration account identifier in Snowflake JDBC Driver versions 4.2.0 through 4.3.3 allowed a credential-bearing login request to be redirected to an attacker-selected HTTPS endpoint. An attacker able to control the account value could cause the driver to transmit a reusable login credential to a host of their choosing and replay it to obtain the privileges granted to that credential. Successful exploitation requires an application using jdbc:snowflake:auto with a connections.toml section that omits an explicit host and a lower-trust principal able to set the account value; ordinary JDBC URLs are unaffected. The fix is available in Snowflake JDBC Driver version 4.3.4. Users must manually upgrade.\n\n📅 Published Date: 2026-09-04T08:36:28.553Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85528",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99099:00000000121bd99a",
    "content_hash": "00000000121bd99a03ab",
    "published_at": "2026-09-04T08:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85528",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000121b",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85528\n\n📢 Source: SNOWFLAKE\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nImproper input validation of the auto-configuration account identifier in Snowflake JDBC Driver ver",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T08:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000006c0cd801",
    "cve_id": "CVE-2026-75604",
    "slug": "cve-2026-75604",
    "title": "CVE-2026-75604: 🔺 **Критическая RCE в Next.js на Windows-хостинге — CVE-2026-75604**",
    "summary": "🔺 **Критическая RCE в Next.js на Windows-хостинге — CVE-2026-75604**\n\nВ Next.js обнаружен обход пути в кеше файловой системы (CWE-22). Проблема — в FileSystemCache: в Windows он не экранирует обратный слеш (`\\`) как разделитель пути, из-за чего атакующий может закодировать `..%5C` и выйти за предел...",
    "body": "🔺 **Критическая RCE в Next.js на Windows-хостинге — CVE-2026-75604**\n\nВ Next.js обнаружен обход пути в кеше файловой системы (CWE-22). Проблема — в FileSystemCache: в Windows он не экранирует обратный слеш (`\\`) как разделитель пути, из-за чего атакующий может закодировать `..%5C` и выйти за пределы каталога кеша. \n\nЭто позволяет прочитать приватный файл `server-reference-manifest.json` и получить encryptionKey Server Action. Дальше злоумышленник подделывает запрос к closure-bound Server Action и выполняет произвольную команду на сервере.\n\nЗатронуты:\nNext.js ≥13.4 <15.5.24.\nNext.js ≥16.0 <16.3.3.\n\nДля эксплуатации требуется сочетание условий:\n🔵 Next.js работает непосредственно на Windows.\n🔵 Используются Pages Router и App Router.\n🔵 Cache Components не включены.\n🔵 Используется стандартный файловый кеш.\n🔵 Доступны динамический ISR-маршрут Pages Router и кешируемый App Router route.\n🔵В приложении присутствует совместимый closure-bound Server Action. \n\nВ открытом доступе уже появился PoC на Python, который автоматизирует всю цепочку — от обхода пути до RCE через callback-соединение с целевого сервера.\n\n**Рекомендуем:**\n🔵 Как можно скорее обновиться до Next.js 15.5.24 (ветка 15.x) или 16.3.3 (ветка 16.x).\n🔵 Если обновление пока невозможно — перейти на Cache Components либо отказаться от одновременного использования Pages Router и App Router на Windows-хостах: это убирает необходимые для эксплуатации условия.\n🔵 Проверить логи веб-сервера на запросы с кодированными обратными слешами (..%5C) к путям кеша — это может быть признаком попытки эксплуатации.\n\nПользователям BI.ZОNE WAF уже доступны правила, которые предотвращают попытки эксплуатации. А в BI.ZОNE EASM есть правила детектирования данной уязвимости.",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:2907:000000006c0cd801",
    "content_hash": "000000006c0cd80106c9",
    "published_at": "2026-09-04T08:37:13.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-75604",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006c0c",
        "type": "CVE_DISCLOSURE",
        "snippet": "🔺 **Критическая RCE в Next.js на Windows-хостинге — CVE-2026-75604**\n\nВ Next.js обнаружен обход пути в кеше файловой системы (CWE-22). Проблема — в FileSystemCache: в Windows он не экранирует обратны",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T08:37:13.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000004f849a8",
    "cve_id": "CVE-2026-57777",
    "slug": "cve-2026-57777",
    "title": "CVE-2026-57777: 🚨 CVE-2026-57777",
    "summary": "🚨 CVE-2026-57777\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nImproper Neutralization of Special Elements used in an SQL Command ('SQL Injection') vulnerability in Automattic WooCommerce allows Blind SQL Injection.\n\nThis issue affects WooCommerce: from n/a befor...",
    "body": "🚨 CVE-2026-57777\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nImproper Neutralization of Special Elements used in an SQL Command ('SQL Injection') vulnerability in Automattic WooCommerce allows Blind SQL Injection.\n\nThis issue affects WooCommerce: from n/a before 11.0.\n\n📅 Published Date: 2026-09-04T08:12:00.611Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-57777",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99096:0000000004f849a8",
    "content_hash": "0000000004f849a8018f",
    "published_at": "2026-09-04T08:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-57777",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000004f8",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-57777\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nImproper Neutralization of Special Elements used in an SQL Command ('SQL Injection') vulnerability i",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T08:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000039b06fa4",
    "cve_id": "CVE-2026-85311",
    "slug": "cve-2026-85311",
    "title": "CVE-2026-85311: 🚨 CVE-2026-85311",
    "summary": "🚨 CVE-2026-85311\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in Kings Plugins MarketKing allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects MarketKing: from n/a through 2.1.60.\n\n📅 ...",
    "body": "🚨 CVE-2026-85311\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in Kings Plugins MarketKing allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects MarketKing: from n/a through 2.1.60.\n\n📅 Published Date: 2026-09-04T08:07:22.994Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85311",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99097:0000000039b06fa4",
    "content_hash": "0000000039b06fa40183",
    "published_at": "2026-09-04T08:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85311",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000039b0",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85311\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in Kings Plugins MarketKing allows Exploiting Incorrectly Conf",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T08:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000002529e499",
    "cve_id": "CVE-2026-85525",
    "slug": "cve-2026-85525",
    "title": "CVE-2026-85525: 🚨 CVE-2026-85525",
    "summary": "🚨 CVE-2026-85525\n\n📢 Source: SNOWFLAKE\n\n💣 CVSS Score: 7.4 (HIGH)\n\n📡 Remotely Exploitable: True\n\nImproper OCSP response validation in the Snowflake Python, Go, JDBC, and Node.js drivers allowed a revoked TLS certificate to be accepted as valid, because OCSP responses were not reliably bound to the...",
    "body": "🚨 CVE-2026-85525\n\n📢 Source: SNOWFLAKE\n\n💣 CVSS Score: 7.4 (HIGH)\n\n📡 Remotely Exploitable: True\n\nImproper OCSP response validation in the Snowflake Python, Go, JDBC, and Node.js drivers allowed a revoked TLS certificate to be accepted as valid, because OCSP responses were not reliably bound to the certificate being validated and definitive verification failures were treated as transient. A man-in-the-middle attacker holding a revoked certificate and its private key for a Snowflake or stage hostname could cause the driver to establish a TLS session to the attacker-controlled endpoint anyway, allowing the attacker to read and modify data transmitted within that connection. Successful exploitation requires that on-path position and the corresponding private key, and impact is limited to data carried within the intercepted connection. The fix is available in the patched versions listed above. Users must manually upgrade.\n\n📅 Published Date: 2026-09-04T08:22:43.369Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85525",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99098:000000002529e499",
    "content_hash": "000000002529e4990400",
    "published_at": "2026-09-04T08:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85525",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002529",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85525\n\n📢 Source: SNOWFLAKE\n\n💣 CVSS Score: 7.4 (HIGH)\n\n📡 Remotely Exploitable: True\n\nImproper OCSP response validation in the Snowflake Python, Go, JDBC, and Node.js drivers allowed a re",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T08:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000022770cf7",
    "cve_id": "CVE-2026-32480",
    "slug": "cve-2026-32480",
    "title": "CVE-2026-32480: 🚨 CVE-2026-32480",
    "summary": "🚨 CVE-2026-32480\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in WC Lovers WCFM Membership allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects WCFM Membership: from n/a through 2.11.1...",
    "body": "🚨 CVE-2026-32480\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in WC Lovers WCFM Membership allows Exploiting Incorrectly Configured Access Control Security Levels.\n\nThis issue affects WCFM Membership: from n/a through 2.11.11.\n\n📅 Published Date: 2026-09-04T08:02:19.141Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-32480",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99095:0000000022770cf7",
    "content_hash": "0000000022770cf7018a",
    "published_at": "2026-09-04T08:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-32480",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002277",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-32480\n\n📢 Source: Patchstack\n\n💣 CVSS Score: 5.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nMissing Authorization vulnerability in WC Lovers WCFM Membership allows Exploiting Incorrectly Con",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T08:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000006eb88e31",
    "cve_id": "CVE-2026-85197",
    "slug": "cve-2026-85197",
    "title": "CVE-2026-85197: 🚨 CVE-2026-85197",
    "summary": "🚨 CVE-2026-85197\n\n📢 Source: redhat\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA flaw was found in libsoup. A malicious HTTP/2 server or a Man-in-the-Middle (MITM) attacker can exploit a heap use-after-free vulnerability in the HTTP/2 client implementation. This occurs when a GNOME ...",
    "body": "🚨 CVE-2026-85197\n\n📢 Source: redhat\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA flaw was found in libsoup. A malicious HTTP/2 server or a Man-in-the-Middle (MITM) attacker can exploit a heap use-after-free vulnerability in the HTTP/2 client implementation. This occurs when a GNOME application uploads a file using HTTP/2, and the server sends a GOAWAY frame while the file body is being read asynchronously. This can lead to memory corruption, potentially resulting in information disclosure or arbitrary code execution.\n\n📅 Published Date: 2026-09-04T07:34:31.869Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85197",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99094:000000006eb88e31",
    "content_hash": "000000006eb88e310277",
    "published_at": "2026-09-04T07:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85197",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006eb8",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85197\n\n📢 Source: redhat\n\n💣 CVSS Score: 7.6 (HIGH)\n\n📡 Remotely Exploitable: True\n\nA flaw was found in libsoup. A malicious HTTP/2 server or a Man-in-the-Middle (MITM) attacker can exploi",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000332610d4",
    "cve_id": "CVE-2026-6217",
    "slug": "cve-2026-6217",
    "title": "CVE-2026-6217: 🚨 CVE-2026-6217",
    "summary": "🚨 CVE-2026-6217\n\n📢 Source: TR-CERT\n\n💣 CVSS Score: 6.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nUse of a One-Way hash without a salt vulnerability in Pik Online Software Solutions Inc. Pik Online Portal allows Cryptanalysis.\n\nThis issue affects Pik Online Portal: through 3.5.1.\n\n📅 Published Date:...",
    "body": "🚨 CVE-2026-6217\n\n📢 Source: TR-CERT\n\n💣 CVSS Score: 6.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nUse of a One-Way hash without a salt vulnerability in Pik Online Software Solutions Inc. Pik Online Portal allows Cryptanalysis.\n\nThis issue affects Pik Online Portal: through 3.5.1.\n\n📅 Published Date: 2026-09-04T07:27:16.927Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-6217",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99093:00000000332610d4",
    "content_hash": "00000000332610d40173",
    "published_at": "2026-09-04T07:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-6217",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003326",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-6217\n\n📢 Source: TR-CERT\n\n💣 CVSS Score: 6.3 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nUse of a One-Way hash without a salt vulnerability in Pik Online Software Solutions Inc. Pik Online Po",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000326a9aa2",
    "cve_id": "CVE-2026-80190",
    "slug": "cve-2026-80190",
    "title": "CVE-2026-80190: 🚨 CVE-2026-80190",
    "summary": "🚨 CVE-2026-80190\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura: stored XSS via SVN code repositories.  Git repositories are not known to be affected.  The vulnerability is likely mitigated via default CSP headers.\n\n\n\nThis issue affects Apache Allura: thr...",
    "body": "🚨 CVE-2026-80190\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura: stored XSS via SVN code repositories.  Git repositories are not known to be affected.  The vulnerability is likely mitigated via default CSP headers.\n\n\n\nThis issue affects Apache Allura: through 1.20.0.\n\n\n\nUsers are recommended to upgrade to version 1.21.0, which fixes the issue.\n\n📅 Published Date: 2026-09-04T07:06:19.844Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-80190",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99091:00000000326a9aa2",
    "content_hash": "00000000326a9aa201e2",
    "published_at": "2026-09-04T07:30:05.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-80190",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000326a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-80190\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura: stored XSS via SVN code repositories.  Git repositories are not known to be affected.  The",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:30:05.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000004e9e2c04",
    "cve_id": "CVE-2026-85229",
    "slug": "cve-2026-85229",
    "title": "CVE-2026-85229: 🚨 CVE-2026-85229",
    "summary": "🚨 CVE-2026-85229\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\n** UNSUPPORTED WHEN ASSIGNED ** Improper neutralization of input during web page generation ('cross-site scripting') vulnerability in Apache SkyWalking Booster UI.\n\n\n\nThis issue affects Apache SkyWalking U...",
    "body": "🚨 CVE-2026-85229\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\n** UNSUPPORTED WHEN ASSIGNED ** Improper neutralization of input during web page generation ('cross-site scripting') vulnerability in Apache SkyWalking Booster UI.\n\n\n\nThis issue affects Apache SkyWalking UI : from 10.2.0 through 10.4.0.\n\n\n\nUsers are recommended to upgrade to Horizon UI 1.0.0, which fixes the issue.\n\n📅 Published Date: 2026-09-04T07:01:39.869Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85229",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99092:000000004e9e2c04",
    "content_hash": "000000004e9e2c0401f7",
    "published_at": "2026-09-04T07:30:05.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85229",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000004e9e",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85229\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\n** UNSUPPORTED WHEN ASSIGNED ** Improper neutralization of input during web page generation ('cross-site ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:30:05.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003d7c0d2d",
    "cve_id": "CVE-2026-80181",
    "slug": "cve-2026-80181",
    "title": "CVE-2026-80181: 🚨 CVE-2026-80181",
    "summary": "🚨 CVE-2026-80181\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura's webhooks are vulnerable to Server-Side Request Forgery (SSRF).\n\n\n\n\nThis issue affects Apache Allura: through 1.20.0.\n\n\n\nUsers are recommended to upgrade to version 1.21.0, which fixes the i...",
    "body": "🚨 CVE-2026-80181\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura's webhooks are vulnerable to Server-Side Request Forgery (SSRF).\n\n\n\n\nThis issue affects Apache Allura: through 1.20.0.\n\n\n\nUsers are recommended to upgrade to version 1.21.0, which fixes the issue.\n\n📅 Published Date: 2026-09-04T06:52:42.990Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-80181",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99089:000000003d7c0d2d",
    "content_hash": "000000003d7c0d2d018d",
    "published_at": "2026-09-04T07:15:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-80181",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003d7c",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-80181\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura's webhooks are vulnerable to Server-Side Request Forgery (SSRF).\n\n\n\n\nThis issue affects Apa",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:15:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000006ca1767a",
    "cve_id": "CVE-2026-81270",
    "slug": "cve-2026-81270",
    "title": "CVE-2026-81270: 🚨 CVE-2026-81270",
    "summary": "🚨 CVE-2026-81270\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura: exposure of non-public information via search.\n\n\n\nThis issue affects Apache Allura: through 1.20.0.\n\n\n\nUsers are recommended to upgrade to version 1.21.0, which fixes the issue.\n\n📅 Publishe...",
    "body": "🚨 CVE-2026-81270\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura: exposure of non-public information via search.\n\n\n\nThis issue affects Apache Allura: through 1.20.0.\n\n\n\nUsers are recommended to upgrade to version 1.21.0, which fixes the issue.\n\n📅 Published Date: 2026-09-04T06:59:49.532Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-81270",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99090:000000006ca1767a",
    "content_hash": "000000006ca1767a017b",
    "published_at": "2026-09-04T07:15:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-81270",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006ca1",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-81270\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nApache Allura: exposure of non-public information via search.\n\n\n\nThis issue affects Apache Allura: throug",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:15:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003c93be71",
    "cve_id": "CVE-2026-71216",
    "slug": "cve-2026-71216",
    "title": "CVE-2026-71216: 🚨 CVE-2026-71216",
    "summary": "🚨 CVE-2026-71216\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nPagerDuty alarm hook transmits the integration routing key over cleartext HTTP.\n\n\n\nPagerDuty serves this endpoint over HTTPS and will\nnormally answer plain HTTP with a redirect. That does not remove the ex...",
    "body": "🚨 CVE-2026-71216\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nPagerDuty alarm hook transmits the integration routing key over cleartext HTTP.\n\n\n\nPagerDuty serves this endpoint over HTTPS and will\nnormally answer plain HTTP with a redirect. That does not remove the exposure.\nThe initial POST -- including the JSON body containing the routing key -- is\nwritten to the socket unencrypted before any redirect response is received.\nRedirection affects only whether the request is retried securely, not whether\nthe first copy left the host in the clear.\n\n\n\nThis issue affects Apache SkyWalking: from 9.6.0 through 11.0.0.\n\n\n\nUsers are recommended to upgrade to version 11.0.0, which fixes the issue.\n\n📅 Published Date: 2026-09-04T06:55:59.485Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-71216",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99088:000000003c93be71",
    "content_hash": "000000003c93be710333",
    "published_at": "2026-09-04T07:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-71216",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003c93",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-71216\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nPagerDuty alarm hook transmits the integration routing key over cleartext HTTP.\n\n\n\nPagerDuty serves this ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000011e6dac2",
    "cve_id": "CVE-2026-80180",
    "slug": "cve-2026-80180",
    "title": "CVE-2026-80180: 🚨 CVE-2026-80180",
    "summary": "🚨 CVE-2026-80180\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nStored XSS via markdown HTML processing in Apache Allura.\n\n\n\nThis issue affects Apache Allura: from through 1.20.0.\n\n\n\nUsers are recommended to upgrade to version 1.21.0, which fixes the issue.\n\n📅 Publish...",
    "body": "🚨 CVE-2026-80180\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nStored XSS via markdown HTML processing in Apache Allura.\n\n\n\nThis issue affects Apache Allura: from through 1.20.0.\n\n\n\nUsers are recommended to upgrade to version 1.21.0, which fixes the issue.\n\n📅 Published Date: 2026-09-04T06:50:14.773Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-80180",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99087:0000000011e6dac2",
    "content_hash": "0000000011e6dac2017c",
    "published_at": "2026-09-04T07:00:08.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-80180",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000011e6",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-80180\n\n📢 Source: apache\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nStored XSS via markdown HTML processing in Apache Allura.\n\n\n\nThis issue affects Apache Allura: from throu",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:00:08.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000053933f16",
    "cve_id": "CVE-2026-62928",
    "slug": "cve-2026-62928",
    "title": "CVE-2026-62928: 🚨 CVE-2026-62928",
    "summary": "🚨 CVE-2026-62928\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains an OS Command Injection (CWE-78). Unauthenticated OS command may be injected.\n\n📅 Published Date: 2026-09-04T06:31:37.342Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62928",
    "body": "🚨 CVE-2026-62928\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains an OS Command Injection (CWE-78). Unauthenticated OS command may be injected.\n\n📅 Published Date: 2026-09-04T06:31:37.342Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62928",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99083:0000000053933f16",
    "content_hash": "0000000053933f160129",
    "published_at": "2026-09-04T07:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-62928",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005393",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-62928\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains an OS Command Injection (CWE-78). Unauthenticated OS command may be inje",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000e235d4f",
    "cve_id": "CVE-2026-66840",
    "slug": "cve-2026-66840",
    "title": "CVE-2026-66840: 🚨 CVE-2026-66840",
    "summary": "🚨 CVE-2026-66840\n\n📢 Source: jpcert\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains an Exposure of Sensitive System Information to an Unauthorized Control Sphere (CWE-497). Sensitive system information may be leaked.\n\n📅 Published Date: 2026-09-04T06:31:44.601...",
    "body": "🚨 CVE-2026-66840\n\n📢 Source: jpcert\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains an Exposure of Sensitive System Information to an Unauthorized Control Sphere (CWE-497). Sensitive system information may be leaked.\n\n📅 Published Date: 2026-09-04T06:31:44.601Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-66840",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99084:000000000e235d4f",
    "content_hash": "000000000e235d4f015c",
    "published_at": "2026-09-04T07:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-66840",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000e23",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-66840\n\n📢 Source: jpcert\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains an Exposure of Sensitive System Information to an Unauthorized Control Spher",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000b40c538",
    "cve_id": "CVE-2026-69657",
    "slug": "cve-2026-69657",
    "title": "CVE-2026-69657: 🚨 CVE-2026-69657",
    "summary": "🚨 CVE-2026-69657\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains a Use of Default Password (CWE-1393). Anyone with the knowledge of the credential may log in to the affected device.\n\n📅 Published Date: 2026-09-04T06:31:50.611Z\n\nhttps://c...",
    "body": "🚨 CVE-2026-69657\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains a Use of Default Password (CWE-1393). Anyone with the knowledge of the credential may log in to the affected device.\n\n📅 Published Date: 2026-09-04T06:31:50.611Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-69657",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99085:000000000b40c538",
    "content_hash": "000000000b40c5380150",
    "published_at": "2026-09-04T07:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-69657",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000b40",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-69657\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains a Use of Default Password (CWE-1393). Anyone with the knowledge of the c",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000058da2b2e",
    "cve_id": "CVE-2026-70403",
    "slug": "cve-2026-70403",
    "title": "CVE-2026-70403: 🚨 CVE-2026-70403",
    "summary": "🚨 CVE-2026-70403\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains a Use of Hard-coded Password (CWE-259). Anyone with the knowledge of the credential may log in to the affected device.\n\n📅 Published Date: 2026-09-04T06:31:56.293Z\n\nhttps:/...",
    "body": "🚨 CVE-2026-70403\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains a Use of Hard-coded Password (CWE-259). Anyone with the knowledge of the credential may log in to the affected device.\n\n📅 Published Date: 2026-09-04T06:31:56.293Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-70403",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99086:0000000058da2b2e",
    "content_hash": "0000000058da2b2e0152",
    "published_at": "2026-09-04T07:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-70403",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000058da",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-70403\n\n📢 Source: jpcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nXING CPTrans-ME-X contains a Use of Hard-coded Password (CWE-259). Anyone with the knowledge of the",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000afa4b2f",
    "cve_id": "CVE-2026-15354",
    "slug": "cve-2026-15354",
    "title": "CVE-2026-15354: 🚨 CVE-2026-15354",
    "summary": "🚨 CVE-2026-15354\n\n📢 Source: Wordfence\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe ACPT (Premium) plugin for WordPress is vulnerable to Privilege Escalation in all versions up to, and including, 2.0.66. This is due to missing authorization in the `submit()` function, which allows ...",
    "body": "🚨 CVE-2026-15354\n\n📢 Source: Wordfence\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe ACPT (Premium) plugin for WordPress is vulnerable to Privilege Escalation in all versions up to, and including, 2.0.66. This is due to missing authorization in the `submit()` function, which allows unauthenticated form submissions to control the target user ID before calling `wp_update_user()`. This makes it possible for unauthenticated attackers to overwrite any WordPress user's email address and password, including an administrator's, and take over the account. Successful exploitation requires a public ACPT user form that permits anonymous submissions.\n\n📅 Published Date: 2026-09-04T06:40:26.391Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-15354",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99082:000000000afa4b2f",
    "content_hash": "000000000afa4b2f02f2",
    "published_at": "2026-09-04T07:00:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-15354",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000afa",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-15354\n\n📢 Source: Wordfence\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe ACPT (Premium) plugin for WordPress is vulnerable to Privilege Escalation in all versions up to, a",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T07:00:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000004cddc236",
    "cve_id": null,
    "slug": "intel_000000004cddc236",
    "title": "Старший эксперт по анализу уязвимостей кибербезопасности.",
    "summary": "**Старший эксперт по анализу уязвимостей кибербезопасности.\n\nЛокация:** #Москва.\n**Опыт:** 3–6 лет.\n**Зарплата:** ₽. Обсуждается на собеседовании.\n**Компания:** Альфа-Банк.\n\n**Обязанности:\n**•  Анализ результатов сканирования, верификация ложных срабатываний и приоритизация найденных уязвимостей;\n• ...",
    "body": "**Старший эксперт по анализу уязвимостей кибербезопасности.\n\nЛокация:** #Москва.\n**Опыт:** 3–6 лет.\n**Зарплата:** ₽. Обсуждается на собеседовании.\n**Компания:** Альфа-Банк.\n\n**Обязанности:\n**•  Анализ результатов сканирования, верификация ложных срабатываний и приоритизация найденных уязвимостей;\n•  Взаимодействие с ИТ-подразделениями для контроля устранения уязвимостей и оценки эффективности принятых мер;\n•  Мониторинг актуальных угроз, CVE-бюллетеней и вендорских обновлений, трендовых уязвимостей и тд;\n•  Контроль внешних утечек паролей пользователей в сети Интернет;\n•  Выполнение контрольных мероприятий (аудиты) на соответствие требованиям ИБ (внутренние политики, стандарты, требования регуляторов);\n•  Разработка и актуализация нормативных документов, технических стандартов безопасности и инструкций;\n•  Контроль соблюдения подразделениями требований ИБ, формирование отчетности о выявленных несоответствиях;\n•  Автоматизация процессов Vulnerability Management (сбор данных, обогащение, передача задач ответственным);\n•  Участие в формировании технических требований по ИБ к новым системам и сервисам.\n\n**Требования:\n**•  Опыт работы в практической информационной безопасности от 3-х лет;\n•  Понимание процесса управления уязвимостями (Vulnerability Management Lifecycle);\n•  Опыт работы с инструментальными средствами анализа защищенности (Nessus, MaxPatrol VM, Red Check, OpenVAS, Qualys и др.);\n•  Понимание сетевых технологий: модель OSI, стек TCP/IP, принципы работы HTTP/HTTPS, DNS, DHCP, VLAN, VPN;\n•  Практические навыки администрирования ОС Windows и Linux (понимание механизмов обновлений, настройки безопасности, сервисов);\n•  Понимание принципов безопасного построения сетей (сегментация, микросегментация, DMZ);\n•  Знание международных и российских стандартов ИБ (ISO 27001, NIST, ГОСТ Р 57580, требования ФСТЭК/ЦБ РФ);\n•  Умение работать с базами уязвимостей (CVE, NVD, БДУ ФСТЭК) и метриками оценки (CVSS, EPSS).\n\n✈ Откликнуться.\n\n#Гибрид",
    "severity": "MEDIUM",
    "confidence_score": 0.81,
    "deduplication_key": "tg_0:4239:000000004cddc236",
    "content_hash": "000000004cddc23607af",
    "published_at": "2026-09-04T06:50:46.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000004cdd",
        "type": "TELEGRAM_TELEMETRY",
        "snippet": "**Старший эксперт по анализу уязвимостей кибербезопасности.\n\nЛокация:** #Москва.\n**Опыт:** 3–6 лет.\n**Зарплата:** ₽. Обсуждается на собеседовании.\n**Компания:** Альфа-Банк.\n\n**Обязанности:\n**•  Анализ",
        "weight": 0.81,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:50:46.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000057f00e54",
    "cve_id": "CVE-2026-85094",
    "slug": "cve-2026-85094",
    "title": "CVE-2026-85094: 🚨 CVE-2026-85094",
    "summary": "🚨 CVE-2026-85094\n\n📢 Source: Canva\n\n💣 CVSS Score: 8.8 (HIGH)\n\n📡 Remotely Exploitable: True\n\nThe Canva Android App  before 2.376.0 did not restrict the headers returned to an external origin running in a privileged WebView. A threat actor with control of the WebView could access a user’s session.\n...",
    "body": "🚨 CVE-2026-85094\n\n📢 Source: Canva\n\n💣 CVSS Score: 8.8 (HIGH)\n\n📡 Remotely Exploitable: True\n\nThe Canva Android App  before 2.376.0 did not restrict the headers returned to an external origin running in a privileged WebView. A threat actor with control of the WebView could access a user’s session.\n\n📅 Published Date: 2026-09-04T06:02:47.444Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85094",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99081:0000000057f00e54",
    "content_hash": "0000000057f00e540187",
    "published_at": "2026-09-04T06:30:23.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85094",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000057f0",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85094\n\n📢 Source: Canva\n\n💣 CVSS Score: 8.8 (HIGH)\n\n📡 Remotely Exploitable: True\n\nThe Canva Android App  before 2.376.0 did not restrict the headers returned to an external origin running",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:23.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003944972e",
    "cve_id": "CVE-2026-85085",
    "slug": "cve-2026-85085",
    "title": "CVE-2026-85085: 🚨 CVE-2026-85085",
    "summary": "🚨 CVE-2026-85085\n\n📢 Source: Canva\n\n💣 CVSS Score: 9.6 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nThe Canva Android App before 2.376.0 allowed an external origin to be loaded in a privileged WebView. A threat actor who controls the page loaded by the user is able to communicate with Canva using the...",
    "body": "🚨 CVE-2026-85085\n\n📢 Source: Canva\n\n💣 CVSS Score: 9.6 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nThe Canva Android App before 2.376.0 allowed an external origin to be loaded in a privileged WebView. A threat actor who controls the page loaded by the user is able to communicate with Canva using the user’s session.\n\n📅 Published Date: 2026-09-04T06:00:46.389Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85085",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99080:000000003944972e",
    "content_hash": "000000003944972e0198",
    "published_at": "2026-09-04T06:30:23.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85085",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003944",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85085\n\n📢 Source: Canva\n\n💣 CVSS Score: 9.6 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nThe Canva Android App before 2.376.0 allowed an external origin to be loaded in a privileged WebView.",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:23.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000004ea1b524",
    "cve_id": "CVE-2026-82193",
    "slug": "cve-2026-82193",
    "title": "CVE-2026-82193: 🚨 CVE-2026-82193",
    "summary": "🚨 CVE-2026-82193\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPvivid — Backup, Migration & Staging WordPress plugin before 0.9.134 does not validate a user supplied file name before using it to build a write path, allowing administrators to write files of permit...",
    "body": "🚨 CVE-2026-82193\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPvivid — Backup, Migration & Staging WordPress plugin before 0.9.134 does not validate a user supplied file name before using it to build a write path, allowing administrators to write files of permitted types to arbitrary locations on the server and to overwrite existing files.\n\n📅 Published Date: 2026-09-04T06:00:04.900Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-82193",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99076:000000004ea1b524",
    "content_hash": "000000004ea1b52401d7",
    "published_at": "2026-09-04T06:30:17.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-82193",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000004ea1",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-82193\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPvivid — Backup, Migration & Staging WordPress plugin before 0.9.134 does not validate a user suppli",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:17.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000002ef91c06",
    "cve_id": "CVE-2026-82194",
    "slug": "cve-2026-82194",
    "title": "CVE-2026-82194: 🚨 CVE-2026-82194",
    "summary": "🚨 CVE-2026-82194\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPvivid — Backup, Migration & Staging WordPress plugin before 0.9.134 does not validate a user supplied path before using it in a file deletion routine, allowing administrators to delete arbitrary file...",
    "body": "🚨 CVE-2026-82194\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPvivid — Backup, Migration & Staging WordPress plugin before 0.9.134 does not validate a user supplied path before using it in a file deletion routine, allowing administrators to delete arbitrary files on the server, including files outside the web root.\n\n📅 Published Date: 2026-09-04T06:00:05.079Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-82194",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99077:000000002ef91c06",
    "content_hash": "000000002ef91c0601be",
    "published_at": "2026-09-04T06:30:17.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-82194",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002ef9",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-82194\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPvivid — Backup, Migration & Staging WordPress plugin before 0.9.134 does not validate a user suppli",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:17.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000045ef43c6",
    "cve_id": "CVE-2026-84066",
    "slug": "cve-2026-84066",
    "title": "CVE-2026-84066: 🚨 CVE-2026-84066",
    "summary": "🚨 CVE-2026-84066\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Directorist: AI-Powered Business Directory, Listings & Classified Ads WordPress plugin before 8.9 does not verify that the requesting user owns the post being modified before writing uploaded file refe...",
    "body": "🚨 CVE-2026-84066\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Directorist: AI-Powered Business Directory, Listings & Classified Ads WordPress plugin before 8.9 does not verify that the requesting user owns the post being modified before writing uploaded file references to its metadata, allowing users with the subscriber role and above to overwrite image metadata on posts belonging to other users.\n\n📅 Published Date: 2026-09-04T06:00:06.500Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84066",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99078:0000000045ef43c6",
    "content_hash": "0000000045ef43c60210",
    "published_at": "2026-09-04T06:30:17.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84066",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000045ef",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84066\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Directorist: AI-Powered Business Directory, Listings & Classified Ads WordPress plugin before 8.9 doe",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:17.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000040f3a996",
    "cve_id": "CVE-2026-84146",
    "slug": "cve-2026-84146",
    "title": "CVE-2026-84146: 🚨 CVE-2026-84146",
    "summary": "🚨 CVE-2026-84146\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Xpro Addons — 140+ Widgets for Elementor WordPress plugin before 1.7.8 does not perform any capability or post-status check before rendering a WooCommerce product summary from a supplied product identi...",
    "body": "🚨 CVE-2026-84146\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Xpro Addons — 140+ Widgets for Elementor WordPress plugin before 1.7.8 does not perform any capability or post-status check before rendering a WooCommerce product summary from a supplied product identifier, allowing unauthenticated visitors to retrieve the title, price, SKU, description and stock details of products that are not publicly published (draft, pending, private or scheduled status).\n\n📅 Published Date: 2026-09-04T06:00:06.679Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-84146",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99079:0000000040f3a996",
    "content_hash": "0000000040f3a996024b",
    "published_at": "2026-09-04T06:30:17.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-84146",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000040f3",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-84146\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Xpro Addons — 140+ Widgets for Elementor WordPress plugin before 1.7.8 does not perform any capabilit",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:17.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001f6f231f",
    "cve_id": "CVE-2026-82186",
    "slug": "cve-2026-82186",
    "title": "CVE-2026-82186: 🚨 CVE-2026-82186",
    "summary": "🚨 CVE-2026-82186\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPLP Cookie Consent  WordPress plugin before 4.4.2 does not properly validate a pagination parameter before using it in a SQL query, allowing users with administrator privileges to perform SQL injectio...",
    "body": "🚨 CVE-2026-82186\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPLP Cookie Consent  WordPress plugin before 4.4.2 does not properly validate a pagination parameter before using it in a SQL query, allowing users with administrator privileges to perform SQL injection attacks.\n\n📅 Published Date: 2026-09-04T06:00:04.715Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-82186",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99075:000000001f6f231f",
    "content_hash": "000000001f6f231f0192",
    "published_at": "2026-09-04T06:30:17.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-82186",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001f6f",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-82186\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPLP Cookie Consent  WordPress plugin before 4.4.2 does not properly validate a pagination parameter ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:17.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000062340cd1",
    "cve_id": "CVE-2026-81347",
    "slug": "cve-2026-81347",
    "title": "CVE-2026-81347: 🚨 CVE-2026-81347",
    "summary": "🚨 CVE-2026-81347\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Frontend Admin by DynamiApps WordPress plugin before 3.29.13 does not properly validate a user-controllable directory path before deleting files within it, allowing unauthenticated attackers to delete ...",
    "body": "🚨 CVE-2026-81347\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Frontend Admin by DynamiApps WordPress plugin before 3.29.13 does not properly validate a user-controllable directory path before deleting files within it, allowing unauthenticated attackers to delete index.php and .htaccess files outside the intended directory, including the WordPress root, which can render the site inoperable. Successful exploitation requires a non-default form configuration.\n\n📅 Published Date: 2026-09-04T06:00:04.466Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-81347",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99074:0000000062340cd1",
    "content_hash": "0000000062340cd1024c",
    "published_at": "2026-09-04T06:30:12.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-81347",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006234",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-81347\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Frontend Admin by DynamiApps WordPress plugin before 3.29.13 does not properly validate a user-contro",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:12.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003dcd2ef1",
    "cve_id": "CVE-2026-80438",
    "slug": "cve-2026-80438",
    "title": "CVE-2026-80438: 🚨 CVE-2026-80438",
    "summary": "🚨 CVE-2026-80438\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Ninja Forms  WordPress plugin before 3.15.2 does not restrict its REST abilities to administrators, accepting a Ninja Forms  WordPress plugin before 3.15.2-specific capability as equivalent to full sit...",
    "body": "🚨 CVE-2026-80438\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Ninja Forms  WordPress plugin before 3.15.2 does not restrict its REST abilities to administrators, accepting a Ninja Forms  WordPress plugin before 3.15.2-specific capability as equivalent to full site administration, which allows any user granted that capability to read Ninja Forms  WordPress plugin before 3.15.2 settings and stored form submissions, overwrite the Ninja Forms  WordPress plugin before 3.15.2's configuration, and create or modify arbitrary posts and pages.\nThe capability belongs to no default WordPress role and the Ninja Forms  WordPress plugin before 3.15.2 never grants it, so an administrator must have assigned it, typically when delegating access to the form builder.\n\n📅 Published Date: 2026-09-04T06:00:04.186Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-80438",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99073:000000003dcd2ef1",
    "content_hash": "000000003dcd2ef10376",
    "published_at": "2026-09-04T06:30:12.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-80438",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003dcd",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-80438\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Ninja Forms  WordPress plugin before 3.15.2 does not restrict its REST abilities to administrators, a",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:12.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005c2da398",
    "cve_id": "CVE-2026-79632",
    "slug": "cve-2026-79632",
    "title": "CVE-2026-79632: 🚨 CVE-2026-79632",
    "summary": "🚨 CVE-2026-79632\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not perform any authorisation or nonce check in one of its opt-in submission handlers, and takes the notification recipients and subject from the request,...",
    "body": "🚨 CVE-2026-79632\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not perform any authorisation or nonce check in one of its opt-in submission handlers, and takes the notification recipients and subject from the request, allowing unauthenticated users to make the site send emails to arbitrary recipients with an arbitrary subject.\n\n📅 Published Date: 2026-09-04T06:00:03.978Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-79632",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99072:000000005c2da398",
    "content_hash": "000000005c2da39801f7",
    "published_at": "2026-09-04T06:30:12.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-79632",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005c2d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-79632\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not perform any authorisation or nonce check in one of",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:12.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000006ff04dff",
    "cve_id": "CVE-2026-79631",
    "slug": "cve-2026-79631",
    "title": "CVE-2026-79631: 🚨 CVE-2026-79631",
    "summary": "🚨 CVE-2026-79631\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not restrict access to the log files it writes to a predictable location under the public uploads directory, allowing unauthenticated users to download cu...",
    "body": "🚨 CVE-2026-79631\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not restrict access to the log files it writes to a predictable location under the public uploads directory, allowing unauthenticated users to download customer order details and opt-in form submissions when logging is enabled.\n\n📅 Published Date: 2026-09-04T06:00:03.766Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-79631",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99071:000000006ff04dff",
    "content_hash": "000000006ff04dff01d1",
    "published_at": "2026-09-04T06:30:12.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-79631",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006ff0",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-79631\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not restrict access to the log files it writes to a pr",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:12.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000033c3041b",
    "cve_id": "CVE-2026-79630",
    "slug": "cve-2026-79630",
    "title": "CVE-2026-79630: 🚨 CVE-2026-79630",
    "summary": "🚨 CVE-2026-79630\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not verify that the product requested through a checkout order bump is the product that bump's discount was configured for, allowing unauthenticated users...",
    "body": "🚨 CVE-2026-79630\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not verify that the product requested through a checkout order bump is the product that bump's discount was configured for, allowing unauthenticated users to obtain any purchasable product at a discount intended for a different one, with the reduced price carried through to the total of the order they place.\n\n📅 Published Date: 2026-09-04T06:00:03.475Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-79630",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99070:0000000033c3041b",
    "content_hash": "0000000033c3041b0223",
    "published_at": "2026-09-04T06:30:11.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-79630",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000033c3",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-79630\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not verify that the product requested through a checko",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:11.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005968a123",
    "cve_id": "CVE-2026-19224",
    "slug": "cve-2026-19224",
    "title": "CVE-2026-19224: 🚨 CVE-2026-19224",
    "summary": "🚨 CVE-2026-19224\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Hummingbird Performance  WordPress plugin before 3.21.2 does not restrict a network-wide setting to network administrators, allowing an administrator of any single site on a multisite network to execut...",
    "body": "🚨 CVE-2026-19224\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Hummingbird Performance  WordPress plugin before 3.21.2 does not restrict a network-wide setting to network administrators, allowing an administrator of any single site on a multisite network to execute arbitrary code across the entire network.\n\n📅 Published Date: 2026-09-04T06:00:03.089Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-19224",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99068:000000005968a123",
    "content_hash": "000000005968a12301b3",
    "published_at": "2026-09-04T06:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-19224",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005968",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-19224\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Hummingbird Performance  WordPress plugin before 3.21.2 does not restrict a network-wide setting to n",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000031299393",
    "cve_id": "CVE-2026-16281",
    "slug": "cve-2026-16281",
    "title": "CVE-2026-16281: 🚨 CVE-2026-16281",
    "summary": "🚨 CVE-2026-16281\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Classified Listing  WordPress plugin before 6.1.1 does not verify that the caller owns or can edit the target listing before its AI image-editing AJAX action deletes or attaches media, allowing any aut...",
    "body": "🚨 CVE-2026-16281\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Classified Listing  WordPress plugin before 6.1.1 does not verify that the caller owns or can edit the target listing before its AI image-editing AJAX action deletes or attaches media, allowing any authenticated user, including a subscriber, to permanently delete attachments from, and attach files to, any listing owned by another user.\n\n📅 Published Date: 2026-09-04T06:00:02.726Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-16281",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99066:0000000031299393",
    "content_hash": "00000000312993930210",
    "published_at": "2026-09-04T06:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-16281",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003129",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-16281\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Classified Listing  WordPress plugin before 6.1.1 does not verify that the caller owns or can edit th",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000175eedfd",
    "cve_id": "CVE-2026-74853",
    "slug": "cve-2026-74853",
    "title": "CVE-2026-74853: 🚨 CVE-2026-74853",
    "summary": "🚨 CVE-2026-74853\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Pods  WordPress plugin before 3.3.9.2 does not restrict which functions a display callback may resolve to, allowing users with the author role and above to read arbitrary files from the server, includi...",
    "body": "🚨 CVE-2026-74853\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Pods  WordPress plugin before 3.3.9.2 does not restrict which functions a display callback may resolve to, allowing users with the author role and above to read arbitrary files from the server, including files outside the web root. Only sites using the restricted display-callback mode are affected, which is the automatic default on installations whose first Pods version predates 3.1.\n\n📅 Published Date: 2026-09-04T06:00:03.283Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-74853",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99069:00000000175eedfd",
    "content_hash": "00000000175eedfd0241",
    "published_at": "2026-09-04T06:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-74853",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000175e",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-74853\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Pods  WordPress plugin before 3.3.9.2 does not restrict which functions a display callback may resolv",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000506efd6c",
    "cve_id": "CVE-2026-17517",
    "slug": "cve-2026-17517",
    "title": "CVE-2026-17517: 🚨 CVE-2026-17517",
    "summary": "🚨 CVE-2026-17517\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Content Views  WordPress plugin before 4.5.1.2 does not check whether the user requesting a view is allowed to read the posts it returns, allowing unauthenticated attackers to obtain the title and cont...",
    "body": "🚨 CVE-2026-17517\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Content Views  WordPress plugin before 4.5.1.2 does not check whether the user requesting a view is allowed to read the posts it returns, allowing unauthenticated attackers to obtain the title and content of non-public posts, such as draft, pending, private and scheduled posts, when a view has been configured to include them.\n\n📅 Published Date: 2026-09-04T06:00:02.904Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-17517",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99067:00000000506efd6c",
    "content_hash": "00000000506efd6c0206",
    "published_at": "2026-09-04T06:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-17517",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000506e",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-17517\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Content Views  WordPress plugin before 4.5.1.2 does not check whether the user requesting a view is a",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003c5dd372",
    "cve_id": "CVE-2025-15691",
    "slug": "cve-2025-15691",
    "title": "CVE-2025-15691: 🚨 CVE-2025-15691",
    "summary": "🚨 CVE-2025-15691\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not check whether user registration is enabled on the site before creating accounts from opt-in form submissions, relying on a value supplied in the reque...",
    "body": "🚨 CVE-2025-15691\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not check whether user registration is enabled on the site before creating accounts from opt-in form submissions, relying on a value supplied in the request instead, allowing unauthenticated attackers to create WordPress user accounts even when registration is disabled.\n\nThis is an incomplete fix for CVE-2025-12353: the check added in 3.6.3 covers only one of the three registration paths.\n\n📅 Published Date: 2026-09-04T06:00:02.523Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2025-15691",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99065:000000003c5dd372",
    "content_hash": "000000003c5dd3720275",
    "published_at": "2026-09-04T06:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2025-15691",
          "status": "OBSERVED"
        },
        {
          "cve_id": "CVE-2025-12353",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003c5d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2025-15691\n\n📢 Source: WPScan\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe WPFunnels  WordPress plugin before 3.13.0 does not check whether user registration is enabled on the ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T06:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000089aebb8",
    "cve_id": "CVE-2026-85508",
    "slug": "cve-2026-85508",
    "title": "CVE-2026-85508: 🚨 CVE-2026-85508",
    "summary": "🚨 CVE-2026-85508\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _output_dell_system_info_cmc_ipv6_info in ipmi-oem/ipmi-oem-dell.c (cmc-ipv6-info subcommand to dell get-system-info).\n\n📅 Publis...",
    "body": "🚨 CVE-2026-85508\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _output_dell_system_info_cmc_ipv6_info in ipmi-oem/ipmi-oem-dell.c (cmc-ipv6-info subcommand to dell get-system-info).\n\n📅 Published Date: 2026-09-04T04:20:19.932Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85508",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99063:00000000089aebb8",
    "content_hash": "00000000089aebb8017d",
    "published_at": "2026-09-04T04:45:09.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85508",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000089a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85508\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _output_dell_system_info_cmc_",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:45:09.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000062da3bff",
    "cve_id": "CVE-2026-85509",
    "slug": "cve-2026-85509",
    "title": "CVE-2026-85509: 🚨 CVE-2026-85509",
    "summary": "🚨 CVE-2026-85509\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nFreeIPMI before 1.6.19 has a stack-based buffer overflow in _read_fru_data in libfreeipmi/fru/ipmi-fru.c when a BMC returns more bytes than requested.\n\n📅 Published Date: 2026-09-04T04:21:45.749Z\n\nhttp...",
    "body": "🚨 CVE-2026-85509\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nFreeIPMI before 1.6.19 has a stack-based buffer overflow in _read_fru_data in libfreeipmi/fru/ipmi-fru.c when a BMC returns more bytes than requested.\n\n📅 Published Date: 2026-09-04T04:21:45.749Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85509",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99064:0000000062da3bff",
    "content_hash": "0000000062da3bff0155",
    "published_at": "2026-09-04T04:45:09.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85509",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000062da",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85509\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nFreeIPMI before 1.6.19 has a stack-based buffer overflow in _read_fru_data in libfreeipmi/fru/ipmi-fr",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:45:09.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005400fc57",
    "cve_id": "CVE-2026-85507",
    "slug": "cve-2026-85507",
    "title": "CVE-2026-85507: 🚨 CVE-2026-85507",
    "summary": "🚨 CVE-2026-85507\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _output_dell_system_info_cmc_info in ipmi-oem/ipmi-oem-dell.c (cmc-info subcommand to dell get-system-info).\n\n📅 Published Date: ...",
    "body": "🚨 CVE-2026-85507\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _output_dell_system_info_cmc_info in ipmi-oem/ipmi-oem-dell.c (cmc-info subcommand to dell get-system-info).\n\n📅 Published Date: 2026-09-04T04:18:59.095Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85507",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99062:000000005400fc57",
    "content_hash": "000000005400fc570173",
    "published_at": "2026-09-04T04:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85507",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005400",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85507\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _output_dell_system_info_cmc_",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003b0a534a",
    "cve_id": "CVE-2026-85505",
    "slug": "cve-2026-85505",
    "title": "CVE-2026-85505: 🚨 CVE-2026-85505",
    "summary": "🚨 CVE-2026-85505\n\n📢 Source: mitre\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer over-read in ipmi_oem_fujitsu_get_sel_entry_long_text in ipmi-oem/ipmi-oem-fujitsu.c when a BMC provides a short response, a different vulnerabil...",
    "body": "🚨 CVE-2026-85505\n\n📢 Source: mitre\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer over-read in ipmi_oem_fujitsu_get_sel_entry_long_text in ipmi-oem/ipmi-oem-fujitsu.c when a BMC provides a short response, a different vulnerability than CVE-2026-50031 (which has different affected versions).\n\n📅 Published Date: 2026-09-04T04:16:05.558Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85505",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99060:000000003b0a534a",
    "content_hash": "000000003b0a534a01c8",
    "published_at": "2026-09-04T04:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85505",
          "status": "OBSERVED"
        },
        {
          "cve_id": "CVE-2026-50031",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003b0a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85505\n\n📢 Source: mitre\n\n💣 CVSS Score: 7.5 (HIGH)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer over-read in ipmi_oem_fujitsu_get_sel_entry_l",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000cfe7f9c",
    "cve_id": "CVE-2026-85409",
    "slug": "cve-2026-85409",
    "title": "CVE-2026-85409: 🚨 CVE-2026-85409",
    "summary": "🚨 CVE-2026-85409\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in Eleveo Quality Management 9.7.0. The affected element is the function QuestionnaireService.runDataExportNow of the component Questionnaire Service. Such manipulation of the...",
    "body": "🚨 CVE-2026-85409\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in Eleveo Quality Management 9.7.0. The affected element is the function QuestionnaireService.runDataExportNow of the component Questionnaire Service. Such manipulation of the argument file_name leads to path traversal. The attack may be performed from remote. The exploit is publicly available and might be used. The vendor was contacted early about this disclosure but did not respond in any way.\n\n📅 Published Date: 2026-09-04T04:30:11.235Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85409",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99059:000000000cfe7f9c",
    "content_hash": "000000000cfe7f9c0267",
    "published_at": "2026-09-04T04:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85409",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000cfe",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85409\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in Eleveo Quality Management 9.7.0. The affected element is the function Qu",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000047dcf26a",
    "cve_id": "CVE-2026-85506",
    "slug": "cve-2026-85506",
    "title": "CVE-2026-85506: 🚨 CVE-2026-85506",
    "summary": "🚨 CVE-2026-85506\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _get_dell_system_info_idrac_info in ipmi-oem/ipmi-oem-dell.c (idrac-info subcommand to dell get-system-info).\n\n📅 Published Date:...",
    "body": "🚨 CVE-2026-85506\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _get_dell_system_info_idrac_info in ipmi-oem/ipmi-oem-dell.c (idrac-info subcommand to dell get-system-info).\n\n📅 Published Date: 2026-09-04T04:17:33.524Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85506",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99061:0000000047dcf26a",
    "content_hash": "0000000047dcf26a0174",
    "published_at": "2026-09-04T04:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85506",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000047dc",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85506\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nipmi-oem in FreeIPMI before 1.6.19 has a stack-based buffer overflow in _get_dell_system_info_idrac_i",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000682a5097",
    "cve_id": "CVE-2026-11613",
    "slug": "cve-2026-11613",
    "title": "CVE-2026-11613: 🚨 CVE-2026-11613",
    "summary": "🚨 CVE-2026-11613\n\n📢 Source: Wordfence\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Divi Ajax Filter plugin for WordPress is vulnerable to Local File Inclusion in all versions up to, and including, 5.1.2 via the 'custom_loop_template' parameter parameter. This makes it possible for...",
    "body": "🚨 CVE-2026-11613\n\n📢 Source: Wordfence\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Divi Ajax Filter plugin for WordPress is vulnerable to Local File Inclusion in all versions up to, and including, 5.1.2 via the 'custom_loop_template' parameter parameter. This makes it possible for unauthenticated attackers to include and execute arbitrary .php files on the server, allowing the execution of any PHP code in those files. This can be used to bypass access controls, obtain sensitive data, or achieve code execution in cases where .php file types can be uploaded and included. This vulnerability is only exploitable when the loop_templates parameter is set to 'custom-template'.\n\n📅 Published Date: 2026-09-04T04:29:08.298Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-11613",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99058:00000000682a5097",
    "content_hash": "00000000682a50970314",
    "published_at": "2026-09-04T04:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-11613",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000682a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-11613\n\n📢 Source: Wordfence\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nThe Divi Ajax Filter plugin for WordPress is vulnerable to Local File Inclusion in all versions up to,",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003fc4c95f",
    "cve_id": "CVE-2026-85504",
    "slug": "cve-2026-85504",
    "title": "CVE-2026-85504: 🚨 CVE-2026-85504",
    "summary": "🚨 CVE-2026-85504\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nFreeIPMI before 1.6.19 has a stack-based buffer overflow in _ipmi_sel_oem_fujitsu_get_sel_entry_long_text in libfreeipmi/sel/ipmi-sel-string-fujitsu-irmc-common.c via malformed Fujitsu SEL long-text re...",
    "body": "🚨 CVE-2026-85504\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nFreeIPMI before 1.6.19 has a stack-based buffer overflow in _ipmi_sel_oem_fujitsu_get_sel_entry_long_text in libfreeipmi/sel/ipmi-sel-string-fujitsu-irmc-common.c via malformed Fujitsu SEL long-text responses.\n\n📅 Published Date: 2026-09-04T04:14:30.997Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85504",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99057:000000003fc4c95f",
    "content_hash": "000000003fc4c95f0190",
    "published_at": "2026-09-04T04:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85504",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003fc4",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85504\n\n📢 Source: mitre\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nFreeIPMI before 1.6.19 has a stack-based buffer overflow in _ipmi_sel_oem_fujitsu_get_sel_entry_long_",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000061443c1c",
    "cve_id": null,
    "slug": "intel_0000000061443c1c",
    "title": "Cobalt Strike: Attackers are reviving Node.js abuse, using trusted node.exe for persistence and execution in campai",
    "summary": "Attackers are reviving Node.js abuse, using trusted node.exe for persistence and execution in campaigns tied to Woodgnat/KongTuke and tools like Cobalt Strike, AdaptixC2, and ModeloRAT. #Nodejs #CobaltStrike #AdaptixC2\n➡️ https://www.hendryadrian.com/node-js-old-technique-makes-a-comeback/",
    "body": "Attackers are reviving Node.js abuse, using trusted node.exe for persistence and execution in campaigns tied to Woodgnat/KongTuke and tools like Cobalt Strike, AdaptixC2, and ModeloRAT. #Nodejs #CobaltStrike #AdaptixC2\n➡️ https://www.hendryadrian.com/node-js-old-technique-makes-a-comeback/",
    "severity": "HIGH",
    "confidence_score": 0.81,
    "deduplication_key": "tg_0:35385:0000000061443c1c",
    "content_hash": "0000000061443c1c0122",
    "published_at": "2026-09-04T04:30:06.000Z",
    "entities": {
      "actors": [],
      "malware": [
        {
          "name": "Cobalt Strike",
          "slug": "cobalt-strike",
          "status": "OBSERVED"
        }
      ],
      "cves": [],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006144",
        "type": "TELEGRAM_TELEMETRY",
        "snippet": "Attackers are reviving Node.js abuse, using trusted node.exe for persistence and execution in campaigns tied to Woodgnat/KongTuke and tools like Cobalt Strike, AdaptixC2, and ModeloRAT. #Nodejs #Cobal",
        "weight": 0.81,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:30:06.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000008ded67c",
    "cve_id": "CVE-2026-85406",
    "slug": "cve-2026-85406",
    "title": "CVE-2026-85406: 🚨 CVE-2026-85406",
    "summary": "🚨 CVE-2026-85406\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability has been found in Eleveo Quality Management 9.7.0. This vulnerability affects unknown code of the component Conversation Review. The manipulation leads to cross site scripting. Remote exploi...",
    "body": "🚨 CVE-2026-85406\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability has been found in Eleveo Quality Management 9.7.0. This vulnerability affects unknown code of the component Conversation Review. The manipulation leads to cross site scripting. Remote exploitation of the attack is possible. The exploit has been disclosed to the public and may be used. The vendor was contacted early about this disclosure but did not respond in any way.\n\n📅 Published Date: 2026-09-04T03:45:12.612Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85406",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99056:0000000008ded67c",
    "content_hash": "0000000008ded67c023c",
    "published_at": "2026-09-04T04:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85406",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000008de",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85406\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability has been found in Eleveo Quality Management 9.7.0. This vulnerability affects unknown code",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T04:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000007b37e953",
    "cve_id": "CVE-2026-85405",
    "slug": "cve-2026-85405",
    "title": "CVE-2026-85405: 🚨 CVE-2026-85405",
    "summary": "🚨 CVE-2026-85405\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in Eleveo Call Recording Software 9.7.0. This affects an unknown part of the file /callrec/roleAddAction.do. Executing a manipulation of the argument name/username can lead to cross si...",
    "body": "🚨 CVE-2026-85405\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in Eleveo Call Recording Software 9.7.0. This affects an unknown part of the file /callrec/roleAddAction.do. Executing a manipulation of the argument name/username can lead to cross site scripting. The attack may be launched remotely. The exploit has been published and may be used. The vendor was contacted early about this disclosure but did not respond in any way.\n\n📅 Published Date: 2026-09-04T03:30:09.315Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85405",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99055:000000007b37e953",
    "content_hash": "000000007b37e953023f",
    "published_at": "2026-09-04T03:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85405",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000007b37",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85405\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in Eleveo Call Recording Software 9.7.0. This affects an unknown part of the file /c",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T03:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000317cc503",
    "cve_id": "CVE-2026-85403",
    "slug": "cve-2026-85403",
    "title": "CVE-2026-85403: 🚨 CVE-2026-85403",
    "summary": "🚨 CVE-2026-85403\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in code-projects Doctor Appointment System 1.0. This issue affects some unknown processing of the file /contactus.php. This manipulation of the argument firstname causes sql injection....",
    "body": "🚨 CVE-2026-85403\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in code-projects Doctor Appointment System 1.0. This issue affects some unknown processing of the file /contactus.php. This manipulation of the argument firstname causes sql injection. Remote exploitation of the attack is possible. The exploit has been published and may be used.\n\n📅 Published Date: 2026-09-04T03:15:08.320Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85403",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99054:00000000317cc503",
    "content_hash": "00000000317cc50301e7",
    "published_at": "2026-09-04T03:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85403",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000317c",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85403\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in code-projects Doctor Appointment System 1.0. This issue affects some unknown proc",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T03:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005289b4e5",
    "cve_id": "CVE-2026-85402",
    "slug": "cve-2026-85402",
    "title": "CVE-2026-85402: 🚨 CVE-2026-85402",
    "summary": "🚨 CVE-2026-85402\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was detected in code-projects Doctor Appointment System 1.0. This vulnerability affects unknown code of the file /patient/booking.php. The manipulation of the argument doc_id results in sql ...",
    "body": "🚨 CVE-2026-85402\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was detected in code-projects Doctor Appointment System 1.0. This vulnerability affects unknown code of the file /patient/booking.php. The manipulation of the argument doc_id results in sql injection. The attack may be launched remotely. The exploit is now public and may be used.\n\n📅 Published Date: 2026-09-04T03:00:13.193Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85402",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99053:000000005289b4e5",
    "content_hash": "000000005289b4e501e2",
    "published_at": "2026-09-04T03:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85402",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005289",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85402\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was detected in code-projects Doctor Appointment System 1.0. This vulnerability affects un",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T03:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005f7fa750",
    "cve_id": "CVE-2026-85401",
    "slug": "cve-2026-85401",
    "title": "CVE-2026-85401: 🚨 CVE-2026-85401",
    "summary": "🚨 CVE-2026-85401\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in Dolibarr up to 21.0.4/22.0.5/23.0.3. Affected by this issue is some unknown functionality of the file htdocs/core/filemanagerdol/connectors/php/config.inc.php of the compon...",
    "body": "🚨 CVE-2026-85401\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in Dolibarr up to 21.0.4/22.0.5/23.0.3. Affected by this issue is some unknown functionality of the file htdocs/core/filemanagerdol/connectors/php/config.inc.php of the component Legacy File Manager. Executing a manipulation can lead to improper access controls. The attack can be launched remotely. The exploit has been made available to the public and could be used for attacks. Upgrading to version 23.0.4 can resolve this issue. This patch is called ef6631e9bd5ec4b8cec0e88f1796d3d10dad02ec. It is suggested to upgrade the affected component.\n\n📅 Published Date: 2026-09-04T02:45:11.085Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85401",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99052:000000005f7fa750",
    "content_hash": "000000005f7fa75002fb",
    "published_at": "2026-09-04T03:00:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85401",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005f7f",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85401\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in Dolibarr up to 21.0.4/22.0.5/23.0.3. Affected by this issue is some unkn",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T03:00:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001781121c",
    "cve_id": "CVE-2026-85399",
    "slug": "cve-2026-85399",
    "title": "CVE-2026-85399: 🚨 CVE-2026-85399",
    "summary": "🚨 CVE-2026-85399\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in code-projects Hospital Information System 1.0. Affected by this vulnerability is the function getSinglePresp of the file includes/presp/PrespController.php. Performing...",
    "body": "🚨 CVE-2026-85399\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in code-projects Hospital Information System 1.0. Affected by this vulnerability is the function getSinglePresp of the file includes/presp/PrespController.php. Performing a manipulation of the argument ID results in sql injection. The attack can be initiated remotely. The exploit has been released to the public and may be used for attacks.\n\n📅 Published Date: 2026-09-04T02:30:09.384Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85399",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99051:000000001781121c",
    "content_hash": "000000001781121c0233",
    "published_at": "2026-09-04T02:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85399",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001781",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85399\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in code-projects Hospital Information System 1.0. Affected by this vul",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000048dcd87",
    "cve_id": "CVE-2026-85149",
    "slug": "cve-2026-85149",
    "title": "CVE-2026-85149: 🚨 CVE-2026-85149",
    "summary": "🚨 CVE-2026-85149\n\n📢 Source: twcert\n\n💣 CVSS Score: 6.9 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can obtain the SFTP service credentials of the SmartIT Agent applicatio...",
    "body": "🚨 CVE-2026-85149\n\n📢 Source: twcert\n\n💣 CVSS Score: 6.9 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can obtain the SFTP service credentials of the SmartIT Agent application from the source code, thereby browsing the file system of the user's host.\n\n📅 Published Date: 2026-09-04T02:35:59.531Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85149",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99050:00000000048dcd87",
    "content_hash": "00000000048dcd8701d4",
    "published_at": "2026-09-04T02:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85149",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000048d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85149\n\n📢 Source: twcert\n\n💣 CVSS Score: 6.9 (MEDIUM)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unau",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000218302b3",
    "cve_id": "CVE-2026-85147",
    "slug": "cve-2026-85147",
    "title": "CVE-2026-85147: 🚨 CVE-2026-85147",
    "summary": "🚨 CVE-2026-85147\n\n📢 Source: twcert\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can obtain a specific password from the source code, which can be used to...",
    "body": "🚨 CVE-2026-85147\n\n📢 Source: twcert\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can obtain a specific password from the source code, which can be used to retrieve the AES encryption key used for communication.\n\n📅 Published Date: 2026-09-04T02:32:40.277Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85147",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99048:00000000218302b3",
    "content_hash": "00000000218302b301c0",
    "published_at": "2026-09-04T02:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85147",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002183",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85147\n\n📢 Source: twcert\n\n💣 CVSS Score: 8.7 (HIGH)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauth",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005745c1a2",
    "cve_id": "CVE-2026-85146",
    "slug": "cve-2026-85146",
    "title": "CVE-2026-85146: 🚨 CVE-2026-85146",
    "summary": "🚨 CVE-2026-85146\n\n📢 Source: twcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can obtain the SSH service account credentials and passwords for the ...",
    "body": "🚨 CVE-2026-85146\n\n📢 Source: twcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can obtain the SSH service account credentials and passwords for the SmartIT Agent directly from the application source code.\n\n📅 Published Date: 2026-09-04T02:31:41.627Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85146",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99047:000000005745c1a2",
    "content_hash": "000000005745c1a201c0",
    "published_at": "2026-09-04T02:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85146",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005745",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85146\n\n📢 Source: twcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Un",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000a50e2c3",
    "cve_id": "CVE-2026-85148",
    "slug": "cve-2026-85148",
    "title": "CVE-2026-85148: 🚨 CVE-2026-85148",
    "summary": "🚨 CVE-2026-85148\n\n📢 Source: twcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can exploit a fixed password to remotely access user hosts.\n\n📅 Publi...",
    "body": "🚨 CVE-2026-85148\n\n📢 Source: twcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Unauthenticated remote attackers can exploit a fixed password to remotely access user hosts.\n\n📅 Published Date: 2026-09-04T02:34:45.209Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85148",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99049:000000000a50e2c3",
    "content_hash": "000000000a50e2c3017e",
    "published_at": "2026-09-04T02:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85148",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000a50",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85148\n\n📢 Source: twcert\n\n💣 CVSS Score: 9.8 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nSmartIT Desktop Manager developed by Lightstar has a Use of Hard-coded Credentials vulnerability. Un",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000448a9727",
    "cve_id": null,
    "slug": "intel_00000000448a9727",
    "title": "SonicWall patched two actively exploited zero-days in SMA 1000 appliances, with flaws chainable to u",
    "summary": "SonicWall patched two actively exploited zero-days in SMA 1000 appliances, with flaws chainable to unauthenticated remote-code execution. CISA added both CVEs to KEV. #SonicWall #SMA1000 #CISA\n➡️ https://www.hendryadrian.com/attackers-exploit-zero-days-in-consistently-besieged-sonicwall-product/",
    "body": "SonicWall patched two actively exploited zero-days in SMA 1000 appliances, with flaws chainable to unauthenticated remote-code execution. CISA added both CVEs to KEV. #SonicWall #SMA1000 #CISA\n➡️ https://www.hendryadrian.com/attackers-exploit-zero-days-in-consistently-besieged-sonicwall-product/",
    "severity": "HIGH",
    "confidence_score": 0.81,
    "deduplication_key": "tg_0:35380:00000000448a9727",
    "content_hash": "00000000448a97270128",
    "published_at": "2026-09-04T02:45:06.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000448a",
        "type": "TELEGRAM_TELEMETRY",
        "snippet": "SonicWall patched two actively exploited zero-days in SMA 1000 appliances, with flaws chainable to unauthenticated remote-code execution. CISA added both CVEs to KEV. #SonicWall #SMA1000 #CISA\n➡️ http",
        "weight": 0.81,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:45:06.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000034a7c82a",
    "cve_id": "CVE-2026-85398",
    "slug": "cve-2026-85398",
    "title": "CVE-2026-85398: 🚨 CVE-2026-85398",
    "summary": "🚨 CVE-2026-85398\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in code-projects Hospital Information System 1.0. Affected is the function viewReq of the file viewReq.php. Such manipulation of the argument ID leads to sql injection. It is ...",
    "body": "🚨 CVE-2026-85398\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in code-projects Hospital Information System 1.0. Affected is the function viewReq of the file viewReq.php. Such manipulation of the argument ID leads to sql injection. It is possible to launch the attack remotely. The exploit is publicly available and might be used.\n\n📅 Published Date: 2026-09-04T02:15:11.639Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85398",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99046:0000000034a7c82a",
    "content_hash": "0000000034a7c82a01e4",
    "published_at": "2026-09-04T02:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85398",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000034a7",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85398\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in code-projects Hospital Information System 1.0. Affected is the function ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000287ff432",
    "cve_id": "CVE-2026-75754",
    "slug": "cve-2026-75754",
    "title": "CVE-2026-75754: 🚨 CVE-2026-75754",
    "summary": "🚨 CVE-2026-75754\n\n📢 Source: ASUS\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nMissing Authentication for Critical Function, Server-Side Request Forgery (SSRF), and Use of Hard-coded Credentials in ASUS Control Center allow an unauthorized user to obtain the encryption key via an H...",
    "body": "🚨 CVE-2026-75754\n\n📢 Source: ASUS\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nMissing Authentication for Critical Function, Server-Side Request Forgery (SSRF), and Use of Hard-coded Credentials in ASUS Control Center allow an unauthorized user to obtain the encryption key via an HTTP request, causing a local service to enable SSH on port 2222. The attacker can then log in with the hardcode credentials to obtain a root shell, enabling direct reading, writing, and deletion of data on ASUS Control Center, as well as remote control of all servers, PCs, and workstations within the company.\nRefer to the 'Security Update for ASUS Control Center' section on the ASUS Security Advisory for more information.\n\n📅 Published Date: 2026-09-04T02:08:54.416Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-75754",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99045:00000000287ff432",
    "content_hash": "00000000287ff4320331",
    "published_at": "2026-09-04T02:30:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-75754",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000287f",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-75754\n\n📢 Source: ASUS\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: True\n\nMissing Authentication for Critical Function, Server-Side Request Forgery (SSRF), and Use of Hard-coded",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:30:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001ddb7aff",
    "cve_id": "CVE-2026-85397",
    "slug": "cve-2026-85397",
    "title": "CVE-2026-85397: 🚨 CVE-2026-85397",
    "summary": "🚨 CVE-2026-85397\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was determined in code-projects Hospital Information System 1.0. This impacts the function findBySearch of the file addReq.php. This manipulation of the argument Search causes sql injection....",
    "body": "🚨 CVE-2026-85397\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was determined in code-projects Hospital Information System 1.0. This impacts the function findBySearch of the file addReq.php. This manipulation of the argument Search causes sql injection. It is possible to initiate the attack remotely. The exploit has been publicly disclosed and may be utilized.\n\n📅 Published Date: 2026-09-04T02:00:15.087Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85397",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99044:000000001ddb7aff",
    "content_hash": "000000001ddb7aff01f5",
    "published_at": "2026-09-04T02:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85397",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001ddb",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85397\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was determined in code-projects Hospital Information System 1.0. This impacts the function",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000271adbf3",
    "cve_id": "CVE-2026-85383",
    "slug": "cve-2026-85383",
    "title": "CVE-2026-85383: 🚨 CVE-2026-85383",
    "summary": "🚨 CVE-2026-85383\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in itsourcecode Sales and Inventory System 1.0. The affected element is an unknown function of the file /pages/inv_del.php. Executing a manipulation of the argument ID can lead to sql ...",
    "body": "🚨 CVE-2026-85383\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in itsourcecode Sales and Inventory System 1.0. The affected element is an unknown function of the file /pages/inv_del.php. Executing a manipulation of the argument ID can lead to sql injection. The attack can be executed remotely. The exploit has been published and may be used.\n\n📅 Published Date: 2026-09-04T01:45:06.618Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85383",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99043:00000000271adbf3",
    "content_hash": "00000000271adbf301e7",
    "published_at": "2026-09-04T02:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85383",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000271a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85383\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA flaw has been found in itsourcecode Sales and Inventory System 1.0. The affected element is an unknown f",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000702d7fa4",
    "cve_id": "CVE-2026-45197",
    "slug": "cve-2026-45197",
    "title": "CVE-2026-45197: 🚨 CVE-2026-45197",
    "summary": "🚨 CVE-2026-45197\n\n📢 Source: imaginationtech\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nKernel software installed and running inside a Guest VM may post improper commands to the GPU Firmware to trigger a read and/or write data outside the Guest's virtualised GPU memory.\n\n\n\nThe firmwa...",
    "body": "🚨 CVE-2026-45197\n\n📢 Source: imaginationtech\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nKernel software installed and running inside a Guest VM may post improper commands to the GPU Firmware to trigger a read and/or write data outside the Guest's virtualised GPU memory.\n\n\n\nThe firmware uses data provided by the Guest VM to set up accesses to memory. It validated this before use, but a TOCTOU bug was present which allowed the earlier check results to be invalidated.\n\n📅 Published Date: 2026-09-04T01:53:55.981Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-45197",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99041:00000000702d7fa4",
    "content_hash": "00000000702d7fa40241",
    "published_at": "2026-09-04T02:00:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-45197",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000702d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-45197\n\n📢 Source: imaginationtech\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nKernel software installed and running inside a Guest VM may post improper commands to the GPU Fi",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:00:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005aef5492",
    "cve_id": "CVE-2026-45200",
    "slug": "cve-2026-45200",
    "title": "CVE-2026-45200: 🚨 CVE-2026-45200",
    "summary": "🚨 CVE-2026-45200\n\n📢 Source: imaginationtech\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nSoftware installed and run as a non-privileged user may conduct improper GPU driver IOCTL calls to create an allocation scenario that when freed would cause double free and kernel heap corruption....",
    "body": "🚨 CVE-2026-45200\n\n📢 Source: imaginationtech\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nSoftware installed and run as a non-privileged user may conduct improper GPU driver IOCTL calls to create an allocation scenario that when freed would cause double free and kernel heap corruption.\n\n\n\nScenario caused by fabricating a specific combination of flags on the allocation interface that would cause an incorrect double free event when freed.\n\n📅 Published Date: 2026-09-04T01:45:46.041Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-45200",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99042:000000005aef5492",
    "content_hash": "000000005aef54920222",
    "published_at": "2026-09-04T02:00:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-45200",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005aef",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-45200\n\n📢 Source: imaginationtech\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nSoftware installed and run as a non-privileged user may conduct improper GPU driver IOCTL calls ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T02:00:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000020e4069a",
    "cve_id": "CVE-2026-85382",
    "slug": "cve-2026-85382",
    "title": "CVE-2026-85382: 🚨 CVE-2026-85382",
    "summary": "🚨 CVE-2026-85382\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was detected in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. Impacted is the function htmlspecialchars_decode of the file App/Home/View/De...",
    "body": "🚨 CVE-2026-85382\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was detected in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. Impacted is the function htmlspecialchars_decode of the file App/Home/View/Default/Chapter/oneChapter.tpl of the component Chapter Content Output. Performing a manipulation of the argument content results in cross site scripting. Remote exploitation of the attack is possible. The exploit is now public and may be used. This product follows a rolling release approach for continuous delivery, so version details for affected or updated releases are not provided. The project was informed of the problem early through an issue report but has not responded yet.\n\n📅 Published Date: 2026-09-04T01:30:18.174Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85382",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99040:0000000020e4069a",
    "content_hash": "0000000020e4069a036a",
    "published_at": "2026-09-04T01:45:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85382",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000020e4",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85382\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was detected in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a061",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T01:45:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000074d1cf57",
    "cve_id": null,
    "slug": "intel_0000000074d1cf57",
    "title": "Headline: AI-powered Chinese-speaking operator uses multiple AI agents to target government and educ",
    "summary": "- Headline: AI-powered Chinese-speaking operator uses multiple AI agents to target government and education systems across Asia.\n\n- Summary:\n1) AI-driven intrusion campaign targets Taiwan, Indonesia, mainland China education sector, and Da Nang industry.\n2) Five open directories revealed AI orchestr...",
    "body": "- Headline: AI-powered Chinese-speaking operator uses multiple AI agents to target government and education systems across Asia.\n\n- Summary:\n1) AI-driven intrusion campaign targets Taiwan, Indonesia, mainland China education sector, and Da Nang industry.\n2) Five open directories revealed AI orchestration, exploitation, and payload distribution across six countries.\n3) SecFlow managed tasks for Claude, Qwen, and DeepSeek with swappable model profiles.\n4) Fengtai government compromise shows end-to-end webshells, credential theft, and implant deployment.\n5) Exposed AI-platform data and credentials, plus diverse CVEs used; infrastructure tied to Nie handles and niestools domains. #Asia #CyberSafety #ThreatIntelligence #HuntIO\nhttps://hunt.io/blog/chinese-operator-secflow-claude-qwen-deepseek-asia\nSeptember 3, 2026 at 09:25PM",
    "severity": "HIGH",
    "confidence_score": 0.81,
    "deduplication_key": "tg_0:4915:0000000074d1cf57",
    "content_hash": "0000000074d1cf570340",
    "published_at": "2026-09-04T01:17:33.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000074d1",
        "type": "TELEGRAM_TELEMETRY",
        "snippet": "- Headline: AI-powered Chinese-speaking operator uses multiple AI agents to target government and education systems across Asia.\n\n- Summary:\n1) AI-driven intrusion campaign targets Taiwan, Indonesia, ",
        "weight": 0.81,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T01:17:33.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000034707715",
    "cve_id": "CVE-2026-85380",
    "slug": "cve-2026-85380",
    "title": "CVE-2026-85380: 🚨 CVE-2026-85380",
    "summary": "🚨 CVE-2026-85380\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. This vulnerability affects the function catchimage of the file Public/uedit...",
    "body": "🚨 CVE-2026-85380\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. This vulnerability affects the function catchimage of the file Public/ueditor/php/controller.php of the component UEditor. This manipulation of the argument source[] causes server-side request forgery. The attack may be initiated remotely. The exploit has been made available to the public and could be used for attacks. This product uses a rolling release model to deliver continuous updates. As a result, specific version information for affected or updated releases is not available. The project was informed of the problem early through an issue report but has not responded yet.\n\n📅 Published Date: 2026-09-04T00:30:09.782Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85380",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99038:0000000034707715",
    "content_hash": "00000000347077150384",
    "published_at": "2026-09-04T01:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85380",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003470",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85380\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T01:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000078315a9",
    "cve_id": "CVE-2026-85381",
    "slug": "cve-2026-85381",
    "title": "CVE-2026-85381: 🚨 CVE-2026-85381",
    "summary": "🚨 CVE-2026-85381\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security vulnerability has been detected in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. This issue affects some unknown processing of the file App/Home...",
    "body": "🚨 CVE-2026-85381\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security vulnerability has been detected in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. This issue affects some unknown processing of the file App/Home/Controller/ChapterController.class.php of the component Chapter Controller. Such manipulation of the argument content leads to authorization bypass. The attack may be launched remotely. The exploit has been disclosed publicly and may be used. This product operates on a rolling release basis, ensuring continuous delivery. Consequently, there are no version details for either affected or updated releases. The project was informed of the problem early through an issue report but has not responded yet.\n\n📅 Published Date: 2026-09-04T01:00:10.164Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85381",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99039:00000000078315a9",
    "content_hash": "00000000078315a90380",
    "published_at": "2026-09-04T01:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85381",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000783",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85381\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security vulnerability has been detected in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T01:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000006a61c409",
    "cve_id": null,
    "slug": "intel_000000006a61c409",
    "title": "Cobalt Strike: Headline: AI-enabled and tool-abuse–driven malware and vulnerability trends define H1 2026, emphasiz",
    "summary": "- Headline: AI-enabled and tool-abuse–driven malware and vulnerability trends define H1 2026, emphasizing normal-system evasion and broader exploitation across vendors and platforms.\n- Summary:\n  - Adversaries favor abuse of legitimate tools, trusted platforms, and default workflows to access, move,...",
    "body": "- Headline: AI-enabled and tool-abuse–driven malware and vulnerability trends define H1 2026, emphasizing normal-system evasion and broader exploitation across vendors and platforms.\n- Summary:\n  - Adversaries favor abuse of legitimate tools, trusted platforms, and default workflows to access, move, and monetize intrusions.\n  - AI-enabled malware activity augmented existing intrusion tradecraft, mainly at low-to-mid AIM3 levels ( Levels 1–3).\n  - 215 actively exploited CVEs in H1 2026; 142 were network-accessible without authentication; 60 enabled RCE.\n  - RATs remained prominent; AsyncRAT, Cobalt Strike, XWorm, Stealc, REMCOS persisted in top rankings.\n  - Mobile focus: Android NFC malware (NFCShare, NGate) stole data and facilitated fraud; supply-chain and third-party risks rise.\n  - Defenders should emphasize exposure management, credential governance, behavioral detection, and third-party oversight.\n  - Countries: # | # (example placeholders removed) \n  - Hashtags: #CyberSecurity #ThreatIntelligence #AI #Malware #VulnerabilityManagement #H12026\nhttps://www.recordedfuture.com/research/h1-2026-malware-vulnerability-trends\nSeptember 3, 2026 at 10:01PM",
    "severity": "HIGH",
    "confidence_score": 0.81,
    "deduplication_key": "tg_0:4912:000000006a61c409",
    "content_hash": "000000006a61c4090492",
    "published_at": "2026-09-04T01:07:29.000Z",
    "entities": {
      "actors": [],
      "malware": [
        {
          "name": "Cobalt Strike",
          "slug": "cobalt-strike",
          "status": "OBSERVED"
        },
        {
          "name": "AsyncRAT",
          "slug": "asyncrat",
          "status": "OBSERVED"
        }
      ],
      "cves": [],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006a61",
        "type": "TELEGRAM_TELEMETRY",
        "snippet": "- Headline: AI-enabled and tool-abuse–driven malware and vulnerability trends define H1 2026, emphasizing normal-system evasion and broader exploitation across vendors and platforms.\n- Summary:\n  - Ad",
        "weight": 0.81,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T01:07:29.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001a8a4985",
    "cve_id": "CVE-2026-85379",
    "slug": "cve-2026-85379",
    "title": "CVE-2026-85379: 🚨 CVE-2026-85379",
    "summary": "🚨 CVE-2026-85379\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. This affects the function ChapterModel::searchChapter of the file App/...",
    "body": "🚨 CVE-2026-85379\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. This affects the function ChapterModel::searchChapter of the file App/Home/Controller/ChapterController.class.php of the component Query Builder. The manipulation of the argument content results in sql injection. The attack can be launched remotely. The exploit has been released to the public and may be used for attacks. This product does not use versioning. This is why information about affected and unaffected releases are unavailable. The project was informed of the problem early through an issue report but has not responded yet.\n\n📅 Published Date: 2026-09-04T00:00:15.395Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85379",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99037:000000001a8a4985",
    "content_hash": "000000001a8a4985035b",
    "published_at": "2026-09-04T00:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85379",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001a8a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85379\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA security flaw has been discovered in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601e",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T00:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000036335a0c",
    "cve_id": "CVE-2026-67398",
    "slug": "cve-2026-67398",
    "title": "CVE-2026-67398: 🚨 CVE-2026-67398",
    "summary": "🚨 CVE-2026-67398\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMissing authorization vulnerability has been discovered in 2Checkout payment gateway of WHMCS from 8.13.0 before 8.13.8, from 9.0.0 before 9.0.8, all other EOL versions from 4.5.0. The vulnerability all...",
    "body": "🚨 CVE-2026-67398\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMissing authorization vulnerability has been discovered in 2Checkout payment gateway of WHMCS from 8.13.0 before 8.13.8, from 9.0.0 before 9.0.8, all other EOL versions from 4.5.0. The vulnerability allows an unauthenticated user to get WHMCS customer's data via 2Checkout payment gateway's endpoint under specific conditions.\n\n📅 Published Date: 2026-09-03T23:57:15.810Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-67398",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99035:0000000036335a0c",
    "content_hash": "0000000036335a0c0204",
    "published_at": "2026-09-04T00:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-67398",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003633",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-67398\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMissing authorization vulnerability has been discovered in 2Checkout payment gateway of WHMCS from 8.1",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T00:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000004a836aa",
    "cve_id": "CVE-2026-67402",
    "slug": "cve-2026-67402",
    "title": "CVE-2026-67402: 🚨 CVE-2026-67402",
    "summary": "🚨 CVE-2026-67402\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nAn insecure Apache configuration in ConfigServer Security & Firewall maps /usr/bin as CGI programs through the Messenger v3 HTTPS virtual host. A remote unauthenticated attacker whose address is blocked...",
    "body": "🚨 CVE-2026-67402\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nAn insecure Apache configuration in ConfigServer Security & Firewall maps /usr/bin as CGI programs through the Messenger v3 HTTPS virtual host. A remote unauthenticated attacker whose address is blocked can request a mapped executable and run arbitrary commands as the Apache user. The vulnerability affects installations where CSF Messenger v3 and its HTTPS mode are enabled. WebPros addressed the vulnerability in version 16.31.\n\n📅 Published Date: 2026-09-03T23:57:15.878Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-67402",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99036:0000000004a836aa",
    "content_hash": "0000000004a836aa026c",
    "published_at": "2026-09-04T00:00:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-67402",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000004a8",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-67402\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nAn insecure Apache configuration in ConfigServer Security & Firewall maps /usr/bin as CGI programs thr",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T00:00:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003393c160",
    "cve_id": "CVE-2026-67397",
    "slug": "cve-2026-67397",
    "title": "CVE-2026-67397: 🚨 CVE-2026-67397",
    "summary": "🚨 CVE-2026-67397\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nPath traversal in Plesk 18.0.79.9 and earlier and 18.0.80 through 18.0.80.5 allows local users to execute arbitrary code as root.\n\n📅 Published Date: 2026-09-03T23:57:15.922Z\n\nhttps://cvefeed.io/vuln/de...",
    "body": "🚨 CVE-2026-67397\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nPath traversal in Plesk 18.0.79.9 and earlier and 18.0.80 through 18.0.80.5 allows local users to execute arbitrary code as root.\n\n📅 Published Date: 2026-09-03T23:57:15.922Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-67397",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99034:000000003393c160",
    "content_hash": "000000003393c160013f",
    "published_at": "2026-09-04T00:00:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-67397",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003393",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-67397\n\n📢 Source: hackerone\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nPath traversal in Plesk 18.0.79.9 and earlier and 18.0.80 through 18.0.80.5 allows local users to exec",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-04T00:00:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003f148d5e",
    "cve_id": "CVE-2026-49509",
    "slug": "cve-2026-49509",
    "title": "CVE-2026-49509: 🚨 CVE-2026-49509",
    "summary": "🚨 CVE-2026-49509\n\n📢 Source: samsung.tv_appliance\n\n💣 CVSS Score: 4.4 (MEDIUM)\n\n📡 Remotely Exploitable: False\n\nOut-of-bounds read vulnerability in Samsung Opensource Escargot allows Overread Buffers.\n\nThis issue affects Escargot: 25648aef19187b3f87f4d9420b8d761453ad4630.\n\n📅 Published Date: 2026-0...",
    "body": "🚨 CVE-2026-49509\n\n📢 Source: samsung.tv_appliance\n\n💣 CVSS Score: 4.4 (MEDIUM)\n\n📡 Remotely Exploitable: False\n\nOut-of-bounds read vulnerability in Samsung Opensource Escargot allows Overread Buffers.\n\nThis issue affects Escargot: 25648aef19187b3f87f4d9420b8d761453ad4630.\n\n📅 Published Date: 2026-09-03T23:03:36.723Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-49509",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99033:000000003f148d5e",
    "content_hash": "000000003f148d5e016d",
    "published_at": "2026-09-03T23:30:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-49509",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003f14",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-49509\n\n📢 Source: samsung.tv_appliance\n\n💣 CVSS Score: 4.4 (MEDIUM)\n\n📡 Remotely Exploitable: False\n\nOut-of-bounds read vulnerability in Samsung Opensource Escargot allows Overread Buffers",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:30:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000005b4cdd1",
    "cve_id": "CVE-2026-85378",
    "slug": "cve-2026-85378",
    "title": "CVE-2026-85378: 🚨 CVE-2026-85378",
    "summary": "🚨 CVE-2026-85378\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. Affected by this issue is the function AuthController::_initialize of the f...",
    "body": "🚨 CVE-2026-85378\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0618c3814cc2f61380b38930. Affected by this issue is the function AuthController::_initialize of the file App/Admin/Controller/ChapterController.class.php of the component Chapter Controller. The manipulation leads to authorization bypass. The attack can be initiated remotely. The exploit is publicly available and might be used. Continious delivery with rolling releases is used by this product. Therefore, no version details of affected nor updated releases are available. The project was informed of the problem early through an issue report but has not responded yet.\n\n📅 Published Date: 2026-09-03T23:00:10.572Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85378",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99032:0000000005b4cdd1",
    "content_hash": "0000000005b4cdd1035e",
    "published_at": "2026-09-03T23:15:12.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85378",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000005b4",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85378\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA vulnerability was identified in light0011 cms c774dce31c6df0055568a8d5c53d964d99be199d/f72cf46f601efb2a0",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:12.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001cb026f1",
    "cve_id": "CVE-2026-83711",
    "slug": "cve-2026-83711",
    "title": "CVE-2026-83711: 🚨 CVE-2026-83711",
    "summary": "🚨 CVE-2026-83711\n\n📢 Source: microsoft\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:15.478Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-83711",
    "body": "🚨 CVE-2026-83711\n\n📢 Source: microsoft\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:15.478Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-83711",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99031:000000001cb026f1",
    "content_hash": "000000001cb026f100c7",
    "published_at": "2026-09-03T23:15:12.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-83711",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001cb0",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-83711\n\n📢 Source: microsoft\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:15.478Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-83711",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:12.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000002263445b",
    "cve_id": "CVE-2026-80098",
    "slug": "cve-2026-80098",
    "title": "CVE-2026-80098: 🚨 CVE-2026-80098",
    "summary": "🚨 CVE-2026-80098\n\n📢 Source: microsoft\n\n💣 CVSS Score: 9.3 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:13.804Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-80098",
    "body": "🚨 CVE-2026-80098\n\n📢 Source: microsoft\n\n💣 CVSS Score: 9.3 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:13.804Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-80098",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99030:000000002263445b",
    "content_hash": "000000002263445b00c8",
    "published_at": "2026-09-03T23:15:12.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-80098",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002263",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-80098\n\n📢 Source: microsoft\n\n💣 CVSS Score: 9.3 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:13.804Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-80098",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:12.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000c7c2539",
    "cve_id": "CVE-2026-70352",
    "slug": "cve-2026-70352",
    "title": "CVE-2026-70352: 🚨 CVE-2026-70352",
    "summary": "🚨 CVE-2026-70352\n\n📢 Source: microsoft\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:12.503Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-70352",
    "body": "🚨 CVE-2026-70352\n\n📢 Source: microsoft\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:12.503Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-70352",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99029:000000000c7c2539",
    "content_hash": "000000000c7c253900c7",
    "published_at": "2026-09-03T23:15:11.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-70352",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000c7c",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-70352\n\n📢 Source: microsoft\n\n💣 CVSS Score: 10 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:12.503Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-70352",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:11.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000085e571f",
    "cve_id": "CVE-2026-62916",
    "slug": "cve-2026-62916",
    "title": "CVE-2026-62916: 🚨 CVE-2026-62916",
    "summary": "🚨 CVE-2026-62916\n\n📢 Source: microsoft\n\n💣 CVSS Score: 9.1 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:17.956Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62916",
    "body": "🚨 CVE-2026-62916\n\n📢 Source: microsoft\n\n💣 CVSS Score: 9.1 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:17.956Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62916",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99025:00000000085e571f",
    "content_hash": "00000000085e571f00c8",
    "published_at": "2026-09-03T23:15:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-62916",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000085e",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-62916\n\n📢 Source: microsoft\n\n💣 CVSS Score: 9.1 (CRITICAL)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:17.956Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62916",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000007f7ecb38",
    "cve_id": "CVE-2026-65818",
    "slug": "cve-2026-65818",
    "title": "CVE-2026-65818: 🚨 CVE-2026-65818",
    "summary": "🚨 CVE-2026-65818\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:17.290Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-65818",
    "body": "🚨 CVE-2026-65818\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:17.290Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-65818",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99026:000000007f7ecb38",
    "content_hash": "000000007f7ecb3800c4",
    "published_at": "2026-09-03T23:15:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-65818",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000007f7e",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-65818\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:17.290Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-65818",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000071b5f9ae",
    "cve_id": "CVE-2026-70178",
    "slug": "cve-2026-70178",
    "title": "CVE-2026-70178: 🚨 CVE-2026-70178",
    "summary": "🚨 CVE-2026-70178\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:11.775Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-70178",
    "body": "🚨 CVE-2026-70178\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:11.775Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-70178",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99028:0000000071b5f9ae",
    "content_hash": "0000000071b5f9ae00c4",
    "published_at": "2026-09-03T23:15:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-70178",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000071b5",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-70178\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:11.775Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-70178",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000004b318cf3",
    "cve_id": "CVE-2026-69857",
    "slug": "cve-2026-69857",
    "title": "CVE-2026-69857: 🚨 CVE-2026-69857",
    "summary": "🚨 CVE-2026-69857\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:16.698Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-69857",
    "body": "🚨 CVE-2026-69857\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:16.698Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-69857",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99027:000000004b318cf3",
    "content_hash": "000000004b318cf300c4",
    "published_at": "2026-09-03T23:15:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-69857",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000004b31",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-69857\n\n📢 Source: microsoft\n\n💣 CVSS Score: 8.5 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:16.698Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-69857",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000079a63991",
    "cve_id": "CVE-2026-62906",
    "slug": "cve-2026-62906",
    "title": "CVE-2026-62906: 🚨 CVE-2026-62906",
    "summary": "🚨 CVE-2026-62906\n\n📢 Source: microsoft\n\n💣 CVSS Score: 7.4 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:10.137Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62906",
    "body": "🚨 CVE-2026-62906\n\n📢 Source: microsoft\n\n💣 CVSS Score: 7.4 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:10.137Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62906",
    "severity": "CRITICAL",
    "confidence_score": 0.84,
    "deduplication_key": "tg_0:99024:0000000079a63991",
    "content_hash": "0000000079a6399100c4",
    "published_at": "2026-09-03T23:15:03.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-62906",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000079a6",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-62906\n\n📢 Source: microsoft\n\n💣 CVSS Score: 7.4 (HIGH)\n\n📡 Remotely Exploitable: False\n\nNone\n\n📅 Published Date: 2026-09-03T22:59:10.137Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-62906",
        "weight": 0.84,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T23:15:03.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000002f3fae6c",
    "cve_id": "CVE-2024-3400",
    "slug": "cve-2024-3400",
    "title": "CVE-2024-3400: Palo Alto Networks PAN-OS Vulnerability Advisory",
    "summary": "Vulnerability Identifier: CVE-2024-3400\nVendor: Palo Alto Networks\nProduct: PAN-OS\nAffected Versions: 10.2, 11.0, 11.1\nFixed Versions: 10.2.9-h1, 11.0.4-h1\nCVSS Score: 10 (3.1)\nExploitation Status: CONFIRMED_IN_WILD\nCISA KEV Enrolled: YES (Known Exploited Vulnerability)\nReferences:\n- https://nvd.nis...",
    "body": "Vulnerability Identifier: CVE-2024-3400\nVendor: Palo Alto Networks\nProduct: PAN-OS\nAffected Versions: 10.2, 11.0, 11.1\nFixed Versions: 10.2.9-h1, 11.0.4-h1\nCVSS Score: 10 (3.1)\nExploitation Status: CONFIRMED_IN_WILD\nCISA KEV Enrolled: YES (Known Exploited Vulnerability)\nReferences:\n- https://nvd.nist.gov/vuln/detail/CVE-2024-3400",
    "severity": "CRITICAL",
    "confidence_score": 0.99,
    "deduplication_key": "nvd-api:CVE-2024-3400:000000002f3fae6c",
    "content_hash": "000000002f3fae6c0027",
    "published_at": "2026-09-03T22:55:49.747Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2024-3400",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000002f3f",
        "type": "CVE_OBSERVATION",
        "snippet": "Vulnerability Identifier: CVE-2024-3400\nVendor: Palo Alto Networks\nProduct: PAN-OS\nAffected Versions: 10.2, 11.0, 11.1\nFixed Versions: 10.2.9-h1, 11.0.4-h1\nCVSS Score: 10 (3.1)\nExploitation Status: CONFIRMED_IN_WILD\nCISA KEV Enrolled: YES (Known Expl",
        "weight": 0.95,
        "source_name": "nvd-api",
        "source_url": "https://nvd.nist.gov/vuln/detail/CVE-2024-3400",
        "created_at": "2026-09-03T22:55:49.747Z"
      },
      {
        "id": "evi_00000000560c",
        "type": "SECURITY_RESEARCH_TELEMETRY",
        "snippet": "Volexity detected zero-day exploitation of CVE-2024-3400 in PAN-OS GlobalProtect. Backdoors installed on perimeter devices.",
        "weight": 0.85,
        "source_name": "research_volexity_threat_research",
        "source_url": "https://www.volexity.com/blog/2024/04/12/pan-os-zero-day/",
        "created_at": "2026-09-03T22:55:54.311Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000464d08a7",
    "cve_id": null,
    "slug": "intel_00000000464d08a7",
    "title": "Palo Alto Networks: Command Injection Vulnerability in PAN-OS GlobalProtect",
    "summary": "Vendor Advisory: PAN-SA-2024-0002\nOrganization: Palo Alto Networks\nTitle: Command Injection Vulnerability in PAN-OS GlobalProtect\nAssessed Severity: CRITICAL\nProducts Affected:\n- Palo Alto Networks PAN-OS (Versions: 10.2, 11.0)\n\nRemediation Recommendations:\n- Apply hotfix immediately\n- Disable devic...",
    "body": "Vendor Advisory: PAN-SA-2024-0002\nOrganization: Palo Alto Networks\nTitle: Command Injection Vulnerability in PAN-OS GlobalProtect\nAssessed Severity: CRITICAL\nProducts Affected:\n- Palo Alto Networks PAN-OS (Versions: 10.2, 11.0)\n\nRemediation Recommendations:\n- Apply hotfix immediately\n- Disable device telemetry",
    "severity": "HIGH",
    "confidence_score": 0.86,
    "deduplication_key": "vendor_palo_alto_networks:PAN-SA-2024-0002:00000000464d08a7",
    "content_hash": "00000000464d08a70023",
    "published_at": "2026-09-03T22:55:49.283Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [
        "Palo Alto Networks"
      ],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000464d",
        "type": "VENDOR_ADVISORY_OBSERVATION",
        "snippet": "Vendor Advisory: PAN-SA-2024-0002\nOrganization: Palo Alto Networks\nTitle: Command Injection Vulnerability in PAN-OS GlobalProtect\nAssessed Severity: CRITICAL\nProducts Affected:\n- Palo Alto Networks PAN-OS (Versions: 10.2, 11.0)\n\nRemediation Recommend",
        "weight": 0.86,
        "source_name": "vendor_palo_alto_networks",
        "source_url": "https://security.paloaltonetworks.com/CVE-2024-3400",
        "created_at": "2026-09-03T22:55:49.283Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000059f1d105",
    "cve_id": "CVE-2026-85439",
    "slug": "cve-2026-85439",
    "title": "CVE-2026-85439: 🚨 CVE-2026-85439",
    "summary": "🚨 CVE-2026-85439\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains a remote code execution vulnerability in alogsplit's SplitHandler::handlePreCheckSplitDir() function that fails to sanitize shell metacharacters in log file pathnames. A...",
    "body": "🚨 CVE-2026-85439\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains a remote code execution vulnerability in alogsplit's SplitHandler::handlePreCheckSplitDir() function that fails to sanitize shell metacharacters in log file pathnames. Attackers can embed shell syntax in log file names or the --dir parameter to execute arbitrary commands with the privileges of the operator running alogsplit.\n\n📅 Published Date: 2026-09-03T22:38:30.592Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85439",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99020:0000000059f1d105",
    "content_hash": "0000000059f1d1050225",
    "published_at": "2026-09-03T22:45:22.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85439",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000059f1",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85439\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains a remote code execution vulnerability in alogsplit's SplitHandler::ha",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:22.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000a1708c2",
    "cve_id": "CVE-2026-85441",
    "slug": "cve-2026-85441",
    "title": "CVE-2026-85441: 🚨 CVE-2026-85441",
    "summary": "🚨 CVE-2026-85441\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate that serialized string lengths are non-negative in CMOOSMsg::operator>>. Unauthenticated attackers can send a crafted message with a negative length value...",
    "body": "🚨 CVE-2026-85441\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate that serialized string lengths are non-negative in CMOOSMsg::operator>>. Unauthenticated attackers can send a crafted message with a negative length value to the MOOSDB port, causing an unhandled exception that terminates the database process.\n\n📅 Published Date: 2026-09-03T22:38:31.884Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85441",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99022:000000000a1708c2",
    "content_hash": "000000000a1708c201e1",
    "published_at": "2026-09-03T22:45:23.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85441",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000a17",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85441\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate that serialized string lengths are non-negative in CMO",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:23.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000005663c8a0",
    "cve_id": "CVE-2026-85440",
    "slug": "cve-2026-85440",
    "title": "CVE-2026-85440: 🚨 CVE-2026-85440",
    "summary": "🚨 CVE-2026-85440\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 contains a pre-authentication heap overflow vulnerability in MOOSCommPkt packet handling that allows remote attackers to write arbitrary data by declaring a negative packet...",
    "body": "🚨 CVE-2026-85440\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 contains a pre-authentication heap overflow vulnerability in MOOSCommPkt packet handling that allows remote attackers to write arbitrary data by declaring a negative packet length. Attackers can exploit the signed integer check in InflateTo() and negative size conversion in recv() to overflow a four-byte heap buffer during the HandShake phase before authentication.\n\n📅 Published Date: 2026-09-03T22:38:31.246Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85440",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99021:000000005663c8a0",
    "content_hash": "000000005663c8a0024b",
    "published_at": "2026-09-03T22:45:23.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85440",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000005663",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85440\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 contains a pre-authentication heap overflow vulnerability in MOOSCommPkt",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:23.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000308da8b1",
    "cve_id": "CVE-2026-85438",
    "slug": "cve-2026-85438",
    "title": "CVE-2026-85438: 🚨 CVE-2026-85438",
    "summary": "🚨 CVE-2026-85438\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains a buffer overflow vulnerability in StringToIvPFunction() where dimension, piece, and degree counts from encoded BHV_IPF payloads are used as allocation sizes and loop bo...",
    "body": "🚨 CVE-2026-85438\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains a buffer overflow vulnerability in StringToIvPFunction() where dimension, piece, and degree counts from encoded BHV_IPF payloads are used as allocation sizes and loop bounds without validation. Attackers can supply crafted payloads with mismatched dimension values to write attacker-controlled doubles past the end of the IvPBox weight array, causing memory corruption and potential code execution.\n\n📅 Published Date: 2026-09-03T22:38:29.903Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85438",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99019:00000000308da8b1",
    "content_hash": "00000000308da8b1026d",
    "published_at": "2026-09-03T22:45:22.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85438",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000308d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85438\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains a buffer overflow vulnerability in StringToIvPFunction() where dimens",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:22.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000006e9e363",
    "cve_id": "CVE-2026-85435",
    "slug": "cve-2026-85435",
    "title": "CVE-2026-85435: 🚨 CVE-2026-85435",
    "summary": "🚨 CVE-2026-85435\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldNodeBroker through 24.8.1 fails to validate the source of TRY_SHORE_HOST messages on the vehicle bus, allowing any publisher to enroll attacker-controlled shore routes. Attackers can publis...",
    "body": "🚨 CVE-2026-85435\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldNodeBroker through 24.8.1 fails to validate the source of TRY_SHORE_HOST messages on the vehicle bus, allowing any publisher to enroll attacker-controlled shore routes. Attackers can publish malicious shore route messages to receive bridged vehicle traffic including sensor data and control information.\n\n📅 Published Date: 2026-09-03T22:38:27.809Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85435",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99016:0000000006e9e363",
    "content_hash": "0000000006e9e36301fa",
    "published_at": "2026-09-03T22:45:18.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85435",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000006e9",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85435\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldNodeBroker through 24.8.1 fails to validate the source of TRY_SHORE_HOST messages on the ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:18.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001f9bcb80",
    "cve_id": "CVE-2026-85436",
    "slug": "cve-2026-85436",
    "title": "CVE-2026-85436: 🚨 CVE-2026-85436",
    "summary": "🚨 CVE-2026-85436\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through 10.0.1 contains a buffer overflow vulnerability in CMOOSUDPLink::ReadPktFromArray() that allows remote attackers to corrupt heap memory by sending UDP datagrams with negative...",
    "body": "🚨 CVE-2026-85436\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through 10.0.1 contains a buffer overflow vulnerability in CMOOSUDPLink::ReadPktFromArray() that allows remote attackers to corrupt heap memory by sending UDP datagrams with negative declared lengths. Attackers can send crafted UDP packets to the configured UDPListen port to trigger an oversized memcpy operation that writes past the destination buffer, causing heap corruption and denial of service.\n\n📅 Published Date: 2026-09-03T22:38:28.519Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85436",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99017:000000001f9bcb80",
    "content_hash": "000000001f9bcb800263",
    "published_at": "2026-09-03T22:45:18.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85436",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001f9b",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85436\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through 10.0.1 contains a buffer overflow vulnerability in CMOOSUDPLink::ReadPktFr",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:18.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000061f6e9ee",
    "cve_id": "CVE-2026-85437",
    "slug": "cve-2026-85437",
    "title": "CVE-2026-85437: 🚨 CVE-2026-85437",
    "summary": "🚨 CVE-2026-85437\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains multiple buffer overflow vulnerabilities in IvP function string decoders that trust attacker-controlled length fields without validation. Attackers can craft malicious e...",
    "body": "🚨 CVE-2026-85437\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains multiple buffer overflow vulnerabilities in IvP function string decoders that trust attacker-controlled length fields without validation. Attackers can craft malicious encoded strings with mismatched declared and actual field lengths to overflow heap and stack buffers, potentially achieving remote code execution through MOOS variables or alog files.\n\n📅 Published Date: 2026-09-03T22:38:29.210Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85437",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99018:0000000061f6e9ee",
    "content_hash": "0000000061f6e9ee023e",
    "published_at": "2026-09-03T22:45:18.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85437",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000061f6",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85437\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP through 24.8.1 contains multiple buffer overflow vulnerabilities in IvP function string decod",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:18.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000004443b1dd",
    "cve_id": "CVE-2026-85433",
    "slug": "cve-2026-85433",
    "title": "CVE-2026-85433: 🚨 CVE-2026-85433",
    "summary": "🚨 CVE-2026-85433\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos pShare through 10.0.1 fails to properly authorize PSHARE_CMD messages, allowing any publisher to reconfigure network routes and listeners at runtime. Attackers can send crafted PSHAR...",
    "body": "🚨 CVE-2026-85433\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos pShare through 10.0.1 fails to properly authorize PSHARE_CMD messages, allowing any publisher to reconfigure network routes and listeners at runtime. Attackers can send crafted PSHARE_CMD messages with cmd=output or cmd=input parameters to open new listeners on arbitrary addresses and redirect or duplicate bus traffic to attacker-controlled destinations.\n\n📅 Published Date: 2026-09-03T22:38:26.441Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85433",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99014:000000004443b1dd",
    "content_hash": "000000004443b1dd0236",
    "published_at": "2026-09-03T22:45:17.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85433",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000004443",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85433\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos pShare through 10.0.1 fails to properly authorize PSHARE_CMD messages, allowing an",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:17.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000064261106",
    "cve_id": "CVE-2026-85434",
    "slug": "cve-2026-85434",
    "title": "CVE-2026-85434: 🚨 CVE-2026-85434",
    "summary": "🚨 CVE-2026-85434\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldShoreBroker through 24.8.1 fails to verify node ping authenticity before creating outbound bridge routes. Attackers can publish NODE_BROKER_PING messages with crafted HostRecord data to red...",
    "body": "🚨 CVE-2026-85434\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldShoreBroker through 24.8.1 fails to verify node ping authenticity before creating outbound bridge routes. Attackers can publish NODE_BROKER_PING messages with crafted HostRecord data to redirect bridged variables to attacker-controlled addresses.\n\n📅 Published Date: 2026-09-03T22:38:27.110Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85434",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99015:0000000064261106",
    "content_hash": "000000006426110601c1",
    "published_at": "2026-09-03T22:45:17.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85434",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000006426",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85434\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldShoreBroker through 24.8.1 fails to verify node ping authenticity before creating outboun",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:17.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000065ac52d0",
    "cve_id": "CVE-2026-85431",
    "slug": "cve-2026-85431",
    "title": "CVE-2026-85431: 🚨 CVE-2026-85431",
    "summary": "🚨 CVE-2026-85431\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through version 10.0.1 contains an unauthenticated UDP packet injection vulnerability in pMOOSBridge when configured with UDPListen. Attackers can send crafted UDP packets to the con...",
    "body": "🚨 CVE-2026-85431\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through version 10.0.1 contains an unauthenticated UDP packet injection vulnerability in pMOOSBridge when configured with UDPListen. Attackers can send crafted UDP packets to the configured port to inject arbitrary variables into the local MOOS community with spoofed source and community identifiers.\n\n📅 Published Date: 2026-09-03T22:38:25.135Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85431",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99012:0000000065ac52d0",
    "content_hash": "0000000065ac52d001ff",
    "published_at": "2026-09-03T22:45:10.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85431",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000065ac",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85431\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through version 10.0.1 contains an unauthenticated UDP packet injection vulnerabil",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:10.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000112f8baa",
    "cve_id": "CVE-2026-85432",
    "slug": "cve-2026-85432",
    "title": "CVE-2026-85432: 🚨 CVE-2026-85432",
    "summary": "🚨 CVE-2026-85432\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate client identity in MOOSDB message processing, allowing authenticated attackers to attribute writes to other clients by supplying arbitrary source identifi...",
    "body": "🚨 CVE-2026-85432\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate client identity in MOOSDB message processing, allowing authenticated attackers to attribute writes to other clients by supplying arbitrary source identifiers in serialized messages. Attackers can forge message origins and cancel third-party subscriptions by exploiting the disconnect between authenticated connection identity and wire-supplied source attribution.\n\n📅 Published Date: 2026-09-03T22:38:25.782Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85432",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99013:00000000112f8baa",
    "content_hash": "00000000112f8baa0259",
    "published_at": "2026-09-03T22:45:10.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85432",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000112f",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85432\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate client identity in MOOSDB message processing, allowing",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:10.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000077232af6",
    "cve_id": "CVE-2026-85429",
    "slug": "cve-2026-85429",
    "title": "CVE-2026-85429: 🚨 CVE-2026-85429",
    "summary": "🚨 CVE-2026-85429\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldNodeComms through 24.8.1 trusts the source node identity from the message body rather than validating it from the connection source. Attackers can craft NODE_MESSAGE packets with spoofed so...",
    "body": "🚨 CVE-2026-85429\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldNodeComms through 24.8.1 trusts the source node identity from the message body rather than validating it from the connection source. Attackers can craft NODE_MESSAGE packets with spoofed source identities to impersonate other nodes and post arbitrary variable notifications without validation.\n\n📅 Published Date: 2026-09-03T22:38:23.780Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85429",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99010:0000000077232af6",
    "content_hash": "0000000077232af601f0",
    "published_at": "2026-09-03T22:45:09.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85429",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000007723",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85429\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uFldNodeComms through 24.8.1 trusts the source node identity from the message body rather tha",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:09.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000673a5660",
    "cve_id": "CVE-2026-85428",
    "slug": "cve-2026-85428",
    "title": "CVE-2026-85428: 🚨 CVE-2026-85428",
    "summary": "🚨 CVE-2026-85428\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 contains an authentication bypass vulnerability in the optional MOOSDB HTTP server that allows unauthenticated clients to write variables. Attackers can send HTTP requests ...",
    "body": "🚨 CVE-2026-85428\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 contains an authentication bypass vulnerability in the optional MOOSDB HTTP server that allows unauthenticated clients to write variables. Attackers can send HTTP requests with variable names and values to the MOOSDB HTTP server port to modify MOOS variables including actuator and override commands without authentication.\n\n📅 Published Date: 2026-09-03T22:38:23.092Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85428",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99009:00000000673a5660",
    "content_hash": "00000000673a5660021f",
    "published_at": "2026-09-03T22:45:09.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85428",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000673a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85428\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 contains an authentication bypass vulnerability in the optional MOOSDB H",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:09.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000049b4f834",
    "cve_id": "CVE-2026-85430",
    "slug": "cve-2026-85430",
    "title": "CVE-2026-85430: 🚨 CVE-2026-85430",
    "summary": "🚨 CVE-2026-85430\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through 10.0.1 contains an authentication bypass vulnerability in pShare that accepts UDP datagrams from any source and republishes them with the attacker-claimed identity intact. At...",
    "body": "🚨 CVE-2026-85430\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through 10.0.1 contains an authentication bypass vulnerability in pShare that accepts UDP datagrams from any source and republishes them with the attacker-claimed identity intact. Attackers can send crafted UDP datagrams to pShare input routes to inject messages into the local MOOS community under spoofed identities, or send malformed datagrams to crash the pShare process.\n\n📅 Published Date: 2026-09-03T22:38:24.443Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85430",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99011:0000000049b4f834",
    "content_hash": "0000000049b4f8340249",
    "published_at": "2026-09-03T22:45:09.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85430",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000049b4",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85430\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos through 10.0.1 contains an authentication bypass vulnerability in pShare that acce",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:09.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001f717b5f",
    "cve_id": "CVE-2026-85442",
    "slug": "cve-2026-85442",
    "title": "CVE-2026-85442: 🚨 CVE-2026-85442",
    "summary": "🚨 CVE-2026-85442\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate packet length declarations in CMOOSCommPkt::OnBytesWritten(), allowing unauthenticated attackers to trigger unbounded buffer allocation by sending crafted...",
    "body": "🚨 CVE-2026-85442\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate packet length declarations in CMOOSCommPkt::OnBytesWritten(), allowing unauthenticated attackers to trigger unbounded buffer allocation by sending crafted wire packets. Attackers can send packets with large declared lengths to exhaust server memory and cause denial of service before client authentication completes.\n\n📅 Published Date: 2026-09-03T22:38:32.543Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85442",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99023:000000001f717b5f",
    "content_hash": "000000001f717b5f022a",
    "published_at": "2026-09-03T22:45:23.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85442",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001f71",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85442\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 fails to validate packet length declarations in CMOOSCommPkt::OnBytesWri",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:23.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000001e1d9f3e",
    "cve_id": "CVE-2026-85427",
    "slug": "cve-2026-85427",
    "title": "CVE-2026-85427: 🚨 CVE-2026-85427",
    "summary": "🚨 CVE-2026-85427\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos pAntler through 10.0.1 contains a remote code execution vulnerability that allows unauthenticated attackers to execute arbitrary programs by publishing a crafted MISSION_FILE message...",
    "body": "🚨 CVE-2026-85427\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos pAntler through 10.0.1 contains a remote code execution vulnerability that allows unauthenticated attackers to execute arbitrary programs by publishing a crafted MISSION_FILE message to the MOOSDB. Attackers can publish a mission file containing malicious Run entries that pAntler parses and executes via execvp() without authentication validation.\n\n📅 Published Date: 2026-09-03T22:38:22.398Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85427",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99008:000000001e1d9f3e",
    "content_hash": "000000001e1d9f3e022e",
    "published_at": "2026-09-03T22:45:05.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85427",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000001e1d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85427\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS essential-moos pAntler through 10.0.1 contains a remote code execution vulnerability that allows ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:05.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000003d7de6a0",
    "cve_id": "CVE-2026-85426",
    "slug": "cve-2026-85426",
    "title": "CVE-2026-85426: 🚨 CVE-2026-85426",
    "summary": "🚨 CVE-2026-85426\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uMemWatch through 24.8.1 constructs shell commands from attacker-chosen MOOS client names without sanitization. Attackers can inject shell metacharacters into client names to execute arbitrary ...",
    "body": "🚨 CVE-2026-85426\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uMemWatch through 24.8.1 constructs shell commands from attacker-chosen MOOS client names without sanitization. Attackers can inject shell metacharacters into client names to execute arbitrary commands as the uMemWatch process user through unquoted redirection targets in system calls.\n\n📅 Published Date: 2026-09-03T22:38:21.711Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85426",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99007:000000003d7de6a0",
    "content_hash": "000000003d7de6a001e4",
    "published_at": "2026-09-03T22:45:05.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85426",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003d7d",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85426\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP uMemWatch through 24.8.1 constructs shell commands from attacker-chosen MOOS client names wit",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:05.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000335179d0",
    "cve_id": "CVE-2026-85425",
    "slug": "cve-2026-85425",
    "title": "CVE-2026-85425: 🚨 CVE-2026-85425",
    "summary": "🚨 CVE-2026-85425\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP iSay through 24.8.1 contains a remote code execution vulnerability in the SAY_MOOS variable handler that passes unsanitized text to a shell command. Attackers can publish SAY_MOOS messages cont...",
    "body": "🚨 CVE-2026-85425\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP iSay through 24.8.1 contains a remote code execution vulnerability in the SAY_MOOS variable handler that passes unsanitized text to a shell command. Attackers can publish SAY_MOOS messages containing backticks or command substitution syntax to execute arbitrary commands as the iSay process user.\n\n📅 Published Date: 2026-09-03T22:38:21.024Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85425",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99006:00000000335179d0",
    "content_hash": "00000000335179d001ef",
    "published_at": "2026-09-03T22:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85425",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000003351",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85425\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS-IvP iSay through 24.8.1 contains a remote code execution vulnerability in the SAY_MOOS variable h",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000062e6d9ab",
    "cve_id": "CVE-2026-85424",
    "slug": "cve-2026-85424",
    "title": "CVE-2026-85424: 🚨 CVE-2026-85424",
    "summary": "🚨 CVE-2026-85424\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 lacks authentication in the wire protocol, allowing unauthenticated clients to connect with full publish, subscribe, and database clear privileges. Attackers can bypass the...",
    "body": "🚨 CVE-2026-85424\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 lacks authentication in the wire protocol, allowing unauthenticated clients to connect with full publish, subscribe, and database clear privileges. Attackers can bypass the compile-time protocol string check and connect with arbitrary client names to execute privileged operations including DB_CLEAR which resets all variables and clears client mail queues.\n\n📅 Published Date: 2026-09-03T22:38:20.333Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85424",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99005:0000000062e6d9ab",
    "content_hash": "0000000062e6d9ab0241",
    "published_at": "2026-09-03T22:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85424",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000062e6",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85424\n\n📢 Source: VulnCheck\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nMOOS core-moos through 10.4.0 lacks authentication in the wire protocol, allowing unauthenticated clie",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_0000000052e7d68e",
    "cve_id": "CVE-2026-85241",
    "slug": "cve-2026-85241",
    "title": "CVE-2026-85241: 🚨 CVE-2026-85241",
    "summary": "🚨 CVE-2026-85241\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in SpecterOps BloodHound up to 9.5.1. The affected element is the function NewV2API of the file cmd/api/src/api/registration/v2.go of the component Graph Write Endpoint. Execu...",
    "body": "🚨 CVE-2026-85241\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in SpecterOps BloodHound up to 9.5.1. The affected element is the function NewV2API of the file cmd/api/src/api/registration/v2.go of the component Graph Write Endpoint. Executing a manipulation can lead to improper authorization. It is possible to launch the attack remotely. Upgrading to version 9.6.0-rc1, 9.6.0 and 9.7.0-rc3 is sufficient to fix this issue. This patch is called 39d1276a63e95a7713f954dea632a19651d9cebb. You should upgrade the affected component.\n\n📅 Published Date: 2026-09-03T22:30:14.587Z\n\nhttps://cvefeed.io/vuln/detail/CVE-2026-85241",
    "severity": "CRITICAL",
    "confidence_score": 0.9,
    "deduplication_key": "tg_0:99004:0000000052e7d68e",
    "content_hash": "0000000052e7d68e02ac",
    "published_at": "2026-09-03T22:45:04.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85241",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_0000000052e7",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85241\n\n📢 Source: VulDB\n\n💣 CVSS Score: 0.0 (NA)\n\n📡 Remotely Exploitable: False\n\nA weakness has been identified in SpecterOps BloodHound up to 9.5.1. The affected element is the function ",
        "weight": 0.9,
        "source_name": "tg_0",
        "source_url": "",
        "created_at": "2026-09-03T22:45:04.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000007c821138",
    "cve_id": "CVE-2026-20212",
    "slug": "cve-2026-20212",
    "title": "CVE-2026-20212: 🚨 A critical Cisco Nexus 9000 flaw lets unauthenticated remote attackers run code as root.",
    "summary": "🚨 A critical Cisco Nexus 9000 flaw lets unauthenticated remote attackers run code as root.\n\nCVE-2026-20212 leaves TCP ports 43210 and 43211 reachable in the default Layer 3 VRF on 10 switch models.\n\nAffected models, fixes, and mitigations: https://thehackernews.com/2026/09/critical-cisco-nexus-9000...",
    "body": "🚨 A critical Cisco Nexus 9000 flaw lets unauthenticated remote attackers run code as root.\n\nCVE-2026-20212 leaves TCP ports 43210 and 43211 reachable in the default Layer 3 VRF on 10 switch models.\n\nAffected models, fixes, and mitigations: https://thehackernews.com/2026/09/critical-cisco-nexus-9000-flaw-lets.html",
    "severity": "HIGH",
    "confidence_score": 0.92,
    "deduplication_key": "tg_thehackernews:9963:000000007c821138",
    "content_hash": "000000007c821138013b",
    "published_at": "2026-09-03T16:31:53.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-20212",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000007c82",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 A critical Cisco Nexus 9000 flaw lets unauthenticated remote attackers run code as root.\n\nCVE-2026-20212 leaves TCP ports 43210 and 43211 reachable in the default Layer 3 VRF on 10 switch models.\n\n",
        "weight": 0.92,
        "source_name": "tg_thehackernews",
        "source_url": "https://t.me/thehackernews/9963",
        "created_at": "2026-09-03T16:31:53.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_000000000454ef45",
    "cve_id": "CVE-2026-85224",
    "slug": "cve-2026-85224",
    "title": "CVE-2026-85224: 🚨 CVE-2026-85224",
    "summary": "🚨 CVE-2026-85224\nA vulnerability was determined in D-Link DNS-320 ShareCenter 2.06B01. This affects an unknown part of the file /cgi/file_sharing.cgi of the component File Sharing. Executing a manipulation of the argument fileurl can lead to os command injection. The attack can be launched remotely...",
    "body": "🚨 CVE-2026-85224\nA vulnerability was determined in D-Link DNS-320 ShareCenter 2.06B01. This affects an unknown part of the file /cgi/file_sharing.cgi of the component File Sharing. Executing a manipulation of the argument fileurl can lead to os command injection. The attack can be launched remotely. The exploit has been publicly disclosed and may be utilized.\n\n🎖@cveNotify",
    "severity": "HIGH",
    "confidence_score": 0.92,
    "deduplication_key": "tg_cveNotify:284760:000000000454ef45",
    "content_hash": "000000000454ef450178",
    "published_at": "2026-09-03T22:20:57.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85224",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_000000000454",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85224\nA vulnerability was determined in D-Link DNS-320 ShareCenter 2.06B01. This affects an unknown part of the file /cgi/file_sharing.cgi of the component File Sharing. Executing a manipu",
        "weight": 0.92,
        "source_name": "tg_cveNotify",
        "source_url": "https://t.me/cveNotify/284760",
        "created_at": "2026-09-03T22:20:57.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000187b859c",
    "cve_id": "CVE-2026-85223",
    "slug": "cve-2026-85223",
    "title": "CVE-2026-85223: 🚨 CVE-2026-85223",
    "summary": "🚨 CVE-2026-85223\nA vulnerability was found in D-Link DNS-340L 1.01B04. Affected by this issue is some unknown functionality of the file /cgi-bin/dropbox.cgi of the component CGI Handler. Performing a manipulation of the argument callback_url/sync_interval results in os command injection. The attack...",
    "body": "🚨 CVE-2026-85223\nA vulnerability was found in D-Link DNS-340L 1.01B04. Affected by this issue is some unknown functionality of the file /cgi-bin/dropbox.cgi of the component CGI Handler. Performing a manipulation of the argument callback_url/sync_interval results in os command injection. The attack can be initiated remotely. The exploit has been made public and could be used.\n\n🎖@cveNotify",
    "severity": "HIGH",
    "confidence_score": 0.92,
    "deduplication_key": "tg_cveNotify:284759:00000000187b859c",
    "content_hash": "00000000187b859c0189",
    "published_at": "2026-09-03T22:20:57.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-85223",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000187b",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-85223\nA vulnerability was found in D-Link DNS-340L 1.01B04. Affected by this issue is some unknown functionality of the file /cgi-bin/dropbox.cgi of the component CGI Handler. Performing a",
        "weight": 0.92,
        "source_name": "tg_cveNotify",
        "source_url": "https://t.me/cveNotify/284759",
        "created_at": "2026-09-03T22:20:57.000Z"
      }
    ]
  },
  {
    "intelligence_id": "intel_00000000640a40e6",
    "cve_id": "CVE-2026-64200",
    "slug": "cve-2026-64200",
    "title": "CVE-2026-64200: 🚨 CVE-2026-64200",
    "summary": "🚨 CVE-2026-64200\nThere is an out-of-bounds read vulnerability in DASYLab due to improper validation of user-supplied data.   This results in a read a past the end of an allocated heap buffer during string conversion.  Successful exploitation requires an attacker to get a user to open a specially cr...",
    "body": "🚨 CVE-2026-64200\nThere is an out-of-bounds read vulnerability in DASYLab due to improper validation of user-supplied data.   This results in a read a past the end of an allocated heap buffer during string conversion.  Successful exploitation requires an attacker to get a user to open a specially crafted .DSB file.  This issue affects all versions before 2026.0.0.\n\n🎖@cveNotify",
    "severity": "HIGH",
    "confidence_score": 0.92,
    "deduplication_key": "tg_cveNotify:284758:00000000640a40e6",
    "content_hash": "00000000640a40e6017c",
    "published_at": "2026-09-03T22:20:57.000Z",
    "entities": {
      "actors": [],
      "malware": [],
      "cves": [
        {
          "cve_id": "CVE-2026-64200",
          "status": "OBSERVED"
        }
      ],
      "campaigns": [],
      "tools": [],
      "techniques": [],
      "victims": [],
      "organizations": [],
      "regions": [
        "GLOBAL"
      ]
    },
    "evidence": [
      {
        "id": "evi_00000000640a",
        "type": "CVE_DISCLOSURE",
        "snippet": "🚨 CVE-2026-64200\nThere is an out-of-bounds read vulnerability in DASYLab due to improper validation of user-supplied data.   This results in a read a past the end of an allocated heap buffer during s",
        "weight": 0.92,
        "source_name": "tg_cveNotify",
        "source_url": "https://t.me/cveNotify/284758",
        "created_at": "2026-09-03T22:20:57.000Z"
      }
    ]
  }
];

const CANONICAL_INDEX = new Map<string, StoredCanonicalReport>();

// Build multi-index
for (const rep of CANONICAL_PUBLISHED_REPORTS) {
  if (rep.slug) CANONICAL_INDEX.set(rep.slug.toLowerCase(), rep);
  if (rep.cve_id) {
    CANONICAL_INDEX.set(rep.cve_id.toLowerCase(), rep);
    CANONICAL_INDEX.set(rep.cve_id.toUpperCase(), rep);
  }
  if (rep.intelligence_id) CANONICAL_INDEX.set(rep.intelligence_id, rep);
  if (rep.deduplication_key) CANONICAL_INDEX.set(rep.deduplication_key, rep);
}

import { CANONICAL_V2_PILOT_DOSSIERS } from './pilot_v2_dossiers';

export function getCanonicalReportByIdentifier(rawId: string): StoredCanonicalReport | null {
  if (!rawId) return null;
  const cleanId = rawId.replace(/^\/?(threats|articles)\//, '').trim().toLowerCase();

  // Fast-path V2: Check reprocessed pilot dossiers first
  if (CANONICAL_V2_PILOT_DOSSIERS[cleanId]) {
    return CANONICAL_V2_PILOT_DOSSIERS[cleanId];
  }

  return (
    CANONICAL_INDEX.get(cleanId) ||
    CANONICAL_INDEX.get(cleanId.toUpperCase()) ||
    CANONICAL_INDEX.get(rawId) ||
    null
  );
}
export { CANONICAL_V2_PILOT_DOSSIERS };

