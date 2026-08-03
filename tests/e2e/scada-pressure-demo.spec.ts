import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';

// I13.2 scada-pressure-demo smoke：程序化断言（测试句柄读场景树/视口），无截图断言、不引 node-canvas。

async function getScadaCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-canvas should expose data-cid for the test handle').toBeTruthy();
  return cid!;
}

/** 测试句柄面（engine 实例 + 只读面）。 */
interface ScadaTestHandleShape {
  engine: {
    getSymbols(): unknown[];
    getViewport(): { x: number; y: number; scale: number };
    getSymbol(id: string): unknown;
  };
}


test.describe('Scada Pressure Demo (I13.2)', () => {
  test('overview screen mounts by default with a working test handle', async ({ page }) => {
    await page.goto('/#/scada-pressure-demo', { waitUntil: 'load' });
    const cid = await getScadaCid(page);

    const count = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbols().length,
      `__flux_scada_${cid}`,
    );
    expect(count).toBeGreaterThan(10);
    expect(count).toBeLessThan(200);

    const viewport = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getViewport(),
      `__flux_scada_${cid}`,
    );
    expect(typeof viewport.scale).toBe('number');
    await assertTrackedPageErrors(page);
  });

  test('switching to the pressure screen builds 10k+ symbols and refits the viewport', async ({ page }) => {
    await page.goto('/#/scada-pressure-demo', { waitUntil: 'load' });
    const overviewCid = await getScadaCid(page);
    const overviewCount = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbols().length,
      `__flux_scada_${overviewCid}`,
    );

    // 记录旧引擎实例引用（cid 按 runtime 内计数器分配，重挂载后同结构节点 cid 相同——以实例引用判定重挂载）
    await page.evaluate((key) => {
      (window as unknown as Record<string, unknown>).__scadaOldEngine = (
        (window as unknown as Record<string, unknown>)[key] as { engine: unknown }
      ).engine;
    }, `__flux_scada_${overviewCid}`);

    await page.getByTestId('scada-screen-pressure').click();

    // 画面切换 → SchemaRenderer 重挂载（key=screen）→ 新引擎实例（旧句柄随 destroy 移除）
    const canvas = page.locator('[data-slot="scada-canvas"]');
    await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
    const cid = await canvas.getAttribute('data-cid');
    expect(cid).toBeTruthy();

    await expect
      .poll(
        async () =>
        page.evaluate(
          (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbols().length,
          `__flux_scada_${cid}`,
        ),
        { timeout: 60_000, intervals: [1000, 1000, 1000, 1000, 1000] },
      )
      .toBeGreaterThanOrEqual(10_000);

    const count = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbols().length,
      `__flux_scada_${cid}`,
    );
    expect(count).toBeGreaterThan(overviewCount);

    const engineReplaced = await page.evaluate((key) => {
      const oldEngine = (window as unknown as Record<string, unknown>).__scadaOldEngine;
      const newEngine = ((window as unknown as Record<string, unknown>)[key] as { engine: unknown }).engine;
      return oldEngine !== undefined && newEngine !== undefined && oldEngine !== newEngine;
    }, `__flux_scada_${cid}`);
    expect(engineReplaced).toBe(true);

    // 确定性：固定种子生成器产出稳定图元 id 集合
    const mid = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbol('gen-5000'),
      `__flux_scada_${cid}`,
    );
    expect(mid).toBeTruthy();

    // 视口变化断言：10k 图元世界（2000×1300）fit contain 到 1100×620 画布 → scale < 1
    const viewport = await page.evaluate(
      (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getViewport(),
      `__flux_scada_${cid}`,
    );
    expect(viewport.scale).toBeLessThan(1);
    await assertTrackedPageErrors(page);
  });

  test('switching back to the overview screen restores the small scene', async ({ page }) => {
    await page.goto('/#/scada-pressure-demo', { waitUntil: 'load' });
    await getScadaCid(page);

    await page.getByTestId('scada-screen-pressure').click();
    const canvas = page.locator('[data-slot="scada-canvas"]');
    await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
    const pressureCid = await canvas.getAttribute('data-cid');
    await expect
      .poll(
        async () =>
        page.evaluate(
          (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbols().length,
          `__flux_scada_${pressureCid}`,
        ),
        { timeout: 60_000, intervals: [1000, 1000, 1000, 1000, 1000] },
      )
      .toBeGreaterThanOrEqual(10_000);

    await page.getByTestId('scada-screen-overview').click();
    await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
    const backCid = await canvas.getAttribute('data-cid');
    await expect
      .poll(
        async () =>
        page.evaluate(
          (key) => ((window as unknown as Record<string, unknown>)[key] as ScadaTestHandleShape).engine.getSymbols().length,
          `__flux_scada_${backCid}`,
        ),
        { timeout: 60_000, intervals: [1000, 1000, 1000] },
      )
      .toBeLessThan(200);
    await assertTrackedPageErrors(page);
  });
});
