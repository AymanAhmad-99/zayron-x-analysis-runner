/**
 * PHASE 10A-POLISH — programmatic editorial covers (`og:image` / `twitter:image`).
 *
 * A 1200×675 PNG drawn as supersampled, anti-aliased geometry: radial ambient
 * light, concentric rings, severity ladders, signal traces and modular matrices.
 *
 * NO TEXT IS RASTERISED. The crude bitmap font that produced dotted, clipped
 * characters is gone; a cover carries no headline at all, so a title can never
 * appear twice and no glyph can ever be jagged. Headlines, category pills and
 * entity chips are typeset by the DOM in `EditorialNewsArtwork`, where real
 * fonts stay sharp at every density.
 *
 * A cover is still a PNG, never SVG or XML, so nothing in the payload is parsed
 * as a document.
 */

import { encodePng } from './ogCard';
import { newsArtEntity, newsArtMotif, newsArtSeed, type NewsArtMotif } from './newsArt';

export const NEWS_COVER_WIDTH = 1200;
export const NEWS_COVER_HEIGHT = 675;

/** Rendered once at the edge, then served for a day; edges may keep it a week. */
export const NEWS_COVER_CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800';

type Rgb = [number, number, number];

const CANVAS_BG: Rgb = [5, 5, 5];
const SURFACE: Rgb = [13, 13, 12];
const RAISED: Rgb = [17, 17, 16];
const BORDER: Rgb = [40, 39, 36];
const HAIRLINE: Rgb = [64, 61, 56];
const MUTED: Rgb = [165, 163, 156];
const SUBTLE: Rgb = [119, 117, 111];
const ACCENT: Rgb = [255, 107, 0];

/** 2× supersampling: every edge resolves below a device pixel. */
const SS = 2;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

class ArtCanvas {
  readonly width = NEWS_COVER_WIDTH * SS;
  readonly height = NEWS_COVER_HEIGHT * SS;
  private readonly buffer = new Float32Array(this.width * this.height * 3);

  constructor(background: Rgb) {
    for (let index = 0; index < this.buffer.length; index += 3) {
      this.buffer[index] = background[0];
      this.buffer[index + 1] = background[1];
      this.buffer[index + 2] = background[2];
    }
  }

  private add(x: number, y: number, color: Rgb, alpha: number): void {
    if (alpha <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 3;
    const a = alpha > 1 ? 1 : alpha;
    this.buffer[offset] += (color[0] - this.buffer[offset]) * a;
    this.buffer[offset + 1] += (color[1] - this.buffer[offset + 1]) * a;
    this.buffer[offset + 2] += (color[2] - this.buffer[offset + 2]) * a;
  }

  /** Filled rectangle in cover coordinates. Soft edges come from supersampling. */
  rect(x: number, y: number, width: number, height: number, color: Rgb, alpha = 1): void {
    const x0 = Math.max(0, Math.round(x * SS));
    const y0 = Math.max(0, Math.round(y * SS));
    const x1 = Math.min(this.width, Math.round((x + width) * SS));
    const y1 = Math.min(this.height, Math.round((y + height) * SS));
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) this.add(px, py, color, alpha);
    }
  }

  /**
   * Radial ambient light: peak alpha at the centre, falling smoothly to zero at
   * the ellipse edge. This is what makes the surface read as lit, not painted.
   */
  glow(cx: number, cy: number, rx: number, ry: number, color: Rgb, peak: number): void {
    const x0 = Math.max(0, Math.floor((cx - rx) * SS));
    const x1 = Math.min(this.width, Math.ceil((cx + rx) * SS));
    const y0 = Math.max(0, Math.floor((cy - ry) * SS));
    const y1 = Math.min(this.height, Math.ceil((cy + ry) * SS));
    for (let py = y0; py < y1; py += 1) {
      const dy = ((py + 0.5) / SS - cy) / ry;
      for (let px = x0; px < x1; px += 1) {
        const dx = ((px + 0.5) / SS - cx) / rx;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= 1) continue;
        const falloff = (1 - distance) * (1 - distance);
        this.add(px, py, color, peak * falloff);
      }
    }
  }

  /** Filled disc with a sub-pixel anti-aliased edge. */
  disc(cx: number, cy: number, radius: number, color: Rgb, alpha = 1): void {
    const x0 = Math.max(0, Math.floor((cx - radius - 1) * SS));
    const x1 = Math.min(this.width, Math.ceil((cx + radius + 1) * SS));
    const y0 = Math.max(0, Math.floor((cy - radius - 1) * SS));
    const y1 = Math.min(this.height, Math.ceil((cy + radius + 1) * SS));
    for (let py = y0; py < y1; py += 1) {
      const dy = (py + 0.5) / SS - cy;
      for (let px = x0; px < x1; px += 1) {
        const dx = (px + 0.5) / SS - cx;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const coverage = clamp01((radius - distance) * SS + 0.5);
        if (coverage > 0) this.add(px, py, color, alpha * coverage);
      }
    }
  }

  /** Circular outline of a given stroke width. */
  ring(cx: number, cy: number, radius: number, thickness: number, color: Rgb, alpha = 1): void {
    const outer = radius + thickness / 2 + 1;
    const x0 = Math.max(0, Math.floor((cx - outer) * SS));
    const x1 = Math.min(this.width, Math.ceil((cx + outer) * SS));
    const y0 = Math.max(0, Math.floor((cy - outer) * SS));
    const y1 = Math.min(this.height, Math.ceil((cy + outer) * SS));
    for (let py = y0; py < y1; py += 1) {
      const dy = (py + 0.5) / SS - cy;
      for (let px = x0; px < x1; px += 1) {
        const dx = (px + 0.5) / SS - cx;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const coverage = clamp01((thickness / 2 - Math.abs(distance - radius)) * SS + 0.5);
        if (coverage > 0) this.add(px, py, color, alpha * coverage);
      }
    }
  }

  /** Round-capped segment: the primitive behind every trace and mesh edge. */
  segment(x1: number, y1: number, x2: number, y2: number, thickness: number, color: Rgb, alpha = 1): void {
    const radius = thickness / 2;
    const x0 = Math.max(0, Math.floor((Math.min(x1, x2) - radius - 1) * SS));
    const xEnd = Math.min(this.width, Math.ceil((Math.max(x1, x2) + radius + 1) * SS));
    const y0 = Math.max(0, Math.floor((Math.min(y1, y2) - radius - 1) * SS));
    const yEnd = Math.min(this.height, Math.ceil((Math.max(y1, y2) + radius + 1) * SS));
    const vx = x2 - x1;
    const vy = y2 - y1;
    const lengthSquared = vx * vx + vy * vy || 1;
    for (let py = y0; py < yEnd; py += 1) {
      const screenY = (py + 0.5) / SS;
      for (let px = x0; px < xEnd; px += 1) {
        const screenX = (px + 0.5) / SS;
        const t = clamp01(((screenX - x1) * vx + (screenY - y1) * vy) / lengthSquared);
        const nearestX = x1 + vx * t;
        const nearestY = y1 + vy * t;
        const distance = Math.hypot(screenX - nearestX, screenY - nearestY);
        const coverage = clamp01((radius - distance) * SS + 0.5);
        if (coverage > 0) this.add(px, py, color, alpha * coverage);
      }
    }
  }

  /** Box-filter the supersampled float buffer down to the cover resolution. */
  toRgb(): Uint8Array {
    const out = new Uint8Array(NEWS_COVER_WIDTH * NEWS_COVER_HEIGHT * 3);
    const samples = SS * SS;
    for (let y = 0; y < NEWS_COVER_HEIGHT; y += 1) {
      for (let x = 0; x < NEWS_COVER_WIDTH; x += 1) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let sy = 0; sy < SS; sy += 1) {
          const row = ((y * SS + sy) * this.width + x * SS) * 3;
          for (let sx = 0; sx < SS; sx += 1) {
            const offset = row + sx * 3;
            r += this.buffer[offset];
            g += this.buffer[offset + 1];
            b += this.buffer[offset + 2];
          }
        }
        const target = (y * NEWS_COVER_WIDTH + x) * 3;
        out[target] = Math.round(r / samples);
        out[target + 1] = Math.round(g / samples);
        out[target + 2] = Math.round(b / samples);
      }
    }
    return out;
  }
}

export type NewsCoverMotif = NewsArtMotif;

export const newsCoverMotifForCategory = newsArtMotif;

export interface NewsCoverSpec {
  category: string;
  severity: string;
  title: string;
  /** Primary linked entity (`CVE-2026-XXXXX`, actor name, …). */
  entity?: string | null;
  source: string;
  publishedAt: string;
  /** Stable seed; defaults to `category|title`. */
  seed?: string;
}

/* ─────────────────────────────── motifs ──────────────────────────────────── */

function paintRadar(canvas: ArtCanvas, rng: () => number): void {
  const cx = 852 + rng() * 56;
  const cy = 296 + rng() * 62;
  const rings = [104, 166, 228, 290, 352];
  canvas.glow(cx, cy, 470, 400, ACCENT, 0.15);
  canvas.segment(360, cy, 1180, cy, 1, BORDER, 0.45);
  canvas.segment(cx, 70, cx, 630, 1, BORDER, 0.45);
  rings.forEach((radius, index) => canvas.ring(cx, cy, radius, 1.1, BORDER, 0.95 - index * 0.15));
  canvas.ring(cx, cy, rings[rings.length - 1], 1.1, ACCENT, 0.26);

  // Sweep wedge: 56 short segments make a smooth, feathered arc.
  const outer = rings[rings.length - 1];
  const start = -1.16 + rng() * 0.46;
  const end = start + 0.58;
  const steps = 56;
  for (let step = 0; step <= steps; step += 1) {
    const angle = start + ((end - start) * step) / steps;
    canvas.segment(cx, cy, cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer, 2.4, ACCENT, 0.05);
  }
  for (const radius of [rings[1], rings[2], rings[3]]) {
    const angle = rng() * Math.PI * 2;
    canvas.disc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 2.6, ACCENT, 0.8);
  }
  canvas.ring(cx, cy, 30, 1, ACCENT, 0.34);
  canvas.disc(cx, cy, 22, ACCENT, 0.12);
  canvas.disc(cx, cy, 6.5, ACCENT, 1);
}

function paintSeverityLadder(canvas: ArtCanvas, rng: () => number): void {
  const count = 9;
  const barWidth = 62;
  const gap = 22;
  const total = count * barWidth + (count - 1) * gap;
  const startX = 1160 - total;
  const baseY = 566;
  const peak = 3 + Math.floor(rng() * 4);

  canvas.glow(startX + total * 0.55, baseY - 180, 420, 300, ACCENT, 0.12);
  canvas.rect(startX - 40, baseY, 1240 - (startX - 40), 1, BORDER, 0.85);

  for (let index = 0; index < count; index += 1) {
    const ratio = 0.32 + rng() * 0.44 + (index === peak ? 0.24 : 0);
    const height = Math.min(1, ratio) * 330;
    const x = startX + index * (barWidth + gap);
    const isPeak = index === peak;
    canvas.rect(x, baseY - height, barWidth, height, isPeak ? ACCENT : RAISED, isPeak ? 0.92 : 1);
    canvas.rect(x, baseY - height, barWidth, 2, isPeak ? ACCENT : SUBTLE, isPeak ? 1 : 0.6);
    canvas.rect(x, baseY - height, 1, height, BORDER, 0.9);
    canvas.rect(x + barWidth - 1, baseY - height, 1, height, BORDER, 0.9);
  }
}

function paintWaveform(canvas: ArtCanvas, rng: () => number): void {
  const rows = 8;
  const accentRow = 3;
  const marker = 440 + rng() * 420;
  canvas.glow(760, 300, 480, 320, ACCENT, 0.1);
  canvas.rect(marker, 80, 1, 530, BORDER, 0.45);
  canvas.disc(marker, 120, 3, ACCENT, 1);

  for (let row = 0; row < rows; row += 1) {
    const top = 126 + row * 62;
    const amplitude = 16 + rng() * 40;
    const phase = rng() * Math.PI * 2;
    const frequency = 0.0052 + rng() * 0.0034;
    const isAccent = row === accentRow;
    const color = isAccent ? ACCENT : BORDER;
    const alpha = isAccent ? 0.85 : 0.32 + (row % 4) * 0.11;
    let previousX = -24;
    let previousY = top + Math.sin(previousX * frequency + phase) * amplitude;
    for (let x = -12; x <= 1224; x += 12) {
      const y =
        top +
        Math.sin(x * frequency + phase) * amplitude +
        Math.sin(x * frequency * 2.37 + phase * 1.7) * amplitude * 0.26;
      canvas.segment(previousX, previousY, x, y, isAccent ? 1.9 : 1.1, color, alpha);
      previousX = x;
      previousY = y;
    }
  }
}

function paintConstellation(canvas: ArtCanvas, rng: () => number): void {
  const nodes = Array.from({ length: 9 }, () => ({
    x: 470 + rng() * 650,
    y: 110 + rng() * 460,
    r: 2.6 + rng() * 2.2,
  }));
  const links: Array<[number, number]> = [];
  for (let index = 1; index < nodes.length; index += 1) {
    links.push([index, index - 1]);
    if (index > 2) links.push([index, Math.floor(rng() * index)]);
  }
  const accent = 4 + Math.floor(rng() * 3);

  canvas.glow(nodes[accent].x, nodes[accent].y, 420, 320, ACCENT, 0.13);
  for (const [from, to] of links) {
    canvas.segment(nodes[from].x, nodes[from].y, nodes[to].x, nodes[to].y, 1.1, BORDER, 0.85);
  }
  nodes.forEach((node, index) => {
    if (index === accent) return;
    canvas.disc(node.x, node.y, node.r, MUTED, 0.8);
  });
  canvas.ring(nodes[accent].x, nodes[accent].y, nodes[accent].r * 6.5, 1, ACCENT, 0.32);
  canvas.disc(nodes[accent].x, nodes[accent].y, nodes[accent].r, ACCENT, 1);
}

function paintModularMatrix(canvas: ArtCanvas, rng: () => number): void {
  const count = 5;
  const width = 116;
  const gap = 34;
  const total = count * width + (count - 1) * gap;
  const startX = 1120 - total;
  const baseY = 232 + rng() * 40;
  const compromised = Math.floor(rng() * count);

  canvas.glow(startX + total / 2, baseY + 120, 430, 300, ACCENT, 0.11);

  for (let index = 0; index < count; index += 1) {
    const x = startX + index * (width + gap);
    const y = baseY + (index % 2 === 0 ? 0 : 26);
    const height = 196;
    const isBroken = index === compromised;
    canvas.rect(x, y, width, height, RAISED, 1);
    const outline = isBroken ? ACCENT : BORDER;
    canvas.rect(x, y, width, 1, outline, isBroken ? 0.9 : 1);
    canvas.rect(x, y + height - 1, width, 1, outline, isBroken ? 0.9 : 1);
    canvas.rect(x, y, 1, height, outline, isBroken ? 0.9 : 1);
    canvas.rect(x + width - 1, y, 1, height, outline, isBroken ? 0.9 : 1);
    canvas.rect(x + 22, y + 46, width - 44, 1, BORDER, 0.95);
    canvas.rect(x + 22, y + 74, width - 68, 1, BORDER, 0.7);
    canvas.rect(x + 22, y + 116, isBroken ? 46 : 30, 3, isBroken ? ACCENT : SUBTLE, isBroken ? 1 : 0.6);
    if (index < count - 1) {
      canvas.segment(
        x + width,
        y + 98,
        x + width + gap,
        y + 98 + (index % 2 === 0 ? 26 : -26),
        1.1,
        BORDER,
        0.85,
      );
    }
  }
}

function paintArchitecturalGrid(canvas: ArtCanvas, rng: () => number): void {
  const horizon = 372 + rng() * 60;
  const startX = 404 + rng() * 74;
  const columns = 16 + Math.floor(rng() * 6);
  const step = 40 + rng() * 8;
  const accent = 3 + Math.floor(rng() * Math.max(1, columns - 6));
  const endX = startX + (columns - 1) * step;
  const accentX = startX + accent * step;
  const accentTop = horizon - (96 + rng() * 132);

  canvas.glow(accentX, horizon - 60, 380, 300, ACCENT, 0.1);

  // Document rules above the horizon, thinning as they rise.
  for (let index = 0; index < 7; index += 1) {
    canvas.rect(startX, horizon - 30 - index * 42, endX - startX, 1, HAIRLINE, 0.85 - index * 0.1);
  }

  // The colonnade: shafts of varying depth below the horizon.
  for (let index = 0; index < columns; index += 1) {
    const depth = 22 + rng() * 130;
    const x = startX + index * step;
    const isAccent = index === accent;
    canvas.rect(x, horizon, 1.5, depth, isAccent ? ACCENT : HAIRLINE, isAccent ? 0.95 : 0.6 + (index % 3) * 0.13);
  }

  canvas.rect(startX - 26, horizon, Math.min(1180, endX + 34) - (startX - 26), 1, BORDER, 1);
  canvas.rect(accentX, accentTop, 1.6, horizon + 168 - accentTop, ACCENT, 0.85);
  canvas.disc(accentX, accentTop, 4, ACCENT, 1);
  canvas.ring(accentX, accentTop, 14, 1, ACCENT, 0.28);

  // One soft light streak keeps the surface lit without a brown wash.
  canvas.segment(900, 675, 1240, 60, 2, ACCENT, 0.1);
  canvas.segment(944, 675, 1284, 60, 2, ACCENT, 0.1);

  // Corner bracket — the document frame.
  canvas.rect(1096, 62, 76, 1, BORDER, 0.85);
  canvas.rect(1171, 62, 1, 76, BORDER, 0.85);
}

const MOTIF_PAINTERS: Record<NewsArtMotif, (canvas: ArtCanvas, rng: () => number) => void> = {
  KEV: paintRadar,
  VULNERABILITY: paintSeverityLadder,
  MALWARE: paintWaveform,
  ACTOR: paintConstellation,
  SUPPLY_CHAIN: paintModularMatrix,
  ADVISORY: paintArchitecturalGrid,
};

/** Deterministic pseudo-random stream (mulberry32) for stable composition jitter. */
function compositionRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paint one editorial cover and return its RGB buffer (exported for tests). */
export function paintNewsCover(spec: NewsCoverSpec): Uint8Array {
  const canvas = new ArtCanvas(CANVAS_BG);
  const motif = newsArtMotif(spec.category);
  const seed = newsArtSeed(spec.seed ?? `${spec.category}|${spec.title}`);
  const rng = compositionRandom(seed);

  // Surface plate + a soft hairline frame, so the cover never reads as a void.
  canvas.rect(0, 0, NEWS_COVER_WIDTH, NEWS_COVER_HEIGHT, SURFACE, 1);
  canvas.rect(28, 28, NEWS_COVER_WIDTH - 56, 1, BORDER, 0.7);
  canvas.rect(28, NEWS_COVER_HEIGHT - 29, NEWS_COVER_WIDTH - 56, 1, BORDER, 0.55);
  canvas.rect(28, 28, 1, NEWS_COVER_HEIGHT - 57, BORDER, 0.35);
  canvas.rect(NEWS_COVER_WIDTH - 29, 28, 1, NEWS_COVER_HEIGHT - 57, BORDER, 0.35);

  MOTIF_PAINTERS[motif](canvas, rng);

  // A quiet accent rule in the bottom-left keeps a brand mark without a glyph.
  canvas.rect(48, NEWS_COVER_HEIGHT - 64, 72, 2, ACCENT, 0.9);
  canvas.rect(48, NEWS_COVER_HEIGHT - 47, 34, 2, BORDER, 0.8);

  // Corner vignette: two soft gradients settle the edges without a hard frame.
  canvas.glow(0, NEWS_COVER_HEIGHT, 520, 420, CANVAS_BG, 0.55);
  canvas.glow(NEWS_COVER_WIDTH, 0, 520, 420, CANVAS_BG, 0.35);

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
  return {
    category: article.category,
    severity: article.severity,
    title: article.title,
    entity: newsArtEntity(article),
    source: article.source_name,
    publishedAt: article.published_at,
    seed: article.slug,
  };
}
