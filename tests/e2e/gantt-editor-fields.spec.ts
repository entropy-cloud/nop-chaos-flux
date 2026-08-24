import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

async function openEditorForTask2(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
  const bar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
  await expect(bar).toBeVisible({ timeout: 15_000 });
  await bar.dispatchEvent('dblclick');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

test.describe('Gantt — editor dialog field contract', () => {
  test('dialog title reads Edit Task', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText('编辑任务');
    await assertTrackedPageErrors(page);
  });

  test('name field has id suffix -edit-text with task name default', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    const name = dialog.locator('input[id$="-edit-text"]');
    await expect(name).toBeVisible();
    await expect(name).toHaveValue('Requirements');
    await assertTrackedPageErrors(page);
  });

  test('start field is a date input with the task start date', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    const start = dialog.locator('input[id$="-edit-start"]');
    await expect(start).toBeVisible();
    await expect(start).toHaveAttribute('type', 'date');
    await expect(start).toHaveValue('2026-07-01');
    await assertTrackedPageErrors(page);
  });

  test('end field is a date input with the task end date', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    const end = dialog.locator('input[id$="-edit-end"]');
    await expect(end).toBeVisible();
    await expect(end).toHaveAttribute('type', 'date');
    await expect(end).toHaveValue('2026-07-10');
    await assertTrackedPageErrors(page);
  });

  test('duration field is a number input with the task duration', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    const duration = dialog.locator('input[id$="-edit-duration"]');
    await expect(duration).toBeVisible();
    await expect(duration).toHaveAttribute('type', 'number');
    expect(await duration.inputValue()).toMatch(/^\d+$/);
    await assertTrackedPageErrors(page);
  });

  test('progress field is a number input clamped 0..100 with initial value', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    const progress = dialog.locator('input[id$="-edit-progress"]');
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute('type', 'number');
    await expect(progress).toHaveAttribute('min', '0');
    await expect(progress).toHaveAttribute('max', '100');
    await expect(progress).toHaveValue('100');
    await assertTrackedPageErrors(page);
  });

  test('Save commits the edited name into the grid row', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    await dialog.locator('input[id$="-edit-text"]').fill('Edited Via Dialog');
    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="2"]')).toContainText('Edited Via Dialog', {
      timeout: 5_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('Cancel keeps the original name', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    await dialog.locator('input[id$="-edit-text"]').fill('Should Not Persist');
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="2"]')).toContainText('Requirements');
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="2"]')).not.toContainText('Should Not Persist');
    await assertTrackedPageErrors(page);
  });

  test('Escape closes the editor without saving', async ({ page }) => {
    const dialog = await openEditorForTask2(page);
    await dialog.locator('input[id$="-edit-text"]').fill('Escaped Edit');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-slot="gantt-grid-row"][data-task-id="2"]')).not.toContainText('Escaped Edit');
    await assertTrackedPageErrors(page);
  });
});
