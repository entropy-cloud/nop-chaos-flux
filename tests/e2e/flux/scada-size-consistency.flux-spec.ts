import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Plan 474 (visual-quality V4-F3/A3) — canvas size-consistency guard.
 *
 * 主判据（并行二轮 review 修订）：**canvas 绘制缓冲（width/height ÷ devicePixelRatio）
 * vs 容器 boundingBox**——P1-5 类"声明 960/渲染 302"错配（CSS 收窄/宿主挤压）在此直接
 * 暴露，bbox 相等比较单独无守护力（CSS inset:0 使 bbox 恒等于容器盒）只作冒烟。
 * 全部断言程序化，无截图判据（AGENTS.md 2026-08-28 政策）。
 *
 * Migrated from tests/e2e/scada-size-consistency.spec.ts (E3 batch 2, engine swap +
 * expect.poll → explicit retry loop against ft.evaluate with the same 10s budget
 * and 250ms interval).
 */

interface BoxRead {
  bufW: number;
  bufH: number;
  boxW: number;
  boxH: number;
}

const CANVAS_SEL = '[data-slot="scada-canvas"]';

async function openScadaDemo(ft: FtGlobal): Promise<void> {
  await ft.setViewportSize(1440, 900);
  await ft.goto('/#/scada-demo');
  const canvas = ft.locator(CANVAS_SEL);
  await ft.expectWeb(canvas).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(canvas).toHaveAttribute('data-status', 'ready', { timeoutMs: 15_000 });
}

/**
 * 绘制缓冲 vs 容器盒一致性：buffer ÷ dpr 必须与容器 rect 相等（±2px 取整容差）。
 * expect.poll → 显式轮询循环（防抖 ResizeObserver + 首帧样式收敛可能滞后）。
 */
async function expectBufferMatchesContainer(
  ft: FtGlobal,
  rootSelector: string,
  containerSelector: string,
): Promise<void> {
  const js = `(function(){
    var root = document.querySelector(${JSON.stringify(rootSelector)});
    var canvas = null;
    if (root) canvas = root.tagName === 'CANVAS' ? root : root.querySelector('canvas');
    var container = document.querySelector(${JSON.stringify(containerSelector)});
    if (!root || !canvas || !container) return 'missing';
    var dpr = window.devicePixelRatio || 1;
    var rect = container.getBoundingClientRect();
    return JSON.stringify({
      bufW: Math.round(canvas.width / dpr),
      bufH: Math.round(canvas.height / dpr),
      boxW: Math.round(rect.width),
      boxH: Math.round(rect.height)
    });
  })()`;
  const deadline = Date.now() + 10_000;
  let last: unknown = 'missing';
  while (Date.now() < deadline) {
    last = await ft.evaluate(js);
    if (typeof last === 'string' && last !== 'missing') {
      const r = JSON.parse(last) as BoxRead;
      if (Math.abs(r.bufW - r.boxW) <= 2 && Math.abs(r.bufH - r.boxH) <= 2) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`buffer/container mismatch after 10s: ${JSON.stringify(last)}`);
}

async function expectGridDrawn(ft: FtGlobal): Promise<void> {
  const cid = await ft.locator(CANVAS_SEL).attr('data-cid');
  const info = (await ft.evaluate(
    `(function(){
      var holder = window['__flux_scada_' + ${JSON.stringify(cid)}];
      var engine = holder && holder.engine;
      var ground = engine && engine.ground;
      var gridGroup = ground && ground.children
        ? ground.children.filter(function(c){ return c.name === 'scada-ground-grid'; })[0]
        : null;
      return JSON.stringify({
        has: Boolean(gridGroup),
        lines: gridGroup && gridGroup.children ? gridGroup.children.length : 0
      });
    })()`,
  )) as string;
  const gridInfo = JSON.parse(info) as { has: boolean; lines: number };
  if (!gridInfo.has) throw new Error('scada-ground-grid group missing from engine ground layer');
  if (!(gridInfo.lines > 0)) throw new Error('scada-ground-grid has no lines drawn');
}

export default async function scadaSizeConsistency(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: adaptive state — canvas tracks its flex container and grid is drawn
  await openScadaDemo(ft);

  const canvas = ft.locator(CANVAS_SEL);
  await canvas.waitFor('visible', { timeoutMs: 15_000 });
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('canvas bounding box missing');
  // 冒烟：h-full w-full 的宽度贴合（高度是 flex 列的主导份额，兄弟行占余量）。
  // xpath=.. 不在 driver API 内 → 容器 .nop-scada-canvas 直接定位父盒。
  const parentBox = await ft.locator('.nop-scada-canvas').boundingBox();
  if (!parentBox) throw new Error('canvas container bounding box missing');
  if (!(canvasBox.width > 100)) throw new Error(`canvas width ${canvasBox.width} not > 100`);
  if (!(canvasBox.height > 100)) throw new Error(`canvas height ${canvasBox.height} not > 100`);
  if (Math.abs(canvasBox.width - parentBox.width) > 2) {
    throw new Error(`canvas width ${canvasBox.width} deviates from container ${parentBox.width}`);
  }
  if (!(canvasBox.height > parentBox.height / 2)) {
    throw new Error(`canvas height ${canvasBox.height} not > half container ${parentBox.height}`);
  }

  // 主判据：绘制缓冲 == 容器盒（÷dpr）
  await expectBufferMatchesContainer(ft, CANVAS_SEL, '.nop-scada-canvas');

  // grid consumption (plan 474 V4-F1/A1)：scada-demo 传 background.grid——
  // engine 句柄读 ground 层已绘网格组（选定的 A1 e2e 证据通道，m-4）
  await expectGridDrawn(ft);
  await expectNoPageErrors(ft, 'scada-size-consistency:adaptive');

  // Case 2: declared state — fixed 960×520 container renders the canvas at the declared size
  await ft.setViewportSize(1440, 1100);
  await ft.goto('/#/scada-edge-cases');
  const declared = ft.getByTestId('scada-edge-declared-size');
  await ft.expectWeb(declared).toBeVisible({ timeoutMs: 15_000 });
  const declaredCanvas = declared.locator(CANVAS_SEL);
  await ft.expectWeb(declaredCanvas).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(declaredCanvas).toHaveAttribute('data-status', 'ready', { timeoutMs: 15_000 });

  const declaredBox = await declared.boundingBox();
  const declaredCanvasBox = await declaredCanvas.boundingBox();
  if (!declaredBox) throw new Error('declared container bounding box missing');
  if (!declaredCanvasBox) throw new Error('declared canvas bounding box missing');
  if (Math.round(declaredBox.width) !== 960) {
    throw new Error(`declared container width ${declaredBox.width} !== 960`);
  }
  if (Math.round(declaredBox.height) !== 520) {
    throw new Error(`declared container height ${declaredBox.height} !== 520`);
  }
  if (Math.abs(declaredCanvasBox.width - declaredBox.width) > 2) {
    throw new Error(`canvas width ${declaredCanvasBox.width} deviates from declared 960`);
  }
  if (Math.abs(declaredCanvasBox.height - declaredBox.height) > 2) {
    throw new Error(`canvas height ${declaredCanvasBox.height} deviates from declared 520`);
  }

  // 主判据：绘制缓冲 == 声明尺寸（容器恰为声明尺寸，dpr=1）
  await expectBufferMatchesContainer(
    ft,
    '[data-testid="scada-edge-declared-size"] [data-slot="scada-canvas"]',
    '[data-testid="scada-edge-declared-size"]',
  );
  await expectNoPageErrors(ft, 'scada-size-consistency:declared');

  return { cases: 2 };
}
