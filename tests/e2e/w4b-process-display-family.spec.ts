import { expect, test } from './fixtures.js';

async function openW4b(page: import('@playwright/test').Page) {
  await page.goto('#/w4b-process-display', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '流程展示组 — steps / timeline',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W4b process display family — flux-renderers-layout', () => {
  test('steps renders marker, current index, and status derivation (horizontal)', async ({
    page,
  }) => {
    await openW4b(page);

    const steps = page.locator('[data-testid="demo-steps"]');
    await expect(steps).toBeVisible({ timeout: 10_000 });
    await expect(steps).toHaveAttribute('data-slot', 'steps-root');
    await expect(steps).toHaveAttribute('data-orientation', 'horizontal');
    // value=review -> index 1
    await expect(steps).toHaveAttribute('data-current-index', '1');

    const items = steps.locator('[data-slot="steps-item"]');
    await expect(items.nth(0)).toHaveAttribute('data-status', 'finish');
    await expect(items.nth(1)).toHaveAttribute('data-status', 'process');
    await expect(items.nth(2)).toHaveAttribute('data-status', 'wait');
  });

  test('steps switches current step on click and writes back to scope (scope ownership)', async ({
    page,
  }) => {
    await openW4b(page);

    const steps = page.locator('[data-testid="demo-steps-vertical"]');
    await expect(steps).toHaveAttribute('data-orientation', 'vertical');
    await expect(steps).toHaveAttribute('data-current-index', '0');

    // Click step B (index 1)
    await steps.locator('[data-slot="steps-indicator"]').nth(1).click();

    // scope writeback reflected
    await expect(page.locator('[data-testid="steps-report"]')).toHaveText('steps:b');
    await expect(steps).toHaveAttribute('data-current-index', '1');
  });

  test('steps local controlled reports onChange after click', async ({ page }) => {
    await openW4b(page);

    const steps = page.locator('[data-testid="demo-steps-local"]');
    await expect(page.locator('[data-testid="steps-touched-report"]')).toHaveText(
      'steps-touched:no',
    );

    await steps.locator('[data-slot="steps-indicator"]').nth(1).click();

    await expect(page.locator('[data-testid="steps-touched-report"]')).toHaveText(
      'steps-touched:yes',
    );
  });

  test('timeline renders marker and item order; reverse reorders DOM', async ({ page }) => {
    await openW4b(page);

    const timeline = page.locator('[data-testid="demo-timeline"]');
    await expect(timeline).toBeVisible();
    await expect(timeline).toHaveAttribute('data-slot', 'timeline-root');
    await expect(timeline).toHaveAttribute('data-mode', 'left');

    const normalTitles = await timeline
      .locator('[data-slot="timeline-title"]')
      .allTextContents();
    expect(normalTitles).toEqual(['任务创建', '审核通过', '已发布']);

    // level mapped to data-level
    await expect(timeline.locator('[data-slot="timeline-item"]').nth(1)).toHaveAttribute(
      'data-level',
      'success',
    );

    const reversed = page.locator('[data-testid="demo-timeline-reverse"]');
    await expect(reversed).toHaveAttribute('data-reverse', 'true');
    const reversedTitles = await reversed
      .locator('[data-slot="timeline-title"]')
      .allTextContents();
    expect(reversedTitles).toEqual(['Third', 'Second', 'First']);
  });

  test('timeline v2: scope writeback + onChange seek (click event item)', async ({ page }) => {
    await openW4b(page);

    const timeline = page.locator('[data-testid="demo-timeline-v2-scope"]');
    await expect(timeline).toHaveAttribute('data-ownership', 'scope');
    // defaultValue t1 -> active index 0
    await expect(timeline).toHaveAttribute('data-active-index', '0');
    await expect(
      timeline.locator('[data-slot="timeline-item"]').nth(0),
    ).toHaveAttribute('data-state', 'active');

    // Click event two (index 1) -> scope writeback to valueStatePath + touched report
    await timeline.locator('[data-slot="timeline-item"]').nth(1).click();

    await expect(page.locator('[data-testid="timeline-v2-scope-report"]')).toHaveText(
      'tl-active:t2 | touched:yes',
    );
    await expect(timeline).toHaveAttribute('data-active-index', '1');
    await expect(
      timeline.locator('[data-slot="timeline-item"]').nth(1),
    ).toHaveAttribute('data-state', 'active');
    await expect(
      timeline.locator('[data-slot="timeline-item"]').nth(0),
    ).not.toHaveAttribute('data-state', 'active');
  });

  test('timeline v2: controlled only dispatches onChange, does not mutate value', async ({
    page,
  }) => {
    await openW4b(page);

    const timeline = page.locator('[data-testid="demo-timeline-v2-controlled"]');
    await expect(timeline).toHaveAttribute('data-ownership', 'controlled');
    // data tlCtrl=c2 -> active index 1
    await expect(timeline).toHaveAttribute('data-active-index', '1');

    await timeline.locator('[data-slot="timeline-item"]').nth(2).click();

    // onChange dispatched (touched), but value tlCtrl still c2 -> active stays at index 1
    await expect(page.locator('[data-testid="timeline-v2-controlled-report"]')).toHaveText(
      'tl-ctrl:c2 | touched:yes',
    );
    await expect(timeline).toHaveAttribute('data-active-index', '1');
  });

  test('timeline v2: unmatched value -> no active, no first-item fallback', async ({ page }) => {
    await openW4b(page);

    const timeline = page.locator('[data-testid="demo-timeline-v2-unmatched"]');
    await expect(timeline).toBeVisible();
    // Programmatic assertion: no item carries the active marker, root has no active index
    const activeCount = await timeline.locator('[data-state="active"]').count();
    expect(activeCount).toBe(0);
    expect(await timeline.getAttribute('data-active-index')).toBeNull();
  });

  test('timeline v2: items are not clickable when onChange is not declared', async ({ page }) => {
    await openW4b(page);

    const timeline = page.locator('[data-testid="demo-timeline-v2-unmatched"]');
    const item = timeline.locator('[data-slot="timeline-item"]').first();
    await expect(item).not.toHaveAttribute('data-clickable', 'true');
    await expect(item).not.toHaveAttribute('tabindex', '0');
    // W4b display-only timeline (no v2 fields) also stays zero-regression
    const staticItem = page
      .locator('[data-testid="demo-timeline"]')
      .locator('[data-slot="timeline-item"]')
      .first();
    await expect(staticItem).not.toHaveAttribute('data-clickable', 'true');
  });

  test('timeline v2: reverse renders active at the reversed visual position', async ({ page }) => {
    await openW4b(page);

    const timeline = page.locator('[data-testid="demo-timeline-v2-reverse-active"]');
    await expect(timeline).toHaveAttribute('data-reverse', 'true');
    // Logical order r1(旧事件) r2(当前事件) r3(最新事件); reversed DOM: 最新, 当前, 旧
    await expect(timeline).toHaveAttribute('data-active-index', '1');

    const active = timeline.locator('[data-slot="timeline-item"][data-state="active"]');
    await expect(active).toHaveCount(1);
    await expect(active.locator('[data-slot="timeline-title"]')).toHaveText('当前事件');
    // DOM position: reversed -> index 1 (middle)
    await expect(
      timeline.locator('[data-slot="timeline-item"]').nth(1).locator('[data-slot="timeline-title"]'),
    ).toHaveText('当前事件');
  });
});
