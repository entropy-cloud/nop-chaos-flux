/**
 * Behavioral E2E tests for complex and composite form renderers:
 * input-tree, tree-select, tag-list, key-value, array-editor,
 * condition-builder, object-field, array-field, variant-field,
 * detail-field, detail-view
 */

import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

test.describe('input-number renderer', () => {
  test('write: required numeric field validates and stepper input accepts numeric edits', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('input-number');

    const slug = scenarioSlug('Required numeric fields and stepper behavior');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage.getByRole('button', { name: 'Submit' }).click();
    await expect(stage.getByText(/required/i)).toBeVisible({ timeout: 5_000 });

    const stepInput = stage.getByLabel('Step Size');
    await expect(stepInput).toHaveValue('10');
    await stepInput.fill('15');
    await expect(stepInput).toHaveValue('15');
  });
});

// ---------------------------------------------------------------------------
// input-tree
// ---------------------------------------------------------------------------
test.describe('input-tree renderer', () => {
  test('write: tree nodes are visible and clicking a node changes its state', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('input-tree');

    const slug = scenarioSlug('Radio mode — single department selection');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // Tree options are rendered inline — verify nodes are visible
    await expect(stage.getByText('Engineering').first()).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText('Design').first()).toBeVisible();

    // Click a node to select it
    await stage
      .locator('[data-slot="tree-option-node"] [role="treeitem"]')
      .filter({ hasText: 'Engineering' })
      .first()
      .click();
    await expect(stage.getByText('Selected: engineering')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// tree-select
// ---------------------------------------------------------------------------
test.describe('tree-select renderer', () => {
  test('write: tree-select opens popover, selects an option, and updates the bound value', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('tree-select');

    const slug = scenarioSlug('Single-value tree select with search');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage
      .locator('[data-slot="tree-select-trigger-row"] [data-slot="popover-trigger"]')
      .first()
      .click();
    await expect(page.getByPlaceholder('搜索 Select Team')).toBeVisible({ timeout: 5_000 });
    await page
      .locator('[data-slot="tree-option-node"] [role="treeitem"]')
      .filter({ hasText: 'Platform' })
      .first()
      .click();
    await expect(stage.locator('[data-slot="tree-select-value"]')).toContainText('Platform');
    await expect(stage.getByText('Selected: platform')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// tag-list
// ---------------------------------------------------------------------------
test.describe('tag-list renderer', () => {
  test('write: pre-populated tags render and toggling a tag updates the live text', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('tag-list');

    const slug = scenarioSlug('Pre-populated technology tags');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByRole('button', { name: 'react' })).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText('Current tags: react, typescript, vite')).toBeVisible();

    await stage.getByRole('button', { name: 'typescript' }).click({ force: true });
    await expect(stage.getByText('Current tags: react, vite')).toBeVisible();
  });

  test('write: empty tag-list scenario adds a label and updates the count', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('tag-list');

    const slug = scenarioSlug('Starting from empty — add issue labels');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Apply Labels' })).toBeVisible({
      timeout: 5_000,
    });
    await expect(stage.getByText('0 label(s) added')).toBeVisible();

    await stage.getByText('bug').click();
    await expect(stage.getByText('1 label(s) added')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// key-value
// ---------------------------------------------------------------------------
test.describe('key-value renderer', () => {
  test('write: pre-populated HTTP headers are visible and a new row can be added', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('key-value');

    const slug = scenarioSlug('HTTP header editing');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // getByDisplayValue is a Page-level API, not available on Locator.
    // Use stage.locator('input[value="..."]') instead.
    // 'Content-Type' appears once; 'application/json' appears twice (rows 1 and 3).
    await expect(stage.locator('input[value="Content-Type"]')).toBeVisible({ timeout: 5_000 });
    await expect(stage.locator('input[value="application/json"]').first()).toBeVisible();

    await stage.getByRole('button', { name: /添加|add/i }).click();
    const keyInputs = stage.locator('input[placeholder="Key"], input[placeholder="VARIABLE_NAME"], input').filter({ hasNotText: '' });
    const valueInputs = stage.locator('input[placeholder="Value"], input[placeholder="value"], input');
    await keyInputs.nth(3).fill('X-Trace-Id');
    await valueInputs.nth(4).fill('trace-123');
    await expect(stage.locator('input[value="X-Trace-Id"]')).toBeVisible();
    await expect(stage.locator('input[value="trace-123"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// array-editor
// ---------------------------------------------------------------------------
test.describe('array-editor renderer', () => {
  test('write: array-editor renders pre-populated rows and supports adding a new item', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('array-editor');

    const slug = scenarioSlug('Contact list with pre-populated scalar items');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.locator('input[value="Alice Johnson <alice@example.com>"]')).toBeVisible({
      timeout: 5_000,
    });
    await expect(stage.locator('input[value="Bob Smith <bob@example.com>"]')).toBeVisible();
    await expect(stage.getByRole('button', { name: '删除' }).first()).toBeVisible({
      timeout: 5_000,
    });
    const addButton = stage.getByRole('button', { name: '添加项' }).or(stage.getByRole('button', { name: /Add/ }));
    await expect(addButton).toBeVisible();
    await addButton.click();

    const inputs = stage.locator('input');
    await inputs.nth(2).fill('Charlie Brown <charlie@example.com>');
    await expect(stage.locator('input[value="Charlie Brown <charlie@example.com>"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// condition-builder
// ---------------------------------------------------------------------------
test.describe('condition-builder renderer', () => {
  test('read: simple condition builder renders its preloaded rule through visible controls', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('condition-builder');

    const slug = scenarioSlug('Simple single-rule AND group');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.locator('[data-slot="condition-group"]')).toBeVisible();
    const andButton = stage.getByRole('button', { name: /^AND$|^并且$/ });
    await expect(andButton).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// object-field
// ---------------------------------------------------------------------------
test.describe('object-field renderer', () => {
  test('read: pre-populated address sub-fields are visible', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('object-field');

    const slug = scenarioSlug('Inline address editing');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // getByDisplayValue is a Page-level API, not available on Locator.
    // Use stage.locator('input[value="..."]') instead.
    await expect(stage.locator('input[value="123 Main St"]')).toBeVisible({ timeout: 5_000 });
    await expect(stage.locator('input[value="Springfield"]')).toBeVisible();
  });

  test('write: edit street sub-field updates value', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('object-field');

    const slug = scenarioSlug('Inline address editing');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    // Use getByLabel to find the street input (avoid value-based locator which breaks after fill)
    const streetInput = stage.getByLabel('Street');
    await expect(streetInput).toBeVisible();
    await streetInput.fill('456 Elm St');
    await expect(streetInput).toHaveValue('456 Elm St');
  });
});

// ---------------------------------------------------------------------------
// array-field
// ---------------------------------------------------------------------------
test.describe('array-field renderer', () => {
  test('read: preloaded object rows render their child controls and values', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('array-field');

    const slug = scenarioSlug('Team members with name and role');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByLabel('Name').first()).toHaveValue('Alice');
    await expect(stage.getByLabel('Name').nth(1)).toHaveValue('Bob');
    await expect(stage.getByRole('combobox').first()).toContainText(/Admin/i);
    await expect(stage.getByRole('combobox').nth(1)).toContainText(/Editor/i);
    await expect(stage.getByText('删除')).toHaveCount(2);
  });

  test('write: add a contact row and keep the entered values visible in the new item', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('array-field');

    const slug = scenarioSlug('Contact list with submit result display');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText(/Add contacts and submit/)).toBeVisible();

    const addButton = stage.getByText('添加项').first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    const nameInput = stage.getByLabel('Name').last();
    const emailInput = stage.getByLabel('Email').last();
    await nameInput.fill('Jane Doe');
    await emailInput.fill('jane@example.com');
    await stage.getByRole('button', { name: 'Submit' }).click();
    await expect(nameInput).toHaveValue('Jane Doe');
    await expect(emailInput).toHaveValue('jane@example.com');
  });
});

// ---------------------------------------------------------------------------
// variant-field
// ---------------------------------------------------------------------------
test.describe('variant-field renderer', () => {
  test('write: switching tabs updates the active editor and preserves the edited string value', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('variant-field');

    const slug = scenarioSlug('String vs list editor with scope-state switching');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByRole('button', { name: /Submit/i })).toBeVisible({ timeout: 5_000 });
    const root = stage.locator('[data-active-variant]').first();
    const textTab = stage.getByRole('tab', { name: 'Single String' }).first();
    const listTab = stage.getByRole('tab', { name: 'String List' }).first();

    await expect(root).toHaveAttribute('data-active-variant', 'text');
    await expect(textTab).toHaveAttribute('aria-selected', 'true');
    await expect(listTab).toHaveAttribute('aria-selected', 'false');
    await expect(stage.getByLabel('Expression')).toHaveValue('status = active');

    await listTab.click({ force: true });

    await expect(root).toHaveAttribute('data-active-variant', 'list');
    await expect(textTab).toHaveAttribute('aria-selected', 'false');
    await expect(listTab).toHaveAttribute('aria-selected', 'true');
    await expect(
      stage.getByText('Editing a string array. Add/remove rows to verify list output.'),
    ).toBeVisible();
    await expect(stage.getByText('Current runtime value: List editor active')).toBeVisible();

    await textTab.click({ force: true });

    await expect(root).toHaveAttribute('data-active-variant', 'text');
    await expect(textTab).toHaveAttribute('aria-selected', 'true');
    await expect(listTab).toHaveAttribute('aria-selected', 'false');
    await stage.getByLabel('Expression').fill('priority = high');
    await expect(stage.getByLabel('Expression')).toHaveValue('priority = high');
    await expect(stage.getByText('Current runtime value: String editor active')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// detail-field
// ---------------------------------------------------------------------------
test.describe('detail-field renderer', () => {
  test('edit: click Edit, change first name, confirm, verify updated name in viewer', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('detail-field');

    const slug = scenarioSlug('User profile editing via dialog');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText('Ada Lovelace')).toBeVisible({ timeout: 5_000 });

    const editButton = stage.getByRole('button', { name: '编辑User Profile' }).first();
    await editButton.click({ force: true });
    await expect(page.getByLabel('First Name')).toBeVisible({ timeout: 5_000 });

    await page.getByLabel('First Name').fill('Grace');
    await page
      .getByRole('button', { name: /确认|Confirm/ })
      .first()
      .click();

    await expect(stage.getByText(/Grace Lovelace/)).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// detail-view
// ---------------------------------------------------------------------------
test.describe('detail-view renderer', () => {
  test('read: viewer slot shows initial report data', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('detail-view');

    const slug = scenarioSlug('Report summary — text display with edit dialog');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // Viewer renders 'Title: ${summary.title}' → 'Title: Annual Report 2025'
    await expect(stage.getByText(/Title:.*Annual Report 2025/)).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText(/Author:.*Finance Team/)).toBeVisible();
  });

  test('edit: click Edit, fill title, confirm, verify updated title in viewer', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('detail-view');

    const slug = scenarioSlug('Report summary — text display with edit dialog');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText(/Title:.*Annual Report 2025/)).toBeVisible({ timeout: 5_000 });

    const editButton = stage.getByRole('button', { name: '编辑Report Summary' }).first();
    await editButton.click();
    await expect(page.getByLabel('Title')).toBeVisible({ timeout: 5_000 });

    await page.getByLabel('Title').fill('Annual Report 2026');
    await page
      .getByRole('button', { name: /确认|Confirm/ })
      .first()
      .click();

    await expect(page.getByLabel('Title')).not.toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText(/Title:.*Annual Report 2026/)).toBeVisible({ timeout: 5_000 });
  });
});
