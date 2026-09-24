import { expect, test } from '@playwright/test';
import zlib from 'node:zlib';
import {
  decodePng,
  relativeLuminance,
  samplePixels,
  sampleRegionContrast,
  wcagRatio,
  type RgbPixel,
} from './helpers/visual-contrast';

/**
 * Focused unit tests for tests/e2e/helpers/visual-contrast.ts (plan 501
 * Phase 1). Pure node-side execution — no browser fixture requested, so
 * Playwright never launches one. The PNG fixture is hand-encoded (valid
 * chunks + CRC32 + all five filter types) so the decoder's filter
 * reconstruction is exercised against a correct encoder, not just filter-0.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// signature(8) + chunk len(4) + 'IHDR'(4) + width(4) + height(4) + bitDepth(1)
const IHDR_COLOR_TYPE_OFFSET = 8 + 4 + 4 + 4 + 4 + 1;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function paethPredictor(left: number, up: number, ul: number): number {
  const pa = Math.abs(up - ul);
  const pb = Math.abs(left - ul);
  const pc = Math.abs(left + up - 2 * ul);
  return pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
}

interface EncodeOptions {
  colorType?: 2 | 6;
  bitDepth?: number;
  rowFilters?: number[];
}

/** Encode a valid minimal PNG whose scanlines exercise the given filter types. */
function encodeTestPng(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number, number?],
  options: EncodeOptions = {},
): Buffer {
  const colorType = options.colorType ?? 6;
  const bitDepth = options.bitDepth ?? 8;
  const filters = options.rowFilters ?? [0];
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(stride);
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = colorAt(x, y);
      const px = colorType === 6 ? [r, g, b, a] : [r, g, b];
      for (let c = 0; c < bpp; c++) row[x * bpp + c] = px[c];
    }
    rows.push(row);
  }

  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const filter = filters[y % filters.length];
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x++) {
      const cur = rows[y][x];
      const left = x >= bpp ? rows[y][x - bpp] : 0;
      const up = y > 0 ? rows[y - 1][x] : 0;
      const ul = y > 0 && x >= bpp ? rows[y - 1][x - bpp] : 0;
      let val: number;
      if (filter === 0) val = cur;
      else if (filter === 1) val = cur - left;
      else if (filter === 2) val = cur - up;
      else if (filter === 3) val = cur - ((left + up) >> 1);
      else val = cur - paethPredictor(left, up, ul);
      raw[y * (stride + 1) + 1 + x] = val & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function expectRoundtrip(colorType: 2 | 6): Promise<void> {
  const colorAt = (x: number, y: number): [number, number, number, number?] => [
    (x * 37 + y * 11) % 256,
    (y * 53 + 9) % 256,
    (x * 5 + y * 97) % 256,
    ((x + y) % 200) + 56,
  ];
  const png = encodeTestPng(5, 5, colorAt, { colorType, rowFilters: [0, 1, 2, 3, 4] });
  const decoded = decodePng(png);
  expect(decoded.width).toBe(5);
  expect(decoded.height).toBe(5);
  expect(decoded.bpp).toBe(colorType === 6 ? 4 : 3);
  const points: Array<[number, number]> = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) points.push([x, y]);
  for (const p of samplePixels(decoded, points)) {
    const [r, g, b] = colorAt(p.x, p.y);
    expect([p.r, p.g, p.b], `rgb@(${p.x},${p.y}) colorType=${colorType}`).toEqual([r, g, b]);
  }
}

test.describe('decodePng', () => {
  test('round-trips RGBA (colorType 6) through all five filter types', async () => {
    await expectRoundtrip(6);
  });

  test('round-trips RGB (colorType 2, bpp 3) with filter reconstruction', async () => {
    await expectRoundtrip(2);
  });

  test('throws on unsupported bit depth / color types, accepts 2 and 6', () => {
    expect(() => decodePng(encodeTestPng(2, 2, () => [1, 2, 3], { bitDepth: 16 }))).toThrow(/unsupported PNG/);
    const grayscale = encodeTestPng(2, 2, () => [1, 2, 3]);
    grayscale[IHDR_COLOR_TYPE_OFFSET] = 0; // 6 -> 0 (grayscale)
    expect(() => decodePng(grayscale)).toThrow(/unsupported PNG/);
    expect(decodePng(encodeTestPng(2, 2, () => [1, 2, 3], { colorType: 2 })).bpp).toBe(3);
  });
});

test.describe('wcagRatio / relativeLuminance', () => {
  test('black vs white is 21, identical colors are 1, ratio is symmetric and >= 1', () => {
    const white: RgbPixel = { r: 255, g: 255, b: 255 };
    const black: RgbPixel = { r: 0, g: 0, b: 0 };
    expect(relativeLuminance(white)).toBe(1);
    expect(relativeLuminance(black)).toBe(0);
    expect(wcagRatio(black, white)).toBe(21);
    expect(wcagRatio(white, black)).toBe(21);
    expect(wcagRatio(white, white)).toBe(1);
  });

  test('known reference pair: #767676 on white is 4.54 (WCAG boundary)', () => {
    const gray: RgbPixel = { r: 0x76, g: 0x76, b: 0x76 };
    expect(wcagRatio(gray, { r: 255, g: 255, b: 255 })).toBe(4.54);
  });
});

test.describe('sampleRegionContrast', () => {
  // 40x20 white canvas with a dark text block at x [5,35) y [8,12).
  function darkTextOnWhitePng() {
    return encodeTestPng(
      40,
      20,
      (x, y) => (x >= 5 && x < 35 && y >= 8 && y < 12 ? [20, 20, 20, 255] : [255, 255, 255, 255]),
    );
  }

  test('finds dominant background and worst-case text tail ratio on dark-on-light text', () => {
    const region = sampleRegionContrast(decodePng(darkTextOnWhitePng()), { x: 0, y: 0, width: 40, height: 20 });
    expect(region).not.toBeNull();
    // dominant background is the >>3-quantized white reconstruction (255 -> 252)
    expect(region!.background).toEqual({ r: 252, g: 252, b: 252 });
    expect(region!.lightTail).toEqual({ r: 255, g: 255, b: 255 });
    expect(region!.darkTail).toEqual({ r: 20, g: 20, b: 20 });
    const expected = Math.max(
      wcagRatio({ r: 255, g: 255, b: 255 }, { r: 252, g: 252, b: 252 }),
      wcagRatio({ r: 20, g: 20, b: 20 }, { r: 252, g: 252, b: 252 }),
    );
    expect(region!.textRatio).toBe(expected);
    expect(region!.textRatio).toBeGreaterThan(10);
  });

  test('uniform region yields ratio 1 (no text tails)', () => {
    // (100,148,204) is >>3-quantization-invariant (each channel % 8 == 4), so
    // the dominant-background reconstruction matches the tail mean exactly.
    const solid = encodeTestPng(8, 8, () => [100, 148, 204, 255]);
    const region = sampleRegionContrast(decodePng(solid), { x: 0, y: 0, width: 8, height: 8 });
    expect(region).not.toBeNull();
    expect(region!.background).toEqual({ r: 100, g: 148, b: 204 });
    expect(region!.lightTail).toEqual({ r: 100, g: 148, b: 204 });
    expect(region!.darkTail).toEqual({ r: 100, g: 148, b: 204 });
    expect(region!.textRatio).toBe(1);
  });

  test('sub-region sampling: rect fully inside the dark block flips the dominant background', () => {
    // rect (6,8,w10,h4): inset pass degenerates (h-2 < 6) and the min-rect
    // fallback samples x [6,16) y [8,12) — entirely inside the dark block.
    const region = sampleRegionContrast(decodePng(darkTextOnWhitePng()), { x: 6, y: 8, width: 10, height: 4 });
    expect(region).not.toBeNull();
    expect(region!.background).toEqual({ r: 20, g: 20, b: 20 });
    expect(region!.textRatio).toBe(1);
  });

  test('returns null for un-sampleable rects and tolerates out-of-bounds rects', () => {
    const png = decodePng(darkTextOnWhitePng());
    expect(sampleRegionContrast(png, { x: 0, y: 0, width: 2, height: 2 })).toBeNull();
    expect(sampleRegionContrast(png, { x: 30, y: 15, width: 20, height: 10 })).not.toBeNull();
  });

  test('dpr multiplies CSS-px rect coordinates into device pixels', () => {
    const png = decodePng(darkTextOnWhitePng()); // 40x20 device px == 20x10 CSS px @2x
    // dark block in CSS px: x [2.5,17.5) y [4,6); this rect lands fully inside
    const region = sampleRegionContrast(png, { x: 4, y: 4, width: 12, height: 2 }, { dpr: 2 });
    expect(region).not.toBeNull();
    expect(region!.background).toEqual({ r: 20, g: 20, b: 20 });
    expect(region!.textRatio).toBe(1);
  });
});
