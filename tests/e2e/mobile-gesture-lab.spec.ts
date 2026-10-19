import { expect, test } from './fixtures.js';

type PlaywrightPage = import('@playwright/test').Page;

async function openGestureLab(page: PlaywrightPage) {
  await page.goto('#/m6-gesture-lab', { waitUntil: 'commit' });
  // 30s: the route may be compiled on demand by the dev server on first hit.
  await expect(
    page.getByRole('heading', {
      name: 'M6 手势基建 — velocity / rubberband / useLockScroll',
      level: 1,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Deterministic touch drag via CDP (MA-20 follow-up on the mouse-synthesis
 * unreliability noted in mobile-components.spec.ts): dispatchTouchEvent
 * produces real TouchEvents regardless of how the browser maps mouse input,
 * so useTouch sees a genuine gesture with real timestamps.
 */
async function touchDrag(page: PlaywrightPage, from: { x: number; y: number }, to: { x: number; y: number }, steps = 8) {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }],
  });
  for (let i = 1; i <= steps; i += 1) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y }],
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

test.describe('m6 gesture lab — verification', () => {
  // Framed-showcase precedent (m5-mobile-showcase.spec.ts): the phone frame
  // IS the mobile surface, so the page runs at desktop viewport; gestures are
  // synthesized inside the frame via CDP touch, not mouse emulation.
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  // First navigation may compile the route on demand under the strict
  // validation dev server; give the whole test headroom beyond the default.
  test.setTimeout(120_000);

  test('smoke: gesture lab sections render in the phone frame', async ({ page }) => {
    await openGestureLab(page);
    await expect(page.getByTestId('m6-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m6-swipe-cell')).toBeVisible();
    await expect(page.getByTestId('m6-swipe-cell')).toHaveAttribute('data-state', 'closed');
    await expect(page.getByTestId('m6-pull-refresh')).toBeVisible();
    await expect(page.getByTestId('m6-pull-refresh')).toHaveAttribute('data-status', 'normal');
    await expect(page.getByTestId('m6-pull-refresh-body')).toContainText('rubberband');
    await expect(page.getByTestId('m6-lock-open')).toBeVisible();
  });

  test('swipe-cell opens past the static threshold and the K-map closing gesture closes it', async ({
    page,
  }) => {
    await openGestureLab(page);
    const cell = page.getByTestId('m6-swipe-cell');
    await expect(cell).toBeVisible();
    const box = await cell.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const y = box.y + box.height / 2;

    // rightward drag past the 30px threshold but BELOW the overswipe bound
    // (1.15× the ~53px action region ≈ 61px) opens the left region — a longer
    // drag would legitimately trigger the overswipe first-action instead.
    await touchDrag(page, { x: box.x + 20, y }, { x: box.x + 65, y });
    await expect(cell).toHaveAttribute('data-state', 'open-left');

    // CHANGE ②: a cross closing swipe past the threshold closes the cell
    // instead of flipping to the opposite side
    await touchDrag(page, { x: box.x + 110, y }, { x: box.x + 65, y });
    await expect(cell).toHaveAttribute('data-state', 'closed');
  });

  test('useLockScroll adds and removes the body lock class with the overlay', async ({
    page,
  }) => {
    await openGestureLab(page);
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('nop-scroll-lock')))
      .toBe(false);

    await page.getByTestId('m6-lock-open').click();
    const overlay = page.getByTestId('m6-lock-overlay');
    await expect(overlay).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('nop-scroll-lock')))
      .toBe(true);

    await page.getByTestId('m6-lock-close').click();
    await expect(overlay).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('nop-scroll-lock')))
      .toBe(false);
  });

  test('responsive check: the same route renders after downscaling the viewport', async ({
    page,
  }) => {
    await openGestureLab(page);
    await page.setViewportSize({ width: 390, height: 844 });
    // toBeVisible checks rendering, not viewport intersection — the frame
    // overflows horizontally at this width (framed layout), which is fine.
    await expect(page.getByTestId('m6-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m6-swipe-cell')).toHaveAttribute('data-state', 'closed');
    await expect(page.getByTestId('m6-lock-open')).toBeVisible();
  });
});
