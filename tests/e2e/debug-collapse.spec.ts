import { test, expect } from '@playwright/test';

test('debug collapse', async ({ page }) => {
  await page.goto('/#/gantt', { waitUntil: 'load' });
  await expect(page.getByRole('heading', { name: /Gantt Chart Demo/i })).toBeVisible({ timeout: 25_000 });

  const initialCount = await page.locator('[data-slot="gantt-grid-row"]').count();
  console.log('initial row count:', initialCount);

  // Check all expanded buttons
  const expandedButtons = page.locator('[aria-expanded="true"]');
  const count = await expandedButtons.count();
  console.log('expanded buttons count:', count);
  for (let i = 0; i < count; i++) {
    const label = await expandedButtons.nth(i).getAttribute('aria-label');
    console.log('  button', i, ':', label);
  }

  // Click the first one
  const firstToggle = expandedButtons.first();
  const firstLabel = await firstToggle.getAttribute('aria-label');
  console.log('clicking:', firstLabel);
  await firstToggle.click();
  await page.waitForTimeout(1000);

  // Check if aria-expanded changed
  const afterExpanded = await firstToggle.getAttribute('aria-expanded');
  console.log('after click aria-expanded:', afterExpanded);
  
  // Check if the element is still in DOM
  const isDetached = await firstToggle.evaluate(el => !document.contains(el));
  console.log('element detached:', isDetached);
  
  const afterRowCount = await page.locator('[data-slot="gantt-grid-row"]').count();
  console.log('after row count:', afterRowCount);
  
  // Try clicking the toggle button by action role
  const toggles = page.locator('[data-slot="gantt-grid-row"] button[aria-expanded="true"]');
  const tc = await toggles.count();
  console.log('toggle buttons in grid:', tc);
});
