import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C3.3 Phase 3 condition-builder host scenarios (real browser, programmatic
 * DOM asserts):
 *
 * 1. host-cb-submit (bug 73 pattern): form hosting a condition-builder —
 *    edit the seeded rule value, add a rule and a nested group, submit;
 *    valuesPath publishes the committed condition tree and the echo asserts
 *    the exact committed shape (single-test-green-but-real-browser-failure
 *    class).
 * 2. host-cb-disabled: disabled: true freezes every affordance; submit
 *    echoes the untouched tree (b61 re-verification).
 * 3. host-cb-readonly (P1-1 fix proof): readOnly folds into the same
 *    umbrella as disabled — chrome disabled, value controls disabled, submit
 *    echoes the untouched tree.
 * 4. host-cb-custom (P1-2 fix proof): a select-based custom value editor
 *    writes back into the condition value; the disabled copy's editor cannot
 *    change the value (browser-level interaction proof).
 *
 * Note: the lab runs zh-CN by default (initFluxI18n default language), so
 * i18n-driven chrome labels (Submit / 添加条件 / 添加分组 / 删除条件) are matched
 * with locale-agnostic patterns.
 */

const ADD_CONDITION = /Add condition|添加条件/;
const ADD_GROUP = /Add group|添加分组/;
const SUBMIT = /Submit|提交/;
const REMOVE = /Remove|删除/;

test('condition-builder-host: build conditions + submit (bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('condition-builder');

  const slug = scenarioSlug('Host form build conditions + submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const builder = stage.locator('.nop-condition-builder').first();
  await expect(builder).toBeVisible({ timeout: 10_000 });

  // The seeded rule's value select (status field) shows the raw value.
  const valueTrigger = builder.locator('#i1-value');
  await expect(valueTrigger).toContainText('active', { timeout: 10_000 });
  await valueTrigger.click();
  await page.getByRole('option', { name: 'Inactive' }).click();
  await expect(valueTrigger).toContainText('inactive', { timeout: 10_000 });

  // Add a condition (uses the first field's default operator) and a nested group.
  await builder.getByRole('button', { name: ADD_CONDITION }).click();
  await expect(builder.locator('[data-slot="condition-item"]')).toHaveCount(2, {
    timeout: 10_000,
  });

  await builder.getByRole('button', { name: ADD_GROUP }).click();
  const groupCount = builder.locator('[data-slot="condition-group"]');
  await expect(groupCount).toHaveCount(2, { timeout: 10_000 });
  const nestedGroup = groupCount.nth(1);
  await nestedGroup.getByRole('button', { name: ADD_CONDITION }).click();
  await expect(nestedGroup.locator('[data-slot="condition-item"]')).toHaveCount(1, {
    timeout: 10_000,
  });

  // Submit and assert the committed shape: seeded rule switched to inactive,
  // added item + nested group present with default operator.
  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('cb-host-echo');
  await expect(echo).toContainText('CB-HOST:', { timeout: 5_000 });
  await expect(echo).toContainText('"right":"inactive"');
  await expect(echo).toContainText('"id":"group-');
  await expect(echo).toContainText('"op":"select_equals"');
  await expect(echo).toContainText('"conjunction":"and"');
});

test('condition-builder-host: disabled builder is fully frozen (b61 re-verify)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('condition-builder');

  const slug = scenarioSlug('Disabled condition builder submit (unchanged values)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const builder = stage.locator('.nop-condition-builder').first();
  await expect(builder).toBeVisible({ timeout: 10_000 });

  // Every mutation affordance is disabled.
  await expect(builder.getByRole('button', { name: ADD_CONDITION })).toBeDisabled();
  await expect(builder.getByRole('button', { name: ADD_GROUP })).toBeDisabled();
  await expect(builder.getByRole('button', { name: '并且' })).toBeDisabled();
  await expect(builder.getByRole('button', { name: '或者' })).toBeDisabled();

  // The value control is disabled.
  await expect(builder.locator('[aria-label="条件值"]')).toBeDisabled();

  // Remove chrome is not rendered at all.
  await expect(builder.getByRole('button', { name: REMOVE })).toHaveCount(0);

  await stage.getByRole('button', { name: SUBMIT }).click();
  await expect(stage.getByTestId('cb-disabled-echo')).toHaveText(
    'CB-DISABLED:{"id":"root","conjunction":"and","children":[{"id":"i1","left":{"type":"field","field":"status"},"op":"equal","right":"locked"}]}',
    { timeout: 5_000 },
  );
});

test('condition-builder-host: readOnly folds into the umbrella (P1-1 proof)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('condition-builder');

  const slug = scenarioSlug('Read-only condition builder submit (unchanged values)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const builder = stage.locator('.nop-condition-builder').first();
  await expect(builder).toBeVisible({ timeout: 10_000 });

  // readOnly behaves like disabled: chrome disabled, value controls disabled.
  await expect(builder.getByRole('button', { name: ADD_CONDITION })).toBeDisabled();
  await expect(builder.getByRole('button', { name: ADD_GROUP })).toBeDisabled();
  await expect(builder.locator('[aria-label="条件值"]')).toBeDisabled();
  await expect(builder.getByRole('button', { name: REMOVE })).toHaveCount(0);

  await stage.getByRole('button', { name: SUBMIT }).click();
  await expect(stage.getByTestId('cb-readonly-echo')).toHaveText(
    'CB-READONLY:{"id":"root","conjunction":"and","children":[{"id":"i1","left":{"type":"field","field":"status"},"op":"equal","right":"frozen"}]}',
    { timeout: 5_000 },
  );
});

test('condition-builder-host: custom editor write-back + disabled freeze (P1-2 proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('condition-builder');

  const slug = scenarioSlug('Custom value editor write-back + disabled freeze');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const builders = stage.locator('.nop-condition-builder');
  await expect(builders).toHaveCount(2, { timeout: 10_000 });
  const editable = builders.nth(0);
  const frozen = builders.nth(1);

  // Editable copy: switch the custom select editor from Editor to Viewer.
  const editableEditor = editable.locator('[role="combobox"][aria-label="value"]');
  await expect(editableEditor).toContainText('Editor', { timeout: 10_000 });
  await editableEditor.click();
  await page.getByRole('option', { name: 'Viewer' }).last().click();
  await expect(editableEditor).toContainText('Viewer', { timeout: 10_000 });

  // Frozen copy: chrome disabled; the value control's combobox is fully
  // frozen (CR P2-4 readOnly visual freeze: root/input/trigger disabled) —
  // the menu cannot open at all and the committed value stays 'Editor'.
  await expect(frozen.getByRole('button', { name: ADD_CONDITION })).toBeDisabled();
  const frozenEditor = frozen.locator('[role="combobox"][aria-label="value"]');
  await expect(frozenEditor).toContainText('Editor', { timeout: 10_000 });
  await expect(frozenEditor).toBeDisabled();
  await expect(page.getByRole('option', { name: 'Viewer' })).toHaveCount(0);
  await expect(frozenEditor).toContainText('Editor', { timeout: 5_000 });

  await stage.getByRole('button', { name: SUBMIT }).click();
  await expect(stage.getByTestId('cb-custom-echo')).toHaveText(
    'CB-CUSTOM:{"id":"root","conjunction":"and","children":[{"id":"i1","left":{"type":"field","field":"role"},"op":"equal","right":"viewer"}]}|{"id":"root","conjunction":"and","children":[{"id":"i2","left":{"type":"field","field":"role"},"op":"equal","right":"editor"}]}',
    { timeout: 5_000 },
  );
});
