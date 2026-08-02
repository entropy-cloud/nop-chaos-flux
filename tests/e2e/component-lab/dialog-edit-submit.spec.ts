import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * Real-browser regression: dialog form edit (tabs + combobox + multi-field,
 * mirroring the real nop-entropy edit-user schema) must submit the EDITED value.
 *
 * Verifies the submitAction lazy-execution contract: args.data `${field}`
 * templates resolve at submit time with the current form store values.
 */
test('dialog edit (tabs) submits edited value via ${field} template (real browser)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('dialog');

  const slug = scenarioSlug('Edit dialog submits edited field value');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await stage.getByRole('button', { name: 'Edit Record' }).click();

  const nickInput = page.getByLabel('Nick Name');
  await expect(nickInput).toBeVisible();
  await expect(nickInput).toHaveValue('Original');

  await nickInput.fill('EditedValue');
  await expect(nickInput).toHaveValue('EditedValue');

  await page.getByRole('button', { name: 'OK' }).click();

  const submitted = await page.evaluate(() =>
    (window as unknown as { __editSubmitProbe?: { nickName?: string } }).__editSubmitProbe,
  );

  expect(submitted?.nickName).toBe('EditedValue');
});
