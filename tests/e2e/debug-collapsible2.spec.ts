import { expect, test } from '@playwright/test';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer', { waitUntil: 'commit' });
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('debug core state via React fiber', async ({ page }) => {
  await openFlowDesigner(page);

  // Expose the React internals to check the snapshot value
  const stateBefore = await page.evaluate(() => {
    // Try to read from React's internal state
    const expandedEl = document.querySelector('[data-testid="left-panel-expanded"]');
    if (!expandedEl) return { error: 'no expanded element' };

    // Try to get React fiber
    const fiberKey = Object.keys(expandedEl).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
    );
    return { fiberKey };
  });
  console.log('FIBER:', stateBefore);

  // Click the collapse button
  const collapseButton = page.locator('[data-testid="collapse-palette"]');

  await collapseButton.click();
  await page.waitForTimeout(500);

  const mutations = await page.evaluate(() => {
    return {
      hasExpanded: !!document.querySelector('[data-testid="left-panel-expanded"]'),
      hasCollapsed: !!document.querySelector('[data-testid="left-panel-collapsed"]'),
      allTestIds: Array.from(document.querySelectorAll('[data-testid]')).map((el) =>
        el.getAttribute('data-testid'),
      ),
    };
  });
  console.log('MUTATIONS:', JSON.stringify(mutations, null, 2));

  expect(mutations.hasCollapsed).toBe(true);
});
