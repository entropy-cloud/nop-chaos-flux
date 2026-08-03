import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C3.1 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-combo-submit (bug 73 pattern): form with a combo of pre-seeded rows —
 *    edit row 0 in place, add a row, fill it, submit; valuesPath publishes the
 *    committed array and the echo asserts row-scope isolation + exact shape.
 * 2. host-itable-submit (bug 73 pattern): input-table rows edited, one row
 *    added and filled, submit; echo asserts the committed rows shape.
 * 3. host-itable-disabled: readOnly input-table renders immutable cells, hides
 *    the action column / add button, and submit echoes the untouched values.
 * 4. host-transfer-echo: scope-bound transfer echoes external setValue updates
 *    in the selected pane (no stale value, no loop).
 * 5. host-picker-row (bug 73 pattern, P1-1 proof): two combo rows each host a
 *    CRUD-mode picker (loadAction). Opening row 1's dialog while row 0's
 *    selection is pending must NOT clobber row 0; each confirm writes back to
 *    its own row (previously the shared `$_picker.<id>` state path leaked
 *    across row instances).
 */

test('combo-host: nested multi-row edit + submit publishes isolated committed rows (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('combo');

  const slug = scenarioSlug('Nested combo multi-row submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Edit row 0's name in place.
  const nameInputs = stage.locator('input[placeholder="CName"]');
  await expect(nameInputs).toHaveCount(2, { timeout: 10_000 });
  await nameInputs.nth(0).fill('AliceX');

  // Add a row and fill it.
  await stage.locator('[data-slot="combo-add"]').click();
  await expect(nameInputs).toHaveCount(3, { timeout: 10_000 });
  await nameInputs.nth(2).fill('Carol');
  await stage.locator('input[placeholder="CPhone"]').nth(2).fill('P-300');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(stage.getByTestId('combo-echo')).toHaveText(
    'Combo: [{"name":"AliceX","phone":"P-100"},{"name":"Bob","phone":"P-200"},{"name":"Carol","phone":"P-300"}]',
    { timeout: 5_000 },
  );
});

test('input-table-host: multi-row edit + submit publishes committed rows (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-table');

  const slug = scenarioSlug('Table multi-row edit submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const amountInputs = stage.locator('input[placeholder="TAmount"]');
  await expect(amountInputs).toHaveCount(2, { timeout: 10_000 });
  await amountInputs.nth(0).fill('42');

  await stage.locator('[data-slot="input-table-add"]').click();
  const skuInputs = stage.locator('input[placeholder="TSKU"]');
  await expect(skuInputs).toHaveCount(3, { timeout: 10_000 });
  await skuInputs.nth(2).fill('C9');
  await stage.locator('input[placeholder="TAmount"]').nth(2).fill('7');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(stage.getByTestId('table-echo')).toHaveText(
    'Table: [{"sku":"A1","amount":42},{"sku":"B2","amount":5},{"sku":"C9","amount":7}]',
    { timeout: 5_000 },
  );
});

test('input-table-host: readOnly table is immutable and submits unchanged values', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-table');

  const slug = scenarioSlug('Read-only table submit (unchanged values)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const skuInputs = stage.locator('input[placeholder="ROSKU"]');
  await expect(skuInputs).toHaveCount(2, { timeout: 10_000 });

  // Cells are read-only: attempting to fill must not change the value.
  for (const input of [skuInputs.nth(0), skuInputs.nth(1)]) {
    await expect(input).toHaveAttribute('readonly');
  }

  // No action column, no add button.
  await expect(stage.locator('[data-slot="input-table-remove"]')).toHaveCount(0);
  await expect(stage.locator('[data-slot="input-table-add"]')).toHaveCount(0);

  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByTestId('table-ro-echo')).toHaveText(
    'RO: [{"sku":"FIXED-1","amount":9},{"sku":"FIXED-2","amount":11}]',
    { timeout: 5_000 },
  );
});

test('transfer-host: external scope updates echo into the selected pane (no stale)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('transfer');

  const slug = scenarioSlug('Controlled value echo + onSelectAll (external scope update)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Initial value ['editor'] echoes in the selected pane.
  await expect(
    stage.locator('[data-slot="transfer-pane-selected"] [aria-label="Editor"]'),
  ).toHaveCount(1, { timeout: 10_000 });
  await expect(stage.getByTestId('transfer-echo')).toHaveText('T:["editor"]');

  // External setValue -> echo the new selection, no stale Editor.
  await stage.getByRole('button', { name: 'Set admin' }).click();
  await expect(
    stage.locator('[data-slot="transfer-pane-selected"] [aria-label="Admin"]'),
  ).toHaveCount(1, { timeout: 10_000 });
  await expect(stage.getByTestId('transfer-echo')).toHaveText('T:["admin"]');

  await stage.getByRole('button', { name: 'Set viewer' }).click();
  await expect(stage.getByTestId('transfer-echo')).toHaveText('T:["viewer"]', {
    timeout: 10_000,
  });
  await expect(
    stage.locator('[data-slot="transfer-pane-selected"] [aria-label="Viewer"]'),
  ).toHaveCount(1);
  await expect(
    stage.locator('[data-slot="transfer-pane-selected"] [aria-label="Admin"]'),
  ).toHaveCount(0);
});

test('transfer-host: toggle-all dispatches onSelectAll (P1-1 proof)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('transfer');

  const slug = scenarioSlug('Toggle-all fires onSelectAll');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await expect(stage.getByTestId('transfer-sa-echo')).toHaveText('SA:false', {
    timeout: 10_000,
  });

  await stage.locator('[data-slot="transfer-toggle-all"]').click();

  await expect(stage.getByTestId('transfer-sa-echo')).toHaveText('SA:true', {
    timeout: 10_000,
  });
});

test('picker-host: CRUD-mode selection stays isolated per row (bug 73 pattern, P1-1 proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('picker');

  const slug = scenarioSlug('CRUD-mode picker per-row isolation (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const triggers = stage.locator('[data-slot="picker-trigger"]');
  await expect(triggers).toHaveCount(2, { timeout: 10_000 });

  // Row 0: open dialog, select Alpha, confirm -> writes back to row 0 only.
  await triggers.nth(0).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 10_000 });
  // CRUD selection radios render with the localized selectRow aria-label; the
  // dialog-scoped role selector avoids the zh-CN default-locale dependency.
  const rowRadios = page.locator('[data-slot="picker-dialog-content"] [role="radio"]');
  await expect(rowRadios).toHaveCount(2, { timeout: 10_000 });
  await rowRadios.nth(0).click();
  await page.locator('[data-slot="picker-confirm"]').click();

  await expect(stage.getByTestId('picker-row-echo')).toHaveText(
    'PR:[{"name":"R0","owner":"a0"},{"name":"R1"}]',
    { timeout: 10_000 },
  );

  // Row 1: opening its dialog must not leak row 0's selection state, and its
  // confirm writes back to row 1 only. The shared `$_picker.<id>` state paths
  // are instance-keyed (P1-1), so the two rows never see each other's state.
  await triggers.nth(1).click();
  await expect(rowRadios).toHaveCount(2, { timeout: 10_000 });
  await rowRadios.nth(1).click();
  await page.locator('[data-slot="picker-confirm"]').click();

  await expect(stage.getByTestId('picker-row-echo')).toHaveText(
    'PR:[{"name":"R0","owner":"a0"},{"name":"R1","owner":"b1"}]',
    { timeout: 10_000 },
  );
});
