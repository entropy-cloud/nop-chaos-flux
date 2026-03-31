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

test('loads word editor page with toolbar', async ({ page }) => {
  await openWordEditor(page);

  await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('toolbar contains all control groups', async ({ page }) => {
  await openWordEditor(page);

  const toolbar = page.locator('.flex.flex-row.gap-1').first();
  await expect(toolbar).toBeVisible();

  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Redo' })).toBeVisible();

  await expect(page.getByRole('combobox').first()).toBeVisible();

  await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Italic' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Underline' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Align Left' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Center' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Insert Table' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Zoom In' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zoom Out' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
});

test('search replace toggle works', async ({ page }) => {
  await openWordEditor(page);

  const searchButton = page.getByRole('button', { name: 'Search & Replace' });
  await expect(searchButton).toBeVisible();
  await searchButton.click();

  await expect(page.getByPlaceholder('Search...')).toBeVisible();
  await expect(page.getByPlaceholder('Replace...')).toBeVisible();

  const closeButton = page.getByRole('button', { name: 'Close' });
  await closeButton.click();

  await expect(page.getByPlaceholder('Search...')).toHaveCount(0);
});
