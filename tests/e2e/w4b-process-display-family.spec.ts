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
});
