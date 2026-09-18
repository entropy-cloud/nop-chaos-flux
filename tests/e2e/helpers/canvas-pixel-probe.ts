import { expect, type Locator } from '@playwright/test';

/**
 * Generic canvas pixel probe (plan 470, visual-quality V0) — layer-4 of the
 * visual assertion stack: proves a canvas element actually has paint, catching
 * "renders 0 frames / all-black canvas" regressions that DOM assertions mask.
 * Generalizes the scada-family precedent (`scada-canvas-assert.ts`) to any
 * 2d/webgl canvas under a locator root; the specialized scada helper stays
 * untouched.
 *
 * WebGL caveat: with `preserveDrawingBuffer: false` (three.js default) the
 * drawing buffer is invalidated after compositing and `readPixels` silently
 * returns zeros — it does NOT throw. Live WebGL canvases must therefore be
 * probed in the same task that triggers a fresh frame, or via a
 * `toDataURL` front-buffer fallback; injected test canvases can opt into
 * `preserveDrawingBuffer: true` to keep a separate probe call valid.
 */

export interface PixelProbeResult {
  probed: number;
  mode: '2d' | 'webgl' | 'mixed' | 'none';
  result: 'non-zero-pixels' | 'all-zero' | 'security-error' | 'no-canvas';
}

type ProbePayload = {
  probed: number;
  mode: PixelProbeResult['mode'];
  result: PixelProbeResult['result'];
};

export async function probeCanvasPixels(locator: Locator): Promise<PixelProbeResult> {
  return locator.evaluate((root): ProbePayload => {
    const canvases = Array.from(root.querySelectorAll('canvas'));
    if (canvases.length === 0) {
      return { probed: 0, mode: 'none', result: 'no-canvas' };
    }
    let saw2d = false;
    let sawWebgl = false;
    let sawSecurityError = false;
    const isNonZero = (data: Uint8ClampedArray | Uint8Array): boolean =>
      data[0] !== 0 || data[1] !== 0 || data[2] !== 0 || data[3] !== 0;

    for (const canvasEl of canvases) {
      try {
        const { width, height } = canvasEl;
        if (width === 0 || height === 0) continue;
        const step = Math.max(1, Math.floor(Math.min(width, height) / 64));

        const ctx2d = canvasEl.getContext('2d');
        if (ctx2d) {
          saw2d = true;
          for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
              if (isNonZero(ctx2d.getImageData(x, y, 1, 1).data)) {
                return {
                  probed: canvases.length,
                  mode: sawWebgl ? 'mixed' : '2d',
                  result: 'non-zero-pixels',
                };
              }
            }
          }
          continue;
        }

        const gl =
          canvasEl.getContext('webgl2', { preserveDrawingBuffer: true }) ??
          canvasEl.getContext('webgl', { preserveDrawingBuffer: true });
        if (gl) {
          sawWebgl = true;
          const pixel = new Uint8Array(4);
          for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
              gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
              if (isNonZero(pixel)) {
                return {
                  probed: canvases.length,
                  mode: saw2d ? 'mixed' : 'webgl',
                  result: 'non-zero-pixels',
                };
              }
            }
          }
        }
      } catch (error) {
        const name = (error as { name?: string })?.name ?? '';
        if (name === 'SecurityError' || name === 'InvalidStateError') {
          sawSecurityError = true;
          continue;
        }
        throw error;
      }
    }

    const mode = saw2d && sawWebgl ? 'mixed' : saw2d ? '2d' : sawWebgl ? 'webgl' : 'none';
    if (sawSecurityError) {
      return { probed: canvases.length, mode, result: 'security-error' };
    }
    return { probed: canvases.length, mode, result: 'all-zero' };
  });
}

/**
 * Strict painted-canvas gate. Default: requires `non-zero-pixels`.
 * `allowZero: true` accepts `all-zero`/`security-error` (legal empty canvas
 * or cross-origin taint) — the caller owns the "scene is known-empty"
 * semantics, same contract as the scada helper's allowZeroPixels.
 */
export async function expectCanvasPainted(
  locator: Locator,
  options: { allowZero?: boolean; note?: string } = {},
): Promise<PixelProbeResult> {
  const probe = await probeCanvasPixels(locator);
  const acceptable =
    probe.result === 'non-zero-pixels' ||
    (options.allowZero === true && probe.result !== 'no-canvas');
  expect(
    acceptable,
    `canvas should have paint${options.note ? ` (${options.note})` : ''}, got "${probe.result}" ` +
      `across ${probe.probed} canvas element(s) [mode: ${probe.mode}]`,
  ).toBe(true);
  return probe;
}
