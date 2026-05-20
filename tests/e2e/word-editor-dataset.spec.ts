import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// This suite mutates one localStorage-backed word-editor state surface and stays serial intentionally.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

async function readSavedDatasets(page: import('@playwright/test').Page) {
  return page.evaluate(() => localStorage.getItem('nop-word-editor-datasets'));
}

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await page.evaluate(() => {
    localStorage.removeItem('nop-word-editor-document');
    localStorage.removeItem('nop-word-editor-datasets');
  });
  await page.reload({ waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('tab', { name: '数据集' })).toBeVisible({ timeout: 15000 });
  await assertTrackedPageErrors(page);
}

async function openDatasetDialog(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: '数据集' }).click();
  const addDatasetButton = page.getByRole('button', { name: /Add Dataset|添加数据集/ }).first();
  await expect(addDatasetButton).toBeVisible({ timeout: 15000 });
  await addDatasetButton.click();
  await expect(page.getByText('Create Dataset')).toBeVisible();
}

test.describe('Dataset Sidebar Panel', () => {
  test('Datasets and Fields tabs are visible', async ({ page }) => {
    await openWordEditor(page);

    await expect(page.getByRole('tab', { name: '数据集' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: '字段' })).toBeVisible();
  });

  test('clicking Add Dataset opens DatasetDialog in create mode', async ({ page }) => {
    await openWordEditor(page);

    await openDatasetDialog(page);
  });

  test('filling dataset name and saving creates the dataset', async ({ page }) => {
    await openWordEditor(page);

    await openDatasetDialog(page);

    await page.getByPlaceholder('Enter dataset name').fill('TestDataset');
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('TestDataset')).toBeVisible();

    await page.getByRole('button', { name: '保存' }).click();
    await expect.poll(() => readSavedDatasets(page), { timeout: 15_000 }).toContain('TestDataset');

    await page.reload({ waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('TestDataset')).toBeVisible();
  });

  test('Fields tab shows empty state when no dataset is selected', async ({ page }) => {
    await openWordEditor(page);

    const fieldsTab = page.getByRole('tab', { name: '字段' });
    await expect(fieldsTab).toBeVisible({ timeout: 15000 });
    await fieldsTab.click();

    await expect(page.getByText('未选择数据集')).toBeVisible();
    await expect(page.getByText('选择数据集查看字段').first()).toBeVisible();
  });

  test('clicking a dataset opens the dialog in edit mode', async ({ page }) => {
    await openWordEditor(page);

    await openDatasetDialog(page);

    await page.getByPlaceholder('Enter dataset name').fill('EditTarget');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('EditTarget')).toBeVisible();

    await page.getByText('EditTarget').click();

    await expect(page.getByText('Edit Dataset')).toBeVisible();
    await expect(page.getByPlaceholder('Enter dataset name')).toHaveValue('EditTarget');
  });
});
