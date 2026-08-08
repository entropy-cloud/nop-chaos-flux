import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer', { waitUntil: 'commit' });
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 45_000 });
  await expect(page.locator('.react-flow')).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function focusNode(page: import('@playwright/test').Page, testId: string) {
  const node = page.locator(`[data-testid="${testId}"]`).first();
  await expect(node).toBeVisible();
  await node.click();
  await page.locator('.fd-xyflow-surface').focus();
  await page.waitForTimeout(150);
  return node;
}

test('keyboard Delete removes the active node and Ctrl+Z / Ctrl+Y restore then re-delete it', async ({
  page,
}) => {
  await openFlowDesigner(page);

  const nodeCount = page.locator('.react-flow__node');
  const edgeCount = page.locator('.react-flow__edge');
  await expect(nodeCount).toHaveCount(6);
  await expect(page.getByText('6 个节点')).toBeVisible();
  await expect(page.getByText('6 条连线')).toBeVisible();

  await focusNode(page, 'rf__node-task-1');
  await page.keyboard.press('Delete');

  await expect(nodeCount).toHaveCount(5, { timeout: 10_000 });
  await expect(edgeCount).toHaveCount(4, { timeout: 10_000 });
  await expect(page.getByText('5 个节点')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('4 条连线')).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press('Control+z');
  await expect(nodeCount).toHaveCount(6, { timeout: 10_000 });
  await expect(page.getByText('6 个节点')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('6 条连线')).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press('Control+y');
  await expect(nodeCount).toHaveCount(5, { timeout: 10_000 });
  await expect(page.getByText('5 个节点')).toBeVisible({ timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('Ctrl+C / Ctrl+V copy-paste duplicates the active node through the designer clipboard', async ({
  page,
}) => {
  await openFlowDesigner(page);

  const nodeCount = page.locator('.react-flow__node');
  await expect(nodeCount).toHaveCount(6);

  await focusNode(page, 'rf__node-task-1');
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');

  await expect(nodeCount).toHaveCount(7, { timeout: 10_000 });
  await expect(page.getByText('7 个节点')).toBeVisible({ timeout: 10_000 });

  const positions = await page.locator('.react-flow__node').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).style.transform),
  );
  const unique = new Set(positions.filter(Boolean));
  expect(unique.size).toBeGreaterThanOrEqual(6);

  await assertTrackedPageErrors(page);
});

test('paste without a prior copy leaves the document unchanged', async ({ page }) => {
  await openFlowDesigner(page);

  const nodeCount = page.locator('.react-flow__node');
  await expect(nodeCount).toHaveCount(6);

  await focusNode(page, 'rf__node-task-1');
  await page.keyboard.press('Control+v');

  await expect(nodeCount).toHaveCount(6, { timeout: 5_000 });
  await page.waitForTimeout(500);
  await expect(nodeCount).toHaveCount(6);

  await assertTrackedPageErrors(page);
});
