import { test, expect, type Page } from './fixtures.js';

// plan 2026-08-08-0900-1 Phase 4 / P2 #1 + #40：交互正确性浏览器复核（程序化断言、禁截图）。
// 三项均标注「需浏览器验证」：先 Proof 复现/证伪，确认才 Fix，不可复现则 adjudicate 为 residual。

async function getEditorCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-editor-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid).toBeTruthy();
  return cid!;
}

async function gotoEditorDemo(page: Page): Promise<string> {
  await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
  return getEditorCid(page);
}

async function loadConfig(page: Page, cid: string, config: unknown): Promise<void> {
  await page.evaluate(
    ({ key, config }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as { load(c: unknown): void };
      handle.load(config);
    },
    { key: `__flux_scada_editor_${cid}`, config },
  );
  await page.waitForTimeout(300);
}

test.describe('scada-editor interaction correctness (plan 2026-08-08-0900-1 Phase 4)', () => {
  test('#40 leafer canvas does not overlap sibling palette/inspector panels', async ({ page }) => {
    await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
    await expect(page.locator('[data-slot="scada-editor-canvas"]')).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });

    const palette = page.locator('[data-slot="scada-editor-palette"]');
    const inspector = page.locator('[data-slot="scada-editor-inspector"]');

    const paletteBox = await palette.boundingBox();
    const inspectorBox = await inspector.boundingBox();

    expect(paletteBox).toBeTruthy();
    expect(inspectorBox).toBeTruthy();

    // 程序化断言：canvas 区（data-slot="scada-editor-canvas"，含 overflow:hidden containment）
    // 不应与兄弟 palette/inspector panel 水平重叠。leafer <canvas>（整数 px inline width）
    // 由容器 overflow:hidden 视觉裁剪；此处断言布局面的 canvas 区不重叠兄弟 panel。
    const hOverlap = (a: { x: number; width: number }, b: { x: number; width: number }) =>
      a.x < b.x + b.width && a.x + a.width > b.x;

    const canvasArea = page.locator('[data-slot="scada-editor-canvas"]');
    const canvasAreaBox = await canvasArea.boundingBox();
    expect(canvasAreaBox).toBeTruthy();

    expect(
      hOverlap(canvasAreaBox!, paletteBox!),
      'canvas-area should not horizontally overlap the palette panel',
    ).toBe(false);
    expect(
      hOverlap(canvasAreaBox!, inspectorBox!),
      'canvas-area should not horizontally overlap the inspector panel',
    ).toBe(false);
  });

  test('#1 connection pointer-down drag does not pan the viewport (no gesture conflict)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    // 装入 pipe-junction + 目标设备场景，让连线拖拽路径可触发。
    await loadConfig(page, cid, {
      version: 1,
      variables: [],
      symbols: [
        { id: 'j1', type: 'scada-pipe-junction', x: 200, y: 200, width: 80, height: 40, custom: { connections: [] } },
        { id: 'dev', type: 'scada-rect', x: 500, y: 200, width: 100, height: 100 },
      ],
    });

    const vpBefore = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        engine: { getViewport: () => { x: number; y: number; scale: number } };
      };
      return handle.engine.getViewport();
    }, `__flux_scada_editor_${cid}`);

    // 在 junction 上 pointerdown + 拖拽到空白区 + up（模拟连线端点拖动到无吸附候选）。
    const canvas = page.locator('[data-slot="scada-editor-canvas-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    // junction 中心世界坐标 (240, 220) → 视口坐标（默认 viewport {0,0,1}）。
    const startX = box!.x + 240;
    const startY = box!.y + 220;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // 拖到远处的空白区（无图元吸附）。
    await page.mouse.move(box!.x + 50, box!.y + 50, { steps: 5 });
    await page.mouse.up();

    const vpAfter = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        engine: { getViewport: () => { x: number; y: number; scale: number } };
      };
      return handle.engine.getViewport();
    }, `__flux_scada_editor_${cid}`);

    // 断言：连线端点拖动期间 viewport 不被平移（无手势冲突）。
    expect(vpAfter).toEqual(vpBefore);
  });
});
