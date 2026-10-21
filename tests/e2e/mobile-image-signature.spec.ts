import { expect, test } from './fixtures.js';

type PlaywrightPage = import('@playwright/test').Page;

async function openImageSignature(page: PlaywrightPage) {
  await page.goto('#/m9-image-signature', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'M9 图像与手写 — image-viewer / input-signature 增强',
      level: 1,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

test.describe('m9 image & signature — verification', () => {
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  test.setTimeout(120_000);

  test('smoke: viewer trigger, canvas, and toolbar render', async ({ page }) => {
    await openImageSignature(page);
    await expect(page.getByTestId('m9-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m9-viewer-open')).toBeVisible();
    await expect(page.getByTestId('m9-signature').first()).toBeVisible();
    await expect(page.locator('[data-slot="signature-canvas"]').first()).toBeVisible();
    await expect(page.locator('[data-slot="signature-undo"]').first()).toBeVisible();
  });

  test('image-viewer opens, double-tap zooms to scale 2, swipe-down closes', async ({ page }) => {
    await openImageSignature(page);
    await page.getByTestId('m9-viewer-open').click();
    const viewer = page.locator('[data-slot="image-viewer"]');
    await expect(viewer).toBeVisible();
    await expect(viewer).toHaveAttribute('data-scale', '1');

    const box = await viewer.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // double-tap → scale 2
    const session = await page.context().newCDPSession(page);
    for (let tap = 0; tap < 2; tap += 1) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: cx, y: cy }],
      });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await expect(viewer).toHaveAttribute('data-scale', '2', { timeout: 5000 });

    // double-tap again → back to scale 1 (zoomed state freezes paging/close;
    // resolveGesture routes the pull to pan while scale > 1)
    for (let tap = 0; tap < 2; tap += 1) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: cx, y: cy }],
      });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await expect(viewer).toHaveAttribute('data-scale', '1', { timeout: 5000 });

    // swipe down 150px → close
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx, y: cy }],
    });
    for (let i = 1; i <= 6; i += 1) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx, y: cy + i * 25 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    await expect(viewer).toBeHidden({ timeout: 5000 });
  });

  test('input-signature: stroke enables undo and grows the PNG bitmap; undo empties it', async ({
    page,
  }) => {
    await openImageSignature(page);
    const canvas = page.locator('[data-slot="signature-canvas"]').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const undo = page.locator('[data-slot="signature-undo"]').first();

    // zero strokes: the bitmap is the blank background fill
    const blankLength = await canvas.evaluate((el) =>
      (el as HTMLCanvasElement).toDataURL('image/png').length,
    );

    // draw a 6-point stroke via CDP touch
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + 20, y: box.y + 30 }],
    });
    for (let i = 1; i <= 6; i += 1) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: box.x + 20 + i * 15, y: box.y + 30 + i * 10 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();

    // stroke commits to the bitmap: PNG grows beyond the blank baseline
    await expect
      .poll(() =>
        canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png').length),
      )
      .toBeGreaterThan(blankLength);

    // undo pops the stroke: zero-stroke invariant returns the bitmap to the
    // blank baseline (plan 507 值语义不变式). The renderer swallows stray
    // clicks for 400ms after a stroke ends — wait it out before clicking undo.
    await page.waitForTimeout(450);
    await undo.click();
    await expect
      .poll(() =>
        canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png').length),
      )
      .toBeLessThan(blankLength + 50);
  });


  test('responsive check: the same route renders after downscaling the viewport', async ({
    page,
  }) => {
    await openImageSignature(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('m9-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m9-signature').first()).toBeVisible();
  });
});
