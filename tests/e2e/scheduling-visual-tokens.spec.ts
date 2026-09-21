import { test, expect, assertTrackedPageErrors } from './fixtures.js';
import { expectComputedStyleNot, getComputedStyleValue } from './helpers/visual-assert.js';

/**
 * Scheduling family visual-token assertions (plan 481, visual-quality V11a).
 * Three groups × light/dark computed-style assertions, consuming the V0
 * helpers (tests/e2e/helpers/visual-assert.ts) with the theme-switcher four-
 * state precedent (theme-switcher.spec.ts). Pass/fail is fully programmatic;
 * no screenshot baselines.
 *
 * ① gantt: grid-row selected color-mix + critical-path destructive top marker
 * ② calendar: today cell primary color-mix + drag-ok/drag-conflict rings
 * ③ kanban: drop-target primary ring (watch-only chain, F3/A4 cost assertion)
 */

const OLD_SELECTED_BLUE = 'rgb(239, 246, 255)'; // #eff6ff — the pre-fix bg-blue-50

async function setMode(page: import('@playwright/test').Page, mode: 'light' | 'dark'): Promise<void> {
  await page.getByLabel('模式').selectOption(mode);
  await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
}

test.describe('gantt visual tokens (plan 481 A1/A2)', () => {
  test('critical path top marker is destructive and flips with mode', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/gantt', { waitUntil: 'commit' });
    const gantt = page.locator('[data-slot="gantt"]');
    await expect(gantt).toBeVisible({ timeout: 20_000 });
    const criticalBar = page.locator('[data-slot="gantt-bar"][data-critical="true"]').first();
    await expect(criticalBar).toBeVisible({ timeout: 15_000 });

    // Legend is part of the §12.6 contract (bottom legend).
    await expect(page.locator('[data-slot="gantt-legend"]')).toBeVisible();

    const markerColor = (_mode: 'light' | 'dark') =>
      criticalBar.evaluate((el) => getComputedStyle(el, '::before').backgroundColor);

    await setMode(page, 'light');
    const light = await markerColor('light');
    expect(light, '::before marker must paint in light').not.toBe('rgba(0, 0, 0, 0)');
    expect(light).not.toBe('');

    await setMode(page, 'dark');
    const dark = await markerColor('dark');
    expect(dark, '::before marker must follow --color-destructive in dark').not.toBe('rgba(0, 0, 0, 0)');
    expect(dark).not.toBe(light);

    await assertTrackedPageErrors(page);
  });

  test('selected grid row background is primary color-mix, not #eff6ff, and adapts to dark', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/gantt', { waitUntil: 'commit' });
    const gantt = page.locator('[data-slot="gantt"]');
    await expect(gantt).toBeVisible({ timeout: 20_000 });

    const firstRow = page.locator('[data-slot="gantt-grid-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await firstRow.click();
    const selectedRow = page.locator('[data-slot="gantt-grid-row"][data-selected="true"]').first();
    await expect(selectedRow).toBeVisible();
    await expect(selectedRow).toHaveAttribute('aria-selected', 'true');

    // The selected bar mirrors the selection (bar-side minimal visual).
    const selectedTaskId = await selectedRow.getAttribute('data-task-id');
    await expect(page.locator(`[data-slot="gantt-bar"][data-task-id="${selectedTaskId}"][data-selected="true"]`)).toBeVisible();

    await setMode(page, 'light');
    await expectComputedStyleNot(selectedRow, 'background-color', OLD_SELECTED_BLUE);
    const light = await getComputedStyleValue(selectedRow, 'background-color');

    await setMode(page, 'dark');
    await expectComputedStyleNot(selectedRow, 'background-color', OLD_SELECTED_BLUE);
    const dark = await getComputedStyleValue(selectedRow, 'background-color');

    expect(dark, 'selection background must flip with data-mode').not.toBe(light);
    await assertTrackedPageErrors(page);
  });
});

test.describe('calendar visual tokens (plan 481 N1/R7)', () => {
  test('today cell uses primary color-mix (not literal blue-50) and flips with mode', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    // Demo pins date 2026-07-20; jump to real today so the marker exists.
    await page.getByRole('button', { name: /Today|今日/ }).click();
    const todayCell = page.locator('[data-slot="calendar-cell"][data-today="true"]').first();
    await expect(todayCell).toBeVisible({ timeout: 10_000 });

    await setMode(page, 'light');
    await expectComputedStyleNot(todayCell, 'background-color', OLD_SELECTED_BLUE);
    const light = await getComputedStyleValue(todayCell, 'background-color');

    await setMode(page, 'dark');
    await expectComputedStyleNot(todayCell, 'background-color', OLD_SELECTED_BLUE);
    const dark = await getComputedStyleValue(todayCell, 'background-color');

    expect(dark).not.toBe(light);
    await assertTrackedPageErrors(page);
  });

  test('drag hover paints drag-ok / drag-conflict rings that flip with mode', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const event = page.locator('[data-slot="calendar-event"]').first();
    await expect(event).toBeVisible({ timeout: 10_000 });
    const eventBox = await event.boundingBox();
    if (!eventBox) throw new Error('event bounding box missing');

    const [sourceDate, sourceResource] = await event.evaluate((el) => {
      const cell = el.closest('[data-slot="calendar-cell"]');
      return [cell?.getAttribute('data-date') ?? '', cell?.getAttribute('data-resource') ?? ''];
    });
    if (!sourceDate || !sourceResource) throw new Error('source cell not found');

    // A different-date cell two columns to the right of the event → valid.
    const targetHandle = await page.evaluate(([date, resource]) => {
      const cells = Array.from(document.querySelectorAll('[data-slot="calendar-cell"][data-date][data-resource]'));
      const source = cells.find((c) => c.getAttribute('data-date') === date && c.getAttribute('data-resource') === resource);
      if (!source) return null;
      const idx = cells.indexOf(source);
      const target = cells[Math.min(idx + 2, cells.length - 1)];
      const r = target.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, date: target.getAttribute('data-date'), resource: target.getAttribute('data-resource') };
    }, [sourceDate, sourceResource]);

    if (!targetHandle) throw new Error('no target cell found');

    await page.mouse.move(eventBox.x + eventBox.width / 2, eventBox.y + eventBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetHandle.x, targetHandle.y, { steps: 8 });

    const okCell = page.locator(`[data-slot="calendar-cell"][data-date="${targetHandle.date}"][data-resource="${targetHandle.resource}"].drag-ok`);
    await expect(okCell).toHaveCount(1);
    const okShadowLight = await getComputedStyleValue(okCell, 'box-shadow');
    expect(okShadowLight, 'drag-ok ring must paint in light').not.toBe('none');

    await setMode(page, 'dark');
    const okShadowDark = await getComputedStyleValue(okCell, 'box-shadow');
    expect(okShadowDark).not.toBe('none');
    expect(okShadowDark, 'drag-ok ring must flip with data-mode').not.toBe(okShadowLight);

    // Hovering the source cell flips the mark to drag-conflict.
    const sourceHandle = await page.evaluate(([date, resource]) => {
      const cell = document.querySelector(`[data-slot="calendar-cell"][data-date="${date}"][data-resource="${resource}"]`);
      if (!cell) return null;
      const r = cell.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, [sourceDate, sourceResource]);

    if (sourceHandle) {
      await page.mouse.move(sourceHandle.x, sourceHandle.y, { steps: 6 });
      const conflictCell = page.locator('[data-slot="calendar-cell"].drag-conflict');
      await expect(conflictCell.first()).toBeVisible();
      const conflictShadow = await getComputedStyleValue(conflictCell.first(), 'box-shadow');
      expect(conflictShadow, 'drag-conflict ring must paint').not.toBe('none');
    }

    await page.mouse.up();
    await expect(page.locator('[data-slot="calendar-cell"].drag-ok')).toHaveCount(0);
    await expect(page.locator('[data-slot="calendar-cell"].drag-conflict')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });
});

test.describe('kanban drop-target ring (plan 481 F3/A4 watch-only fixation)', () => {
  test('drag-over target column paints a primary ring that flips with mode', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const sourceCard = page.locator('[data-slot="kanban-card"][data-column-id="col-todo"]').first();
    await expect(sourceCard).toBeVisible();
    const sourceBox = await sourceCard.boundingBox();
    if (!sourceBox) throw new Error('source card bounding box missing');
    const targetColumn = page.locator('[data-slot="kanban-column"][data-column-id="col-progress"]');
    const targetBox = await targetColumn.boundingBox();
    if (!targetBox) throw new Error('target column bounding box missing');

    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    // pragmatic-drag-and-drop 需要 move 之间有帧间隙才会进入 drag 会话。
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        sourceBox.x + sourceBox.width / 2 + ((targetBox.x + targetBox.width / 2) - (sourceBox.x + sourceBox.width / 2)) * (i / steps),
        sourceBox.y + sourceBox.height / 2 + ((targetBox.y + targetBox.height / 2) - (sourceBox.y + sourceBox.height / 2)) * (i / steps),
      );
      await page.waitForTimeout(50);
    }

    const dropTarget = page.locator('[data-slot="kanban-column"][data-drop-target="true"]');
    await expect(dropTarget).toHaveCount(1);
    const lightShadow = await getComputedStyleValue(dropTarget, 'box-shadow');
    expect(lightShadow, 'drop-target ring must paint in light').not.toBe('none');

    await setMode(page, 'dark');
    const darkShadow = await getComputedStyleValue(dropTarget, 'box-shadow');
    expect(darkShadow).not.toBe('none');
    expect(darkShadow, 'drop-target ring must flip with data-mode').not.toBe(lightShadow);

    await page.mouse.up();
    await assertTrackedPageErrors(page);
  });
});
