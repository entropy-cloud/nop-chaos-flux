import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openSummaryDemo(page: import('@playwright/test').Page) {
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

  await page.getByRole('tab', { name: '节点/边摘要' }).click();

  await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await assertTrackedPageErrors(page);
}

test.describe('designer-node-card / designer-edge-row renderers', () => {
  test('renders node-card and edge-row markers in the inspector summary panel', async ({ page }) => {
    await openSummaryDemo(page);

    const inspector = page.locator('[data-testid="right-panel-expanded"]').first();
    await expect(inspector).toBeVisible({ timeout: 10000 });

    await expect(inspector.locator('.nop-designer-node-card')).toHaveCount(4, { timeout: 10000 });
    await expect(inspector.locator('.nop-designer-edge-row')).toHaveCount(3, { timeout: 10000 });

    const taskCard = inspector.locator('[data-testid="summary-node-task"]');
    await expect(taskCard).toHaveAttribute('data-node-id', 'task-1');
    await expect(taskCard).toHaveAttribute('data-node-type', 'task');
    await expect(taskCard).toContainText('Task Node');

    const edgeRow = inspector.locator('[data-testid="summary-edge-1"]');
    await expect(edgeRow).toHaveAttribute('data-edge-id', 'edge-start-task');
    await expect(edgeRow).toContainText('Start Node');
    await expect(edgeRow).toContainText('Task Node');

    await expect(inspector.locator('[data-testid="summary-node-missing"]')).toHaveAttribute(
      'data-empty',
      'true',
    );
    await expect(inspector.locator('[data-testid="summary-edge-missing"]')).toHaveAttribute(
      'data-empty',
      'true',
    );
  });

  test('dispatches selectNode command when a node-card is clicked', async ({ page }) => {
    await openSummaryDemo(page);

    const inspector = page.locator('[data-testid="right-panel-expanded"]').first();
    const taskCard = inspector.locator('[data-testid="summary-node-task"]');
    await expect(taskCard).toBeVisible({ timeout: 10000 });

    await taskCard.click();
    await expect(taskCard).toHaveAttribute('data-active', 'true', { timeout: 5000 });
    await expect(taskCard).toHaveAttribute('data-selected', 'true', { timeout: 5000 });

    const startCard = inspector.locator('[data-testid="summary-node-start"]');
    await startCard.click();
    await expect(startCard).toHaveAttribute('data-active', 'true', { timeout: 5000 });
    await expect(taskCard).not.toHaveAttribute('data-active', 'true', { timeout: 5000 });
  });

  test('dispatches selectEdge command when an edge-row is clicked', async ({ page }) => {
    await openSummaryDemo(page);

    const inspector = page.locator('[data-testid="right-panel-expanded"]').first();
    const edgeRow = inspector.locator('[data-testid="summary-edge-2"]');
    await expect(edgeRow).toBeVisible({ timeout: 10000 });

    await edgeRow.click();
    await expect(edgeRow).toHaveAttribute('data-active', 'true', { timeout: 5000 });
    await expect(edgeRow).toHaveAttribute('data-selected', 'true', { timeout: 5000 });

    const otherEdge = inspector.locator('[data-testid="summary-edge-1"]');
    await expect(otherEdge).not.toHaveAttribute('data-active', 'true', { timeout: 5000 });
  });
});
