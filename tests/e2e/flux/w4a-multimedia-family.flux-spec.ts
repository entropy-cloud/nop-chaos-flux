import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W4a multimedia family — audio / video / carousel / qrcode
 * (flux-renderers-content).
 *
 * Migrated from tests/e2e/w4a-multimedia-family.spec.ts (E3 batch 2, engine swap +
 * locator.evaluate DOM reads replaced by ft.evaluate with document.querySelector
 * (marked TODO(migrate-debt)), plus kernel white-box expectNoPageErrors at each
 * family boundary — stricter than the old console-only tracking).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * openW4a() bounces through '/#/' with a stability gate so the route remounts.
 */

async function openW4a(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/w4a-multimedia');
  await ft.expectWeb(
    ft.getByRole('heading', { name: '多媒体组 — audio / video / carousel / qrcode', level: 1 }),
  ).toBeVisible({ timeoutMs: 15_000 });
}

export default async function w4aMultimediaFamily(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: audio renders the native <audio> element with src, controls, and title
  await openW4a(ft);
  const audioHost = ft.locator('[data-testid="demo-audio"]');
  await ft.expectWeb(audioHost).toBeVisible();
  const audio = audioHost.locator('audio[data-slot="audio-media"]');
  await ft.expectWeb(audio).toBeVisible();
  const audioSrc = (await audio.attr('src')) || '';
  if (!audioSrc.includes('data:audio/wav')) {
    throw new Error(`audio src should contain "data:audio/wav", got "${audioSrc.slice(0, 60)}"`);
  }
  const audioControls = await audio.attr('controls');
  if (audioControls === null) throw new Error('audio: controls attribute missing');
  await ft.expectWeb(audioHost.locator('[data-slot="audio-title"]')).toContainText('Sample audio track');

  await expectNoPageErrors(ft, 'w4a:audio');

  // Case 2: audio empty state renders the placeholder when no src is provided
  await openW4a(ft);
  const audioEmpty = ft.locator('[data-testid="demo-audio-empty"][data-state="empty"]');
  await ft.expectWeb(audioEmpty).toBeVisible();
  const audioEmptyCount = await audioEmpty.locator('audio').count();
  if (audioEmptyCount !== 0) throw new Error(`audio empty: expected no <audio>, got ${audioEmptyCount}`);

  // Case 3: audio falls back when the src fails to load
  const audioFallback = ft.locator('[data-testid="demo-audio-error"][data-state="error"]');
  await ft.expectWeb(audioFallback).toBeVisible({ timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'w4a:audio-empty');

  // Case 4: video renders the native <video> element with muted (video-only) attribute
  await openW4a(ft);
  const videoHost = ft.locator('[data-testid="demo-video"]');
  await ft.expectWeb(videoHost).toBeVisible();
  const video = videoHost.locator('video[data-slot="video-media"]');
  await ft.expectWeb(video).toBeVisible();
  const videoSrc = (await video.attr('src')) || '';
  if (!videoSrc.includes('data:video/mp4')) {
    throw new Error(`video src should contain "data:video/mp4", got "${videoSrc.slice(0, 60)}"`);
  }
  const videoControls = await video.attr('controls');
  if (videoControls === null) throw new Error('video: controls attribute missing');
  // `muted` is set as a DOM property (React does not reflect it as an attribute).
  // TODO(migrate-debt): evaluate fallback (DOM property read, not exposed as attribute)
  const isMuted = await ft.evaluate(
    `(() => { const el = document.querySelector('[data-testid="demo-video"] video[data-slot="video-media"]'); return el ? el.muted === true : false; })()`,
  );
  if (!isMuted) throw new Error('video: muted property should be true');
  await ft.expectWeb(videoHost.locator('[data-slot="video-title"]')).toContainText('Sample video clip');

  // Case 5: video empty state renders the placeholder when no src is provided
  const videoEmpty = ft.locator('[data-testid="demo-video-empty"][data-state="empty"]');
  await ft.expectWeb(videoEmpty).toBeVisible();
  const videoEmptyCount = await videoEmpty.locator('video').count();
  if (videoEmptyCount !== 0) throw new Error(`video empty: expected no <video>, got ${videoEmptyCount}`);

  await expectNoPageErrors(ft, 'w4a:video');

  // Case 6: carousel renders slides, indicators, and switches the active item
  await openW4a(ft);
  const carousel = ft.locator('[data-testid="demo-carousel"]');
  await ft.expectWeb(carousel).toBeVisible();
  const itemCount = await carousel.locator('[data-slot="carousel-item"]').count();
  if (itemCount !== 3) throw new Error(`carousel: expected 3 items, got ${itemCount}`);
  const indicators = carousel.locator('[data-slot="carousel-indicator"]');
  await ft.expectWeb(indicators).toHaveCount(3);
  // controls are present (prev/next buttons exist)
  const nextCount = await carousel.locator('[data-slot="carousel-next"]').count();
  if (nextCount !== 1) throw new Error(`carousel: expected 1 next control, got ${nextCount}`);
  // starts at slide 0
  await ft.expectWeb(indicators.nth(0)).toHaveAttribute('data-active', 'true');

  // click the third indicator dot (in-bounds) to switch the active slide
  await indicators.nth(2).click();
  await ft.expectWeb(indicators.nth(2)).toHaveAttribute('data-active', 'true');
  const activeIndex = await carousel.attr('data-active-index');
  if (activeIndex !== '2') throw new Error(`carousel: expected data-active-index="2", got "${activeIndex}"`);

  await expectNoPageErrors(ft, 'w4a:carousel-indicator');

  // Case 7: carousel next/prev/setValue handles dispatch and move the active slide.
  // NOTE: the old spec opened a fresh page per test; here carousel state lives in
  // a scope store that survives the route bounce, so case 6 runs on the untouched
  // first mount (its "starts at slide 0" assertion) and case 7 resets to index 0
  // through the same public indicator control before driving the handles.
  const carousel2 = ft.locator('[data-testid="demo-carousel"]');
  const indicators2 = carousel2.locator('[data-slot="carousel-indicator"]');
  await indicators2.nth(0).click();
  await ft.expectWeb(indicators2.nth(0)).toHaveAttribute('data-active', 'true');
  const resetIndex = await carousel2.attr('data-active-index');
  if (resetIndex !== '0') throw new Error(`carousel reset: expected data-active-index="0", got "${resetIndex}"`);

  // setValue handle -> go to slide 3 (index 2)
  await ft.locator('[data-testid="carousel-set-handle"]').click();
  await ft.expectWeb(indicators2.nth(2)).toHaveAttribute('data-active', 'true');

  // prev handle -> back to slide 2 (index 1)
  await ft.locator('[data-testid="carousel-prev-handle"]').click();
  await ft.expectWeb(indicators2.nth(1)).toHaveAttribute('data-active', 'true');

  // next handle -> forward to slide 3 (index 2)
  await ft.locator('[data-testid="carousel-next-handle"]').click();
  await ft.expectWeb(indicators2.nth(2)).toHaveAttribute('data-active', 'true');

  await expectNoPageErrors(ft, 'w4a:carousel-handles');

  // Case 8: qrcode renders a canvas for a value and shows the empty state when absent
  await openW4a(ft);
  const qr = ft.locator('[data-testid="demo-qrcode"]');
  await ft.expectWeb(qr).toBeVisible();
  const canvas = qr.locator('canvas[data-slot="qrcode-canvas"]');
  await ft.expectWeb(canvas).toBeVisible({ timeoutMs: 10_000 });
  // the canvas must have non-zero rendered dimensions
  const qrBox = await canvas.boundingBox();
  if (!qrBox || qrBox.width <= 0 || qrBox.height <= 0) {
    throw new Error(`qrcode canvas has non-positive box: ${JSON.stringify(qrBox)}`);
  }
  await ft.expectWeb(qr.locator('[data-slot="qrcode-label"]')).toContainText('Scan to open repo');

  const qrEmpty = ft.locator('[data-testid="demo-qrcode-empty"][data-state="empty"]');
  await ft.expectWeb(qrEmpty).toBeVisible();
  const qrEmptyCount = await qrEmpty.locator('canvas').count();
  if (qrEmptyCount !== 0) throw new Error(`qrcode empty: expected no <canvas>, got ${qrEmptyCount}`);

  // Case 9: qrcode canvas output depends on the value (different values differ)
  // TODO(migrate-debt): evaluate fallback (canvas pixel readback has no locator-level API)
  const primaryData = await ft.evaluate(
    `(() => { const el = document.querySelector('[data-testid="demo-qrcode"] canvas[data-slot="qrcode-canvas"]'); return el && el.toDataURL ? el.toDataURL('image/png') : ''; })()`,
  );
  const altData = await ft.evaluate(
    `(() => { const el = document.querySelector('[data-testid="demo-qrcode-alt"] canvas[data-slot="qrcode-canvas"]'); return el && el.toDataURL ? el.toDataURL('image/png') : ''; })()`,
  );
  if (!primaryData.startsWith('data:image/png')) {
    throw new Error(`qrcode primary canvas did not produce a PNG data URL: "${primaryData.slice(0, 40)}"`);
  }
  // different values must produce different QR matrices
  if (primaryData === altData) throw new Error('qrcode: different values produced identical canvas output');

  await expectNoPageErrors(ft, 'w4a:qrcode');

  return { cases: 9 };
}
