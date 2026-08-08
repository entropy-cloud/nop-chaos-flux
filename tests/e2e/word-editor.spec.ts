import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function waitForIdleFrame(page: import('@playwright/test').Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

function savedPreview(page: import('@playwright/test').Page) {
  return page.getByTestId('word-editor-saved-preview');
}

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await expect(page.locator('.nop-word-editor-page')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 90_000 });
  await assertTrackedPageErrors(page);
}

test.describe('Word Editor Page', () => {
  test('opens word editor page', async ({ page }) => {
    await openWordEditor(page);

    await expect(page.getByRole('heading', { name: /Word Editor|Word 编辑器/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
  });

  test('displays toolbar with all control groups', async ({ page }) => {
    await openWordEditor(page);

    await expect(page.getByTestId('toolbar-undo')).toBeVisible();
    await expect(page.getByTestId('toolbar-redo')).toBeVisible();

    await expect(page.getByTestId('toolbar-bold')).toBeVisible();
    await expect(page.getByTestId('toolbar-italic')).toBeVisible();
    await expect(page.getByTestId('toolbar-underline')).toBeVisible();

    await expect(page.getByTestId('paragraph-align-left')).toBeVisible();
    await expect(page.getByTestId('paragraph-align-center')).toBeVisible();

    await expect(page.getByTestId('insert-table')).toBeVisible();
    await expect(page.getByTestId('insert-hyperlink')).toBeVisible();
    await expect(page.getByTestId('insert-chart')).toBeVisible();
    await expect(page.getByTestId('insert-code')).toBeVisible();

    await expect(page.getByTestId('insert-expression')).toBeVisible();
    await expect(page.getByTestId('insert-if-block')).toBeVisible();
    await expect(page.getByTestId('insert-for-loop')).toBeVisible();
    await expect(page.getByTestId('insert-output')).toBeVisible();

    await expect(page.getByRole('button', { name: /放大|Zoom In/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /缩小|Zoom Out/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /打印|Print/ })).toBeVisible();

    await expect(page.getByTestId('search-replace')).toBeVisible();
  });

  test('displays left panel with Datasets and Fields tabs', async ({ page }) => {
    await openWordEditor(page);

    const datasetsTab = page.getByRole('tab', { name: '数据集' }).first();
    await expect(datasetsTab).toBeVisible({ timeout: 15000 });

    const fieldsTab = page.getByRole('tab', { name: '字段' }).first();
    await expect(fieldsTab).toBeVisible();

    await fieldsTab.click();

    await expect(page.getByText('未选择数据集')).toBeVisible();
  });

  test('displays right panel with Outline', async ({ page }) => {
    await openWordEditor(page);

    await expect(page.getByText('大纲')).toBeVisible({
      timeout: 15000,
    });
  });

  test('can type text in editor', async ({ page }) => {
    await openWordEditor(page);

    const canvasElement = page.locator('canvas').first();
    await expect(canvasElement).toBeVisible({ timeout: 15000 });
    const marker = `Hello from E2E test ${Date.now()}`;
    await canvasElement.click();
    await waitForIdleFrame(page);

    await page.keyboard.type(marker);

    const wordCountDisplay = page.locator('[class*="tabular-nums"]').first();
    await expect(wordCountDisplay).toBeVisible();
    await expect(savedPreview(page)).toContainText(marker, { timeout: 10000 });
  });

  test('formatting toolbar buttons are visible and respond without breaking the editor surface', async ({ page }) => {
    await openWordEditor(page);

    const boldButton = page.getByTestId('toolbar-bold');
    await expect(boldButton).toBeVisible({ timeout: 15000 });
    await boldButton.click();

    const italicButton = page.getByTestId('toolbar-italic');
    await expect(italicButton).toBeVisible();
    await italicButton.click();

    const underlineButton = page.getByTestId('toolbar-underline');
    await expect(underlineButton).toBeVisible();
    await underlineButton.click();

    await expect(boldButton).toBeVisible();
    await expect(page.getByRole('heading', { name: /Word Editor|Word 编辑器/ })).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('hyperlink toolbar action opens its dialog surface', async ({ page }) => {
    await openWordEditor(page);

    const hyperlinkButton = page.getByTestId('insert-hyperlink');
    await expect(hyperlinkButton).toBeVisible({ timeout: 15000 });
    await hyperlinkButton.click();

    await expect(page.getByText('插入超链接')).toBeVisible();

    await expect(page.getByPlaceholder('显示文本')).toBeVisible();
    await expect(page.getByPlaceholder('URL (https://...)')).toBeVisible();

    await page.getByRole('button', { name: '取消' }).first().click();
    await expect(page.getByText('插入超链接')).toHaveCount(0);
  });

  test('expression toolbar action opens its dialog surface', async ({ page }) => {
    await openWordEditor(page);

    const exprButton = page.getByTestId('insert-expression');
    await expect(exprButton).toBeVisible({ timeout: 15000 });
    await exprButton.click();

    await expect(page.getByText('插入模板表达式')).toBeVisible();

    const elTab = page.getByRole('tab', { name: 'EL 表达式' });
    await expect(elTab).toBeVisible();

    await expect(page.getByPlaceholder('${entity.fieldName}')).toBeVisible();
  });

  test('dataset panel add action opens its creation dialog', async ({ page }) => {
    await openWordEditor(page);

    const addDatasetButton = page.getByRole('button', { name: '添加数据集' }).first();
    await expect(addDatasetButton).toBeVisible({ timeout: 15000 });
    await addDatasetButton.click();

    await expect(page.getByRole('heading', { name: '创建数据集' })).toBeVisible();

    await expect(page.getByPlaceholder('输入数据集名称')).toBeVisible();
    await expect(page.getByPlaceholder('输入数据集描述')).toBeVisible();

    const typeSelect = page
      .locator('select')
      .filter({ hasText: /SQL|API|Mongo|静态/ })
      .first();
    await expect(typeSelect).toBeVisible();
  });

  test('save action writes a persisted document snapshot', async ({ page }) => {
    await openWordEditor(page);

    const saveButton = page.getByRole('button', { name: '保存' });
    await expect(saveButton).toBeVisible({ timeout: 15000 });
    await saveButton.click();

    await expect(page.getByTestId('word-editor-save-status')).toContainText('已保存', { timeout: 5000 });
    await expect(savedPreview(page)).not.toContainText('无文档数据');
  });

  test('search toolbar action opens the search panel', async ({ page }) => {
    await openWordEditor(page);

    const searchButton = page.getByTestId('search-replace');
    await expect(searchButton).toBeVisible({ timeout: 15000 });
    await searchButton.click();

    await expect(page.getByPlaceholder('搜索...')).toBeVisible();
    await expect(page.getByPlaceholder('替换...')).toBeVisible();
  });

  test('chart toolbar action opens its dialog surface', async ({ page }) => {
    await openWordEditor(page);

    const chartButton = page.getByTestId('insert-chart');
    await expect(chartButton).toBeVisible({ timeout: 15000 });
    await chartButton.click();

    await expect(page.getByText('创建图表')).toBeVisible();

    await expect(page.getByPlaceholder('输入图表名称')).toBeVisible();

    await expect(page.getByPlaceholder('选择数据集（如 dataset1）')).toBeVisible();
    await expect(page.getByPlaceholder('分类字段名（如 category）')).toBeVisible();
  });

  test('barcode toolbar action opens its dialog surface', async ({ page }) => {
    await openWordEditor(page);

    const codeButton = page.getByTestId('insert-code');
    await expect(codeButton).toBeVisible({ timeout: 15000 });
    await codeButton.click();

    await expect(page.getByText('创建编码')).toBeVisible();

    await expect(page.getByPlaceholder('输入编码名称')).toBeVisible();
    await expect(page.getByPlaceholder('输入数据集 ID')).toBeVisible();
    await expect(page.getByPlaceholder('输入值字段')).toBeVisible();
  });
});
