import { render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { useLockScroll } from './use-lock-scroll.js';

function fireTouch(
  target: EventTarget,
  type: 'touchstart' | 'touchmove',
  x: number,
  y: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { touches: [{ clientX: x, clientY: y }] });
  target.dispatchEvent(event);
}

function defineScrollable(el: HTMLElement, opts: { v: boolean; h: boolean }) {
  // happy-dom has no layout engine: pin the geometry via defineProperty and
  // the overflow axes via inline style (getComputedStyle reads the cascade).
  Object.defineProperty(el, 'scrollHeight', { value: opts.v ? 2000 : 100, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { value: opts.h ? 2000 : 100, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
  el.style.overflowY = opts.v ? 'scroll' : 'hidden';
  el.style.overflowX = opts.h ? 'scroll' : 'hidden';
}

function restoreLayout(el: HTMLElement) {
  for (const key of ['scrollHeight', 'clientHeight', 'scrollWidth', 'clientWidth', 'overflowY', 'overflowX']) {
    delete (el as unknown as Record<string, unknown>)[key];
  }
}

afterEach(() => {
  document.body.className = '';
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useLockScroll (global mode)', () => {
  it('adds nop-scroll-lock to body when enabled and removes on disable', () => {
    const { rerender } = renderHook((props: { enabled: boolean }) => useLockScroll(props.enabled), {
      initialProps: { enabled: false },
    });
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(false);

    rerender({ enabled: true });
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(true);

    rerender({ enabled: false });
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(false);
  });

  it('keeps the lock while at least one consumer is enabled (reference counted)', () => {
    const first = renderHook((props: { enabled: boolean }) => useLockScroll(props.enabled), {
      initialProps: { enabled: true },
    });
    const second = renderHook((props: { enabled: boolean }) => useLockScroll(props.enabled), {
      initialProps: { enabled: true },
    });
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(true);

    second.rerender({ enabled: false });
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(true);

    first.rerender({ enabled: false });
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(false);
  });

  it('removes the body class when an enabled consumer unmounts', () => {
    const view = render(<div data-testid="host" />);
    const { unmount } = renderHook(() => useLockScroll(true));
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(true);
    unmount();
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(false);
    view.unmount();
  });

  it('prevents default when no scrollable ancestor matches the gesture direction', () => {
    renderHook(() => useLockScroll(true));
    const target = document.createElement('div');
    document.body.appendChild(target);
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(target, 'touchstart', 0, 0);
    fireTouch(target, 'touchmove', 0, 30);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('allows the gesture when a scrollable ancestor can scroll in that direction', () => {
    renderHook(() => useLockScroll(true));
    const scroller = document.createElement('div');
    const inner = document.createElement('div');
    scroller.appendChild(inner);
    document.body.appendChild(scroller);
    defineScrollable(scroller, { v: true, h: false });
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(inner, 'touchstart', 0, 0);
    fireTouch(inner, 'touchmove', 0, 30);

    expect(preventDefault).not.toHaveBeenCalled();
    restoreLayout(scroller);
  });

  it('blocks the perpendicular axis even when a scroller exists (horizontal move, vertical-only scroller)', () => {
    renderHook(() => useLockScroll(true));
    const scroller = document.createElement('div');
    const inner = document.createElement('div');
    scroller.appendChild(inner);
    document.body.appendChild(scroller);
    defineScrollable(scroller, { v: true, h: false });
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(inner, 'touchstart', 0, 0);
    fireTouch(inner, 'touchmove', 30, 2);

    expect(preventDefault).toHaveBeenCalled();
    restoreLayout(scroller);
  });

  it('strict mode prevents default even when a scrollable ancestor exists', () => {
    renderHook(() => useLockScroll(true, { strict: true }));
    const scroller = document.createElement('div');
    const inner = document.createElement('div');
    scroller.appendChild(inner);
    document.body.appendChild(scroller);
    defineScrollable(scroller, { v: true, h: false });
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(inner, 'touchstart', 0, 0);
    fireTouch(inner, 'touchmove', 0, 30);

    expect(preventDefault).toHaveBeenCalled();
    restoreLayout(scroller);
  });

  it('does not react to touchmove when disabled', () => {
    renderHook(() => useLockScroll(false));
    const target = document.createElement('div');
    document.body.appendChild(target);
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(target, 'touchstart', 0, 0);
    fireTouch(target, 'touchmove', 0, 30);

    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('useLockScroll (local mode)', () => {
  function LocalHost(props: { enabled: boolean; strict?: boolean }) {
    const localRef = useRef<HTMLDivElement | null>(null);
    useLockScroll(props.enabled, { strict: props.strict, localRef });
    return (
      <div ref={localRef} data-testid="local">
        <div data-testid="inner" />
      </div>
    );
  }

  it('does not touch the body class but locks events inside the container', () => {
    const { getByTestId } = render(<LocalHost enabled />);
    const inner = getByTestId('inner');
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(false);
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(inner, 'touchstart', 0, 0);
    fireTouch(inner, 'touchmove', 0, 30);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('ignores events originating outside the container', () => {
    render(<LocalHost enabled />);
    const outsider = document.createElement('div');
    document.body.appendChild(outsider);
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(outsider, 'touchstart', 0, 0);
    fireTouch(outsider, 'touchmove', 0, 30);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('local strict mode blocks scrollable-container content too', () => {
    const { getByTestId } = render(<LocalHost enabled strict />);
    const local = getByTestId('local');
    const inner = getByTestId('inner');
    defineScrollable(local, { v: true, h: false });
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(inner, 'touchstart', 0, 0);
    fireTouch(inner, 'touchmove', 0, 30);

    expect(preventDefault).toHaveBeenCalled();
    restoreLayout(local);
  });

  it('local non-strict lets a scrollable container scroll in the gesture direction', () => {
    const { getByTestId } = render(<LocalHost enabled />);
    const local = getByTestId('local');
    const inner = getByTestId('inner');
    defineScrollable(local, { v: true, h: false });
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');

    fireTouch(inner, 'touchstart', 0, 0);
    fireTouch(inner, 'touchmove', 0, 30);

    expect(preventDefault).not.toHaveBeenCalled();
    restoreLayout(local);
  });
});

describe('useLockScroll (SSR)', () => {
  it('is a no-op without document (no throw, no body class, no listeners)', () => {
    // Mount disabled first (rendering itself needs a DOM), then remove the
    // global document so the hook's effect body runs in an SSR-shaped
    // environment when the consumer flips `enabled` on.
    const { rerender } = renderHook((props: { enabled: boolean }) => useLockScroll(props.enabled), {
      initialProps: { enabled: false },
    });
    vi.stubGlobal('document', undefined);
    try {
      expect(() => rerender({ enabled: true })).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    // after the environment is restored the body must be untouched
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(false);
  });
});
