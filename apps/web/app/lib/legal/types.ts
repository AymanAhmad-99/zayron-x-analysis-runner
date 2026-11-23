/**
 * ZAYRON-X legal-document model.
 *
 * Single source of truth for policy metadata and structured content. The
 * renderer (LegalDocument.tsx) and the /legal route derive everything from
 * this shape, so versioning, status, and cross-links are centralized here.
 *
 * Status vocabulary is controlled and must not be collapsed:
 *   DRAFT | PENDING_COUNSEL_REVIEW | APPROVED_FOR_PUBLICATION | CURRENT | SUPERSEDED | PLANNED
 */

export type LegalStatus =
  | "DRAFT"
  | "PENDING_COUNSEL_REVIEW"
  | "APPROVED_FOR_PUBLICATION"
  | "CURRENT"
  | "SUPERSEDED"
  | "PLANNED";

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "note"; text: string };

export interface LegalSection {
  /** Stable anchor id for in-page table-of-contents links. */
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  /** One-sentence statement of what the document is for. */
  purpose: string;
  version: string;
  status: LegalStatus;
  /** ISO date or explicit placeholder; never a fabricated date. */
  effectiveDate: string;
  lastUpdated: string;
  appliesTo: string;
  /** Slugs of closely related documents, rendered as cross-links. */
  related: string[];
  sections: LegalSection[];
}
