import { test, expect, assertTrackedPageErrors } from './fixtures.js';

const ROUTE = '/#/gantt';
const HEADING = /Gantt Chart Demo/i;

async function openGantt(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-slot="gantt-bar"][data-task-id="2"]')).toBeVisible({ timeout: 15_000 });
}

async function openColumnRegionGantt(page: import('@playwright/test').Page) {
  await page.goto('/#/gantt-states', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: /Gantt States/i })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-testid="gantt-column-region"] [data-slot="gantt-bar"]').first()).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('Gantt — advanced drag, ghost, milestones & link interactions', () => {
  test('bar drag resize-start shifts left edge and shrinks width', async ({ page }) => {
    await openGantt(page);
    const bar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
    const initial = await bar.evaluate((el) => ({ left: parseFloat(el.style.left), width: parseFloat(el.style.width) }));
    const box = await bar.boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.move(box!.x + 3, box!.y + box!.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) {
      await page.mouse.move(box!.x + 3 + i * 10, box!.y + box!.height / 2, { steps: 2 });
    }
    await page.mouse.up();

    await expect
      .poll(async () => bar.evaluate((el) => parseFloat(el.style.left)), { timeout: 5_000 })
      .toBeGreaterThan(initial.left);
    await expect
      .poll(async () => bar.evaluate((el) => parseFloat(el.style.width)), { timeout: 5_000 })
      .toBeLessThan(initial.width);
    await assertTrackedPageErrors(page);
  });

  test('drag shows a ghost element and removes it on drop', async ({ page }) => {
    await openGantt(page);
    const bar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
    const box = await bar.boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 30, box!.y + box!.height / 2, { steps: 3 });

    await expect(page.locator('.nop-gantt-bar-ghost')).toHaveCount(1, { timeout: 5_000 });

    await page.mouse.up();
    await expect(page.locator('.nop-gantt-bar-ghost')).toHaveCount(0, { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('Escape during drag cancels the move and removes the ghost', async ({ page }) => {
    await openGantt(page);
    const bar = page.locator('[data-slot="gantt-bar"][data-task-id="2"]');
    const initialLeft = await bar.evaluate((el) => parseFloat(el.style.left));
    const box = await bar.boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 60, box!.y + box!.height / 2, { steps: 3 });
    await expect(page.locator('.nop-gantt-bar-ghost')).toHaveCount(1, { timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('.nop-gantt-bar-ghost')).toHaveCount(0, { timeout: 5_000 });

    await page.mouse.up();
    await expect
      .poll(async () => bar.evaluate((el) => parseFloat(el.style.left)), { timeout: 5_000 })
      .toBe(initialLeft);
    await assertTrackedPageErrors(page);
  });

  test('milestone click selects the task row', async ({ page }) => {
    await openGantt(page);
    const milestone = page.locator('[data-bar-type="milestone"]').first();
    await milestone.click();
    const taskId = await milestone.getAttribute('data-task-id');
    const row = page.locator(`[data-slot="gantt-grid-row"][data-task-id="${taskId}"]`);
    await expect(row).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('link lines carry markerEnd arrowheads', async ({ page }) => {
    await openGantt(page);
    const markerEnd = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.nop-gantt-link-line')).map((el) => el.getAttribute('marker-end') ?? el.getAttribute('markerEnd') ?? ''),
    );
    expect(markerEnd.length).toBeGreaterThanOrEqual(9);
    expect(markerEnd.every((m) => m === 'url(#arrowhead)')).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('link click areas are invisible wide-stroke polylines', async ({ page }) => {
    await openGantt(page);
    const areas = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-slot="gantt-link"] g polyline[stroke="transparent"]')).map((el) => ({
        strokeWidth: el.getAttribute('stroke-width'),
        pointerEvents: (el as SVGElement).style.pointerEvents,
        role: el.getAttribute('role'),
      })),
    );
    expect(areas.length).toBeGreaterThanOrEqual(9);
    expect(areas.every((a) => a.strokeWidth === '10')).toBe(true);
    expect(areas.every((a) => a.pointerEvents === 'all')).toBe(true);
    expect(areas.every((a) => a.role === 'button')).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('hovering a link thickens the visible line', async ({ page }) => {
    await openGantt(page);
    const area = page.locator('[data-slot="gantt-link"] polyline[role="button"]').first();
    const line = page.locator('.nop-gantt-link-line').first();
    const before = await line.getAttribute('stroke-width');
    await area.hover();
    await expect
      .poll(async () => (await line.getAttribute('stroke-width')) ?? '', { timeout: 5_000 })
      .not.toBe(before);
    expect(await line.getAttribute('stroke-width')).toBe('2.5');
    await assertTrackedPageErrors(page);
  });

  test('dragging a link handle onto another bar creates a link', async ({ page }) => {
    await openColumnRegionGantt(page);
    const before = await page
      .locator('[data-testid="gantt-column-region"] .nop-gantt-link-line')
      .count();
    expect(before).toBe(1);

    const sourceBar = page.locator('[data-slot="gantt-bar"][data-task-id="c1"]');
    const targetBar = page.locator('[data-slot="gantt-bar"][data-task-id="c2"]');
    await sourceBar.scrollIntoViewIfNeeded();
    const sourceBox = (await sourceBar.boundingBox())!;
    const targetBox = (await targetBar.boundingBox())!;
    expect(sourceBox).toBeTruthy();
    expect(targetBox).toBeTruthy();

    const handle = sourceBar.locator('[data-slot="gantt-bar-link-handle"][data-handle-side="end"]');
    const handleBox = (await handle.boundingBox())!;
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect
      .poll(async () => page.locator('[data-testid="gantt-column-region"] .nop-gantt-link-line').count(), { timeout: 5_000 })
      .toBe(before + 1);
    await assertTrackedPageErrors(page);
  });

  test('Escape cancels an in-progress link draw without creating a link', async ({ page }) => {
    await openColumnRegionGantt(page);
    const before = await page
      .locator('[data-testid="gantt-column-region"] .nop-gantt-link-line')
      .count();
    expect(before).toBe(1);

    const sourceBar = page.locator('[data-slot="gantt-bar"][data-task-id="c1"]');
    const targetBar = page.locator('[data-slot="gantt-bar"][data-task-id="c2"]');
    await sourceBar.scrollIntoViewIfNeeded();
    const handle = sourceBar.locator('[data-slot="gantt-bar-link-handle"][data-handle-side="end"]');
    const handleBox = (await handle.boundingBox())!;
    const targetBox = (await targetBar.boundingBox())!;

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 3 });
    const scope = page.locator('[data-testid="gantt-column-region"]');
    // Counterpart of the creation test above: identical gesture, but Escape
    // before pointerup — the draw session is cancelled and no link lands.
    await page.keyboard.press('Escape');
    await page.mouse.up();

    await expect
      .poll(async () => scope.locator('.nop-gantt-link-line').count(), { timeout: 5_000 })
      .toBe(before);
    await expect(scope.locator('[data-slot="gantt-link"] line')).toHaveCount(0, { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });
});
