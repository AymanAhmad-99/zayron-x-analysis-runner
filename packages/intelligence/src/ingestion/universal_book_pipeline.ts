/**
 * ZAYRON-X — UNIVERSAL BOOK INGESTION & SEMANTIC CHUNKING ENGINE
 * 
 * Reusable, multi-format pipeline for authoritative books, specifications, and standards:
 * - PDF: Page-aware structural extraction via pypdf
 * - HTML: Clean DOM parsing with strict boilerplate/nav removal
 * - Markdown: Header-hierarchy and table preservation
 * - Plain Text: Semantic paragraph & section detection
 * 
 * Strict quality limits: rejects empty, oversized (>4k chars), duplicated, or boilerplate chunks.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

export type SupportedFormat = 'PDF' | 'HTML' | 'MARKDOWN' | 'TEXT';

export const PIPELINE_VERSION = 'v2.1.0';

export interface DocumentInput {
  filePath: string;
  documentId: string;
  documentTitle: string;
  domain: string;
  authorityTier: number;
  format?: SupportedFormat;
  version?: string;
  sourceUrl?: string;
}

export interface RawSectionNode {
  chapter?: string;
  section?: string;
  subsection?: string;
  tableId?: string;
  page?: number;
  content: string;
  isTable?: boolean;
  byteOffsetStart?: number;
  byteOffsetEnd?: number;
}

export interface SourceTraceability {
  source_path: string;
  document_id: string;
  document_title: string;
  section_path: string; // e.g. "Chapter 2 > Section 2.1 > Table 1"
  page: number | null;
  table_id: string | null;
  content_hash: string;
}

export interface SemanticChunk {
  id: string;
  document_id: string;
  document_title: string;
  chapter: string;
  section: string;
  subsection: string;
  table_id: string | null;
  page: number | null;
  text: string;
  char_count: number;
  token_count: number;
  authority_tier: number;
  domain: string;
  content_hash: string;
  embedding_id: string;
  traceability: SourceTraceability;
  metadata: Record<string, any>;
}

export interface ChunkQualityMetrics {
  total_chunks: number;
  avg_char_size: number;
  min_char_size: number;
  max_char_size: number;
  p95_char_size: number;
  oversized_chunks: number; // > 4000 chars (hard limit)
  empty_chunks_rejected: number;
  boilerplate_chunks_rejected: number;
  duplicate_chunks_rejected: number;
  size_buckets: {
    under_500: number;
    between_500_1500: number;
    between_1500_2500: number;
    between_2500_4000: number;
    over_4000: number;
  };
  sections_detected: string[];
}

export interface BookIngestionResult {
  documentId: string;
  documentTitle: string;
  format: SupportedFormat;
  documentContentHash: string;
  pipelineVersion: string;
  skippedDueToIdempotency: boolean;
  extraction: {
    rawCharacters: number;
    structuralNodes: number;
    sectionsDetected: number;
  };
  chunks: SemanticChunk[];
  metrics: ChunkQualityMetrics;
  d1Records: any[];
  vectorPayloads: any[];
}

export interface ExtractionResult {
  documentId: string;
  documentTitle: string;
  format: SupportedFormat;
  rawTextLength: number;
  sectionsDetected: number;
  nodes: RawSectionNode[];
}

// Regex patterns to identify navigation, cookie notices, and non-content noise in HTML/documents
const BOILERPLATE_REGEXES = [
  /member portal/i,
  /board of directors/i,
  /operations team/i,
  /sustainable development goals/i,
  /cookie policy|privacy policy|terms of use/i,
  /subscribe to newsletter/i,
  /copyright\s+\d{4}\s+first/i,
  /all rights reserved/i,
  /skip to main content/i
];

/**
 * Detects format from extension if not explicitly specified.
 */
export function detectFormat(filePath: string): SupportedFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'PDF';
  if (ext === '.html' || ext === '.htm') return 'HTML';
  if (ext === '.md' || ext === '.markdown') return 'MARKDOWN';
  return 'TEXT';
}

/**
 * Extracts raw structural nodes from PDF using python pypdf page-by-page.
 */
export function extractFromPdf(filePath: string): RawSectionNode[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const helperScript = path.resolve(__dirname, 'extract_pdf.py');
  try {
    const rawOut = execSync(`python "${helperScript}" "${path.resolve(filePath)}"`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf8',
    });
    const parsed: { page: number; text: string }[] = JSON.parse(rawOut);

    const nodes: RawSectionNode[] = [];
    let currentChapter = 'UNKNOWN';
    let currentSection = 'UNKNOWN';

    for (const p of parsed) {
      if (!p.text) continue;
      const lines = p.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let buffer: string[] = [];

      for (const line of lines) {
        // Detect section headers (e.g. "1. Introduction", "Section 2.1", "Chapter 3")
        const secMatch = line.match(/^(?:Chapter|Section|\d+\.\d+|\d+\.)\s+(.+)$/i);
        if (secMatch && line.length < 100) {
          if (buffer.length > 0) {
            nodes.push({
              chapter: currentChapter,
              section: currentSection,
              page: p.page,
              content: buffer.join(' ')
            });
            buffer = [];
          }
          currentSection = line;
        } else {
          buffer.push(line);
        }
      }

      if (buffer.length > 0) {
        nodes.push({
          chapter: currentChapter,
          section: currentSection,
          page: p.page,
          content: buffer.join(' ')
        });
      }
    }

    return nodes;
  } catch (err: any) {
    throw new Error(`PDF extraction failed: ${err?.message || String(err)}`);
  }
}

/**
 * Extracts raw structural nodes from HTML, aggressively stripping boilerplate.
 */
export function extractFromHtml(filePath: string): RawSectionNode[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // Strip script, style, svg, nav, header, footer, noscript
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  html = html.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  html = html.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
  html = html.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');
  html = html.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
  html = html.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ');

  // Extract sections by headers (h1 - h6) and tables
  const nodes: RawSectionNode[] = [];
  let currentChapter = 'Specification';
  let currentSection = 'Introduction';
  let currentSubsection = 'UNKNOWN';

  // Split by headings or tables
  const tagRegex = /<(h[1-6]|table)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Process text before first match
  const processParagraphs = (htmlSnippet: string, ch: string, sec: string, subsec: string) => {
    // Strip remaining tags
    const cleanText = htmlSnippet
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText.length > 30) {
      // Check if it's purely navigation boilerplate
      const isBoilerplate = BOILERPLATE_REGEXES.some(pat => pat.test(cleanText)) && cleanText.length < 300;
      if (!isBoilerplate) {
        nodes.push({
          chapter: ch,
          section: sec,
          subsection: subsec,
          content: cleanText
        });
      }
    }
  };

  while ((match = tagRegex.exec(html)) !== null) {
    const textBetween = html.slice(lastIndex, match.index);
    if (textBetween.trim()) {
      processParagraphs(textBetween, currentChapter, currentSection, currentSubsection);
    }

    const tagName = match[1].toLowerCase();
    const innerHtml = match[2];

    if (tagName.startsWith('h')) {
      const headingText = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (tagName === 'h1' || tagName === 'h2') {
        currentSection = headingText || 'UNKNOWN';
        currentSubsection = 'UNKNOWN';
      } else {
        currentSubsection = headingText || 'UNKNOWN';
      }
    } else if (tagName === 'table') {
      // Clean table text
      const tableText = innerHtml
        .replace(/<th(?:\s+[^>]*)?>/gi, ' [Header: ')
        .replace(/<\/th>/gi, '] ')
        .replace(/<td(?:\s+[^>]*)?>/gi, ' | ')
        .replace(/<\/td>/gi, '')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Look for caption or table title
      const capMatch = innerHtml.match(/<caption(?:\s+[^>]*)?>([\s\S]*?)<\/caption>/i);
      const tableId = capMatch ? capMatch[1].replace(/<[^>]+>/g, ' ').trim() : `Table in ${currentSection}`;

      if (tableText.length > 20) {
        nodes.push({
          chapter: currentChapter,
          section: currentSection,
          subsection: currentSubsection,
          tableId,
          isTable: true,
          content: tableText
        });
      }
    }

    lastIndex = tagRegex.lastIndex;
  }

  // Trailing text
  if (lastIndex < html.length) {
    processParagraphs(html.slice(lastIndex), currentChapter, currentSection, currentSubsection);
  }

  return nodes;
}

/**
 * Extracts raw structural nodes from Markdown.
 */
export function extractFromMarkdown(filePath: string): RawSectionNode[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const nodes: RawSectionNode[] = [];

  let currentChapter = 'Main';
  let currentSection = 'Overview';
  let currentSubsection = 'UNKNOWN';
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length > 0) {
      const text = buffer.join('\n').trim();
      if (text.length > 20) {
        nodes.push({
          chapter: currentChapter,
          section: currentSection,
          subsection: currentSubsection,
          content: text
        });
      }
      buffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      flush();
      currentChapter = trimmed.replace(/^#\s+/, '');
    } else if (trimmed.startsWith('## ')) {
      flush();
      currentSection = trimmed.replace(/^##\s+/, '');
      currentSubsection = 'UNKNOWN';
    } else if (trimmed.startsWith('### ')) {
      flush();
      currentSubsection = trimmed.replace(/^###\s+/, '');
    } else {
      buffer.push(trimmed);
    }
  }
  flush();

  return nodes;
}

/**
 * Generic extraction dispatcher.
 */
export function extractDocument(input: DocumentInput): ExtractionResult {
  const format = input.format || detectFormat(input.filePath);
  let nodes: RawSectionNode[] = [];

  switch (format) {
    case 'PDF':
      nodes = extractFromPdf(input.filePath);
      break;
    case 'HTML':
      nodes = extractFromHtml(input.filePath);
      break;
    case 'MARKDOWN':
      nodes = extractFromMarkdown(input.filePath);
      break;
    case 'TEXT':
      const text = fs.readFileSync(input.filePath, 'utf8');
      nodes = text.split(/\n\s*\n/).map(p => ({
        chapter: 'UNKNOWN',
        section: 'UNKNOWN',
        content: p.trim()
      })).filter(n => n.content.length > 0);
      break;
  }

  const rawTextLength = nodes.reduce((sum, n) => sum + n.content.length, 0);
  const sectionsDetected = new Set(nodes.map(n => n.section).filter(s => s && s !== 'UNKNOWN')).size;

  return {
    documentId: input.documentId,
    documentTitle: input.documentTitle,
    format,
    rawTextLength,
    sectionsDetected,
    nodes
  };
}

/**
 * Semantic Chunking Engine
 * Converts raw section nodes into semantically local, bounded chunks (400 - 1800 chars).
 * Strictly flags/rejects empty, oversized (>4000 chars), duplicate, or boilerplate chunks.
 */
export function chunkDocumentNodes(
  extraction: ExtractionResult,
  input: DocumentInput,
  targetChunkChars: number = 900
): { chunks: SemanticChunk[]; metrics: ChunkQualityMetrics } {
  const chunks: SemanticChunk[] = [];
  const seenHashes = new Set<string>();
  const sectionsDetected = new Set<string>();

  let emptyRejected = 0;
  let boilerplateRejected = 0;
  let duplicateRejected = 0;
  let oversizedCount = 0;

  const sizeBuckets = {
    under_500: 0,
    between_500_1500: 0,
    between_1500_2500: 0,
    between_2500_4000: 0,
    over_4000: 0,
  };

  let chunkSeq = 1;

  for (const node of extraction.nodes) {
    const rawContent = node.content.trim();
    if (!rawContent || rawContent.length < 25) {
      emptyRejected++;
      continue;
    }

    // Check boilerplate
    if (BOILERPLATE_REGEXES.some(pat => pat.test(rawContent)) && rawContent.length < 350) {
      boilerplateRejected++;
      continue;
    }

    if (node.section && node.section !== 'UNKNOWN') {
      sectionsDetected.add(node.section);
    }

    // Split node into target-sized coherent blocks if larger than 1800 chars
    const blocks: string[] = [];
    if (node.content.length <= 1800) {
      blocks.push(node.content);
    } else {
      // Split by sentence boundaries
      const sentences = node.content.split(/(?<=[.?!])\s+/);
      let curBlock: string[] = [];
      let curLen = 0;

      for (const sent of sentences) {
        if (curLen + sent.length > targetChunkChars && curBlock.length > 0) {
          blocks.push(curBlock.join(' '));
          curBlock = [sent];
          curLen = sent.length;
        } else {
          curBlock.push(sent);
          curLen += sent.length;
        }
      }
      if (curBlock.length > 0) {
        blocks.push(curBlock.join(' '));
      }
    }

    // Strict Hard Ceiling Enforcement: Guarantee zero chunks exceed 4,000 characters
    const safeBlocks: string[] = [];
    for (const rawB of blocks) {
      if (rawB.length <= 3500) {
        safeBlocks.push(rawB);
      } else {
        let remainder = rawB;
        while (remainder.length > 0) {
          if (remainder.length <= 3500) {
            safeBlocks.push(remainder);
            break;
          }
          let splitIdx = remainder.lastIndexOf('. ', 3200);
          if (splitIdx < 1500) splitIdx = remainder.lastIndexOf('; ', 3200);
          if (splitIdx < 1500) splitIdx = remainder.lastIndexOf(' ', 3200);
          if (splitIdx < 1000) splitIdx = 3200;
          safeBlocks.push(remainder.slice(0, splitIdx + 1).trim());
          remainder = remainder.slice(splitIdx + 1).trim();
        }
      }
    }

    for (const block of safeBlocks) {
      const trimmedBlock = block.trim();
      const charLen = trimmedBlock.length;

      if (charLen < 25) {
        emptyRejected++;
        continue;
      }

      // Check duplicates
      const hash = crypto.createHash('sha256').update(trimmedBlock).digest('hex');
      if (seenHashes.has(hash)) {
        duplicateRejected++;
        continue;
      }
      seenHashes.add(hash);

      // Bucket sizing
      if (charLen < 500) sizeBuckets.under_500++;
      else if (charLen <= 1500) sizeBuckets.between_500_1500++;
      else if (charLen <= 2500) sizeBuckets.between_1500_2500++;
      else if (charLen <= 4000) sizeBuckets.between_2500_4000++;
      else {
        sizeBuckets.over_4000++;
        oversizedCount++;
      }

      // Compute section path
      const pathParts = [node.chapter, node.section, node.subsection, node.tableId]
        .filter(p => p && p !== 'UNKNOWN');
      const sectionPath = pathParts.length > 0 ? pathParts.join(' > ') : 'General Document Content';

      const chunkId = `${input.documentId}-p${node.page || 1}-${chunkSeq}`;
      const chunk: SemanticChunk = {
        id: chunkId,
        document_id: input.documentId,
        document_title: input.documentTitle,
        chapter: node.chapter || 'UNKNOWN',
        section: node.section || 'UNKNOWN',
        subsection: node.subsection || 'UNKNOWN',
        table_id: node.tableId || null,
        page: node.page || null,
        text: trimmedBlock,
        char_count: charLen,
        token_count: Math.ceil(charLen / 4),
        authority_tier: input.authorityTier,
        domain: input.domain,
        content_hash: hash,
        embedding_id: `vec_${chunkId}`,
        traceability: {
          source_path: input.filePath,
          document_id: input.documentId,
          document_title: input.documentTitle,
          section_path: sectionPath,
          page: node.page || null,
          table_id: node.tableId || null,
          content_hash: hash
        },
        metadata: {
          document_id: input.documentId,
          document_title: input.documentTitle,
          chapter: node.chapter || 'UNKNOWN',
          section: node.section || 'UNKNOWN',
          subsection: node.subsection || 'UNKNOWN',
          table_id: node.tableId || null,
          page: node.page || null,
          domain: input.domain,
          authority_tier: input.authorityTier,
          chunk_seq: chunkSeq,
          source_path: input.filePath,
          section_path: sectionPath
        }
      };

      chunks.push(chunk);
      chunkSeq++;
    }
  }

  const charSizes = chunks.map(c => c.char_count).sort((a, b) => a - b);
  const avgSize = charSizes.length > 0 ? Math.round(charSizes.reduce((a, b) => a + b, 0) / charSizes.length) : 0;
  const minSize = charSizes.length > 0 ? charSizes[0] : 0;
  const maxSize = charSizes.length > 0 ? charSizes[charSizes.length - 1] : 0;
  const p95Idx = Math.floor(charSizes.length * 0.95);
  const p95Size = charSizes.length > 0 ? charSizes[Math.min(p95Idx, charSizes.length - 1)] : 0;

  return {
    chunks,
    metrics: {
      total_chunks: chunks.length,
      avg_char_size: avgSize,
      min_char_size: minSize,
      max_char_size: maxSize,
      p95_char_size: p95Size,
      oversized_chunks: oversizedCount,
      empty_chunks_rejected: emptyRejected,
      boilerplate_chunks_rejected: boilerplateRejected,
      duplicate_chunks_rejected: duplicateRejected,
      size_buckets: sizeBuckets,
      sections_detected: Array.from(sectionsDetected)
    }
  };
}

/**
 * Computes SHA-256 hash of entire source document file.
 */
export function computeDocumentHash(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Idempotency registry checkpoint path
 */
const IDEMPOTENCY_REGISTRY_PATH = '.zayron/knowledge/ingestion_idempotency_registry.json';

export interface IdempotencyRecord {
  documentId: string;
  contentHash: string;
  pipelineVersion: string;
  processedAt: string;
  chunkCount: number;
}

export function loadIdempotencyRegistry(): Record<string, IdempotencyRecord> {
  if (fs.existsSync(IDEMPOTENCY_REGISTRY_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(IDEMPOTENCY_REGISTRY_PATH, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

export function saveIdempotencyRegistry(registry: Record<string, IdempotencyRecord>) {
  const dir = path.dirname(IDEMPOTENCY_REGISTRY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(IDEMPOTENCY_REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

/**
 * Generates D1-compatible SQL batch records
 */
export function generateD1Records(chunks: SemanticChunk[]): any[] {
  return chunks.map(c => ({
    id: c.id,
    document_id: c.document_id,
    source_id: c.metadata.source_id || c.document_id,
    section: c.section,
    page: c.page,
    text: c.text,
    embedding_id: c.embedding_id,
    authority_tier: c.authority_tier,
    token_count: c.token_count,
    version: PIPELINE_VERSION,
    content_hash: c.content_hash,
    metadata: JSON.stringify(c.metadata)
  }));
}

/**
 * Generates deterministic 768d vector for testing/embedding validation
 */
export function generateDeterministic768dVector(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vec: number[] = [];
  for (let i = 0; i < 768; i++) {
    const byte = hash[i % hash.length];
    vec.push(((byte / 128) - 1.0) * Math.sin(i + 1));
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map(v => v / norm);
}

/**
 * Generates Vectorize-compatible vector payload objects
 */
export function generateVectorizePayloads(chunks: SemanticChunk[], vectorProvider?: (text: string) => number[]): any[] {
  const getVec = vectorProvider || generateDeterministic768dVector;
  return chunks.map(c => ({
    id: c.embedding_id,
    values: getVec(c.text),
    metadata: {
      chunk_id: c.id,
      document_id: c.document_id,
      document_title: c.document_title,
      section: c.section,
      subsection: c.subsection,
      table_id: c.table_id,
      page: c.page,
      domain: c.domain,
      section_path: c.traceability.section_path,
      content_hash: c.content_hash
    }
  }));
}

/**
 * PRODUCTION-GRADE UNIFIED BOOK INGESTION PIPELINE
 * Processes any supported document format (PDF, HTML, Markdown, Plain Text)
 * Enforces strict quality limits, determinism, traceability, and idempotency.
 */
export function processBook(input: DocumentInput, options?: { forceReprocess?: boolean }): BookIngestionResult {
  const docHash = computeDocumentHash(input.filePath);
  const format = input.format || detectFormat(input.filePath);
  const registry = loadIdempotencyRegistry();

  // Check idempotency: same document ID + same content hash + same pipeline version
  const existing = registry[input.documentId];
  if (!options?.forceReprocess && existing && existing.contentHash === docHash && existing.pipelineVersion === PIPELINE_VERSION) {
    return {
      documentId: input.documentId,
      documentTitle: input.documentTitle,
      format,
      documentContentHash: docHash,
      pipelineVersion: PIPELINE_VERSION,
      skippedDueToIdempotency: true,
      extraction: { rawCharacters: 0, structuralNodes: 0, sectionsDetected: 0 },
      chunks: [],
      metrics: {
        total_chunks: existing.chunkCount,
        avg_char_size: 0,
        min_char_size: 0,
        max_char_size: 0,
        p95_char_size: 0,
        oversized_chunks: 0,
        empty_chunks_rejected: 0,
        boilerplate_chunks_rejected: 0,
        duplicate_chunks_rejected: 0,
        size_buckets: { under_500: 0, between_500_1500: 0, between_1500_2500: 0, between_2500_4000: 0, over_4000: 0 },
        sections_detected: []
      },
      d1Records: [],
      vectorPayloads: []
    };
  }

  // 1. Extraction
  const extraction = extractDocument(input);

  // 2. Semantic Chunking & Quality Gating
  const { chunks, metrics } = chunkDocumentNodes(extraction, input, 1000);

  // 3. D1 Record Generation
  const d1Records = generateD1Records(chunks);

  // 4. Vectorize Payload Generation (768d)
  const vectorPayloads = generateVectorizePayloads(chunks);

  // 5. Update Idempotency Registry
  registry[input.documentId] = {
    documentId: input.documentId,
    contentHash: docHash,
    pipelineVersion: PIPELINE_VERSION,
    processedAt: new Date().toISOString(),
    chunkCount: chunks.length
  };
  saveIdempotencyRegistry(registry);

  return {
    documentId: input.documentId,
    documentTitle: input.documentTitle,
    format,
    documentContentHash: docHash,
    pipelineVersion: PIPELINE_VERSION,
    skippedDueToIdempotency: false,
    extraction: {
      rawCharacters: extraction.rawTextLength,
      structuralNodes: extraction.nodes.length,
      sectionsDetected: extraction.sectionsDetected
    },
    chunks,
    metrics,
    d1Records,
    vectorPayloads
  };
}
