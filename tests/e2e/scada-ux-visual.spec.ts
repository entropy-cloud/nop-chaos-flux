import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';

// plan 530 S1：SCADA 视觉与令牌基础 e2e（computed 断言口径，无截图判据）：
// - `--ind-*` 令牌 light/dark 解析值（DOM probe 读 .nop-scada-canvas computed custom properties）；
// - hover 覆盖物终态色值来自令牌（经 `__flux_scada_<cid>` 句柄读 sky 层 leafer Rect 样式面）；
// - editor DOM 反馈 transition（appearance 属性限定 120ms，几何属性排除）。

interface ScadaTestHandleShape {
  engine: {
    getViewportPoint(p: { x: number; y: number }): { x: number; y: number };
  };
}

async function getScadaCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-canvas should expose data-cid for the test handle').toBeTruthy();
  return cid!;
}

/** sky 层交互覆盖物 rect 样式面（stroke/fill/shadow 终态断言）。 */
async function readOverlayRects(
  page: Page,
  cid: string,
): Promise<Array<{ stroke?: string; fill?: string; shadow?: string }>> {
  return page.evaluate((key) => {
    const handle = (window as unknown as Record<string, unknown>)[key] as {
      app: {
        sky: {
          children?: Array<{
            name?: string;
            children?: Array<{ stroke?: string; fill?: string; shadow?: string }>;
          }>;
        };
      };
    };
    const sky = handle.app.sky;
    const group = (sky.children ?? []).find((child) => child.name === 'scada-interaction-overlay');
    if (!group?.children) return [];
    return group.children.map((rect) => ({ stroke: rect.stroke, fill: rect.fill, shadow: rect.shadow }));
  }, `__flux_scada_${cid}`);
}

async function readCanvasTokens(page: Page): Promise<Record<string, string> | null> {
  return page.evaluate(() => {
    const el = document.querySelector('.nop-scada-canvas');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const keys = [
      '--ind-interaction-hover',
      '--ind-interaction-hover-fill',
      '--ind-interaction-press',
      '--ind-interaction-press-fill',
      '--ind-interaction-selected',
      '--ind-interaction-selected-fill',
      '--ind-interaction-selected-shadow',
      '--ind-interaction-disabled',
      '--ind-node-selected-ring',
    ];
    return Object.fromEntries(keys.map((key) => [key, cs.getPropertyValue(key).trim()]));
  });
}

test.describe('Scada UX visual (plan 530 S1)', () => {
  test('interaction tokens resolve on the runtime canvas in light mode', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    await getScadaCid(page);
    const tokens = await readCanvasTokens(page);
    expect(tokens).not.toBeNull();
    expect(tokens!['--ind-interaction-hover']).toBe('#2f6fed');
    expect(tokens!['--ind-interaction-hover-fill']).toBe('rgba(47, 111, 237, 0.08)');
    expect(tokens!['--ind-interaction-press']).toBe('#1e4fbd');
    expect(tokens!['--ind-interaction-press-fill']).toBe('rgba(30, 79, 189, 0.1)');
    expect(tokens!['--ind-interaction-selected']).toBe('#ff7f2a');
    expect(tokens!['--ind-interaction-selected-fill']).toBe('rgba(255, 127, 42, 0.12)');
    expect(tokens!['--ind-interaction-selected-shadow']).toBe('0 4px 16px rgba(255, 127, 42, 0.35)');
    expect(tokens!['--ind-interaction-disabled']).toBe('#9ca3af');
    expect(tokens!['--ind-node-selected-ring']).toBe('#ff7f2a');
    await assertTrackedPageErrors(page);
  });

  test('interaction tokens flip with host data-mode dark', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    await getScadaCid(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
    await expect
      .poll(
        async () => (await readCanvasTokens(page))?.['--ind-interaction-hover'],
        { timeout: 5_000 },
      )
      .toBe('#5b8ff5');
    const tokens = await readCanvasTokens(page);
    expect(tokens!['--ind-interaction-selected']).toBe('#ffa04d');
    expect(tokens!['--ind-node-selected-ring']).toBe('#ffa04d');
    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
    await assertTrackedPageErrors(page);
  });

  test('hover overlay terminal colors come from the resolved tokens', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);
    // pump-1（矩形语义复合图元，世界坐标 350,278 中心，与 scada-demo I15.1 hover 用例同点）
    const viewportPoint = await page.evaluate(
      ({ key, x, y }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape;
        return handle.engine.getViewportPoint({ x, y });
      },
      { key: `__flux_scada_${cid}`, x: 350, y: 278 },
    );
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + viewportPoint.x, box!.y + viewportPoint.y);

    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(1);
    const rects = await readOverlayRects(page, cid);
    expect(rects[0].stroke).toBe('#2f6fed');
    expect(rects[0].fill).toBe('rgba(47, 111, 237, 0.08)');
    await assertTrackedPageErrors(page);
  });

  test('hover overlay terminal colors follow dark-mode tokens', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
    const viewportPoint = await page.evaluate(
      ({ key, x, y }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape;
        return handle.engine.getViewportPoint({ x, y });
      },
      { key: `__flux_scada_${cid}`, x: 350, y: 278 },
    );
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + viewportPoint.x, box!.y + viewportPoint.y);

    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(1);
    const rects = await readOverlayRects(page, cid);
    expect(rects[0].stroke).toBe('#5b8ff5');
    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
    await assertTrackedPageErrors(page);
  });

  test('editor DOM feedback transitions are appearance-only at 120ms', async ({ page }) => {
    await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
    const item = page.locator('.nop-scada-editor-palette-item').first();
    await expect(item).toBeVisible({ timeout: 60_000 });
    const style = await item.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { props: cs.transitionProperty, duration: cs.transitionDuration };
    });
    expect(style.props).toContain('background-color');
    expect(style.props).toContain('opacity');
    expect(style.duration).toContain('0.12s');
    const geometryProps = style.props
      .split(',')
      .map((p) => p.trim())
      .filter((p) => ['width', 'height', 'transform', 'top', 'left', 'inset'].includes(p));
    expect(geometryProps).toEqual([]);
    const group = page.locator('.nop-scada-editor-toolbox-group').first();
    await expect(group).toBeVisible({ timeout: 15_000 });
    const groupProps = await group.evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(groupProps).toContain('background-color');
    await assertTrackedPageErrors(page);
  });
});
