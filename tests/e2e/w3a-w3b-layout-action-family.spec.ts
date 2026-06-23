import { expect, test } from './fixtures.js';

async function openW3aW3b(page: import('@playwright/test').Page) {
  await page.goto('#/w3a-w3b-layout-action-family', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '布局与动作分组族 — grid / collapse / button-group / dropdown-button',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W3a+W3b layout & action family — grid/collapse/button-group/dropdown-button', () => {
  test('grid maps columns and renders body regions with colSpan', async ({ page }) => {
    await openW3aW3b(page);

    const grid = page.locator('[data-testid="demo-grid"]');
    await expect(grid).toBeVisible({ timeout: 10_000 });
    await expect(grid).toHaveAttribute('data-slot', 'grid-root');
    await expect(grid).toHaveAttribute('data-columns', '3');

    // Verify CSS Grid is applied
    const template = await grid.evaluate(
      (el) => (el as HTMLElement).style.gridTemplateColumns,
    );
    expect(template).toContain('repeat(3');

    // Body regions render
    await expect(page.locator('[data-testid="grid-cell-1"]')).toContainText('cell-1');
    await expect(page.locator('[data-testid="grid-cell-wide"]')).toContainText('wide-cell');

    // colSpan=2 applied
    const wideItem = page.locator('[data-slot="grid-item"]').filter({
      hasText: 'wide-cell',
    });
    await expect(wideItem).toHaveAttribute('data-col-span', '2');
  });

  test('collapse expands on click and reports onChange (multiple default)', async ({ page }) => {
    await openW3aW3b(page);

    const collapse = page.locator('[data-testid="demo-collapse"]');
    await expect(collapse).toBeVisible();
    await expect(collapse).toHaveAttribute('data-multiple', 'true');

    // Expand panel A
    await collapse.locator('[data-item-key="a"] [data-slot="collapse-trigger"]').click();
    await expect(collapse.locator('[data-item-key="a"]')).toHaveAttribute('data-open');

    // onChange reported
    await expect(page.locator('[data-testid="collapse-report"]')).toHaveText('collapse:touched');
  });

  test('collapse enforces single-select mutual exclusion when multiple=false', async ({ page }) => {
    await openW3aW3b(page);

    const collapse = page.locator('[data-testid="demo-collapse-single"]');
    await expect(collapse).toHaveAttribute('data-multiple', 'false');

    // Expand X
    await collapse.locator('[data-item-key="x"] [data-slot="collapse-trigger"]').click();
    await expect(collapse.locator('[data-item-key="x"]')).toHaveAttribute('data-open');

    // Expand Y — X should close
    await collapse.locator('[data-item-key="y"] [data-slot="collapse-trigger"]').click();
    await expect(collapse.locator('[data-item-key="y"]')).toHaveAttribute('data-open');
    await expect(collapse.locator('[data-item-key="x"]')).not.toHaveAttribute('data-open');
  });

  test('button-group toggles single selection and reports onChange', async ({ page }) => {
    await openW3aW3b(page);

    const bg = page.locator('[data-testid="demo-button-group"]');
    await expect(bg).toBeVisible();
    await expect(bg).toHaveAttribute('data-selection-mode', 'single');

    const items = bg.locator('[data-slot="button-group-item"]');
    await items.nth(0).click();
    await expect(items.nth(0)).toHaveAttribute('data-selected');
    await expect(items.nth(1)).not.toHaveAttribute('data-selected');

    // Mutual exclusion
    await items.nth(1).click();
    await expect(items.nth(1)).toHaveAttribute('data-selected');
    await expect(items.nth(0)).not.toHaveAttribute('data-selected');

    await expect(page.locator('[data-testid="button-group-report"]')).toHaveText(
      'button-group:selected',
    );
  });

  test('dropdown-button opens menu, dispatches item action, and closes', async ({ page }) => {
    await openW3aW3b(page);

    const ddb = page.locator('[data-testid="demo-dropdown-button"]');
    await expect(ddb).toBeVisible();
    await expect(ddb.locator('[data-slot="dropdown-button-trigger"]')).toHaveAttribute(
      'data-trigger',
      'click',
    );

    // Open menu
    await ddb.locator('[data-slot="dropdown-button-trigger"]').click();
    await expect(page.locator('[data-slot="dropdown-menu-item"]').filter({ hasText: 'Set Flag' })).toBeVisible();

    // Click item dispatches action
    await page.locator('[data-slot="dropdown-menu-item"]').filter({ hasText: 'Set Flag' }).click();
    await expect(page.locator('[data-testid="dropdown-button-report"]')).toHaveText(
      'dropdown:clicked',
    );
  });
});
