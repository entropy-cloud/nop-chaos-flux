import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';
import { assertScadaCanvasRendered } from './helpers/scada-canvas-assert.js';

// 559 Phase 3 scada-gallery 冒烟：三行业场景（水处理/配电/灌装）挂载 + 实时数据驱动 +
// 告警联动 + 句柄轨远程控制。程序化断言（测试句柄/属性面），无截图断言。

async function getScadaCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-canvas should expose data-cid for the test handle').toBeTruthy();
  return cid!;
}

interface ScadaTestHandleShape {
  engine: {
    getSymbols(): Array<{ id?: string; definition?: { type?: string } }>;
    getSymbolProps(id: string): Record<string, unknown> | undefined;
  };
  getPointValue(pointId: string): number | undefined;
}

function makeReader(page: Page, cid: string) {
  const key = `__flux_scada_${cid}`;
  return {
    types: (): Promise<string[]> =>
      page.evaluate((k) => {
        const handle = (window as unknown as Record<string, unknown>)[k as string] as ScadaTestHandleShape;
        return handle.engine.getSymbols().map((symbol) => String(symbol.definition?.type));
      }, key),
    props: (id: string): Promise<Record<string, unknown> | undefined> =>
      page.evaluate(([k, symId]) => {
        const handle = (window as unknown as Record<string, unknown>)[k as string] as ScadaTestHandleShape;
        return handle.engine.getSymbolProps(symId as string);
      }, [key, id] as const),
    point: (pointId: string): Promise<number | undefined> =>
      page.evaluate(([k, pid]) => {
        const handle = (window as unknown as Record<string, unknown>)[k as string] as ScadaTestHandleShape;
        return handle.getPointValue(pid as string);
      }, [key, pointId] as const),
  };
}

test.describe('Scada Gallery (559 Phase 3)', () => {
  test('water scene mounts with expanded symbols and live simulator values', async ({ page }) => {
    await page.goto('/#/scada-gallery', { waitUntil: 'load' });
    const cid = await getScadaCid(page);
    await assertScadaCanvasRendered(page, cid, { notes: 'gallery water scene' });
    const reader = makeReader(page, cid);

    for (const expected of [
      'scada-device-tank',
      'scada-device-gate-valve',
      'scada-device-check-valve',
      'scada-pipe-elbow',
      'scada-pipe-tee',
      'scada-instrument-trend',
      'scada-instrument-numeric',
      'scada-sensor-control-alarm-light',
    ]) {
      expect(await reader.types(), `water scene should use ${expected}`).toContain(expected);
    }

    // 实时数据：flux 轨模拟器驱动点表（液位随 tick 变化；复合图元的绑定值落在内部
    // extent/role 子节点，root getSymbolProps 只承载 x/y —— 读点表而非根属性）
    const levelA = await reader.point('wetWellLevel');
    // 轮询式活性断言：正弦周期 16s，固定采样窗可能取到同相位值 → poll 直到变化
    await expect
      .poll(async () => reader.point('wetWellLevel'), { timeout: 12_000, intervals: [1_000] })
      .not.toBe(levelA);

    // 句柄轨远程控制：故障注入按钮 → 点表写穿（fault 状态色应用由包内 state-visual 单测覆盖）
    await page.getByTestId('scada-gallery-water-pump-a-fault').click();
    await expect.poll(async () => reader.point('pumpA'), { timeout: 3_000 }).toBe(2);
    await assertTrackedPageErrors(page, []);
  });

  test('power scene mounts breakers/transformer and handle rail toggles breaker states', async ({ page }) => {
    await page.goto('/#/scada-gallery', { waitUntil: 'load' });
    await page.getByTestId('scada-gallery-scene-power').click();
    const cid = await getScadaCid(page);
    await assertScadaCanvasRendered(page, cid, { notes: 'gallery power scene' });
    const reader = makeReader(page, cid);

    const types = await reader.types();
    expect(types).toContain('scada-elec-breaker');
    expect(types).toContain('scada-elec-transformer');

    // F3 馈线初始分闸（open 灰）→ 合闸按钮 → 点表写穿 + 状态色应用（包内单测覆盖视觉）
    await page.getByTestId('scada-gallery-power-brk-f3-close').click();
    await expect.poll(async () => reader.point('brkF3'), { timeout: 3_000 }).toBe(1);
    await assertTrackedPageErrors(page, []);
  });

  test('filling scene runs level cycle with alarm banner linkage', async ({ page }) => {
    await page.goto('/#/scada-gallery', { waitUntil: 'load' });
    await page.getByTestId('scada-gallery-scene-filling').click();
    const cid = await getScadaCid(page);
    await assertScadaCanvasRendered(page, cid, { notes: 'gallery filling scene' });
    const reader = makeReader(page, cid);

    const types = await reader.types();
    expect(types).toContain('scada-device-conveyor');
    expect(types).toContain('scada-device-tank');

    // 液位告警联动加速观测：经测试钩子注入低液位（18%）→ 下一 tick lowTank=1 → 页内告警横幅
    await page.evaluate(() => {
      const hook = (window as unknown as Record<string, unknown>).__scadaGallery as { set: (tag: string, value: number) => void };
      hook.set('tankLevel', 18);
    });
    await expect(page.getByTestId('scada-gallery-alarm-banner')).toBeVisible({ timeout: 15_000 });
    await assertTrackedPageErrors(page, []);
  });
});
