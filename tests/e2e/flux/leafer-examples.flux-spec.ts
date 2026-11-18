import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * I17.3 leafer-examples 路由渲染 smoke：#/leafer-examples 可达 + canvas 存在性断言
 * （至少一个官方示例渲染出非空 canvas）+ 不破坏既有 playground 路由。程序化断言，无截图判定。
 *
 * Migrated from tests/e2e/leafer-examples.spec.ts (E3 batch 3, engine swap +
 * the canvas non-empty check upgraded: beyond the bounding box > 0, the first
 * canvas buffer is asserted to have non-zero pixel dimensions (width/height
 * attributes), catching a mounted-but-zero-sized canvas the old box check
 * could miss on a detached-measure race).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the route
 * remounts (ft.reload() is unusable — it destroys the CDP context mid-spec).
 */

const HEADING = 'LeaferJS 官方示例对照页';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING, level: 1 })).not.toBeVisible();
}

async function openLeaferExamples(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/leafer-examples');
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING, level: 1 })).toBeVisible({
    timeoutMs: 15_000,
  });
}

export default async function leaferExamples(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: route is reachable and renders LeaferJS canvases
  await openLeaferExamples(ft);

  // 四个示例容器全部挂载
  const containers = ft.locator('[data-testid="leafer-example-canvas"]');
  await ft.expectWeb(containers).toHaveCount(4, { timeoutMs: 10_000 });

  // 至少一个官方示例渲染出非空 canvas（Leafer 在容器内创建 <canvas> 元素）
  const firstCanvas = containers.locator('canvas').first();
  await ft.expectWeb(firstCanvas).toBeVisible({ timeoutMs: 10_000 });
  const canvasCount = await containers.locator('canvas').count();
  if (canvasCount < 1) throw new Error(`expected >=1 leafer canvas, got ${canvasCount}`);

  const box = await firstCanvas.boundingBox();
  if (!box) throw new Error('first leafer canvas bounding box missing');
  if (!(box.width > 0) || !(box.height > 0)) {
    throw new Error(`first leafer canvas box should be non-empty: ${JSON.stringify(box)}`);
  }
  // Strengthened: the buffer itself must have non-zero pixel dimensions.
  // TODO(migrate-debt): evaluate fallback (canvas width/height attribute read —
  // no locator.evaluate in the driver API, via document.querySelector)
  const buffer = await ft.evaluate(
    `(() => { const el = document.querySelector('[data-testid="leafer-example-canvas"] canvas'); return el ? { w: el.width, h: el.height } : null; })()`,
  );
  if (!buffer || !(buffer.w > 0) || !(buffer.h > 0)) {
    throw new Error(`leafer canvas buffer should be non-empty: ${JSON.stringify(buffer)}`);
  }

  await expectNoPageErrors(ft, 'leafer-examples:render');

  // Case 2: viewport zoom/move controls are interactive
  await openLeaferExamples(ft);

  // 视口缩放/平移按钮可点击且不报错
  await ft.getByRole('button', { name: 'Zoom In' }).click();
  await ft.getByRole('button', { name: 'Zoom Out' }).click();
  await ft.getByRole('button', { name: 'Reset' }).click();

  await expectNoPageErrors(ft, 'leafer-examples:viewport-controls');

  return { cases: 2 };
}
