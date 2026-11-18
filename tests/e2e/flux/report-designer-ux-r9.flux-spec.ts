import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * ux-r9 Report Designer 程序化断言（RD-1/2/3）。
 *
 * Migrated from tests/e2e/report-designer-ux-r9.spec.ts (E3 batch 4, engine
 * swap + the openReportDesigner waitForTimeout(1500) settle replaced by an
 * explicit stability gate after the canvas marker, and the bold class
 * assertion upgraded from Playwright toHaveClass(/ss-bold/) into an explicit
 * retry loop carrying the last actual class list into the failure).
 *
 * TODO(migrate-debt): evaluate fallback — getComputedStyle font-size of the fx
 * indicator and the bold class read go through ft.evaluate + querySelector
 * (first canvas match = Playwright .first() parity).
 */

async function openReportDesigner(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/report-designer');
  await ft.expectWeb(ft.locator('.report-designer-demo')).toBeVisible({ timeoutMs: 20_000 });
  // Old waitForTimeout(1500) settle → explicit stability gate.
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
}

export default async function reportDesignerUxR9(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1 (rd1-seeded-report): canvas shows the seeded sample report content
  await openReportDesigner(ft);
  const canvas = ft.locator("[data-slot='report-designer-spreadsheet-canvas']").first();
  await ft.expectWeb(canvas).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(canvas).toContainText('Demo Sales Report');
  await ft.expectWeb(canvas).toContainText('Acme Corp');

  await expectNoPageErrors(ft, 'report-designer-ux-r9:rd1-seeded-report');

  // Case 2 (rd2-cell-inspector-actions): selecting a cell exposes style actions that apply
  await openReportDesigner(ft);
  const canvas2 = ft.locator("[data-slot='report-designer-spreadsheet-canvas']").first();
  const cellA3 = canvas2.locator("td[data-row='2'][data-col='0']").first();
  await cellA3.click();
  await ft.expectWeb(ft.locator('[data-slot="report-cell-style-panel"]')).toBeVisible({ timeoutMs: 10_000 });

  await ft.locator('[data-testid="report-style-bold"]').click();
  // bold style should add ss-bold to the cell — explicit retry loop with the
  // last actual class list in the failure message.
  const deadline = Date.now() + 10_000;
  let className = '';
  for (;;) {
    className = String(
      await ft.evaluate(
        "document.querySelector('[data-slot=\"report-designer-spreadsheet-canvas\"] td[data-row=\"2\"][data-col=\"0\"]').className",
      ),
    );
    if (/ss-bold/.test(className)) break;
    if (Date.now() > deadline) {
      throw new Error(`bold style never applied to cell A3; last actual class: "${className}"`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await expectNoPageErrors(ft, 'report-designer-ux-r9:rd2-cell-inspector');

  // Case 3 (rd3-binding-indicator-readable): bound cell fx indicator is ≥12px
  await openReportDesigner(ft);
  const canvas3 = ft.locator("[data-slot='report-designer-spreadsheet-canvas']").first();
  const boundCell = canvas3.locator("td[data-row='1'][data-col='1']").first();
  await ft.expectWeb(boundCell).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(boundCell.locator("[data-slot='spreadsheet-bound-indicator']")).toBeVisible();

  const fontSize = Number.parseFloat(
    String(
      await ft.evaluate(
        "getComputedStyle(document.querySelector('[data-slot=\"report-designer-spreadsheet-canvas\"] td[data-row=\"1\"][data-col=\"1\"] [data-slot=\"spreadsheet-bound-indicator\"]')).fontSize",
      ),
    ),
  );
  if (!(fontSize >= 12)) {
    throw new Error(`fx indicator font-size ${fontSize} is below 12px`);
  }

  await expectNoPageErrors(ft, 'report-designer-ux-r9:rd3-binding-indicator');

  return { cases: 3 };
}
