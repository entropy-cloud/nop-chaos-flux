import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * w4c composite form family — combo / input-table / transfer / picker.
 *
 * Migrated from tests/e2e/w4c-composite-form-family.spec.ts (E3 batch 2,
 * engine swap + kernel white-box expectNoPageErrors in place of the shared
 * console-error fixture; per-case isolation via gated hash-route bounce —
 * ft.reload() destroys the CDP evaluation context, so the old
 * fresh-page-per-test pattern is replaced with a bounce through '/#/'
 * gated on the lab marker unmounting).
 */

async function openW4c(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: '复合表单族', level: 1 })).not.toBeVisible();
  await ft.goto('/#/w4c-composite-form-family');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  await ft.expectWeb(
    ft.getByRole('heading', { name: '复合表单族 — combo / input-table / transfer / picker', level: 1 }),
  ).toBeVisible({ timeoutMs: 20_000 });
}

export default async function w4cCompositeFormFamily(ft: FtGlobal): Promise<{ cases: number }> {
  // --- W4c combo — repeated composite-item field editor ---

  // Case 1: add appends an empty item and field edits persist in the rendered control
  await openW4c(ft);

  const combo = ft.getByTestId('demo-combo');
  const nameInputs = combo.locator('input[placeholder="Name"]');
  await ft.expectWeb(nameInputs).toHaveCount(2, { timeoutMs: 10_000 });

  await combo.locator('[data-slot="combo-add"]').click();
  await ft.expectWeb(nameInputs).toHaveCount(3, { timeoutMs: 10_000 });

  // nth(i).locator(sub) composes `sel sub` and loses the index — the Name
  // inputs are positionally identical, so assert the committed edit through
  // inputValue on the direct nth locator.
  const lastNameInput = nameInputs.nth(2);
  await lastNameInput.fill('Carol');
  const carolValue = await lastNameInput.inputValue();
  if (carolValue !== 'Carol') throw new Error(`combo: last name input value ${carolValue} !== "Carol"`);

  await expectNoPageErrors(ft, 'w4c:combo-add');

  // Case 2: remove drops an item (item control count decreases)
  await openW4c(ft);

  const combo2 = ft.getByTestId('demo-combo');
  const nameInputs2 = combo2.locator('input[placeholder="Name"]');
  await ft.expectWeb(nameInputs2).toHaveCount(2, { timeoutMs: 10_000 });

  await combo2.locator('[data-slot="combo-remove"]').first().click();
  await ft.expectWeb(nameInputs2).toHaveCount(1, { timeoutMs: 10_000 });
  await ft.expectWeb(nameInputs2.first()).toHaveValue('Bob');

  await expectNoPageErrors(ft, 'w4c:combo-remove');

  // Case 3: reorder moves an item (order of rendered controls changes)
  await openW4c(ft);

  const combo3 = ft.getByTestId('demo-combo');
  const nameInputs3 = combo3.locator('input[placeholder="Name"]');
  await ft.expectWeb(nameInputs3.first()).toHaveValue('Alice', { timeoutMs: 10_000 });

  await combo3.locator('[data-slot="combo-move-down"]').first().click();
  await ft.expectWeb(nameInputs3.first()).toHaveValue('Bob', { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'w4c:combo-reorder');

  // --- W4c input-table — tabular object-array field editor ---

  // Case 4: cell edit writes back to the row object (rendered control reflects value)
  await openW4c(ft);

  const table = ft.getByTestId('demo-input-table');
  const amountInputs = table.locator('input[placeholder="Amount"]');
  await ft.expectWeb(amountInputs.first()).toHaveValue('3', { timeoutMs: 10_000 });

  await amountInputs.first().fill('42');
  await ft.expectWeb(amountInputs.first()).toHaveValue('42');

  await expectNoPageErrors(ft, 'w4c:input-table-cell');

  // Case 5: add row appends an empty row and remove drops a row
  await openW4c(ft);

  const table2 = ft.getByTestId('demo-input-table');
  const skuInputs = table2.locator('input[placeholder="SKU"]');
  await ft.expectWeb(skuInputs).toHaveCount(2, { timeoutMs: 10_000 });

  await table2.locator('[data-slot="input-table-add"]').click();
  await ft.expectWeb(skuInputs).toHaveCount(3, { timeoutMs: 10_000 });

  await table2.locator('[data-slot="input-table-remove"]').first().click();
  await ft.expectWeb(skuInputs).toHaveCount(2, { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'w4c:input-table-rows');

  // --- W4c transfer — two-pane shuttle selection ---

  // Case 6: selecting a candidate moves it to the selected pane
  await openW4c(ft);

  const transfer = ft.getByTestId('demo-transfer');

  // selected pane initially contains the editor option
  await ft.expectWeb(
    transfer.locator('[data-slot="transfer-pane-selected"] [aria-label="Editor"]'),
  ).toHaveCount(1, { timeoutMs: 10_000 });

  // the candidate is a Radix Checkbox (role=checkbox button), not an
  // HTMLInputElement — driver check() requires a native input, so toggle via
  // click like the old Playwright check() did
  await transfer.locator('[aria-label="Admin"][data-slot="transfer-option-candidate"]').click();
  await transfer.locator('[data-slot="transfer-select"]').click();

  await ft.expectWeb(
    transfer.locator('[data-slot="transfer-pane-selected"] [aria-label="Admin"]'),
  ).toHaveCount(1, { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'w4c:transfer');

  // --- W4c picker — dialog-layer selection ---
  // v3 picker contract (flux-guide/09-amis-migration.md): the popup surface is
  // `pickerPopup`; the sole content definition is `pickerSchema`. The w4c demo
  // pickers are popup-only (no pickerSchema region), so per the G1 adjudication
  // (picker-schema-override.test.tsx) the dialog opens with an empty body and
  // Confirm is a no-op close — selection-write semantics are covered separately
  // in flux-renderers-form-advanced unit tests which exercise pickerSchema.

  // Case 7: open → empty-body dialog → confirm closes it (no selection write)
  await openW4c(ft);

  const report = ft.getByTestId('picker-owner-report');
  await ft.expectWeb(report).toHaveText('owner:—', { timeoutMs: 10_000 });

  const picker = ft.getByTestId('demo-picker');
  await picker.locator('[data-slot="picker-trigger"]').click();

  const dialog = ft.getByRole('dialog');
  await ft.expectWeb(dialog).toBeVisible({ timeoutMs: 10_000 });
  // Popup-only, nothing published → Confirm is disabled (confirmDisabled
  // guard); the popup closes via Cancel.
  await ft.expectWeb(dialog.locator('[data-slot="picker-confirm"]')).toBeDisabled();
  // locator.getByRole is not in the driver API — use the page-level role
  // locator (the picker dialog is the only open surface with a 取消 button)
  const cancelButtons = ft.getByRole('button', { name: '取消' });
  const cancelCount = await cancelButtons.count();
  if (cancelCount !== 1) throw new Error(`picker: expected exactly 1 取消 button, got ${cancelCount}`);
  await cancelButtons.click();

  await ft.expectWeb(dialog).toBeHidden({ timeoutMs: 5_000 });
  // No selection was made → owner stays at its default placeholder.
  await ft.expectWeb(report).toHaveText('owner:—', { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'w4c:picker-dialog');

  // Case 8: picker-clear stays disabled while the field has no committed value
  await openW4c(ft);

  const picker2 = ft.getByTestId('demo-picker');

  // Popup-only picker can never commit a value (G1: no pickerSchema content),
  // so the canonical clear handle renders disabled at the empty state — it
  // must not be clickable.
  const clear = picker2.locator('[data-slot="picker-clear"]');
  await ft.expectWeb(clear).toBeDisabled({ timeoutMs: 10_000 });

  const report2 = ft.getByTestId('picker-owner-report');
  await ft.expectWeb(report2).toHaveText('owner:—', { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'w4c:picker-clear');

  return { cases: 8 };
}
