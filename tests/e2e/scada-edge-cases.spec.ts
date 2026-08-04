import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';

// I15.1 边界用例 + 非矩形图元 hover 覆盖物验证（scada-edge-cases 独立测试页，
// I15 plan Phase 1 Decision `edge-case-carrier`）。程序化断言（测试句柄读场景树/视口/sky 覆盖物），
// 禁截图、不引 node-canvas。
//
// 边界 config 形态（断言矩阵清单钉死，按路径分断言）：
// - minimal：最小合法 config（1 矩形）→ 正常挂载（ready，无 empty region）；
// - empty-scene：合法空画面（symbols: []）→ 正常挂载（ready，getSymbols() 空）；
// - invalid-json：非法 JSON 文本（parse 失败）→ data-status=error + empty region 可见 + onError 派发
//   （showToast → env.notify → 页面文本 data-testid="scada-edge-notify"）；
// - line-polygon：线/多边形 hover 覆盖物验证（gate-4-review m-C points 包围盒兜底，gate-4 §6:173-174）。
// 超大画面复用既有载体（10k pressure / 100k perf-scale），不新增重复载体。

async function getScadaCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-canvas should expose data-cid for the test handle').toBeTruthy();
  return cid!;
}

  async function hoverSymbolAtWorld(page: Page, cid: string, worldX: number, worldY: number): Promise<void> {
    const viewportPoint = await page.evaluate(
      ({ key, x, y }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as {
          engine: { getViewportPoint(p: { x: number; y: number }): { x: number; y: number } };
        };
        return handle.engine.getViewportPoint({ x, y });
      },
      { key: `__flux_scada_${cid}`, x: worldX, y: worldY },
    );
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + viewportPoint.x, box!.y + viewportPoint.y);
    await page.waitForTimeout(50);
  }

  interface ScadaTestHandleShape {
    engine: {
      getViewport(): { x: number; y: number; scale: number };
    };
  }

/** sky 层交互覆盖物 rect 面（I15.1 非矩形图元 hover 断言：m-C points 包围盒兜底尺寸）。 */
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

test.describe('Scada Edge Cases (I15.1)', () => {
  test('minimal legal config mounts normally without the empty region', async ({ page }) => {
    await page.goto('/#/scada-edge-cases', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const count = await page.evaluate(
      (key) =>
        ((window as unknown as Record<string, unknown>)[key] as {
          engine: { getSymbols(): unknown[] };
        }).engine.getSymbols().length,
      `__flux_scada_${cid}`,
    );
    expect(count).toBe(1);

    const handle = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as { getSymbol(id: string): unknown }).getSymbol('edge-min-rect'),
      `__flux_scada_${cid}`,
    );
    expect(handle).toBeTruthy();

    await expect(page.locator('[data-slot="scada-canvas-error"]')).toHaveCount(0);
    await expect(page.getByText('scada 场景构建失败（config 非法）')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('empty scene (symbols: []) mounts ready with an empty scene tree', async ({ page }) => {
    await page.goto('/#/scada-edge-cases', { waitUntil: 'load' });
    await page.getByTestId('scada-edge-empty').click();
    const cid = await getScadaCid(page);

    const count = await page.evaluate(
      (key) =>
        ((window as unknown as Record<string, unknown>)[key] as {
          engine: { getSymbols(): unknown[] };
        }).engine.getSymbols().length,
      `__flux_scada_${cid}`,
    );
    expect(count).toBe(0);

    await expect(page.locator('[data-slot="scada-canvas-error"]')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('invalid JSON config shows the empty region and fires onError', async ({ page }) => {
    await page.goto('/#/scada-edge-cases', { waitUntil: 'load' });
    await page.getByTestId('scada-edge-invalid').click();

    const canvas = page.locator('[data-slot="scada-canvas"]');
    await expect(canvas).toHaveAttribute('data-status', 'error', { timeout: 15_000 });

    // empty region 可见（页面提供 empty 模板，design-renderer.md §6 区域语义）
    await expect(page.getByText('scada 场景构建失败（config 非法）')).toBeVisible({ timeout: 5_000 });
    // schema 级 events.onError → showToast → env.notify 观测面
    await expect(page.getByTestId('scada-edge-notify')).toContainText('edge-onerror-fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('hovering a line symbol shows a non-zero-size sky overlay (m-C points-bounds fallback)', async ({ page }) => {
    await page.goto('/#/scada-edge-cases', { waitUntil: 'load' });
    await page.getByTestId('scada-edge-line-poly').click();
    const cid = await getScadaCid(page);

    // 线图元：x=80,y=240,width=240,height=0 → points 包围盒 (0,0)-(240,0) → 覆盖物 240×8（最小框兜底）
    await hoverSymbolAtWorld(page, cid, 200, 240);
    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(1);
    const lineRects = await readOverlayRects(page, cid);
    expect(lineRects[0].width).toBeGreaterThan(0);
    expect(lineRects[0].height).toBeGreaterThan(0);

    await assertTrackedPageErrors(page);
  });

  test('hovering a polygon symbol moves the overlay and leaving clears it (hover-miss)', async ({ page }) => {
    await page.goto('/#/scada-edge-cases', { waitUntil: 'load' });
    await page.getByTestId('scada-edge-line-poly').click();
    const cid = await getScadaCid(page);

    // 多边形图元：x=400,y=120,points (0,0)-(160,0)-(160,90)-(80,120)-(0,90) → 包围盒 160×120。
    // 覆盖物以 screen 坐标绘制（P1-7）：页面 viewport: {fit:'contain'} 非恒等 → 断言按
    // screen = (world - vx)·s 换算（旧断言 400/120/160×120 是世界坐标，掩蔽了覆盖物未对齐缺陷）。
    const viewport = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getViewport(),
      `__flux_scada_${cid}`,
    );
    const expectScreen = (worldX: number, worldY: number, width: number, height: number) => ({
      x: (worldX - viewport.x) * viewport.scale,
      y: (worldY - viewport.y) * viewport.scale,
      width: width * viewport.scale,
      height: height * viewport.scale,
    });

    await hoverSymbolAtWorld(page, cid, 480, 180);
    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(1);
    const polyRects = await readOverlayRects(page, cid);
    const expected = expectScreen(400, 120, 160, 120);
    expect(polyRects[0].width).toBeCloseTo(expected.width, 1);
    expect(polyRects[0].height).toBeCloseTo(expected.height, 1);
    expect(polyRects[0].x).toBeCloseTo(expected.x, 1);
    expect(polyRects[0].y).toBeCloseTo(expected.y, 1);

    // A→B 切换：移动到线图元 → 覆盖物数量保持 1 且位置切换
    await hoverSymbolAtWorld(page, cid, 200, 240);
    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(1);

    // 移到空白区（世界包围盒外）→ hover-miss → 覆盖物清除
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + 5, box!.y + 5);
    await expect
      .poll(async () => readOverlayRects(page, cid), { timeout: 5_000, intervals: [200, 200, 200] })
      .toHaveLength(0);

    await assertTrackedPageErrors(page);
  });
});
