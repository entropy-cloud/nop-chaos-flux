import { expect, test } from './fixtures.js';

async function openM3Layout(page: import('@playwright/test').Page) {
  await page.goto('#/m3-layout', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: /M3a 移动端页面骨架模式/,
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('M3 layout — mobile viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Tabbar footer region renders and navigate button fires toast (≠ tabs content switch)', async ({
    page,
  }) => {
    await openM3Layout(page);

    const tabbarRoot = page.locator('[data-testid="m3-tabbar-root"]');
    await expect(tabbarRoot).toBeVisible({ timeout: 10_000 });

    const footer = tabbarRoot.locator('[data-slot="page-footer"]');
    await expect(footer).toBeVisible({ timeout: 5_000 });
    await expect(footer.evaluate((el) => el.className)).resolves.toContain('nop-tabbar');

    const homeButton = page.getByTestId('m3-tabbar-home');
    await expect(homeButton).toBeVisible({ timeout: 5_000 });

    await homeButton.click();
    await expect(page.getByText(/navigate → \/home/)).toBeVisible({ timeout: 5_000 });
  });

  test('NavBar header region renders back button + title + right action', async ({ page }) => {
    await openM3Layout(page);

    const navbarRoot = page.locator('[data-testid="m3-navbar-root"]');
    await expect(navbarRoot).toBeVisible({ timeout: 10_000 });

    const toolbar = navbarRoot.locator('[data-slot="page-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 5_000 });

    const backButton = page.getByTestId('m3-navbar-back');
    await expect(backButton).toBeVisible({ timeout: 5_000 });

    await backButton.click();
    await expect(page.getByText(/navigate → -1/i)).toBeVisible({ timeout: 5_000 });
  });

  test('ActionBar footer region renders icon group + CTA buttons', async ({ page }) => {
    await openM3Layout(page);

    const actionBarRoot = page.locator('[data-testid="m3-actionbar-root"]');
    await expect(actionBarRoot).toBeVisible({ timeout: 10_000 });

    const footer = actionBarRoot.locator('[data-slot="page-footer"]');
    await expect(footer).toBeVisible({ timeout: 5_000 });

    await expect(page.getByTestId('m3-actionbar-cart')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('m3-actionbar-buy')).toBeVisible({ timeout: 5_000 });
    await expect(actionBarRoot.locator('text=客服')).toBeVisible();
    await expect(actionBarRoot.locator('text=收藏')).toBeVisible();
  });

  test('SubmitBar footer region renders checkbox + price + submit CTA', async ({ page }) => {
    await openM3Layout(page);

    const submitBarRoot = page.locator('[data-testid="m3-submitbar-root"]');
    await expect(submitBarRoot).toBeVisible({ timeout: 10_000 });

    const footer = submitBarRoot.locator('[data-slot="page-footer"]');
    await expect(footer).toBeVisible({ timeout: 5_000 });

    await expect(submitBarRoot.getByText('合计：')).toBeVisible();
    await expect(submitBarRoot.getByText('¥199.00')).toBeVisible();
    await expect(page.getByTestId('m3-submitbar-submit')).toBeVisible({ timeout: 5_000 });
  });

  test('Sticky container renders with sticky top-0 marker', async ({ page }) => {
    await openM3Layout(page);

    const stickyRoot = page.locator('[data-testid="m3-sticky-root"]');
    await expect(stickyRoot).toBeVisible({ timeout: 10_000 });

    const stickyContainer = stickyRoot.locator('.nop-sticky').first();
    await expect(stickyContainer).toBeVisible({ timeout: 5_000 });
    const className = await stickyContainer.getAttribute('class');
    expect(className ?? '').toContain('sticky');
    expect(className ?? '').toContain('top-0');
  });

  test('fixed footer gets VisualViewport bottom style when keyboard opens', async ({ page }) => {
    await openM3Layout(page);

    const tabbarRoot = page.locator('[data-testid="m3-tabbar-root"]');
    const footer = tabbarRoot.locator('[data-slot="page-footer"]').first();
    await expect(footer).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => {
      const vv = window.visualViewport;
      if (!vv) return;
      Object.defineProperty(vv, 'height', {
        configurable: true,
        value: window.innerHeight - 300,
      });
      vv.dispatchEvent(new Event('resize'));
    });

    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="m3-tabbar-root"] [data-slot="page-footer"]');
      if (!el) return false;
      const offset = el.getAttribute('data-keyboard-offset');
      return offset !== null && Number(offset) > 0;
    }, { timeout: 5_000 });
  });
});

test.describe('M3 layout — desktop viewport (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('5 skeleton sections render without mobile-only artifacts', async ({ page }) => {
    await openM3Layout(page);

    for (const id of ['m3-tabbar', 'm3-navbar', 'm3-actionbar', 'm3-submitbar', 'm3-sticky']) {
      await expect(page.locator(`[data-testid="${id}-root"]`)).toBeVisible({ timeout: 10_000 });
    }
  });
});
