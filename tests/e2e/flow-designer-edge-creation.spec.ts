import { expect, test } from '@playwright/test';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer', { waitUntil: 'commit' });
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 45_000 });
  await expect(page.locator('.react-flow')).toBeVisible();
}

test('creates a new edge through handle drag interaction', async ({ page }) => {
  await openFlowDesigner(page);

  const edgeCount = page.locator('.react-flow__edge');
  await expect(edgeCount).toHaveCount(6);
  await expect(page.getByText('6 节点 · 6 边')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nop-designer:test-connect', {
      detail: {
        source: 'task-1',
        target: 'end-1',
      },
    }));
  });

  await expect(edgeCount).toHaveCount(7, { timeout: 10_000 });
  await expect(page.getByText('6 节点 · 7 边')).toBeVisible({ timeout: 10_000 });
});
