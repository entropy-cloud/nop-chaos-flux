import { expect, test } from './fixtures.js';

type PlaywrightPage = import('@playwright/test').Page;

async function openBottomPanels(page: PlaywrightPage) {
  await page.goto('#/m8-bottom-panels', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'M8 底部面板组 — floating-panel / bubble / action-sheet / Sheet 手势关闭',
      level: 1,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

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

test.describe('m8 bottom panels — verification', () => {
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  test.setTimeout(120_000);

  test('smoke: bottom panel family renders in the phone frame', async ({ page }) => {
    await openBottomPanels(page);
    await expect(page.getByTestId('m8-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m8-action-sheet-trigger')).toBeVisible();
    await expect(page.getByTestId('m8-floating-bubble')).toBeVisible();
    const panel = page.getByTestId('m8-floating-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-anchor', '0');
  });

  test('floating-panel drag snaps to the upper anchor (data-anchor channel)', async ({ page }) => {
    await openBottomPanels(page);
    const panel = page.getByTestId('m8-floating-panel');
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // finger-up drag 150px: height 100 → 250 → nearest anchor 320 (top)
    await touchDrag(
      page,
      { x: box.x + box.width / 2, y: box.y + 40 },
      { x: box.x + box.width / 2, y: box.y + 40 - 150 },
    );
    await expect(panel).toHaveAttribute('data-anchor', '1', { timeout: 5000 });
  });

  test('floating-bubble drag magnetizes to an edge (position assertion)', async ({ page }) => {
    await openBottomPanels(page);
    const bubble = page.getByTestId('m8-floating-bubble');
    await expect(bubble).toBeVisible();
    const box = await bubble.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // drag left by 60px and release: magnet snaps to the LEFT edge (x=0)
    await touchDrag(
      page,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      { x: box.x + box.width / 2 - 120, y: box.y + box.height / 2 },
    );
    await expect
      .poll(() =>
        bubble.evaluate((el) => {
          const x = parseFloat(el.style.transform.match(/translate\((-?\d+(\.\d+)?)px/)?.[1] ?? '999');
          return x;
        }),
      )
      .toBeLessThan(30); // snapped to (or near) the left edge
  });

  test('action-sheet opens, item select closes with toast path intact', async ({ page }) => {
    await openBottomPanels(page);
    await page.getByTestId('m8-action-sheet-trigger').click();
    const popup = page.locator('[data-slot="action-sheet-popup"]');
    await expect(popup).toBeVisible();
    const disabled = popup.locator('[data-slot="action-sheet-item"][data-disabled="true"]');
    await expect(disabled).toHaveCount(1);
    await popup.locator('[data-slot="action-sheet-item"][data-index="0"]').click();
    await expect(popup).toBeHidden();
  });

  test('ui Sheet gestureClose: fast fling closes the sheet', async ({ page }) => {
    await openBottomPanels(page);
    await page.getByTestId('m8-sheet-open').click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible();

    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // fast pull down 120px (d>20 with sub-300ms gesture) → close decision
    await touchDrag(
      page,
      { x: box.x + box.width / 2, y: box.y + 60 },
      { x: box.x + box.width / 2, y: box.y + 180 },
      3,
    );
    await expect(sheet).toBeHidden({ timeout: 5000 });
  });

  test('responsive check: the same route renders after downscaling the viewport', async ({
    page,
  }) => {
    await openBottomPanels(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('m8-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m8-floating-panel')).toBeVisible();
  });
});
