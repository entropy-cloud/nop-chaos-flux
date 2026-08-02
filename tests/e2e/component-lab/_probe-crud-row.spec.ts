import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

test('CRUD dropdown edit submits edited value (probe)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('dialog');
  const slug = scenarioSlug('CRUD row edit submits edited value');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 20000 });
  await stage.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Edit Row' }).click();
  const nickInput = page.getByLabel('Nick');
  await expect(nickInput).toBeVisible({ timeout: 15000 });
  const initial = await nickInput.inputValue();
  await nickInput.fill('EditedCRUDRow');
  await page.getByRole('button', { name: 'OK' }).click();
  const submitted = await page.evaluate(() =>
    (window as unknown as { __crudRowEditProbe?: { nickName?: string } }).__crudRowEditProbe,
  );
  console.log(`PROBE initial=${initial} submitted=${JSON.stringify(submitted)}`);
  expect(submitted?.nickName).toBe('EditedCRUDRow');
});
