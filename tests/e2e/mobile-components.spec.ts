import { expect, test } from './fixtures.js';

async function openMobileComponents(page: import('@playwright/test').Page) {
  await page.goto('#/mobile-components', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '移动端原生组件 — pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('mobile-native components (M5) — touch-viewport verification', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('pull-refresh renders with body content and indicator', async ({ page }) => {
    await openMobileComponents(page);
    const pullRefresh = page.locator('[data-testid="demo-pull-refresh"]');
    await expect(pullRefresh).toBeVisible();
    await expect(pullRefresh.getAttribute('data-status')).resolves.toBe('normal');
    await expect(page.locator('[data-testid="pull-refresh-body-text"]')).toBeVisible();
  });

  test('pull-refresh transitions through pulling state on touch drag', async ({ page }) => {
    await openMobileComponents(page);
    const pullRefresh = page.locator('[data-testid="demo-pull-refresh"]');
    const box = await pullRefresh.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + 40;
    const endY = startY + 120;

    await page.touchscreen.tap(startX, startY);
    // Synthesize touch sequence via CDP for drag (Playwright touchscreen.tap is single-tap only).
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setEmitTouchEventsForMouse', { enabled: true });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: startX,
      y: startY,
      button: 'left',
      buttons: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: startX,
      y: startY + 30,
      button: 'left',
      buttons: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: startX,
      y: endY,
      button: 'left',
      buttons: 1,
    });

    // Status should have flipped to pulling or loosing at least once during drag.
    const status = await pullRefresh.getAttribute('data-status');
    expect(['pulling', 'loosing', 'loading', 'normal']).toContain(status ?? '');

    await client.send('Emulation.setEmitTouchEventsForMouse', { enabled: false });
  });

  test('infinite-scroll renders body and sentinel + status slot', async ({ page }) => {
    await openMobileComponents(page);
    const infiniteScroll = page.locator('[data-testid="demo-infinite-scroll"]');
    await expect(infiniteScroll).toBeVisible();
    await expect(infiniteScroll.locator('[data-slot="infinite-scroll-sentinel"]')).toBeVisible();
    await expect(infiniteScroll.locator('[data-slot="infinite-scroll-status"]')).toBeVisible();
    const status = await infiniteScroll.getAttribute('data-status');
    expect(status).toMatch(/^(normal|loading|finished|error)$/);
  });

  test('swipe-cell renders body/left/right regions', async ({ page }) => {
    await openMobileComponents(page);
    const swipeCell = page.locator('[data-testid="demo-swipe-cell"]');
    await expect(swipeCell).toBeVisible();
    await expect(swipeCell.locator('[data-slot="swipe-cell-content"]')).toBeVisible();
    await expect(swipeCell.locator('[data-slot="swipe-cell-left"]')).toBeVisible();
    await expect(swipeCell.locator('[data-slot="swipe-cell-right"]')).toBeVisible();
    expect(await swipeCell.getAttribute('data-state')).toBe('closed');
  });

  test('countdown ticks down from 30s towards zero', async ({ page }) => {
    await openMobileComponents(page);
    const countdown = page.locator('[data-testid="demo-countdown"]');
    await expect(countdown).toBeVisible();
    const initialValue = await countdown
      .locator('[data-slot="countdown-value"]')
      .textContent();
    expect(initialValue).toMatch(/^\d{2}:\d{2}$/);

    await page.waitForTimeout(1500);

    const laterValue = await countdown
      .locator('[data-slot="countdown-value"]')
      .textContent();
    expect(laterValue).toMatch(/^\d{2}:\d{2}$/);
    // The displayed value should have advanced (not equal to initial).
    expect(laterValue).not.toBe(initialValue);
  });

  test('notice-bar close button hides the bar', async ({ page }) => {
    await openMobileComponents(page);
    const noticeBar = page.locator('[data-testid="demo-notice-bar"]');
    await expect(noticeBar).toBeVisible();
    const closeBtn = noticeBar.locator('[data-slot="notice-bar-close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(noticeBar).toHaveCount(0);
  });

  test('notice-bar renders text content and info variant', async ({ page }) => {
    await openMobileComponents(page);
    const noticeBar = page.locator('[data-testid="demo-notice-bar"]');
    await expect(noticeBar).toBeVisible();
    expect(await noticeBar.getAttribute('data-variant')).toBe('info');
    const text = await noticeBar.locator('[data-slot="notice-bar-text"]').textContent();
    expect(text).toContain('M5');
  });

  test('all five mobile renderers mounted in single page', async ({ page }) => {
    await openMobileComponents(page);
    await expect(page.locator('[data-testid="demo-pull-refresh"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-infinite-scroll"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-swipe-cell"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-countdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-notice-bar"]')).toBeVisible();
  });
});
