import { expect, test } from '@playwright/test';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer');
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  // Wait for Vite HMR to settle on first server start
  await page.waitForURL('**/#/flow-designer', { timeout: 5000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
}

test('debug snapshot via React fiber tree', async ({ page }) => {
  await openFlowDesigner(page);

  const collapseButton = page.locator('[data-testid="collapse-palette"]');

  // Check React fiber props before click
  const propsBefore = await page
    .evaluate(() => {
      const expandedEl = document.querySelector('[data-testid="left-panel-expanded"]');
      if (!expandedEl) return { collapsed: true };
      const fiberKey = Object.keys(expandedEl).find((k) => k.startsWith('__reactFiber$'));
      if (!fiberKey) return { noFiber: true };
      const fiber = (expandedEl as any)[fiberKey];
      return {
        ownProps: fiber.memoizedProps,
        parentProps: fiber.return?.memoizedProps,
        grandParentProps: fiber.return?.return?.memoizedProps,
        ggParentProps: fiber.return?.return?.return?.memoizedProps,
      };
    })
    .catch((e: Error) => ({ evaluateError: e.message }));
  console.log(
    'PROPS BEFORE:',
    JSON.stringify(propsBefore, (k, v) => (typeof v === 'function' ? '[Function]' : v), 2),
  );

  await collapseButton.click();
  await page.waitForTimeout(1000);

  const propsAfter = await page
    .evaluate(() => {
      const expandedEl = document.querySelector('[data-testid="left-panel-expanded"]');
      if (!expandedEl) return { collapsed: true };
      const fiberKey = Object.keys(expandedEl).find((k) => k.startsWith('__reactFiber$'));
      if (!fiberKey) return { noFiber: true };
      const fiber = (expandedEl as any)[fiberKey];
      return {
        ownProps: fiber.memoizedProps,
        parentProps: fiber.return?.memoizedProps,
        grandParentProps: fiber.return?.return?.memoizedProps,
      };
    })
    .catch((e: Error) => ({ evaluateError: e.message }));
  console.log(
    'PROPS AFTER:',
    JSON.stringify(propsAfter, (k, v) => (typeof v === 'function' ? '[Function]' : v), 2),
  );
});
