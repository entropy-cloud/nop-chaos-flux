import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';
import { assertScadaCanvasRendered } from './helpers/scada-canvas-assert.js';

// I15.1 边界用例 + 非矩形图元 hover 覆盖物验证（scada-edge-cases 独立测试页，
// I15 plan Phase 1 Decision `edge-case-carrier`）。程序化断言（测试句柄读场景树/视口/sky 覆盖物），
// 禁截图、不引 node-canvas。
//
// plan 2026-08-04-1558-3 Phase 2（TE-3）：每个 spec 家族补 canvas 存在性断言；
// empty-scene 合法全零像素走 fallback（帧计数硬门禁），非空 minimal 场景像素可探测。
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
    const box = await page.locator('[data-slot="scada-canvas"]').boundingBox();
    expect(box).toBeTruthy();
    // 先移开再落点（2026-09-01）：合成同坐标 mousemove 会被浏览器输入管线去重——首试 move 可能
    // 早于事件桥/场景就绪被消费，之后重复同坐标 move 不再产生 pointer.move（I15.1 flaky 根因）。
    // 移开一步保证随后的落点 move 恒产生真实位移事件，hover enter 语义可重放。
    await page.mouse.move(box!.x + 2, box!.y + 2);
    const viewportPoint = await page.evaluate(
      ({ key, x, y }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as {
          engine: { getViewportPoint(p: { x: number; y: number }): { x: number; y: number } };
        };
        return handle.engine.getViewportPoint({ x, y });
      },
      { key: `__flux_scada_${cid}`, x: worldX, y: worldY },
    );
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
    // TE-3 canvas 存在性断言（minimal 场景：单 rect 非空，像素探测应 confirmed 或 fallback）
    await assertScadaCanvasRendered(page, cid, { notes: 'edge minimal scene' });
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
    // TE-3 canvas 存在性断言（empty scene：合法空画面，像素探测全零 → fallback，帧计数硬门禁）
    await assertScadaCanvasRendered(page, cid, { notes: 'edge empty scene (all-zero pixel fallback expected)' });
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

    // 线图元：x=80,y=200,width=240,height=0（y 从 240 上移避开内容底边死区） → points 包围盒 (0,0)-(240,0) → 覆盖物 240×8（最小框兜底）。
    // poll 内重发 hover（2026-09-01）：ready 后容器驱动 re-fit 晚到会换算出过时的指针落点 →
    // hover-miss 无覆盖物（full-suite 负载下复现为 flaky）；每轮用最新视口重算落点即免疫。
    await expect
      .poll(
        async () => {
          await hoverSymbolAtWorld(page, cid, 200, 200);
          return readOverlayRects(page, cid);
        },
        { timeout: 10_000, intervals: [250, 250, 250] },
      )
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
    await expect
      .poll(
        async () => {
          await hoverSymbolAtWorld(page, cid, 480, 180);
          return readOverlayRects(page, cid);
        },
        { timeout: 10_000, intervals: [250, 250, 250] },
      )
      .toHaveLength(1);
    // 视口与覆盖物同拍读取（2026-09-01）：ready 后容器驱动 re-fit 可能晚到，先读视口再读
    // 覆盖物会跨过一次 fit（实测 2.4→2.529）→ 期望值用过时 scale 换算而误报。同一次
    // evaluate 内快照两者，断言的不变式「覆盖物 == 包围盒 × 当前 scale」在任何瞬间成立。
    const snapshot = await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as {
          engine: { getViewport(): { x: number; y: number; scale: number } };
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
        return {
          viewport: handle.engine.getViewport(),
          rects: (group?.children ?? []).map((rect) => ({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          })),
        };
      },
      `__flux_scada_${cid}`,
    );
    const polyRects = snapshot.rects;
    const expected = {
      x: (400 - snapshot.viewport.x) * snapshot.viewport.scale,
      y: (120 - snapshot.viewport.y) * snapshot.viewport.scale,
      width: 160 * snapshot.viewport.scale,
      height: 120 * snapshot.viewport.scale,
    };
    expect(polyRects[0].width).toBeCloseTo(expected.width, 1);
    expect(polyRects[0].height).toBeCloseTo(expected.height, 1);
    expect(polyRects[0].x).toBeCloseTo(expected.x, 1);
    expect(polyRects[0].y).toBeCloseTo(expected.y, 1);

    // A→B 切换：移动到线图元 → 覆盖物数量保持 1 且位置切换（同样 poll 内重发 hover 抗 re-fit）
    await expect
      .poll(
        async () => {
          await hoverSymbolAtWorld(page, cid, 200, 200);
          return readOverlayRects(page, cid);
        },
        { timeout: 10_000, intervals: [250, 250, 250] },
      )
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

  test('default-geometry polygon/line fit keeps viewport scale bounded (< MAX_SCALE) (D1)', async ({ page }) => {
    // plan 2026-08-04-2243-2 D1 e2e 几何断言：默认几何族（polygon 无 custom.points、line 无 width/height）
    // + viewport {fit:'contain'}。修复前 bounds 退化为 0 尺寸 → fit 冲到 MAX_SCALE(20×)；修复后按符号定义
    // 默认 points（polygon DEFAULT_TRIANGLE 100×86 / line [0,0,100,0]）算包围盒，fit scale 合理且 < 20。
    await page.goto('/#/scada-edge-cases', { waitUntil: 'load' });
    await page.getByTestId('scada-edge-default-geom').click();
    const cid = await getScadaCid(page);

    const viewport = await page.evaluate(
      (key) =>
        ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getViewport(),
      `__flux_scada_${cid}`,
    );
    // fit 已应用（full/reset 路径）：scale 有限且严格小于 MAX_SCALE(20)——修复前会贴到 20。
    expect(Number.isFinite(viewport.scale)).toBe(true);
    expect(viewport.scale).toBeLessThan(20);
    expect(viewport.scale).toBeGreaterThan(1);
    // 包围盒按默认几何有效：fit 后视口原点落在默认几何范围内（非 NaN/Infinity）
    expect(Number.isFinite(viewport.x)).toBe(true);
    expect(Number.isFinite(viewport.y)).toBe(true);

    await assertTrackedPageErrors(page);
  });
});
