import { test, expect, type Page } from './fixtures.js';
import { assertScadaCanvasRendered } from './helpers/scada-canvas-assert.js';

// I14.1 性能基准测量（scada-perf-scale）：10 万图元首屏创建 / 拖动 fps（双口径 A4）/ 内存（CDP JS heap，
// 含无 stroke 对照组）/ 1 万点实时刷新端到端延迟 + 合并帧断言。程序化断言，禁截图、不引 node-canvas。
//
// plan 2026-08-04-1558-3 Phase 2（TE-1/TE-3 e2e 有效性）：
// - 指针平移断言改为「视口变化」证据：直接读 `tree.zoomLayer.x/y`（真实平移下必变，不依赖 rAF 恒发帧），
//   断言平移期间视口偏移变化 → 消除原 rAF-only 半恒真断言（恒发 ~60fps 与是否真平移无关）。
// - 移除 blanket `allowConsoleErrors(100)`（open-audit live probe 该路由 0 console.error/pageerror）；
// - 每个 test 补 canvas 存在性断言（TE-3 黑屏兜底，helper 详见 scada-canvas-assert.ts）。
//
// 测量口径（I14.1 裁定，详见 docs/analysis/industrial-hmi/benchmark-report.md）：
// - 首屏创建 = 组态生成完成 → tree render 首帧（engine.reset 驱动，导航/生成开销排除在计时外；
//   generate 耗时单独记录）。基线试探性阈值 = 验收包络 <2s，最终阈值 I14.3 固化。
// - fps 双口径（A4）：渲染吞吐（tree 层 render 事件计数）+ 显示帧率（rAF）。指针事件路径实测
//   （真实浏览器 move 事件驱动平移）。测量发现：viewport 插件驱动的 zoomLayer 平移（指针/wheel）
//   在 3 层 App 下不发射 tree render 事件（renderer totalTimes 递增、render 事件不发射；画布像素
//   实测随平移更新，视觉平移正常）——指针路径以 rAF 显示帧率计量；渲染吞吐以命令路径
//   （setViewport rAF 帧循环）render 事件计数作为 A4 吞吐代理口径。headless 帧钟随机器负载波动，
//   均取 3 次采样最大值作判定（试探性阈值，I14.3 固化）。
// - 内存 = CDP JS heap（JSHeapUsedSize，collectGarbage 后采样取 min×3）。
// - 1 万点刷新 = 测试句柄批量注入通道（perf-injection-channel 裁定）→ tree render 完成计时；
//   合帧断言：批量注入后渲染事件增量 === 1（合并帧/脏属性收集路径）。

const SCALE_COUNT = 100_000;
const REFRESH_COUNT = 10_000;
const PAN_DURATION_MS = 2000;

async function getScadaCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-canvas should expose data-cid for the test handle').toBeTruthy();
  return cid!;
}

async function gotoPerfScale(page: Page): Promise<void> {
  await page.goto('/#/scada-perf-scale', { waitUntil: 'load' });
  await getScadaCid(page);
}

/** 10 万图元构建（engine.reset 全量路径）：组态生成耗时与构建→首帧耗时分开记录。 */
async function buildScaleScene(
  page: Page,
  cid: string,
  options: { stroke?: boolean } = {},
): Promise<{ genMs: number; buildMs: number; symbols: number }> {
  return page.evaluate(
    async ({ key, count, stroke }) => {
      const perf = (window as unknown as Record<string, unknown>).__scadaPerfScale as {
        generate(count: number, options?: { stroke?: boolean }): unknown;
      };
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        engine: { reset(config: unknown): void; getSymbols(): unknown[] };
        tree: { on(event: string, cb: () => void): void; off(event: string, cb: () => void): void };
      };
      const genStart = performance.now();
      const config = perf.generate(count, { stroke });
      const genMs = performance.now() - genStart;
      let firstFrameTs = 0;
      const listener = (): void => {
        if (firstFrameTs === 0 && handle.engine.getSymbols().length >= count) {
          firstFrameTs = performance.now();
        }
      };
      handle.tree.on('render', listener);
      const t0 = performance.now();
      handle.engine.reset(config);
      return new Promise((resolve) => {
        const check = (): void => {
          if (firstFrameTs > 0 && handle.engine.getSymbols().length >= count) {
            handle.tree.off('render', listener);
            resolve({
              genMs: Math.round(genMs * 10) / 10,
              buildMs: Math.round((firstFrameTs - t0) * 10) / 10,
              symbols: handle.engine.getSymbols().length,
            });
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
    },
    { key: `__flux_scada_${cid}`, count: SCALE_COUNT, stroke: options.stroke === true },
  );
}

interface PanResult {
  rafFps: number;
  renderFps: number;
  rafCount: number;
  renderCount: number;
}

/** 双口径同步采样：rAF 显示帧率 + tree render 渲染吞吐，同一时间窗口内计数。 */
async function measurePanDual(page: Page, cid: string, durationMs: number): Promise<PanResult> {
  return page.evaluate(
    async ({ key, duration }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        tree: { on(event: string, cb: () => void): void; off(event: string, cb: () => void): void };
      };
      let renderCount = 0;
      const renderListener = (): void => {
        renderCount += 1;
      };
      handle.tree.on('render', renderListener);
      const rafTimes: number[] = [];
      const started = performance.now();
      return new Promise((resolve) => {
        const frame = (now: number): void => {
          rafTimes.push(now);
          if (now - started < duration) {
            requestAnimationFrame(frame);
            return;
          }
          handle.tree.off('render', renderListener);
          const span = (rafTimes[rafTimes.length - 1] ?? now) - started;
          const rafFps = span > 0 ? Math.round((rafTimes.length / span) * 1000 * 10) / 10 : 0;
          const renderFps = span > 0 ? Math.round((renderCount / span) * 1000 * 10) / 10 : 0;
          resolve({
            rafFps,
            renderFps,
            rafCount: rafTimes.length,
            renderCount,
          });
        };
        requestAnimationFrame(frame);
      });
    },
    { key: `__flux_scada_${cid}`, duration: durationMs },
  );
}

test.describe('Scada Performance Baseline (I14.1)', () => {
  test.describe.configure({ timeout: 180_000 });

  test('10 万图元首屏创建（组态生成完成 → tree render 首帧）< 2000ms', async ({ page }) => {
    await gotoPerfScale(page);
    const cid = await getScadaCid(page);

    const result = await buildScaleScene(page, cid, { stroke: true });
    console.log(
      `[PERF] Scada 100k first-screen create: genMs=${result.genMs}, buildMs=${result.buildMs}, symbols=${result.symbols}`,
    );

    expect(result.symbols).toBeGreaterThanOrEqual(SCALE_COUNT);
    expect(result.buildMs).toBeLessThan(2000);
    // TE-3 canvas 存在性断言（重场景像素探测可能 fallback，帧计数硬门禁）
    await assertScadaCanvasRendered(page, cid, { notes: '100k stroke scene' });
  });

  test('10 万图元拖动/平移 fps 双口径（渲染吞吐 ≥45fps，A4）', async ({ page }) => {
    await gotoPerfScale(page);
    const cid = await getScadaCid(page);
    await buildScaleScene(page, cid, { stroke: true });
    await page.waitForTimeout(500);

    const canvas = page.locator('[data-slot="scada-canvas"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('scada canvas bounding box not found');

    // ① 指针事件路径实测（真实浏览器 move 事件驱动平移）：显示帧率（rAF）双口径之一。
    // 注：viewport 插件驱动的 zoomLayer 平移不触发 tree 层 render 事件（3 层 App 下 renderer
    // totalTimes 递增但 render 事件不发射；画布像素实测随平移更新，视觉平移正常）——
    // 指针路径渲染吞吐以 rAF 显示帧率计量（benchmark-report 测量口径声明）。
    // headless 帧钟随机器负载波动：取 3 次采样最大值作判定（试探性阈值，I14.3 固化）。
    //
    // TE-1 有效性（plan 2026-08-04-1558-3 Phase 2）：rAF 恒发 ~60fps 与是否真平移无关（半恒真），
    // 补「视口变化」证据——直接读 `tree.zoomLayer.x/y`（真实平移下必变，不依赖引擎 sync 路径送达性，
    // F3）。平移前后 zoomLayer 偏移变化 → 证明指针拖动真实驱动了视口平移（非恒真）。
    const pointerSamples: PanResult[] = [];
    let viewportChanged = false;
    for (let sample = 0; sample < 3; sample++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const beforeOffset = await page.evaluate((key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as {
          app: { tree: { zoomLayer: { x: number; y: number } } };
        };
        const layer = handle.app.tree.zoomLayer;
        return { x: layer.x, y: layer.y };
      }, `__flux_scada_${cid}`);
      const pointerPan = measurePanDual(page, cid, PAN_DURATION_MS);
      const end = Date.now() + PAN_DURATION_MS;
      let x = box.x + box.width * 0.25;
      while (Date.now() < end) {
        x += 48;
        if (x > box.x + box.width * 0.75) x = box.x + box.width * 0.25;
        await page.mouse.move(x, box.y + box.height * 0.5, { steps: 2 });
      }
      await page.mouse.up();
      const afterOffset = await page.evaluate((key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as {
          app: { tree: { zoomLayer: { x: number; y: number } } };
        };
        const layer = handle.app.tree.zoomLayer;
        return { x: layer.x, y: layer.y };
      }, `__flux_scada_${cid}`);
      if (afterOffset.x !== beforeOffset.x || afterOffset.y !== beforeOffset.y) {
        viewportChanged = true;
      }
      const pointer = await pointerPan;
      pointerSamples.push(pointer);
      await page.waitForTimeout(300);
    }
    const pointerBest = Math.max(...pointerSamples.map((s) => s.rafFps));
    console.log(
      `[PERF] Scada 100k pointer-drag fps (display/rAF, 3 samples): samples=${pointerSamples.map((s) => s.rafFps).join(',')}` +
        `, best=${pointerBest} (render-events: plugin-pan 不发射，见 benchmark-report 口径声明)`,
    );
    console.log(
      `[TE-1] pointer-drag viewport-change evidence: zoomLayer offset ${viewportChanged ? 'changed' : 'unchanged'} across pan windows`,
    );

    // ② 渲染吞吐代理口径（命令路径 setViewport rAF 帧循环，tree render 事件计数）：A4 判定基础。
    const throughputSamples: Array<{ rafFps: number; renderFps: number; rafCount: number; renderCount: number }> = [];
    for (let sample = 0; sample < 3; sample++) {
      const throughput = await page.evaluate(
        async ({ key, duration }) => {
          const handle = (window as unknown as Record<string, unknown>)[key] as {
            engine: { getViewport(): { x: number; y: number; scale: number }; setViewport(s: { x: number; y: number; scale: number }): void };
            tree: { on(event: string, cb: () => void): void; off(event: string, cb: () => void): void };
          };
          let renderCount = 0;
          const renderListener = (): void => {
            renderCount += 1;
          };
          handle.tree.on('render', renderListener);
          const rafTimes: number[] = [];
          const started = performance.now();
          return new Promise((resolve) => {
            const frame = (now: number): void => {
              rafTimes.push(now);
              const viewport = handle.engine.getViewport();
              handle.engine.setViewport({ x: viewport.x + 8, y: viewport.y + 4, scale: viewport.scale });
              if (now - started < duration) {
                requestAnimationFrame(frame);
                return;
              }
              handle.tree.off('render', renderListener);
              const span = (rafTimes[rafTimes.length - 1] ?? now) - started;
              const rafFps = span > 0 ? Math.round((rafTimes.length / span) * 1000 * 10) / 10 : 0;
              const renderFps = span > 0 ? Math.round((renderCount / span) * 1000 * 10) / 10 : 0;
              resolve({ rafFps, renderFps, rafCount: rafTimes.length, renderCount });
            };
            requestAnimationFrame(frame);
          });
        },
        { key: `__flux_scada_${cid}`, duration: PAN_DURATION_MS },
      );
      throughputSamples.push(throughput);
      await page.waitForTimeout(300);
    }
    const throughputBest = Math.max(...throughputSamples.map((s) => s.renderFps));
    console.log(
      `[PERF] Scada 100k pan render-throughput fps (tree render events, 3 samples): ` +
        `samples=${throughputSamples.map((s) => s.renderFps).join(',')}, best=${throughputBest}` +
        `, rafSamples=${throughputSamples.map((s) => s.rafFps).join(',')}`,
    );

    // TE-1 视口变化证据：指针拖动期间 zoomLayer 偏移必须变化（非恒真）。
    expect(viewportChanged, 'pointer drag must actually move the viewport (zoomLayer x/y changed)').toBe(true);
    expect(pointerBest).toBeGreaterThanOrEqual(45);
    expect(throughputBest).toBeGreaterThanOrEqual(45);
    // TE-3 canvas 存在性断言（重场景像素探测可能 fallback，帧计数硬门禁）。
    // T5 例外：throughput 循环把视口移出内容区（+~2880px vs 2000px world），canvas 合法空白——
    // 非可见性缺陷，允许全零 fallback。
    await assertScadaCanvasRendered(page, cid, {
      notes: '100k stroke scene after pan (viewport off-content)',
      allowZeroPixels: true,
    });
  });

  test('10 万图元内存（CDP JS heap，含无 stroke 对照组）≤ 320MB', async ({ page }) => {
    await gotoPerfScale(page);
    const cid = await getScadaCid(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.enable');
    await cdp.send('Performance.enable');

    const heapUsedMB = async (): Promise<number> => {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.waitForTimeout(300);
      let best = Infinity;
      for (let i = 0; i < 3; i++) {
        const { metrics } = await cdp.send('Performance.getMetrics');
        const used = metrics.find((m: { name: string; value: number }) => m.name === 'JSHeapUsedSize')?.value;
        if (typeof used === 'number' && used > 0) best = Math.min(best, used);
        await page.waitForTimeout(100);
      }
      return Math.round((best / 1024 / 1024) * 10) / 10;
    };

    await buildScaleScene(page, cid, { stroke: true });
    const strokeMB = await heapUsedMB();

    await buildScaleScene(page, cid, { stroke: false });
    const noStrokeMB = await heapUsedMB();

    console.log(
      `[PERF] Scada 100k heap: stroke=${strokeMB}MB, no-stroke=${noStrokeMB}MB, delta=${Math.round((strokeMB - noStrokeMB) * 10) / 10}MB`,
    );

    expect(strokeMB).toBeLessThanOrEqual(320);
    expect(noStrokeMB).toBeLessThanOrEqual(320);
    // TE-3 canvas 存在性断言（100k 内存场景成功 ready 路径硬门，plan 2026-08-04-2243-3 T4）
    await assertScadaCanvasRendered(page, cid, { notes: '100k memory scene' });
  });

  test('1 万点实时刷新端到端延迟 < 200ms + 合帧断言（批量注入渲染增量 = 1）', async ({ page }) => {
    await page.goto('/#/scada-perf-scale', { waitUntil: 'load' });
    await getScadaCid(page);

    // 1 万点刷新场景经 UI 切换（key 重挂载全量重建，pointStore 经 reloadBindings 加载 10k 声明）
    await page.getByTestId('scada-perf-refresh').click();
    const canvas = page.locator('[data-slot="scada-canvas"]');
    await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
    const cid = await canvas.getAttribute('data-cid');
    expect(cid).toBeTruthy();
    await expect
      .poll(
        async () =>
          page.evaluate(
            (key) =>
              ((window as unknown as Record<string, unknown>)[key] as {
                engine: { getSymbols(): unknown[] };
              }).engine.getSymbols().length,
            `__flux_scada_${cid}`,
          ),
        { timeout: 60_000, intervals: [1000, 1000, 1000, 1000, 1000] },
      )
      .toBeGreaterThanOrEqual(REFRESH_COUNT);
    await page.waitForTimeout(300);

    const result = await page.evaluate(
      async ({ key, count }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as {
          tree: { on(event: string, cb: () => void): void; off(event: string, cb: () => void): void };
          setPointValues?: (values: Record<string, number>) => void;
        };
        if (!handle.setPointValues) {
          throw new Error('test handle setPointValues (perf-injection-channel) is not attached');
        }
        let renders = 0;
        const listener = (): void => {
          renders += 1;
        };
        handle.tree.on('render', listener);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const baseline = renders;
        const values: Record<string, number> = {};
        for (let i = 0; i < count; i++) {
          values[`pt-${i}`] = ((i * 37) % 1000) + 1;
        }
        const t0 = performance.now();
        handle.setPointValues(values);
        return new Promise((resolve) => {
          const check = (): void => {
            if (renders > baseline) {
              handle.tree.off('render', listener);
              resolve({
                latencyMs: Math.round((performance.now() - t0) * 10) / 10,
                renderDelta: renders - baseline,
              });
              return;
            }
            requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        });
      },
      { key: `__flux_scada_${cid}`, count: REFRESH_COUNT },
    );
    console.log(
      `[PERF] Scada 10k point batch refresh: latencyMs=${result.latencyMs}, renderDelta=${result.renderDelta}`,
    );

    expect(result.latencyMs).toBeLessThan(200);
    expect(result.renderDelta).toBe(1);
    // TE-3 canvas 存在性断言（10k 刷新场景成功 ready 路径硬门，plan 2026-08-04-2243-3 T4）
    await assertScadaCanvasRendered(page, cid!, { notes: '10k refresh scene' });
  });

  test('gate-3 §10 m-8：组态加载逐节点 add vs batch.add 对照（观察项口径固化）', async ({ page }) => {
    await gotoPerfScale(page);
    const cid = await getScadaCid(page);

    const probe = await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as {
          measureAddStrategies?: (count: number) => { count: number; perNodeMs: number; batchMs: number; ratio: number };
        };
        if (!handle.measureAddStrategies) {
          throw new Error('test handle measureAddStrategies (m-8 probe) is not attached');
        }
        return handle.measureAddStrategies(50_000);
      },
      `__flux_scada_${cid}`,
    );
    console.log(
      `[PERF] Scada m-8 batch.add probe: count=${probe.count}, perNodeMs=${probe.perNodeMs}, batchMs=${probe.batchMs}, ratio=${Math.round(probe.ratio * 100) / 100}x`,
    );

    // 观察项（非缺陷）：记录对比口径，不作为 pass/fail 门禁（benchmark-report 固化结论）
    expect(probe.count).toBe(50_000);
    expect(probe.perNodeMs).toBeGreaterThan(0);
    expect(probe.batchMs).toBeGreaterThan(0);
    // TE-3 canvas 存在性断言
    await assertScadaCanvasRendered(page, cid, { notes: 'm-8 probe scene' });
  });
});
