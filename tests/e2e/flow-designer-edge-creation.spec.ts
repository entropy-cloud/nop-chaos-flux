import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer', { waitUntil: 'commit' });
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 45_000 });
  await expect(page.locator('.react-flow')).toBeVisible();
  await assertTrackedPageErrors(page);
}

test('synthetic connect event updates the live edge count', async ({ page }) => {
  await openFlowDesigner(page);

  const edgeCount = page.locator('.react-flow__edge');
  await expect(edgeCount).toHaveCount(6);
  await expect(page.getByText('6 个节点')).toBeVisible();
  await expect(page.getByText('6 条连线')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('nop-designer:test-connect', {
        detail: {
          source: 'task-1',
          target: 'end-1',
        },
      }),
    );
  });

  await expect(edgeCount).toHaveCount(7, { timeout: 10_000 });
  await expect(page.getByText('6 个节点')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('7 条连线')).toBeVisible({ timeout: 10_000 });
});

test('dragging from a real source handle to a real target handle creates a visible edge', async ({ page }) => {
  await openFlowDesigner(page);

  const edgeCount = page.locator('.react-flow__edge');
  await expect(edgeCount).toHaveCount(6);

  const sourceHandle = page.getByTestId('designer-handle-source-out').first();
  const targetHandle = page.getByTestId('designer-handle-target-in').last();
  await expect(sourceHandle).toBeVisible();
  await expect(targetHandle).toBeVisible();

  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetHandle.boundingBox();
  expect(sourceBox).toBeTruthy();
  expect(targetBox).toBeTruthy();

  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + targetBox!.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect(edgeCount).toHaveCount(7, { timeout: 10_000 });
  await expect(page.getByText('7 条连线')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.react-flow__edge').last()).toBeVisible();
});
