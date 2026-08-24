import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const STATES_ROUTE = '/#/gantt-states';
const HEADING = /Gantt Chart Demo/i;
const STATES_HEADING = /Gantt States/i;

async function openGantt(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 15_000 });
}

async function openGanttStates(page: import('@playwright/test').Page) {
  await page.goto(STATES_ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: STATES_HEADING })).toBeVisible({ timeout: 25_000 });
}

async function selectTask(page: import('@playwright/test').Page, taskId: string) {
  const grid = page.locator('[role="grid"]').first();
  await grid.focus();
  await page.keyboard.press('ArrowDown');
  for (let i = 0; i < 20; i++) {
    const active = await page.evaluate(() => document.activeElement?.getAttribute('data-task-id') ?? null);
    if (active === taskId) return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error(`task ${taskId} not reachable via ArrowDown`);
}

async function selectRowByClick(page: import('@playwright/test').Page, taskId: string) {
  const row = page.locator(`[data-slot="gantt-grid-row"][data-task-id="${taskId}"]`);
  await row.locator('[data-slot="gantt-grid-cell"]').nth(1).click();
  await expect(row).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
}

test.describe('Gantt — coverage gaps: root ARIA, fit zoom, blur commit, keyboard folding', () => {
  test('root container exposes role=grid and tabindex=0', async ({ page }) => {
    await openGantt(page);
    const root = page.locator('[data-slot="gantt"]').first();
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('role', 'grid');
    await expect(root).toHaveAttribute('tabindex', '0');
    await expect(root).toHaveAttribute('aria-label');
    await assertTrackedPageErrors(page);
  });

  test('Zoom to Fit returns the scale to the middle zoom level', async ({ page }) => {
    await openGantt(page);
    const zoomIn = page.locator('[data-slot="gantt-toolbar"] button').nth(1);
    const fit = page.locator('[data-slot="gantt-toolbar"] button').nth(2);

    // Week (default) scale header shows W%V labels.
    const scaleRows = page.locator('[data-slot="gantt-scale"] > div');
    await expect(scaleRows).toHaveCount(2, { timeout: 10_000 });
    await expect(scaleRows.first().locator('[data-slot="gantt-scale-cell"]').first()).toHaveText(/^W\d+$/);

    // Zoom in once → day level (day-of-month numbers).
    await zoomIn.click();
    await expect(scaleRows.first().locator('[data-slot="gantt-scale-cell"]').first()).not.toHaveText(/^W\d+$/, {
      timeout: 5_000,
    });

    // Fit → back to the middle (week) zoom, W%V labels return.
    await fit.click();
    await expect(scaleRows.first().locator('[data-slot="gantt-scale-cell"]').first()).toHaveText(/^W\d+$/, {
      timeout: 5_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('inline edit commit via blur updates task text', async ({ page }) => {
    await openGantt(page);
    const row = page.locator('[data-slot="gantt-grid-row"]').nth(1);
    await row.dblclick();

    const input = page.locator('[data-slot="gantt-grid"] input');
    await expect(input).toBeVisible({ timeout: 3_000 });
    await input.fill('Blurred Commit');
    await input.blur();

    await expect(input).not.toBeVisible({ timeout: 3_000 });
    const texts = await page.locator('[data-slot="gantt-grid-row"]').allTextContents();
    expect(texts.some((t) => t.includes('Blurred Commit'))).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('task bars expose a readable aria-label', async ({ page }) => {
    await openGantt(page);
    const bar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-label', /^(Task|任务)[:：]/);
    await assertTrackedPageErrors(page);
  });

  test('Backspace removes the selected task (Delete sibling path)', async ({ page }) => {
    await openGantt(page);
    await selectTask(page, '5');
    await page.keyboard.press('Backspace');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="5"]')).toHaveCount(0, { timeout: 5_000 });
    await expect
      .poll(async () => page.locator('[data-slot="gantt-grid-row"]').count(), { timeout: 5_000 })
      .toBe(13);
    await assertTrackedPageErrors(page);
  });

  test('ArrowLeft on every parent collapses all rows; ArrowRight restores them', async ({ page }) => {
    await openGantt(page);
    const rowCount = () => page.locator('[data-slot="gantt-grid-row"]').count();
    await expect.poll(rowCount, { timeout: 10_000 }).toBe(14);

    await selectRowByClick(page, '1');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(6);

    await selectRowByClick(page, '10');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(2);

    await selectRowByClick(page, '1');
    await page.keyboard.press('ArrowRight');
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(10);

    await selectRowByClick(page, '10');
    await page.keyboard.press('ArrowRight');
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(14);
    await assertTrackedPageErrors(page);
  });

  test('deleting every task transitions the chart into the empty state', async ({ page }) => {
    await openGantt(page);
    const rows = page.locator('[data-slot="gantt-grid-row"]');
    await expect(rows.first()).toBeVisible();

    // Delete selects-null + focuses the container, so each iteration re-selects
    // the first visible task before deleting it. The initial focus must land on
    // the grid container for the keydown handler to receive the first press.
    await page.locator('[role="grid"]').first().focus();
    for (let guard = 0; guard < 40; guard++) {
      const before = await rows.count();
      if (before === 0) break;
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Delete');
      await expect
        .poll(async () => rows.count(), { timeout: 5_000 })
        .toBeLessThan(before);
    }

    await expect(rows).toHaveCount(0);
    await expect(page.locator('[data-slot="gantt-bar"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="gantt"]').first()).toBeVisible();
    await assertTrackedPageErrors(page);
  });
});

test.describe('Gantt — default zoom level formats (no zoomLevels config)', () => {
  test('week default renders YYYY + DD rows, zoom in shows MM/DD, zoom out shows month row', async ({ page }) => {
    await openGanttStates(page);
    const gantt = page.locator('[data-testid="gantt-default-zoom"]');
    await expect(gantt).toBeVisible({ timeout: 15_000 });
    await expect(gantt.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 15_000 });

    const scale = gantt.locator('[data-slot="gantt-scale"]');
    const rows = scale.locator('> div');
    // In the zoom table (day→week→month by index), − moves toward day and +
    // moves toward month.
    const zoomOut = gantt.locator('[data-slot="gantt-toolbar"] button').nth(0);
    const zoomIn = gantt.locator('[data-slot="gantt-toolbar"] button').nth(1);

    // Default zoom is week: top row %Y labels, bottom row %d labels.
    await expect(rows).toHaveCount(2, { timeout: 10_000 });
    const weekTopLabels = await rows.first().locator('[data-slot="gantt-scale-cell"]').allTextContents();
    expect(weekTopLabels.length).toBeGreaterThanOrEqual(8);
    for (const label of weekTopLabels) expect(label).toMatch(/^20\d{2}$/);
    const weekBottomLabels = await rows.nth(1).locator('[data-slot="gantt-scale-cell"]').allTextContents();
    expect(weekBottomLabels.length).toBeGreaterThanOrEqual(30);
    for (const label of weekBottomLabels) expect(label).toMatch(/^\d{1,2}$/);

    // Zoom out → day level: a single %m/%d row.
    await zoomOut.click();
    await expect
      .poll(async () => rows.count(), { timeout: 5_000 })
      .toBe(1);
    const dayLabels = await rows.first().locator('[data-slot="gantt-scale-cell"]').allTextContents();
    expect(dayLabels.length).toBeGreaterThanOrEqual(30);
    for (const label of dayLabels) expect(label).toMatch(/^\d{2}\/\d{2}$/);

    // Back to week, then zoom in → month level: top row cell count drops to a
    // few months.
    await zoomIn.click();
    await expect
      .poll(async () => rows.count(), { timeout: 5_000 })
      .toBe(2);
    await zoomIn.click();
    await expect
      .poll(async () => rows.first().locator('[data-slot="gantt-scale-cell"]').count(), { timeout: 5_000 })
      .toBeLessThanOrEqual(5);
    const monthTopLabels = await rows.first().locator('[data-slot="gantt-scale-cell"]').allTextContents();
    for (const label of monthTopLabels) expect(label).toMatch(/^20\d{2}$/);
    await assertTrackedPageErrors(page);
  });
});
