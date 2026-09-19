import { expect, test, assertTrackedPageErrors } from './fixtures.js';

/**
 * Plan 473 (visual-quality V3) — three-canvas interaction & visual assertions.
 * Consumes the V0 toolchain layering: L1 DOM presence (lifecycle UI), L2
 * geometry (height prop), L4 programmatic scene/renderer state via the
 * dev-only `window.__flux_three_handles` observability handles. Screenshots
 * are not used as pass criteria (AGENTS.md 2026-08-28 policy).
 */

interface ThreeManagerHandle {
  getScene(): {
    children: Array<{ type: string; name?: string; castShadow?: boolean; receiveShadow?: boolean; target?: { parent: unknown } }>;
    getObjectByName(name: string): { name: string } | undefined;
  };
  getRenderer(): { shadowMap: { enabled: boolean } } | null;
}

declare global {
  interface Window {
    __flux_three_handles?: Record<string, ThreeManagerHandle | undefined>;
  }
}

async function openDemo(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/three-canvas-demo', { waitUntil: 'commit' });
  await expect(page.getByTestId('three-demo-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('three-demo-canvas')).toHaveAttribute('data-three-scene-state', 'ready', {
    timeout: 30_000,
  });
}

test.describe('three-canvas visual & interaction (plan 473 V3)', () => {
  test('01 container height comes from the schema height prop (not the 400px default)', async ({ page }) => {
    await openDemo(page);
    const box = await page.getByTestId('three-demo-canvas').boundingBox();
    expect(box).toBeTruthy();
    // 62vh of the 900px viewport ≈ 558px — the prop value wins over the
    // legacy 400px inline default
    expect(box!.height).toBeGreaterThan(400);
    expect(box!.height).toBeLessThanOrEqual(561);
    await assertTrackedPageErrors(page);
  });

  test('02 real hover — pointermove raises onObjectHover (env.notify surface)', async ({ page }) => {
    await openDemo(page);
    const canvas = page.getByTestId('three-demo-canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    // sweep a grid over the canvas; the cube/orb occupy wide areas so a
    // coarse sweep crosses them — hover enter dispatches onObjectHover →
    // showToast → env.notify → the visible notify surface
    for (let gx = 1; gx <= 6; gx += 1) {
      for (let gy = 1; gy <= 6; gy += 1) {
        await page.mouse.move(box!.x + (box!.width * gx) / 7, box!.y + (box!.height * gy) / 7);
        await page.waitForTimeout(60);
      }
    }

    await expect(page.getByTestId('three-demo-notify')).toContainText('悬停', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('03 shadow wiring — renderer state + scene graph via debug handle', async ({ page }) => {
    await openDemo(page);
    const state = await page.evaluate(() => {
      const manager = window.__flux_three_handles?.['three-demo-canvas'];
      if (!manager) return { present: false as const };
      const scene = manager.getScene();
      const renderer = manager.getRenderer();
      const ground = scene.getObjectByName('ground');
      const directional = scene.children.find(
        (child) => child.type === 'DirectionalLight' && child.castShadow,
      );
      return {
        present: true as const,
        shadowMapEnabled: renderer?.shadowMap.enabled ?? false,
        groundName: ground?.name ?? null,
        groundReceiveShadow: Boolean((ground as { receiveShadow?: boolean } | undefined)?.receiveShadow),
        directionalInScene: Boolean(directional),
        targetInScene: Boolean(directional && (directional as { target?: { parent?: unknown } }).target?.parent),
      };
    });
    expect(state.present).toBe(true);
    expect(state.shadowMapEnabled).toBe(true);
    expect(state.groundName).toBe('ground');
    expect(state.groundReceiveShadow).toBe(true);
    expect(state.directionalInScene).toBe(true);
    expect(state.targetInScene).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('04 error state — broken url shows built-in error UI with retry', async ({ page }) => {
    await openDemo(page);
    const errorCanvas = page.getByTestId('three-demo-error-canvas');
    await expect(errorCanvas).toBeVisible({ timeout: 30_000 });
    await expect(errorCanvas).toHaveAttribute('data-three-scene-state', 'error', { timeout: 30_000 });
    await expect(errorCanvas.locator('[data-slot="three-canvas-error"]')).toBeVisible();
    await expect(errorCanvas.locator('[data-slot="three-canvas-retry"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('05 AI generation entry — canned provider produces and applies a schema', async ({ page }) => {
    await openDemo(page);
    await page.getByTestId('three-demo-ai-generate').click();
    await expect(page.getByTestId('three-demo-ai-json')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('three-demo-ai-json')).toContainText('generated-cube');

    // the generated scene replaced the demo canvas (model visible via handle)
    // the generated schema recompiles through SchemaRenderer (new schemaUrl)
    await expect
      .poll(async () => {
        const state = await page.evaluate(() => {
          const manager = window.__flux_three_handles?.['three-demo-canvas'];
          const scene = manager?.getScene();
          return {
            has: manager ? Boolean(scene?.getObjectByName('generated-cube')) : false,
            handle: Boolean(manager),
            names: scene ? scene.children.map((c) => c.name ?? c.type).slice(0, 10) : [],
          };
        });
        return state.has ? 'applied' : JSON.stringify(state.names);
      }, { timeout: 15_000 })
      .toBe('applied');

    await page.getByTestId('three-demo-ai-apply').click();
    await expect(page.getByTestId('three-demo-ai-json')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });
});
