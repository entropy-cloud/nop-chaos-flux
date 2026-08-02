import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C2.2 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-family-submit (bug 73 pattern): the full text-input family
 *    (input-text/input-email/input-password/input-number/textarea) in one form —
 *    real input into every control, submit, valuesPath publishes the committed
 *    values into the page scope where an outer text echoes all five values.
 * 2. host-family-markers (P1-1 fix proof): each family control emits its type
 *    root marker (nop-input-text/nop-input-email/nop-input-password/nop-input-number/
 *    nop-textarea) in a real browser.
 * 3. host-suggest-writeback (P1-2 fix proof): input-text + suggestSource inside a
 *    form — typing opens the popover, clicking an item writes the value back into
 *    the input AND the live echo; the popover closes (pre-fix the popover focus
 *    steal + blur-close loop made the item unclickable).
 * 4. host-suggest-minlength (P2-2 fix proof): clearing the input below
 *    suggestMinInputLength closes the popover so stale suggestions are never shown.
 * 5. host-password-reveal: the reveal toggle switches the input type and never
 *    changes the committed form value.
 */

test('input-family-host: submit publishes all five text-input family values (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-text');

  const slug = scenarioSlug('Text input family composite submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await stage.getByLabel('Full Name').fill('alice');
  await stage.getByLabel('Email').fill('alice@example.com');
  await stage.getByLabel('Password').fill('s3cret');
  await stage.getByLabel('Quantity').fill('42');
  await stage.getByLabel('Notes').fill('hello\nworld');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(
    stage.getByText(/Family: alice \| alice@example\.com \| s3cret \| 42 \| hello\s+world/),
  ).toBeVisible({ timeout: 5_000 });
});

test('input-family-host: every family control emits its type root marker', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-text');

  const slug = scenarioSlug('Text input family composite submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await expect(stage.locator('input.nop-input-text[name="name"]')).toBeVisible();
  await expect(stage.locator('input.nop-input-email[name="email"]')).toBeVisible();
  await expect(stage.locator('input.nop-input-password[name="secret"]')).toBeVisible();
  await expect(stage.locator('.nop-input-number input[name="count"]')).toBeVisible();
  await expect(stage.locator('textarea.nop-textarea[name="notes"]')).toBeVisible();
});

test('suggest-host: popover selection writes the value back in a real browser (P1-2 fix proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-text');

  const slug = scenarioSlug('input-text suggestSource writeback in form');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const input = stage.getByLabel('Fruit (suggest)');
  await input.click();
  await input.fill('ap');

  // The Base UI popover portals to document.body, so the popup is page-scoped.
  const list = page.locator('[data-slot="input-suggest-list"]');
  await expect(list).toBeVisible({ timeout: 10_000 });
  await expect(list.getAttribute('role')).resolves.toBe('listbox');

  const firstItem = page.locator('[data-slot="input-suggest-item"]').first();
  const expectedValue = await firstItem.getAttribute('data-value');
  expect(expectedValue).toBeTruthy();

  // Pre-fix the Base UI popover stole focus -> blur timer closed the popover ->
  // the item could never be clicked (e2e pre-existing failure). Now the click
  // must succeed and write the value back.
  await firstItem.click();

  await expect(input).toHaveValue(expectedValue!);
  await expect(stage.getByTestId('suggest-live')).toHaveText(`Fruit: ${expectedValue}`);
  await expect(list).toBeHidden({ timeout: 5_000 });

  // The written-back value is the committed form value.
  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByTestId('suggest-live')).toHaveText(`Fruit: ${expectedValue}`);
});

test('suggest-host: shortening the input below the min-length gate closes the popover (P2-2 fix proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-text');

  const slug = scenarioSlug('input-text suggestSource writeback in form');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const input = stage.getByLabel('Fruit (suggest)');
  await input.click();
  await input.fill('ap');

  // The Base UI popover portals to document.body, so the popup is page-scoped.
  const list = page.locator('[data-slot="input-suggest-list"]');
  await expect(list).toBeVisible({ timeout: 10_000 });

  await input.fill('a');
  await expect(list).toBeHidden({ timeout: 5_000 });

  // Stale suggestions must not reappear while the length stays below the gate.
  await page.waitForTimeout(400);
  await expect(page.locator('[data-slot="input-suggest-item"]')).toHaveCount(0);
  await expect(input).toHaveValue('a');
});

test('password-host: reveal toggle switches input type without changing the form value', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-password');

  const slug = scenarioSlug('Reveal password toggle');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const input = stage.getByLabel('Reveal Password');
  await input.fill('hunter2');

  await expect(input).toHaveAttribute('type', 'password');
  await expect(stage.getByTestId('password-live')).toHaveText('Set: hunter2');

  const reveal = stage.locator('[data-slot="input-password-reveal"]');
  await reveal.click();

  await expect(input).toHaveAttribute('type', 'text');
  await expect(reveal).toHaveAttribute('aria-pressed', 'true');
  await expect(stage.getByTestId('password-live')).toHaveText('Set: hunter2');

  await reveal.click();
  await expect(input).toHaveAttribute('type', 'password');
  await expect(reveal).toHaveAttribute('aria-pressed', 'false');
  await expect(stage.getByTestId('password-live')).toHaveText('Set: hunter2');
});
