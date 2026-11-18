import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * E3 table cell popOver: trigger/content region lifecycle, copyable
 * coexistence, and onEmpty=show empty-text fallback.
 *
 * Migrated from tests/e2e/table-popover.spec.ts (E3 batch 4, engine swap +
 * assertTrackedPageErrors upgraded to kernel white-box expectNoPageErrors).
 * TODO(migrate-debt): evaluate fallback (locator.filter({hasText}) has no
 * driver equivalent — the email cell coexistence probe walks td elements via
 * ft.evaluate; the popover-content-gone-before-click check uses count()).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * openDemoPage() bounces through '/#/' with a stability gate so the route
 * remounts (ft.reload() is unusable mid-spec).
 */

async function openDemoPage(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/table-popover');
  await ft.expectWeb(ft.getByRole('heading', { name: 'table popOver 单元格（详情弹层）', level: 1 })).toBeVisible({
    timeoutMs: 15_000,
  });
}

export default async function tablePopover(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: click trigger opens popover content region and Esc closes it
  await openDemoPage(ft);

  const trigger = ft.locator('[data-slot="table-cell-popover-trigger"]').first();
  await ft.expectWeb(trigger).toBeVisible({ timeoutMs: 10_000 });

  // Popover content not visible before click (portal content unmounted).
  const contentCount = await ft.locator('[data-slot="table-cell-popover-content"]').count();
  if (contentCount !== 0) {
    throw new Error(`popover content should be absent before click, found ${contentCount}`);
  }

  await trigger.click();

  // Content region renders inside PopoverContent portal — it must be visible.
  const content = ft.locator('[data-slot="table-cell-popover-content"]');
  await ft.expectWeb(content).toBeVisible({ timeoutMs: 5_000 });

  // Title marker present.
  await ft.expectWeb(ft.locator('[data-slot="table-cell-popover-title"]')).toContainText('Note details');

  // Cell value text appears inside the rendered region.
  await ft.expectWeb(content).toContainText('Alice');

  // Esc closes the popover (Base UI escape handling).
  await ft.keyboard.press('Escape');
  await ft.expectWeb(content).toBeHidden({ timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'table-popover:trigger-esc');

  // Case 2: copyable icon and popOver trigger coexist on the same cell
  // (second table, email cell "alice@example.com")
  await openDemoPage(ft);

  await ft.expectWeb(ft.locator('body')).toContainText('alice@example.com', { timeoutMs: 10_000 });
  // TODO(migrate-debt): evaluate fallback (hasText filter replacement)
  const cellProbe = await ft.evaluate(
    `(() => { const tds = Array.from(document.querySelectorAll('td')); const cell = tds.find((td) => td.textContent && td.textContent.includes('alice@example.com')); if (!cell) return null; return { copy: !!cell.querySelector('[data-slot="table-cell-copy-button"]'), popoverTrigger: !!cell.querySelector('[data-slot="table-cell-popover-trigger"]') }; })()`,
  );
  if (!cellProbe) throw new Error('email cell (alice@example.com) not found in any td');
  if (!cellProbe.copy || !cellProbe.popoverTrigger) {
    throw new Error(`copyable + popOver trigger should coexist on the email cell: ${JSON.stringify(cellProbe)}`);
  }

  await expectNoPageErrors(ft, 'table-popover:copyable-coexist');

  // Case 3: onEmpty=show renders trigger for empty row value and shows
  // emptyText fallback (last two triggers belong to the empty-rows table)
  await openDemoPage(ft);

  const triggers = ft.locator('[data-slot="table-cell-popover-trigger"]');
  await ft.expectWeb(triggers.first()).toBeVisible({ timeoutMs: 10_000 });

  await triggers.last().click();

  const empty = ft.locator('[data-slot="table-cell-popover-empty"]');
  await ft.expectWeb(empty).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(empty).toContainText('No description available for this row');

  await expectNoPageErrors(ft, 'table-popover:on-empty');

  return { cases: 3 };
}
