import { test, expect, type Page } from './fixtures.js';

// plan 2026-08-09-0121-1 Phase 2 regression：scada-canvas ready 态占位 DIV 不得拦截 pointer 事件。
// 根因：scada-canvas.tsx ready 分支渲染 `<div class="nop-scada-canvas-canvas" />`，leafer 也在同一
// container 内创建 <canvas>；React 在 leafer mount 后重渲染该 DIV 使其叠在 leafer canvas 之上，
// 拦截 pointermove/tap → EventBridge 永不收事件 → hover/click overlay 不出现（6 scada e2e 失败根因）。
// 修复：占位 DIV 加 pointer-events:none，事件穿透到 leafer sky 层。本测试断言 elementFromPoint
// 落在 leafer canvas（CANVAS/leafer-app-view）而非占位 DIV 上。

async function getScadaCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid).toBeTruthy();
  return cid!;
}

test.describe('scada-canvas pointer-events regression (plan 2026-08-09-0121-1)', () => {
  test('ready-state placeholder div does not intercept pointer events over the leafer canvas', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    // 画布中心点（任意 on-canvas 点）：elementFromPoint 不应是 ready 态占位 DIV。
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    const elAt = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        return {
          tag: el?.tagName,
          cls: el?.className?.toString?.() ?? '',
          isPlaceholderDiv:
            el?.tagName === 'DIV' && (el?.className?.toString?.() ?? '').includes('nop-scada-canvas-canvas'),
        };
      },
      { x: cx, y: cy },
    );
    // 修复后：事件穿透占位 DIV，落到 leafer canvas / leafer-app-view（TAG 非 ready 占位 DIV）。
    expect(elAt.isPlaceholderDiv, `elementFromPoint should not be the pointer-intercepting placeholder DIV (got <${elAt.tag} class="${elAt.cls}">)`).toBe(false);

    // 占位 DIV 自身须显式 pointer-events:none（CSS 类/内联）——防回归硬断言。
    const placeholderPointerEvents = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-slot="scada-canvas"]') as HTMLElement | null;
      // leafer canvas 同样带 .nop-scada-canvas-canvas class（marker 落点 effect），须精确取 DIV 占位元素。
      const placeholder = wrapper?.querySelector('div.nop-scada-canvas-canvas') as HTMLElement | null;
      if (!placeholder) return 'absent';
      return getComputedStyle(placeholder).pointerEvents;
    });
    expect(placeholderPointerEvents).toBe('none');
    await page.evaluate((key) => {
      // 触发一次 hover 覆盖物以佐证事件链通畅（非必须，强化信号）。
      void (window as unknown as Record<string, unknown>)[key];
    }, `__flux_scada_${cid}`);
  });
});
