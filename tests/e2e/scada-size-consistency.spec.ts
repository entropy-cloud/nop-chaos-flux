import { test, expect, assertTrackedPageErrors } from './fixtures.js';

/**
 * Plan 474 (visual-quality V4-F3/A3) — canvas size-consistency guard.
 *
 * 主判据（并行二轮 review 修订）：**canvas 绘制缓冲（width/height ÷ devicePixelRatio）
 * vs 容器 boundingBox**——P1-5 类"声明 960/渲染 302"错配（CSS 收窄/宿主挤压）在此直接
 * 暴露，bbox 相等比较单独无守护力（CSS inset:0 使 bbox 恒等于容器盒）只作冒烟。
 * 全部断言程序化，无截图判据（AGENTS.md 2026-08-28 政策）。
 */

async function openScadaDemo(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/scada-demo', { waitUntil: 'commit' });
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  return canvas;
}

/**
 * 绘制缓冲 vs 容器盒一致性：buffer ÷ dpr 必须与容器 rect 相等（±1px 取整容差）。
 * 返回空表示 canvas/容器缺失（调用方让 toBeTruthy 失败并给出上下文）。
 */
async function expectBufferMatchesContainer(
  page: import('@playwright/test').Page,
  rootSelector: string,
  containerSelector: string,
): Promise<void> {
  // 防抖 ResizeObserver + 首帧样式收敛可能滞后 —— 轮询至稳定或超时
  await expect
    .poll(
      async () => {
        const r = await page.evaluate(
          ({ rootSel, containerSel }) => {
            const root = document.querySelector(rootSel);
            const canvas = root?.querySelector('canvas');
            const container = document.querySelector(containerSel);
            if (!root || !canvas || !container) return null;
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            return {
              bufW: Math.round(canvas.width / dpr),
              bufH: Math.round(canvas.height / dpr),
              boxW: Math.round(rect.width),
              boxH: Math.round(rect.height),
            };
          },
          { rootSel: rootSelector, containerSel: containerSelector },
        );
        if (!r) return 'missing';
        if (Math.abs(r.bufW - r.boxW) <= 2 && Math.abs(r.bufH - r.boxH) <= 2) return 'match';
        return JSON.stringify(r);
      },
      { timeout: 10_000, intervals: [250] },
    )
    .toBe('match');
}

test.describe('scada canvas size consistency (plan 474 V4-F3/A3)', () => {
  test('adaptive state — canvas tracks its flex container and grid is drawn', async ({ page }) => {
    const canvas = await openScadaDemo(page);
    const canvasBox = await canvas.boundingBox();
    const parentBox = await canvas.locator('xpath=..').boundingBox();
    expect(canvasBox).toBeTruthy();
    expect(parentBox).toBeTruthy();
    expect(canvasBox!.width).toBeGreaterThan(100);
    expect(canvasBox!.height).toBeGreaterThan(100);
    // 冒烟：h-full w-full 的宽度贴合（高度是 flex 列的主导份额，兄弟行占余量）
    expect(Math.abs(canvasBox!.width - parentBox!.width)).toBeLessThanOrEqual(2);
    expect(canvasBox!.height).toBeGreaterThan(parentBox!.height / 2);

    // 主判据：绘制缓冲 == 容器盒（÷dpr）
    await expectBufferMatchesContainer(page, '[data-slot="scada-canvas"]', '.nop-scada-canvas');

    // grid consumption (plan 474 V4-F1/A1)：scada-demo 传 background.grid——
    // engine 句柄读 ground 层已绘网格组（选定的 A1 e2e 证据通道，m-4）
    const cid = await canvas.getAttribute('data-cid');
    const gridInfo = await page.evaluate((cidValue) => {
      const engine = (
        window as unknown as Record<string, { engine?: { ground?: { children?: Array<{ name?: string; children?: unknown[] }> } } }>
      )[`__flux_scada_${cidValue}`]?.engine;
      const ground = engine?.ground;
      const gridGroup = ground?.children?.find((child) => child.name === 'scada-ground-grid');
      return { has: Boolean(gridGroup), lines: (gridGroup as { children?: unknown[] } | undefined)?.children?.length ?? 0 };
    }, cid);
    expect(gridInfo.has).toBe(true);
    expect(gridInfo.lines).toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  test('declared state — fixed 960×520 container renders the canvas at the declared size', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('/#/scada-edge-cases', { waitUntil: 'commit' });
    const declared = page.getByTestId('scada-edge-declared-size');
    await expect(declared).toBeVisible({ timeout: 15_000 });
    const canvas = declared.locator('[data-slot="scada-canvas"]');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
    const declaredBox = await declared.boundingBox();
    const canvasBox = await canvas.boundingBox();
    expect(declaredBox).toBeTruthy();
    expect(canvasBox).toBeTruthy();
    expect(declaredBox!.width).toBe(960);
    expect(declaredBox!.height).toBe(520);
    expect(Math.abs(canvasBox!.width - declaredBox!.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(canvasBox!.height - declaredBox!.height)).toBeLessThanOrEqual(2);
    // 主判据：绘制缓冲 == 声明尺寸（容器恰为声明尺寸，dpr=1）
    await expectBufferMatchesContainer(
      page,
      '[data-testid="scada-edge-declared-size"] [data-slot="scada-canvas"]',
      '[data-testid="scada-edge-declared-size"]',
    );
    await assertTrackedPageErrors(page);
  });
});
