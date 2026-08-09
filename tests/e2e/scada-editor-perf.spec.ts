import { test, expect, type Page } from './fixtures.js';

// E9.2 编辑态 benchmark 复测（runtime 3 层 App，对照 editing-envelope-2026-08-06.md §3 裁定建议值）。
//
// 测量维度（对照 §3）：
// - ② 编辑操作响应延迟 <100ms（per-call）：对齐/分布/层级/复制粘贴在选区 n=100/1000 下的 per-call 同步成本。
// - ① 拖拽响应 fps ≥30fps @ 选区 ≤1k（primary 包络）：1k 选区指针拖拽期间 rAF 显示帧率。
// - ④ 内存 ≤320MB：1k 图元场景 CDP JS heap。
//
// 程序化断言，禁截图、不引 node-canvas（roadmap 测试纪律）。headless 帧钟随机器负载波动，
// fps 取 3 次采样最大值作判定（与 scada-perf.spec.ts 同口径）。

const DRAG_DURATION_MS = 2000;

async function getEditorCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-editor-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-editor-canvas should expose data-cid for the editor test handle').toBeTruthy();
  return cid!;
}

async function gotoEditorDemo(page: Page): Promise<void> {
  await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
  await getEditorCid(page);
}

/** 经 editor test handle.load 装入 N 个 scada-rect 图元的 config（批量构建，比 addSymbol 循环高效）。 */
async function loadScaleScene(page: Page, cid: string, count: number): Promise<void> {
  await page.evaluate(
    ({ key, count }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        load(config: unknown): void;
      };
      const symbols = Array.from({ length: count }, (_, i) => ({
        id: `r${i}`,
        type: 'scada-rect',
        x: (i % 50) * 22,
        y: Math.floor(i / 50) * 22,
        width: 20,
        height: 20,
      }));
      handle.load({ version: 1, variables: [], symbols });
    },
    { key: `__flux_scada_editor_${cid}`, count },
  );
  await page.waitForTimeout(400);
}

interface OpLatency {
  alignMs: number;
  distributeMs: number;
  zOrderMs: number;
  copyMs: number;
  pasteMs: number;
}

/** 测量工具箱操作 per-call 同步延迟（selection 规模 = n）。 */
async function measureOpLatency(page: Page, cid: string, n: number): Promise<OpLatency> {
  return page.evaluate(
    ({ key, n }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        session: { workingConfig: { symbols: Array<{ id: string }> } };
        setSelection(ids: string[]): void;
        toolbox: {
          align(d: 'left'): boolean;
          distribute(d: 'horizontal'): boolean;
          toTop(): boolean;
          copy(): number;
          paste(): string[];
        };
        undo(): void;
      };
      const ids = handle.session.workingConfig.symbols.slice(0, n).map((s) => s.id);
      handle.setSelection(ids);
      const time = <T>(fn: () => T): number => {
        const t0 = performance.now();
        fn();
        return performance.now() - t0;
      };
      const alignMs = time(() => handle.toolbox.align('left'));
      const distributeMs = time(() => handle.toolbox.distribute('horizontal'));
      const zOrderMs = time(() => handle.toolbox.toTop());
      const copyMs = time(() => handle.toolbox.copy());
      const pasteMs = time(() => handle.toolbox.paste());
      // 清理：undo 粘贴 + 对齐，避免栈累积影响后续
      handle.undo();
      handle.undo();
      return {
        alignMs: Math.round(alignMs * 10) / 10,
        distributeMs: Math.round(distributeMs * 10) / 10,
        zOrderMs: Math.round(zOrderMs * 10) / 10,
        copyMs: Math.round(copyMs * 10) / 10,
        pasteMs: Math.round(pasteMs * 10) / 10,
      };
    },
    { key: `__flux_scada_editor_${cid}`, n },
  );
}

/** 测量 n 选区指针拖拽期间 rAF 显示帧率（3 次采样取最大，与 scada-perf 同口径）。 */
async function measureDragFps(page: Page, cid: string, n: number): Promise<{ best: number; samples: number[]; firstSample: number }> {
  const canvas = page.locator('[data-slot="scada-editor-canvas-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('editor canvas bounding box not found');

  // 选区 = 前 n 个图元。
  await page.evaluate(
    ({ key, n }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        session: { workingConfig: { symbols: Array<{ id: string }> } };
        setSelection(ids: string[]): void;
      };
      const ids = handle.session.workingConfig.symbols.slice(0, n).map((s) => s.id);
      handle.setSelection(ids);
    },
    { key: `__flux_scada_editor_${cid}`, n },
  );
  // 等 setSelection 驱动的 EditSelect overlay 构建稳定（首次大规模选区 simulateTarget 初始化，
  // [E1.1-sg] watch-only residual），避免冷启动污染首帧采样。
  await page.waitForTimeout(500);

  const samples: number[] = [];
  for (let s = 0; s < 3; s++) {
    // rAF 帧计数与 pointer move 并发：先启动计数 evaluate（返回 promise，不 await），
    // 同步驱动 pointer move 触发 editor transform 热路径，最后 await 计数结果。
    const rafPromise = page.evaluate(
      async (duration) => {
        const started = performance.now();
        const times: number[] = [];
        return new Promise<{ fps: number; frames: number }>((resolve) => {
          const frame = (now: number): void => {
            times.push(now);
            if (now - started < duration) {
              requestAnimationFrame(frame);
              return;
            }
            const span = (times[times.length - 1] ?? now) - started;
            resolve({
              fps: span > 0 ? Math.round((times.length / span) * 1000 * 10) / 10 : 0,
              frames: times.length,
            });
          };
          requestAnimationFrame(frame);
        });
      },
      DRAG_DURATION_MS,
    );
    await page.mouse.move(box.x + 60, box.y + 60);
    await page.mouse.down();
    const end = Date.now() + DRAG_DURATION_MS;
    let x = box.x + 60;
    while (Date.now() < end) {
      x += 20;
      if (x > box.x + box.width - 60) x = box.x + 60;
      await page.mouse.move(x, box.y + 60, { steps: 1 });
    }
    await page.mouse.up();
    const result = await rafPromise;
    samples.push(result.fps);
    await page.waitForTimeout(300);
  }
  return { best: Math.max(...samples), samples, firstSample: samples[0] };
}

test.describe('Scada Editor Performance Retest (E9.2, editing-envelope §3)', () => {
  test.describe.configure({ timeout: 240_000 });

  test('② 编辑操作 per-call 响应延迟 <100ms（n=100/1000）', async ({ page }) => {
    await gotoEditorDemo(page);
    const cid = await getEditorCid(page);
    await loadScaleScene(page, cid, 1000);

    const n100 = await measureOpLatency(page, cid, 100);
    console.log(`[PERF-EDITOR] op-latency n=100: ${JSON.stringify(n100)}`);
    const n1000 = await measureOpLatency(page, cid, 1000);
    console.log(`[PERF-EDITOR] op-latency n=1000: ${JSON.stringify(n1000)}`);

    // ② per-call <100ms（含最大项）
    const maxOp = Math.max(n100.alignMs, n100.distributeMs, n100.zOrderMs, n100.copyMs, n100.pasteMs);
    const maxOp1k = Math.max(n1000.alignMs, n1000.distributeMs, n1000.zOrderMs, n1000.copyMs, n1000.pasteMs);
    console.log(`[PERF-EDITOR] max per-call: n=100=${maxOp}ms, n=1000=${maxOp1k}ms`);
    expect(maxOp).toBeLessThan(100);
    expect(maxOp1k).toBeLessThan(100);
  });

  test('① 拖拽响应 fps ≥30fps @ 选区 ≤1k（primary 包络）', async ({ page }) => {
    await gotoEditorDemo(page);
    const cid = await getEditorCid(page);
    await loadScaleScene(page, cid, 1000);

    const { best, samples, firstSample } = await measureDragFps(page, cid, 1000);
    console.log(`[PERF-EDITOR] drag rAF fps n=1000 (3 samples): samples=${samples.join(',')}, best=${best}, first=${firstSample}`);

    // ① ≥30fps @ ≤1k（primary 包络裁定建议值）。headless 帧钟波动取 3 次采样最大值。
    // 容忍 swiftshader/headless 下界：best ≥ 30fps 为 primary 达标。
    expect(best).toBeGreaterThanOrEqual(30);
  });

  test('④ 编辑器内存 ≤320MB（1k 图元场景，CDP JS heap）', async ({ page }) => {
    await gotoEditorDemo(page);
    const cid = await getEditorCid(page);

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

    await loadScaleScene(page, cid, 1000);
    const mem = await heapUsedMB();
    console.log(`[PERF-EDITOR] 1k-symbols editor heap: ${mem}MB`);
    // ④ ≤320MB（运行态红线不变，编辑态共享上限）
    expect(mem).toBeLessThanOrEqual(320);
  });
});
