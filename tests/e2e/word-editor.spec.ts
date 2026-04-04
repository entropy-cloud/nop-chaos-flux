import { expect, test } from '@playwright/test';

async function openWordEditor(page: import('@playwright/test').Page) {
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

  await page.getByRole('button', { name: 'Word Editor' }).click();

  await expect(page.getByText('Word Editor').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Word Editor Page', () => {
  test('opens word editor page', async ({ page }) => {
    await openWordEditor(page);

    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('displays toolbar with all control groups', async ({ page }) => {
    await openWordEditor(page);

    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Redo' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Italic' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Underline' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Align Left' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Center' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Insert Table (3×3)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Insert Hyperlink' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Insert Chart' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Insert Barcode/QR Code' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Insert Expression' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'If Block' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'For Loop' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Output' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Zoom In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom Out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Search & Replace' })).toBeVisible();
  });

  test('displays left panel with Datasets and Fields tabs', async ({ page }) => {
    await openWordEditor(page);

    const datasetsTab = page.getByRole('tab', { name: 'Datasets' }).first();
    await expect(datasetsTab).toBeVisible({ timeout: 15000 });

    const fieldsTab = page.getByRole('tab', { name: 'Fields' }).first();
    await expect(fieldsTab).toBeVisible();

    await fieldsTab.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('No dataset selected')).toBeVisible();
  });

  test('displays right panel with Outline', async ({ page }) => {
    await openWordEditor(page);

    await expect(page.getByRole('heading', { name: 'Outline', level: 2 })).toBeVisible({ timeout: 15000 });
  });

  test('can type text in editor', async ({ page }) => {
    await openWordEditor(page);

    const canvasElement = page.locator('canvas').first();
    await expect(canvasElement).toBeVisible({ timeout: 15000 });
    await canvasElement.click();
    await page.waitForTimeout(300);

    await page.keyboard.type('Hello from E2E test');
    await page.waitForTimeout(500);

    const wordCountDisplay = page.locator('[class*="tabular-nums"]').first();
    await expect(wordCountDisplay).toBeVisible();
  });

  test('toolbar buttons are clickable', async ({ page }) => {
    await openWordEditor(page);

    const boldButton = page.getByTitle('Bold');
    await expect(boldButton).toBeVisible({ timeout: 15000 });
    await boldButton.click();

    const italicButton = page.getByTitle('Italic');
    await expect(italicButton).toBeVisible();
    await italicButton.click();

    const underlineButton = page.getByTitle('Underline');
    await expect(underlineButton).toBeVisible();
    await underlineButton.click();

    await page.waitForTimeout(300);

    await expect(boldButton).toBeVisible();
    await expect(italicButton).toBeVisible();
    await expect(underlineButton).toBeVisible();
  });

  test('can open hyperlink dialog', async ({ page }) => {
    await openWordEditor(page);

    const hyperlinkButton = page.getByTitle('Insert Hyperlink');
    await expect(hyperlinkButton).toBeVisible({ timeout: 15000 });
    await hyperlinkButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Insert Hyperlink')).toBeVisible();

    await expect(page.getByPlaceholder('Display text')).toBeVisible();
    await expect(page.getByPlaceholder('URL (https://...)')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await page.waitForTimeout(300);
  });

  test('can open expression insert dialog', async ({ page }) => {
    await openWordEditor(page);

    const exprButton = page.getByTitle('Insert Expression');
    await expect(exprButton).toBeVisible({ timeout: 15000 });
    await exprButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Insert Template Expression')).toBeVisible();

    const elTab = page.getByRole('tab', { name: 'EL Expression' });
    await expect(elTab).toBeVisible();

    await expect(page.getByPlaceholder('${entity.fieldName}')).toBeVisible();
  });

  test('can open dataset dialog', async ({ page }) => {
    await openWordEditor(page);

    const addDatasetButton = page.getByTitle('Add Dataset');
    await expect(addDatasetButton).toBeVisible({ timeout: 15000 });
    await addDatasetButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Create Dataset')).toBeVisible();

    await expect(page.getByPlaceholder('Enter dataset name')).toBeVisible();
    await expect(page.getByPlaceholder('Enter dataset description')).toBeVisible();

    const typeSelect = page.locator('select').filter({ hasText: /SQL|API|Mongo|Static/ }).first();
    await expect(typeSelect).toBeVisible();
  });

  test('can save document', async ({ page }) => {
    await openWordEditor(page);

    const saveButton = page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible({ timeout: 15000 });
    await saveButton.click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Document saved')).toBeVisible({ timeout: 5000 });
  });

  test('can open search panel', async ({ page }) => {
    await openWordEditor(page);

    const searchButton = page.getByTitle('Search & Replace');
    await expect(searchButton).toBeVisible({ timeout: 15000 });
    await searchButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByPlaceholder('Search...')).toBeVisible();
    await expect(page.getByPlaceholder('Replace...')).toBeVisible();
  });

  test('can open chart dialog', async ({ page }) => {
    await openWordEditor(page);

    const chartButton = page.getByTitle('Insert Chart');
    await expect(chartButton).toBeVisible({ timeout: 15000 });
    await chartButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Create Chart')).toBeVisible();

    await expect(page.getByPlaceholder('Enter chart name')).toBeVisible();

    const chartTypeSelect = page.locator('select').filter({ hasText: /Bar|Line|Pie/ }).first();
    await expect(chartTypeSelect).toBeVisible();

    await expect(page.getByPlaceholder('Select dataset (e.g., dataset1)')).toBeVisible();
    await expect(page.getByPlaceholder('Category field name (e.g., category)')).toBeVisible();
  });

  test('can open code dialog', async ({ page }) => {
    await openWordEditor(page);

    const codeButton = page.getByTitle('Insert Barcode/QR Code');
    await expect(codeButton).toBeVisible({ timeout: 15000 });
    await codeButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Create Code')).toBeVisible();

    await expect(page.getByPlaceholder('Enter code name')).toBeVisible();
    await expect(page.getByPlaceholder('Enter dataset ID')).toBeVisible();
    await expect(page.getByPlaceholder('Enter value field')).toBeVisible();
  });
});
