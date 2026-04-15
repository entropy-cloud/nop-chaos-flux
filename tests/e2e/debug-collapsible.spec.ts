import { expect, test } from '@playwright/test';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInButton.click();
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('nop');
      await page.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }
  await expect(signInButton).toHaveCount(0, { timeout: 10000 });
  await page.locator('button', { hasText: 'Visual Workflow' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('debug collapsible state', async ({ page }) => {
  await openFlowDesigner(page);

  // Check what the collapse button click does
  const collapseButton = page.locator('[data-testid="collapse-palette"]');
  await expect(collapseButton).toBeVisible();

  // Check React state before click
  const stateBefore = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="left-panel-expanded"]');
    return {
      hasExpanded: !!el,
      text: el?.textContent?.slice(0, 50),
    };
  });
  console.log('BEFORE:', stateBefore);

  await collapseButton.click();
  await page.waitForTimeout(2000);

  const stateAfter = await page.evaluate(() => {
    const expanded = document.querySelector('[data-testid="left-panel-expanded"]');
    const collapsed = document.querySelector('[data-testid="left-panel-collapsed"]');
    return {
      hasExpanded: !!expanded,
      hasCollapsed: !!collapsed,
      expandedText: expanded?.textContent?.slice(0, 50),
      collapsedText: collapsed?.textContent?.slice(0, 50),
    };
  });
  console.log('AFTER:', stateAfter);

  // Check if React re-rendered at all
  const allTestIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'));
  });
  console.log('ALL TESTIDS:', allTestIds);
});
