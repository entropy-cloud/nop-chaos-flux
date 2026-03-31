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

test.describe('Dataset Sidebar Panel', () => {
  test('Datasets and Fields tabs are visible', async ({ page }) => {
    await openWordEditor(page);

    await expect(
      page.getByRole('button', { name: /Datasets/ }).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('button', { name: /Fields/ }).first()
    ).toBeVisible();
  });

  test('clicking Add Dataset opens DatasetDialog in create mode', async ({ page }) => {
    await openWordEditor(page);

    const addDatasetButton = page.getByTitle('Add Dataset');
    await expect(addDatasetButton).toBeVisible({ timeout: 15000 });
    await addDatasetButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Create Dataset')).toBeVisible();
  });

  test('filling dataset name and saving creates the dataset', async ({ page }) => {
    await openWordEditor(page);

    const addDatasetButton = page.getByTitle('Add Dataset');
    await expect(addDatasetButton).toBeVisible({ timeout: 15000 });
    await addDatasetButton.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Create Dataset')).toBeVisible();

    await page.getByPlaceholder('Enter dataset name').fill('TestDataset');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('TestDataset')).toBeVisible();
  });

  test('Fields tab shows empty state when no dataset is selected', async ({ page }) => {
    await openWordEditor(page);

    const fieldsTab = page.locator('aside button').filter({ hasText: 'Fields' });
    await expect(fieldsTab).toBeVisible({ timeout: 15000 });
    await fieldsTab.click();
    await page.waitForTimeout(300);

    await expect(page.getByText('No dataset selected')).toBeVisible();
    await expect(page.getByText('Select a dataset to view its fields')).toBeVisible();
  });

  test('clicking a dataset opens the dialog in edit mode', async ({ page }) => {
    await openWordEditor(page);

    const addDatasetButton = page.getByTitle('Add Dataset');
    await expect(addDatasetButton).toBeVisible({ timeout: 15000 });
    await addDatasetButton.click();
    await page.waitForTimeout(300);

    await page.getByPlaceholder('Enter dataset name').fill('EditTarget');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('EditTarget')).toBeVisible();

    await page.getByText('EditTarget').click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Edit Dataset')).toBeVisible();
    await expect(page.getByPlaceholder('Enter dataset name')).toHaveValue('EditTarget');
  });
});
