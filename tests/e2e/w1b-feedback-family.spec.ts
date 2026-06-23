import { expect, test } from './fixtures.js';

async function openW1b(page: import('@playwright/test').Page) {
  await page.goto('#/w1b-content', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '容器与反馈组 — separator / spinner / progress / empty / card',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('W1b content & feedback family — flux-renderers-content', () => {
  test('separator renders horizontal labelled divider and a vertical divider', async ({ page }) => {
    await openW1b(page);
    const horizontal = page.locator('[data-testid="demo-separator"]');
    await expect(horizontal).toBeVisible();
    await expect(horizontal.locator('[data-slot="separator-label"]')).toHaveText('Horizontal divider');

    const vertical = page.locator('[data-testid="demo-separator-vertical"]');
    await expect(vertical).toBeVisible();
    expect(await vertical.getAttribute('aria-orientation')).toBe('vertical');
  });

  test('spinner hides when its meta.visible expression flips to false', async ({ page }) => {
    await openW1b(page);
    const spinner = page.locator('[data-testid="demo-spinner"]');
    await expect(spinner).toBeVisible();
    await page.locator('[data-testid="toggle-spinner"]').click();
    await expect(spinner).toHaveCount(0);
  });

  test('progress normalizes a value that exceeds max so it does not overflow', async ({ page }) => {
    await openW1b(page);
    const progress = page.locator('[data-testid="demo-progress"]');
    await expect(progress).toBeVisible();
    // schema value=120, max=100 → clamped to 100 (no overflow)
    expect(await progress.getAttribute('aria-valuenow')).toBe('100');
    expect(await progress.getAttribute('aria-valuemax')).toBe('100');
    await expect(progress.locator('[data-slot="progress-value"]')).toHaveText('100');
    await expect(progress.locator('[data-slot="progress-label"]')).toContainText('Uploading');
  });

  test('empty renders title/description and an actions CTA', async ({ page }) => {
    await openW1b(page);
    const empty = page.locator('[data-testid="demo-empty"]');
    await expect(empty).toBeVisible();
    await expect(empty.locator('[data-slot="empty-title"]')).toHaveText('No results');
    await expect(empty.locator('[data-slot="empty-description"]')).toHaveText('Try a different query.');
    await expect(empty.locator('[data-testid="empty-cta"]')).toBeVisible();
  });

  test('card renders all four regions and fires onClick on card click', async ({ page }) => {
    await openW1b(page);
    const card = page.locator('[data-testid="demo-card"]');
    await expect(card).toBeVisible();
    await expect(card.locator('[data-testid="card-header-text"]')).toBeVisible();
    await expect(card.locator('[data-testid="card-body-text"]')).toBeVisible();
    await expect(card.locator('[data-testid="card-footer-text"]')).toBeVisible();
    await expect(card.locator('[data-testid="card-action"]')).toBeVisible();

    // onClick flag starts pending
    await expect(page.locator('[data-testid="card-click-flag"]')).toHaveText('pending');
    await card.click();
    await expect(page.locator('[data-testid="card-click-flag"]')).toHaveText('clicked');
  });
});
