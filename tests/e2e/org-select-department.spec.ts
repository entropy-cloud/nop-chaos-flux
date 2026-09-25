import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

async function openDepartmentSelectLab(page: Page): Promise<void> {
  await page.goto('/#/lab/department-select', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

// base-ui Popover portals the panel to <body>: panel-level rows are located
// at page level; the trigger and live summary text stay in stage.
function panelRow(page: Page, id: string) {
  return page.locator(`[data-slot="org-select-panel"] [data-slot="org-select-node"][data-node-id="${id}"]`);
}

test.describe('org select — department-select (missing-components L2.1)', () => {
  test('lazy tree multi-select commits checked department ids with empty-page termination', async ({ page }) => {
    await openDepartmentSelectLab(page);

    const stage = page.getByTestId('scenario-stage-lazy-tree-multi-select');
    await stage.locator('[data-slot="org-select-trigger"]').click();
    const panel = page.locator('[data-slot="org-select-panel"]');
    await expect(panel).toBeVisible();

    // department-select default selectableTypes=['department']: department rows are checkable AND navigable.
    const hq = panelRow(page, 'hq');
    await expect(hq).toBeVisible();
    await hq.locator('[data-slot="org-select-node-check"]').click();
    const rd = panelRow(page, 'rd');
    await rd.locator('[data-slot="org-select-node-check"]').click();

    // Chips reflect the committed array on the trigger.
    await expect(stage.locator('[data-slot="org-select-chip"][data-value="hq"]')).toBeVisible();
    await expect(stage.locator('[data-slot="org-select-chip"][data-value="rd"]')).toBeVisible();

    // Drill into HQ → both children load; Finance Dept is an empty branch → 「No data」.
    await hq.locator('[data-slot="org-select-expand"]').click();
    const finance = panelRow(page, 'hq-finance');
    await expect(finance).toBeVisible();
    await finance.locator('[data-slot="org-select-expand"]').click();
    // Navigation entered the empty branch: breadcrumb shows it, list shows the
    // empty state (empty-page cache is pinned at the unit level — no re-fetch).
    await expect(panel.locator('[data-slot="org-select-breadcrumb"]')).toContainText('Finance Dept');
    await expect(panel.locator('[data-slot="org-select-empty"]')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('search + echo single select resolves the preselected department label', async ({ page }) => {
    await openDepartmentSelectLab(page);

    const stage = page.getByTestId('scenario-stage-search-echo-single-select');
    // Preselected 'rd-frontend' resolves through sourceResolve into a label.
    await expect(stage.locator('[data-slot="org-select-value"]')).toHaveText(/Frontend Team/, {
      timeout: 15_000,
    });

    await stage.locator('[data-slot="org-select-trigger"]').click();
    const panel = page.locator('[data-slot="org-select-panel"]');
    await expect(panel).toBeVisible();

    const search = panel.locator('[data-slot="org-select-search"]');
    await search.fill('hr');
    const result = panelRow(page, 'hq-hr');
    await expect(result).toBeVisible({ timeout: 10_000 });

    // Single select: clicking a department commits and closes the panel.
    await result.locator('[data-slot="org-select-node-name"]').click();
    await expect(stage.locator('[data-slot="org-select-value"]')).toHaveText('HR Dept');

    await assertTrackedPageErrors(page);
  });
});
