import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ImageViewerRenderer } from './image-viewer.js';
import { createMockRendererProps } from './test-support.js';

// P1-MA4.3-004 regression guard: two-finger pinch zoom orchestration. The 9
// pre-existing viewer tests were all single-finger — deleting the pointers
// accumulation logic left them green (audit Round B / B-03). Touch objects
// MUST carry distinct identifiers (shared key would collapse the pointers
// Map to size 1 and never classify as pinch).
beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderViewer(options: { disabled?: boolean; open?: boolean } = {}) {
  const onClose = vi.fn();
  const props = createMockRendererProps({
    schema: { type: 'image-viewer' as const },
    props: {
      images: [
        { src: '/a.png', title: 'A' },
        { src: '/b.png', title: 'B' },
      ],
      open: options.open ?? true,
      disabled: options.disabled,
    },
    events: { onClose: onClose as never },
  });
  const view = render(<ImageViewerRenderer {...props} />);
  const viewer = () => view.container.querySelector('[data-slot="image-viewer"]') as HTMLElement;
  return { view, viewer, onClose };
}

function twoFingerStart(viewer: HTMLElement, ax: number, bx: number, y: number) {
  fireEvent.touchStart(viewer, {
    touches: [
      { identifier: 0, clientX: ax, clientY: y },
      { identifier: 1, clientX: bx, clientY: y },
    ],
  } as never);
}

function twoFingerMove(viewer: HTMLElement, ax: number, bx: number, y: number) {
  fireEvent.touchMove(viewer, {
    touches: [
      { identifier: 0, clientX: ax, clientY: y },
      { identifier: 1, clientX: bx, clientY: y },
    ],
  } as never);
}

function twoFingerEnd(viewer: HTMLElement) {
  fireEvent.touchEnd(viewer, { touches: [], changedTouches: [] } as never);
}

describe('image-viewer two-finger pinch orchestration (P1-MA4.3-004)', () => {
  it('spreading two fingers zooms the viewer (distance 200 -> 400 doubles the scale)', () => {
    const { viewer } = renderViewer();
    expect(viewer().getAttribute('data-scale')).toBe('1');

    twoFingerStart(viewer(), 100, 300, 300);
    // distance 200 -> 400 (50..450)
    twoFingerMove(viewer(), 50, 450, 300);

    expect(Number(viewer().getAttribute('data-scale'))).toBe(2);

    twoFingerEnd(viewer());
  });

  it('zoom is clamped at MAX_SCALE 4 no matter how far the fingers spread', () => {
    const { viewer } = renderViewer();

    twoFingerStart(viewer(), 100, 300, 300);
    // distance 200 -> 1200 would request 6x; clamped to 4
    twoFingerMove(viewer(), -300, 600, 300);

    expect(Number(viewer().getAttribute('data-scale'))).toBe(4);

    twoFingerEnd(viewer());
  });
});
