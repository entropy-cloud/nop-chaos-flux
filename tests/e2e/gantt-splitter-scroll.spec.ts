import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

async function openGantt(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 15_000 });
}

test.describe('Gantt — splitter & two-way scroll sync', () => {
  test('mouse drag on the splitter widens the grid panel', async ({ page }) => {
    await openGantt(page);
    const splitter = page.locator('[role="separator"]');
    const before = await splitter.evaluate((el) => parseFloat(el.getAttribute('aria-valuenow') ?? '0'));
    const box = await splitter.boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(box!.x + box!.width / 2 + i * 20, box!.y + box!.height / 2, { steps: 2 });
    }
    await page.mouse.up();

    await expect
      .poll(async () => splitter.evaluate((el) => parseFloat(el.getAttribute('aria-valuenow') ?? '0')), { timeout: 5_000 })
      .toBeGreaterThan(before);
    await assertTrackedPageErrors(page);
  });

  test('keyboard resizes the splitter in 20px steps', async ({ page }) => {
    await openGantt(page);
    const splitter = page.locator('[role="separator"]');
    await splitter.focus();
    const before = await splitter.evaluate((el) => parseFloat(el.getAttribute('aria-valuenow') ?? '0'));
    await splitter.press('ArrowRight');
    await expect
      .poll(async () => splitter.evaluate((el) => parseFloat(el.getAttribute('aria-valuenow') ?? '0')), { timeout: 5_000 })
      .toBe(before + 20);
    await splitter.press('ArrowLeft');
    await expect
      .poll(async () => splitter.evaluate((el) => parseFloat(el.getAttribute('aria-valuenow') ?? '0')), { timeout: 5_000 })
      .toBe(before);
    await assertTrackedPageErrors(page);
  });

  test('timeline scroll propagates back to the grid (two-way sync)', async ({ page }) => {
    // A short viewport forces both panes to be scrollable (14 rows exceed it).
    await page.setViewportSize({ width: 1280, height: 480 });
    await openGantt(page);
    const containers = await page.evaluate(() => {
      const grid = document.querySelector('[data-slot="gantt-grid"]') as HTMLElement | null;
      const scale = document.querySelector('[data-slot="gantt-scale"]') as HTMLElement | null;
      return {
        gridScrollable: grid ? (grid.parentElement as HTMLElement) : null,
        timelineScrollable: scale ? (scale.parentElement as HTMLElement) : null,
        gridCanScroll: !!grid?.parentElement && grid.parentElement.scrollHeight > grid.parentElement.clientHeight,
        timelineCanScroll: !!scale?.parentElement && scale.parentElement.scrollHeight > scale.parentElement.clientHeight,
      };
    });
    expect(containers.gridCanScroll, 'grid pane should overflow at 480px height').toBe(true);
    expect(containers.timelineCanScroll, 'timeline pane should overflow at 480px height').toBe(true);

    await page.evaluate(() => {
      const scale = document.querySelector('[data-slot="gantt-scale"]') as HTMLElement | null;
      const ts = scale?.parentElement as HTMLElement | null;
      if (ts) {
        ts.scrollTop = 120;
        ts.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
    });
    // The two panes have different content heights (the timeline carries the
    // scale header), so the synced position may clamp to the grid's own max
    // scroll — what matters is the grid FOLLOWED the timeline (> 0).
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const grid = document.querySelector('[data-slot="gantt-grid"]') as HTMLElement | null;
            return grid?.scrollTop ?? -1;
          }),
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  test('grid rows and timeline bars keep a constant row pitch (alignment invariant)', async ({ page }) => {
    await openGantt(page);
    // The grid header and the time scale have different heights, so a fixed
    // header offset between row N and bar N is expected — the alignment
    // invariant is that the OFFSET IS CONSTANT: consecutive rows and their
    // bars advance by the same pitch (store rowHeight), never drifting.
    const pitch = await page.evaluate(() => {
      const rowTops = Array.from(document.querySelectorAll('[data-slot="gantt-grid-row"]'))
        .slice(0, 3)
        .map((el) => el.getBoundingClientRect().top);
      const barTops = Array.from(document.querySelectorAll('[data-slot="gantt-bar"]'))
        .slice(0, 3)
        .map((el) => el.getBoundingClientRect().top);
      const rowPitch = rowTops[1] - rowTops[0];
      const barPitch = barTops[1] - barTops[0];
      const offset1 = barTops[0] - rowTops[0];
      const offset2 = barTops[1] - rowTops[1];
      const offset3 = barTops[2] - rowTops[2];
      return { rowPitch, barPitch, drift: Math.max(offset2 - offset1, offset3 - offset2) };
    });
    expect(pitch.rowPitch).toBeGreaterThan(0);
    expect(pitch.barPitch).toBeGreaterThan(0);
    expect(Math.abs(pitch.barPitch - pitch.rowPitch)).toBeLessThanOrEqual(1);
    expect(Math.abs(pitch.drift)).toBeLessThanOrEqual(1);
    await assertTrackedPageErrors(page);
  });
});
