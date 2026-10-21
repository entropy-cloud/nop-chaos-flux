import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImageViewerSchema } from './schemas.js';
import { ImageViewerRenderer } from './image-viewer.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const IMAGES = ['a.png', 'b.png', 'c.png'];

function renderViewer(
  options: {
    images?: string[];
    open?: boolean;
    initialIndex?: number;
    disabled?: boolean;
    strictMode?: boolean;
  } = {},
) {
  const onClose = vi.fn();
  const onChange = vi.fn();
  const props = createMockRendererProps<ImageViewerSchema>({
    schema: { type: 'image-viewer' },
    props: {
      images: options.images ?? IMAGES,
      open: options.open ?? true,
      initialIndex: options.initialIndex,
      disabled: options.disabled,
    },
    events: { onClose: onClose as never, onChange: onChange as never },
  });
  const tree = options.strictMode ? (
    <React.StrictMode>
      <ImageViewerRenderer {...props} />
    </React.StrictMode>
  ) : (
    <ImageViewerRenderer {...props} />
  );
  const view = render(tree);
  const viewer = () => view.container.querySelector('[data-slot="image-viewer"]') as HTMLElement;
  const image = () => view.container.querySelector('[data-slot="image-viewer-image"]') as HTMLElement;
  return { view, onClose, onChange, viewer, image };
}

function dragUp(viewer: HTMLElement, fromY: number, dy: number) {
  fireEvent.touchStart(viewer, {
    touches: [{ clientX: 200, clientY: fromY }],
    changedTouches: [{ clientX: 200, clientY: fromY }],
  } as never);
  fireEvent.touchMove(viewer, {
    touches: [{ clientX: 200, clientY: fromY + dy }],
    changedTouches: [{ clientX: 200, clientY: fromY + dy }],
  } as never);
  fireEvent.touchEnd(viewer, {
    touches: [],
    changedTouches: [{ clientX: 200, clientY: fromY + dy }],
  } as never);
}

describe('ImageViewerRenderer (plan 667 Phase 1)', () => {
  it('renders open with images and reports the controlled page', () => {
    const { viewer, onChange } = renderViewer({ initialIndex: 1 });
    expect(viewer).not.toBeNull();
    expect(viewer().getAttribute('data-index')).toBe('1');
    expect(viewer().getAttribute('data-scale')).toBe('1');
    // opening at the requested index does not re-dispatch change
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders nothing when closed or images empty', () => {
    const { view: closed } = renderViewer({ open: false });
    expect(closed.container.querySelector('[data-slot="image-viewer"]')).toBeNull();
    const { view: empty } = renderViewer({ images: [] });
    expect(empty.container.querySelector('[data-slot="image-viewer"]')).toBeNull();
  });

  it('double-tap toggles data-scale between 1 and 2', () => {
    const { viewer, image } = renderViewer();
    const img = image();
    fireEvent.touchStart(img, { touches: [{ clientX: 200, clientY: 300 }] } as never);
    fireEvent.touchEnd(img, {
      touches: [],
      changedTouches: [{ clientX: 200, clientY: 300 }],
    } as never);
    fireEvent.touchStart(img, { touches: [{ clientX: 200, clientY: 300 }] } as never);
    fireEvent.touchEnd(img, {
      touches: [],
      changedTouches: [{ clientX: 200, clientY: 300 }],
    } as never);
    expect(viewer().getAttribute('data-scale')).toBe('2');
    expect(img.style.transform).toContain('scale(2)');

    // double-tap again → back to scale 1
    fireEvent.touchStart(img, { touches: [{ clientX: 200, clientY: 300 }] } as never);
    fireEvent.touchEnd(img, {
      touches: [],
      changedTouches: [{ clientX: 200, clientY: 300 }],
    } as never);
    fireEvent.touchStart(img, { touches: [{ clientX: 200, clientY: 300 }] } as never);
    fireEvent.touchEnd(img, {
      touches: [],
      changedTouches: [{ clientX: 200, clientY: 300 }],
    } as never);
    expect(viewer().getAttribute('data-scale')).toBe('1');
  });

  it('freezes paging while zoomed: horizontal swipe pans instead of changing page', () => {
    const { view, viewer, onChange } = renderViewer({ initialIndex: 1 });
    const img = view.container.querySelector('[data-slot="image-viewer-image"]') as HTMLElement;
    // zoom in via double-tap
    for (let i = 0; i < 2; i += 1) {
      fireEvent.touchStart(img, { touches: [{ clientX: 200, clientY: 300 }] } as never);
      fireEvent.touchEnd(img, {
        touches: [],
        changedTouches: [{ clientX: 200, clientY: 300 }],
      } as never);
    }
    expect(viewer().getAttribute('data-scale')).toBe('2');
    onChange.mockClear();

    // horizontal swipe while zoomed → no page change
    fireEvent.touchStart(viewer(), { touches: [{ clientX: 300, clientY: 300 }] } as never);
    fireEvent.touchMove(viewer(), { touches: [{ clientX: 180, clientY: 300 }] } as never);
    fireEvent.touchEnd(viewer(), { touches: [], changedTouches: [{ clientX: 180, clientY: 300 }] } as never);
    expect(viewer().getAttribute('data-index')).toBe('1');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('swipe down past threshold on an unzoomed page closes the viewer', async () => {
    const { view, onClose } = renderViewer({ initialIndex: 1 });
    dragUp(view.container.querySelector('[data-slot="image-viewer"]') as HTMLElement, 200, 150);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const payload = onClose.mock.calls[0][0] as { type: string; index: number };
    expect(payload.type).toBe('close');
    expect(payload.index).toBe(1);
  });

  it('paging dispatches change with the new index', async () => {
    const { view, onChange } = renderViewer({ initialIndex: 1 });
    const viewer = view.container.querySelector('[data-slot="image-viewer"]') as HTMLElement;
    fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 300 }] } as never);
    fireEvent.touchMove(viewer, { touches: [{ clientX: 220, clientY: 300 }] } as never);
    fireEvent.touchEnd(viewer, { touches: [], changedTouches: [{ clientX: 220, clientY: 300 }] } as never);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const payload = onChange.mock.calls[0][0] as { type: string; index: number };
    expect(payload).toEqual({ type: 'change', index: 2 });
  });

  it('clamps out-of-range initialIndex to the last page', () => {
    const { view } = renderViewer({ initialIndex: 99 });
    expect(view.container.querySelector('[data-slot="image-viewer"]')?.getAttribute('data-index')).toBe('2');
  });

  it('does not respond when disabled', () => {
    const { view, onClose } = renderViewer({ disabled: true });
    dragUp(view.container.querySelector('[data-slot="image-viewer"]') as HTMLElement, 200, 150);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dispatches exactly once under React StrictMode', async () => {
    const { onClose } = renderViewer({ initialIndex: 1, strictMode: true });
    const viewer = document.querySelector('[data-slot="image-viewer"]') as HTMLElement;
    dragUp(viewer, 200, 150);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
