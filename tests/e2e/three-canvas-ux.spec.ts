import { test, expect, assertTrackedPageErrors } from './fixtures.js';

// plan 533 D1：3D 视口质感契约 e2e（程序化断言，无截图判据）——
// canvas 元素 role/aria-label/tabIndex 属性（a11y 面）。
// webgl-unavailable 路径 headless 环境不可驱动（有 GL）→ 判据在 RTL 单测
// （three-canvas-lifecycle-ui webgl 差异化用例）；骨架 aria-busy 同理（加载瞬态）。

test.describe('three canvas ux (plan 533 D1)', () => {
  test('renderer canvas carries role, aria-label and tabindex (a11y contract)', async ({ page }) => {
    await page.goto('/#/three-canvas-demo', { waitUntil: 'load' });
    // demo 图元加载为本地几何（无外链 GLB）→ canvas 挂载后即 ready。
    const canvas = page.locator('[data-testid="three-demo-canvas"] canvas[role="application"]');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await expect(canvas).toHaveAttribute('aria-label', /3D|Interactive 3D/);
    await expect(canvas).toHaveAttribute('tabindex', '0');
    await assertTrackedPageErrors(page);
  });

  test('canvas buffer tracks devicePixelRatio (HiDPI sharpness contract)', async ({ page }) => {
    await page.goto('/#/three-canvas-demo', { waitUntil: 'load' });
    const canvas = page.locator('[data-testid="three-demo-canvas"] canvas[role="application"]');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    // setPixelRatio 生效：缓冲宽 ≥ CSS 宽（DPR=1 时相等；HiDPI 机器上严格更大）。
    const buffers = await canvas.evaluate((el: HTMLCanvasElement) => ({
      cssWidth: el.clientWidth,
      bufferWidth: el.width,
    }));
    expect(buffers.bufferWidth).toBeGreaterThanOrEqual(buffers.cssWidth);
    await assertTrackedPageErrors(page);
  });
});
