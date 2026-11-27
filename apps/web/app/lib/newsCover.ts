/**
 * PHASE 10A — programmatic editorial covers for the ZAYRON-X newsroom.
 *
 * Every briefing gets a distinct 1200×675 (16:9) cover rendered at the edge from
 * its own metadata. No external image, no stock photography, no hotlink and no
 * copyright exposure: the graphic is drawn as raw RGB pixels with the exact
 * design tokens (#050505 / #0d0d0c / #282724 / #f7f7f4 / #ff6b00) and encoded as
 * a real PNG by the shared encoder in `ogCard.ts`.
 *
 * A cover is a PNG, never SVG or XML, so a title containing markup can never be
 * parsed as a document. `sanitizeCoverText` additionally strips angle brackets,
 * quotes and control characters, and the glyph set maps anything unknown to `?`.
 */

import { encodePng } from './ogCard';

export const NEWS_COVER_WIDTH = 1200;
export const NEWS_COVER_HEIGHT = 675;

/** Rendered once at the edge, then served for a day; edges may keep it a week. */
export const NEWS_COVER_CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800';

type Rgb = [number, number, number];

const CANVAS_BG: Rgb = [5, 5, 5];
const SURFACE: Rgb = [13, 13, 12];
const BORDER: Rgb = [40, 39, 36];
const INK: Rgb = [247, 247, 244];
const MUTED: Rgb = [165, 163, 156];
const SUBTLE: Rgb = [119, 117, 111];
const ACCENT: Rgb = [255, 107, 0];

export type NewsCoverMotif = 'KEV' | 'VULNERABILITY' | 'MALWARE' | 'ACTOR' | 'SUPPLY_CHAIN' | 'ADVISORY';

/** Category → geometric motif. Unknown categories fall back to the advisory grid. */
export function newsCoverMotifForCategory(category: string): NewsCoverMotif {
  switch (String(category ?? '').trim().toUpperCase()) {
    case 'EXPLOITATION':
    case 'EXPLOIT':
    case 'KEV':
      return 'KEV';
    case 'VULNERABILITY':
      return 'VULNERABILITY';
    case 'MALWARE':
      return 'MALWARE';
    case 'THREAT_ACTOR':
    case 'ACTOR':
      return 'ACTOR';
    case 'SUPPLY_CHAIN':
      return 'SUPPLY_CHAIN';
    default:
      return 'ADVISORY';
  }
}

export const NEWS_COVER_MOTIF_LABEL: Record<NewsCoverMotif, string> = {
  KEV: 'EXPLOIT / KEV',
  VULNERABILITY: 'VULNERABILITY',
  MALWARE: 'MALWARE',
  ACTOR: 'THREAT ACTOR',
  SUPPLY_CHAIN: 'SUPPLY CHAIN',
  ADVISORY: 'POLICY / ADVISORY',
};

/** Deterministic 32-bit seed so the same briefing always renders identically. */
export function newsCoverSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Printable, bounded, markup-free cover text. */
export function sanitizeCoverText(value: unknown, maxLength = 160): string {
  return String(value ?? '')
    .replace(/[<>&"'`]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export interface NewsCoverSpec {
  category: string;
  severity: string;
  title: string;
  /** Primary linked entity (`CVE-2026-XXXXX`, actor name, `CISA KEV`, …). */
  entity?: string | null;
  source: string;
  publishedAt: string;
  /** Stable seed; defaults to `category|title`. */
  seed?: string;
}

/* ─────────────────────────────── glyphs ──────────────────────────────────── */

const GLYPHS: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11111 00010 00100 00010 00001 10001 01110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  '·': '00000 00000 01100 01100 00000 00000 00000',
};

const GLYPH_ROWS = 7;
const GLYPH_COLS = 5;
const SUPERSAMPLE = 2;

function glyphFor(char: string): string {
  return GLYPHS[char] ?? GLYPHS['?'];
}

/** Advance width of one character at a scale (5 glyph columns + 1 gap). */
export function coverGlyphAdvance(scale: number): number {
  return (GLYPH_COLS + 1) * scale;
}

export function measureCoverText(text: string, scale: number): number {
  const chars = [...String(text ?? '')];
  if (chars.length === 0) return 0;
  return chars.length * coverGlyphAdvance(scale) - scale;
}

class CoverCanvas {
  private readonly innerWidth = NEWS_COVER_WIDTH * SUPERSAMPLE;
  private readonly innerHeight = NEWS_COVER_HEIGHT * SUPERSAMPLE;
  private readonly pixels = new Uint8Array(this.innerWidth * this.innerHeight * 3);

  fill(color: Rgb): void {
    for (let index = 0; index < this.pixels.length; index += 3) {
      this.pixels[index] = color[0];
      this.pixels[index + 1] = color[1];
      this.pixels[index + 2] = color[2];
    }
  }

  private setInner(x: number, y: number, color: Rgb): void {
    if (x < 0 || y < 0 || x >= this.innerWidth || y >= this.innerHeight) return;
    const offset = (y * this.innerWidth + x) * 3;
    this.pixels[offset] = color[0];
    this.pixels[offset + 1] = color[1];
    this.pixels[offset + 2] = color[2];
  }

  pixel(x: number, y: number, color: Rgb): void {
    this.rect(x, y, 1, 1, color);
  }

  rect(x: number, y: number, width: number, height: number, color: Rgb): void {
    const x0 = Math.round(x * SUPERSAMPLE);
    const y0 = Math.round(y * SUPERSAMPLE);
    const w = Math.max(1, Math.round(width * SUPERSAMPLE));
    const h = Math.max(1, Math.round(height * SUPERSAMPLE));
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) this.setInner(x0 + dx, y0 + dy, color);
    }
  }

  /** Draw one line of text; returns the x it finished at. */
  text(value: string, x: number, y: number, scale: number, color: Rgb): number {
    let cursor = x;
    for (const char of String(value ?? '').toUpperCase()) {
      const rows = glyphFor(char).split(' ');
      for (let row = 0; row < GLYPH_ROWS; row += 1) {
        for (let col = 0; col < GLYPH_COLS; col += 1) {
          if (rows[row]?.[col] !== '1') continue;
          this.rect(cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
      cursor += coverGlyphAdvance(scale);
    }
    return cursor;
  }

  /** Truncate to fit `maxWidth`, ending on `..` when clipped. */
  textFit(value: string, x: number, y: number, scale: number, maxWidth: number, color: Rgb): number {
    const text = String(value ?? '').toUpperCase();
    if (measureCoverText(text, scale) <= maxWidth) return this.text(text, x, y, scale, color);
    let clipped = text;
    while (clipped.length > 0 && measureCoverText(`${clipped}..`, scale) > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return this.text(`${clipped}..`, x, y, scale, color);
  }

  /** Largest scale in `[min..max]` at which the text still fits. */
  textFitScale(
    value: string,
    x: number,
    y: number,
    minScale: number,
    maxScale: number,
    maxWidth: number,
    color: Rgb,
  ): number {
    for (let scale = maxScale; scale >= minScale; scale -= 1) {
      if (measureCoverText(String(value ?? '').toUpperCase(), scale) <= maxWidth) {
        return this.textFit(value, x, y, scale, maxWidth, color);
      }
    }
    return this.textFit(value, x, y, minScale, maxWidth, color);
  }

  /** Box-filter the supersampled buffer back to the cover resolution. */
  toRgb(): Uint8Array {
    const out = new Uint8Array(NEWS_COVER_WIDTH * NEWS_COVER_HEIGHT * 3);
    const area = SUPERSAMPLE * SUPERSAMPLE;
    for (let y = 0; y < NEWS_COVER_HEIGHT; y += 1) {
      for (let x = 0; x < NEWS_COVER_WIDTH; x += 1) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
          const rowOffset = ((y * SUPERSAMPLE + sy) * this.innerWidth + x * SUPERSAMPLE) * 3;
          for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
            const offset = rowOffset + sx * 3;
            r += this.pixels[offset];
            g += this.pixels[offset + 1];
            b += this.pixels[offset + 2];
          }
        }
        const target = (y * NEWS_COVER_WIDTH + x) * 3;
        out[target] = Math.round(r / area);
        out[target + 1] = Math.round(g / area);
        out[target + 2] = Math.round(b / area);
      }
    }
    return out;
  }
}

/* ─────────────────────────────── motifs ──────────────────────────────────── */

function line(canvas: CoverCanvas, x1: number, y1: number, x2: number, y2: number, color: Rgb): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    canvas.pixel(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), color);
  }
}

/** Concentric containment rings + crosshair — the exploit / KEV register. */
function paintKevMotif(canvas: CoverCanvas, seed: number, x: number, y: number, w: number, h: number): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rings = 4 + (seed % 3);
  for (let ring = 0; ring < rings; ring += 1) {
    const radius = 40 + ring * 44;
    const color = ring === 0 ? ACCENT : BORDER;
    for (let angle = 0; angle < 360; angle += 1) {
      const rad = (angle * Math.PI) / 180;
      canvas.pixel(Math.round(cx + Math.cos(rad) * radius), Math.round(cy + Math.sin(rad) * radius * 0.62), color);
    }
  }
  line(canvas, x + 20, cy, x + w - 20, cy, BORDER);
  line(canvas, cx, y + 16, cx, y + h - 16, BORDER);
  const spread = 140 + (seed % 40);
  line(canvas, cx - spread, cy - 62, cx + spread, cy + 62, BORDER);
  line(canvas, cx - spread, cy + 62, cx + spread, cy - 62, BORDER);
  canvas.rect(cx - 5, cy - 5, 11, 11, ACCENT);
}

/** Severity ladder — descending bars, the peak carrying the accent. */
function paintVulnerabilityMotif(canvas: CoverCanvas, seed: number, x: number, y: number, w: number, h: number): void {
  const bars = 9;
  const gap = 13;
  const barWidth = (w - gap * (bars - 1)) / bars;
  const peak = 3 + (seed % 3);
  for (let index = 0; index < bars; index += 1) {
    const ratio = 0.24 + ((index * 37 + (seed % 17)) % 100) / 150;
    const barHeight = Math.round(h * Math.min(0.94, ratio + (index === peak ? 0.2 : 0)));
    const left = Math.round(x + index * (barWidth + gap));
    canvas.rect(left, y + h - barHeight, Math.round(barWidth), barHeight, index === peak ? ACCENT : BORDER);
    canvas.rect(left, y + h - barHeight, Math.round(barWidth), 2, index === peak ? ACCENT : SUBTLE);
  }
  line(canvas, x, y + h, x + w, y + h, BORDER);
}

/** Layered waveform — obfuscated execution, not a stock "hacker" trope. */
function paintMalwareMotif(canvas: CoverCanvas, seed: number, x: number, y: number, w: number, h: number): void {
  const rows = 11;
  for (let row = 0; row < rows; row += 1) {
    const top = y + Math.round((row * h) / rows);
    const amplitude = 0.34 + (((row * 29 + seed) % 60) / 100);
    const width = Math.round(w * Math.min(1, amplitude));
    const offset = (seed + row * 13) % Math.max(1, w - width);
    const accentRow = row === 5 + (seed % 2);
    canvas.rect(Math.round(x + offset), top, width, 3, accentRow ? ACCENT : BORDER);
    canvas.rect(Math.round(x + offset), top, 3, 3, accentRow ? ACCENT : SUBTLE);
  }
  line(canvas, x, y + h, x + w, y + h, BORDER);
}

/** Node graph — actor infrastructure. */
function paintActorMotif(canvas: CoverCanvas, seed: number, x: number, y: number, w: number, h: number): void {
  const nodes = [
    { x: x + w * 0.2, y: y + h * 0.3, r: 9 },
    { x: x + w * 0.5, y: y + h * 0.18, r: 6 },
    { x: x + w * 0.78, y: y + h * 0.36, r: 8 },
    { x: x + w * 0.34, y: y + h * 0.66, r: 6 },
    { x: x + w * 0.63, y: y + h * 0.76, r: 10 },
    { x: x + w * 0.88, y: y + h * 0.62, r: 5 },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [0, 3],
    [3, 4],
    [4, 2],
    [2, 5],
    [4, 5],
  ];
  for (const [from, to] of edges) line(canvas, nodes[from].x, nodes[from].y, nodes[to].x, nodes[to].y, BORDER);
  const accentNode = 4 - (seed % 2);
  nodes.forEach((node, index) => {
    const color = index === accentNode ? ACCENT : MUTED;
    canvas.rect(Math.round(node.x - node.r / 2), Math.round(node.y - node.r / 2), node.r, node.r, color);
    canvas.rect(Math.round(node.x - node.r / 2) - 6, Math.round(node.y - node.r / 2) - 6, node.r + 12, 1, BORDER);
  });
}

/** Chained blocks — one compromised link in a delivery pipeline. */
function paintSupplyChainMotif(canvas: CoverCanvas, seed: number, x: number, y: number, w: number, h: number): void {
  const blocks = 4;
  const gap = w * 0.08;
  const blockWidth = (w - gap * (blocks - 1)) / blocks;
  const compromised = seed % blocks;
  for (let index = 0; index < blocks; index += 1) {
    const left = Math.round(x + index * (blockWidth + gap));
    const top = Math.round(y + h * 0.28 + ((index + (seed % 3)) % 2) * 18);
    const height = Math.round(h * 0.42);
    const width = Math.round(blockWidth);
    const outline = index === compromised ? ACCENT : BORDER;
    canvas.rect(left, top, width, height, SURFACE);
    canvas.rect(left, top, width, 1, outline);
    canvas.rect(left, top + height - 1, width, 1, outline);
    canvas.rect(left, top, 1, height, outline);
    canvas.rect(left + width - 1, top, 1, height, outline);
    canvas.rect(left + 10, top + 12, Math.max(1, width - 20), 2, index === compromised ? ACCENT : SUBTLE);
    if (index < blocks - 1) {
      const linkX = left + width + Math.round(gap / 2) - 3;
      canvas.rect(linkX, top + Math.round(height / 2) - 1, 6, 2, BORDER);
    }
  }
  line(canvas, x, y + h, x + w, y + h, BORDER);
}

/** Document rules + seal — the advisory register. */
function paintAdvisoryMotif(canvas: CoverCanvas, seed: number, x: number, y: number, w: number, h: number): void {
  const rows = 8;
  for (let row = 0; row < rows; row += 1) {
    const top = y + 18 + Math.round((row * (h - 40)) / rows);
    const ratio = 0.4 + (((row * 31 + seed) % 55) / 100);
    canvas.rect(x, top, Math.round(w * Math.min(1, ratio)), 2, row === 1 ? ACCENT : BORDER);
  }
  const cx = x + w * 0.82;
  const cy = y + h * 0.42;
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = 34 + ring * 12;
    for (let angle = 0; angle < 360; angle += 1) {
      const rad = (angle * Math.PI) / 180;
      canvas.pixel(Math.round(cx + Math.cos(rad) * radius), Math.round(cy + Math.sin(rad) * radius), BORDER);
    }
  }
  canvas.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5, ACCENT);
}

const MOTIF_PAINTERS: Record<
  NewsCoverMotif,
  (canvas: CoverCanvas, seed: number, x: number, y: number, w: number, h: number) => void
> = {
  KEV: paintKevMotif,
  VULNERABILITY: paintVulnerabilityMotif,
  MALWARE: paintMalwareMotif,
  ACTOR: paintActorMotif,
  SUPPLY_CHAIN: paintSupplyChainMotif,
  ADVISORY: paintAdvisoryMotif,
};

/** Balanced word wrap into at most `maxLines` lines. */
export function coverTitleLines(title: string, maxLines = 3): string[] {
  const words = sanitizeCoverText(title, 180).split(' ').filter(Boolean);
  if (words.length === 0) return ['BRIEFING'];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > 26 && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const head = lines.slice(0, maxLines);
  head[maxLines - 1] = `${head[maxLines - 1].slice(0, 22)}..`;
  return head;
}

/** Paint one editorial cover and return its RGB buffer (exported for tests). */
export function paintNewsCover(spec: NewsCoverSpec): Uint8Array {
  const canvas = new CoverCanvas();
  canvas.fill(CANVAS_BG);

  const motif = newsCoverMotifForCategory(spec.category);
  const seed = newsCoverSeed(spec.seed ?? `${spec.category}|${spec.title}`);

  // Hairline grid above the footer rule.
  for (let x = 0; x < NEWS_COVER_WIDTH; x += 80) canvas.rect(x, 0, 1, NEWS_COVER_HEIGHT - 96, BORDER);
  for (let y = 0; y < NEWS_COVER_HEIGHT - 96; y += 80) canvas.rect(0, y, NEWS_COVER_WIDTH, 1, BORDER);

  // Top bar.
  canvas.text('ZAYRON-X', 48, 34, 3, INK);
  const briefing = '// BRIEFING';
  canvas.text(briefing, NEWS_COVER_WIDTH - 48 - measureCoverText(briefing, 2), 42, 2, SUBTLE);
  canvas.rect(48, 96, NEWS_COVER_WIDTH - 96, 1, BORDER);

  // Left column: category badge + headline.
  const badge = NEWS_COVER_MOTIF_LABEL[motif];
  canvas.rect(48, 138, 2, 22, ACCENT);
  canvas.text(badge, 64, 138, 2, ACCENT);

  const lines = coverTitleLines(spec.title, 3);
  const longest = lines.reduce((max, value) => Math.max(max, value.length), 1);
  const scale = Math.max(3, Math.min(9, Math.floor(610 / (longest * (GLYPH_COLS + 1)))));
  let titleTop = 190;
  for (const titleLine of lines) {
    canvas.text(titleLine, 48, titleTop, scale, INK);
    titleTop += GLYPH_ROWS * scale + 16;
  }

  // Entity chip: the primary linked entity, or an explicit absence.
  const entity = sanitizeCoverText(spec.entity ?? '', 34);
  const chipTop = Math.min(452, Math.max(titleTop + 12, 396));
  if (entity) {
    const chipText = `LINKED: ${entity}`.toUpperCase();
    const chipWidth = measureCoverText(chipText, 2) + 28;
    canvas.rect(48, chipTop, chipWidth, 34, SURFACE);
    canvas.rect(48, chipTop, 2, 34, ACCENT);
    canvas.text(chipText, 64, chipTop + 10, 2, INK);
  } else {
    canvas.rect(48, chipTop, 2, 34, BORDER);
    canvas.text('NO LINKED ENTITY', 64, chipTop + 10, 2, SUBTLE);
  }

  // Right column: framed motif.
  const frameX = 700;
  const frameY = 140;
  const frameW = 452;
  const frameH = 372;
  canvas.rect(frameX, frameY, frameW, frameH, SURFACE);
  canvas.rect(frameX, frameY, frameW, 1, BORDER);
  canvas.rect(frameX, frameY + frameH - 1, frameW, 1, BORDER);
  canvas.rect(frameX, frameY, 1, frameH, BORDER);
  canvas.rect(frameX + frameW - 1, frameY, 1, frameH, BORDER);
  MOTIF_PAINTERS[motif](canvas, seed, frameX + 24, frameY + 24, frameW - 48, frameH - 48);
  canvas.text('SOURCE-TRACKED TELEMETRY', frameX, frameY + frameH + 14, 2, SUBTLE);

  // Severity marker.
  const severity = sanitizeCoverText(spec.severity || 'INFO', 16).toUpperCase();
  const severityLine = `SEVERITY: ${severity}`;
  canvas.text(severityLine, NEWS_COVER_WIDTH - 48 - measureCoverText(severityLine, 2), 138, 2, MUTED);

  // Footer.
  canvas.rect(0, NEWS_COVER_HEIGHT - 96, NEWS_COVER_WIDTH, 1, BORDER);
  canvas.rect(0, NEWS_COVER_HEIGHT - 96, NEWS_COVER_WIDTH, 96, SURFACE);
  const source = sanitizeCoverText(spec.source || 'ZAYRON-X', 40).toUpperCase();
  canvas.textFitScale(source, 48, NEWS_COVER_HEIGHT - 58, 2, 3, 620, MUTED);
  const stamp = 'ZAYRON-X // BRIEFING';
  canvas.text(stamp, NEWS_COVER_WIDTH - 48 - measureCoverText(stamp, 2), NEWS_COVER_HEIGHT - 58, 2, SUBTLE);
  const date = sanitizeCoverText(String(spec.publishedAt ?? '').slice(0, 10), 10);
  if (date) canvas.text(date, 48, NEWS_COVER_HEIGHT - 30, 2, SUBTLE);
  canvas.rect(NEWS_COVER_WIDTH - 168, NEWS_COVER_HEIGHT - 34, 120, 2, ACCENT);

  return canvas.toRgb();
}

/** The endpoint payload: a real 1200×675 PNG cover. */
export async function renderNewsCoverPng(spec: NewsCoverSpec): Promise<Uint8Array> {
  return encodePng(NEWS_COVER_WIDTH, NEWS_COVER_HEIGHT, paintNewsCover(spec));
}

/** Shared response for `/api/news-cover/[slug]`. */
export async function newsCoverResponse(spec: NewsCoverSpec): Promise<Response> {
  const png = await renderNewsCoverPng(spec);
  return new Response(png, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'content-length': String(png.length),
      'cache-control': NEWS_COVER_CACHE_CONTROL,
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Cover spec derived from a stored briefing; safe when metadata is absent. */
export function newsCoverSpecFromArticle(article: {
  slug: string;
  title: string;
  category: string;
  severity: string;
  source_name: string;
  published_at: string;
  mentions?: Array<{ entity_type: string; entity_label: string; in_catalog: number }>;
  graph_enrichment?: { cves?: Array<{ cve_id: string; cisa_kev?: boolean }> };
}): NewsCoverSpec {
  const cve = article.graph_enrichment?.cves?.[0];
  const linked = (article.mentions ?? []).find((mention) => mention.in_catalog === 1)?.entity_label;
  const entity = cve ? (cve.cisa_kev ? `${cve.cve_id} · CISA KEV` : cve.cve_id) : linked ?? null;
  return {
    category: article.category,
    severity: article.severity,
    title: article.title,
    entity,
    source: article.source_name,
    publishedAt: article.published_at,
    seed: article.slug,
  };
}
