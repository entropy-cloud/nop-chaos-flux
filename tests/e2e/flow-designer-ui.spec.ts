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
  await page.getByRole('button', { name: 'Flow Designer' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
}

test('captures node and hover toolbar html', async ({ page }, testInfo) => {
  await openFlowDesigner(page);

  const shotsDir = join(testInfo.outputDir, 'screenshots');
  await mkdir(shotsDir, { recursive: true });
  await page.screenshot({ path: join(shotsDir, 'flow-designer-page.png'), fullPage: true });
  await page.locator('.nop-designer__canvas').first().screenshot({ path: join(shotsDir, 'canvas.png') });

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
  expect(nodeMetrics.tagBg).toBe('rgb(224, 242, 254)');
  expect(nodeMetrics.tagRadius).toBe('9999px');
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

  expect((await iconContainer).containerRadius).toBe('12px');
  expect((await iconContainer).containerWidth).toBe('40px');

  await node.hover();
  const toolbar = page.locator('.nop-designer-node-toolbar').first();
  await expect(toolbar).toBeVisible();
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
  const edgeQuickActions = page.locator('.nop-designer-edge__actions').first();
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

  const palette = page.locator('.nop-designer__palette .nop-palette').first();
  await expect(palette).toBeVisible();
  await expect(palette).toContainText('节点库');
  await expect(palette.locator('.nop-palette__item button:has-text("开始节点") [data-icon="play"]')).toHaveCount(1);

  const topToolbar = page.locator('.nop-designer__header [data-testid="designer-toolbar"]').first();
  await expect(topToolbar).toBeVisible();

  const undoBtn = topToolbar.getByRole('button', { name: /撤销/ });
  const redoBtn = topToolbar.getByRole('button', { name: /重做/ });
  await expect(undoBtn).toBeVisible();
  await expect(redoBtn).toBeVisible();
  await expect(undoBtn.locator('[data-icon="rotate-ccw"]')).toHaveCount(1);
  await expect(redoBtn.locator('[data-icon="rotate-cw"]')).toHaveCount(1);

  const styleMetrics = await page.evaluate(() => {
    const nodeShell = document.querySelector('[data-testid="rf__node-task-1"] .nop-designer-node') as HTMLElement | null;
    const paletteItem = document.querySelector('.nop-palette__item') as HTMLElement | null;
    const toolbar = document.querySelector('[data-testid="designer-toolbar"]') as HTMLElement | null;
    const canvas = document.querySelector('.nop-designer__canvas') as HTMLElement | null;
    const gridPattern = document.querySelector('.react-flow__background-pattern') as SVGElement | null;
    const innerNode = nodeShell?.querySelector('.nop-glass-card') as HTMLElement | null;
    const minimap = document.querySelector('.react-flow__minimap') as HTMLElement | null;
    const controls = document.querySelector('.react-flow__controls') as HTMLElement | null;
    const edgeLabel = document.querySelector('.nop-designer-edge__label') as HTMLElement | null;
    const firstControlButton = controls?.querySelector('button') as HTMLElement | null;
    const dashedPath = Array.from(document.querySelectorAll('.react-flow__edge-path')).find((path) => {
      const dash = window.getComputedStyle(path as SVGElement).strokeDasharray;
      return dash.includes('6') && dash.includes('4');
    }) as SVGElement | undefined;
    const dottedPath = Array.from(document.querySelectorAll('.react-flow__edge-path')).find((path) => {
      const dash = window.getComputedStyle(path as SVGElement).strokeDasharray;
      return dash.includes('2') && dash.includes('4');
    }) as SVGElement | undefined;
    const nodeIcon = nodeShell?.querySelector('[data-icon]')?.closest('[class*="node-icon"]') as HTMLElement | null
      ?? nodeShell?.querySelector('[data-icon]') as HTMLElement | null;

    if (!nodeShell || !innerNode || !paletteItem || !toolbar || !canvas || !gridPattern || !minimap || !controls || !edgeLabel || !dashedPath || !dottedPath || !nodeIcon || !firstControlButton) {
      return null;
    }

    const nodeStyle = window.getComputedStyle(innerNode);
    const paletteItemStyle = window.getComputedStyle(paletteItem);
    const toolbarStyle = window.getComputedStyle(toolbar);
    const canvasStyle = window.getComputedStyle(canvas);
    const gridStyle = window.getComputedStyle(gridPattern);
    const pageStyle = window.getComputedStyle(document.querySelector('.nop-designer') as HTMLElement);
    const minimapStyle = window.getComputedStyle(minimap);
    const controlsStyle = window.getComputedStyle(controls);
    const edgeLabelStyle = window.getComputedStyle(edgeLabel);
    const dashedStyle = window.getComputedStyle(dashedPath);
    const dottedStyle = window.getComputedStyle(dottedPath);
    const iconStyle = window.getComputedStyle(nodeIcon);

    return {
      nodeMinWidth: window.getComputedStyle(nodeShell).minWidth,
      nodeRadius: nodeStyle.borderRadius,
      nodeShadow: nodeStyle.boxShadow,
      nodeIconRadius: iconStyle.borderRadius,
      nodeIconWidth: iconStyle.width,
      nodeIconPaddingTop: iconStyle.paddingTop,
      paletteRadius: paletteItemStyle.borderRadius,
      toolbarRadius: toolbarStyle.borderRadius,
      toolbarShadow: toolbarStyle.boxShadow,
      toolbarHeight: toolbarStyle.minHeight || toolbarStyle.height,
      canvasBg: canvasStyle.backgroundColor,
      canvasBgImage: canvasStyle.backgroundImage,
      canvasBorder: canvasStyle.borderTopWidth,
      gridStroke: gridStyle.stroke,
      pageFontFamily: pageStyle.fontFamily,
      minimapWidth: minimapStyle.width,
      minimapHeight: minimapStyle.height,
      minimapRight: minimapStyle.right,
      minimapBottom: minimapStyle.bottom,
      minimapBg: minimapStyle.backgroundColor,
      minimapBgImage: minimapStyle.backgroundImage,
      controlsTop: controlsStyle.top,
      controlsLeft: controlsStyle.left,
      controlsRadius: controlsStyle.borderRadius,
      controlsBg: controlsStyle.backgroundColor,
      controlsButtonHeight: window.getComputedStyle(firstControlButton).height,
      edgeLabelBg: edgeLabelStyle.backgroundColor,
      edgeLabelFontSize: edgeLabelStyle.fontSize,
      edgeLabelRadius: edgeLabelStyle.borderRadius,
      dashedDasharray: dashedStyle.strokeDasharray,
      dottedDasharray: dottedStyle.strokeDasharray
    };
  });

  expect(styleMetrics).not.toBeNull();
  expect(styleMetrics!.nodeMinWidth).toBe('192px');
  expect(styleMetrics!.nodeRadius).toBe('16px');
  expect(styleMetrics!.paletteRadius).toBe('20px');
  expect(styleMetrics!.toolbarRadius).toBe('20px');
  expect(styleMetrics!.nodeShadow).not.toBe('none');
  expect(styleMetrics!.nodeIconRadius).toBe('12px');
  expect(styleMetrics!.nodeIconWidth).toBe('40px');
  expect(styleMetrics!.toolbarShadow).not.toBe('none');
  expect(styleMetrics!.canvasBg).toContain('255, 255, 255');
  expect(styleMetrics!.canvasBgImage).toContain('none');
  expect(styleMetrics!.canvasBorder).toBe('1px');
  expect(styleMetrics!.gridStroke).toContain('148, 163, 184');
  expect(styleMetrics!.gridStroke).not.toBe('none');
  expect(styleMetrics!.minimapWidth).toBe('208px');
  expect(styleMetrics!.minimapHeight).toBe('128px');
  expect(styleMetrics!.minimapRight).toBe('12px');
  expect(styleMetrics!.minimapBottom).toBe('12px');
  expect(styleMetrics!.minimapBgImage).toContain('none');
  expect(styleMetrics!.minimapBg).toContain('226, 232, 240');
  expect(styleMetrics!.controlsTop).toBe('12px');
  expect(styleMetrics!.controlsLeft).toBe('12px');
  expect(styleMetrics!.controlsRadius).toBe('8px');
  expect(styleMetrics!.controlsBg).toContain('255, 255, 255');
  expect(styleMetrics!.controlsButtonHeight).toBe('28px');
  expect(styleMetrics!.edgeLabelBg).toContain('255, 255, 255');
  expect(styleMetrics!.edgeLabelFontSize).toBe('14px');
  expect(styleMetrics!.edgeLabelRadius).toBe('9999px');
  expect(styleMetrics!.dashedDasharray).toContain('6');
  expect(styleMetrics!.dashedDasharray).toContain('4');
  expect(styleMetrics!.dottedDasharray).toContain('2');
  expect(styleMetrics!.dottedDasharray).toContain('4');
  const fontFamily = styleMetrics!.pageFontFamily.toLowerCase();
  expect(fontFamily.includes('inter') || fontFamily.includes('segoe ui')).toBe(true);
});

test('verifies flow-designer button behaviors for toolbar and quick actions', async ({ page }) => {
  await openFlowDesigner(page);

  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.locator('.react-flow__edge')).toHaveCount(6);

  expect(nodeMetrics.outerBorder).toBe('0px');

  const topToolbar = page.locator('.nop-designer__header [data-testid="designer-toolbar"]').first();
  await topToolbar.getByRole('button', { name: /撤销/ }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6);

  await topToolbar.getByRole('button', { name: /重做/ }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(7);

  const createdNode = page.locator('.react-flow__node').last();
  await createdNode.click();
  const inspectorDeleteNodeButton = page.getByRole('button', { name: '删除节点' }).first();
  await expect(inspectorDeleteNodeButton).toBeVisible();
  await inspectorDeleteNodeButton.click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6);

  const edge = page.locator('.react-flow__edge').nth(1);
  await edge.hover({ force: true });
  const edgeDeleteButton = page.locator('.nop-designer-edge__actions button[aria-label="Delete edge"]').first();
  await expect(edgeDeleteButton).toBeVisible();
  await edgeDeleteButton.click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(5);
});

test('toggles JSON preview panel from toolbar JSON button', async ({ page }) => {
  await openFlowDesigner(page);

  const topToolbar = page.locator('.nop-designer__header [data-testid="designer-toolbar"]').first();
  await topToolbar.getByRole('button', { name: /^JSON$/ }).click();

  const jsonPanel = page.locator('[aria-label="Flow JSON preview"]');
  await expect(jsonPanel).toBeAttached();
  await expect(jsonPanel).toContainText('"nodes"');
  await expect(jsonPanel).toContainText('"edges"');

  await topToolbar.getByRole('button', { name: /^JSON$/ }).click();
  await expect(jsonPanel).toHaveCount(0);
});
