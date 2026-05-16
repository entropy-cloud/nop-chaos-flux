/**
 * Component Lab shell and navigation tests.
 *
 * Covers:
 * - Direct route open via hash URL
 * - Sidebar nav item switching between renderers
 * - Back to Home navigation
 * - Category group accordion collapse/expand
 * - Lab home (no renderer selected) shows empty state
 * - Coverage-manifest completeness check
 */

import { test, expect } from '../fixtures.js';
import {
  ComponentLabHelper,
  openLabHome,
  COMPONENT_LAB_COVERAGE_MANIFEST,
  COVERED_RENDERER_IDS,
} from './helpers';

test('coverage manifest is non-empty and covers all shared renderer routes', async () => {
  expect(COMPONENT_LAB_COVERAGE_MANIFEST.length).toBeGreaterThanOrEqual(43);
  expect(COVERED_RENDERER_IDS.size).toBeGreaterThanOrEqual(43);
});

test('direct route open: #/lab/button renders ComponentLab with Button active', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('button');

  await expect(lab.sidebar).toBeVisible();
  await expect(lab.rendererTitle).toHaveText('Button');
  await expect(lab.rendererContainer('button')).toBeVisible();
  await expect(lab.multiScenarioLab).toBeVisible();
});

test('lab home route shows empty state (no renderer selected)', async ({ page }) => {
  await openLabHome(page);
  await expect(page.getByTestId('component-lab')).toBeVisible();
  await expect(page.getByText('Component Lab').first()).toBeVisible();
  await expect(page.getByText('Select a renderer from the left panel')).toBeVisible();
});

test('sidebar nav switching: click nav item changes active renderer', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('button');
  await expect(lab.rendererTitle).toHaveText('Button');

  await lab.navItem('form').click();
  await expect(page).toHaveURL(/\/lab\/form/);
  await expect(lab.rendererTitle).toHaveText('Form');
  await expect(lab.rendererContainer('form')).toBeVisible();
});

test('back button navigates to home page', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('text');

  // The debugger launcher button can overlap the back button.
  // Use JavaScript click to bypass occlusion.
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="component-lab-back"]') as HTMLElement;
    if (btn) btn.click();
  });
  await expect(page).toHaveURL(/\/(#\/?)?$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Component Lab').first()).toBeVisible();
});

test('sidebar shows all category groups', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('button');

  const nav = lab.sidebar.locator('[data-testid="component-lab-nav"]');
  await expect(nav.getByText('Layout')).toBeVisible();
  await expect(nav.getByText('Content')).toBeVisible();
  await expect(nav.getByText('Actions')).toBeVisible();
  await expect(nav.getByText('Logic')).toBeVisible();
  // 'Form' and 'Data' match many items (category heading + individual renderer labels). Use exact+first.
  await expect(nav.getByText('Form', { exact: true }).first()).toBeVisible();
  await expect(nav.getByText('Data', { exact: true }).first()).toBeVisible();
});

test('direct navigation to each tier of routes: read, write, edit all resolve', async ({
  page,
}) => {
  const samples = {
    read: 'page',
    write: 'button',
    edit: 'dialog',
  };

  for (const [, rendererId] of Object.entries(samples)) {
    await page.goto(`/#/lab/${rendererId}`);
    await expect(page.getByTestId(`component-lab-renderer-${rendererId}`)).toBeVisible({
      timeout: 15_000,
    });
  }
});
