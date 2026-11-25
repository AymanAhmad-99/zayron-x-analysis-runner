/**
 * PHASE 7D — programmatic edge telemetry cards (1200×630 PNG).
 *
 * Deliberately DEPENDENCY-FREE: no satori, no resvg wasm, no font files. The
 * card is drawn as raw RGB pixels from a built-in 5×7 geometric glyph set and
 * encoded as a real PNG with `CompressionStream('deflate-raw')` + a zlib header
 * and Adler-32 checksum. That keeps the web Worker bundle unchanged (the whole
 * renderer is a few KB of JS), needs no wasm CPU budget, and produces an
 * `image/png` every social platform and Telegram `sendPhoto` accepts.
 *
 * Visual contract (ZAYRON-X 2028): matte obsidian, one razor-thin #FF5500 accent
 * bar, a hairline grid, pure-white geometric type, four telemetry cells.
 */

export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;

/** Rendered once at the edge, then served for a week. */
export const OG_CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=604800';

const COLOR_BG: [number, number, number] = [5, 5, 7];
const COLOR_GRID: [number, number, number] = [22, 22, 28];
const COLOR_ACCENT: [number, number, number] = [255, 85, 0];
const COLOR_TEXT: [number, number, number] = [255, 255, 255];
const COLOR_MUTED: [number, number, number] = [138, 138, 150];
const COLOR_DIM: [number, number, number] = [201, 201, 210];

/* ─────────────────────────────── 5×7 glyphs ──────────────────────────────── */

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
  '%': '11001 11010 00010 00100 01000 01011 10011',
  '#': '01010 01010 11111 01010 11111 01010 01010',
  _: '00000 00000 00000 00000 00000 00000 11111',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  '&': '01100 10010 10100 01000 10101 10010 01101',
  "'": '00100 00100 00000 00000 00000 00000 00000',
  '(': '00010 00100 01000 01000 01000 00100 00010',
  ')': '01000 00100 00010 00010 00010 00100 01000',
  '>': '01000 00100 00010 00001 00010 00100 01000',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00010 00100 00100 00000 00100',
  '*': '00000 10101 01110 11111 01110 10101 00000',
  '=': '00000 00000 11111 00000 11111 00000 00000',
  // Middle dot: the institutional separator (subtitle / footer).
  '·': '00000 00000 01100 01100 00000 00000 00000',
};

const GLYPH_ROWS = 7;
const GLYPH_COLS = 5;

function glyphFor(char: string): string {
  return GLYPHS[char] ?? GLYPHS['?'];
}

/** Advance width of one character at a scale (5 glyph columns + 1 gap). */
export function glyphAdvance(scale: number): number {
  return (GLYPH_COLS + 1) * scale;
}

export function measureText(text: string, scale: number): number {
  const chars = [...String(text ?? '')];
  if (chars.length === 0) return 0;
  return chars.length * glyphAdvance(scale) - scale;
}

class Canvas {
  readonly width: number;
  readonly height: number;
  private readonly pixels: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    // RGB, three bytes per pixel.
    this.pixels = new Uint8Array(width * height * 3);
  }

  fill(color: [number, number, number]): void {
    const [r, g, b] = color;
    for (let index = 0; index < this.pixels.length; index += 3) {
      this.pixels[index] = r;
      this.pixels[index + 1] = g;
      this.pixels[index + 2] = b;
    }
  }

  pixel(x: number, y: number, color: [number, number, number]): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 3;
    this.pixels[offset] = color[0];
    this.pixels[offset + 1] = color[1];
    this.pixels[offset + 2] = color[2];
  }

  rect(x: number, y: number, width: number, height: number, color: [number, number, number]): void {
    for (let dy = 0; dy < height; dy += 1) {
      for (let dx = 0; dx < width; dx += 1) this.pixel(x + dx, y + dy, color);
    }
  }

  /** Draw one line of text; returns the x it finished at. */
  text(value: string, x: number, y: number, scale: number, color: [number, number, number]): number {
    let cursor = x;
    for (const char of String(value ?? '').toUpperCase()) {
      const rows = glyphFor(char).split(' ');
      for (let row = 0; row < GLYPH_ROWS; row += 1) {
        for (let col = 0; col < GLYPH_COLS; col += 1) {
          if (rows[row]?.[col] !== '1') continue;
          this.rect(cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
      cursor += glyphAdvance(scale);
    }
    return cursor;
  }

  /** Truncate to fit `maxWidth`, ending on `..` when clipped. */
  textFit(
    value: string,
    x: number,
    y: number,
    scale: number,
    maxWidth: number,
    color: [number, number, number],
  ): number {
    const text = String(value ?? '').toUpperCase();
    if (measureText(text, scale) <= maxWidth) return this.text(text, x, y, scale, color);
    let clipped = text;
    while (clipped.length > 0 && measureText(`${clipped}..`, scale) > maxWidth) {
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
    color: [number, number, number],
  ): number {
    for (let scale = maxScale; scale >= minScale; scale -= 1) {
      if (measureText(String(value ?? '').toUpperCase(), scale) <= maxWidth) {
        return this.textFit(value, x, y, scale, maxWidth, color);
      }
    }
    return this.textFit(value, x, y, minScale, maxWidth, color);
  }

  toRgb(): Uint8Array {
    return this.pixels;
  }
}

/* ─────────────────────────────── PNG encoder ─────────────────────────────── */

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    a = (a + bytes[index]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function uint32(value: number): Uint8Array {
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([...type].map((char) => char.charCodeAt(0)));
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const chunk = new Uint8Array(4 + body.length + 4);
  chunk.set(uint32(data.length), 0);
  chunk.set(body, 4);
  chunk.set(uint32(crc32(body)), 4 + body.length);
  return chunk;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

/** Encode an RGB buffer as a PNG (truecolor, no alpha, no filtering). */
export async function encodePng(width: number, height: number, rgb: Uint8Array): Promise<Uint8Array> {
  const stride = width * 3;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type 0 (None)
    raw.set(rgb.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const compressed = await deflateRaw(raw);
  // zlib wrapper: 0x78 0x01 + deflate + Adler-32 of the uncompressed data.
  const zlib = new Uint8Array(2 + compressed.length + 4);
  zlib[0] = 0x78;
  zlib[1] = 0x01;
  zlib.set(compressed, 2);
  zlib.set(uint32(adler32(raw)), 2 + compressed.length);

  const ihdr = new Uint8Array(13);
  ihdr.set(uint32(width), 0);
  ihdr.set(uint32(height), 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunks = [pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib), pngChunk('IEND', new Uint8Array(0))];
  const total = signature.length + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = signature.length;
  out.set(signature, 0);
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/* ─────────────────────────────── card layout ─────────────────────────────── */

export interface OgCell {
  label: string;
  value: string;
}

export interface OgCardSpec {
  badge: string;
  title: string;
  subtitle: string;
  cells: OgCell[];
  /** Defaults to the institutional footer. */
  footer?: string;
  /** Right-hand top-bar line. */
  tagline?: string;
}

const MARGIN = 56;
const FOOTER = 'ZAYRON-X.CO  ·  VERIFIED SOURCE INTELLIGENCE';

/** Paint the card and return its RGB buffer (exported for tests). */
export function paintCard(spec: OgCardSpec): Uint8Array {
  const canvas = new Canvas(OG_CARD_WIDTH, OG_CARD_HEIGHT);
  canvas.fill(COLOR_BG);

  // Hairline grid.
  for (let x = MARGIN; x < OG_CARD_WIDTH; x += 60) {
    for (let y = 0; y < OG_CARD_HEIGHT; y += 1) canvas.pixel(x, y, COLOR_GRID);
  }
  for (let y = 90; y < OG_CARD_HEIGHT; y += 60) {
    for (let x = 0; x < OG_CARD_WIDTH; x += 1) canvas.pixel(x, y, COLOR_GRID);
  }

  // Razor-thin accent bar.
  canvas.rect(0, 0, 6, OG_CARD_HEIGHT, COLOR_ACCENT);

  // ── Top bar ──
  canvas.text('ZAYRON-X', MARGIN, 44, 4, COLOR_TEXT);
  const badge = String(spec.badge ?? '').toUpperCase();
  canvas.rect(MARGIN, 96, 2, 26, COLOR_ACCENT);
  canvas.text(badge, MARGIN + 14, 96, 2, COLOR_ACCENT);
  const tagline = String(spec.tagline ?? 'TRUTH IS THE PERIMETER.').toUpperCase();
  const taglineWidth = measureText(tagline, 2);
  canvas.text(tagline, OG_CARD_WIDTH - MARGIN - taglineWidth, 52, 2, COLOR_MUTED);
  canvas.rect(MARGIN, 152, OG_CARD_WIDTH - MARGIN * 2, 1, COLOR_GRID);

  // ── Center: identifier + headline ──
  canvas.textFitScale(String(spec.title ?? ''), MARGIN, 214, 4, 12, OG_CARD_WIDTH - MARGIN * 2, COLOR_TEXT);
  canvas.textFitScale(String(spec.subtitle ?? ''), MARGIN, 360, 2, 4, OG_CARD_WIDTH - MARGIN * 2, COLOR_DIM);

  // ── Bottom: four telemetry cells ──
  const cells = (spec.cells ?? []).slice(0, 4);
  const cellTop = 470;
  const cellWidth = Math.floor((OG_CARD_WIDTH - MARGIN * 2) / Math.max(1, cells.length));
  canvas.rect(MARGIN, cellTop - 26, OG_CARD_WIDTH - MARGIN * 2, 1, COLOR_GRID);
  cells.forEach((cell, index) => {
    const x = MARGIN + index * cellWidth;
    canvas.text(String(cell.label ?? '').toUpperCase(), x, cellTop, 2, COLOR_MUTED);
    // Long values (NOT_LISTED, UNBRIEFED) shrink a step instead of clipping.
    canvas.textFitScale(String(cell.value ?? 'N/A'), x, cellTop + 34, 3, 5, cellWidth - 24, COLOR_TEXT);
    if (index > 0) canvas.rect(x - 12, cellTop, 1, 96, COLOR_GRID);
  });

  // ── Footer ──
  canvas.rect(MARGIN, OG_CARD_HEIGHT - 84, OG_CARD_WIDTH - MARGIN * 2, 1, COLOR_GRID);
  canvas.text(spec.footer ?? FOOTER, MARGIN, OG_CARD_HEIGHT - 56, 2, COLOR_MUTED);
  canvas.rect(OG_CARD_WIDTH - MARGIN - 120, OG_CARD_HEIGHT - 62, 120, 2, COLOR_ACCENT);

  return canvas.toRgb();
}

/** The whole endpoint payload: a real 1200×630 PNG. */
export async function renderOgCardPng(spec: OgCardSpec): Promise<Uint8Array> {
  return encodePng(OG_CARD_WIDTH, OG_CARD_HEIGHT, paintCard(spec));
}

/** Shared response for the three card routes. */
export async function ogCardResponse(spec: OgCardSpec): Promise<Response> {
  const png = await renderOgCardPng(spec);
  return new Response(png, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'content-length': String(png.length),
      'cache-control': OG_CACHE_CONTROL,
      'x-content-type-options': 'nosniff',
    },
  });
}
