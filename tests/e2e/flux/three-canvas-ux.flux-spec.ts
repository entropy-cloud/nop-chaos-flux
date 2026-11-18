import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * plan 533 D1：3D 视口质感契约 e2e（程序化断言，无截图判据）——
 * canvas 元素 role/aria-label/tabIndex 属性（a11y 面）。
 * webgl-unavailable 路径 headless 环境不可驱动（有 GL）→ 判据在 RTL 单测
 * （three-canvas-lifecycle-ui webgl 差异化用例）；骨架 aria-busy 同理（加载瞬态）。
 *
 * Migrated from tests/e2e/three-canvas-ux.spec.ts (E3 batch 3, engine swap +
 * canvas buffer/DPR read (old locator.evaluate) re-implemented as an
 * ft.evaluate querySelector probe with an explicit >= comparison — the buffer
 * ratio is now also asserted to be an integer multiple of the CSS width when
 * devicePixelRatio is integral, strengthening the HiDPI sharpness contract).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the demo route
 * remounts (ft.reload() is unusable — it destroys the CDP context mid-spec).
 */

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-testid="three-demo-canvas"]')).not.toBeVisible();
}

async function openDemo(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/three-canvas-demo');
  await ft.expectWeb(
    ft.locator('[data-testid="three-demo-canvas"] canvas[role="application"]'),
  ).toBeVisible({ timeoutMs: 30_000 });
}

export default async function threeCanvasUx(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: renderer canvas carries role, aria-label and tabindex (a11y contract)
  await openDemo(ft);

  const canvas = ft.locator('[data-testid="three-demo-canvas"] canvas[role="application"]');
  // toHaveAttribute takes an exact value, not a RegExp — read the attribute and
  // match the label pattern explicitly. aria-label is set post-init (engine
  // ready effect), so poll for it instead of reading once.
  let label: string | null = null;
  let tabIndex: string | null = null;
  for (let i = 0; i < 50; i++) {
    label = await canvas.attr('aria-label');
    tabIndex = await canvas.attr('tabindex');
    if (label !== null && /3D|Interactive 3D/.test(label) && tabIndex === '0') break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (label === null || !/3D|Interactive 3D/.test(label)) {
    throw new Error(`canvas aria-label should match /3D|Interactive 3D/, got "${label}"`);
  }
  if (tabIndex !== '0') {
    throw new Error(`canvas tabindex should be "0", got "${tabIndex}"`);
  }

  await expectNoPageErrors(ft, 'three-canvas-ux:a11y');

  // Case 2: canvas buffer tracks devicePixelRatio (HiDPI sharpness contract)
  await openDemo(ft);

  // TODO(migrate-debt): evaluate fallback (old locator.evaluate reading
  // clientWidth/buffer width on the canvas element — no locator.evaluate in the
  // driver API, so this goes through document.querySelector)
  const buffers = await ft.evaluate(
    `(() => { const el = document.querySelector('[data-testid="three-demo-canvas"] canvas[role="application"]'); return el ? { cssWidth: el.clientWidth, bufferWidth: el.width, dpr: window.devicePixelRatio } : null; })()`,
  );
  if (!buffers) throw new Error('three demo canvas missing from DOM');
  if (!(buffers.bufferWidth >= buffers.cssWidth)) {
    throw new Error(
      `canvas buffer width ${buffers.bufferWidth} should be >= css width ${buffers.cssWidth}`,
    );
  }
  // Strengthened: when DPR is integral, buffer width must be an exact multiple
  // of the CSS width (setPixelRatio honored precisely, not approximately).
  const dpr = Number(buffers.dpr);
  if (Number.isInteger(dpr) && dpr > 0 && buffers.bufferWidth % buffers.cssWidth !== 0) {
    throw new Error(
      `canvas buffer width ${buffers.bufferWidth} is not an exact multiple of css width ${buffers.cssWidth} at DPR ${dpr}`,
    );
  }

  await expectNoPageErrors(ft, 'three-canvas-ux:dpr');

  return { cases: 2 };
}
