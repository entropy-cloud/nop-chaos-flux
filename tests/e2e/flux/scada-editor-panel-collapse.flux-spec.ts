import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * plan 538 Phase 3：scada 编辑器侧板收起-展开 e2e（WorkbenchShell collapsed 契约接线）。
 * 程序化断言，无截图：面板头收起按钮 → collapsed rail 出现；rail 点击 → 面板恢复。
 *
 * Migrated from tests/e2e/scada-editor-panel-collapse.spec.ts (E3 batch 1,
 * engine swap + panel toggle assertions upgraded to retry-polling expectWeb).
 */

async function gotoEditorDemo(ft: FtGlobal): Promise<void> {
  // flux-test runner defaults to a 756px viewport, below the workbench md
  // breakpoint where side panels render display:none — force the desktop
  // viewport the original Playwright config used.
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/scada-editor-demo');
  const canvas = ft.locator('[data-slot="scada-editor-canvas"]');
  await ft.expectWeb(canvas).toBeVisible({ timeoutMs: 60_000 });
  await ft.expectWeb(canvas).toHaveAttribute('data-status', 'ready', { timeoutMs: 60_000 });
}

export default async function scadaPanelCollapse(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: palette header collapse button collapses the left panel, rail click restores it
  await gotoEditorDemo(ft);

  await ft.expectWeb(ft.getByTestId('left-panel-expanded')).toBeVisible();
  await ft.getByTestId('collapse-palette').click();
  await ft.expectWeb(ft.getByTestId('left-panel-collapsed')).toBeVisible();
  await ft.expectWeb(ft.getByTestId('left-panel-expanded')).toHaveCount(0);
  // 右侧不受影响（左右状态独立）。
  await ft.expectWeb(ft.getByTestId('right-panel-expanded')).toBeVisible();

  await ft.getByTestId('expand-left-panel').click();
  await ft.expectWeb(ft.getByTestId('left-panel-expanded')).toBeVisible();
  await ft.expectWeb(ft.getByTestId('left-panel-collapsed')).toHaveCount(0);
  await expectNoPageErrors(ft, 'scada-panel-left');

  // Case 2: inspector header collapse button collapses the right panel, rail click restores it
  await gotoEditorDemo(ft);

  await ft.expectWeb(ft.getByTestId('right-panel-expanded')).toBeVisible();
  await ft.getByTestId('collapse-inspector').click();
  await ft.expectWeb(ft.getByTestId('right-panel-collapsed')).toBeVisible();
  await ft.expectWeb(ft.getByTestId('right-panel-expanded')).toHaveCount(0);
  await ft.expectWeb(ft.getByTestId('left-panel-expanded')).toBeVisible();

  await ft.getByTestId('expand-right-panel').click();
  await ft.expectWeb(ft.getByTestId('right-panel-expanded')).toBeVisible();
  await ft.expectWeb(ft.getByTestId('right-panel-collapsed')).toHaveCount(0);
  await expectNoPageErrors(ft, 'scada-panel-right');

  return { cases: 2 };
}
