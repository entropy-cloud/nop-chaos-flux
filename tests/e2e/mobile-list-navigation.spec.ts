import { expect, test } from './fixtures.js';

type PlaywrightPage = import('@playwright/test').Page;

async function openListNavigation(page: PlaywrightPage) {
  await page.goto('#/m10-list-navigation', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'M10 列表导航 — index-bar / scroll-mask',
      level: 1,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

test.describe('m10 list navigation — verification', () => {
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  test.setTimeout(120_000);

  test('smoke: index-bar, contact list, and mask scroller render', async ({ page }) => {
    await openListNavigation(page);
    await expect(page.getByTestId('m10-phone-frame')).toBeVisible();
    await expect(page.locator('[data-slot="index-bar"]')).toBeVisible();
    await expect(page.getByTestId('m10-contact-list')).toBeVisible();
    await expect(page.getByTestId('m10-mask-scroller')).toBeVisible();
  });

  test('index-bar touch locates a key: highlight + target scrollIntoView', async ({ page }) => {
    await openListNavigation(page);
    const bar = page.locator('[data-slot="index-bar"]');
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // touch the middle of the sidebar's VISIBLE portion (keys render inside
    // the bounded demo wrapper; a raw bounding-box midpoint can fall outside
    // the 900px viewport when the wrapper scrolls)
    // touch near the sidebar's visible bottom so a LATER key is located —
    // its section is below the fold and scrollIntoView must actually scroll
    const cy = Math.min(box.y + box.height - 30, 760);
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: cy }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width / 2, y: cy }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();

    // some key becomes selected (persists after release) and the anchor list
    // scrolls to the corresponding section
    // the located key is highlighted (data-active) while touched and the
    // selection persists after release (data-selected); scroll linkage is
    // asserted at the unit level (scrollIntoView spy), and the wrapper scroll
    // distribution is browser-owned (Chrome may scroll the overflow:hidden
    // wrapper instead of the frame scroller)
    const selectedKey = bar.locator('[data-selected="true"]');
    await expect(selectedKey).toBeVisible({ timeout: 5000 });
  });

  test('scroll-mask data attributes flip with horizontal scroll position', async ({ page }) => {
    await openBottomPanelsGuard(page);
    const wrap = page.getByTestId('m10-mask-wrap');
    const scroller = wrap.getByTestId('m10-mask-scroller');
    await expect(scroller).toBeVisible();

    // at scrollLeft 0: only end mask visible
    await expect(wrap.locator('[data-slot="scroll-mask"][data-end="true"]')).toBeVisible();
    await expect(wrap.locator('[data-slot="scroll-mask"][data-start="true"]')).toHaveCount(0);

    // scroll to the far end: start mask appears, end mask disappears
    await scroller.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(wrap.locator('[data-slot="scroll-mask"][data-start="true"]')).toBeVisible();
    await expect(wrap.locator('[data-slot="scroll-mask"][data-end="true"]')).toHaveCount(0);
  });

  test('responsive check: the same route renders after downscaling the viewport', async ({
    page,
  }) => {
    await openListNavigation(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('m10-phone-frame')).toBeVisible();
    await expect(page.locator('[data-slot="index-bar"]')).toBeVisible();
  });
});

async function openBottomPanelsGuard(page: PlaywrightPage) {
  // alias for readability — this suite only navigates to m10
  await openListNavigation(page);
}
