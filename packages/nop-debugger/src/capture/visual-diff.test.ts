import { describe, expect, it } from 'vitest';
import { CaptureError } from './screenshot.js';
import { createVisualDiffEngine, yiqPixelDiffWithSize } from './visual-diff.js';

function solidBuffer(width: number, height: number, rgb: [number, number, number]): Uint8ClampedArray {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = rgb[0];
    buffer[i * 4 + 1] = rgb[1];
    buffer[i * 4 + 2] = rgb[2];
    buffer[i * 4 + 3] = 255;
  }
  return buffer;
}

describe('YIQ pixel diff (M3)', () => {
  it('identical images produce diffRatio 0', () => {
    const a = solidBuffer(10, 10, [255, 255, 255]);
    const { diffRatio } = yiqPixelDiffWithSize(a, a.slice(), 10, 10);
    expect(diffRatio).toBe(0);
  });

  it('a single changed pixel yields 0 < diffRatio < 1', () => {
    const a = solidBuffer(10, 10, [255, 255, 255]);
    const b = a.slice();
    b[4 * 4] = 0; // pixel (4,0): red channel flipped
    const { diffRatio } = yiqPixelDiffWithSize(a, b, 10, 10);
    expect(diffRatio).toBeGreaterThan(0);
    expect(diffRatio).toBeLessThan(0.05);
  });

  it('ignore rects eliminate diffs inside them', () => {
    const a = solidBuffer(10, 10, [255, 255, 255]);
    const b = a.slice();
    b[4 * 4] = 0; // pixel (4,0) changed
    const withIgnore = yiqPixelDiffWithSize(a, b, 10, 10, {
      ignoreRects: [{ x: 0, y: 0, width: 10, height: 1 }],
    });
    expect(withIgnore.diffRatio).toBe(0);
  });

  it('size mismatch throws CaptureError size-mismatch', () => {
    expect(() => yiqPixelDiffWithSize(new Uint8ClampedArray(40), new Uint8ClampedArray(100), 5, 5)).toThrow(CaptureError);
  });
});

describe('visual diff engine (M3)', () => {
  it('missing baseline reports missing', () => {
    const engine = createVisualDiffEngine();
    const result = engine.compare({ bytes: solidBuffer(10, 10, [0, 0, 0]), width: 10, height: 10 }, 'nope');
    expect(result.missing).toBe(true);
    expect(result.match).toBe(false);
  });

  it('same image matches with diffRatio 0 and no regions', () => {
    const engine = createVisualDiffEngine();
    const bytes = solidBuffer(10, 10, [200, 200, 200]);
    engine.putBaseline({ key: 'k', bytes: bytes.slice(), width: 10, height: 10, ignoreRegions: [] });
    const result = engine.compare({ bytes, width: 10, height: 10 }, 'k', {
      cidRects: [{ cid: 'c-1', rect: { x: 0, y: 0, width: 5, height: 5 } }],
    });
    expect(result.match).toBe(true);
    expect(result.diffRatio).toBe(0);
    expect(result.regions?.every((region) => region.diffRatio === 0)).toBe(true);
  });

  it('cid-region aggregation localizes the diff and xui ignore region clears it', () => {
    const engine = createVisualDiffEngine();
    const bytes = solidBuffer(10, 10, [200, 200, 200]);
    const changed = bytes.slice();
    changed[4 * (1 * 10 + 1)] = 0; // pixel (1,1) — inside cid c-clock rect
    engine.putBaseline({ key: 'k', bytes, width: 10, height: 10, ignoreRegions: [] });
    const cidRects = [
      { cid: 'c-clock', rect: { x: 0, y: 0, width: 4, height: 4 } },
      { cid: 'c-body', rect: { x: 5, y: 5, width: 5, height: 5 } },
    ];
    const result = engine.compare({ bytes: changed, width: 10, height: 10 }, 'k', { cidRects });
    expect(result.match).toBe(false);
    expect(result.regions?.find((region) => region.cid === 'c-clock')?.diffRatio).toBeGreaterThan(0);
    expect(result.regions?.find((region) => region.cid === 'c-body')?.diffRatio).toBe(0);

    // with xui:visual-ignore on c-clock, the diff disappears
    const ignored = engine.compare({ bytes: changed, width: 10, height: 10 }, 'k', {
      cidRects,
      ignoreRegions: [{ cid: 'c-clock', reason: 'timestamp node (xui:visual-ignore)' }],
    });
    expect(ignored.diffRatio).toBe(0);
    expect(ignored.match).toBe(true);
  });

  it('dimension mismatch throws CaptureError', () => {
    const engine = createVisualDiffEngine();
    engine.putBaseline({ key: 'k', bytes: solidBuffer(10, 10, [0, 0, 0]), width: 10, height: 10, ignoreRegions: [] });
    expect(() =>
      engine.compare({ bytes: solidBuffer(5, 5, [0, 0, 0]), width: 5, height: 5 }, 'k'),
    ).toThrow(CaptureError);
  });
});
