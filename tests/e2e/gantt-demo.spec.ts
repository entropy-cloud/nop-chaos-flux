import { test, expect } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

test.describe('Gantt Chart Demo', () => {
  test.describe.configure({ mode: 'serial' });
  test('page loads with task bars visible and correct count', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const barCount = await page.locator('[data-slot="gantt-bar"]').count();
    const milestoneCount = await page.locator('[data-bar-type="milestone"]').count();
    expect(barCount + milestoneCount).toBe(14);

    const gridRowTexts = await page.locator('[data-slot="gantt-grid-row"]').allTextContents();
    const allText = gridRowTexts.join(' ');
    expect(allText).toContain('Project Alpha');
    expect(allText).toContain('Requirements');
    expect(allText).toContain('Project Beta');
  });

  test('drag task bar changes position programmatically', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const taskBar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
    await expect(taskBar).toBeVisible({ timeout: 15_000 });

    const initialPos = await taskBar.evaluate((el) => {
      const left = parseFloat(el.style.left) || 0;
      return { left };
    });

    const box = await taskBar.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 15, box.y + box.height / 2, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    const newPos = await taskBar.evaluate((el) => {
      const left = parseFloat(el.style.left) || 0;
      return { left };
    });

    expect(newPos.left).not.toBe(initialPos.left);
  });

  test('zoom level switching changes scale header', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const getScaleLabels = () =>
      page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-slot="gantt-scale-cell"]'))
          .map((el) => el.textContent)
          .filter(Boolean) as string[];
      });

    const initialLabels = await getScaleLabels();
    expect(initialLabels.length).toBeGreaterThan(0);

    const zoomOutBtn = page.locator('[data-slot="gantt-toolbar"] button').first();
    await zoomOutBtn.click();
    await page.waitForTimeout(500);

    const afterZoomOutLabels = await getScaleLabels();
    expect(afterZoomOutLabels.length).toBeGreaterThan(0);

    const zoomInBtn = page.locator('[data-slot="gantt-toolbar"] button').nth(1);
    await zoomInBtn.click();
    await page.waitForTimeout(500);

    const afterZoomInLabels = await getScaleLabels();
    expect(afterZoomInLabels.length).toBeGreaterThan(0);
  });

  test('dependency links rendered on SVG', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const linkSvg = page.locator('[data-slot="gantt-link"]');
    await expect(linkSvg).toBeVisible({ timeout: 10_000 });

    const linkCount = await linkSvg.evaluate((svg) => {
      return svg.querySelectorAll('.nop-gantt-link-line').length;
    });
    expect(linkCount).toBe(9);

    const linkIds = await linkSvg.evaluate((svg) => {
      const ariaLabels = svg.querySelectorAll('[aria-label]');
      return Array.from(ariaLabels).map((el) => el.getAttribute('aria-label') || '');
    });
    expect(linkIds.filter((l) => l.startsWith('Link')).length).toBe(9);
  });

  test('keyboard navigation selects tasks', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const getFocusedTaskId = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute('data-task-id') ?? null;
      });

    await page.locator('[role="grid"]').first().focus();
    await page.waitForTimeout(200);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const afterFirstDown = await getFocusedTaskId();
    expect(afterFirstDown).toBe('1');

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const afterSecondDown = await getFocusedTaskId();
    expect(afterSecondDown).toBe('2');

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    const afterUp = await getFocusedTaskId();
    expect(afterUp).toBe('1');

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const editor = page.locator('[role="dialog"]');
    await expect(editor).toBeVisible({ timeout: 3_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(editor).not.toBeVisible({ timeout: 3_000 });
  });

  test('vertical scroll containers are present and synchronised', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const containerInfo = await page.evaluate(() => {
      const grid = document.querySelector('[data-slot="gantt-grid"]');
      const scale = document.querySelector('[data-slot="gantt-scale"]');
      if (!grid || !scale) return { error: 'elements not found' };

      const gridScroll = grid.parentElement;
      const timelineScroll = scale.parentElement;
      if (!gridScroll || !timelineScroll) return { error: 'scroll parents not found' };

      const gridCS = getComputedStyle(gridScroll);
      const timelineCS = getComputedStyle(timelineScroll);

      return {
        gridOverflowY: gridCS.overflowY,
        timelineOverflowY: timelineCS.overflowY,
        gridCanScroll: gridScroll.scrollHeight > gridScroll.clientHeight,
        timelineCanScroll: timelineScroll.scrollHeight > timelineScroll.clientHeight,
        gridScrollHeight: gridScroll.scrollHeight,
        gridClientHeight: gridScroll.clientHeight,
        timelineScrollHeight: timelineScroll.scrollHeight,
        timelineClientHeight: timelineScroll.clientHeight,
        gridScrollTop: gridScroll.scrollTop,
        timelineScrollTop: timelineScroll.scrollTop,
      };
    });

    expect(containerInfo.error).toBeUndefined();
    expect(containerInfo.gridOverflowY).toBe('auto');
    expect(containerInfo.timelineOverflowY).toBe('auto');

    if (containerInfo.gridCanScroll) {
      await page.evaluate(() => {
        const grid = document.querySelector('[data-slot="gantt-grid"]');
        if (!grid) return;
        const gs = grid.parentElement;
        if (!gs) return;
        gs.scrollTop = 150;
        gs.dispatchEvent(new Event('scroll', { bubbles: true }));
      });

      await page.waitForTimeout(300);

      const after = await page.evaluate(() => {
        const scale = document.querySelector('[data-slot="gantt-scale"]');
        if (!scale) return -1;
        const ts = scale.parentElement;
        return ts ? ts.scrollTop : -1;
      });

      expect(after).toBeGreaterThan(0);
    }
  });
});
