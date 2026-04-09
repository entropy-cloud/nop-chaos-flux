import { expect, test } from '@playwright/test';

test('captures README flux basic screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible();

  await page.setViewportSize({ width: 1600, height: 1400 });
  await page.getByRole('button', { name: 'Flux Basic' }).click({ force: true });
  await expect(page.locator('main h1', { hasText: 'Renderer Playground' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Username')).toBeVisible();

  await page.locator('.nop-page').first().screenshot({
    path: 'docs/images/readme-flux-basic.png'
  });
});
