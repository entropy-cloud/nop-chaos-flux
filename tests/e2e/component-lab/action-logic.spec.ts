/**
 * Behavioral E2E tests for action, logic, and advanced renderers:
 * button, reaction, dynamic-renderer
 */

import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

// ---------------------------------------------------------------------------
// button
// ---------------------------------------------------------------------------
test.describe('button renderer', () => {
  test('read: all button variants render', async ({ page }) => {
    test.setTimeout(60_000);

    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('button');

    const slug = scenarioSlug('All button variants');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Default' })).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Secondary' })).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  test('write: Increment and Reset update the visible counter', async ({ page }) => {
    test.setTimeout(60_000);

    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('button');

    const slug = scenarioSlug('onClick with visible scope side-effect (counter)');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    const incrementBtn = stage.getByRole('button', { name: 'Increment' });
    const resetBtn = stage.getByRole('button', { name: 'Reset' });
    await expect(incrementBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(stage.getByText('Clicks: 0')).toBeVisible();

    await incrementBtn.click();
    await incrementBtn.click();
    await expect(stage.getByText('Clicks: 2')).toBeVisible({ timeout: 5_000 });

    await resetBtn.click();
    await expect(stage.getByText('Clicks: 0')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// reaction
// ---------------------------------------------------------------------------
test.describe('reaction renderer', () => {
  test('write: Increment updates counter and derived doubled value', async ({ page }) => {
    test.setTimeout(60_000);

    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('reaction');

    const slug = scenarioSlug('Counter with derived doubled value');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // counter and doubled are provided via data: { counter: 0, doubled: 0 }
    await expect(stage.getByText('counter: 0')).toBeVisible();
    await expect(stage.getByText('doubled: 0')).toBeVisible();

    const incrementBtn = stage.getByRole('button', { name: 'Increment' });
    await incrementBtn.click();
    await expect(stage.getByText('counter: 1')).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText('doubled: 2')).toBeVisible({ timeout: 5_000 });
  });

  test('write: typing in the watched field updates the visible character count', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('reaction');

    const slug = scenarioSlug('Field-watch for character count');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    const messageField = stage.getByLabel('Message');
    await expect(messageField).toBeVisible();
    await expect(stage.getByText('Character count: 0')).toBeVisible();

    await messageField.fill('hello');
    await expect(messageField).toHaveValue('hello');
    await expect(stage.getByText('Character count: 5')).toBeVisible({ timeout: 5_000 });
    await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText('"charCount": 5');
  });
});

// ---------------------------------------------------------------------------
// dynamic-renderer
// ---------------------------------------------------------------------------
test.describe('dynamic-renderer renderer', () => {
  test('read: loadAction-loaded schema renders the returned fragment', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('dynamic-renderer');

    const slug = scenarioSlug('Static schema loaded through loadAction');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText('Rendered from loadAction')).toBeVisible({ timeout: 5_000 });
  });

  test('write: schema-switching buttons reload the dynamic schema fragment', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('dynamic-renderer');

    const slug = scenarioSlug('Runtime schema switching via buttons');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // Verify the three schema-switching buttons are rendered
    await expect(stage.getByRole('button', { name: 'Show Badge' })).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Show Text' })).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Show Button' })).toBeVisible();
    await expect(stage.getByText('Currently rendering: badge')).toBeVisible();
    await expect(stage.getByText('Dynamically rendered badge')).toBeVisible({ timeout: 5_000 });

    await stage.getByRole('button', { name: 'Show Text' }).click();
    await expect(stage.getByText('Currently rendering: text')).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText('Dynamically rendered text content.')).toBeVisible({
      timeout: 5_000,
    });

    await stage.getByRole('button', { name: 'Show Button' }).click();
    await expect(stage.getByText('Currently rendering: button')).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByRole('button', { name: 'A button from dynamic schema' })).toBeVisible({
      timeout: 5_000,
    });
  });
});
