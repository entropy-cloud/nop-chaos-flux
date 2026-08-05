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

test('dingtalk tree mode mounts with projected nodes and zero page errors', async ({ page }) => {
  await openTreeDesigner(page, '钉钉审批流');
  await page.waitForTimeout(1500);

  const nodeCount = await page.locator('.react-flow__node').count();
  expect(nodeCount).toBeGreaterThan(5);

  const edgeGroups = page.locator('.react-flow__edge');
  await expect(edgeGroups).toHaveCount(11);
  const edgePaths = page.locator('.react-flow__edge path.react-flow__edge-path');
  await expect(edgePaths.first()).toHaveAttribute('d', /M/);
  await expect(edgePaths).toHaveCount(11);

  await assertTrackedPageErrors(page);
});

test('dingtalk tree nodes use fixed geometry footprints with clipped inner bodies', async ({ page }) => {
  await openTreeDesigner(page, '钉钉审批流');
  await page.waitForTimeout(1500);

  const firstBody = page.locator('[data-slot="designer-node-body"]').first();
  await expect(firstBody).toBeVisible({ timeout: 10000 });

  const box = await firstBody.evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    const rect = (el as HTMLElement).getBoundingClientRect();
    return {
      boxSizing: style.boxSizing,
      overflow: style.overflow,
      width: rect.width,
      height: rect.height,
    };
  });
  expect(box.boxSizing).toBe('border-box');
  expect(box.overflow).toBe('hidden');
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);

  await assertTrackedPageErrors(page);
});

test('dingtalk tree split/merge edges share lines and avoid node collisions (DOM bounds)', async ({ page }) => {
  await openTreeDesigner(page, '钉钉审批流');
  await page.waitForTimeout(1500);

  const nodeRects = await page
    .locator('.react-flow__node')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      }),
    );

  for (let i = 0; i < nodeRects.length; i += 1) {
    for (let j = i + 1; j < nodeRects.length; j += 1) {
      const a = nodeRects[i];
      const b = nodeRects[j];
      const overlapX = a.left < b.right && b.left < a.right;
      const overlapY = a.top < b.bottom && b.top < a.bottom;
      expect(overlapX && overlapY, `node ${i} overlaps node ${j}`).toBe(false);
    }
  }

  await assertTrackedPageErrors(page);
});

test('action-flow tree mounts and renders without errors', async ({ page }) => {
  await openTreeDesigner(page, 'Action 编排');
  await page.waitForTimeout(1500);

  const nodeCount = await page.locator('.react-flow__node').count();
  expect(nodeCount).toBeGreaterThan(3);
  await expect(page.locator('.react-flow__edge path').first()).toHaveAttribute('d', /M/);

  await assertTrackedPageErrors(page);
});
