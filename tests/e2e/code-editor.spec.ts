import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

test.describe.configure({ mode: 'serial' });

async function openCodeEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/code-editor', { waitUntil: 'commit' });
  await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByRole('heading', { name: 'Code Editor Playground', level: 1 })).toBeVisible({
    timeout: 45000,
  });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

/**
 * Find the code-editor container that has a label matching the given text.
 * The label is in a [data-slot="field-label"] element, and the editor is a sibling
 * within the same form field wrapper.
 */
function findEditorByLabel(page: import('@playwright/test').Page, labelText: string) {
  return page.locator('.nop-field').filter({ hasText: labelText }).first();
}

test('navigates to code editor page and renders all editor types', async ({ page }) => {
  await openCodeEditor(page);

  await expect(
    page.locator('.nop-field').filter({ hasText: 'Expression Editor (with completion)' }),
  ).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'Template Mode' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'SQL Editor' })).toHaveCount(2);
  await expect(
    page
      .locator('.nop-field')
      .filter({ hasText: 'SQL Editor (Format + Snippets + Variables + Execution)' }),
  ).toBeVisible();
  await expect(
    page.locator('.nop-field').filter({ hasText: 'JSON Editor (Fullscreen)' }),
  ).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'JavaScript Editor' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'Read-Only Viewer' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'CSS Editor' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'Plain Text' })).toBeVisible();
});

test('SQL enhanced editor has all toolbar buttons', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const toolbar = field.locator('[data-slot="code-editor-toolbar"]').first();
  await expect(toolbar).toBeVisible();

  await expect(toolbar.locator('[data-slot="code-editor-toolbar-format"]')).toBeVisible();
  await expect(toolbar.locator('[data-slot="code-editor-snippet-panel"]')).toBeVisible();
  await expect(toolbar.locator('[data-slot="code-editor-toolbar-var-toggle"]')).toBeVisible();
  await expect(toolbar.locator('[data-slot="code-editor-toolbar-execute"]')).toBeVisible();
});

test('SQL format button formats the editor content', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const formatBtn = field.locator('[data-slot="code-editor-toolbar-format"]').first();
  await expect(formatBtn).toBeVisible();

  const editorEl = field.locator('.cm-editor').first();
  await expect(editorEl).toBeVisible();

  const beforeLines = await editorEl.locator('.cm-line').count();

  await formatBtn.click();

  const afterLines = await editorEl.locator('.cm-line').count();

  expect(afterLines).toBeGreaterThanOrEqual(beforeLines);
  expect(afterLines).toBeGreaterThan(0);
});

test('snippet panel dropdown shows configured snippets', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const snippetToggle = field.locator('[data-slot="code-editor-snippet-toggle"]').first();
  await expect(snippetToggle).toBeVisible();

  await snippetToggle.click();

  const dropdown = page
    .locator('[data-slot="code-editor-snippet-dropdown"]')
    .filter({ has: page.locator('[data-slot="code-editor-snippet-item"]') })
    .first();
  await expect(dropdown).toBeVisible();

  await expect(dropdown.locator('[data-slot="code-editor-snippet-item"]')).toHaveCount(3);
  await expect(dropdown.locator('text=IF 条件')).toBeVisible();
  await expect(dropdown.locator('text=FOREACH 循环')).toBeVisible();
  await expect(dropdown.locator('text=WHERE 1=1')).toBeVisible();
});

test('snippet insertion inserts text into editor', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const snippetToggle = field.locator('[data-slot="code-editor-snippet-toggle"]').first();
  await snippetToggle.click();

  const dropdown = page
    .locator('[data-slot="code-editor-snippet-dropdown"]')
    .filter({ has: page.locator('[data-slot="code-editor-snippet-item"]') })
    .first();
  await expect(dropdown).toBeVisible();

  const beforeContent = await field.locator('.cm-content').first().innerText();

  await dropdown.locator('text=WHERE 1=1').first().click();

  const afterContent = await field.locator('.cm-content').first().innerText();

  expect(afterContent.length).toBeGreaterThan(beforeContent.length);
  expect(afterContent).toContain('WHERE 1=1');
});

test('variable panel toggle shows/hides panel', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const varPanel = field.locator('[data-slot="code-editor-var-panel"]').first();
  await expect(varPanel).toBeVisible();
  await expect(varPanel.locator('[data-slot="code-editor-var-item-label"]')).toHaveCount(6);
  await expect(varPanel.locator('text=用户ID')).toBeVisible();
  await expect(varPanel.locator('text=用户名')).toBeVisible();
  await expect(varPanel.locator('text=商户号')).toBeVisible();
  await expect(varPanel.locator('text=订单信息')).toBeVisible();

  const varToggle = field.locator('[data-slot="code-editor-toolbar-var-toggle"]').first();
  await varToggle.click();

  const collapsedPanel = field
    .locator('[data-slot="code-editor-var-panel"][data-collapsed]')
    .first();
  await expect(collapsedPanel).toBeVisible();
});

test('variable panel insert inserts templated text', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const varPanel = field.locator('[data-slot="code-editor-var-panel"]').first();
  await expect(varPanel).toBeVisible();

  const beforeContent = await field
    .locator('.cm-content')
    .first()
    .evaluate((el) => el.textContent);

  const insertBtn = varPanel.locator('[data-slot="code-editor-var-item-insert"]').first();
  await expect(insertBtn).toBeVisible();
  await insertBtn.click();

  const afterContent = await field
    .locator('.cm-content')
    .first()
    .evaluate((el) => el.textContent);

  expect(afterContent?.length ?? 0).toBeGreaterThan(beforeContent?.length ?? 0);
  expect(afterContent).toContain('<if test=');
  expect(afterContent).toContain('</if>');
});

test('variable panel copy copies value to clipboard', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const varPanel = field.locator('[data-slot="code-editor-var-panel"]').first();
  await expect(varPanel).toBeVisible();

  const copyBtn = varPanel.locator('[data-slot="code-editor-var-item-copy"]').first();
  await expect(copyBtn).toBeVisible();

  await copyBtn.click();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe('userId');

  await context.close();
});

test('variable panel collapse hides panel content', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const varPanel = field.locator('[data-slot="code-editor-var-panel"]').first();
  await expect(varPanel).toBeVisible();

  const collapseBtn = varPanel.locator('[data-slot="code-editor-var-panel-toggle"]').first();
  await collapseBtn.click();

  const collapsedPanel = field
    .locator('[data-slot="code-editor-var-panel"][data-collapsed]')
    .first();
  await expect(collapsedPanel).toBeVisible();
});

test('execute button is visible in enhanced SQL editor', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const executeBtn = field.locator('[data-slot="code-editor-toolbar-execute"]').first();
  await expect(executeBtn).toBeVisible();
  await expect(executeBtn).toBeEnabled();
  await expect(executeBtn).toContainText(/运行|执行|Run/);
});

test('SQL result panel shows loading and error states on execute', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const executeBtn = field.locator('[data-slot="code-editor-toolbar-execute"]').first();
  await executeBtn.click();

  const resultContainer = field.locator('[data-slot="code-editor-result-container"]').first();

  const loadingOrError =
    (await resultContainer.locator('text=执行中...').isVisible({ timeout: 3000 })) ||
    (await resultContainer.locator('text=错误').isVisible({ timeout: 10000 }));

  expect(loadingOrError).toBe(true);
});

test('SQL result panel shows close button and can be dismissed', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const executeBtn = field.locator('[data-slot="code-editor-toolbar-execute"]').first();
  await executeBtn.click();

  const resultContainer = field.locator('[data-slot="code-editor-result-container"]').first();

  const closeBtn = resultContainer.locator('[data-slot="code-editor-result-close"]').first();
  await expect(closeBtn).toBeVisible({ timeout: 10000 });
  await closeBtn.click();

  await expect(resultContainer).not.toBeVisible({ timeout: 5000 });
});

test('expression editor renders with completion config', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'Expression Editor (with completion)');
  await expect(field).toBeVisible();

  const editor = field.locator('.cm-editor').first();
  await expect(editor).toBeVisible();

  const content = editor.locator('.cm-content').first();
  await expect(content).toBeVisible();
});

test('JSON editor renders with fullscreen button', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'JSON Editor (Fullscreen)');
  await expect(field).toBeVisible();

  const editor = field.locator('.cm-editor').first();
  await expect(editor).toBeVisible();

  const toolbar = field.locator('[data-slot="code-editor-toolbar"]').first();
  await expect(toolbar).toBeVisible();

  const fullscreenBtn = toolbar.locator('[data-slot="code-editor-toolbar-fullscreen"]').first();
  await expect(fullscreenBtn).toBeVisible();
});

test('read-only viewer renders with dark theme and no editing', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'Read-Only Viewer');
  await expect(field).toBeVisible();

  const editor = field.locator('.cm-editor').first();
  await expect(editor).toBeVisible();

  const content = editor.locator('.cm-content').first();
  await expect(content).toBeVisible();

  const container = field.locator('.nop-code-editor').first();
  const theme = await container.getAttribute('data-theme');
  expect(theme).toBe('dark');

  const readOnly = await content.getAttribute('aria-readonly');
  expect(readOnly).toBe('true');
});

test('captures code editor page screenshot', async ({ page }, testInfo) => {
  await openCodeEditor(page);

  const shotsDir = join(testInfo.outputDir, 'screenshots');
  await mkdir(shotsDir, { recursive: true });
  await page.screenshot({ path: join(shotsDir, 'code-editor-page.png'), fullPage: true });
});
