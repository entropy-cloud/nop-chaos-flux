import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C6.4 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-media-dialog + host-media-error (bug 73 pattern): audio/video inside
 *    an openDialog surface — the data-URI audio loads normally AND a broken
 *    video data-URI shows the error fallback + fires onLoadError (real-browser
 *    media lifecycle inside a dialog; the w4a demo already covers the plain
 *    page-level error fallback). * 2. host-carousel-ctrl: external ComponentHandle next/prev/setValue buttons
 *    drive the active slide; the onChange action args read `${activeIndex}`
 *    from the event payload (evaluationBindings) AND `${slides.length}` /
 *    `${item.title}` from scope (scope ctx injection — carousel P2-3 fix).
 * 3. host-carousel-auto: autoPlay scope toggle — interval-driven advance while
 *    enabled, stops when disabled, resumes when re-enabled.
 * 4. host-qrcode-update: scope-driven value updates re-render the canvas
 *    (toDataURL differs); empty value → empty fallback; valid value → canvas
 *    recovery (failure recovery path in a real browser).
 */

test('media-host: audio/video inside openDialog load + error fallback + onLoadError (host-media-dialog/host-media-error, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('audio');

  const slug = scenarioSlug('Host media in dialog + error fallback (C6.4 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c6c4-media-dialog-open"]').click();
  const dialogAudio = page.locator('[data-testid="c6c4-dialog-audio"]');
  await expect(dialogAudio).toBeVisible({ timeout: 10_000 });
  // data-URI audio loads normally inside the dialog (native element present).
  const audio = dialogAudio.locator('audio[data-slot="audio-media"]');
  await expect(audio).toBeVisible({ timeout: 10_000 });
  expect((await audio.getAttribute('src')) || '').toContain('data:audio/wav');

  // Broken video source → error fallback + onLoadError probe inside the dialog.
  const dialogVideo = page.locator('[data-testid="c6c4-dialog-video-error"]');
  await expect(dialogVideo).toHaveAttribute('data-state', 'error', { timeout: 10_000 });
  await expect(dialogVideo.locator('[data-slot="video-fallback"]')).toBeVisible();
  const mediaProbe = await page.evaluate(
    () => (window as unknown as { __c6c4MediaError?: string }).__c6c4MediaError,
  );
  expect(mediaProbe).toBe('video-error-fired');

  // Close and reopen — no exceptions, media lifecycle repeats cleanly.
  await page.locator('[data-slot="dialog-close"]').click();
  await expect(dialogAudio).toHaveCount(0);
  await stage.locator('[data-testid="c6c4-media-dialog-open"]').click();
  await expect(dialogAudio).toBeVisible({ timeout: 10_000 });
  await expect(dialogVideo).toHaveAttribute('data-state', 'error', { timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('carousel-host: external handles drive slides + onChange payload (host-carousel-ctrl)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('carousel');

  const slug = scenarioSlug('Host carousel external control + onChange payload (C6.4)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const carousel = stage.locator('[data-testid="c6c4-carousel"]');
  await expect(carousel).toBeVisible({ timeout: 10_000 });
  await expect(carousel).toHaveAttribute('data-active-index', '0');

  // component:next → slide 2 (index 1); onChange args read evaluationBindings
  // (${activeIndex}) + scope (${slides.length}) + payload item (${item.title}).
  await stage.locator('[data-testid="c6c4-carousel-next"]').click();
  await expect(carousel).toHaveAttribute('data-active-index', '1', { timeout: 10_000 });
  const nextProbe = await page.evaluate(
    () => (window as unknown as { __c6c4CarouselChange?: string }).__c6c4CarouselChange,
  );
  expect(nextProbe).toBe('1|3|Second');

  // component:setValue → slide 3 (index 2).
  await stage.locator('[data-testid="c6c4-carousel-set"]').click();
  await expect(carousel).toHaveAttribute('data-active-index', '2', { timeout: 10_000 });
  const setProbe = await page.evaluate(
    () => (window as unknown as { __c6c4CarouselChange?: string }).__c6c4CarouselChange,
  );
  expect(setProbe).toBe('2|3|Third');

  // component:prev → back to slide 2 (index 1).
  await stage.locator('[data-testid="c6c4-carousel-prev"]').click();
  await expect(carousel).toHaveAttribute('data-active-index', '1', { timeout: 10_000 });
  const prevProbe = await page.evaluate(
    () => (window as unknown as { __c6c4CarouselChange?: string }).__c6c4CarouselChange,
  );
  expect(prevProbe).toBe('1|3|Second');

  await assertTrackedPageErrors(page);
});

test('carousel-host: autoplay interval drives + scope toggle stops/resumes (host-carousel-auto)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('carousel');

  const slug = scenarioSlug('Host carousel autoplay toggle (C6.4)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });
  // The autoplay pause contract includes offscreen pausing (IntersectionObserver),
  // so the stage must be inside the viewport for the interval to advance.
  await stage.scrollIntoViewIfNeeded();

  const carousel = stage.locator('[data-testid="c6c4-carousel-auto"]');
  await expect(carousel).toBeVisible({ timeout: 10_000 });
  await expect(carousel).toHaveAttribute('data-active-index', '0');

  // autoPlay on → the interval advances the slide WITHOUT any interaction.
  await expect
    .poll(
      async () => Number(await carousel.getAttribute('data-active-index')),
      { timeout: 5_000, message: 'autoplay should advance the active slide' },
    )
    .toBeGreaterThan(0);

  // Toggle autoPlay off → advancement stops (index stays stable).
  await stage.locator('[data-testid="c6c4-carousel-auto-toggle"]').click();
  const pausedIndex = Number(await carousel.getAttribute('data-active-index'));
  await page.waitForTimeout(1_500);
  expect(Number(await carousel.getAttribute('data-active-index'))).toBe(pausedIndex);

  // Toggle autoPlay back on → advancement resumes.
  await stage.locator('[data-testid="c6c4-carousel-auto-toggle"]').click();
  await expect
    .poll(
      async () => Number(await carousel.getAttribute('data-active-index')),
      { timeout: 5_000, message: 'autoplay should resume after re-enabling' },
    )
    .not.toBe(pausedIndex);

  await assertTrackedPageErrors(page);
});

test('qrcode-host: value updates redraw the canvas + empty fallback + recovery (host-qrcode-update)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('qrcode');

  const slug = scenarioSlug('Host qrcode value update + canvas redraw (C6.4)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const qr = stage.locator('[data-testid="c6c4-qrcode"]');
  await expect(qr).toBeVisible({ timeout: 10_000 });
  const canvas = qr.locator('canvas[data-slot="qrcode-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  const initial = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png'));

  // Switch to value A → canvas redraws to a different matrix.
  await stage.locator('[data-testid="c6c4-qrcode-set-a"]').click();
  await expect.poll(
    async () =>
      canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png')),
    { timeout: 10_000 },
  ).not.toBe(initial);
  const valueA = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png'));

  // Switch to value B → another distinct matrix.
  await stage.locator('[data-testid="c6c4-qrcode-set-b"]').click();
  await expect.poll(
    async () =>
      canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png')),
    { timeout: 10_000 },
  ).not.toBe(valueA);

  // Clear → empty fallback replaces the canvas.
  await stage.locator('[data-testid="c6c4-qrcode-clear"]').click();
  await expect(qr).toHaveAttribute('data-state', 'empty', { timeout: 10_000 });
  await expect(qr.locator('[data-slot="qrcode-fallback"]')).toBeVisible();
  await expect(qr.locator('canvas')).toHaveCount(0);

  // Valid value again → canvas recovers (failure-recovery path in real browser).
  await stage.locator('[data-testid="c6c4-qrcode-set-a"]').click();
  await expect(qr.locator('canvas[data-slot="qrcode-canvas"]')).toBeVisible({ timeout: 10_000 });
  await expect(qr).not.toHaveAttribute('data-state', 'empty');

  await assertTrackedPageErrors(page);
});
