import { expect, test } from './fixtures.js';

/**
 * plan 524 L6 S3+S4 — page-designer 数据/动作/键盘/模板 e2e（程序化断言，零截图）：
 * 1. S3-2 动作编排：button 节点编排 xui:actions（showToast + 参数键值对）→ 导出含
 *    xui:actions 且无 sid（INV-E）→ 导入还原（动作编辑器重投影）。
 * 2. S3-3 formula 编辑器：page 根节点 breadcrumb（editorType expression）→
 *    非法表达式行内错误不落文档、合法表达式落导出。
 * 3. S3-1 数据绑定：数据 tab 数据源清单 + `${source.field}` 绑定经 updateProps 落导出。
 * 4. S4-1 键盘漫游：ArrowDown/ArrowLeft/ArrowRight 移动选择、Delete 删除（命令通道）。
 * 5. S4-2 模板画廊：保存当前页为模板 → 删除节点 → 实例化（importDocument）还原。
 */

async function openPageDesigner(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#/page-designer', { waitUntil: 'commit' });
  await expect(page.getByTestId('page-designer-root')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('page-designer-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-psid]').first()).toBeAttached({ timeout: 30_000 });
}

async function importJson(page: import('@playwright/test').Page, doc: unknown) {
  await page.getByRole('tab', { name: 'JSON 源码' }).click();
  const textarea = page.getByTestId('page-designer-source-textarea');
  await textarea.fill(JSON.stringify(doc));
  await page.getByTestId('page-designer-import-json').click();
  await expect(page.getByTestId('page-designer-source-message')).toHaveAttribute('data-message-level', 'ok', {
    timeout: 15_000,
  });
}

async function exportParsed(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: 'JSON 源码' }).click();
  const text = await page.getByTestId('page-designer-source-textarea').inputValue();
  return { text, parsed: JSON.parse(text) as Record<string, unknown> };
}

test('S3-2 actions orchestration: edit xui:actions → export carries them → import restores', async ({ page }) => {
  await openPageDesigner(page);

  // 导入一个 button 页面。
  await importJson(page, { type: 'page', body: [{ type: 'button', label: 'Submit' }] });

  // 结构树选中 button → 属性面板出现动作编排器（importJson 停在源码 tab，先切回属性）。
  await page.getByRole('tab', { name: '属性' }).click();
  await page.getByRole('tab', { name: '大纲树' }).click();
  await expect(page.locator('[data-tree-node-type="button"]')).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-tree-node-type="button"]').click();
  const editor = page.getByTestId('page-designer-actions-editor');
  await expect(editor).toBeVisible({ timeout: 15_000 });

  // 新增动作：名 greet、类型 showToast、参数 message=你好。
  await page.getByTestId('page-designer-action-add').click();
  await page.getByTestId('page-designer-action-name-0').fill('greet');
  await page.getByTestId('page-designer-action-type-0').selectOption('showToast');
  await page.getByTestId('page-designer-action-arg-add-0').click();
  const argInputs = page.getByTestId('page-designer-action-args-0').locator('input');
  await argInputs.nth(0).fill('message');
  await argInputs.nth(1).fill('你好');
  await argInputs.nth(1).blur();

  const { text, parsed } = await exportParsed(page);
  expect(text).not.toContain('xui:sid');
  const body = parsed.body as Array<Record<string, unknown>>;
  const actions = body[0]['xui:actions'] as Record<string, { action: string; args?: Record<string, unknown> }>;
  expect(actions).toEqual({ greet: { action: 'showToast', args: { message: '你好' } } });

  // 导入还原：动作编辑器重投影同一 record。
  await importJson(page, parsed);
  await page.getByRole('tab', { name: '属性' }).click();
  await page.getByRole('tab', { name: '大纲树' }).click();
  await page.locator('[data-tree-node-type="button"]').click();
  await expect(page.getByTestId('page-designer-actions-editor')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('page-designer-action-name-0')).toHaveValue('greet', { timeout: 15_000 });
  await expect(page.getByTestId('page-designer-action-type-0')).toHaveValue('showToast');
  await expect(page.getByTestId('page-designer-action-args-0').locator('input').nth(0)).toHaveValue('message');
  await expect(page.getByTestId('page-designer-action-args-0').locator('input').nth(1)).toHaveValue('你好');

  const restored = await exportParsed(page);
  expect(restored.parsed).toEqual(parsed);
});

test('S3-3 formula editor + S3-1 data binding write expression templates through updateProps', async ({ page }) => {
  await openPageDesigner(page);

  // S3-3：page 根节点 breadcrumb（editorType expression）走 formula 适配器。
  await page.getByRole('tab', { name: '大纲树' }).click();
  await page.locator('[data-tree-node-type="page"]').first().click();
  const cell = page.locator('[data-inspector-field="breadcrumb"][data-inspector-adapter="expression"]');
  await expect(cell).toBeVisible({ timeout: 15_000 });
  const cellTextarea = cell.locator('textarea');

  // 非法表达式：行内错误 + 不落文档（expr-invalid 失败路径）。
  await cellTextarea.fill('${nav.title +}');
  await expect(page.getByTestId('page-designer-formula-error')).toBeVisible({ timeout: 15_000 });
  const invalid = await exportParsed(page);
  expect(JSON.stringify(invalid.parsed)).not.toContain('nav.title');

  // 合法表达式：切回属性 tab（inspector 重挂）后写入，落导出投影。
  await page.getByRole('tab', { name: '属性' }).click();
  const validCell = page.locator('[data-inspector-field="breadcrumb"][data-inspector-adapter="expression"] textarea');
  await expect(validCell).toBeVisible({ timeout: 15_000 });
  await validCell.fill('${nav.title}');
  const valid = await exportParsed(page);
  expect(valid.text).toContain('"breadcrumb": "${nav.title}"');

  // S3-1：数据 tab（宿主 demo 未注入清单 → 空态）+ 选中 text 节点写绑定。
  await importJson(page, {
    type: 'page',
    body: [{ type: 'text', name: 'label1', text: 'x' }],
    breadcrumb: '${nav.title}',
  });
  await page.getByRole('tab', { name: '数据' }).click();
  await expect(page.getByTestId('page-designer-data-sources')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('tab', { name: '大纲树' }).click();
  await page.locator('[data-tree-node-type="text"]').click();
  await page.getByRole('tab', { name: '数据' }).click();
  // 左栏数据面板位（aside.first()）：数据 tab 内的绑定编辑器实例。
  const leftPanel = page.locator('aside').first();
  const source = leftPanel.locator('#page-designer-binding-source');
  const field = leftPanel.locator('#page-designer-binding-field');
  await expect(source).toBeVisible({ timeout: 15_000 });
  await source.fill('users');
  await field.fill('name');
  await expect(leftPanel.getByTestId('page-designer-binding-preview')).toHaveText('${users.name}', { timeout: 15_000 });

  const bound = await exportParsed(page);
  const body = bound.parsed.body as Array<Record<string, unknown>>;
  expect(body[0].value).toBe('${users.name}');
});

test('S4-1 keyboard navigation: arrows move selection and Delete removes via commands', async ({ page }) => {
  await openPageDesigner(page);

  await importJson(page, {
    type: 'page',
    body: [{ type: 'container', body: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] }],
  });
  await page.getByRole('tab', { name: '属性' }).click();
  await page.getByRole('tab', { name: '大纲树' }).click();
  const tree = page.getByTestId('page-designer-structure-tree');
  await expect(tree.locator('[data-tree-node-type]')).toHaveCount(4, { timeout: 15_000 });

  // 选中根节点 → ArrowDown 到 container → ArrowRight 进入第一个 text（inspector 出现 text 契约字段）。
  await tree.locator('[data-tree-node-type="page"]').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-inspector-field="tag"]')).toBeVisible({ timeout: 15_000 });

  // ArrowLeft 回 container → Delete 删除（removeNode 命令，结构树回到 1 行）。
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Delete');
  await expect(tree.locator('[data-tree-node-type]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-psid]')).toHaveCount(1);
});

test('S4-2 template gallery: save current page → clear canvas → instantiate restores via importDocument', async ({ page }) => {
  await openPageDesigner(page);

  await importJson(page, { type: 'page', body: [{ type: 'text', text: 'landing' }] });
  await expect(page.locator('.nop-text')).toHaveCount(1, { timeout: 15_000 });

  // 打开画廊 → 命名保存当前页。
  await page.getByTestId('page-designer-templates').click();
  const gallery = page.getByTestId('page-designer-template-gallery');
  await expect(gallery).toBeVisible({ timeout: 15_000 });
  await page.locator('#page-designer-template-name').fill('Landing 模板');
  await page.getByTestId('page-designer-template-save').click();
  await expect(page.getByTestId('page-designer-template-item')).toHaveCount(1, { timeout: 15_000 });

  // 关闭画廊 → 删除画布节点（文档清空）。
  await page.getByTestId('page-designer-template-close').click();
  await expect(gallery).not.toBeVisible({ timeout: 15_000 });
  await page.getByRole('tab', { name: '大纲树' }).click();
  await page.locator('[data-tree-node-type="text"]').click();
  await page.locator('[data-tree-node-type="text"]').press('Delete');
  await expect(page.locator('[data-tree-node-type]')).toHaveCount(1, { timeout: 15_000 });

  // 重新打开画廊 → 实例化 → 节点还原（importDocument 命令）且导出无 sid（INV-E）。
  await page.getByTestId('page-designer-templates').click();
  await expect(gallery).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('page-designer-template-instantiate').click();
  await expect(page.locator('.nop-text')).toHaveCount(1, { timeout: 15_000 });

  const { text } = await exportParsed(page);
  expect(text).toContain('"text": "landing"');
  expect(text).not.toContain('xui:sid');
  expect(text).not.toContain('psid-');
});
