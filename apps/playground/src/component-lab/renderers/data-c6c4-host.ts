import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';

/**
 * C6.4 Phase 3 host-scenario schemas + probe registration (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-media-dialog — audio/video inside an openDialog surface: the data-URI
 *                       audio loads normally AND a missing video src shows the
 *                       error fallback + fires onLoadError (bug 73 pattern:
 *                       real-browser media lifecycle inside a dialog).
 *   host-carousel-ctrl — external ComponentHandle next/prev/setValue buttons
 *                       drive the active slide; the onChange action args read
 *                       `${activeIndex}` from the event payload
 *                       (evaluationBindings) AND `${slides.length}` from scope
 *                       (scope ctx injection — carousel P2-3 fix).
 *   host-carousel-auto — autoPlay scope toggle: interval-driven advance while
 *                       enabled, stops when disabled, resumes when re-enabled.
 *   host-qrcode-update — scope-driven value updates re-render the canvas
 *                       (toDataURL differs); empty value → empty fallback;
 *                       valid value again → canvas recovery.
 */

const AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

// A broken media data-URI: the resource loads (no network error/console noise)
// but cannot be demuxed, so the native element fires `error` — the deterministic
// real-browser trigger for the onLoadError + error-fallback path.
export const BROKEN_VIDEO_DATA_URI = 'data:video/mp4;base64,AAAA';

export const C6C4_SLIDES = [
  { image: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#6366f1"/><text x="50%" y="55%" fill="white" font-size="16" text-anchor="middle">Slide 1</text></svg>'), title: 'First' },
  { image: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#10b981"/><text x="50%" y="55%" fill="white" font-size="16" text-anchor="middle">Slide 2</text></svg>'), title: 'Second' },
  { image: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#f59e0b"/><text x="50%" y="55%" fill="white" font-size="16" text-anchor="middle">Slide 3</text></svg>'), title: 'Third' },
];

/**
 * Probe namespace: `probe:record` (media onLoadError / carousel onChange /
 * qrcode update) — one window slot per method so overlapping dispatches never
 * overwrite each other's evidence.
 */
export function registerC6c4Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as {
        __c6c4MediaError?: string;
        __c6c4CarouselChange?: string;
      };
      if (method === 'carouselChange') {
        w.__c6c4CarouselChange = value;
      } else {
        w.__c6c4MediaError = value;
      }
      return { ok: true, data: value };
    },
  });
}

export const c6c4MediaDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open media dialog',
      testid: 'c6c4-media-dialog-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Media host',
          body: {
            type: 'page',
            body: [
              {
                type: 'audio',
                testid: 'c6c4-dialog-audio',
                src: AUDIO_DATA_URI,
                controls: true,
                title: 'Dialog audio',
              },
              {
                type: 'video',
                testid: 'c6c4-dialog-video-error',
                src: BROKEN_VIDEO_DATA_URI,
                onLoadError: { action: 'probe:record', args: { value: 'video-error-fired' } },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c6c4CarouselCtrlSchema = {
  type: 'page',
  data: { slides: C6C4_SLIDES },
  body: [
    {
      type: 'carousel',
      id: 'c6c4-carousel',
      testid: 'c6c4-carousel',
      items: '${slides}',
      autoPlay: false,
      onChange: {
        action: 'probe:carouselChange',
        args: { value: '${activeIndex}|${slides.length}|${item.title}' },
      },
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Prev (handle)',
          testid: 'c6c4-carousel-prev',
          onClick: { action: 'component:prev', componentId: 'c6c4-carousel' },
        },
        {
          type: 'button',
          label: 'Next (handle)',
          testid: 'c6c4-carousel-next',
          onClick: { action: 'component:next', componentId: 'c6c4-carousel' },
        },
        {
          type: 'button',
          label: 'Go to slide 3 (handle)',
          testid: 'c6c4-carousel-set',
          onClick: {
            action: 'component:setValue',
            componentId: 'c6c4-carousel',
            args: { value: 2 },
          },
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c6c4CarouselAutoSchema = {
  type: 'page',
  data: { slides: C6C4_SLIDES, autoPlay: true },
  body: [
    {
      type: 'carousel',
      id: 'c6c4-carousel-auto',
      testid: 'c6c4-carousel-auto',
      items: '${slides}',
      autoPlay: '${autoPlay}',
      interval: 800,
      loop: true,
    },
    {
      type: 'button',
      label: 'Toggle autoplay',
      testid: 'c6c4-carousel-auto-toggle',
      onClick: { action: 'setValue', args: { path: 'autoPlay', value: '${!autoPlay}' } },
    },
  ],
} as unknown as BaseSchema;

export const c6c4QrcodeUpdateSchema = {
  type: 'page',
  data: { qrValue: 'https://example.com/first' },
  body: [
    {
      type: 'qrcode',
      testid: 'c6c4-qrcode',
      value: '${qrValue}',
      size: 128,
      label: 'Dynamic QR',
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Set value A',
          testid: 'c6c4-qrcode-set-a',
          onClick: { action: 'setValue', args: { path: 'qrValue', value: 'https://example.com/a' } },
        },
        {
          type: 'button',
          label: 'Set value B',
          testid: 'c6c4-qrcode-set-b',
          onClick: { action: 'setValue', args: { path: 'qrValue', value: 'https://example.com/b' } },
        },
        {
          type: 'button',
          label: 'Clear value',
          testid: 'c6c4-qrcode-clear',
          onClick: { action: 'setValue', args: { path: 'qrValue', value: '' } },
        },
      ],
    },
  ],
} as unknown as BaseSchema;
