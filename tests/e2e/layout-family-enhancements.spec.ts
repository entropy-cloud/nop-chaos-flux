import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openLayoutFamilyPage(page: import('@playwright/test').Page) {
  await page.goto('/#/layout-family-enhancements', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'flex / page / tabs 布局族能力补齐',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('E3 layout family enhancements (flex enums + page aside + tabs badge/icon/mountOnEnter)', () => {
  test('flex row-reverse applies flex-row-reverse class to root', async ({ page }) => {
    await openLayoutFamilyPage(page);

    const el = page.getByTestId('lf-flex-reverse-a').locator('..');
    await expect(el).toBeVisible({ timeout: 10_000 });
    const flexRoot = page.locator('.nop-flex').filter({
      has: page.getByTestId('lf-flex-reverse-a'),
    });
    const className = await flexRoot.evaluate((node) => node.className);
    expect(className).toContain('flex-row-reverse');

    await assertTrackedPageErrors(page);
  });

  test('flex justify=evenly applies justify-evenly class', async ({ page }) => {
    await openLayoutFamilyPage(page);

    const flexRoot = page.locator('.nop-flex').filter({
      has: page.getByTestId('lf-flex-evenly-1'),
    });
    const className = await flexRoot.evaluate((node) => node.className);
    expect(className).toContain('justify-evenly');

    await assertTrackedPageErrors(page);
  });

  test('flex align=baseline applies items-baseline class', async ({ page }) => {
    await openLayoutFamilyPage(page);

    const flexRoot = page.locator('.nop-flex').filter({
      has: page.getByTestId('lf-flex-baseline-title'),
    });
    const className = await flexRoot.evaluate((node) => node.className);
    expect(className).toContain('items-baseline');

    await assertTrackedPageErrors(page);
  });

  test('flex alignContent=center applies content-center class', async ({ page }) => {
    await openLayoutFamilyPage(page);

    const flexRoot = page.locator('.nop-flex').filter({
      has: page.getByTestId('lf-flex-content-1'),
    });
    const className = await flexRoot.evaluate((node) => node.className);
    expect(className).toContain('content-center');

    await assertTrackedPageErrors(page);
  });

  test('page renders data-slot="page-aside" beside body when aside region is configured', async ({
    page,
  }) => {
    await openLayoutFamilyPage(page);

    const body = page.getByTestId('lf-page-body');
    await expect(body).toBeVisible({ timeout: 10_000 });

    const pageRoot = body.locator('xpath=ancestor::section[contains(@class,"nop-page")]');
    const aside = pageRoot.locator('[data-slot="page-aside"]');
    await expect(aside).toBeVisible();
    expect(await aside.textContent()).toContain('侧边栏');

    const subtitle = pageRoot.locator('[data-slot="page-subtitle"]');
    await expect(subtitle).toBeVisible();
    expect(await subtitle.textContent()).toContain('子标题');

    const remark = pageRoot.locator('[data-slot="page-remark"]');
    await expect(remark).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('page renders aside after body when asidePosition=right', async ({ page }) => {
    await openLayoutFamilyPage(page);

    const body = page.getByTestId('lf-page-body-right');
    await expect(body).toBeVisible({ timeout: 10_000 });
    const pageRoot = body.locator('xpath=ancestor::section[contains(@class,"nop-page")]');
    const aside = pageRoot.locator('[data-slot="page-aside"]');
    await expect(aside).toBeVisible();

    const order = await pageRoot.evaluate((node) => {
      const body = node.querySelector('[data-slot="page-body"]');
      const aside = node.querySelector('[data-slot="page-aside"]');
      if (!body || !aside) return 'missing';
      const all = Array.from(node.children);
      const bi = all.indexOf(body);
      const ai = all.indexOf(aside);
      return bi < ai ? 'body-before-aside' : 'aside-before-body';
    });
    expect(order).toBe('body-before-aside');

    await assertTrackedPageErrors(page);
  });

  test('tabs per-tab badge and icon render inside tab triggers', async ({ page }) => {
    await openLayoutFamilyPage(page);

    const overviewBody = page.getByTestId('lf-tabs-overview-body');
    await expect(overviewBody).toBeVisible({ timeout: 10_000 });

    const badge = page.locator('[data-slot="tab-badge"]').first();
    await expect(badge).toBeVisible();
    expect(await badge.textContent()).toContain('5');

    const icon = page.locator('[data-slot="tab-icon"]').first();
    await expect(icon).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('tabs mountOnEnter keeps inactive tab content out of DOM until first activation', async ({
    page,
  }) => {
    await openLayoutFamilyPage(page);

    await expect(page.getByTestId('lf-tabs-overview-body')).toBeVisible({ timeout: 10_000 });
    expect(await page.getByTestId('lf-tabs-settings-body').count()).toBe(0);

    await page.getByRole('tab', { name: '设置' }).click();
    await expect(page.getByTestId('lf-tabs-settings-body')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('tabs unmountOnExit unmounts content when switched away', async ({ page }) => {
    await openLayoutFamilyPage(page);

    await page.getByRole('tab', { name: '日志' }).click();
    await expect(page.getByTestId('lf-tabs-logs-body')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: '概览' }).click();
    await expect(page.getByTestId('lf-tabs-overview-body')).toBeVisible();
    expect(await page.getByTestId('lf-tabs-logs-body').count()).toBe(0);

    await assertTrackedPageErrors(page);
  });
});
