import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

test('real nop-entropy edit schema submits edited value (real browser)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('dialog');
  const slug = scenarioSlug('Edit dialog real schema submits edited value');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();
  await stage.getByRole('button', { name: 'Edit (real schema)' }).click();

  const nickInput = page.getByLabel('昵称');
  await expect(nickInput).toBeVisible();
  await expect(nickInput).toHaveValue('Original');
  await nickInput.fill('EditedRealSchema');
  await expect(nickInput).toHaveValue('EditedRealSchema');

  await page.getByRole('button', { name: '确定' }).click();

  const submitted = await page.evaluate(() =>
    (window as unknown as { __editSubmitProbe?: { nickName?: string } }).__editSubmitProbe,
  );
  expect(submitted?.nickName).toBe('EditedRealSchema');
});
