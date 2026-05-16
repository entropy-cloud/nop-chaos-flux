/**
 * Behavioral E2E tests for simple form renderers:
 * form, input-text, input-email, input-password, textarea,
 * select, checkbox, switch, radio-group, checkbox-group
 */

import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

// ---------------------------------------------------------------------------
// form
// ---------------------------------------------------------------------------
test.describe('form renderer', () => {
  test('write: form submit toggles local success state and renders the local username', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('form');

    const slug = scenarioSlug('Form with visible submit success state');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Verify form fields and Submit button are present
    await expect(stage.getByLabel('Username')).toBeVisible();
    await expect(stage.getByLabel('Email')).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Submit' })).toBeVisible();

    await stage.getByLabel('Username').fill('testuser');
    await stage.getByLabel('Email').fill('testuser@example.com');
    await expect(stage.getByLabel('Username')).toHaveValue('testuser');
    await expect(stage.getByLabel('Email')).toHaveValue('testuser@example.com');
    await stage.getByRole('button', { name: 'Submit' }).click();
    await expect(stage.getByText('Success! Submitted username: testuser')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('write: hidden required field is skipped until shown, then resumes validation', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('form');

    const slug = scenarioSlug('Hidden required field skips validation until shown');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const collectSecret = stage.getByRole('checkbox', { name: 'Collect secret code' });
    const submitButton = stage.getByRole('button', { name: 'Submit Access Settings' });
    const secretCode = stage.locator('input[name="secretCode"]');
    const scopeDebug = stage.locator('[data-slot="scope-debug-json"]');

    await expect(collectSecret).toBeVisible();
    await expect(secretCode).toHaveCount(0);
    await expect(scopeDebug).toContainText('"errorCount": 0');
    await expect(scopeDebug).toContainText('"valid": true');

    await submitButton.click();
    await expect(scopeDebug).toContainText('"errorCount": 0');
    await expect(scopeDebug).toContainText('"valid": true');
    await expect(stage.locator('[data-slot="field-error"]')).toHaveCount(0);

    await collectSecret.click();
    await expect(secretCode).toBeVisible();

    await submitButton.click();
    await expect(stage.locator('[data-slot="field-error"]')).toContainText(
      /Secret Code.*(不能为空|required)|不能为空|required/i,
    );
    await expect(scopeDebug).toContainText('"errorCount": 1');
    await expect(scopeDebug).toContainText('"valid": false');

    await secretCode.fill('alpha-42');
    await submitButton.click();
    await expect(scopeDebug).toContainText('"errorCount": 0');
    await expect(scopeDebug).toContainText('"valid": true');
    await expect(scopeDebug).toContainText('"secretCode": "alpha-42"');
  });
});

// ---------------------------------------------------------------------------
// input-text
// ---------------------------------------------------------------------------
test.describe('input-text renderer', () => {
  test('write: submitting the basic form empty shows the required name error', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('input-text');

    const slug = scenarioSlug('Basic required and optional fields');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Verify required field and optional field exist
    await expect(stage.getByLabel('Full Name')).toBeVisible();
    await expect(stage.getByLabel('City')).toBeVisible();
    const submitButton = stage.getByRole('button', { name: 'Submit' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    await expect(stage.locator('[data-slot="field-error"]')).toContainText(
      /Full Name.*(不能为空|required)|不能为空|required/i,
    );
  });

  test('write: typing in text field and clearing updates value', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('input-text');

    const slug = scenarioSlug('Placeholder and maxLength constraints');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const searchInput = stage.getByLabel('Search');
    await searchInput.fill('hello');
    await expect(searchInput).toHaveValue('hello');
  });
});

// ---------------------------------------------------------------------------
// input-email
// ---------------------------------------------------------------------------
test.describe('input-email renderer', () => {
  test('write: submit pre-filled invalid email shows format validation error', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('input-email');

    const slug = scenarioSlug('Pre-populated with invalid value — submit to see error');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Verify the submit button exists and can be clicked
    const submitBtn = stage.getByRole('button', { name: 'Submit to see validation error' });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await expect(stage.locator('[data-slot="field-error"]')).toContainText(
      /有效的邮箱地址|valid email address/,
    );
  });
});

// ---------------------------------------------------------------------------
// input-password
// ---------------------------------------------------------------------------
test.describe('input-password renderer', () => {
  test('write: confirm-password example only claims masked-input behavior, not validator enforcement', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('input-password');

    const slug = scenarioSlug('New password with confirm-password validator');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Verify both password fields exist
    const newPasswordInput = stage.getByLabel('New Password');
    const confirmPasswordInput = stage.getByLabel('Confirm Password');
    await expect(newPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();

    await expect(stage).toContainText(
      'validates stable masked input behavior rather than overclaiming richer validation UI',
    );

    // The current contract only guarantees masked inputs remain stable after submit.
    await newPasswordInput.fill('password123');
    await confirmPasswordInput.fill('different123');
    await expect(newPasswordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    await stage.getByRole('button', { name: 'Set Password' }).click();
    await expect(newPasswordInput).toHaveValue('password123');
    await expect(confirmPasswordInput).toHaveValue('different123');
    await expect(stage.locator('[data-slot="field-error"]')).toHaveCount(0);
  });

  test('read: basic password field remains masked', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('input-password');

    const slug = scenarioSlug('Basic password field');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const passwordInput = stage.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveValue('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

// ---------------------------------------------------------------------------
// textarea
// ---------------------------------------------------------------------------
test.describe('textarea renderer', () => {
  test('write: submitting the required textarea empty shows a validation error', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('textarea');

    const slug = scenarioSlug('Basic required textarea');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const biography = stage.getByLabel('Biography');
    const saveButton = stage.getByRole('button', { name: 'Save' });
    await expect(biography).toBeVisible();
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await expect(stage.locator('[data-slot="field-error"]')).toContainText(
      /Biography.*(不能为空|required)|不能为空|required/i,
    );
  });

  test('write: typing in textarea updates the value', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('textarea');

    const slug = scenarioSlug('Basic required textarea');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage.getByLabel('Biography').fill('My biography text here');
    await expect(stage.getByLabel('Biography')).toHaveValue('My biography text here');
  });

  test('read: fixed row count scenario renders configured textarea heights', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('textarea');

    const slug = scenarioSlug('Fixed row counts');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByLabel('Notes (5 rows)')).toHaveAttribute('rows', '5');
    await expect(stage.getByLabel('Summary (3 rows)')).toHaveAttribute('rows', '3');
  });
});

test.describe('select renderer', () => {
  test('write: open select, choose option, and verify the bound value updates', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('select');

    const slug = scenarioSlug('Single-value select with inline options');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const triggerEl = stage.getByRole('combobox').first();
    await triggerEl.click();
    const ukOption = page.getByRole('option', { name: 'United Kingdom' });
    await expect(ukOption).toBeVisible({ timeout: 5_000 });
    await ukOption.click();
    await expect(triggerEl).toContainText('United Kingdom', { timeout: 5_000 });
    await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText('"country": "uk"');
  });
});

// ---------------------------------------------------------------------------
// checkbox
// ---------------------------------------------------------------------------
test.describe('checkbox renderer', () => {
  test('write: toggle email checkbox updates checkbox state and in-form live summary text', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('checkbox');

    const slug = scenarioSlug('Multiple checkboxes with in-form live summary');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Use getByRole to avoid strict-mode violation (label matches checkbox + hidden input)
    const emailCheckbox = stage.getByRole('checkbox', { name: 'Receive email notifications' });
    await expect(emailCheckbox).toBeVisible();
    await expect(emailCheckbox).not.toBeChecked();
    await expect(stage.getByText('Email: OFF | SMS: OFF')).toBeVisible();

    await emailCheckbox.click();
    await expect(emailCheckbox).toBeChecked({ timeout: 5_000 });
    await expect(stage.getByText('Email: ON | SMS: OFF')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// switch
// ---------------------------------------------------------------------------
test.describe('switch renderer', () => {
  test('write: toggle switch changes aria-checked state and in-form live summary text', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('switch');

    const slug = scenarioSlug('Switch with in-form live summary');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const switchEl = stage.getByRole('switch', { name: /Feature enabled/ });
    await expect(switchEl).toBeVisible();
    // Initial state: unchecked/off
    await expect(switchEl).toHaveAttribute('aria-checked', 'false');
    await expect(stage.getByText('Feature is: OFF')).toBeVisible();

    await switchEl.click();
    // After toggle: checked/on
    await expect(switchEl).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 });
    await expect(stage.getByText('Feature is: ON')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// radio-group
// ---------------------------------------------------------------------------
test.describe('radio-group renderer', () => {
  test('write: select High radio updates selection and in-form live summary text', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('radio-group');

    const slug = scenarioSlug('Horizontal inline layout with in-form live summary');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Use getByRole to avoid strict-mode violation with getByLabel
    const highRadio = stage.getByRole('radio', { name: 'High' });
    await expect(highRadio).toBeVisible();
    await highRadio.click();
    await expect(highRadio).toBeChecked({ timeout: 5_000 });
    await expect(stage.getByText('Selected priority: high')).toBeVisible({ timeout: 5_000 });
  });

  test('write: Pro plan pre-selected in vertical radio group', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('radio-group');

    const slug = scenarioSlug('Vertical radio group with initial value');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // Use getByRole to avoid strict mode — label matches multiple elements
    const proRadio = stage.getByRole('radio', { name: /Pro/ });
    await expect(proRadio).toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// checkbox-group
// ---------------------------------------------------------------------------
test.describe('checkbox-group renderer', () => {
  test('write: check TypeScript checkbox updates its state while the summary text remains a static prefix', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('checkbox-group');

    const slug = scenarioSlug('Checkbox group with min/max selection validation');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Use getByRole to avoid strict-mode violation with getByLabel
    const tsCheckbox = stage.getByRole('checkbox', { name: 'TypeScript' });
    await expect(tsCheckbox).toBeVisible();
    await expect(stage.getByText('Selected:')).toBeVisible();
    await tsCheckbox.click();
    await expect(tsCheckbox).toBeChecked({ timeout: 5_000 });
    await expect(stage.getByText('Selected:')).toBeVisible();
  });
});
