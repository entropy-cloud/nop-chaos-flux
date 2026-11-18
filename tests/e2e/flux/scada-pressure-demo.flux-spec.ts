import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * I13.2 scada-pressure-demo smoke：程序化断言（测试句柄读场景树/视口），无截图断言、不引 node-canvas。
 *
 * plan 2026-08-04-1558-3 Phase 2（TE-3）：每个 spec 家族补 canvas 存在性断言（黑屏兜底）。
 *
 * Migrated from tests/e2e/scada-pressure-demo.spec.ts (E3 batch 2, engine swap +
 * expect.poll symbol-count polling replaced by stability-gated retry loops and
 * kernel white-box expectNoPageErrors in place of assertTrackedPageErrors;
 * assertScadaCanvasRendered helper re-implemented on ft.evaluate — same hard
 * gates: real <canvas> element, non-zero box, forceRender frame count > 0,
 * T5 non-empty-scene all-zero-pixel failure).
 *
 * TODO(migrate-debt): evaluate fallback — the scada test handle lives on
 * `window.__flux_scada_<cid>` and its assertions (symbol counts, viewport
 * projection, engine instance identity, canvas pixel probes) are not
 * expressible with locators; every read goes through ft.evaluate with
 * page-side JSON.stringify, mirroring the old page.evaluate bodies.
 */

async function pollUntil(ft: FtGlobal, expression: string, marker: string, timeoutMs: number): Promise<string> {
  // stability-gated polling replacement for Playwright expect.poll
  const deadline = Date.now() + timeoutMs;
  let last = '';
  for (;;) {
    last = String(await ft.evaluate(expression));
    if (last.startsWith('OK:')) return last;
    if (Date.now() > deadline) throw new Error(`${marker}: ${last}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await ft.waitFor({ type: 'stability' }, { timeoutMs: 5_000 }).catch(() => undefined);
  }
}

async function getScadaCid(ft: FtGlobal): Promise<string> {
  const canvas = ft.locator('[data-slot="scada-canvas"]');
  await ft.expectWeb(canvas).toBeVisible({ timeoutMs: 30_000 });
  await ft.expectWeb(canvas).toHaveAttribute('data-status', 'ready', { timeoutMs: 30_000 });
  const cid = await canvas.attr('data-cid');
  if (!cid) throw new Error('scada-canvas should expose data-cid for the test handle');
  return cid;
}

interface CanvasAssertResult {
  tag: string;
  width: number;
  height: number;
  renderFrames: number;
  pixelProbe: string;
  symbolCount: number;
}

/** TE-3 canvas 存在性断言（黑屏兜底）: DOM canvas + 非零尺寸 + render 帧计数 + T5 像素探测。 */
async function assertScadaCanvasRendered(ft: FtGlobal, cid: string, notes: string): Promise<void> {
  const canvasSlot = ft.locator('[data-slot="scada-canvas"]');
  await ft.expectWeb(canvasSlot.locator('[data-slot="scada-canvas-canvas"]')).toBeVisible({ timeoutMs: 15_000 });
  const result = JSON.parse(
    String(
      await ft.evaluate(
        `(() => {
          const root = document.querySelector('[data-slot="scada-canvas"]');
          const handle = window['__flux_scada_${cid}'];
          const canvasEl = root ? root.querySelector('[data-slot="scada-canvas-canvas"]') : null;
          if (!canvasEl || canvasEl.tagName !== 'CANVAS') return JSON.stringify({ error: 'scada-canvas-canvas slot must land on a real <canvas> element' });
          const box = canvasEl.getBoundingClientRect();
          if (!(box.width > 0) || !(box.height > 0)) return JSON.stringify({ error: 'scada canvas must have a non-zero bounding box' });
          let renderFrames = 0;
          const listener = () => { renderFrames += 1; };
          const done = (pixelProbe) => {
            handle.tree.off('render', listener);
            const symbols = handle.engine && typeof handle.engine.getSymbols === 'function' ? handle.engine.getSymbols() : null;
            const symbolCount = Array.isArray(symbols) ? symbols.length : -1;
            return JSON.stringify({ tag: canvasEl.tagName, width: box.width, height: box.height, renderFrames, pixelProbe, symbolCount });
          };
          handle.tree.on('render', listener);
          if (typeof handle.forceRender === 'function') handle.forceRender();
          return new Promise((resolve) => {
            let raf = 0;
            const tick = () => {
              if (renderFrames > 0) { cancelAnimationFrame(raf); resolve(done(probe())); return; }
              raf = requestAnimationFrame(tick);
            };
            const probe = () => {
              // T5: scan ALL canvases in the leafer App (ground/tree/sky layers)
              const canvases = Array.from(root.querySelectorAll('canvas'));
              if (canvases.length === 0) return 'fallback-all-zero';
              let sawSecurityError = false;
              for (const c of canvases) {
                try {
                  const ctx = c.getContext('2d');
                  if (!ctx) continue;
                  const w = c.width, h = c.height;
                  if (w === 0 || h === 0) continue;
                  let nonZero = false;
                  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
                  for (let y = 0; y < h && !nonZero; y += step) {
                    for (let x = 0; x < w && !nonZero; x += step) {
                      const pixel = ctx.getImageData(x, y, 1, 1).data;
                      if (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0 || pixel[3] !== 0) nonZero = true;
                    }
                  }
                  if (nonZero) return 'confirmed';
                } catch (error) {
                  const name = (error && error.name) || '';
                  if (name === 'SecurityError' || name === 'InvalidStateError') { sawSecurityError = true; continue; }
                  throw error;
                }
              }
              return sawSecurityError ? 'fallback-security-error' : 'fallback-all-zero';
            };
            raf = requestAnimationFrame(tick);
            setTimeout(() => { cancelAnimationFrame(raf); resolve(done(probe())); }, 800);
          });
        })()`,
      ),
    ),
  ) as CanvasAssertResult;
  if (result.error) throw new Error(`scada canvas assert (${notes}): ${result.error}`);
  if (result.renderFrames <= 0) {
    throw new Error(`scada canvas assert (${notes}): tree must render at least one frame after forceRender`);
  }
  // T5: 非空场景 fallback-all-zero 视为失败（visible:false/opacity:0 回归）
  if (result.pixelProbe === 'fallback-all-zero' && result.symbolCount > 0) {
    throw new Error(
      `scada canvas assert (${notes}): non-empty scene (symbols=${result.symbolCount}) produced all-zero canvas pixels — likely a visible:false/opacity:0 regression`,
    );
  }
}

async function getSymbolCount(ft: FtGlobal, cid: string): Promise<number> {
  return Number(
    await ft.evaluate(
      `(() => { const h = window['__flux_scada_${cid}']; const s = h && h.engine ? h.engine.getSymbols() : null; return Array.isArray(s) ? s.length : -1; })()`,
    ),
  );
}

async function openScadaPressureDemo(ft: FtGlobal): Promise<void> {
  // bounce through '/#/' so the demo remounts (goto to the SAME url is a no-op)
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="scada-canvas"]')).not.toBeVisible();
  await ft.goto('/#/scada-pressure-demo');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
}

export default async function scadaPressureDemo(ft: FtGlobal): Promise<{ cases: number }> {
  // runner default viewport is below the desktop layout the demo was built for
  await ft.setViewportSize(1280, 800);

  // Case 1: overview screen mounts by default with a working test handle
  await openScadaPressureDemo(ft);
  const cid = await getScadaCid(ft);

  const overviewCount = await pollUntil(
    ft,
    `(() => { const s = window['__flux_scada_${cid}'].engine.getSymbols(); return 'OK:' + s.length; })()`,
    'overview symbols',
    30_000,
  );
  const count = Number(overviewCount.slice(3));
  if (!(count > 10)) throw new Error(`overview symbol count ${count} should be > 10`);
  if (!(count < 200)) throw new Error(`overview symbol count ${count} should be < 200`);

  const viewport = JSON.parse(
    String(
      await ft.evaluate(
        `(() => { const v = window['__flux_scada_${cid}'].engine.getViewport(); return JSON.stringify({ scale: v.scale }); })()`,
      ),
    ),
  ) as { scale: unknown };
  if (typeof viewport.scale !== 'number') throw new Error('overview viewport scale should be a number');

  // TE-3 canvas 存在性断言（pressure overview 家族黑屏兜底）
  await assertScadaCanvasRendered(ft, cid, 'pressure overview scene');
  await expectNoPageErrors(ft, 'scada-pressure:overview');

  // Case 2: switching to the pressure screen builds 10k+ symbols and refits the viewport
  await openScadaPressureDemo(ft);
  const overviewCid = await getScadaCid(ft);
  const overviewCount2 = await getSymbolCount(ft, overviewCid);
  if (!(overviewCount2 > 0)) throw new Error(`overview symbols ${overviewCount2} should be > 0`);

  // 记录旧引擎实例引用（cid 按 runtime 内计数器分配，重挂载后同结构节点 cid 相同——以实例引用判定重挂载）
  await ft.evaluate(`window.__scadaOldEngine = window['__flux_scada_${overviewCid}'].engine`);

  await ft.getByTestId('scada-screen-pressure').click();

  // 画面切换 → SchemaRenderer 重挂载（key=screen）→ 新引擎实例（旧句柄随 destroy 移除）
  const canvas = ft.locator('[data-slot="scada-canvas"]');
  await ft.expectWeb(canvas).toHaveAttribute('data-status', 'ready', { timeoutMs: 60_000 });
  const pressureCid = await canvas.attr('data-cid');
  if (!pressureCid) throw new Error('pressure screen: scada-canvas should expose data-cid');

  const pressureCount = await pollUntil(
    ft,
    `(() => { const h = window['__flux_scada_${pressureCid}']; if (!h || !h.engine) return 'PENDING'; const s = h.engine.getSymbols(); return s.length >= 10000 ? 'OK:' + s.length : 'PENDING:' + s.length; })()`,
    'pressure symbols should reach 10000',
    60_000,
  );
  const pressureSymbols = Number(pressureCount.slice(3));
  if (!(pressureSymbols > overviewCount2)) {
    throw new Error(`pressure symbols ${pressureSymbols} should exceed overview ${overviewCount2}`);
  }

  const engineReplaced = Boolean(
    await ft.evaluate(
      `(() => { const old = window.__scadaOldEngine; const neu = window['__flux_scada_${pressureCid}'] ? window['__flux_scada_${pressureCid}'].engine : undefined; return old !== undefined && neu !== undefined && old !== neu; })()`,
    ),
  );
  if (engineReplaced !== true) throw new Error('engine instance should be replaced after the screen switch');

  // 确定性：固定种子生成器产出稳定图元 id 集合
  const mid = JSON.parse(
    String(
      await ft.evaluate(
        `(() => { const s = window['__flux_scada_${pressureCid}'].engine.getSymbol('gen-5000'); return JSON.stringify({ ok: Boolean(s) }); })()`,
      ),
    ),
  ) as { ok: boolean };
  if (!mid.ok) throw new Error('deterministic symbol gen-5000 should exist in the pressure scene');

  // 视口变化断言：10k 图元世界（2000×1300）fit contain 到画布 → scale < 1
  const pressureViewport = JSON.parse(
    String(
      await ft.evaluate(
        `(() => { const v = window['__flux_scada_${pressureCid}'].engine.getViewport(); return JSON.stringify({ scale: v.scale }); })()`,
      ),
    ),
  ) as { scale: number };
  if (!(pressureViewport.scale < 1)) {
    throw new Error(`pressure viewport scale ${pressureViewport.scale} should be < 1`);
  }
  // TE-3 canvas 存在性断言（10k 压力场景成功 ready 路径硬门，plan 2026-08-04-2243-3 T3）
  await assertScadaCanvasRendered(ft, pressureCid, 'pressure 10k scene');
  await expectNoPageErrors(ft, 'scada-pressure:10k');

  // Case 3: switching back to the overview screen restores the small scene
  await openScadaPressureDemo(ft);
  await getScadaCid(ft);

  await ft.getByTestId('scada-screen-pressure').click();
  const canvas3 = ft.locator('[data-slot="scada-canvas"]');
  await ft.expectWeb(canvas3).toHaveAttribute('data-status', 'ready', { timeoutMs: 60_000 });
  const pressureCid3 = await canvas3.attr('data-cid');
  if (!pressureCid3) throw new Error('screen switch: scada-canvas should expose data-cid');
  await pollUntil(
    ft,
    `(() => { const h = window['__flux_scada_${pressureCid3}']; if (!h || !h.engine) return 'PENDING'; const s = h.engine.getSymbols(); return s.length >= 10000 ? 'OK:' + s.length : 'PENDING:' + s.length; })()`,
    'pressure symbols should reach 10000',
    60_000,
  );

  await ft.getByTestId('scada-screen-overview').click();
  await ft.expectWeb(canvas3).toHaveAttribute('data-status', 'ready', { timeoutMs: 60_000 });
  const backCid = await canvas3.attr('data-cid');
  if (!backCid) throw new Error('overview restore: scada-canvas should expose data-cid');
  const restored = await pollUntil(
    ft,
    `(() => { const h = window['__flux_scada_${backCid}']; if (!h || !h.engine) return 'PENDING'; const s = h.engine.getSymbols(); return s.length > 0 && s.length < 200 ? 'OK:' + s.length : 'PENDING:' + s.length; })()`,
    'restored overview symbols should drop below 200',
    60_000,
  );
  if (!(Number(restored.slice(3)) < 200)) throw new Error('restored overview scene should be small');
  // TE-3 canvas 存在性断言（overview 回切成功 ready 路径硬门，plan 2026-08-04-2243-3 T3）
  await assertScadaCanvasRendered(ft, backCid, 'overview restore scene');
  await expectNoPageErrors(ft, 'scada-pressure:overview-restore');

  return { cases: 3 };
}
