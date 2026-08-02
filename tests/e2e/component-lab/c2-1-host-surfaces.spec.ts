import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C2.1 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-form-submit (bug 73 pattern): real input -> form store update -> submit
 *    -> valuesPath publishes the committed values into the page scope where an
 *    outer text echoes them (no stale/row-scope pollution).
 * 2. host-hidden-field: hiddenFieldPolicy { clearValueWhenHidden: true } clears
 *    the value in a real browser when the field becomes hidden, so the next
 *    submit carries no stale secret.
 * 3. host-fieldset-isol: nested fieldsets inside a submitting form — collapsible
 *    toggle works and grouped field values submit isolated and correct.
 * 4. host-fieldset-enter (P1-1 fix proof): pressing Enter on the collapsible
 *    legend expands it WITHOUT submitting the form (pre-fix this double-fired).
 */

test('form-host: submit publishes committed values to parent scope via valuesPath (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('form');

  const slug = scenarioSlug('Submit publishes form values to parent scope (valuesPath)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const usernameInput = stage.getByLabel('Username');
  await usernameInput.fill('alice');
  await expect(usernameInput).toHaveValue('alice');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(
    stage.getByText(/Echo: alice \(valuesPath\)/),
  ).toBeVisible({ timeout: 5_000 });
});

test('form-host: clearValueWhenHidden clears the value in a real browser', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('form');

  const slug = scenarioSlug('Hidden field with clearValueWhenHidden policy');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Secret field starts visible because the collect toggle is checked.
  const secretInput = stage.getByRole('textbox', { name: 'Secret Code' });
  await expect(secretInput).toBeVisible();
  await secretInput.fill('S3CR3T');

  // First submit keeps the value (field still visible).
  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByText(/Done\. secretCode=S3CR3T/)).toBeVisible({ timeout: 5_000 });

  // Hiding the field clears its value per hiddenFieldPolicy.
  await stage.getByText('Collect secret code').click();
  await expect(secretInput).toBeHidden();

  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByText('Done. secretCode=')).toBeVisible({ timeout: 5_000 });
  await expect(stage.getByText(/secretCode=S3CR3T/)).toHaveCount(0);
});

test('fieldset-host: nested fieldsets toggle and submit isolated values', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('fieldset');

  const slug = scenarioSlug('Collapsible fieldset inside submitting form');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Two nested fieldsets: Profile (plain) + Advanced Settings (collapsible, starts collapsed).
  await expect(stage.locator('.nop-fieldset')).toHaveCount(2, { timeout: 5_000 });

  const advancedLegend = stage.getByText('Advanced Settings');
  await expect(advancedLegend).toHaveAttribute('aria-expanded', 'false');
  await expect(stage.getByLabel('Access Token')).toBeHidden();

  // Expand via the legend (click path).
  await advancedLegend.click();
  await expect(advancedLegend).toHaveAttribute('aria-expanded', 'true');
  await expect(stage.getByLabel('Access Token')).toBeVisible();

  // Fill fields across both groups; submit must carry all values.
  await stage.getByLabel('Username').fill('alice');
  await stage.getByLabel('Access Token').fill('tok-123');
  await stage.getByLabel('Notes').fill('nested note');

  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByText(/Submitted: alice \/ tok-123/)).toBeVisible({ timeout: 5_000 });
});

test('fieldset-host: Enter on the collapsible legend expands without submitting (P1-1 fix proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('fieldset');

  const slug = scenarioSlug('Collapsible fieldset inside submitting form');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const advancedLegend = stage.getByText('Advanced Settings');
  await expect(advancedLegend).toHaveAttribute('aria-expanded', 'false');

  // Press Enter on the interactive legend: it must expand…
  await advancedLegend.focus();
  await advancedLegend.press('Enter');
  await expect(advancedLegend).toHaveAttribute('aria-expanded', 'true');
  await expect(stage.getByLabel('Access Token')).toBeVisible();

  // …but the form must NOT have submitted (pre-fix it double-fired).
  await page.waitForTimeout(800);
  await expect(stage.getByText(/Submitted:/)).toHaveCount(0);

  // The form still submits normally afterwards.
  await stage.getByLabel('Username').fill('bob');
  await stage.getByLabel('Access Token').fill('tok-9');
  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByText(/Submitted: bob \/ tok-9/)).toBeVisible({ timeout: 5_000 });
});
