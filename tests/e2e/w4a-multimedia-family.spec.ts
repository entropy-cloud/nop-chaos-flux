import { expect, test } from './fixtures.js';

async function openW4a(page: import('@playwright/test').Page) {
  await page.goto('#/w4a-multimedia', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '多媒体组 — audio / video / carousel / qrcode',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('W4a multimedia family — flux-renderers-content', () => {
  test('audio renders the native <audio> element with src, controls, and title', async ({ page }) => {
    await openW4a(page);
    const host = page.locator('[data-testid="demo-audio"]');
    await expect(host).toBeVisible();
    const audio = host.locator('audio[data-slot="audio-media"]');
    await expect(audio).toBeVisible();
    expect((await audio.getAttribute('src')) || '').toContain('data:audio/wav');
    expect(await audio.getAttribute('controls')).not.toBeNull();
    await expect(host.locator('[data-slot="audio-title"]')).toContainText('Sample audio track');
  });

  test('audio empty state renders the placeholder when no src is provided', async ({ page }) => {
    await openW4a(page);
    const empty = page.locator('[data-testid="demo-audio-empty"][data-state="empty"]');
    await expect(empty).toBeVisible();
    expect(await empty.locator('audio').count()).toBe(0);
  });

  test('audio falls back when the src fails to load', async ({ page }) => {
    await openW4a(page);
    const fallback = page.locator('[data-testid="demo-audio-error"][data-state="error"]');
    await expect(fallback).toBeVisible({ timeout: 10_000 });
  });

  test('video renders the native <video> element with muted (video-only) attribute', async ({ page }) => {
    await openW4a(page);
    const host = page.locator('[data-testid="demo-video"]');
    await expect(host).toBeVisible();
    const video = host.locator('video[data-slot="video-media"]');
    await expect(video).toBeVisible();
    expect((await video.getAttribute('src')) || '').toContain('data:video/mp4');
    expect(await video.getAttribute('controls')).not.toBeNull();
    // `muted` is set as a DOM property (React does not reflect it as an attribute).
    const isMuted = await video.evaluate((el) => (el as HTMLVideoElement).muted);
    expect(isMuted).toBe(true);
    await expect(host.locator('[data-slot="video-title"]')).toContainText('Sample video clip');
  });

  test('video empty state renders the placeholder when no src is provided', async ({ page }) => {
    await openW4a(page);
    const empty = page.locator('[data-testid="demo-video-empty"][data-state="empty"]');
    await expect(empty).toBeVisible();
    expect(await empty.locator('video').count()).toBe(0);
  });

  test('carousel renders slides, indicators, and switches the active item', async ({ page }) => {
    await openW4a(page);
    const carousel = page.locator('[data-testid="demo-carousel"]');
    await expect(carousel).toBeVisible();
    expect(await carousel.locator('[data-slot="carousel-item"]').count()).toBe(3);
    const indicators = carousel.locator('[data-slot="carousel-indicator"]');
    await expect(indicators).toHaveCount(3);
    // controls are present (prev/next buttons exist)
    expect(await carousel.locator('[data-slot="carousel-next"]').count()).toBe(1);
    // starts at slide 0
    await expect(indicators.nth(0)).toHaveAttribute('data-active', 'true');

    // click the third indicator dot (in-bounds) to switch the active slide
    await indicators.nth(2).click();
    await expect(indicators.nth(2)).toHaveAttribute('data-active', 'true');
    expect(await carousel.getAttribute('data-active-index')).toBe('2');
  });

  test('carousel next/prev/setValue handles dispatch and move the active slide', async ({ page }) => {
    await openW4a(page);
    const carousel = page.locator('[data-testid="demo-carousel"]');
    const indicators = carousel.locator('[data-slot="carousel-indicator"]');
    await expect(indicators.nth(0)).toHaveAttribute('data-active', 'true');

    // setValue handle -> go to slide 3 (index 2)
    await page.locator('[data-testid="carousel-set-handle"]').click();
    await expect(indicators.nth(2)).toHaveAttribute('data-active', 'true');

    // prev handle -> back to slide 2 (index 1)
    await page.locator('[data-testid="carousel-prev-handle"]').click();
    await expect(indicators.nth(1)).toHaveAttribute('data-active', 'true');

    // next handle -> forward to slide 3 (index 2)
    await page.locator('[data-testid="carousel-next-handle"]').click();
    await expect(indicators.nth(2)).toHaveAttribute('data-active', 'true');
  });

  test('qrcode renders a canvas for a value and shows the empty state when absent', async ({ page }) => {
    await openW4a(page);
    const qr = page.locator('[data-testid="demo-qrcode"]');
    await expect(qr).toBeVisible();
    const canvas = qr.locator('canvas[data-slot="qrcode-canvas"]');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    // the canvas must have non-zero rendered dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
    await expect(qr.locator('[data-slot="qrcode-label"]')).toContainText('Scan to open repo');

    const empty = page.locator('[data-testid="demo-qrcode-empty"][data-state="empty"]');
    await expect(empty).toBeVisible();
    expect(await empty.locator('canvas').count()).toBe(0);
  });

  test('qrcode canvas output depends on the value (different values differ)', async ({ page }) => {
    await openW4a(page);
    const primary = page.locator('[data-testid="demo-qrcode"] canvas[data-slot="qrcode-canvas"]');
    const alt = page.locator('[data-testid="demo-qrcode-alt"] canvas[data-slot="qrcode-canvas"]');
    await expect(primary).toBeVisible({ timeout: 10_000 });
    await expect(alt).toBeVisible({ timeout: 10_000 });
    const primaryData = await primary.evaluate((el) =>
      (el as HTMLCanvasElement).toDataURL('image/png'),
    );
    const altData = await alt.evaluate((el) =>
      (el as HTMLCanvasElement).toDataURL('image/png'),
    );
    expect(primaryData.startsWith('data:image/png')).toBe(true);
    // different values must produce different QR matrices
    expect(primaryData).not.toBe(altData);
  });
});
