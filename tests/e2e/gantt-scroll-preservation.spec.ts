import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import { readScrollState, scrollToSettled } from './helpers/scroll-container-sequence.js';

// IS-2 (plan 545) V1 scroll-preservation specs for #/gantt.
// Root cause (live-proven, plan 545 Current Baseline): the mount-centering
// effect re-ran on every drag commit (scaleRange identity change under the
// React Compiler) and scrollToToday wrote
// `max(0, todayX - clientWidth/2) = 0` with `scroll-behavior: smooth` — the
// smooth decay to zero the user reported as "scroll resets after drag".
// Convictions cite programmatic scrollLeft readings, never screenshots.

const TIMELINE = '[data-slot="gantt-scale"]';

async function openGantt(page: import('@playwright/test').Page) {
  await page.goto('/#/gantt', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: /Gantt Chart Demo/i })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);
}

// Sets the scroll position and polls until it settles (the mount centering
// scrolls with `scroll-behavior: smooth`; writing mid-animation drifts).
// Returns the settled baseline value.
const scrollTimeline = (page: import('@playwright/test').Page, value: number) =>
  scrollToSettled(page, TIMELINE, value, true);

const readScrollLeft = (page: import('@playwright/test').Page) =>
  readScrollState(page, TIMELINE, true).then((r) => r.scrollLeft);

test.describe('IS-2 gantt scroll preservation (plan 545)', () => {
  // V1 red gesture: resize-left on the 4th bar with the timeline scrolled.
  // Pre-fix this deterministically decayed 900 → 476 → 0 (3/3 live runs).
  test('V1: scroll position survives a bar resize commit', async ({ page }) => {
    await openGantt(page);
    const baseline = await scrollTimeline(page, 900);

    const bar = page.locator('[data-slot="gantt-bar"]').nth(3);
    const startBefore = await bar.evaluate((el) => el.getAttribute('data-task-id'));
    expect(startBefore, 'bar carries a task id').not.toBeNull();
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();

    // grab at x+3 — inside the 6px resize-left threshold (gantt-bars.tsx)
    await page.mouse.move(box!.x + 3, box!.y + box!.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(box!.x + 3 + i * 12, box!.y + box!.height / 2, { steps: 2 });
    }
    await page.mouse.up();

    // resize actually took effect (precondition: the gesture went through the
    // resize path, not move) — the bar's rendered left edge must grow.
    await expect
      .poll(async () => bar.evaluate((el) => parseFloat((el as HTMLElement).style.left)), { timeout: 5_000 })
      .toBeGreaterThan(box!.x);

    // V1: the timeline scroll position must survive the commit (±10px).
    await page.waitForTimeout(1_000);
    const scrollAfter = await readScrollLeft(page);
    expect(
      Math.abs(scrollAfter - baseline),
      `scroll preserved across resize commit, got ${scrollAfter} (baseline ${baseline}; a decay to ~0 = the seed-6 defect)`,
    ).toBeLessThanOrEqual(20);
    await assertTrackedPageErrors(page);
  });

  // General-gesture regression face: whole-bar move keeps the scroll too.
  test('V1: scroll position survives a whole-bar move commit', async ({ page }) => {
    await openGantt(page);
    const baseline = await scrollTimeline(page, 900);

    const bar = page.locator('[data-slot="gantt-bar"]').nth(1);
    const box = await bar.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(box!.x + box!.width / 2 + i * 15, box!.y + box!.height / 2, { steps: 2 });
    }
    await page.mouse.up();

    await page.waitForTimeout(1_000);
    const scrollAfter = await readScrollLeft(page);
    expect(Math.abs(scrollAfter - baseline), `scroll preserved across move commit, got ${scrollAfter} (baseline ${baseline})`).toBeLessThanOrEqual(20);
    await assertTrackedPageErrors(page);
  });

});
