import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * Real-browser regression (live defect): CRUD row "More" dropdown-button items
 * embedding an openDialog edit form must submit the EDITED value.
 *
 * Before the schema-definition compile pipeline, the item onClick was treated
 * as a plain value prop and baked with row scope at render time — the dialog
 * submitted the ROW value (RowNick) instead of the edited one.
 *
 * Verifies the full chain: schema-definition classification → envelope
 * preservation → renderer unwrap → dispatch raw action → dialog body compiled
 * in the surface scope → submitAction `${field}` template evaluated lazily at
 * submit time.
 */
test('CRUD dropdown row edit submits edited value (real browser)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('dialog');

  const slug = scenarioSlug('CRUD row edit submits edited value');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await stage.getByRole('button', { name: 'More' }).click();

  // DropdownMenu content renders in a portal at body level (outside the stage).
  await page.getByRole('menuitem', { name: 'Edit Row' }).click();

  // The openDialog surface also renders at body level.
  const nickInput = page.getByLabel('Nick');
  await expect(nickInput).toBeVisible();
  await expect(nickInput).toHaveValue('Original');

  await nickInput.fill('EditedFromDropdown');
  await expect(nickInput).toHaveValue('EditedFromDropdown');

  await page.getByRole('button', { name: 'OK' }).click();

  const submitted = await page.evaluate(() =>
    (window as unknown as { __crudRowEditProbe?: { nickName?: string } }).__crudRowEditProbe,
  );

  expect(submitted?.nickName).toBe('EditedFromDropdown');
});
