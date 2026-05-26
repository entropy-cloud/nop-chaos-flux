import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer', { waitUntil: 'commit' });
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 45_000 });
  await expect(page.locator('.react-flow')).toBeVisible();
  await assertTrackedPageErrors(page);
}

test.skip('diagnostic synthetic connect event updates the live edge count', async ({ page }) => {
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

test('keyboard connection from a real source handle to a real target handle creates a visible edge', async ({ page }) => {
  await openFlowDesigner(page);

  const edgeCount = page.locator('.react-flow__edge');
  await expect(edgeCount).toHaveCount(6);

  const sourceHandle = page.getByRole('button', {
    name: '从节点 发送欢迎邮件 的输出端口 out开始连线',
  });
  await expect(sourceHandle).toBeVisible();
  await sourceHandle.focus();
  await sourceHandle.press('Enter');

  const targetHandle = page.getByRole('button', {
    name: '完成到节点 结束 的输入端口 in的连线',
  });
  await expect(targetHandle).toBeVisible();
  await targetHandle.focus();
  await targetHandle.press('Enter');

  await expect(edgeCount).toHaveCount(7, { timeout: 10_000 });
  await expect(page.getByText('7 条连线')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.react-flow__edge').last()).toBeVisible();
});
