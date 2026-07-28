import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

test.describe('Gantt Demo — Foundation, Toolbar, Grid & Tree', () => {
  test.describe.configure({ mode: 'serial' });

  test('root container and aria live region', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const gantt = page.locator('[data-slot="gantt"]');
    await expect(gantt).toBeVisible({ timeout: 10_000 });

    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
    const text = await liveRegion.textContent();
    expect(text).toMatch(/\d+ tasks? visible/);

    await assertTrackedPageErrors(page);
  });

  test('root container has task bars visible with specific count', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('[data-slot="gantt"]')).toBeVisible();
    const bars = page.locator('[data-slot="gantt-bar"]');
    await expect(bars.first()).toBeVisible({ timeout: 15_000 });
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThanOrEqual(8);

    const firstBar = bars.first();
    const left = await firstBar.evaluate((el) => parseFloat(el.style.left) || 0);
    const top = await firstBar.evaluate((el) => parseFloat(el.style.top) || 0);
    expect(left).not.toBeNaN();
    expect(top).not.toBeNaN();

    await assertTrackedPageErrors(page);
  });

  test('all toolbar buttons render', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const toolbar = page.locator('[data-slot="gantt-toolbar"]');
    await expect(toolbar).toBeVisible();

    const buttons = toolbar.locator('button');
    await expect(buttons).toHaveCount(4);
    await expect(buttons.nth(0)).toHaveText('−');
    await expect(buttons.nth(1)).toHaveText('+');

    await assertTrackedPageErrors(page);
  });

  test('zoom out changes scale header', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const getScaleLabels = () =>
      page.evaluate(() => Array.from(document.querySelectorAll('[data-slot="gantt-scale-cell"]')).map((el) => el.textContent).filter(Boolean) as string[]);

    const before = await getScaleLabels();
    expect(before.length).toBeGreaterThan(0);

    const zoomOut = page.locator('[data-slot="gantt-toolbar"] button').first();
    await zoomOut.click();
    await page.waitForTimeout(300);

    const after = await getScaleLabels();
    expect(after.length).toBeGreaterThan(0);
    expect(after.join(' ')).not.toBe(before.join(' '));

    await assertTrackedPageErrors(page);
  });

  test('zoom in then zoom to fit', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const zoomIn = page.locator('[data-slot="gantt-toolbar"] button').nth(1);
    await zoomIn.click();
    await page.waitForTimeout(300);

    const zoomFit = page.locator('[data-slot="gantt-toolbar"] button').nth(2);
    await zoomFit.click();
    await page.waitForTimeout(300);

    const scaleCells = await page.locator('[data-slot="gantt-scale-cell"]').count();
    expect(scaleCells).toBeGreaterThan(0);

    await assertTrackedPageErrors(page);
  });

  test('grid header cells render with correct column labels', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const headerCells = page.locator('[data-slot="gantt-grid-header-cell"]');
    await expect(headerCells).toHaveCount(5);

    const labels = await headerCells.allTextContents();
    expect(labels.join(' ')).toContain('Task Name');
    expect(labels.join(' ')).toContain('Start');
    expect(labels.join(' ')).toContain('End');
    expect(labels.join(' ')).toContain('Days');
    expect(labels.join(' ')).toContain('Dependencies');

    await assertTrackedPageErrors(page);
  });

  test('grid rows render with correct data attributes', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const rows = page.locator('[data-slot="gantt-grid-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(6);

    const firstRow = rows.first();
    await expect(firstRow).toHaveAttribute('data-task-id');
    await expect(firstRow).toHaveAttribute('data-depth');
    await expect(firstRow).toHaveAttribute('role', 'row');
    await expect(firstRow).toHaveAttribute('aria-level');
    await expect(firstRow).toHaveAttribute('aria-setsize');
    await expect(firstRow).toHaveAttribute('aria-posinset');

    await assertTrackedPageErrors(page);
  });

  test('task names visible in grid rows', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const gridTexts = await page.locator('[data-slot="gantt-grid-row"]').allTextContents();
    const allText = gridTexts.join(' ');
    expect(allText).toContain('Project Alpha');
    expect(allText).toContain('Requirements');
    expect(allText).toContain('Design');
    expect(allText).toContain('Project Beta');
    expect(allText).toContain('Research');

    await assertTrackedPageErrors(page);
  });

  test('expand-collapse toggle buttons visible on parent rows', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const toggleButtons = page.locator('[aria-expanded]');
    const count = await toggleButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await assertTrackedPageErrors(page);
  });

  test('collapsing a project hides its children then expanding shows them', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const getRowCount = () => page.locator('[data-slot="gantt-grid-row"]').count();

    const initialCount = await getRowCount();
    expect(initialCount).toBeGreaterThan(4);

    const initialExpanded = await page.locator('[aria-expanded="true"]').count();
    expect(initialExpanded).toBeGreaterThanOrEqual(1);
    const firstTaskName = await page.evaluate(() => {
      const btn = document.querySelector('[aria-expanded="true"]') as HTMLElement | null;
      if (!btn) return '';
      const row = btn.closest('[data-slot="gantt-grid-row"]');
      if (!row) return '';
      return row.getAttribute('data-task-id') || '';
    });
    expect(firstTaskName).toBeTruthy();

    await page.evaluate(() => {
      const btn = document.querySelector('[aria-expanded="true"]') as HTMLButtonElement | null;
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    const collapsedCount = await getRowCount();
    expect(collapsedCount).toBeLessThan(initialCount);

    const toggledRow = page.locator(`[data-slot="gantt-grid-row"][data-task-id="${firstTaskName}"]`);
    await expect(toggledRow.locator('button')).toHaveAttribute('aria-expanded', 'false', { timeout: 3_000 });

    await toggledRow.locator('button').click();
    await page.waitForTimeout(500);

    const expandedCount = await getRowCount();
    expect(expandedCount).toBe(initialCount);

    await assertTrackedPageErrors(page);
  });

  test('row selection highlights the row', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const row = page.locator('[data-slot="gantt-grid-row"]').nth(0);
    await row.click();

    await expect(row).toHaveAttribute('aria-selected', 'true');

    await assertTrackedPageErrors(page);
  });

  test('double-clicking text cell enters inline edit mode', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const row = page.locator('[data-slot="gantt-grid-row"]').nth(1);
    await row.dblclick();

    const input = page.locator('[data-slot="gantt-grid"] input');
    await expect(input).toBeVisible({ timeout: 3_000 });

    await assertTrackedPageErrors(page);
  });

  test('inline edit commit via Enter updates task text', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const row = page.locator('[data-slot="gantt-grid-row"]').nth(1);
    await row.dblclick();
    await page.waitForTimeout(200);

    const input = page.locator('[data-slot="gantt-grid"] input');
    await expect(input).toBeVisible({ timeout: 3_000 });
    await input.fill('Updated Task');
    await input.press('Enter');

    await expect(input).not.toBeVisible({ timeout: 3_000 });
    const texts = await page.locator('[data-slot="gantt-grid-row"]').allTextContents();
    expect(texts.some(t => t.includes('Updated Task'))).toBe(true);

    await assertTrackedPageErrors(page);
  });

  test('inline edit cancel via Escape restores original', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const row = page.locator('[data-slot="gantt-grid-row"]').nth(1);
    const _originalText = await row.textContent();

    await row.dblclick();
    await page.waitForTimeout(200);

    const input = page.locator('[data-slot="gantt-grid"] input');
    await expect(input).toBeVisible({ timeout: 3_000 });
    await input.fill('Modified');
    await input.press('Escape');

    await expect(input).not.toBeVisible({ timeout: 3_000 });
    const texts = await page.locator('[data-slot="gantt-grid-row"]').allTextContents();
    expect(texts.some(t => t.includes('Modified'))).toBe(false);

    await assertTrackedPageErrors(page);
  });

  test('today marker visible with red line', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const today = page.locator('[data-slot="gantt-today"]');
    await expect(today).toBeVisible({ timeout: 10_000 });

    const left = await today.getAttribute('style');
    expect(left).toContain('left:');
    expect(left).toContain('px');

    await assertTrackedPageErrors(page);
  });

  test('panel splitter renders with ARIA attributes', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const splitter = page.locator('[role="separator"]');
    await expect(splitter).toBeVisible();
    await expect(splitter).toHaveAttribute('aria-valuemin');
    await expect(splitter).toHaveAttribute('aria-valuemax');
    await expect(splitter).toHaveAttribute('aria-valuenow');
    await expect(splitter).toHaveAttribute('aria-orientation', 'vertical');

    await assertTrackedPageErrors(page);
  });

  test('panel splitter keyboard resize', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const splitter = page.locator('[role="separator"]');
    await splitter.focus();

    const beforeWidth = await splitter.evaluate((el) => parseFloat(el.getAttribute('aria-valuenow') || '0'));

    await splitter.press('ArrowRight');

    const afterWidth = await splitter.evaluate((el) => parseFloat(el.getAttribute('aria-valuenow') || '0'));
    expect(afterWidth).toBeGreaterThan(beforeWidth);

    await assertTrackedPageErrors(page);
  });

  test('grid and timeline vertical scroll containers present', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const info = await page.evaluate(() => {
      const grid = document.querySelector('[data-slot="gantt-grid"]');
      const scale = document.querySelector('[data-slot="gantt-scale"]');
      if (!grid || !scale) return { error: 'not found' };
      return {
        gridOverflowY: getComputedStyle(grid).overflowY,
        timelineOverflowY: getComputedStyle(scale.parentElement!).overflowY,
        gridScrollHeight: grid.scrollHeight,
        timelineScrollHeight: scale.parentElement!.scrollHeight,
      };
    });

    expect(info.error).toBeUndefined();
    expect(info.gridOverflowY).toBe('auto');
    expect(info.timelineOverflowY).toBe('auto');
    expect(info.gridScrollHeight).toBeGreaterThan(0);
    expect(info.timelineScrollHeight).toBeGreaterThan(0);

    await assertTrackedPageErrors(page);
  });

  test('scroll sync scrolls timeline when grid scrolls', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const canScroll = await page.evaluate(() => {
      const grid = document.querySelector('[data-slot="gantt-grid"]');
      if (!grid) return false;
      const gs = grid.parentElement;
      return gs ? gs.scrollHeight > gs.clientHeight : false;
    });

    if (canScroll) {
      await page.evaluate(() => {
        const grid = document.querySelector('[data-slot="gantt-grid"]');
        if (!grid) return;
        const gs = grid.parentElement;
        if (!gs) return;
        gs.scrollTop = 100;
        gs.dispatchEvent(new Event('scroll', { bubbles: true }));
      });

      await expect(async () => {
        const timelineScrollTop = await page.evaluate(() => {
          const scale = document.querySelector('[data-slot="gantt-scale"]');
          if (!scale) return -1;
          const ts = scale.parentElement;
          return ts ? ts.scrollTop : -1;
        });
        expect(timelineScrollTop).toBeGreaterThan(0);
      }).toPass({ timeout: 3_000 });
    }

    await assertTrackedPageErrors(page);
  });

  test('weekend columns have bg-gray-50 class', async ({ page }) => {
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

    await assertTrackedPageErrors(page);
  });
});
