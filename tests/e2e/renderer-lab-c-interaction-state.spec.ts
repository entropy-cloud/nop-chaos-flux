import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-8c successor batch (plan 556) Phase 1 guard specs for the gantt-in-dialog
// scenario. IS-lab-gantt-001's two conviction halves were WITHDRAWN as probe
// artifacts by live bisect:
//   1. "bars escape the dialog surface" — bar rects extend into scroll-content
//      space (scrollable timeline canvas), but the timeline overflow-auto
//      viewport clips paint AND hit-testing; the original conviction read
//      getBoundingClientRect without a paint/hit-test cross-check.
//   2. "pointerdown on a bar silently dismisses the host dialog" — dismissal
//      only reproduces when the press lands outside the popup (the bar's
//      clipped rect region maps to the backdrop); presses on the bar's visible
//      region start the drag and the dialog stays open. Full-cell drags commit
//      to the store (row dates shift) without dismissing the dialog.
// These cases pin the verified behavior with programmatic readings only
// (getBoundingClientRect + elementFromPoint + date-text accounting); screenshots
// are never test proof.

interface GanttGeometry {
  popup: { x: number; right: number; y: number; bottom: number };
  timelineViewport: { x: number; right: number };
  bar: { x: number; right: number; y: number; height: number; taskId: string };
  dayCellWidth: number | null;
}

async function openGanttDialog(page: import('@playwright/test').Page) {
  await page.goto('/#/lab/gantt', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="c9-gantt-open"]').click();
  const dialog = page.locator('[data-slot="dialog-surface"]');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  const gantt = page.locator('[data-testid="c9-gantt-in-dialog"]');
  await expect(gantt).toBeVisible({ timeout: 10_000 });
  // The initial-center effect (useGanttInitialCenter) scrolls the timeline to
  // today exactly once after ready; reset the horizontal scroll so the
  // earliest task bar is inside the clip viewport, then let the layout settle
  // before geometry reads.
  await page.evaluate(() => {
    const barsLayer = document.querySelector('[data-slot="gantt-bars"]');
    const timeline = barsLayer?.closest('.overflow-auto');
    if (timeline) timeline.scrollLeft = 0;
  });
  await page.waitForTimeout(400);
  return dialog;
}

async function readGanttGeometry(page: import('@playwright/test').Page): Promise<GanttGeometry> {
  const geo = await page.evaluate(() => {
    const rectOf = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const popup = document.querySelector('[data-slot="dialog-surface"]');
    // The timeline scroll viewport is the overflow-auto ancestor of the bars
    // layer; the grid (its sibling column) owns the date cells.
    const barsLayer = document.querySelector('[data-slot="gantt-bars"]');
    const timelineViewport = barsLayer?.closest('.overflow-auto');
    const vp = rectOf(timelineViewport);
    // Pick the earliest bar that actually intersects the clip viewport with a
    // usable visible width — after initial-centering the design task (g1) may
    // sit left of the scroll window.
    const bars = [...document.querySelectorAll('[data-slot="gantt-bars"] [data-task-id]')];
    let picked: { rect: ReturnType<typeof rectOf>; taskId: string } | null = null;
    for (const bar of bars) {
      const rect = rectOf(bar);
      if (!rect || !vp) continue;
      const visibleLeft = Math.max(rect.x, vp.x);
      const visibleRight = Math.min(rect.right, vp.right);
      if (visibleRight - visibleLeft >= 20) {
        picked = { rect, taskId: bar.getAttribute('data-task-id') ?? '' };
        break;
      }
    }
    // Day cell = narrowest mounted scale cell (the scale mounts month + day
    // rows; horizontal windowing may clip some cells).
    const widths = [...document.querySelectorAll('[data-slot="gantt-scale-cell"]')].map(
      (c) => c.getBoundingClientRect().width,
    );
    const dayCellWidth = widths.length > 0 ? Math.min(...widths) : null;
    return {
      popup: rectOf(popup),
      timelineViewport: vp,
      bar: picked ? { ...picked.rect, taskId: picked.taskId } : null,
      dayCellWidth,
    };
  });
  expect(geo.bar).toBeTruthy();
  expect(geo.bar!.taskId).toBeTruthy();
  return geo as GanttGeometry;
}

/** Row index among grid task rows == bar index among visible bars. */
async function readRowStartDate(page: import('@playwright/test').Page, rowIndex: number): Promise<string | null> {
  return page.evaluate((index) => {
    const body = document.querySelector('.nop-gantt tbody');
    if (!body) return null;
    const rows = [...body.querySelectorAll('tr')];
    const row = rows[index];
    const match = /(\d{4}-\d{2}-\d{2})/.exec(row?.textContent ?? '');
    return match ? match[1] : null;
  }, rowIndex);
}

test.describe('IS-8c successor guards: gantt in dialog (plan 556)', () => {
  test('gantt bars are clipped by the timeline viewport; pressing the visible bar region never dismisses the dialog', async ({ page }) => {
    const dialog = await openGanttDialog(page);
    const geo = await readGanttGeometry(page);

    expect(geo.popup).toBeTruthy();

    // Clip invariant: beyond the timeline viewport's right edge the topmost
    // element is never a gantt bar, even though bar rects extend past it
    // (scroll-content coordinates). This is the reading the original review
    // miscounted as a painted escape.
    const probeX = geo.timelineViewport.right + 20;
    const probeY = geo.bar.y + geo.bar.height / 2;
    const beyondClip = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return {
          hitBar: el?.closest('[data-task-id]') != null,
          hitPopup: el?.closest('[data-slot="dialog-surface"]') != null,
        };
      },
      { x: probeX, y: probeY },
    );
    expect(beyondClip.hitBar).toBe(false);

    // Bar-surface press + drag: the press point is clamped inside the bar ∩
    // timeline viewport intersection, i.e. a region the user actually sees.
    const pressX = Math.min(geo.bar.x + 30, geo.timelineViewport.right - 10);
    const pressY = geo.bar.y + geo.bar.height / 2;
    await page.mouse.move(pressX, pressY);
    await page.mouse.down();
    await page.mouse.move(pressX + 24, pressY, { steps: 4 });
    await page.mouse.move(pressX + 12, pressY, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await expect(dialog).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('full-cell drag on the visible bar region commits (row dates shift) and keeps the dialog open', async ({ page }) => {
    const dialog = await openGanttDialog(page);
    const geo = await readGanttGeometry(page);

    const barIndex = await page.evaluate((taskId) => {
      const bars = [...document.querySelectorAll('[data-slot="gantt-bars"] [data-task-id]')];
      return bars.findIndex((b) => b.getAttribute('data-task-id') === taskId);
    }, geo.bar.taskId);
    expect(barIndex).toBeGreaterThanOrEqual(0);

    const before = await readRowStartDate(page, barIndex);
    expect(before).toBeTruthy();

    const dayCellWidth = geo.dayCellWidth && geo.dayCellWidth > 0 ? geo.dayCellWidth : 40;
    // 1.6 day cells rounds to a non-zero dayDelta; keep the pointer inside the
    // viewport so the drag path is deterministic.
    const maxDx = 1279 - (geo.bar.x + 30) - 10;
    const dx = Math.max(Math.round(dayCellWidth * 0.6), Math.min(Math.round(dayCellWidth * 1.6), maxDx));
    const pressX = Math.min(geo.bar.x + 30, geo.timelineViewport.right - 10);
    const pressY = geo.bar.y + geo.bar.height / 2;
    await page.mouse.move(pressX, pressY);
    await page.mouse.down();
    await page.mouse.move(pressX + dx / 2, pressY, { steps: 4 });
    await page.mouse.move(pressX + dx, pressY, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(600);

    const after = await readRowStartDate(page, barIndex);
    expect(after).toBeTruthy();
    expect(after! > before!).toBeTruthy();
    await expect(dialog).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('pressing the backdrop outside the popup still dismisses the dialog (outside-press semantics intact)', async ({ page }) => {
    const dialog = await openGanttDialog(page);
    const geo = await readGanttGeometry(page);
    expect(geo.popup).toBeTruthy();

    // A point inside the viewport but left of the popup is backdrop surface.
    const backdropX = Math.max(20, geo.popup.x - 80);
    await page.mouse.click(backdropX, 400);
    await expect(dialog).toBeHidden({ timeout: 5000 });

    await assertTrackedPageErrors(page);
  });
});
