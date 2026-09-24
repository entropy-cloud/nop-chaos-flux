import { expect, type Locator, type Page } from '@playwright/test';
import zlib from 'node:zlib';

/**
 * PNG pixel-sampling contrast probes (plan 501 Phase 1, promoted from
 * `_tmp/r2-2b-probes/w5-png.mjs` + the plan 500 R2-4 `sampleRegion` recheck
 * probe; zero external deps — node:zlib only).
 *
 * Pixel sampling is the only reliable contrast methodology for oklab()/oklch()
 * colors and gradient backgrounds: `getComputedStyle` cannot be arithmetically
 * compared there, while screenshot pixels are already device-resolved.
 *
 * Decoder scope: 8-bit, non-interlaced, color type 2 (RGB) / 6 (RGBA) — exactly
 * what Playwright screenshots emit; anything else throws (fail loud, not wrong).
 * Rect coordinates are CSS px and assume deviceScaleFactor 1 unless
 * `sampleRegionContrast` is given an explicit `dpr`.
 */

export interface DecodedPng {
  width: number;
  height: number;
  /** bytes per pixel: 3 (RGB) or 4 (RGBA) */
  bpp: number;
  /** bytes per scanline (width * bpp) */
  stride: number;
  /** decoded (filter-reconstructed) scanlines, length = height * stride */
  data: Buffer;
}

export interface RgbPixel {
  r: number;
  g: number;
  b: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RegionContrast {
  /** dominant (mode) background color of the region */
  background: RgbPixel;
  /** mean of the brightest 2% pixels (>= 8 px) — light text tail */
  lightTail: RgbPixel;
  /** mean of the darkest 2% pixels (>= 8 px) — dark text tail */
  darkTail: RgbPixel;
  /** max(WCAG(lightTail, background), WCAG(darkTail, background)), 2dp */
  textRatio: number;
}

/** Minimal PNG decoder: color type 2/6, 8-bit, non-interlaced. */
export function decodePng(buffer: Buffer): DecodedPng {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(pos + 8);
      height = buffer.readUInt32BE(pos + 12);
      bitDepth = buffer[pos + 16];
      colorType = buffer[pos + 17];
    }
    if (type === 'IDAT') idat.push(buffer.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG: bitDepth=${bitDepth} colorType=${colorType}`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const data = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[rp++];
      const left = x >= bpp ? data[y * stride + x - bpp] : 0;
      const up = y > 0 ? data[(y - 1) * stride + x] : 0;
      const ul = y > 0 && x >= bpp ? data[(y - 1) * stride + x - bpp] : 0;
      let val: number;
      if (filter === 0) val = cur;
      else if (filter === 1) val = cur + left;
      else if (filter === 2) val = cur + up;
      else if (filter === 3) val = cur + ((left + up) >> 1);
      else {
        const pa = Math.abs(up - ul);
        const pb = Math.abs(left - ul);
        const pc = Math.abs(left + up - 2 * ul);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        val = cur + pred;
      }
      data[y * stride + x] = val & 0xff;
    }
  }
  return { width, height, bpp, stride, data };
}

/** Sample pixels at device-px coordinates. Alpha channel is ignored (opaque screenshots). */
export function samplePixels(png: DecodedPng, points: Array<[number, number]>): Array<RgbPixel & { x: number; y: number }> {
  return points.map(([px, py]) => {
    const idx = py * png.stride + px * png.bpp;
    return { x: px, y: py, r: png.data[idx], g: png.data[idx + 1], b: png.data[idx + 2] };
  });
}

export function srgbChannelToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(p: RgbPixel): number {
  return 0.2126 * srgbChannelToLinear(p.r) + 0.7152 * srgbChannelToLinear(p.g) + 0.0722 * srgbChannelToLinear(p.b);
}

/** WCAG 2.x contrast ratio, symmetric, rounded to 2dp, always >= 1. */
export function wcagRatio(a: RgbPixel, b: RgbPixel): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * Region contrast per the R2-4 recheck methodology: dominant quantized
 * background + extreme light/dark tails as the text estimate, worst-case kept.
 * Returns null when the (clamped) region is too small to sample meaningfully.
 */
export function sampleRegionContrast(
  png: DecodedPng,
  rect: Rect,
  options: { dpr?: number; insetX?: number; insetY?: number } = {},
): RegionContrast | null {
  const scale = options.dpr ?? 1;
  const insetX = options.insetX ?? 1;
  const insetY = options.insetY ?? 1;
  let x0 = Math.max(0, Math.round((rect.x + insetX) * scale));
  let y0 = Math.max(0, Math.round((rect.y + insetY) * scale));
  let w = Math.min(Math.round(rect.width * scale) - insetX * 2 * scale, png.width - x0);
  let h = Math.min(Math.round(rect.height * scale) - insetY * 2 * scale, png.height - y0);
  if (w < 6 || h < 6) {
    x0 = Math.max(0, Math.round(rect.x * scale));
    y0 = Math.max(0, Math.round(rect.y * scale));
    w = Math.min(Math.round(rect.width * scale), png.width - x0);
    h = Math.min(Math.round(rect.height * scale), png.height - y0);
  }
  if (w < 4 || h < 4) return null;

  const pixels: RgbPixel[] = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const idx = y * png.stride + x * png.bpp;
      pixels.push({ r: png.data[idx], g: png.data[idx + 1], b: png.data[idx + 2] });
    }
  }
  const counts = new Map<string, number>();
  for (const p of pixels) {
    const key = `${p.r >> 3},${p.g >> 3},${p.b >> 3}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [dominantKey] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const parts = dominantKey.split(',').map((v) => (Number(v) << 3) + 4);
  const background = { r: parts[0], g: parts[1], b: parts[2] };

  const sorted = [...pixels].sort((a, b) => relativeLuminance(b) - relativeLuminance(a));
  const topN = Math.max(8, Math.floor(pixels.length * 0.02));
  const mean = (list: RgbPixel[]): RgbPixel => {
    const acc = list.reduce((m, p) => ({ r: m.r + p.r, g: m.g + p.g, b: m.b + p.b }), { r: 0, g: 0, b: 0 });
    return { r: Math.round(acc.r / list.length), g: Math.round(acc.g / list.length), b: Math.round(acc.b / list.length) };
  };
  const lightTail = mean(sorted.slice(0, topN));
  const darkTail = mean(sorted.slice(-topN));
  const rLight = wcagRatio(lightTail, background);
  const rDark = wcagRatio(darkTail, background);
  return { background, lightTail, darkTail, textRatio: Math.max(rLight, rDark) };
}

/** Screenshot the current viewport, then sample `rect` (CSS px) out of it. */
export async function samplePageRegionContrast(page: Page, rect: Rect): Promise<RegionContrast | null> {
  const shot = await page.screenshot({ fullPage: false });
  return sampleRegionContrast(decodePng(shot), rect);
}

/**
 * Sample the contrast of a locator's bounding box. Scroll the element into
 * view first — sampling happens on the viewport screenshot.
 */
export async function sampleLocatorContrast(page: Page, locator: Locator): Promise<RegionContrast | null> {
  const box = await locator.boundingBox();
  if (!box) return null;
  return samplePageRegionContrast(page, box);
}

/** Pass/fail wrapper: region must sample and reach `minRatio` (always > 1 by construction when tails exist). */
export async function expectLocatorContrast(
  page: Page,
  locator: Locator,
  options: { minRatio: number; note?: string },
): Promise<RegionContrast> {
  const region = await sampleLocatorContrast(page, locator);
  expect(
    region,
    `contrast region must be sampleable${options.note ? ` (${options.note})` : ''} — check scroll/viewport`,
  ).not.toBeNull();
  expect(
    Number.isFinite(region!.textRatio),
    `contrast ratio must be finite${options.note ? ` (${options.note})` : ''}`,
  ).toBe(true);
  expect(
    region!.textRatio,
    `contrast ratio must be >= ${options.minRatio}${options.note ? ` (${options.note})` : ''}`,
  ).toBeGreaterThanOrEqual(options.minRatio);
  return region!;
}
