import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * ECharts renderer lab smoke (real browser, programmatic DOM asserts — no
 * screenshots, per canvas-test discipline):
 *
 * 1. bar scenario renders a real echarts canvas (non-zero size).
 * 2. dataset-swap scenario: clicking the swap button keeps the chart mounted
 *    (no explicit empty state, no data-empty marker) without page errors.
 */

test('echarts: bar scenario renders a real canvas of non-zero size', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('echarts');

  const slug = scenarioSlug('Click event → flux action');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const canvas = stage.locator('[data-slot="echarts-canvas"] canvas');
  await expect(canvas).toHaveCount(1, { timeout: 15_000 });

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
});

test('echarts: dataset swap keeps the chart mounted without errors', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('echarts');

  const slug = scenarioSlug('Dataset binding with a data swap button');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await expect(stage.locator('[data-slot="echarts-canvas"] canvas')).toBeVisible({
    timeout: 15_000,
  });

  await stage.getByRole('button', { name: 'Load Apr–Jun batch' }).click();

  await expect(stage.locator('[data-slot="echarts-empty"]')).toHaveCount(0);
  await expect(stage.locator('.nop-echarts[data-empty="true"]')).toHaveCount(0);
  await expect(stage.locator('[data-slot="echarts-canvas"] canvas')).toBeVisible();
});
