import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * plan 2026-08-09-0121-1 Phase 2 regression：scada-canvas ready 态占位 DIV 不得拦截
 * pointer 事件。根因：scada-canvas.tsx ready 分支渲染 `<div class="nop-scada-canvas-canvas" />`，
 * leafer 在同一 container 内创建 <canvas>；React 重渲染使该 DIV 叠在 leafer canvas 之上，
 * 拦截 pointermove/tap → EventBridge 永不收事件。修复：占位 DIV 加 pointer-events:none。
 * 本测试断言 elementFromPoint 落在 leafer canvas 而非占位 DIV 上，且占位 DIV
 * computed pointerEvents === 'none'。
 *
 * Migrated from tests/e2e/scada-pointer-events-regression.spec.ts (E3 batch 3,
 * engine swap + kernel white-box expectNoPageErrors replacing the old fire-and-forget
 * handle touch — the spec now asserts a clean error channel instead of merely
 * dereferencing `window.__flux_scada_<cid>`).
 *
 * TODO(migrate-debt): evaluate fallback — document.elementFromPoint(x, y) hit-testing
 * and getComputedStyle().pointerEvents are not expressible with locators; both reads
 * go through ft.evaluate with page-side JSON.stringify, mirroring the old
 * page.evaluate bodies.
 */

async function getScadaCid(ft: FtGlobal): Promise<string> {
  const canvas = ft.locator('[data-slot="scada-canvas"]');
  await ft.expectWeb(canvas).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(canvas).toHaveAttribute('data-status', 'ready', { timeoutMs: 15_000 });
  const cid = await canvas.attr('data-cid');
  if (!cid) throw new Error('scada-canvas should expose data-cid for the test handle');
  return cid;
}

export default async function scadaPointerEventsRegression(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/scada-demo');
  const cid = await getScadaCid(ft);

  const box = await ft.locator('[data-slot="scada-canvas"]').boundingBox();
  if (!box) throw new Error('scada-canvas bounding box missing');
  // 画布中心点（任意 on-canvas 点）：elementFromPoint 不应是 ready 态占位 DIV。
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const elAt = JSON.parse(
    String(
      await ft.evaluate(
        `(() => {
          const el = document.elementFromPoint(${cx}, ${cy});
          const cls = el && el.className ? String(el.className) : '';
          return JSON.stringify({
            tag: el ? el.tagName : null,
            cls,
            isPlaceholderDiv: !!el && el.tagName === 'DIV' && cls.includes('nop-scada-canvas-canvas'),
          });
        })()`,
      ),
    ),
  );
  if (elAt.isPlaceholderDiv) {
    throw new Error(
      `elementFromPoint should not be the pointer-intercepting placeholder DIV (got <${elAt.tag} class="${elAt.cls}">)`,
    );
  }

  // 占位 DIV 自身须显式 pointer-events:none（CSS 类/内联）——防回归硬断言。
  const placeholderPointerEvents = String(
    await ft.evaluate(
      `(() => {
        const wrapper = document.querySelector('[data-slot="scada-canvas"]');
        // leafer canvas 同样带 .nop-scada-canvas-canvas class（marker 落点 effect），须精确取 DIV 占位元素。
        const placeholder = wrapper ? wrapper.querySelector('div.nop-scada-canvas-canvas') : null;
        if (!placeholder) return 'absent';
        return getComputedStyle(placeholder).pointerEvents;
      })()`,
    ),
  );
  if (placeholderPointerEvents !== 'none') {
    throw new Error(`ready-state placeholder DIV pointerEvents should be "none", got "${placeholderPointerEvents}"`);
  }

  // 触发一次 hover 覆盖物以佐证事件链通畅：test handle 必须存在（强化信号）。
  const handlePresent = String(
    await ft.evaluate(`Boolean(window['__flux_scada_${cid}'])`),
  );
  if (handlePresent !== 'true') {
    throw new Error(`window.__flux_scada_${cid} test handle missing`);
  }

  await expectNoPageErrors(ft, 'scada-pointer-events-regression');

  return { cases: 1 };
}
