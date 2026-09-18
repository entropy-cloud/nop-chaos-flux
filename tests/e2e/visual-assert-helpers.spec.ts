import { expect, test } from './fixtures.js';
import { existsSync } from 'node:fs';
import {
  captureVisualEvidence,
  expectComputedStyleNot,
  getComputedStyleValue,
  expectCssVarResolves,
} from './helpers/visual-assert.js';
import { expectCanvasPainted, probeCanvasPixels } from './helpers/canvas-pixel-probe.js';

/**
 * Plan 470 (visual-quality V0) — smoke proof for the programmatic visual
 * assertion toolchain. These specs are the toolchain's own regression gate:
 * every helper exported from tests/e2e/helpers/ must demonstrate its
 * pass path (and the painted-probe failure path) against a real browser.
 * Screenshots written here are diagnostic evidence under tests/e2e/artifacts/
 * (gitignored, regenerated) — never pass/fail criteria (AGENTS.md 2026-08-28
 * snapshot policy).
 */

const PROBE_ROOT_SELECTOR = '[data-vqa-probe-root]';

async function mountProbeRoot(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    let root = document.querySelector('[data-vqa-probe-root]');
    if (!root) {
      root = document.createElement('div');
      root.setAttribute('data-vqa-probe-root', '');
      document.body.appendChild(root);
    }
    root.innerHTML = '';
  });
}

test.describe('visual assertion helpers smoke', () => {
  test('computed-style + token helpers on #/flux-basic', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/flux-basic', { waitUntil: 'commit' });
    await expect(page.locator('.nop-page').first()).toBeVisible({ timeout: 20_000 });

    // 令牌已定义：主题层必须提供 --background（V1 dark 工作的首要探测器）
    const backgroundToken = await expectCssVarResolves(page, '--background');
    expect(backgroundToken.length).toBeGreaterThan(0);

    // 页面背景已着色：playground 的 app 背景是渐变栈（--nop-app-bg），
    // 落在 :root(html) 的 background-image 上（background-color 保持透明）。
    const appBackground = await getComputedStyleValue(page.locator('html'), 'background-image');
    expect(appBackground.toLowerCase()).toContain('gradient');

    // 字面色通道：实体控件（表单按钮）背景非透明
    const button = page.getByRole('button').first();
    await expectComputedStyleNot(button, 'background-color', 'rgba(0, 0, 0, 0)');
  });

  test('probeCanvasPixels: painted 2d canvas is non-zero', async ({ page }) => {
    await mountProbeRoot(page);
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2d context unavailable');
      ctx.fillStyle = 'rgb(255, 0, 0)';
      ctx.fillRect(0, 0, 64, 64);
      document.querySelector('[data-vqa-probe-root]')!.appendChild(canvas);
    });
    const probe = await probeCanvasPixels(page.locator(PROBE_ROOT_SELECTOR));
    expect(probe.result).toBe('non-zero-pixels');
    expect(probe.mode).toBe('2d');
    expect(probe.probed).toBe(1);
  });

  test('probeCanvasPixels: painted webgl canvas is non-zero', async ({ page }) => {
    await mountProbeRoot(page);
    // preserveDrawingBuffer:true keeps the framebuffer valid across tasks so a
    // separate evaluate call can sample it; live three.js canvases (default
    // false) must be probed in the same task that triggers the frame.
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
      if (!gl) throw new Error('webgl context unavailable');
      gl.clearColor(0, 0.5, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      document.querySelector('[data-vqa-probe-root]')!.appendChild(canvas);
    });
    const probe = await probeCanvasPixels(page.locator(PROBE_ROOT_SELECTOR));
    expect(probe.result).toBe('non-zero-pixels');
    expect(probe.mode).toBe('webgl');
  });

  test('expectCanvasPainted: blank canvas reports all-zero and fails strict probe', async ({ page }) => {
    await mountProbeRoot(page);
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      document.querySelector('[data-vqa-probe-root]')!.appendChild(canvas);
    });
    const probe = await probeCanvasPixels(page.locator(PROBE_ROOT_SELECTOR));
    expect(probe.result).toBe('all-zero');
    await expect(expectCanvasPainted(page.locator(PROBE_ROOT_SELECTOR))).rejects.toThrow();
  });

  test('captureVisualEvidence writes a diagnostic screenshot artifact', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/#/flux-basic', { waitUntil: 'commit' });
    await expect(page.locator('.nop-page').first()).toBeVisible({ timeout: 20_000 });
    const path = await captureVisualEvidence(page, 'visual-assert-helpers', 'flux-basic-evidence');
    expect(existsSync(path)).toBe(true);
  });
});
