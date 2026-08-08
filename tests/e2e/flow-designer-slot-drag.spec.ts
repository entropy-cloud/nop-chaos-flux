import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openTreeDesigner(page: import('@playwright/test').Page, example: string) {
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
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30000 });

  const exampleTab = page.getByRole('tab', { name: example });
  if (await exampleTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await exampleTab.click();
  }

  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('tree mode add-node menu opens from a node plus button (fd-4 real-browser chain)', async ({
  page,
}) => {
  await openTreeDesigner(page, '钉钉审批流');
  await page.waitForTimeout(1500);

  const nodeCount = page.locator('.react-flow__node');
  const before = await nodeCount.count();
  expect(before).toBeGreaterThan(5);

  const plusButton = page.getByRole('button', { name: '添加节点' }).first();
  await expect(plusButton).toBeVisible({ timeout: 10_000 });
  await plusButton.click();

  const addMenu = page.getByRole('menu', { name: 'Add node' });
  await expect(addMenu).toBeVisible({ timeout: 5_000 });
  await expect(addMenu).toContainText('审批人');

  const menuItem = addMenu.getByRole('menuitem', { name: '审批人' }).first();
  await expect(menuItem).toBeVisible();
  await menuItem.click();

  await expect(nodeCount).toHaveCount(before + 1, { timeout: 10_000 });
  await assertTrackedPageErrors(page);
});

test('dragging a node commits its new position to the designer document (fd-9)', async ({
  page,
}) => {
  await page.goto('/#/flow-designer', { waitUntil: 'commit' });
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 45_000 });

  const node = page.locator('[data-testid="rf__node-task-1"]').first();
  await expect(node).toBeVisible();

  const before = await node.evaluate((el) => (el as HTMLElement).style.transform);

  const box = (await node.boundingBox()) as { x: number; y: number; width: number; height: number };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();

  await page.waitForTimeout(600);

  const after = await node.evaluate((el) => (el as HTMLElement).style.transform);
  expect(after).not.toBe(before);

  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await assertTrackedPageErrors(page);
});
