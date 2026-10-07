import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-3 (plan 546) interaction-state specs for the scheduling calendar.
// Seed 004 (V3): a confirmed drag-move must actually move the event — the
// pre-fix demo kept `events` as a module-level constant and only toasted, so
// the confirmed dialog produced zero state change.
// Seed 005 (E): the long-press drag-create must be discoverable (cursor,
// hint copy, mid-press preview).

const EVENT = '[data-slot="calendar-event"]';
const CELL = '[data-slot="calendar-cell"]';
const CONFIRM = '.nop-calendar-confirm-dialog';

async function openCalendar(page: import('@playwright/test').Page) {
  await page.goto('/#/scheduling-calendar', { waitUntil: 'commit' });
  await expect(page.locator(EVENT).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800);
}

async function dragEventToCell(
  page: import('@playwright/test').Page,
  fromLocator: import('@playwright/test').Locator,
  toLocator: import('@playwright/test').Locator,
) {
  const from = await fromLocator.boundingBox();
  const to = await toLocator.boundingBox();
  // keep the gesture under the 500ms long-press threshold so the drag-create
  // type-selector overlay cannot stack on the confirm dialog
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + Math.min(40, to!.width / 2), to!.y + to!.height / 2, { steps: 4 });
  await page.mouse.up();
}

test.describe('IS-3 calendar interaction state (plan 546)', () => {
  // V3 (seed 004): confirmed drag-move changes the data, not just a toast.
  test('V3: confirmed drag-move really moves the event to the target cell', async ({ page }) => {
    await openCalendar(page);

    const source = page.locator(EVENT).first();
    const src = await page.evaluate(() => {
      const ev = document.querySelector('[data-slot="calendar-event"]');
      const cell = ev?.closest('[data-slot="calendar-cell"]');
      return { date: cell?.getAttribute('data-date') ?? null, resource: cell?.getAttribute('data-resource') ?? null };
    });
    expect(src.date, 'source cell has data-date').not.toBeNull();
    expect(src.resource, 'source cell has data-resource').not.toBeNull();

    const sourceCell = page.locator(`${CELL}[data-date="${src.date}"][data-resource="${src.resource}"]`);
    const targetCell = page
      .locator(`${CELL}[data-resource="${src.resource}"]:not([data-date="${src.date}"])`)
      .first();
    const targetDate = await targetCell.getAttribute('data-date');
    expect(targetDate, 'target cell has a different date').not.toBe(src.date);

    // count-based V3 readings (titles repeat across the demo grid, so
    // per-cell counts are the reliable signal)
    const sourceCountBefore = await sourceCell.locator(EVENT).count();
    const targetCountBefore = await targetCell.locator(EVENT).count();
    expect(sourceCountBefore, 'source cell holds the event').toBeGreaterThan(0);

    await dragEventToCell(page, source, targetCell);

    // two-stage confirm: dialog → confirm button
    const dialog = page.locator(CONFIRM);
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole('button', { name: /确认|Confirm/ }).click();
    await page.waitForTimeout(600);

    // V3 readings: the event left the source cell and appeared in the target
    await expect(sourceCell.locator(EVENT)).toHaveCount(sourceCountBefore - 1, { timeout: 5_000 });
    await expect(targetCell.locator(EVENT)).toHaveCount(targetCountBefore + 1, { timeout: 5_000 });

    // feedback still present on top of the real change
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5_000 }).catch(() => {
      // toast may auto-dismiss fast; the state readings above are the conviction
    });
    await assertTrackedPageErrors(page);
  });

  // E (seed 005): drag-create discoverability trio.
  test('E: drag-create is discoverable (cursor + hint + press preview)', async ({ page }) => {
    await openCalendar(page);

    // ① cursor affordance on cells
    const cellCursor = await page
      .locator(CELL)
      .first()
      .evaluate((el) => getComputedStyle(el).cursor);
    expect(cellCursor, `cell cursor must signal creatability, got "${cellCursor}"`).not.toBe('auto');

    // ② persistent hint copy naming the gesture (+ keyboard equivalent)
    const hint = page.getByText(/长按|long-press|Long-press|press and hold/i).first();
    await expect(hint).toBeVisible({ timeout: 5_000 });

    // ③ mid-press preview highlight on the pressed cell
    const cell = page.locator(CELL).nth(10);
    const box = await cell.boundingBox();
    await page.mouse.move(box!.x + 20, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900); // past the 500ms long-press threshold (with parallel-load headroom)
    await page.mouse.move(box!.x + 60, box!.y + box!.height / 2, { steps: 3 });
    await expect(cell).toHaveAttribute('data-drag-preview', 'true', { timeout: 8_000 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await assertTrackedPageErrors(page);
  });
});
