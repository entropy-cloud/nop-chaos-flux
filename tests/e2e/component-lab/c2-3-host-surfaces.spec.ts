import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';
import { selectComboboxOption } from '../select-helpers';

/**
 * C2.3 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-choice-submit (bug 73 pattern): the whole choice family
 *    (select/checkbox/switch/radio-group/checkbox-group/button-group-select
 *    single+multiple) in one form — real selection into every control, submit,
 *    valuesPath publishes native value shapes (booleans, arrays) into the page
 *    scope where an outer text echoes them. Also covers host-bgs-submit
 *    (button-group-select single value + string[] multiple into the submit).
 * 2. host-combobox-value: options with falsy values (0 / "") — clicking them
 *    writes the native value back into the store and echoes the matching label
 *    (0 must be a real selection, not "no selection").
 * 3. host-select-remote: searchSource debounced remote search — success loads
 *    remote options into the listbox; "fail" query throws an opaque error and
 *    the error slot shows the localized failure message (P2-3, zh-CN default
 *    locale in the playground).
 * 4. host-controlled-echo: select/switch bound to page scope — an external
 *    setValue action updates the scope and both controls echo the new state
 *    without stale values.
 * 5. host-choice-enter (P1-C fix proof): Enter on a focused checkbox
 *    (role="checkbox") or switch (role="switch") must NOT submit the form;
 *    the explicit Submit button still works.
 */

test('choice-host: family composite submit publishes native values (bug 73 pattern + host-bgs-submit)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('select');

  const slug = scenarioSlug('Choice family composite submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // select: pick United States (value 'us'). The lab page hosts several
  // scenarios; the Country trigger exists in two stages, so scope to this stage.
  const countryTrigger = stage.getByRole('combobox', { name: 'Country' });
  await selectComboboxOption(countryTrigger, page, 'United States');

  // checkbox: check "I agree".
  await stage.getByRole('checkbox', { name: 'I agree' }).click();

  // switch: toggle on.
  await stage.getByRole('switch', { name: 'Active' }).click();

  // radio-group: pick Pro.
  await stage.getByRole('radio', { name: 'Pro' }).click();

  // checkbox-group: pick Stable + Beta.
  await stage.getByRole('checkbox', { name: 'Stable' }).click();
  await stage.getByRole('checkbox', { name: 'Beta' }).click();

  // button-group-select single: pick Main; multiple: pick Admin + Editor.
  await stage.locator('[data-slot="button-group-select-item"]', { hasText: 'Main' }).click();
  await stage.locator('[data-slot="button-group-select-item"]', { hasText: 'Admin' }).click();
  await stage.locator('[data-slot="button-group-select-item"]', { hasText: 'Editor' }).click();

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(stage.getByTestId('choice-echo')).toHaveText(
    'Choice: us | yes | on | pro | stable,beta | main | admin,editor',
    { timeout: 5_000 },
  );
});

test('combobox-host: falsy option values (0 / "") write back natively and echo the label', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('select');

  const slug = scenarioSlug('Falsy option value writeback (combobox-item)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Value 0 must be a real selection: trigger echoes the LABEL, not the raw 0.
  const trigger = stage.getByRole('combobox', { name: 'Level' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole('option', { name: 'Zero' }).click();
  await expect(stage.getByTestId('select-live')).toHaveText('native-zero');
  await expect(trigger).toContainText('Zero');

  // Empty string value: selecting "Empty" is a valid choice.
  await trigger.click();
  await page.getByRole('option', { name: 'Empty' }).click();
  await expect(stage.getByTestId('select-live')).toHaveText('native-empty');

  // A normal value afterwards still works.
  await trigger.click();
  await page.getByRole('option', { name: 'One' }).click();
  await expect(stage.getByTestId('select-live')).toHaveText('native-one');
  await expect(trigger).toContainText('One');
});

test('remote-search-host: success loads remote options, opaque failure shows localized error (P2-3)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('select');

  const slug = scenarioSlug('Remote search with failure fallback');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const input = stage.getByRole('combobox', { name: 'Fruit' });
  await input.click();
  await input.fill('ap');

  // Debounced remote dispatch loads the remote options into the listbox.
  // The option label is wrapped in a <mark> for query highlighting, so match
  // on text content rather than the accessible name.
  const item = (label: string) =>
    page.locator('[data-slot="combobox-item"]', { hasText: label });
  await expect(item('Apple')).toBeVisible({ timeout: 10_000 });
  await expect(item('Apricot')).toBeVisible();

  // A query that triggers an opaque error shows the localized failure message
  // in the error slot (zh-CN default locale: 搜索失败). No stale options.
  await input.fill('fail');
  const errorSlot = page.locator('[data-slot="select-error"]');
  await expect(errorSlot).toBeVisible({ timeout: 10_000 });
  await expect(errorSlot).toContainText('搜索失败');
  await expect(page.getByRole('option')).toHaveCount(0);

  // Recovery: a good query clears the error and loads options again.
  await input.fill('ba');
  await expect(errorSlot).toBeHidden({ timeout: 10_000 });
  await expect(item('Banana')).toBeVisible({ timeout: 10_000 });
});

test('controlled-echo-host: external scope updates echo into select and switch', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('select');

  const slug = scenarioSlug('Controlled value echo (external scope update)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await expect(stage.getByTestId('ctrl-live')).toHaveText('Level 1 notify off');
  const trigger = stage.getByRole('combobox', { name: 'Level' });
  await expect(trigger).toContainText('L1');
  await expect(stage.locator('[data-slot="switch-label"]')).toHaveText('关');

  // External setValue updates the scope: the select must echo the new label.
  await stage.getByRole('button', { name: 'Set level to 2' }).click();
  await expect(trigger).toContainText('L2');
  await expect(stage.getByTestId('ctrl-live')).toHaveText('Level 2 notify off');

  // External setValue updates the switch: checked state + localized label.
  await stage.getByRole('button', { name: 'Set notify on' }).click();
  await expect(stage.locator('[data-slot="switch"]')).toHaveAttribute('aria-checked', 'true');
  await expect(stage.locator('[data-slot="switch-label"]')).toHaveText('开');
  await expect(stage.getByTestId('ctrl-live')).toHaveText('Level 2 notify on');
});

test('choice-enter-host: Enter on checkbox/switch does NOT submit (P1-C fix proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('checkbox');

  const slug = scenarioSlug('Checkbox and switch Enter no-submit (P1-C fix proof)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Focus the checkbox (role="checkbox") and press Enter: no submit.
  const checkbox = stage.getByRole('checkbox', { name: 'I agree' });
  await checkbox.focus();
  await checkbox.press('Enter');
  await page.waitForTimeout(800);
  await expect(stage.getByTestId('enter-echo')).toHaveText('');

  // Focus the switch (role="switch") and press Enter: still no submit.
  const switchEl = stage.getByRole('switch', { name: 'Active' });
  await switchEl.focus();
  await switchEl.press('Enter');
  await page.waitForTimeout(800);
  await expect(stage.getByTestId('enter-echo')).toHaveText('');

  // Enter on the focused controls toggles them (native Base UI keyboard
  // behavior) but must NOT submit. The explicit Submit button then submits the
  // toggled state.
  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByTestId('enter-echo')).toHaveText(
    'Submitted: checked / on',
    { timeout: 5_000 },
  );
});
