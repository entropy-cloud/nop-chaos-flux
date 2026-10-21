import { expect, test } from './fixtures.js';

type PlaywrightPage = import('@playwright/test').Page;

async function openWheelPickers(page: PlaywrightPage) {
  await page.goto('#/m7-wheel-pickers', { waitUntil: 'commit' });
  // 30s: the route may be compiled on demand by the dev server on first hit.
  await expect(
    page.getByRole('heading', {
      name: 'M7 滚轮家族 — picker-view / wheel-picker / date / time / cascader',
      level: 1,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

/** Deterministic vertical touch drag inside the frame via CDP. */
async function touchDrag(
  page: PlaywrightPage,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8,
) {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }],
  });
  for (let i = 1; i <= steps; i += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps },
      ],
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

test.describe('m7 wheel pickers — verification', () => {
  // Framed-showcase precedent: desktop viewport, gestures via CDP touch.
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  test.setTimeout(120_000);

  test('smoke: wheel family renders in the phone frame', async ({ page }) => {
    await openWheelPickers(page);
    await expect(page.getByTestId('m7-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m7-wheel-picker-trigger')).toBeVisible();
    await expect(page.getByTestId('m7-wheel-date-trigger')).toBeVisible();
    await expect(page.getByTestId('m7-wheel-time-trigger')).toBeVisible();
    await expect(page.getByTestId('m7-wheel-cascader-trigger')).toBeVisible();
    await expect(page.getByTestId('m7-picker-view')).toBeVisible();
    // controlled value [2] (周二) sits at row position 1 (0-based)
    await expect(
      page.getByTestId('m7-picker-view').locator('[data-active="true"]'),
    ).toHaveAttribute('data-index', '1');
  });

  test('picker-view drag snaps a row and moves the data-index marker', async ({ page }) => {
    await openWheelPickers(page);
    const wheel = page.getByTestId('m7-picker-view');
    const box = await wheel.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const activeRow = wheel.locator('[data-active="true"]');
    await expect(activeRow).toHaveAttribute('data-index', '1');

    // finger-up drag by one row height → position advances 1 → 2 (周三)
    await touchDrag(
      page,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 - 44 },
    );
    await expect(activeRow).toHaveAttribute('data-index', '2');
  });

  test('wheel-picker opens the sheet, locks scroll, and confirm closes it', async ({ page }) => {
    await openWheelPickers(page);
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('nop-scroll-lock')))
      .toBe(false);

    await page.getByTestId('m7-wheel-picker-trigger').click();
    const popup = page.locator('[data-slot="wheel-picker-popup"]');
    await expect(popup).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('nop-scroll-lock')))
      .toBe(true);

    await page.locator('[data-slot="wheel-picker-confirm"]').click();
    await expect(popup).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('nop-scroll-lock')))
      .toBe(false);
  });

  test('responsive check: the same route renders after downscaling the viewport', async ({
    page,
  }) => {
    await openWheelPickers(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('m7-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m7-wheel-picker-trigger')).toBeVisible();
  });
});
