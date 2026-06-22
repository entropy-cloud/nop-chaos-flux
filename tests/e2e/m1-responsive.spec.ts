import { expect, test } from './fixtures.js';

async function openM1Responsive(page: import('@playwright/test').Page) {
  await page.goto('#/m1-responsive', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: /M1 高频交互控件响应式/,
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('M1 responsive — mobile viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('select opens bottom-sheet (data-side="bottom")', async ({ page }) => {
    await openM1Responsive(page);

    const selectTrigger = page.locator('[data-slot="select-mobile-trigger"]').first();
    await expect(selectTrigger).toBeVisible({ timeout: 10_000 });
    await selectTrigger.click();

    const sheetContent = page.locator('[data-slot="sheet-content"][data-side="bottom"]');
    await expect(sheetContent).toBeVisible({ timeout: 5_000 });
  });

  test('dialog auto-fullscreen (data-mobile-fullscreen marker)', async ({ page }) => {
    await openM1Responsive(page);

    await page.getByRole('button', { name: 'Open Dialog' }).click();
    const dialogSurface = page.locator(
      '[data-slot="dialog-surface"][data-mobile-fullscreen="true"]',
    );
    await expect(dialogSurface).toBeVisible({ timeout: 5_000 });

    const style = await dialogSurface.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return { width: computed.width, height: computed.height };
    });
    expect(style.width).toMatch(/^\d+px$/);
    expect(style.height).toMatch(/^\d+px$/);
  });

  test('drawer overrides side to bottom (data-mobile-side-overridden)', async ({ page }) => {
    await openM1Responsive(page);

    await page.getByRole('button', { name: 'Open Drawer' }).click();
    const drawerSurface = page.locator(
      '[data-slot="drawer-surface"][data-mobile-side-overridden="true"]',
    );
    await expect(drawerSurface).toBeVisible({ timeout: 5_000 });
  });

  test('table activates responsive expand mode', async ({ page }) => {
    await openM1Responsive(page);

    const table = page.locator('.nop-table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });
    await expect(table.getAttribute('data-responsive-expand')).resolves.toBe('true');
  });

  test('tabs list has overflow-x-auto and swipe wrapper', async ({ page }) => {
    await openM1Responsive(page);

    const tabsList = page.locator('[data-slot="tabs-list"]').first();
    await expect(tabsList).toBeVisible({ timeout: 10_000 });
    const className = await tabsList.getAttribute('class');
    expect(className ?? '').toContain('overflow-x-auto');

    const swipeWrapper = page.locator('[data-slot="tabs-panels-swipe"]').first();
    await expect(swipeWrapper).toBeVisible();
  });

  test('tree-select mobile trigger renders and opens sheet', async ({ page }) => {
    await openM1Responsive(page);

    const treeSelectTrigger = page.locator('[data-slot="tree-select-mobile-trigger"]').first();
    await expect(treeSelectTrigger).toBeVisible({ timeout: 10_000 });
    await treeSelectTrigger.click();
    await expect(
      page.locator('[data-testid="tree-select-mobile-sheet"]'),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('M1 responsive — desktop viewport (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('select keeps Combobox (no mobile trigger)', async ({ page }) => {
    await openM1Responsive(page);

    const mobileTrigger = page.locator('[data-slot="select-mobile-trigger"]');
    await expect(mobileTrigger).toHaveCount(0);
  });

  test('dialog keeps schema size (no mobile-fullscreen marker)', async ({ page }) => {
    await openM1Responsive(page);

    await page.getByRole('button', { name: 'Open Dialog' }).click();
    const fullscreenDialog = page.locator('[data-mobile-fullscreen="true"]');
    await expect(fullscreenDialog).toHaveCount(0);
  });

  test('drawer keeps schema side right (no override marker)', async ({ page }) => {
    await openM1Responsive(page);

    await page.getByRole('button', { name: 'Open Drawer' }).click();
    const overridden = page.locator('[data-mobile-side-overridden="true"]');
    await expect(overridden).toHaveCount(0);
  });

  test('table does not activate responsive expand', async ({ page }) => {
    await openM1Responsive(page);

    const table = page.locator('.nop-table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });
    await expect(table.getAttribute('data-responsive-expand')).resolves.toBeNull();
  });

  test('tabs do not get scroll/swipe injection', async ({ page }) => {
    await openM1Responsive(page);

    const swipeWrapper = page.locator('[data-slot="tabs-panels-swipe"]');
    await expect(swipeWrapper).toHaveCount(0);
  });
});

test.describe('M1 responsive — viewport resize switch', () => {
  test('resize from mobile to desktop flips select branch', async ({ page }) => {
    await page.goto('#/m1-responsive', { waitUntil: 'commit' });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-slot="select-mobile-trigger"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('[data-slot="select-mobile-trigger"]')).toHaveCount(0);
  });

  test('resize from desktop to mobile flips select branch', async ({ page }) => {
    await page.goto('#/m1-responsive', { waitUntil: 'commit' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('[data-slot="select-mobile-trigger"]')).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-slot="select-mobile-trigger"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
