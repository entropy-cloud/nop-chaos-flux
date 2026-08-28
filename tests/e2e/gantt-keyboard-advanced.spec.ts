import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

async function openGantt(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 15_000 });
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

test.describe('Gantt — keyboard: tree folding, delete, undo/redo, bar Space', () => {
  test('ArrowLeft collapses the selected parent, ArrowRight expands it', async ({ page }) => {
    await openGantt(page);
    const rowCount = () => page.locator('[data-slot="gantt-grid-row"]').count();
    const initial = await rowCount();
    expect(initial).toBe(14);

    await selectTask(page, '1');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(initial - 8);
    await expect
      .poll(
        async () =>
          page.locator('[data-slot="gantt-grid-row"][data-task-id="1"] button[aria-expanded]').getAttribute('aria-expanded'),
        { timeout: 5_000 },
      )
      .toBe('false');

    await page.keyboard.press('ArrowRight');
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(14);
    await assertTrackedPageErrors(page);
  });

  test('Delete removes the selected task and its row', async ({ page }) => {
    await openGantt(page);
    await selectTask(page, '2');
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="2"]')).toHaveCount(0, { timeout: 5_000 });
    await expect
      .poll(async () => page.locator('[data-slot="gantt-grid-row"]').count(), { timeout: 5_000 })
      .toBe(13);
    await assertTrackedPageErrors(page);
  });

  test('Ctrl+Z restores a deleted task (undo)', async ({ page }) => {
    await openGantt(page);
    await selectTask(page, '3');
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="3"]')).toHaveCount(0, { timeout: 5_000 });

    await page.keyboard.press('Control+z');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="3"]')).toHaveCount(1, { timeout: 5_000 });
    await expect
      .poll(async () => page.locator('[data-slot="gantt-grid-row"]').count(), { timeout: 5_000 })
      .toBe(14);
    await assertTrackedPageErrors(page);
  });

  test('Ctrl+Shift+Z redoes the deletion after undo', async ({ page }) => {
    await openGantt(page);
    await selectTask(page, '3');
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="3"]')).toHaveCount(0, { timeout: 5_000 });
    await page.keyboard.press('Control+z');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="3"]')).toHaveCount(1, { timeout: 5_000 });

    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="3"]')).toHaveCount(0, { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('Space on a focused bar selects the task', async ({ page }) => {
    await openGantt(page);
    const bar = page.locator('[data-slot="gantt-bar"][data-task-id="6"]');
    await bar.focus();
    await bar.press(' ');
    const row = page.locator('[data-slot="gantt-grid-row"][data-task-id="6"]');
    await expect(row).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('Space on a focused milestone selects the task', async ({ page }) => {
    await openGantt(page);
    const milestone = page.locator('[data-bar-type="milestone"]').first();
    await milestone.focus();
    await milestone.press(' ');
    const taskId = await milestone.getAttribute('data-task-id');
    const row = page.locator(`[data-slot="gantt-grid-row"][data-task-id="${taskId}"]`);
    await expect(row).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });
});
