import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Flow Designer' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
}

test('captures node and hover toolbar html', async ({ page }, testInfo) => {
  await openFlowDesigner(page);

  const node = page.locator('[data-testid="rf__node-task-1"]').first();
  await expect(node).toBeVisible();

  const nodeCard = node.locator('.fd-xyflow-node').first();
  await expect(nodeCard.locator('[data-icon="workflow"]')).toHaveCount(1);
  await expect(nodeCard).toContainText('发送欢迎邮件');
  await expect(nodeCard).toContainText('service');

  await node.hover();
  const toolbar = page.locator('.fd-xyflow-node-toolbar').first();
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator('[data-icon="pencil"]')).toHaveCount(1);
  await expect(toolbar.locator('[data-icon="copy"]')).toHaveCount(1);
  await expect(toolbar.locator('[data-icon="trash-2"]')).toHaveCount(1);

  const nodeHtml = await nodeCard.evaluate((el) => el.outerHTML);
  const toolbarHtml = await toolbar.evaluate((el) => el.outerHTML);

  const outDir = join(testInfo.outputDir, 'html');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'node.html'), nodeHtml, 'utf8');
  await writeFile(join(outDir, 'toolbar.html'), toolbarHtml, 'utf8');

  console.log('NODE_HTML_START');
  console.log(nodeHtml);
  console.log('NODE_HTML_END');
  console.log('TOOLBAR_HTML_START');
  console.log(toolbarHtml);
  console.log('TOOLBAR_HTML_END');
});

test('verifies palette and top toolbar visual structure', async ({ page }) => {
  await openFlowDesigner(page);

  const palette = page.locator('.fd-page__palette .fd-palette').first();
  await expect(palette).toBeVisible();
  await expect(palette).toContainText('Node Palette');
  await expect(palette.locator('button.fd-palette__item:has-text("开始节点") [data-icon="play"]')).toHaveCount(1);

  const topToolbar = page.locator('.fd-page__header [data-testid="designer-toolbar"]').first();
  await expect(topToolbar).toBeVisible();

  const undoBtn = topToolbar.getByRole('button', { name: /撤销/ });
  const redoBtn = topToolbar.getByRole('button', { name: /重做/ });
  await expect(undoBtn).toBeVisible();
  await expect(redoBtn).toBeVisible();
  await expect(undoBtn.locator('[data-icon="rotate-ccw"]')).toHaveCount(1);
  await expect(redoBtn.locator('[data-icon="rotate-cw"]')).toHaveCount(1);
});
