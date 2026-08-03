import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C3.2 Phase 3 composite-field-family host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-objarr-submit (bug 73 pattern): form hosting an object-field + an
 *    array-field together — edit object sub-fields and array rows, add a row,
 *    submit; valuesPath publishes committed shapes and the echo asserts
 *    row-scope isolation (row 0 edit must not leak into row 1).
 * 2. host-detail-proj (bug 73 pattern): detail-field projected dialog edit —
 *    the draft must stay decoupled from the host form until confirm; after
 *    confirm + submit the committed value shape is echoed.
 * 3. host-variant-switch (bug 73 pattern): variant-field select mode — branch
 *    switch writes the variant initialValue into the form value (value
 *    ownership), the active branch editor follows, submit echoes the committed
 *    shape (no stale, no loop).
 * 4. host-obj-disabled (P1-3 fix proof): readOnly object-field + array-field —
 *    child inputs carry the readonly attribute, add/remove chrome is hidden,
 *    submit echoes the untouched values.
 *
 * Note: the lab runs zh-CN by default (initFluxI18n default language), so
 * i18n-driven chrome labels (Add item / Remove / Cancel / Confirm / Close)
 * must be matched locale-agnostically.
 */

const ADD_ITEM = /Add item|添加项/;
const REMOVE = /Remove|删除/;
const CONFIRM = /Confirm|确认/;
const CANCEL = /Cancel|取消/;

test('composite-host: object-field + array-field nested edit + submit (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('object-field');

  const slug = scenarioSlug('Object + array fields nested submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Edit the object-field sub-fields.
  const streetInput = stage.locator('input[placeholder="OStreet"]');
  await expect(streetInput).toHaveCount(1, { timeout: 10_000 });
  await streetInput.fill('9 Main St');
  await stage.locator('input[placeholder="OCity"]').fill('Amesville');

  // Edit row 0 of the array-field; the change must not leak into row 1.
  const nameInputs = stage.locator('input[placeholder="CName"]');
  await expect(nameInputs).toHaveCount(2, { timeout: 10_000 });
  await nameInputs.nth(0).fill('AliceX');

  // Add a row and fill it.
  await stage.getByRole('button', { name: ADD_ITEM }).click();
  await expect(nameInputs).toHaveCount(3, { timeout: 10_000 });
  await nameInputs.nth(2).fill('Carol');
  await stage.locator('input[placeholder="CPhone"]').nth(2).fill('P-300');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(stage.getByTestId('objarr-echo')).toHaveText(
    'ObjArr: {"address":{"street":"9 Main St","city":"Amesville","zip":"62701"},"contacts":[{"name":"AliceX","phone":"P-100"},{"name":"Bob","phone":"P-200"},{"name":"Carol","phone":"P-300"}]}',
    { timeout: 5_000 },
  );
});

test('detail-field-host: projected dialog edit + confirm + submit (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('detail-field');

  const slug = scenarioSlug('Projected dialog edit submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Open the projected draft dialog (rendered in a portal — query at page level).
  await stage.getByRole('button', { name: 'Edit Shipping' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('input[placeholder="DStreet"]')).toHaveCount(1, { timeout: 10_000 });

  // Cancel path: closing without confirm must not write back.
  await dialog.getByRole('button', { name: CANCEL }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Reopen, edit, confirm — then submit and assert the committed shape.
  await stage.getByRole('button', { name: 'Edit Shipping' }).click();
  const dialog2 = page.getByRole('dialog');
  await expect(dialog2.locator('input[placeholder="DStreet"]')).toHaveCount(1, { timeout: 10_000 });
  await dialog2.locator('input[placeholder="DStreet"]').fill('1 Main St');
  await dialog2.locator('input[placeholder="DCity"]').fill('Boston');
  await dialog2.getByRole('button', { name: CONFIRM }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(stage.getByTestId('detail-echo')).toHaveText(
    'Detail: {"street":"1 Main St","city":"Boston","state":"DC","zip":"20500"}',
    { timeout: 5_000 },
  );
});

test('variant-field-host: branch switch writes value + submit echo (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('variant-field');

  const slug = scenarioSlug('Variant switch writes value + submit echo (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Switch from the single-string branch to the array branch via the selector.
  const selector = stage.locator('[data-slot="variant-field-selector"]');
  await expect(selector).toBeVisible({ timeout: 10_000 });
  await expect(selector).toContainText('Single Contact');
  await selector.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Multiple Contacts' }).click();
  await expect(selector).toContainText('Multiple Contacts', { timeout: 10_000 });

  // The array branch appears with its initialValue rows; add a third.
  const emailItems = stage.locator('input[placeholder="VEmailItem"]');
  await expect(emailItems).toHaveCount(2, { timeout: 10_000 });
  await stage.getByRole('button', { name: ADD_ITEM }).click();
  await expect(emailItems).toHaveCount(3, { timeout: 10_000 });
  await emailItems.nth(2).fill('c@example.com');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(stage.getByTestId('variant-echo')).toHaveText(
    'Variant: ["a@example.com","b@example.com","c@example.com"]',
    { timeout: 5_000 },
  );
});

test('composite-host: readOnly object-field + array-field are immutable (P1-3 proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('array-field');

  const slug = scenarioSlug('Read-only object + array fields submit (unchanged values)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Object-field children carry the readonly attribute.
  const streetInput = stage.locator('input[placeholder="ROStreet"]');
  await expect(streetInput).toHaveCount(1, { timeout: 10_000 });
  await expect(streetInput).toHaveAttribute('readonly');
  await expect(stage.locator('input[placeholder="ROCity"]')).toHaveAttribute('readonly');

  // Array-field items carry the readonly attribute; no add/remove chrome.
  const nameInputs = stage.locator('input[placeholder="ROCName"]');
  await expect(nameInputs).toHaveCount(2, { timeout: 10_000 });
  for (const input of [nameInputs.nth(0), nameInputs.nth(1)]) {
    await expect(input).toHaveAttribute('readonly');
  }
  await expect(stage.locator('input[placeholder="ROCPhone"]').nth(0)).toHaveAttribute('readonly');
  await expect(stage.getByRole('button', { name: ADD_ITEM })).toHaveCount(0);
  await expect(stage.getByRole('button', { name: REMOVE })).toHaveCount(0);

  // Attempting to type into a readonly input must not change the committed value.
  await streetInput.evaluate((el) => {
    (el as HTMLInputElement).value = 'HACKED';
  });
  await expect(streetInput).toHaveValue('HACKED');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(stage.getByTestId('ro-composite-echo')).toHaveText(
    'RO: {"address":{"street":"FIXED-ST","city":"RO-CITY"},"contacts":[{"name":"RO-1","phone":"R-100"},{"name":"RO-2","phone":"R-200"}]}',
    { timeout: 5_000 },
  );
});
