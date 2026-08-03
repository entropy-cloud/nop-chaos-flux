import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';

// I13.1 scada-demo smoke：程序化断言（测试句柄 window.__flux_scada_<cid> 读场景树/点表），
// 无截图断言、不引 node-canvas（roadmap 测试纪律）。正式断言矩阵补强属 I15.1。

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
    getViewportPoint(p: { x: number; y: number }): { x: number; y: number };
  };
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

    await clickSymbolAtWorld(page, cid, 242, 234); // pump-1 中心（world 坐标，经引擎视口变换）
    await expect(page.locator('[data-slot="dialog-surface"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('给水泵 P-101 详情')).toBeVisible({ timeout: 3_000 });
    await assertTrackedPageErrors(page);
  });
});
