import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function openFlowDesigner(page: import('@playwright/test').Page) {
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
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('captures node and hover toolbar html', async ({ page }, testInfo) => {
  await openFlowDesigner(page);

  const shotsDir = join(testInfo.outputDir, 'screenshots');
  await mkdir(shotsDir, { recursive: true });
  await page.screenshot({ path: join(shotsDir, 'flow-designer-page.png'), fullPage: true });
  await page.locator('[data-testid="canvas"]').first().screenshot({ path: join(shotsDir, 'canvas.png') });

  const node = page.locator('[data-testid="rf__node-task-1"]').first();
  await expect(node).toBeVisible();
  await node.click();

  const nodeCard = node.locator('.nop-designer-node').first();
  await nodeCard.screenshot({ path: join(shotsDir, 'task-node.png') });
  await expect(nodeCard.locator('[data-icon="workflow"]')).toHaveCount(1);
  await expect(nodeCard).toContainText('发送欢迎邮件');
  await expect(nodeCard).toContainText('邮件通知');
  await expect(nodeCard).toContainText('任务节点');
  await expect(nodeCard).toContainText('2项配置');

  const nodeMetrics = await nodeCard.evaluate((el) => {
    const outer = el as HTMLElement;
    const inner = outer.querySelector('.nop-glass-card') as HTMLElement | null;
    const icon = outer.querySelector('[data-icon="workflow"]') as HTMLElement | null;
    const tag = Array.from(outer.querySelectorAll('.nop-text')).find(
      (candidate) => candidate.textContent?.trim() === '任务节点'
    ) as HTMLElement | undefined;
    const title = Array.from(outer.querySelectorAll('.nop-text')).find(
      (candidate) => candidate.textContent?.trim() === '发送欢迎邮件'
    ) as HTMLElement | undefined;

    const outerStyle = window.getComputedStyle(outer);
    const innerStyle = inner ? window.getComputedStyle(inner) : null;

    const iconRect = icon?.getBoundingClientRect();
    const titleRect = title?.getBoundingClientRect();

    return {
      outerBorder: outerStyle.borderTopWidth,
      outerBg: outerStyle.backgroundColor,
      innerBorder: innerStyle?.borderTopWidth ?? '',
      innerBg: innerStyle?.backgroundColor ?? '',
      innerRadius: innerStyle?.borderRadius ?? '',
      innerShadow: innerStyle?.boxShadow ?? '',
      tagBg: tag ? window.getComputedStyle(tag).backgroundColor : '',
      tagRadius: tag ? window.getComputedStyle(tag).borderRadius : '',
      tagTop: tag ? tag.getBoundingClientRect().top : 0,
      iconLeft: iconRect?.left ?? 0,
      iconTop: iconRect?.top ?? 0,
      iconCenterY: iconRect ? iconRect.top + iconRect.height / 2 : 0,
      titleLeft: titleRect?.left ?? 0,
      titleTop: titleRect?.top ?? 0,
      titleCenterY: titleRect ? titleRect.top + titleRect.height / 2 : 0
    };
  });

  expect(nodeMetrics.outerBorder).toBe('0px');
  expect(nodeMetrics.outerBg).toBe('rgba(0, 0, 0, 0)');
  expect(nodeMetrics.innerBorder).toBe('1px');
  expect(nodeMetrics.innerBg).toContain('255, 255, 255');
  expect(nodeMetrics.innerRadius).toBe('16px');
  expect(nodeMetrics.tagBg).not.toBe('rgba(0, 0, 0, 0)');
  expect(parseFloat(nodeMetrics.tagRadius)).toBeGreaterThan(1000);
  expect(nodeMetrics.iconLeft).toBeLessThan(nodeMetrics.titleLeft);
  expect(Math.abs(nodeMetrics.iconCenterY - nodeMetrics.titleCenterY)).toBeLessThan(22);
  expect(nodeMetrics.tagTop).toBeGreaterThan(nodeMetrics.titleTop + 14);

  const iconContainer = nodeCard.locator('[data-icon="workflow"]').first().evaluate((el) => {
    const container = (el as HTMLElement).closest('.nop-container') ?? (el as HTMLElement).parentElement;
    const containerStyle = container ? window.getComputedStyle(container as HTMLElement) : null;
    return {
      containerRadius: containerStyle?.borderRadius ?? '',
      containerWidth: containerStyle?.width ?? '',
      containerHeight: containerStyle?.height ?? '',
      containerPadding: containerStyle?.paddingTop ?? '',
    };
  });

  expect((await iconContainer).containerRadius).toBe('16px');
  expect((await iconContainer).containerWidth).toBe('40px');

  await node.hover();
  const toolbar = page.locator('[data-slot="designer-node-toolbar"]').first();
  await expect(toolbar).toBeVisible({ timeout: 5000 });
  await toolbar.screenshot({ path: join(shotsDir, 'task-node-toolbar.png') });
  await expect(toolbar.locator('[data-icon="pencil"]')).toHaveCount(1);
  await expect(toolbar.locator('[data-icon="copy"]')).toHaveCount(1);
  await expect(toolbar.locator('[data-icon="trash-2"]')).toHaveCount(1);

  const nodeQuickActionButton = toolbar.locator('button').first();
  const nodeQuickActionBgBefore = await nodeQuickActionButton.evaluate((el) => window.getComputedStyle(el as HTMLElement).backgroundColor);
  await nodeQuickActionButton.hover();
  const nodeQuickActionBgAfter = await nodeQuickActionButton.evaluate((el) => window.getComputedStyle(el as HTMLElement).backgroundColor);
  expect(nodeQuickActionBgBefore).toBe('rgba(0, 0, 0, 0)');
  expect(nodeQuickActionBgAfter).not.toBe('rgba(0, 0, 0, 0)');

  const nodeHtml = await nodeCard.evaluate((el) => el.outerHTML);
  const toolbarHtml = await toolbar.evaluate((el) => el.outerHTML);

  const edge = page.locator('.react-flow__edge').nth(1);
  await edge.hover({ force: true });
  const edgeQuickActions = page.locator('[data-slot="designer-edge-actions"]').first();
  await expect(edgeQuickActions).toBeVisible();
  await expect(edgeQuickActions.locator('[data-icon="pencil"]')).toHaveCount(1);
  await expect(edgeQuickActions.locator('[data-icon="trash-2"]')).toHaveCount(1);

  const edgeQuickActionButton = edgeQuickActions.locator('button').first();
  const edgeQuickActionBgBefore = await edgeQuickActionButton.evaluate((el) => window.getComputedStyle(el as HTMLElement).backgroundColor);
  await edgeQuickActionButton.hover();
  const edgeQuickActionBgAfter = await edgeQuickActionButton.evaluate((el) => window.getComputedStyle(el as HTMLElement).backgroundColor);
  expect(edgeQuickActionBgBefore).toBe('rgba(0, 0, 0, 0)');
  expect(edgeQuickActionBgAfter).not.toBe('rgba(0, 0, 0, 0)');

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

  const palette = page.locator('[data-testid="left-panel-expanded"] .nop-palette').first();
  await expect(palette).toBeVisible();
  await expect(palette).toContainText('节点库');
  await expect(palette.locator('[data-slot="designer-palette-item"] button:has-text("开始节点") [data-icon="play"]')).toHaveCount(1);

  const topToolbar = page.locator('[data-slot="workbench-header"] [data-testid="designer-toolbar"]').first();
  await expect(topToolbar).toBeVisible();
  await expect(topToolbar.locator('button')).toHaveCount(7);
  await expect(page.locator('.react-flow__minimap')).toBeVisible();
  await expect(page.locator('.react-flow__controls')).toBeVisible();
  await expect(page.getByText('触发').first()).toBeVisible();
});

test('verifies flow-designer button behaviors for toolbar and quick actions', async ({ page }) => {
  await openFlowDesigner(page);

  const nodeCount = page.locator('.react-flow__node');
  await expect(nodeCount).toHaveCount(6);

  const addTaskButton = page.locator('[data-slot="designer-palette-item"]').filter({ hasText: '任务节点' }).locator('button').nth(1);
  await addTaskButton.click();
  await expect(nodeCount).toHaveCount(7);

  const createdNode = nodeCount.last();
  await createdNode.click();
  const inspectorDeleteNodeButton = page.getByRole('button', { name: '删除节点' }).first();
  await expect(inspectorDeleteNodeButton).toBeVisible();
  await inspectorDeleteNodeButton.click();
  await expect(nodeCount).toHaveCount(6);
});

test('toggles JSON preview dialog from toolbar JSON button', async ({ page }) => {
  await openFlowDesigner(page);

  const topToolbar = page.locator('[data-slot="workbench-header"] [data-testid="designer-toolbar"]').first();
  await topToolbar.getByText('JSON').click();

  const jsonDialog = page.locator('[role="dialog"][data-slot="dialog-content"]');
  await expect(jsonDialog).toBeAttached();
  await expect(jsonDialog).toContainText('nodes:[');
  await expect(jsonDialog).toContainText('edges:[');

  await page.keyboard.press('Escape');
  await expect(jsonDialog).toHaveCount(0);
});
