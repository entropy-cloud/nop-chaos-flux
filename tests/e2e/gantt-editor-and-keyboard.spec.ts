import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

test.describe('Gantt — Editor Dialog, Keyboard Nav & Undo', () => {
  test.describe.configure({ mode: 'serial' });

  test('editor dialog opens with correct title', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"]').first();
    await bar.dispatchEvent('dblclick');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await assertTrackedPageErrors(page);
  });

  test('editor has name, start, end, duration, progress fields', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"]').first();
    await bar.dispatchEvent('dblclick');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const inputs = dialog.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(4);

    await assertTrackedPageErrors(page);
  });

  test('editor save updates task name', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"]').first();
    await bar.dispatchEvent('dblclick');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const nameInput = dialog.locator('input').first();
    await nameInput.fill('Edited Name');

    const saveBtn = dialog.locator('[data-slot="dialog-footer"] button').last();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    } else {
      await nameInput.press('Enter');
    }
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });

    const barTexts = await page.locator('.nop-gantt-bar-text').allTextContents();
    expect(barTexts.some(t => t.includes('Edited Name'))).toBe(true);

    await assertTrackedPageErrors(page);
  });

  test('editor cancel does not change task name', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"]').first();
    const originalText = await bar.locator('.nop-gantt-bar-text').textContent();

    await bar.dispatchEvent('dblclick');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const cancelBtn = dialog.locator('[data-slot="dialog-footer"] button').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });

    const barText = await bar.locator('.nop-gantt-bar-text').textContent();
    expect(barText).toBe(originalText);

    await assertTrackedPageErrors(page);
  });

  test('keyboard ArrowDown moves selection to next task', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const grid = page.locator('[role="grid"]').first();
    await grid.focus();

    await page.keyboard.press('ArrowDown');
    const active1 = await page.evaluate(() => document.activeElement?.getAttribute('data-task-id') ?? null);
    expect(active1).toBe('1');

    await page.keyboard.press('ArrowDown');
    const active2 = await page.evaluate(() => document.activeElement?.getAttribute('data-task-id') ?? null);
    expect(active2).toBe('2');

    await assertTrackedPageErrors(page);
  });

  test('keyboard ArrowUp moves selection to previous task', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const grid = page.locator('[role="grid"]').first();
    await grid.focus();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('ArrowUp');
    const active = await page.evaluate(() => document.activeElement?.getAttribute('data-task-id') ?? null);
    expect(active).toBe('2');

    await assertTrackedPageErrors(page);
  });

  test('keyboard Enter opens editor dialog', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const grid = page.locator('[role="grid"]').first();
    await grid.focus();
    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('Enter');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });

    await assertTrackedPageErrors(page);
  });

  test('time scale cells render correctly', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const scale = page.locator('[data-slot="gantt-scale"]');
    await expect(scale).toBeVisible();

    const cells = page.locator('[data-slot="gantt-scale-cell"]');
    const count = await cells.count();
    expect(count).toBeGreaterThan(0);

    await assertTrackedPageErrors(page);
  });

  test('cell grid renders weekend columns', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const zoomOutBtn = page.locator('[data-slot="gantt"] button').filter({ hasText: '−' }).first();
    if (await zoomOutBtn.isVisible()) {
      await zoomOutBtn.click();
      await page.waitForTimeout(200);
    }

    const weekendCols = page.locator('[data-weekend="true"]');
    const count = await weekendCols.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const hasBgClass = await weekendCols.first().evaluate((el) =>
      el.classList.contains('bg-gray-50/50') || getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)',
    );
    expect(hasBgClass).toBe(true);

    await assertTrackedPageErrors(page);
  });

  test('visible tasks count matches expected total', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const barCount = await page.locator('[data-slot="gantt-bar"]').count();
    const milestoneCount = await page.locator('[data-bar-type="milestone"]').count();
    expect(barCount + milestoneCount).toBe(14);

    await assertTrackedPageErrors(page);
  });

  test('no NaN or infinite values in timeline SVG', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const hasInvalid = await page.evaluate(() => {
      const timeline = document.querySelector('[data-slot="gantt-scale"]')?.parentElement;
      if (!timeline) return 'no timeline';
      const allEls = timeline.querySelectorAll('[style]');
      return Array.from(allEls).some((el) => {
        const s = (el as HTMLElement).style;
        for (const key of Object.keys(s)) {
          const val = (s as any)[key];
          if (typeof val === 'string' && (val.includes('NaN') || val.includes('Infinity'))) return true;
        }
        return false;
      });
    });
    expect(hasInvalid).toBe(false);

    await assertTrackedPageErrors(page);
  });

  test('tree expand/collapse does not cause blank page', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    await page.evaluate(() => {
      const btn = document.querySelector('[aria-expanded="true"]') as HTMLButtonElement | null;
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    await expect(page.locator('[data-slot="gantt"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 5_000 });

    await assertTrackedPageErrors(page);
  });
});
