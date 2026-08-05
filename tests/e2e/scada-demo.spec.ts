import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';
import { assertScadaCanvasRendered } from './helpers/scada-canvas-assert.js';

// I13.1 scada-demo smoke：程序化断言（测试句柄 window.__flux_scada_<cid> 读场景树/点表），
// 无截图断言、不引 node-canvas（roadmap 测试纪律）。I15.1 断言矩阵补强追加在下方 describe 内
// （场景树属性面/双轨刷新渲染一致性/dblclick/hover 覆盖物/视口句柄）。
//
// plan 2026-08-04-1558-3 Phase 2（TE-3）：每个 spec 家族补 canvas 存在性断言（黑屏兜底）。

async function getScadaCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-canvas should expose data-cid for the test handle').toBeTruthy();
  return cid!;
}

/** 测试句柄面（engine 实例 + getPointValue 只读面）。 */
interface ScadaTestHandleShape {
  engine: {
    getSymbols(): unknown[];
    getViewport(): { x: number; y: number; scale: number };
    getSymbol(id: string): unknown;
    getSymbolProps(id: string): Record<string, unknown> | undefined;
    getViewportPoint(p: { x: number; y: number }): { x: number; y: number };
  };
  getSymbol(id: string): unknown;
  getPointValue(pointId: string): number | undefined;
}

async function clickSymbolAtWorld(page: Page, cid: string, worldX: number, worldY: number): Promise<void> {
  const viewportPoint = await page.evaluate(
    ({ key, x, y }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape;
      return handle.engine.getViewportPoint({ x, y });
    },
    { key: `__flux_scada_${cid}`, x: worldX, y: worldY },
  );
  const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box!.x + viewportPoint.x, box!.y + viewportPoint.y);
}

/** sky 层交互覆盖物 rect 面（hover 命中反馈断言）。 */
async function readOverlayRects(page: Page, cid: string): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
  return page.evaluate((key) => {
    const handle = (window as unknown as Record<string, unknown>)[key] as {
      app: {
        sky: {
          children?: Array<{
            name?: string;
            children?: Array<{ x: number; y: number; width: number; height: number }>;
          }>;
        };
      };
    };
    const sky = handle.app.sky;
    const group = (sky.children ?? []).find((child) => child.name === 'scada-interaction-overlay');
    if (!group?.children) return [];
    return group.children.map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
  }, `__flux_scada_${cid}`);
}

test.describe('Scada Demo (I13.1)', () => {
  test('page mounts the scada canvas with test handle exposing scene tree and viewport', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    // 测试句柄面：engine 实例（getSymbols/getViewport/getSymbol）+ getPointValue 只读面
    const symbolCount = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbols().length,
      `__flux_scada_${cid}`,
    );
    expect(symbolCount).toBeGreaterThan(10);

    const viewport = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getViewport(),
      `__flux_scada_${cid}`,
    );
    expect(typeof viewport.scale).toBe('number');

    const pump = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbol('pump-1'),
      `__flux_scada_${cid}`,
    );
    expect(pump).toBeTruthy();
    // TE-3 canvas 存在性断言（demo 家族黑屏兜底）
    await assertScadaCanvasRendered(page, cid, { notes: 'scada-demo scene' });
    await assertTrackedPageErrors(page);
  });

  test('point table refreshes over time via the flux bridge timer', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const readPoint = (pointId: string): Promise<number | undefined> =>
      page.evaluate(
        ({ key, pid }) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).getPointValue(pid),
        { key: `__flux_scada_${cid}`, pid: pointId },
      );

    const first = await readPoint('tankLevel');
    expect(typeof first).toBe('number');
    await expect
      .poll(async () => readPoint('tankLevel'), { timeout: 6_000, intervals: [500, 500, 500, 500, 500] })
      .not.toBe(first);
    await assertTrackedPageErrors(page);
  });

  test('component:setPointValue handle buttons write through the point table', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const readPoint = (pointId: string): Promise<number | undefined> =>
      page.evaluate(
        ({ key, pid }) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).getPointValue(pid),
        { key: `__flux_scada_${cid}`, pid: pointId },
      );

    await page.getByTestId('scada-btn-motor-stop').click();
    await expect.poll(async () => readPoint('motorState'), { timeout: 3_000 }).toBe(0);

    await page.getByTestId('scada-btn-motor-fault').click();
    await expect.poll(async () => readPoint('motorState'), { timeout: 3_000 }).toBe(2);

    await page.getByTestId('scada-btn-motor-start').click();
    await expect.poll(async () => readPoint('motorState'), { timeout: 3_000 }).toBe(1);
    await assertTrackedPageErrors(page);
  });

  test('clicking a device symbol opens its detail dialog (I11 click→dialog chain)', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    await clickSymbolAtWorld(page, cid, 236, 232); // pump-1 中心（world 坐标，经引擎视口变换）
    await expect(page.locator('[data-slot="dialog-surface"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('给水泵 P-101 详情')).toBeVisible({ timeout: 3_000 });
    await assertTrackedPageErrors(page);
  });
});

// ── I15.1 断言矩阵补强（场景树属性面/双轨刷新渲染一致性/dblclick/hover 覆盖物/视口句柄）──

test.describe('Scada Demo assertion matrix (I15.1)', () => {
  test('scene tree exposes the expected symbol type set and leafer property surface (m-6)', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const types = await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape & {
          engine: { getSymbols(): Array<{ definition?: { type?: string } }> };
        };
        return [...new Set(handle.engine.getSymbols().map((leaf) => leaf.definition?.type).filter(Boolean))];
      },
      `__flux_scada_${cid}`,
    );
    for (const expected of [
      'scada-pipe',
      'scada-instrument-level',
      'scada-device-pump',
      'scada-device-valve',
      'scada-pipe-junction',
      'scada-instrument-gauge',
      'scada-device-motor',
      'scada-device-fan',
      'scada-instrument-thermometer',
      'scada-sensor-control-indicator',
      'scada-sensor-control-button',
      'scada-text',
    ]) {
      expect(types, `scene tree should contain ${expected}`).toContain(expected);
    }

    // getSymbolProps 返回 leafer 节点属性面（m-6：toNodePatch 映射后键名，如 text 节点 fontSize）
    const textProps = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbolProps('text-title'),
      `__flux_scada_${cid}`,
    );
    expect(textProps).toBeTruthy();
    expect(typeof (textProps as { fontSize?: unknown }).fontSize).toBe('number');

    const pumpProps = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbolProps('pump-1'),
      `__flux_scada_${cid}`,
    );
    expect(pumpProps).toBeTruthy();
    expect(typeof (pumpProps as { x?: unknown }).x).toBe('number');
    expect(typeof (pumpProps as { y?: unknown }).y).toBe('number');

    const missing = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbolProps('nope'),
      `__flux_scada_${cid}`,
    );
    expect(missing).toBeUndefined();
    await assertTrackedPageErrors(page);
  });

  test('static-track point writes render through to symbol visual state (value → fill)', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const readBodyFill = (): Promise<string | undefined> =>
      page.evaluate((key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape & {
          getSymbol(id: string): { children?: Array<{ name?: string; fill?: string }> } | undefined;
        };
        const node = handle.getSymbol('motor-1');
        return node?.children?.find((child) => child.name === 'body')?.fill;
      }, `__flux_scada_${cid}`);

    await page.getByTestId('scada-btn-motor-fault').click();
    await expect.poll(async () => readBodyFill(), { timeout: 3_000 }).toBe('#e53935');

    await page.getByTestId('scada-btn-motor-start').click();
    await expect.poll(async () => readBodyFill(), { timeout: 3_000 }).toBe('#00cc66');
    await assertTrackedPageErrors(page);
  });

  test('flux-track refresh renders through to bound symbol geometry (liquid height)', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const readLiquidHeight = (): Promise<number | undefined> =>
      page.evaluate((key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape & {
          getSymbol(id: string): { children?: Array<{ name?: string; height?: number }> } | undefined;
        };
        const node = handle.getSymbol('level-1');
        return node?.children?.find((child) => child.name === 'liquid')?.height;
      }, `__flux_scada_${cid}`);

    // 液位柱高度随 flux 点 tankLevel（定时器 1s 模拟）变化（bindings.height scale k=1.4）
    const first = await readLiquidHeight();
    expect(typeof first).toBe('number');
    await expect
      .poll(async () => readLiquidHeight(), { timeout: 6_000, intervals: [500, 500, 500, 500, 500] })
      .not.toBe(first);
    await assertTrackedPageErrors(page);
  });

  test('dblclicking a symbol navigates (I11 dblclick→navigate chain)', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const viewportPoint = await page.evaluate(
      ({ key, x, y }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape;
        return handle.engine.getViewportPoint({ x, y });
      },
      { key: `__flux_scada_${cid}`, x: 408, y: 80 }, // motor-1 中心（376,56, 64×48）
    );
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.dblclick(box!.x + viewportPoint.x, box!.y + viewportPoint.y);

    await expect
      .poll(() => page.evaluate(() => window.location.hash), { timeout: 5_000, intervals: [200, 200, 200] })
      .toContain('flux-basic');
    await assertTrackedPageErrors(page);
  });

  test('hovering a symbol shows the sky interaction overlay and clears on leave', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    // pump-1（矩形语义复合图元，236,232 中心）hover → sky 覆盖物出现
    const viewportPoint = await page.evaluate(
      ({ key, x, y }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape;
        return handle.engine.getViewportPoint({ x, y });
      },
      { key: `__flux_scada_${cid}`, x: 236, y: 232 },
    );
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + viewportPoint.x, box!.y + viewportPoint.y);

    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(1);
    const rects = await readOverlayRects(page, cid);
    expect(rects[0].width).toBeGreaterThan(0);
    expect(rects[0].height).toBeGreaterThan(0);

    // 移到画布空白角 → hover-miss → 覆盖物清除
    await page.mouse.move(box!.x + 5, box!.y + 5);
    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(0);
    await assertTrackedPageErrors(page);
  });

  test('hover overlay stays aligned with the symbol across pan/zoom (screen-coord overlay, P1-7)', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const readViewport = (): Promise<{ x: number; y: number; scale: number }> =>
      page.evaluate(
        (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getViewport(),
        `__flux_scada_${cid}`,
      );

    // hover pump-1 → sky 覆盖物出现（初始视口 V0 下读覆盖物几何 R0）
    const viewportPoint = await page.evaluate(
      ({ key, x, y }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape;
        return handle.engine.getViewportPoint({ x, y });
      },
      { key: `__flux_scada_${cid}`, x: 236, y: 232 },
    );
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + viewportPoint.x, box!.y + viewportPoint.y);
    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(1);
    const v0 = await readViewport();
    const r0 = (await readOverlayRects(page, cid))[0];

    // R0 在 V0 下的屏幕几何 → world 几何（screen = (world - vx)·s 逆变换）
    const world = {
      x: r0.x / v0.scale + v0.x,
      y: r0.y / v0.scale + v0.y,
      width: r0.width / v0.scale,
      height: r0.height / v0.scale,
    };
    const expectedAt = (v: { x: number; y: number; scale: number }) => ({
      x: (world.x - v.x) * v.scale,
      y: (world.y - v.y) * v.scale,
      width: world.width * v.scale,
      height: world.height * v.scale,
    });

    // 命令路径（setViewport pan+zoom → applyViewportState → refresh）：覆盖物仍与图元 screen 几何对齐
    await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape & {
          engine: { setViewport(s: { x: number; y: number; scale: number }): void };
        };
        handle.engine.setViewport({ x: 200, y: 100, scale: 3 });
      },
      `__flux_scada_${cid}`,
    );
    const afterCommand = expectedAt(await readViewport());
    let rects = await readOverlayRects(page, cid);
    expect(rects).toHaveLength(1);
    expect(rects[0].x).toBeCloseTo(afterCommand.x, 1);
    expect(rects[0].y).toBeCloseTo(afterCommand.y, 1);
    expect(rects[0].width).toBeCloseTo(afterCommand.width, 1);
    expect(rects[0].height).toBeCloseTo(afterCommand.height, 1);

    // 插件路径 1（wheel 平移 → handlePluginMove → refresh）：覆盖物仍对齐
    await page.mouse.wheel(0, 120);
    await expect
      .poll(async () => (await readViewport()).y, { timeout: 3_000, intervals: [200, 200] })
      .not.toBe(100);
    let afterPlugin = expectedAt(await readViewport());
    rects = await readOverlayRects(page, cid);
    expect(rects).toHaveLength(1);
    expect(rects[0].x).toBeCloseTo(afterPlugin.x, 1);
    expect(rects[0].y).toBeCloseTo(afterPlugin.y, 1);
    expect(rects[0].width).toBeCloseTo(afterPlugin.width, 1);
    expect(rects[0].height).toBeCloseTo(afterPlugin.height, 1);

    // 插件路径 2（ctrl+wheel 缩放 → handlePluginZoom → refresh，leafer 默认 zoomMode 需 ctrl/meta）：覆盖物仍对齐
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await expect
      .poll(async () => (await readViewport()).scale, { timeout: 3_000, intervals: [200, 200] })
      .toBeGreaterThan(3);
    afterPlugin = expectedAt(await readViewport());
    rects = await readOverlayRects(page, cid);
    expect(rects).toHaveLength(1);
    expect(rects[0].x).toBeCloseTo(afterPlugin.x, 1);
    expect(rects[0].y).toBeCloseTo(afterPlugin.y, 1);
    expect(rects[0].width).toBeCloseTo(afterPlugin.width, 1);
    expect(rects[0].height).toBeCloseTo(afterPlugin.height, 1);
    await assertTrackedPageErrors(page);
  });

  test('fit/center component handles drive the viewport state', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const readViewport = (): Promise<{ x: number; y: number; scale: number }> =>
      page.evaluate(
        (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getViewport(),
        `__flux_scada_${cid}`,
      );

    // 初始 fit contain 已应用（scale 有界 > 0）；先经句柄放大到 4x
    const initial = await readViewport();
    expect(initial.scale).toBeGreaterThan(0);

    await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape & {
          engine: { setViewport(s: { x: number; y: number; scale: number }): void };
        };
        handle.engine.setViewport({ x: 0, y: 0, scale: 4 });
      },
      `__flux_scada_${cid}`,
    );
    expect((await readViewport()).scale).toBe(4);

    // fit 按钮 → 重新适配（scale 回落 < 2）
    await page.getByTestId('scada-btn-fit').click();
    await expect
      .poll(async () => (await readViewport()).scale, { timeout: 3_000, intervals: [200, 200] })
      .toBeLessThan(2);

    // 打散 x/y 后 center 按钮 → 视口回到包围盒居中（x/y 大幅收敛）
    await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape & {
          engine: { setViewport(s: { x: number; y: number; scale: number }): void };
        };
        handle.engine.setViewport({ x: 5000, y: 5000, scale: 4 });
      },
      `__flux_scada_${cid}`,
    );
    await page.getByTestId('scada-btn-center').click();
    await expect
      .poll(async () => (await readViewport()).x, { timeout: 3_000, intervals: [200, 200] })
      .toBeLessThan(1000);
    await expect
      .poll(async () => (await readViewport()).y, { timeout: 3_000, intervals: [200, 200] })
      .toBeLessThan(1000);
    await assertTrackedPageErrors(page);
  });

  test('programmatic zoom keeps the anchor fixed in screen space (matrix-level, P1-9)', async ({ page }) => {
    await page.goto('/#/scada-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    // 矩阵级断言（经测试句柄读视口 + zoomLayer 矩阵，非场景树属性）：zoomLayer.x = -viewport.x * scale
    // 恒成立 → pan 后 zoomAt 无 (vx·(1-k), vy·(1-k)) 漂移（旧引擎传内容坐标锚点，漂移后矩阵 -450 而非 -300）。
    const result = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape & {
        app: { tree: { zoomLayer: { x: number; y: number; scaleX: number } } };
        engine: {
          setViewport(s: { x: number; y: number; scale: number }): void;
          zoomAt(p: { x: number; y: number }, factor: number): void;
          getViewport(): { x: number; y: number; scale: number };
        };
      };
      const layer = handle.app.tree.zoomLayer;
      handle.engine.setViewport({ x: 50, y: 30, scale: 2 });
      const afterSet = { viewport: handle.engine.getViewport(), layer: { x: layer.x, y: layer.y, scaleX: layer.scaleX } };
      handle.engine.zoomAt({ x: 100, y: 100 }, 2);
      return {
        afterSet,
        after: handle.engine.getViewport(),
        layerAfter: { x: layer.x, y: layer.y, scaleX: layer.scaleX },
      };
    }, `__flux_scada_${cid}`);

    expect(result.afterSet.viewport).toEqual({ x: 50, y: 30, scale: 2 });
    expect(result.afterSet.layer.scaleX).toBeCloseTo(2, 6);
    expect(result.afterSet.layer.x).toBeCloseTo(-100, 6);
    expect(result.afterSet.layer.y).toBeCloseTo(-60, 6);

    expect(result.after).toEqual({ x: 75, y: 65, scale: 4 });
    expect(result.layerAfter.scaleX).toBeCloseTo(4, 6);
    expect(result.layerAfter.x).toBeCloseTo(-75 * 4, 6);
    expect(result.layerAfter.y).toBeCloseTo(-65 * 4, 6);
    await assertTrackedPageErrors(page);
  });
});
