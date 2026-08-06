import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C3.4 Phase 3 lightweight-editor family host scenarios (real browser,
 * programmatic DOM asserts):
 *
 * 1. host-le-tag (bug 73 pattern): tag-list controlled echo — toggle a tag
 *    off and another on, submit; valuesPath publishes the committed tag array.
 * 2. host-le-submit (bug 73 pattern): form hosting array-editor AND key-value
 *    — edit seeded rows inline, append one row to each, submit; the echo
 *    asserts the committed shapes (single-test-green-but-real-browser-failure
 *    class: inline row edits must reach the store and the submitted payload).
 * 3. host-le-readonly (CX-8 same-type re-verification): readOnly: true freezes
 *    tag-list, array-editor, key-value and icon-picker in one host form;
 *    submit echoes the untouched values.
 * 4. host-le-icon (bug 73 pattern): icon-picker popover search + selection
 *    writes the form value; submit echoes the committed icon name.
 *
 * Note: the lab runs zh-CN by default (initFluxI18n default language), so
 * i18n-driven chrome labels are matched with locale-agnostic patterns.
 */

const SUBMIT = /Submit|提交/;
const ADD_ENTRY = /Add entry|添加条目/;
const ADD_ITEM = /Add item|添加项/;

test('lightweight-editor-host: tag-list toggle + submit echo (bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('tag-list');

  const slug = scenarioSlug('Host form tag toggle + submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const tags = stage.locator('.nop-tag-list');
  await expect(tags).toBeVisible({ timeout: 10_000 });

  // Seeded ['react']; toggle react off, vite on → committed ['vite'].
  const reactTag = tags.getByRole('button', { name: 'react', exact: true });
  await expect(reactTag).toHaveAttribute('aria-pressed', 'true');
  await reactTag.click();
  await expect(reactTag).toHaveAttribute('aria-pressed', 'false');

  const viteTag = tags.getByRole('button', { name: 'vite', exact: true });
  await viteTag.click();
  await expect(viteTag).toHaveAttribute('aria-pressed', 'true');

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('le-tag-echo');
  await expect(echo).toContainText('LE-TAG:', { timeout: 5_000 });
  await expect(echo).toContainText('"vite"');
  await expect(echo).not.toContainText('"react"');
});

test('lightweight-editor-host: array-editor + key-value inline edit + submit (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('array-editor');

  const slug = scenarioSlug('Host form array-editor + key-value edit + submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const arrayEditor = stage.locator('.nop-array-editor').first();
  await expect(arrayEditor).toBeVisible({ timeout: 10_000 });

  // Edit the seeded array row inline.
  const reviewer1 = arrayEditor.getByPlaceholder('Reviewer 1');
  await expect(reviewer1).toHaveValue('alice');
  await reviewer1.fill('alice-x');

  // Append a row and fill it.
  await arrayEditor.getByRole('button', { name: ADD_ITEM }).click();
  const reviewer2 = arrayEditor.getByPlaceholder('Reviewer 2');
  await expect(reviewer2).toHaveValue('');
  await reviewer2.fill('bob');

  // key-value: edit the seeded pair inline and append a second pair.
  const kv = stage.locator('.nop-key-value').first();
  await expect(kv).toBeVisible({ timeout: 10_000 });
  const kvKey = kv.getByPlaceholder(/Key|键/, { exact: true });
  const kvValue = kv.getByPlaceholder(/Value|值/, { exact: true });
  await expect(kvKey).toHaveValue('env');
  await expect(kvValue).toHaveValue('prod');
  await kvValue.fill('staging');

  await kv.getByRole('button', { name: ADD_ENTRY }).click();
  await expect(kv.getByPlaceholder(/Key|键/, { exact: true })).toHaveCount(2);
  await kv.getByPlaceholder(/Key|键/, { exact: true }).nth(1).fill('region');
  await kv.getByPlaceholder(/Value|值/, { exact: true }).nth(1).fill('us');

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('le-submit-echo');
  await expect(echo).toContainText('LE-SUBMIT:', { timeout: 5_000 });
  // array-editor committed shape
  await expect(echo).toContainText('"value":"alice-x"');
  await expect(echo).toContainText('"value":"bob"');
  // key-value committed shape
  await expect(echo).toContainText('"key":"env","value":"staging"');
  await expect(echo).toContainText('"key":"region","value":"us"');
});

test('lightweight-editor-host: readOnly freezes the whole family (CX-8 same-type re-verify)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('tag-list');

  const slug = scenarioSlug('Read-only tag list + editors submit (unchanged values)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // tag-list buttons disabled.
  const tagButtons = stage.locator('.nop-tag-list').getByRole('button');
  await expect(tagButtons.first()).toBeDisabled({ timeout: 10_000 });

  // array-editor input + chrome disabled.
  const arrayEditor = stage.locator('.nop-array-editor').first();
  await expect(arrayEditor.getByPlaceholder('Reviewer 1')).toBeDisabled();
  await expect(arrayEditor.getByRole('button', { name: ADD_ITEM })).toBeDisabled();

  // key-value inputs + chrome disabled.
  const kv = stage.locator('.nop-key-value').first();
  await expect(kv.getByPlaceholder(/Key|键/, { exact: true })).toBeDisabled();
  await expect(kv.getByPlaceholder(/Value|值/, { exact: true })).toBeDisabled();
  await expect(kv.getByRole('button', { name: ADD_ENTRY })).toBeDisabled();

  // icon-picker trigger disabled.
  const iconTrigger = stage.locator('.nop-icon-picker').first().getByRole('button').first();
  await expect(iconTrigger).toBeDisabled();

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('le-ro-echo');
  await expect(echo).toContainText('LE-RO:', { timeout: 5_000 });
  await expect(echo).toContainText('"tags":["react"]');
  await expect(echo).toContainText('"value":"alice"');
  await expect(echo).toContainText('"key":"env","value":"prod"');
  await expect(echo).toContainText('"icon":"accessibility"');
});

test('lightweight-editor-host: icon-picker search + select + submit (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('icon-picker');

  const slug = scenarioSlug('Host form icon picker select + submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const picker = stage.locator('.nop-icon-picker').first();
  const trigger = picker.getByRole('button', { name: /Select an icon|选择图标/ });
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();

  // Popover grid is a listbox with selectable options (rendered in a portal).
  const listbox = page.locator('[role="listbox"]');
  await expect(listbox).toBeVisible({ timeout: 10_000 });

  // Search narrows the grid; select the target icon. The search input sits
  // above the listbox inside the popover.
  await page.getByRole('searchbox').fill('accessibility');
  const option = listbox.locator('[role="option"][aria-label="accessibility"]');
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();

  // Trigger echoes the selected icon name.
  await expect(picker.getByRole('button', { name: /accessibility/ })).toBeVisible({
    timeout: 5_000,
  });

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('le-icon-echo');
  await expect(echo).toContainText('LE-ICON:', { timeout: 5_000 });
  await expect(echo).toContainText('"accessibility"');
});
