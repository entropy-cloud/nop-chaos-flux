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
  await page.getByRole('button', { name: 'Flow Designer' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
}

test('debug snapshot via React fiber tree', async ({ page }) => {
  await openFlowDesigner(page);

  const collapseButton = page.locator('[data-testid="collapse-palette"]');
  
  // Check React fiber props before click
  const propsBefore = await page.evaluate(() => {
    const expandedEl = document.querySelector('[data-testid="left-panel-expanded"]');
    if (!expandedEl) return null;
    const fiberKey = Object.keys(expandedEl).find(k => k.startsWith('__reactFiber$'));
    if (!fiberKey) return null;
    const fiber = (expandedEl as any)[fiberKey];
    return {
      ownProps: fiber.memoizedProps,
      parentProps: fiber.return?.memoizedProps,
      grandParentProps: fiber.return?.return?.memoizedProps,
      ggParentProps: fiber.return?.return?.return?.memoizedProps,
    };
  });
  console.log('PROPS BEFORE:', JSON.stringify(propsBefore, (k, v) => typeof v === 'function' ? '[Function]' : v, 2));
  
  await collapseButton.click();
  await page.waitForTimeout(1000);

  const propsAfter = await page.evaluate(() => {
    const expandedEl = document.querySelector('[data-testid="left-panel-expanded"]');
    if (!expandedEl) return { collapsed: true };
    const fiberKey = Object.keys(expandedEl).find(k => k.startsWith('__reactFiber$'));
    if (!fiberKey) return null;
    const fiber = (expandedEl as any)[fiberKey];
    return {
      ownProps: fiber.memoizedProps,
      parentProps: fiber.return?.memoizedProps,
      grandParentProps: fiber.return?.return?.memoizedProps,
    };
  });
  console.log('PROPS AFTER:', JSON.stringify(propsAfter, (k, v) => typeof v === 'function' ? '[Function]' : v, 2));
});
