import { expect, test } from '@playwright/test';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer');
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
    const fiberKey = Object.keys(expandedEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    return { fiberKey };
  });
  console.log('FIBER:', stateBefore);

  // Click the collapse button
  const collapseButton = page.locator('[data-testid="collapse-palette"]');
  
  // Listen for React re-renders by monitoring DOM mutations
  const mutationPromise = page.evaluate(() => {
    return new Promise<{ mutations: string[] }>((resolve) => {
      const mutations: string[] = [];
      const observer = new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
          const target = mutation.target as HTMLElement;
          const testId = target.getAttribute?.('data-testid') || target.parentElement?.getAttribute?.('data-testid') || '';
          mutations.push(`${mutation.type}: ${testId} ${mutation.addedNodes.length}/${mutation.removedNodes.length}`);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      setTimeout(() => {
        observer.disconnect();
        resolve({ mutations });
      }, 3000);
    });
  });
  
  await collapseButton.click();
  const mutations = await mutationPromise;
  console.log('MUTATIONS:', JSON.stringify(mutations, null, 2));
});
