import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt-states';
const HEADING = /Gantt States/i;

async function openStates(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
}

test.describe('Gantt States — empty / loading / baselines / regions', () => {
  test('bare empty gantt renders container without grid rows', async ({ page }) => {
    await openStates(page);
    const empty = page.locator('[data-testid="gantt-empty-basic"]');
    await expect(empty).toBeAttached({ timeout: 10_000 });
    await expect(empty).toHaveAttribute('data-slot', 'gantt');
    await expect(empty.locator('[data-slot="gantt-grid"]')).toHaveCount(0);
    await expect(empty.locator('[data-slot="gantt-bar"]')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('custom empty region renders host content', async ({ page }) => {
    await openStates(page);
    const regionText = page.locator('[data-testid="gantt-empty-region-text"]');
    await expect(regionText).toBeVisible({ timeout: 10_000 });
    await expect(regionText).toContainText('No tasks yet');
    await assertTrackedPageErrors(page);
  });

  test('loading state renders Skeleton placeholders', async ({ page }) => {
    await openStates(page);
    const loading = page.locator('[data-testid="gantt-loading-skeleton"]');
    await expect(loading).toBeAttached({ timeout: 10_000 });
    const skeletons = loading.locator('[data-slot="skeleton"], .animate-pulse');
    expect(await skeletons.count()).toBeGreaterThanOrEqual(2);
    await expect(loading.locator('[data-slot="gantt-grid"]')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('baseline bars render as translucent rects', async ({ page }) => {
    await openStates(page);
    const baselines = page.locator('[data-testid="gantt-baselines"] [data-slot="gantt-baseline-bar"]');
    await expect(baselines.first()).toBeVisible({ timeout: 10_000 });
    await expect(baselines).toHaveCount(3);
    const fill = await baselines.first().getAttribute('fill');
    expect(fill).toContain('rgba(');
    await assertTrackedPageErrors(page);
  });

  test('baseline deviation dashed lines and +/-Nd labels', async ({ page }) => {
    await openStates(page);
    const deviations = page.locator('[data-testid="gantt-baselines"] [data-slot="gantt-baseline-deviation"]');
    const labels = page.locator('[data-testid="gantt-baselines"] [data-slot="gantt-baseline-label"]');
    await expect(deviations.first()).toBeVisible({ timeout: 10_000 });
    await expect(deviations).toHaveCount(2);
    await expect(labels).toHaveCount(2);
    const texts = await labels.allTextContents();
    expect(texts.join(' ')).toMatch(/\+3d/);
    expect(texts.join(' ')).toMatch(/-2d/);
    const dash = await deviations.first().getAttribute('stroke-dasharray');
    expect(dash).toBeTruthy();
    await assertTrackedPageErrors(page);
  });

  test('custom toolbar region replaces default zoom controls', async ({ page }) => {
    await openStates(page);
    const toolbar = page.locator('[data-testid="gantt-toolbar-region"] [data-slot="gantt-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="gantt-toolbar-region-text"]')).toContainText('Host toolbar region');
    await expect(toolbar.locator('button')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('custom task bar region renders per-task content', async ({ page }) => {
    await openStates(page);
    const gantt = page.locator('[data-testid="gantt-taskbar-region"]');
    await expect(gantt.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(gantt).toContainText('◆Region Bar◆');
    await assertTrackedPageErrors(page);
  });

  test('custom column region renders task-scoped cell content', async ({ page }) => {
    await openStates(page);
    const gantt = page.locator('[data-testid="gantt-column-region"]');
    await expect(gantt.locator('[data-slot="gantt-grid-row"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="gantt-column-region-start"]')).toHaveCount(2, { timeout: 10_000 });
    await expect(gantt).toContainText('≔ 2026-08-02');
    await expect(gantt).toContainText('≔ 2026-08-10');
    await assertTrackedPageErrors(page);
  });
});
