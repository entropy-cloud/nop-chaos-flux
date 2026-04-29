/**
 * Behavioral E2E tests for data renderers:
 * crud, table, tree, data-source, chart
 */

import { test, expect } from '@playwright/test';
import { ComponentLabHelper, scenarioSlug } from './helpers';

// ---------------------------------------------------------------------------
// table
// ---------------------------------------------------------------------------
test.describe('table renderer', () => {
  test('read: table column headers render', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('table');

    const slug = scenarioSlug('Table with sortable text columns');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // Use getByRole to avoid strict-mode violation (text also appears in scope debug JSON)
    await expect(stage.getByRole('columnheader', { name: /username/i })).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByRole('columnheader', { name: /email/i })).toBeVisible();
    await expect(stage.getByRole('columnheader', { name: /role/i })).toBeVisible();
    await expect(stage.getByRole('cell', { name: 'alice', exact: true })).toBeVisible();
    await expect(stage.getByRole('cell', { name: 'carol', exact: true })).toBeVisible();
  });

  test('read: empty state message shows when data is empty', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('table');

    const slug = scenarioSlug('Empty state scenario');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText('No users found. Try adjusting your search filters.')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// tree
// ---------------------------------------------------------------------------
test.describe('tree renderer', () => {
  test('read: tree nodes are visible in initially expanded state', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('tree');

    const slug = scenarioSlug('Expand/collapse org tree');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText('Engineering').first()).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText('Frontend').first()).toBeVisible();
    await expect(stage.getByText('Product').first()).toBeVisible();
  });

  test('read: tree custom node template renders depth badges', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('tree');

    const slug = scenarioSlug('Custom node template with depth badge');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText('Engineering').first()).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText('Frontend').first()).toBeVisible();
    await expect(stage.getByText('depth:0').first()).toBeVisible();
    await expect(stage.getByText('depth:1').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// data-source
// ---------------------------------------------------------------------------
test.describe('data-source renderer', () => {
  test('read: pre-loaded scope data — users count text renders', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('data-source');

    const slug = scenarioSlug('Pre-loaded data via page scope (sandbox equivalent)');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    await expect(stage.getByText(/Users loaded via page data: 3/)).toBeVisible({ timeout: 5_000 });
    await expect(stage.getByText('alice')).toBeVisible();
    await expect(stage.getByText('bob')).toBeVisible();
    await expect(stage.getByText('carol')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// chart
// ---------------------------------------------------------------------------
test.describe('chart renderer', () => {
  test('read: bar chart container renders (SVG or canvas element present)', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('chart');

    const slug = scenarioSlug('Bar chart with configured axes and series');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const chartEl = stage.locator('svg, canvas, [class*="chart"], [class*="recharts"]').first();
    await expect(chartEl).toBeVisible({ timeout: 10_000 });
  });

  test('read: line chart container renders', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('chart');

    const slug = scenarioSlug('Line chart — same data, different type');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const chartEl = stage.locator('svg, canvas, [class*="chart"], [class*="recharts"]').first();
    await expect(chartEl).toBeVisible({ timeout: 10_000 });
  });
});
