import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

test.describe('Gantt — Bars, Milestones, Progress & Links', () => {
  test.describe.configure({ mode: 'serial' });

  test('task bars render with correct data attributes', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bars = page.locator('[data-slot="gantt-bar"]');
    await expect(bars.first()).toBeVisible({ timeout: 10_000 });

    const barCount = await bars.count();
    expect(barCount).toBeGreaterThanOrEqual(8);

    const firstBar = bars.first();
    await expect(firstBar).toHaveAttribute('data-task-id');
    await expect(firstBar).toHaveAttribute('data-bar-type');
    await expect(firstBar).toHaveAttribute('role', 'button');
    await expect(firstBar).toHaveAttribute('tabindex', '0');
    await expect(firstBar).toHaveAttribute('aria-roledescription', 'gantt bar');

    await assertTrackedPageErrors(page);
  });

  test('milestones render as diamond polygons', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const milestones = page.locator('[data-bar-type="milestone"]');
    await expect(milestones.first()).toBeVisible({ timeout: 10_000 });

    const count = await milestones.count();
    expect(count).toBe(2);

    const svg = milestones.first().locator('svg polygon');
    await expect(svg).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('bar positions have valid pixel values (not NaN)', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const hasNaN = await page.evaluate(() => {
      const bars = document.querySelectorAll('[data-slot="gantt-bar"]');
      return Array.from(bars).some((bar) => {
        const left = parseFloat((bar as HTMLElement).style.left);
        const top = parseFloat((bar as HTMLElement).style.top);
        const w = parseFloat((bar as HTMLElement).style.width);
        const h = parseFloat((bar as HTMLElement).style.height);
        return isNaN(left) || isNaN(top) || isNaN(w) || isNaN(h);
      });
    });
    expect(hasNaN).toBe(false);

    await assertTrackedPageErrors(page);
  });

  test('progress bars visible on tasks with progress', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const progressBars = page.locator('[data-slot="gantt-bar-progress"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThanOrEqual(3);

    const firstWidth = await progressBars.first().getAttribute('style');
    expect(firstWidth).toContain('width:');
    expect(firstWidth).toContain('%');

    await assertTrackedPageErrors(page);
  });

  test('bar text displays task name', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const barTexts = await page.locator('.nop-gantt-bar-text').allTextContents();
    const allText = barTexts.join(' ');
    expect(allText).toContain('Requirements');
    expect(allText).toContain('Design');
    expect(allText).toContain('Frontend');

    await assertTrackedPageErrors(page);
  });

  test('bar click selects the task', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"]').first();
    await bar.click();

    const taskId = await bar.getAttribute('data-task-id');
    const selectedRow = page.locator(`[data-slot="gantt-grid-row"][data-task-id="${taskId}"][aria-selected="true"]`);
    await expect(selectedRow).toHaveCount(1);

    await assertTrackedPageErrors(page);
  });

  test('bar drag move changes position', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
    await expect(bar).toBeVisible({ timeout: 15_000 });

    const initialLeft = await bar.evaluate((el) => parseFloat(el.style.left) || 0);

    const box = await bar.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 15, box.y + box.height / 2, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    const newLeft = await bar.evaluate((el) => parseFloat(el.style.left) || 0);
    expect(newLeft).not.toBe(initialLeft);

    await assertTrackedPageErrors(page);
  });

  test('bar drag resize-right changes width', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
    await expect(bar).toBeVisible({ timeout: 15_000 });

    const initialWidth = await bar.evaluate((el) => parseFloat(el.style.width) || 0);

    const box = await bar.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(box.x + box.width - 3 + i * 10, box.y + box.height / 2, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    const newWidth = await bar.evaluate((el) => parseFloat(el.style.width) || 0);
    expect(newWidth).not.toBe(initialWidth);

    await assertTrackedPageErrors(page);
  });

  test('bar link handles visible on hover', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"]').first();
    await bar.hover();
    await page.waitForTimeout(200);

    const handles = page.locator('[data-slot="gantt-bar-link-handle"]');
    await expect(handles.first()).toBeVisible({ timeout: 3_000 });

    await assertTrackedPageErrors(page);
  });

  test('dependency link lines render', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const linkSvg = page.locator('[data-slot="gantt-link"]');
    await expect(linkSvg).toBeVisible({ timeout: 10_000 });

    const linkCount = await linkSvg.evaluate((svg) => svg.querySelectorAll('.nop-gantt-link-line').length);
    expect(linkCount).toBe(9);

    const ariaLabels = await linkSvg.evaluate((svg) =>
      Array.from(svg.querySelectorAll('[aria-label]')).map((el) => el.getAttribute('aria-label') || ''),
    );
    expect(ariaLabels.filter((l) => l.startsWith('Link')).length).toBe(9);

    await assertTrackedPageErrors(page);
  });

  test('link hover shows delete button', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const linkClickArea = page.locator('[data-slot="gantt-link"] [aria-label^="Link"]').first();
    await linkClickArea.hover();
    await page.waitForTimeout(200);

    const deleteBtn = page.locator('[data-slot="gantt-link"] [aria-label="Delete link"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3_000 });

    await assertTrackedPageErrors(page);
  });

  test('link click via aria-label click area', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const linkClickArea = page.locator('[data-slot="gantt-link"] [aria-label^="Link"]').first();
    await linkClickArea.click();

    await assertTrackedPageErrors(page);
  });

  test('delete link via hover delete button', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const linkSvg = page.locator('[data-slot="gantt-link"]');
    const initialCount = await linkSvg.evaluate((svg) => svg.querySelectorAll('.nop-gantt-link-line').length);
    expect(initialCount).toBeGreaterThan(0);

    const lastLink = linkSvg.locator('[aria-label^="Link"]').last();
    await lastLink.hover();
    await page.waitForTimeout(200);

    const deleteBtn = linkSvg.locator('[aria-label="Delete link"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3_000 });

    await deleteBtn.click();
    await page.waitForTimeout(300);

    const afterCount = await linkSvg.evaluate((svg) => svg.querySelectorAll('.nop-gantt-link-line').length);
    expect(afterCount).toBeLessThan(initialCount);

    await assertTrackedPageErrors(page);
  });

  test('project bars have project class', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const projectBars = page.locator('[data-bar-type="project"]');
    const count = await projectBars.count();
    expect(count).toBe(2);

    await assertTrackedPageErrors(page);
  });

  test('bar Enter key opens editor dialog', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });

    const bar = page.locator('[data-slot="gantt-bar"]').first();
    await bar.focus();
    await bar.press('Enter');

    const editor = page.locator('[role="dialog"]');
    await expect(editor).toBeVisible({ timeout: 3_000 });

    await page.keyboard.press('Escape');
    await expect(editor).not.toBeVisible({ timeout: 3_000 });

    await assertTrackedPageErrors(page);
  });
});
