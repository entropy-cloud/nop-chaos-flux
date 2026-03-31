import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function openCodeEditor(page: import('@playwright/test').Page) {
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
  await page.getByRole('button', { name: 'Code Editor' }).click();
  await expect(page.locator('text=Code Editor Playground')).toBeVisible({ timeout: 15000 });
}

/**
 * Find the code-editor container that has a label matching the given text.
 * The label is in a .nop-field__label element, and the editor is a sibling
 * within the same form field wrapper.
 */
function findEditorByLabel(page: import('@playwright/test').Page, labelText: string) {
  return page.locator('.nop-field').filter({ hasText: labelText }).first();
}

test('navigates to code editor page and renders all editor types', async ({ page }) => {
  await openCodeEditor(page);

  await expect(page.locator('.nop-field').filter({ hasText: 'Expression Editor (with completion)' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'Template Mode' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'SQL Editor' })).toHaveCount(2);
  await expect(page.locator('.nop-field').filter({ hasText: 'SQL Editor (Format + Snippets + Variables + Execution)' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'JSON Editor (Fullscreen)' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'JavaScript Editor' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'Read-Only Viewer' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'CSS Editor' })).toBeVisible();
  await expect(page.locator('.nop-field').filter({ hasText: 'Plain Text' })).toBeVisible();
});

test('SQL enhanced editor has all toolbar buttons', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const toolbar = field.locator('.nop-code-editor__toolbar').first();
  await expect(toolbar).toBeVisible();

  await expect(toolbar.locator('.nop-code-editor__toolbar-format')).toBeVisible();
  await expect(toolbar.locator('.nop-code-editor__snippet-panel')).toBeVisible();
  await expect(toolbar.locator('.nop-code-editor__toolbar-var-toggle')).toBeVisible();
  await expect(toolbar.locator('.nop-code-editor__toolbar-execute')).toBeVisible();
});

test('SQL format button formats the editor content', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const formatBtn = field.locator('.nop-code-editor__toolbar-format').first();
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

  const snippetToggle = field.locator('.nop-code-editor__snippet-toggle').first();
  await expect(snippetToggle).toBeVisible();

  await snippetToggle.click();

  const dropdown = field.locator('.nop-code-editor__snippet-dropdown').first();
  await expect(dropdown).toBeVisible();

  await expect(dropdown.locator('.nop-code-editor__snippet-item')).toHaveCount(3);
  await expect(dropdown.locator('text=IF 条件')).toBeVisible();
  await expect(dropdown.locator('text=FOREACH 循环')).toBeVisible();
  await expect(dropdown.locator('text=WHERE 1=1')).toBeVisible();
});

test('snippet insertion inserts text into editor', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const snippetToggle = field.locator('.nop-code-editor__snippet-toggle').first();
  await snippetToggle.click();

  const dropdown = field.locator('.nop-code-editor__snippet-dropdown').first();
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

  const varPanel = field.locator('.nop-code-editor__var-panel').first();
  await expect(varPanel).toBeVisible();
  await expect(varPanel.locator('.nop-code-editor__var-item-label')).toHaveCount(6);
  await expect(varPanel.locator('text=用户ID')).toBeVisible();
  await expect(varPanel.locator('text=用户名')).toBeVisible();
  await expect(varPanel.locator('text=商户号')).toBeVisible();
  await expect(varPanel.locator('text=订单信息')).toBeVisible();

  const varToggle = field.locator('.nop-code-editor__toolbar-var-toggle').first();
  await varToggle.click();

  const collapsedPanel = field.locator('.nop-code-editor__var-panel--collapsed').first();
  await expect(collapsedPanel).toBeVisible();
});

test('variable panel insert inserts templated text', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const varPanel = field.locator('.nop-code-editor__var-panel').first();
  await expect(varPanel).toBeVisible();

  const beforeContent = await field.locator('.cm-content').first().evaluate((el) => el.textContent);

  const insertBtn = varPanel.locator('.nop-code-editor__var-item-insert').first();
  await expect(insertBtn).toBeVisible();
  await insertBtn.click();

  const afterContent = await field.locator('.cm-content').first().evaluate((el) => el.textContent);

  expect((afterContent?.length ?? 0)).toBeGreaterThan(beforeContent?.length ?? 0);
  expect(afterContent).toContain('<if test=');
  expect(afterContent).toContain('</if>');
});

test('variable panel copy copies value to clipboard', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const varPanel = field.locator('.nop-code-editor__var-panel').first();
  await expect(varPanel).toBeVisible();

  const copyBtn = varPanel.locator('.nop-code-editor__var-item-copy').first();
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

  const varPanel = field.locator('.nop-code-editor__var-panel').first();
  await expect(varPanel).toBeVisible();

  const collapseBtn = varPanel.locator('.nop-code-editor__var-panel-toggle').first();
  await collapseBtn.click();

  const collapsedPanel = field.locator('.nop-code-editor__var-panel--collapsed').first();
  await expect(collapsedPanel).toBeVisible();
});

test('execute button is visible in enhanced SQL editor', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const executeBtn = field.locator('.nop-code-editor__toolbar-execute').first();
  await expect(executeBtn).toBeVisible();
  await expect(executeBtn).toContainText('▶ Run');
});

test('SQL result panel shows loading and error states on execute', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const executeBtn = field.locator('.nop-code-editor__toolbar-execute').first();
  await executeBtn.click();

  const resultContainer = field.locator('.nop-code-editor__result-container').first();

  const loadingOrError = await resultContainer.locator('text=Executing...').isVisible({ timeout: 3000 })
    || await resultContainer.locator('text=Error').isVisible({ timeout: 10000 });

  expect(loadingOrError).toBe(true);
});

test('SQL result panel shows close button and can be dismissed', async ({ page }) => {
  await openCodeEditor(page);

  const field = findEditorByLabel(page, 'SQL Editor (Format + Snippets + Variables + Execution)');
  await expect(field).toBeVisible();

  const executeBtn = field.locator('.nop-code-editor__toolbar-execute').first();
  await executeBtn.click();

  const resultContainer = field.locator('.nop-code-editor__result-container').first();

  const closeBtn = resultContainer.locator('.nop-code-editor__result-close').first();
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

  const toolbar = field.locator('.nop-code-editor__toolbar').first();
  await expect(toolbar).toBeVisible();

  const fullscreenBtn = toolbar.locator('.nop-code-editor__toolbar-fullscreen').first();
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
