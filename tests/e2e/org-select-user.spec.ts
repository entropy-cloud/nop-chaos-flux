import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

async function openUserSelectLab(page: Page): Promise<void> {
  await page.goto('/#/lab/user-select', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

// base-ui Popover portals the panel to <body>, so the panel and its rows are
// located at page level; the trigger (and chips/value readout) stay in stage.
async function openPanel(page: Page, stage: ReturnType<Page['getByTestId']>): Promise<void> {
  await stage.locator('[data-slot="org-select-trigger"]').click();
  await expect(page.locator('[data-slot="org-select-panel"]')).toBeVisible();
}

function panelRow(page: Page, id: string) {
  return page.locator(`[data-slot="org-select-panel"] [data-slot="org-select-node"][data-node-id="${id}"]`);
}

test.describe('org select — user-select (missing-components L2.1)', () => {
  test('lazy-loads org departments and selects a user through navigation', async ({ page }) => {
    await openUserSelectLab(page);

    const stage = page.getByTestId('scenario-stage-org-tree-search-multi-select');
    await openPanel(page, stage);

    // Root departments arrive from the mocked sourceChildren root call.
    const engRow = panelRow(page, 'dept-eng');
    await expect(engRow).toBeVisible();
    // user-select default selectableTypes=['user']: department row is navigable-only (no checkbox).
    await expect(engRow.locator('[data-slot="org-select-node-check"]')).toHaveCount(0);

    // Expand → children users load lazily.
    await engRow.locator('[data-slot="org-select-expand"]').click();
    const alice = panelRow(page, 'u-alice');
    await expect(alice).toBeVisible();
    await expect(alice).toHaveAttribute('data-node-type', 'user');
    // 'u-alice' is preselected in the schema — its checkbox reflects the echo.
    await expect(alice.locator('[data-slot="org-select-node-check"]')).toHaveAttribute('aria-checked', 'true');

    // Disabled user renders a locked checkbox (same Engineering level).
    const bob = panelRow(page, 'u-bob');
    await expect(bob).toHaveAttribute('data-disabled', 'true');
    await expect(bob.locator('[data-slot="org-select-node-check"]')).toHaveAttribute('data-disabled', '');

    // Check a fresh user (Platform team) → a new chip appears on the trigger.
    await panelRow(page, 'dept-platform').locator('[data-slot="org-select-expand"]').click();
    const carol = panelRow(page, 'u-carol');
    await expect(carol).toBeVisible();
    await carol.locator('[data-slot="org-select-node-check"]').click();
    await expect(stage.locator('[data-slot="org-select-chip"][data-value="u-carol"]')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('echo-resolves a preselected id and search returns flat remote results', async ({ page }) => {
    await openUserSelectLab(page);

    const stage = page.getByTestId('scenario-stage-org-tree-search-multi-select');
    // Preselected value 'u-alice' resolves through sourceResolve into a label.
    await expect(stage.locator('[data-slot="org-select-chip"][data-value="u-alice"]')).toHaveText(/Alice/, {
      timeout: 15_000,
    });

    await openPanel(page, stage);
    const search = page.locator('[data-slot="org-select-panel"] [data-slot="org-select-search"]');
    await search.fill('ali');

    // Remote search results replace the tree view (flat rows, no breadcrumb).
    const result = panelRow(page, 'u-carol');
    await expect(result).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-slot="org-select-panel"] [data-slot="org-select-breadcrumb"]')).toHaveCount(0);

    await assertTrackedPageErrors(page);
  });

  test('children source failure surfaces an inline error with a retry action', async ({ page }) => {
    await openUserSelectLab(page);

    const stage = page.getByTestId('scenario-stage-children-source-failure-with-retry');
    await openPanel(page, stage);

    const error = page.locator('[data-slot="org-select-panel"] [data-slot="org-select-error"]');
    await expect(error).toBeVisible({ timeout: 10_000 });
    await expect(error).toContainText(/子节点加载失败|Failed to load child departments/);
    await expect(page.locator('[data-slot="org-select-panel"] [data-slot="org-select-retry"]')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('paged root continues via load-more and terminates after the last page (§5)', async ({ page }) => {
    await openUserSelectLab(page);

    const stage = page.getByTestId('scenario-stage-paged-root-continuation');
    await openPanel(page, stage);

    // Page 1 carries two of the three root departments; the continuation
    // button is offered because the mock page declares hasMore.
    await expect(panelRow(page, 'dept-eng')).toBeVisible();
    await expect(panelRow(page, 'dept-hr')).toHaveCount(0);
    const loadMore = page.locator('[data-slot="org-select-panel"] [data-slot="org-select-load-more"]');
    await expect(loadMore).toBeVisible({ timeout: 10_000 });

    // Continuation merges the remaining page; the button disappears once the
    // termination signal (hasMore:false) lands.
    await loadMore.click();
    await expect(panelRow(page, 'dept-hr')).toBeVisible({ timeout: 10_000 });
    await expect(loadMore).toHaveCount(0);

    await assertTrackedPageErrors(page);
  });
});
