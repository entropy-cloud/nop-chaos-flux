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
  // v3 picker contract (flux-guide/09-amis-migration.md): the popup surface is
  // `pickerPopup`; the sole content definition is `pickerSchema`. The w4c demo
  // pickers are popup-only (no pickerSchema region), so per the G1 adjudication
  // (picker-schema-override.test.tsx) the dialog opens with an empty body and
  // Confirm is a no-op close — selection-write semantics are covered separately
  // in flux-renderers-form-advanced unit tests which exercise pickerSchema.

  test('open → empty-body dialog → confirm closes it (no selection write)', async ({
    page,
  }) => {
    await openW4c(page);

    const report = page.locator('[data-testid="picker-owner-report"]');
    await expect(report).toHaveText('owner:—', { timeout: 10_000 });

    const picker = page.locator('[data-testid="demo-picker"]');
    await picker.scrollIntoViewIfNeeded();
    await picker.locator('[data-slot="picker-trigger"]').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Popup-only, nothing published → Confirm is disabled (confirmDisabled
    // guard); the popup closes via Cancel.
    await expect(dialog.locator('[data-slot="picker-confirm"]')).toBeDisabled();
    await dialog.getByRole('button', { name: '取消' }).click();

    await expect(dialog).toBeHidden({ timeout: 5_000 });
    // No selection was made → owner stays at its default placeholder.
    await expect(report).toHaveText('owner:—', { timeout: 5_000 });
  });

  test('picker-clear stays disabled while the field has no committed value', async ({ page }) => {
    await openW4c(page);

    const picker = page.locator('[data-testid="demo-picker"]');
    await picker.scrollIntoViewIfNeeded();

    // Popup-only picker can never commit a value (G1: no pickerSchema content),
    // so the canonical clear handle renders disabled at the empty state — it
    // must not be clickable.
    const clear = picker.locator('[data-slot="picker-clear"]');
    await expect(clear).toBeDisabled({ timeout: 10_000 });

    const report = page.locator('[data-testid="picker-owner-report"]');
    await expect(report).toHaveText('owner:—', { timeout: 10_000 });
  });
});
