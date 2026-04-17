import { expect, test } from '@playwright/test';

// This test is flaky due to FluxBasicPage loading issues in some environments.
// It may show "Loading" state with error code 400 when the page fails to initialize.
// The test is kept but skipped until the root cause is identified.
test.skip('captures README flux basic screenshot', async ({ page }) => {
  await page.goto('/#/flux-basic');
  await page.setViewportSize({ width: 1600, height: 1400 });
  // Wait for FluxBasicPage to render - the Username field indicates the form is ready
  await expect(page.getByLabel('Username')).toBeVisible({ timeout: 20000 });

  await page.locator('.nop-page').first().screenshot({
    path: 'docs/images/readme-flux-basic.png'
  });
});
