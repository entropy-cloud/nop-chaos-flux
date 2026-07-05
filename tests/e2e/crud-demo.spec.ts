import { expect, test } from './fixtures.js';

async function openCrudDemo(page: import('@playwright/test').Page) {
  await page.goto('#/crud-demo', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: /用户管理/, level: 1 }),
  ).toBeVisible({ timeout: 15_000 });
}

function bodyRows(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="user-crud"] tbody tr');
}

function queryControls(page: import('@playwright/test').Page) {
  return page.locator('[data-slot="crud-query-controls"]');
}

test.describe('Standard CRUD demo (#/crud-demo)', () => {
  test('loads the seeded list and publishes the total in the footer', async ({ page }) => {
    await openCrudDemo(page);

    await expect(page.getByText('张三').first()).toBeVisible({ timeout: 10_000 });
    await expect(bodyRows(page)).toHaveCount(5);
    await expect(page.locator('[data-slot="crud-footer-toolbar"]')).toContainText('共 5 条');
  });

  test('filters rows by keyword and resets back to the full list', async ({ page }) => {
    await openCrudDemo(page);

    await expect(page.getByText('张三').first()).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('关键字').fill('Alice');
    await queryControls(page).getByRole('button', { name: '搜索' }).click();

    await expect(page.getByText('Alice').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('张三')).toHaveCount(0);

    await queryControls(page).getByRole('button', { name: '重置' }).click();

    await expect(page.getByText('张三').first()).toBeVisible({ timeout: 10_000 });
  });

  test('creates a user via the add dialog and appends a new row', async ({ page }) => {
    await openCrudDemo(page);

    await expect(bodyRows(page)).toHaveCount(5, { timeout: 10_000 });

    await page.getByTestId('btn-add').click();
    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByLabel('姓名').fill('测试用户');
    await dialog.getByLabel('邮箱').fill('tester@example.com');
    await dialog.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('新增成功')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveCount(0);
    await expect(bodyRows(page)).toHaveCount(6, { timeout: 10_000 });
    await expect(page.getByText('tester@example.com')).toBeVisible();
  });

  test('edits a row through the edit dialog with prefilled values', async ({ page }) => {
    await openCrudDemo(page);

    await expect(page.getByText('张三').first()).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('btn-edit').first().click();
    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByLabel('姓名')).toHaveValue('张三');
    await expect(dialog.getByLabel('邮箱')).toHaveValue('zhangsan@example.com');

    await dialog.getByLabel('姓名').fill('张三丰');
    await dialog.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('更新成功')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('张三丰').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('张三', { exact: true })).toHaveCount(0);
  });

  test('deletes a row after confirming and is a no-op when cancelled', async ({ page }) => {
    await openCrudDemo(page);

    await expect(bodyRows(page)).toHaveCount(5, { timeout: 10_000 });
    await expect(page.getByText('张三').first()).toBeVisible();

    await page.getByTestId('btn-delete').first().click();
    const confirmDialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });

    await confirmDialog.getByRole('button', { name: '取消' }).click();
    await expect(confirmDialog).toHaveCount(0, { timeout: 5_000 });
    await expect(bodyRows(page)).toHaveCount(5);
    await expect(page.getByText('张三').first()).toBeVisible();

    await page.getByTestId('btn-delete').first().click();
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
    await confirmDialog.getByRole('button', { name: '确认' }).click();

    await expect(page.getByText('删除成功')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('张三', { exact: true })).toHaveCount(0);
    await expect(bodyRows(page)).toHaveCount(4, { timeout: 10_000 });
  });

  test('bulk-deletes selected rows after confirming', async ({ page }) => {
    await openCrudDemo(page);

    await expect(bodyRows(page)).toHaveCount(5, { timeout: 10_000 });

    const bulkDelete = page.getByTestId('btn-bulk-delete').first();
    await expect(bulkDelete).toBeDisabled();

    const rowCheckboxes = page.locator('tbody [data-slot="checkbox"]');
    await rowCheckboxes.nth(0).click();
    await rowCheckboxes.nth(1).click();

    await expect(bulkDelete).toBeEnabled({ timeout: 5_000 });

    await bulkDelete.click();
    const confirmDialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
    await confirmDialog.getByRole('button', { name: '确认' }).click();

    await expect(page.getByText('批量删除成功')).toBeVisible({ timeout: 10_000 });
    await expect(bodyRows(page)).toHaveCount(3, { timeout: 10_000 });
  });
});
