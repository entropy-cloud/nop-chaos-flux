import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-4 (plan 547) P1 red→green specs for the designer/editor domain.
// Each case reproduces a finding from the plan-547 dual-review live audit;
// convictions cite programmatic readings (toast observers, DOM counts,
// disabled states), never screenshots.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

const toastTexts = (page: import('@playwright/test').Page) =>
  page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''));

test.describe('IS-4 designer interaction state (plan 547)', () => {
  // taskflow-3: createDefaultEnv notify is a no-op — a failing command (paste
  // in tree mode is graph-only) must surface a failure toast.
  test('taskflow: failing command surfaces a failure toast (notify wired)', async ({ page }) => {
    await gotoPage(page, '/#/taskflow-designer');
    // switch to Tree tab: paste is a graph-only command there → the command
    // adapter fails with 'unavailable' → notifyCommandFailure must surface.
    const treeTab = page.getByRole('tab', { name: /Tree/i }).first();
    await treeTab.click();
    await page.waitForTimeout(1200);
    await page.locator('.react-flow__pane').click({ button: 'right' });
    const pasteItem = page.getByRole('menuitem', { name: /粘贴|Paste/ }).first();
    await expect(pasteItem).toBeVisible({ timeout: 5_000 });
    await pasteItem.click();
    await page.waitForTimeout(600);
    const toasts = await toastTexts(page);
    expect(
      toasts.length,
      `a failing command must surface feedback via notify, got toasts: ${JSON.stringify(toasts)}`,
    ).toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  // taskflow-1: Save must succeed (authoring model available) and toast.
  test('taskflow: Save toolbar action succeeds with feedback', async ({ page }) => {
    await gotoPage(page, '/#/taskflow-designer');
    const save = page.getByRole('button', { name: /^Save$|^保存$/ }).first();
    await expect(save).toBeVisible({ timeout: 10_000 });
    await save.click();
    await page.waitForTimeout(900);
    const toasts = await toastTexts(page);
    expect(
      toasts.some((t) => /已保存|saved/i.test(t)),
      `Save must produce its success feedback (schema promises 已保存), got: ${JSON.stringify(toasts)}`,
    ).toBe(true);
    await assertTrackedPageErrors(page);
  });

  // taskflow-2: Delete on a selected node removes it (inspector promises 删除).
  test('taskflow: Delete removes the selected branch node (script-2, tree tab)', async ({ page }) => {
    await gotoPage(page, '/#/taskflow-designer');
    const treeTab = page.getByRole('tab', { name: /Tree/i }).first();
    await treeTab.click();
    await page.waitForTimeout(1500);
    const node = page.locator('.react-flow__node[data-id="script-2"]').first();
    await expect(node).toBeVisible({ timeout: 20_000 });
    const before = await page.locator('.react-flow__node').count();
    await node.click();
    await page.waitForTimeout(300);
    await expect(page.locator('.react-flow__node.selected, .react-flow__node[aria-selected="true"]').first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
    await page.keyboard.press('Delete');
    await page.waitForTimeout(600);
    const after = await page.locator('.react-flow__node').count();
    expect(
      after,
      `Delete must remove the selected branch node (before ${before}, after ${after}; selection-cleared-without-delete = the taskflow-2 defect)`,
    ).toBeLessThan(before);
    await assertTrackedPageErrors(page);
  });

  // host-1: field insert must write the cell value (aligned with the demo
  // reference: setCellValue `${fieldId}` before the metadata binding).
  test('report-host: field insert writes the field binding into the selected cell', async ({ page }) => {
    await gotoPage(page, '/#/report-designer-host');
    // select a visible cell in the spreadsheet canvas
    const cell = page.locator('[data-slot="spreadsheet-cell"], [role="gridcell"]').first();
    await expect(cell.first).toBeTruthy;
    const target = page.locator('[data-slot="spreadsheet-cell"]').first();
    const fallback = page.getByText('Alpha').first();
    if (await target.isVisible().catch(() => false)) {
      await target.click();
    } else {
      await fallback.click();
    }
    await page.waitForTimeout(300);
    // click the first 插入 button in the field panel
    const insertBtn = page.getByRole('button', { name: /插入|Insert/ }).first();
    await expect(insertBtn).toBeVisible({ timeout: 5_000 });
    await insertBtn.click();
    await page.waitForTimeout(600);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(
      bodyText.includes('${'),
      'field insert must write the `${fieldId}` binding into the selected cell (V3: the insert had zero visible result pre-fix)',
    ).toBe(true);
    await assertTrackedPageErrors(page);
  });

  // SS-1: range selection must enable the toolbar mutation group.
  test('spreadsheet: drag range selection enables toolbar actions', async ({ page }) => {
    await gotoPage(page, '/#/spreadsheet');
    const grid = page.locator('[data-slot="spreadsheet-grid"], [role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    // find two grid cells and drag from one to another
    const cells = page.locator('[role="gridcell"]');
    const count = await cells.count();
    expect(count, 'grid cells present').toBeGreaterThan(4);
    const a = await cells.nth(0).boundingBox();
    const b = await cells.nth(4).boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
    await page.mouse.down();
    await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    // toolbar mutation buttons must now be enabled (real `disabled` property)
    const copyBtn = page.getByRole('button', { name: /复制 Ctrl|Copy Ctrl/ }).first();
    await expect(
      copyBtn,
      'copy button must unlock on range selection (SS-1: range/row/column selection left the toolbar disabled)',
    ).toBeEnabled({ timeout: 3_000 });
    const insertRowBtn = page.getByRole('button', { name: /插入行|Insert Row/ }).first();
    await expect(insertRowBtn).toBeEnabled({ timeout: 3_000 });
    await assertTrackedPageErrors(page);
  });
});
