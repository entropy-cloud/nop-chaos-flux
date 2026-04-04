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

test.describe('Template Expression Insertion', () => {
  test('Insert Expression button is visible in toolbar', async ({ page }) => {
    await openWordEditor(page);

    const insertExprButton = page.getByTitle('Insert Expression');
    await expect(insertExprButton).toBeVisible({ timeout: 15000 });
  });

  test('clicking Insert Expression opens ExprInsertDialog', async ({ page }) => {
    await openWordEditor(page);

    const insertExprButton = page.getByTitle('Insert Expression');
    await expect(insertExprButton).toBeVisible({ timeout: 15000 });
    await insertExprButton.click();

    await expect(
      page.getByText('Insert Template Expression')
    ).toBeVisible({ timeout: 5000 });
  });

  test('EL Expression type is selected by default', async ({ page }) => {
    await openWordEditor(page);

    await page.getByTitle('Insert Expression').click();
    await page.waitForTimeout(300);

    const elTab = page.getByRole('tab', { name: 'EL Expression' });
    await expect(elTab).toBeVisible();

    await expect(page.getByPlaceholder('${entity.fieldName}')).toBeVisible();
  });

  test('XPL Tag type can be selected', async ({ page }) => {
    await openWordEditor(page);

    await page.getByTitle('Insert Expression').click();
    await page.waitForTimeout(300);

    const xplTab = page.getByRole('tab', { name: 'XPL Tag' });
    await xplTab.click();

    await expect(page.getByText('Tag Name', { exact: false })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('tag name dropdown shows available tags', async ({ page }) => {
    await openWordEditor(page);

    await page.getByTitle('Insert Expression').click();
    await page.waitForTimeout(300);

    await page.getByRole('tab', { name: 'XPL Tag' }).click();
    await page.waitForTimeout(200);

    const tagSelect = page.getByRole('combobox');
    await expect(tagSelect).toBeVisible();
    await expect(tagSelect).toHaveValue('c:if');

    const tags = ['c:if', 'c:for', 'c:forEach', 'c:choose', 'c:when', 'c:otherwise', 'c:set', 'c:out'];
    for (const tag of tags) {
      await expect(tagSelect.locator(`option[value="${tag}"]`)).toHaveCount(1);
    }
  });

  test('Cancel closes the dialog', async ({ page }) => {
    await openWordEditor(page);

    await page.getByTitle('Insert Expression').click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Insert Template Expression')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Insert Template Expression')).toHaveCount(0);
  });
});
