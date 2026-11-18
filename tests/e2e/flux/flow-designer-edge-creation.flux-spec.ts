import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * flow-designer keyboard edge creation: connecting a real source handle to a real
 * target handle via keyboard creates a visible edge (6 → 7, "7 条连线").
 *
 * Migrated from tests/e2e/flow-designer-edge-creation.spec.ts (E3 batch 3, engine swap +
 * kernel white-box expectNoPageErrors after the edge is committed, in place of the
 * load-time-only assertTrackedPageErrors).
 *
 * The old `test.skip` diagnostic variant (synthetic `nop-designer:test-connect`
 * event) stays skipped for parity with the old suite: it was registered as a
 * manually-enabled diagnostic specimen in plan 623, not regression coverage.
 *
 * TODO(migrate-debt): evaluate fallback — the driver has no locator.focus(); handle
 * focus is applied programmatically through ft.evaluate (find button by aria-label,
 * .focus(), verify document.activeElement) with retry polling, then committed with
 * a real CDP ft.keyboard.press('Enter').
 */

async function openFlowDesigner(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/flow-designer');
  await ft.expectWeb(ft.locator('.react-flow')).toBeVisible({ timeoutMs: 45_000 });
  await ft.expectWeb(ft.locator('.react-flow__node')).toHaveCount(6, { timeoutMs: 45_000 });
  await expectNoPageErrors(ft, 'flow-designer-edge-creation:open');
}

async function focusHandleByAriaLabel(ft: FtGlobal, labelFragment: string, marker: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const focused = String(
      await ft.evaluate(
        `(() => {
          const el = Array.from(document.querySelectorAll('button, [role="button"]'))
            .find((b) => (b.getAttribute('aria-label') || '').includes('${labelFragment}'));
          if (!el) return 'missing';
          el.focus();
          return document.activeElement === el ? 'focused' : 'not-focused';
        })()`,
      ),
    );
    if (focused === 'focused') return;
    if (Date.now() > deadline) throw new Error(`${marker}: cannot focus handle (${focused})`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export default async function flowDesignerEdgeCreation(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await openFlowDesigner(ft);

  const edgeCount = ft.locator('.react-flow__edge');
  await ft.expectWeb(edgeCount).toHaveCount(6, { timeoutMs: 10_000 });

  // Keyboard connect: source handle 发送欢迎邮件/out → target handle 结束/in.
  // Full aria-labels (exact, incl. spaces): the out-fragment alone would
  // first-match the 开始 node; the target label flips to 完成到节点… only once
  // connect mode is active after the source Enter.
  await focusHandleByAriaLabel(ft, '从节点 发送欢迎邮件 的输出端口 out开始连线', 'source handle');
  await ft.keyboard.press('Enter');

  await focusHandleByAriaLabel(ft, '完成到节点 结束 的输入端口 in的连线', 'target handle');
  await ft.keyboard.press('Enter');

  await ft.expectWeb(edgeCount).toHaveCount(7, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('body')).toContainText('7 条连线', { timeoutMs: 10_000 });
  // react-flow edges are SVG <path> elements; the driver's toBeVisible heuristic
  // does not accept them — assert an effective non-zero bounding box instead
  // (same strength as the old Playwright toBeVisible on the last edge).
  const lastEdgeBox = await edgeCount.last().boundingBox();
  if (!lastEdgeBox || lastEdgeBox.width <= 0 || lastEdgeBox.height <= 0) {
    throw new Error(`last edge should have a non-zero bounding box, got ${JSON.stringify(lastEdgeBox)}`);
  }

  await expectNoPageErrors(ft, 'flow-designer-edge-creation:edge-created');

  return { cases: 1 };
}
