import { expect, test } from './fixtures.js';

async function openW4c(page: import('@playwright/test').Page) {
  await page.goto('#/w4c-composite-form-family', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '复合表单族 — combo / input-table / transfer / picker',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W4c combo — repeated composite-item field editor', () => {
  test('add appends an empty item and field edits persist in the rendered control', async ({ page }) => {
    await openW4c(page);

    const combo = page.locator('[data-testid="demo-combo"]');
    await combo.scrollIntoViewIfNeeded();

    const nameInputs = combo.locator('input[placeholder="Name"]');
    await expect(nameInputs).toHaveCount(2, { timeout: 10_000 });

    await combo.locator('[data-slot="combo-add"]').click();
    await expect(nameInputs).toHaveCount(3, { timeout: 10_000 });

    const lastNameInput = nameInputs.nth(2);
    await lastNameInput.fill('Carol');
    await expect(lastNameInput).toHaveValue('Carol');
  });

  test('remove drops an item (item control count decreases)', async ({ page }) => {
    await openW4c(page);

    const combo = page.locator('[data-testid="demo-combo"]');
    await combo.scrollIntoViewIfNeeded();

    const nameInputs = combo.locator('input[placeholder="Name"]');
    await expect(nameInputs).toHaveCount(2, { timeout: 10_000 });

    await combo.locator('[data-slot="combo-remove"]').first().click();
    await expect(nameInputs).toHaveCount(1, { timeout: 10_000 });
    await expect(nameInputs.first()).toHaveValue('Bob');
  });

  test('reorder moves an item (order of rendered controls changes)', async ({ page }) => {
    await openW4c(page);

    const combo = page.locator('[data-testid="demo-combo"]');
    await combo.scrollIntoViewIfNeeded();

    const nameInputs = combo.locator('input[placeholder="Name"]');
    await expect(nameInputs.first()).toHaveValue('Alice', { timeout: 10_000 });

    await combo.locator('[data-slot="combo-move-down"]').first().click();
    await expect(nameInputs.first()).toHaveValue('Bob', { timeout: 10_000 });
  });
});

test.describe('W4c input-table — tabular object-array field editor', () => {
  test('cell edit writes back to the row object (rendered control reflects value)', async ({ page }) => {
    await openW4c(page);

    const table = page.locator('[data-testid="demo-input-table"]');
    await table.scrollIntoViewIfNeeded();

    const amountInputs = table.locator('input[placeholder="Amount"]');
    await expect(amountInputs.first()).toHaveValue('3', { timeout: 10_000 });

    await amountInputs.first().fill('42');
    await expect(amountInputs.first()).toHaveValue('42');
  });

  test('add row appends an empty row and remove drops a row', async ({ page }) => {
    await openW4c(page);

    const table = page.locator('[data-testid="demo-input-table"]');
    await table.scrollIntoViewIfNeeded();

    const skuInputs = table.locator('input[placeholder="SKU"]');
    await expect(skuInputs).toHaveCount(2, { timeout: 10_000 });

    await table.locator('[data-slot="input-table-add"]').click();
    await expect(skuInputs).toHaveCount(3, { timeout: 10_000 });

    await table.locator('[data-slot="input-table-remove"]').first().click();
    await expect(skuInputs).toHaveCount(2, { timeout: 10_000 });
  });
});

test.describe('W4c transfer — two-pane shuttle selection', () => {
  test('selecting a candidate moves it to the selected pane', async ({ page }) => {
    await openW4c(page);

    const transfer = page.locator('[data-testid="demo-transfer"]');
    await transfer.scrollIntoViewIfNeeded();

    // selected pane initially contains the editor option
    await expect(
      transfer.locator('[data-slot="transfer-pane-selected"] [aria-label="Editor"]'),
    ).toHaveCount(1, { timeout: 10_000 });

    await transfer.locator('[aria-label="Admin"][data-slot="transfer-option-candidate"]').check();
    await transfer.locator('[data-slot="transfer-select"]').click();

    await expect(
      transfer.locator('[data-slot="transfer-pane-selected"] [aria-label="Admin"]'),
    ).toHaveCount(1, { timeout: 10_000 });
  });
});

test.describe('W4c picker — dialog-layer selection', () => {
  test('open → select → confirm writes back the value (programmatic report read)', async ({ page }) => {
    await openW4c(page);

    const report = page.locator('[data-testid="picker-owner-report"]');
    await expect(report).toHaveText('owner:—', { timeout: 10_000 });

    const picker = page.locator('[data-testid="demo-picker"]');
    await picker.scrollIntoViewIfNeeded();
    await picker.locator('[data-slot="picker-trigger"]').click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('label').filter({ hasText: 'Bob' }).click();
    await dialog.locator('[data-slot="picker-confirm"]').click();

    await expect(report).toHaveText('owner:u2', { timeout: 10_000 });
  });

  test('clear empties the field value', async ({ page }) => {
    await openW4c(page);

    const picker = page.locator('[data-testid="demo-picker"]');
    await picker.scrollIntoViewIfNeeded();
    await picker.locator('[data-slot="picker-trigger"]').click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('label').filter({ hasText: 'Bob' }).click();
    await dialog.locator('[data-slot="picker-confirm"]').click();

    const report = page.locator('[data-testid="picker-owner-report"]');
    await expect(report).toHaveText('owner:u2', { timeout: 10_000 });

    await picker.locator('[data-slot="picker-clear"]').click();
    await expect(report).toHaveText('owner:—', { timeout: 10_000 });
  });
});
