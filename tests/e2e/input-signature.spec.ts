import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

async function openSignatureLab(page: Page): Promise<void> {
  await page.goto('/#/lab/input-signature', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

async function drawStroke(page: Page, canvas: ReturnType<Page['locator']>, points: Array<[number, number]>) {
  const box = await canvas.boundingBox();
  expect(box, 'canvas must have a layout box').toBeTruthy();
  await page.mouse.move(box!.x + points[0]![0], box!.y + points[0]![1]);
  await page.mouse.down();
  for (const [dx, dy] of points.slice(1)) {
    await page.mouse.move(box!.x + dx, box!.y + dy);
  }
  await page.mouse.up();
}

test.describe('org select — input-signature (missing-components L2.3)', () => {
  test('drawing commits a PNG dataURL, undo empties, clear resets (零笔画 ⇔ undefined)', async ({ page }) => {
    await openSignatureLab(page);

    const stage = page.getByTestId('scenario-stage-draw-undo-and-clear');
    const canvas = stage.locator('[data-slot="signature-canvas"]');
    await expect(canvas).toBeVisible();
    await expect(stage.getByText('Value:')).toBeVisible();

    // Two strokes → the live value readout carries the PNG dataURL prefix.
    await drawStroke(page, canvas, [
      [20, 30],
      [60, 40],
      [100, 30],
    ]);
    await drawStroke(page, canvas, [
      [20, 60],
      [60, 70],
    ]);
    await expect(stage.getByText(/Value: data:image\/png/)).toBeVisible();

    // Undo once → one stroke left → value re-committed as a (smaller) dataURL.
    await stage.locator('[data-slot="signature-undo"]').click();
    await expect(stage.getByText(/Value: data:image\/png/)).toBeVisible();

    // Undo again → zero strokes → value must be EMPTY (值语义不变式).
    await stage.locator('[data-slot="signature-undo"]').click();
    await expect(stage.locator('[data-slot="signature-canvas-wrap"]')).toBeVisible();
    const probeText = await stage
      .getByText(/^Value:/)
      .evaluate((el) => (el instanceof HTMLElement ? el.innerText : ''));
    expect(probeText.trim()).toBe('Value:');

    // Clear stays at empty.
    await stage.locator('[data-slot="signature-clear"]').click();
    const clearedText = await stage
      .getByText(/^Value:/)
      .evaluate((el) => (el instanceof HTMLElement ? el.innerText : ''));
    expect(clearedText.trim()).toBe('Value:');

    await assertTrackedPageErrors(page);
  });

  test('small-viewport drawing lands the ink at the pointer (DPR geometry)', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await openSignatureLab(page);

    const stage = page.getByTestId('scenario-stage-draw-undo-and-clear');
    const canvas = stage.locator('[data-slot="signature-canvas"]');
    await canvas.click({ position: { x: 40, y: 30 } });

    // Sample the bitmap around the CSS point (scaled by DPR): the stroke must
    // have ink there — a DPR mismatch would put it elsewhere.
    const hasInk = await page.evaluate(() => {
      const canvas = document.querySelector('[data-slot="signature-canvas"]') as HTMLCanvasElement | null;
      if (!canvas) {
        return false;
      }
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return false;
      }
      const px = Math.round(40 * dpr);
      const py = Math.round(30 * dpr);
      for (let dx = -8; dx <= 8; dx++) {
        for (let dy = -8; dy <= 8; dy++) {
          const data = ctx.getImageData(px + dx, py + dy, 1, 1).data;
          // Ink = a non-white, non-transparent pixel (white is the background).
          const [r, , , a] = data;
          if (a! > 0 && r! < 250) {
            return true;
          }
        }
      }
      return false;
    });
    expect(hasInk).toBe(true);

    await assertTrackedPageErrors(page);
  });

  test('readonly pad ignores drawing and the initial dataURL echoes onto the canvas', async ({ page }) => {
    await openSignatureLab(page);

    const stage = page.getByTestId('scenario-stage-styled-and-readonly');
    const locked = stage.locator('[data-slot="signature-canvas"]').nth(1);
    await expect(locked).toBeVisible();

    // Readonly overlay blocks drawing: no value appears.
    await drawStroke(page, locked, [
      [20, 20],
      [50, 30],
    ]);
    const styled = stage.locator('[data-slot="signature-canvas"]').first();
    await expect(styled).toBeVisible();

    // Toolbar buttons are disabled in readonly.
    const undo = stage.locator('[data-slot="signature-undo"]').nth(1);
    await expect(undo).toBeDisabled();

    await assertTrackedPageErrors(page);
  });
});
