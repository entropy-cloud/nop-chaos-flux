import { expect, test } from './fixtures.js';

/**
 * plan 523 L6 S2 — page-designer MVP e2e（五件套叙事，程序化断言）：
 * 打开 #/page-designer 入口 → palette 拖 text 到画布（HTML5 DnD）→ 点击选中文本节点
 * → inspector 改属性（tag: h1）→ 导出 JSON 断言含变更且无 xui:sid（INV-E）；
 * 另覆盖 undo / 结构树投影 / 预览态锚点剥离。
 *
 * 全部程序化判据（2026-08-28 快照政策），零截图。
 */

async function openPageDesigner(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#/page-designer', { waitUntil: 'commit' });
  await expect(page.getByTestId('page-designer-root')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('page-designer-canvas')).toBeVisible({ timeout: 30_000 });
  // 编辑装配投影：画布节点带 data-psid 锚点（至少页面根节点一个）。
  await expect(page.locator('[data-psid]').first()).toBeAttached({ timeout: 30_000 });
}

test('page-designer MVP: palette drag → canvas insert → inspector edit → export round-trip', async ({ page }) => {
  await openPageDesigner(page);

  const beforeCount = await page.locator('[data-psid]').count();
  expect(beforeCount).toBeGreaterThanOrEqual(1);

  // palette 拖 text 到画布（HTML5 dragstart/drop 全链路）。
  await page.locator('[data-palette-item="text"]').scrollIntoViewIfNeeded();
  await page.dragAndDrop('[data-palette-item="text"]', '[data-testid="page-designer-canvas"]');

  await page.waitForFunction(
    (previous) => document.querySelectorAll('[data-psid]').length === previous + 1,
    beforeCount,
    { timeout: 15_000 },
  );

  // 画布出现 text 渲染产物（nop-text，带锚点属性）。
  await expect(page.locator('.nop-text')).toHaveCount(1);
  const textAnchorId = await page.locator('.nop-text').getAttribute('data-psid');
  expect(textAnchorId).toMatch(/^psid-/);

  // 点击选中：pointerdown 命中文本锚点 → 属性面板出现 tag 选择器。
  await page.locator('.nop-text').click();
  const tagSelect = page.locator('[data-inspector-field="tag"] select');
  await expect(tagSelect).toBeVisible({ timeout: 15_000 });
  await tagSelect.selectOption('h1');

  // 导出 JSON：切到源码 tab，断言包含变更且无 xui:sid（INV-E）。
  await page.getByRole('tab', { name: 'JSON 源码' }).click();
  const exported = await page.getByTestId('page-designer-source-textarea').inputValue();
  const parsed = JSON.parse(exported) as { type: string; body: { type: string; tag?: string }[] };
  expect(parsed.type).toBe('page');
  expect(parsed.body).toHaveLength(1);
  expect(parsed.body[0].type).toBe('text');
  expect(parsed.body[0].tag).toBe('h1');
  expect(exported).not.toContain('xui:sid');
  expect(exported).not.toContain('psid-');
});

test('page-designer MVP: undo removes the dropped node and structure tree reflects the document', async ({ page }) => {
  await openPageDesigner(page);

  await page.dragAndDrop('[data-palette-item="text"]', '[data-testid="page-designer-canvas"]');
  await expect(page.locator('.nop-text')).toHaveCount(1, { timeout: 15_000 });

  // 大纲树投影：page + text 两行，text 行可选中。
  await page.getByRole('tab', { name: '大纲树' }).click();
  const tree = page.getByTestId('page-designer-structure-tree');
  await expect(tree).toBeVisible();
  await expect(tree.locator('[data-tree-node-type]')).toHaveCount(2);
  await tree.locator('[data-tree-node-type="text"]').click();
  await expect(page.locator('[data-inspector-field="tag"] select')).toBeVisible({ timeout: 15_000 });

  // undo 撤销 insertNode：画布 text 消失，大纲树回到 1 行。
  await page.getByTestId('page-designer-undo').click();
  await expect(page.locator('.nop-text')).toHaveCount(0, { timeout: 15_000 });
  await expect(tree.locator('[data-tree-node-type]')).toHaveCount(1);
});

test('page-designer MVP: preview mode strips edit anchors (INV-E runtime zero-awareness)', async ({ page }) => {
  await openPageDesigner(page);
  const beforeCount = await page.locator('[data-psid]').count();

  await page.dragAndDrop('[data-palette-item="button"]', '[data-testid="page-designer-canvas"]');
  await page.waitForFunction(
    (previous) => document.querySelectorAll('[data-psid]').length === previous + 1,
    beforeCount,
    { timeout: 15_000 },
  );

  // 预览态：装配剥离 → 锚点清零、覆盖层隐藏。
  await page.getByTestId('page-designer-mode-toggle').click();
  await expect(page.locator('[data-psid]')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-page-designer-overlay]')).toHaveAttribute('style', /none/);

  // 回到编辑态：锚点恢复。
  await page.getByTestId('page-designer-mode-toggle').click();
  await expect(page.locator('[data-psid]').first()).toBeAttached({ timeout: 15_000 });
});
