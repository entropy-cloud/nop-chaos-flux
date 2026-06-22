// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SwipeCellSchema } from './schemas.js';
import { SwipeCellRenderer } from './swipe-cell.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function touch(x: number, y: number) {
  return {
    touches: [{ clientX: x, clientY: y } as Touch],
  } as unknown as React.TouchEvent;
}

function renderSwipeCell(
  options: {
    threshold?: number;
    direction?: 'left' | 'right' | 'both';
    disabled?: boolean;
    closeOnOutside?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    body?: React.ReactNode;
    left?: React.ReactNode;
    right?: React.ReactNode;
  } = {},
) {
  const onOpen = vi.fn(options.onOpen ?? (() => undefined));
  const onClose = vi.fn(options.onClose ?? (() => undefined));
  const props = createMockRendererProps<SwipeCellSchema>({
    schema: { type: 'swipe-cell' },
    props: {
      threshold: options.threshold,
      direction: options.direction,
      disabled: options.disabled,
      closeOnOutside: options.closeOnOutside,
    },
    regions: {
      body: options.body ?? <div data-testid="body-content">Body</div>,
      left: options.left ?? (
        <button type="button" data-testid="left-action">
          Archive
        </button>
      ),
      right: options.right ?? (
        <button type="button" data-testid="right-action">
          Delete
        </button>
      ),
    },
    events: {
      onOpen: onOpen as never,
      onClose: onClose as never,
    },
  });
  const view = render(<SwipeCellRenderer {...props} />);
  return { view, onOpen, onClose, props };
}

describe('SwipeCellRenderer', () => {
  it('renders body and both action regions; defaults to closed state', () => {
    const { view } = renderSwipeCell();
    expect(screen.getByTestId('body-content')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="swipe-cell-left"]')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="swipe-cell-right"]')).toBeTruthy();
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('opens left region on rightward swipe past threshold and fires onOpen', async () => {
    const { view, onOpen } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens right region on leftward swipe past threshold', async () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(120, 50));
    fireEvent.touchMove(root, touch(40, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-right',
      ),
    );
  });

  it('does not open when swipe distance is below threshold', () => {
    const { view } = renderSwipeCell({ threshold: 50 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(70, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('direction:"left" allows leftward swipe but ignores rightward swipe', () => {
    const { view } = renderSwipeCell({ threshold: 30, direction: 'left' });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    // Rightward swipe should NOT open (direction 'left' means left-swipe exposes right region)
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );

    // Leftward swipe should open
    fireEvent.touchStart(root, touch(120, 50));
    fireEvent.touchMove(root, touch(40, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-right',
    );
  });

  it('direction:"right" allows rightward swipe but ignores leftward swipe', () => {
    const { view } = renderSwipeCell({ threshold: 30, direction: 'right' });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(120, 50));
    fireEvent.touchMove(root, touch(40, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );

    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-left',
    );
  });

  it('closeOnOutside:true closes open cell when pointer down outside', async () => {
    const { view, onClose } = renderSwipeCell({ threshold: 30, closeOnOutside: true });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'closed',
      ),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('closeOnOutside:false does not auto-close on outside pointer', async () => {
    const { view, onClose } = renderSwipeCell({ threshold: 30, closeOnOutside: false });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-left',
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not respond to touch when disabled', () => {
    const { view } = renderSwipeCell({ threshold: 30, disabled: true });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(150, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('renders body only when left and right regions are absent', () => {
    const props = createMockRendererProps<SwipeCellSchema>({
      schema: { type: 'swipe-cell' },
      props: {},
      regions: { body: <div data-testid="body-only">BodyOnly</div> },
    });
    const view = render(<SwipeCellRenderer {...props} />);
    expect(screen.getByTestId('body-only')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="swipe-cell-left"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="swipe-cell-right"]')).toBeNull();
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('horizontal swipe beats tiny vertical drift (no open on vertical)', () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(55, 90));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });
});
