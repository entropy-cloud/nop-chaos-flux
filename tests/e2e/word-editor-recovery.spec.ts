import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// This suite mutates the localStorage-backed word-editor recovery surface and stays serial intentionally.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

const DOCUMENT_KEY = 'nop-word-editor-document';
const DATASETS_KEY = 'nop-word-editor-datasets';

function savedPreview(page: import('@playwright/test').Page) {
  return page.getByTestId('word-editor-saved-preview');
}

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await expect(page.locator('.nop-word-editor-page')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 90_000 });
  await assertTrackedPageErrors(page);
}

test.describe('Word Editor Recovery (we-7 import + we-3 selection + we-4 confirmations)', () => {
  test('seeded valid persisted document hydrates into the editor on open (import path)', async ({ page }) => {
    await page.goto('/#/word-editor', { waitUntil: 'commit' });
    await page.evaluate(({ documentKey, datasetsKey }) => {
      localStorage.removeItem(documentKey);
      localStorage.removeItem(datasetsKey);
      localStorage.setItem(
        documentKey,
        JSON.stringify({
          data: {
            header: [],
            main: [{ value: 'Seeded Import Marker' }, { value: ' Second Part' }],
            footer: [],
            charts: [],
            codes: [],
          },
          paperSettings: {
            width: 595,
            height: 842,
            direction: 'vertical',
            margins: [100, 120, 100, 120],
          },
          savedAt: new Date().toISOString(),
        }),
      );
    }, { documentKey: DOCUMENT_KEY, datasetsKey: DATASETS_KEY });
    await page.reload({ waitUntil: 'commit' });

    await openWordEditor(page);
    await expect(savedPreview(page)).toContainText('Seeded Import Marker Second Part', {
      timeout: 15_000,
    });
  });

  test('corrupt persisted JSON root ("null") does not crash the page (recovery fail-closed)', async ({ page }) => {
    await page.goto('/#/word-editor', { waitUntil: 'commit' });
    await page.evaluate(({ documentKey, datasetsKey }) => {
      localStorage.removeItem(documentKey);
      localStorage.removeItem(datasetsKey);
      localStorage.setItem(documentKey, 'null');
    }, { documentKey: DOCUMENT_KEY, datasetsKey: DATASETS_KEY });
    await page.reload({ waitUntil: 'commit' });

    await openWordEditor(page);
    await expect(savedPreview(page)).toContainText('无文档数据', { timeout: 15_000 });
  });

  test('corrupt persisted JSON syntax does not crash the page (recovery fail-closed)', async ({ page }) => {
    await page.goto('/#/word-editor', { waitUntil: 'commit' });
    await page.evaluate(({ documentKey, datasetsKey }) => {
      localStorage.removeItem(documentKey);
      localStorage.removeItem(datasetsKey);
      localStorage.setItem(documentKey, '{bad json');
    }, { documentKey: DOCUMENT_KEY, datasetsKey: DATASETS_KEY });
    await page.reload({ waitUntil: 'commit' });

    await openWordEditor(page);
    await expect(savedPreview(page)).toContainText('无文档数据', { timeout: 15_000 });
  });

  test('selection echo: formatting toolbar reflects the live selection state', async ({ page }) => {
    await page.goto('/#/word-editor', { waitUntil: 'commit' });
    await page.evaluate(({ documentKey, datasetsKey }) => {
      localStorage.removeItem(documentKey);
      localStorage.removeItem(datasetsKey);
    }, { documentKey: DOCUMENT_KEY, datasetsKey: DATASETS_KEY });
    await page.reload({ waitUntil: 'commit' });

    await openWordEditor(page);

    const canvasElement = page.locator('canvas').first();
    await expect(canvasElement).toBeVisible({ timeout: 15_000 });
    await canvasElement.click();
    await page.waitForTimeout(500);
    await page.keyboard.type(`Selection marker ${Date.now()}`);

    const boldButton = page.getByTestId('toolbar-bold');
    await expect(boldButton).toBeVisible({ timeout: 15_000 });
    await expect(boldButton).toHaveAttribute('aria-pressed', 'false');
    await boldButton.click();
    await expect(boldButton).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
    await expect(boldButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('selecting a dataset makes its fields reachable in the Fields tab (P1-1 confirmation)', async ({ page }) => {
    await page.goto('/#/word-editor', { waitUntil: 'commit' });
    await page.evaluate(({ documentKey, datasetsKey }) => {
      localStorage.removeItem(documentKey);
      localStorage.removeItem(datasetsKey);
    }, { documentKey: DOCUMENT_KEY, datasetsKey: DATASETS_KEY });
    await page.reload({ waitUntil: 'commit' });

    await openWordEditor(page);

    const addDatasetButton = page.getByRole('button', { name: /Add Dataset|添加数据集/ }).first();
    await expect(addDatasetButton).toBeVisible({ timeout: 15_000 });
    await addDatasetButton.click();
    await expect(page.getByText(/Create Dataset|创建数据集/)).toBeVisible();

    await page.getByPlaceholder(/Enter dataset name|输入数据集名称/).fill('FieldSource');
    await page.getByRole('button', { name: '添加列' }).click();
    await page.getByPlaceholder(/Column name|列名/).fill('amount');
    await page.getByPlaceholder(/Column label|列标签/).fill('Amount');
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('FieldSource')).toBeVisible();

    await page.getByText('FieldSource').click();
    await expect(page.getByText(/Edit Dataset|编辑数据集/)).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();

    await page.getByRole('tab', { name: '字段' }).click();
    await expect(page.getByText('Amount').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('未选择数据集')).toHaveCount(0);
  });

  test('deleting a dataset through the row menu removes it after confirmation (P1-2 confirmation)', async ({ page }) => {
    await page.goto('/#/word-editor', { waitUntil: 'commit' });
    await page.evaluate(({ documentKey, datasetsKey }) => {
      localStorage.removeItem(documentKey);
      localStorage.removeItem(datasetsKey);
      localStorage.setItem(
        datasetsKey,
        JSON.stringify([
          {
            id: 'ds-e2e-delete',
            name: 'DoomedDataset',
            description: '',
            type: 'static',
            columns: [],
          },
        ]),
      );
    }, { documentKey: DOCUMENT_KEY, datasetsKey: DATASETS_KEY });
    await page.reload({ waitUntil: 'commit' });

    await openWordEditor(page);
    await expect(page.getByText('DoomedDataset')).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('数据集选项').click();
    await page.getByText('删除数据集').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '删除数据集' }).click();

    await expect(page.getByText('DoomedDataset')).toHaveCount(0);
    await expect(page.getByText('未找到数据集')).toBeVisible();
  });
});
