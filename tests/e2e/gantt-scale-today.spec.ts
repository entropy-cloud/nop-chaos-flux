import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

async function openGantt(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 15_000 });
}

function toolbarButton(page: import('@playwright/test').Page, index: number) {
  return page.locator('[data-slot="gantt-toolbar"] button').nth(index);
}

function scaleLabels(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-slot="gantt-scale-cell"]'))
      .map((el) => el.textContent ?? '')
      .filter(Boolean),
  );
}

test.describe('Gantt — time scale, zoom labels, today marker & aria-live', () => {
  test('time scale is sticky positioned', async ({ page }) => {
    await openGantt(page);
    const scale = page.locator('[data-slot="gantt-scale"]');
    await expect(scale).toBeVisible();
    await expect(scale).toHaveCSS('position', 'sticky');
    await assertTrackedPageErrors(page);
  });

  test('zoom to Day scale renders day-of-month numbers and a month row', async ({ page }) => {
    await openGantt(page);
    // In this demo's zoom table (day→week→month by index), the − button moves
    // toward the finest (day) granularity.
    await toolbarButton(page, 0).click();
    const labels = async () => (await scaleLabels(page)).join(' ');
    await expect.poll(labels, { timeout: 5_000 }).toMatch(/2026\/0[67]/);
    const joined = await labels();
    expect(joined).toMatch(/\b(0[1-9]|[12][0-9]|3[01])\b/);
    await assertTrackedPageErrors(page);
  });

  test('zoom to Month scale renders few year-labelled cells', async ({ page }) => {
    await openGantt(page);
    // The + button moves toward the coarsest (month) granularity.
    await toolbarButton(page, 1).click();
    await expect.poll(async () => (await scaleLabels(page)).join(' '), { timeout: 5_000 }).toMatch(/2026\/0[67]/);
    const joined = await scaleLabels(page).then((l) => l.join(' '));
    expect(joined).toContain('2026');
    await expect
      .poll(async () => page.locator('[data-slot="gantt-scale-cell"]').count(), { timeout: 5_000 })
      .toBeLessThanOrEqual(20);
    await assertTrackedPageErrors(page);
  });

  test('week scale shows W%V week numbers', async ({ page }) => {
    await openGantt(page);
    await expect
      .poll(async () => (await scaleLabels(page)).join(' '), { timeout: 5_000 })
      .toMatch(/W(2[5-9]|3[0-9]|4[0-5])/);
    await assertTrackedPageErrors(page);
  });

  test('Today button scrolls the timeline to the today marker', async ({ page }) => {
    await openGantt(page);
    const timeline = page.locator('[data-slot="gantt-scale"]').locator('..');
    const before = await timeline.evaluate((el) => el.scrollLeft);
    await toolbarButton(page, 3).click();
    await expect
      .poll(async () => timeline.evaluate((el) => el.scrollLeft), { timeout: 5_000 })
      .not.toBe(before);
    const after = await timeline.evaluate((el) => el.scrollLeft);
    expect(after).toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  test('today marker shows label text and a valid in-range position', async ({ page }) => {
    await openGantt(page);
    const today = page.locator('[data-slot="gantt-today"]');
    await expect(today).toBeVisible({ timeout: 10_000 });
    await expect(today).toContainText(/today|今日/i);
    const info = await today.evaluate((el) => {
      const left = parseFloat(el.style.left);
      const container = el.closest('.overflow-auto') as HTMLElement | null;
      return { left, scrollWidth: container?.scrollWidth ?? 0 };
    });
    expect(info.left).not.toBeNaN();
    expect(info.left).toBeGreaterThan(0);
    expect(info.left).toBeLessThanOrEqual(info.scrollWidth);
    await assertTrackedPageErrors(page);
  });

  test('cell grid renders weekend columns with data-weekend', async ({ page }) => {
    await openGantt(page);
    await toolbarButton(page, 0).click();
    await expect
      .poll(async () => page.locator('[data-slot="gantt-cell-grid"] [data-weekend="true"]').count(), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(2);
    const cellGrid = page.locator('[data-slot="gantt-cell-grid"]');
    await expect(cellGrid).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('aria-live region count tracks visible tasks after collapse', async ({ page }) => {
    await openGantt(page);
    const live = page.locator('[aria-live="polite"]');
    const before = (await live.textContent()) ?? '';
    expect(before).toMatch(/14/);
    await page.locator('[data-slot="gantt-grid-row"][data-task-id="1"] button[aria-expanded]').click();
    await expect
      .poll(async () => (await live.textContent()) ?? '', { timeout: 5_000 })
      .not.toBe(before);
    const after = (await live.textContent()) ?? '';
    expect(after).toMatch(/6/);
    await assertTrackedPageErrors(page);
  });

  test('regular task bars carry data-bar-type="task"', async ({ page }) => {
    await openGantt(page);
    const taskBars = page.locator('[data-slot="gantt-bar"][data-bar-type="task"]');
    await expect(taskBars.first()).toBeVisible({ timeout: 10_000 });
    expect(await taskBars.count()).toBeGreaterThanOrEqual(8);
    await assertTrackedPageErrors(page);
  });

  test('grid cell values show start/end/duration/predecessor', async ({ page }) => {
    await openGantt(page);
    const row = page.locator('[data-slot="gantt-grid-row"][data-task-id="2"]');
    await expect(row).toBeVisible({ timeout: 10_000 });
    const cells = row.locator('[data-slot="gantt-grid-cell"]');
    await expect(cells).toHaveCount(5);
    await expect(cells.nth(0)).toContainText('Requirements');
    await expect(cells.nth(1)).toContainText('2026-07-01');
    await expect(cells.nth(2)).toContainText('2026-07-10');
    await expect(cells.nth(3)).toContainText(/^\s*9\s*$/);
    const row3 = page.locator('[data-slot="gantt-grid-row"][data-task-id="3"]');
    const cells3 = row3.locator('[data-slot="gantt-grid-cell"]');
    await expect(cells3.nth(4)).toContainText(/^\s*2\s*$/);
    await assertTrackedPageErrors(page);
  });

  test('collapsing every parent leaves only root rows; expanding restores all', async ({ page }) => {
    await openGantt(page);
    const rowCount = () => page.locator('[data-slot="gantt-grid-row"]').count();
    const full = await rowCount();
    expect(full).toBe(14);

    // Collapse every visible parent (collapsing a root also hides nested
    // parents, so loop until no expanded toggle remains).
    for (let guard = 0; guard < 10; guard++) {
      const expanded = page.locator('[data-slot="gantt-grid-row"] button[aria-expanded="true"]');
      if ((await expanded.count()) === 0) break;
      const before = await expanded.count();
      await expanded.first().click();
      await expect
        .poll(async () => page.locator('[data-slot="gantt-grid-row"] button[aria-expanded="true"]').count(), { timeout: 5_000 })
        .toBeLessThan(before);
    }
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(2);

    // Expand back: expand visible collapsed roots until the full tree returns.
    for (let guard = 0; guard < 10; guard++) {
      if ((await rowCount()) === 14) break;
      const collapsed = page.locator('[data-slot="gantt-grid-row"] button[aria-expanded="false"]');
      await collapsed.first().click();
      await expect
        .poll(async () => page.locator('[data-slot="gantt-grid-row"]').count(), { timeout: 5_000 })
        .toBeGreaterThan(2);
    }
    await expect.poll(rowCount, { timeout: 5_000 }).toBe(14);
    await assertTrackedPageErrors(page);
  });
});
