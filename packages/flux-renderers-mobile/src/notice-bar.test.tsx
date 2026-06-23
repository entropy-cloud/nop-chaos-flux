// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoticeBarSchema } from './schemas.js';
import { NoticeBarRenderer } from './notice-bar.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderNoticeBar(
  options: {
    text?: string | string[];
    variant?: 'info' | 'warning' | 'success' | 'error';
    scrollable?: boolean;
    speed?: number;
    direction?: 'left' | 'right';
    loop?: boolean;
    closable?: boolean;
    icon?: string;
    onClick?: (event?: unknown) => void;
    onClose?: (event?: unknown) => void;
  } = {},
) {
  const onClick = vi.fn(options.onClick ?? (() => undefined));
  const onClose = vi.fn(options.onClose ?? (() => undefined));
  const props = createMockRendererProps<NoticeBarSchema>({
    schema: { type: 'notice-bar' },
    props: {
      text: options.text,
      variant: options.variant,
      scrollable: options.scrollable,
      speed: options.speed,
      direction: options.direction,
      loop: options.loop,
      closable: options.closable,
      icon: options.icon,
    },
    events: {
      // Only bind onClick when the caller provided one, so the renderer's
      // hasClick check (and thus role=status vs role=button) reflects intent.
      ...(options.onClick ? { onClick: onClick as never } : {}),
      onClose: onClose as never,
    },
  });
  const view = render(<NoticeBarRenderer {...props} />);
  return { view, onClick, onClose, props };
}

describe('NoticeBarRenderer', () => {
  it('renders text and defaults to info variant with role=status (OA-04)', () => {
    const { view } = renderNoticeBar({ text: 'Hello world' });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    // No onClick -> advisory status region, not focusable, not an alert.
    expect(root.getAttribute('role')).toBe('status');
    expect(root.hasAttribute('tabindex')).toBe(false);
    expect(root.getAttribute('data-variant')).toBe('info');
    expect(view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent).toContain(
      'Hello world',
    );
  });

  it('exposes role=button and tabindex when onClick is bound (OA-04)', () => {
    const { view } = renderNoticeBar({ text: 'clickable', onClick: () => undefined });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    expect(root.getAttribute('role')).toBe('button');
    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('publishes the variant via the data-variant protocol (MA-06/MA-21)', () => {
    const variants: Array<{ variant: 'info' | 'warning' | 'success' | 'error' }> = [
      { variant: 'info' },
      { variant: 'warning' },
      { variant: 'success' },
      { variant: 'error' },
    ];
    for (const { variant } of variants) {
      cleanup();
      const { view } = renderNoticeBar({ text: 'v', variant });
      const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
      expect(root.getAttribute('data-variant')).toBe(variant);
    }
  });

  it('does not render when text is empty', () => {
    const { view } = renderNoticeBar({ text: '' });
    expect(view.container.querySelector('[data-slot="notice-bar"]')).toBeNull();
  });

  it('does not render when text missing', () => {
    const { view } = renderNoticeBar({});
    expect(view.container.querySelector('[data-slot="notice-bar"]')).toBeNull();
  });

  it('marks data-scrollable=false when scrollable is false', () => {
    const { view } = renderNoticeBar({ text: 'short text', scrollable: false });
    expect(view.container.querySelector('[data-scrollable]')?.getAttribute('data-scrollable')).toBe(
      'false',
    );
  });

  it('marks data-scrollable=false when scrollable=true but text fits container', () => {
    // happy-dom doesn't measure layout precisely; force scrollWidth < clientWidth via no overflow.
    // By default, short text won't overflow so scrollable stays false.
    const { view } = renderNoticeBar({ text: 'short', scrollable: true });
    const root = view.container.querySelector('[data-slot="notice-bar"]');
    // Without layout, scrollWidth === clientWidth === 0 in happy-dom, so no overflow -> false.
    expect(root?.getAttribute('data-scrollable')).toBe('false');
  });

  it('marks data-scrollable=true and applies the marquee animation when text overflows (MA-20)', () => {
    // happy-dom returns 0 for scrollWidth/clientWidth, so the overflow branch
    // (scrollWidth > clientWidth) is unreachable without measurement. Spy on
    // the prototype getters to simulate overflow and cover the marquee
    // true-branch that the false-branch-only test missed.
    const scrollWidthSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.getAttribute('data-slot') === 'notice-bar-text' ? 500 : 0;
      });
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.getAttribute('data-slot') === 'notice-bar-content' ? 120 : 0;
      });

    try {
      const { view } = renderNoticeBar({ text: 'long overflowing notice text', scrollable: true });
      const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
      expect(root.getAttribute('data-scrollable')).toBe('true');
      const textEl = view.container.querySelector(
        '[data-slot="notice-bar-text"]',
      ) as HTMLElement;
      expect(textEl.style.animationName).toBe('nop-notice-bar-marquee');
      expect(textEl.style.animationDuration).toMatch(/s$/);
    } finally {
      scrollWidthSpy.mockRestore();
      clientWidthSpy.mockRestore();
    }
  });

  it('renders close button when closable and triggers onClose', () => {
    const { view, onClose } = renderNoticeBar({ text: 'closable', closable: true });
    const closeBtn = view.container.querySelector(
      '[data-slot="notice-bar-close"]',
    ) as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    // After close, the bar should be hidden (returns null)
    expect(view.container.querySelector('[data-slot="notice-bar"]')).toBeNull();
  });

  it('does not render close button when closable is false', () => {
    const { view } = renderNoticeBar({ text: 'no close', closable: false });
    expect(view.container.querySelector('[data-slot="notice-bar-close"]')).toBeNull();
  });

  it('fires onClick when bar is clicked', () => {
    const { view, onClick } = renderNoticeBar({ text: 'clickable', onClick: () => undefined });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    fireEvent.click(root);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not propagate click on close button to bar onClick', () => {
    const { view, onClick, onClose } = renderNoticeBar({
      text: 'both',
      closable: true,
      onClick: () => undefined,
    });
    const closeBtn = view.container.querySelector(
      '[data-slot="notice-bar-close"]',
    ) as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders array text (only first item initially)', () => {
    const { view } = renderNoticeBar({ text: ['first', 'second'], scrollable: false });
    expect(view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent).toContain(
      'first',
    );
  });

  it('advances to the next text on each animation iteration (loop carousel, OA-01)', () => {
    const { view } = renderNoticeBar({ text: ['first', 'second', 'third'], scrollable: true });
    const textEl = view.container.querySelector(
      '[data-slot="notice-bar-text"]',
    ) as HTMLElement;
    expect(textEl.textContent).toContain('first');
    fireEvent.animationIteration(textEl);
    expect(view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent).toContain(
      'second',
    );
    fireEvent.animationIteration(textEl);
    expect(view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent).toContain(
      'third',
    );
    // wraps around
    fireEvent.animationIteration(textEl);
    expect(view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent).toContain(
      'first',
    );
  });

  it('does not carousel-advance when loop is false (OA-01)', () => {
    const { view } = renderNoticeBar({ text: ['first', 'second'], scrollable: true, loop: false });
    const textEl = view.container.querySelector(
      '[data-slot="notice-bar-text"]',
    ) as HTMLElement;
    fireEvent.animationIteration(textEl);
    expect(view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent).toContain(
      'first',
    );
  });

  it('renders custom icon when icon provided', () => {
    const { view } = renderNoticeBar({ text: 'with icon', icon: 'megaphone' });
    const iconSlot = view.container.querySelector('[data-slot="notice-bar-icon"]');
    expect(iconSlot).toBeTruthy();
    expect(iconSlot?.querySelector('svg') || iconSlot?.firstElementChild).toBeTruthy();
  });

  it('forwards the native click event to onClick (MA-04)', () => {
    let capturedType = '';
    let capturedCurrentTarget: Element | null = null;
    const { view } = renderNoticeBar({
      text: 'clickable',
      onClick: (event: unknown) => {
        const e = event as { type?: string; currentTarget?: Element | null } | undefined;
        capturedType = e?.type ?? '';
        capturedCurrentTarget = e?.currentTarget ?? null;
      },
    });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    fireEvent.click(root);
    expect(capturedType).toBe('click');
    expect(capturedCurrentTarget).toBe(root);
  });

  it('forwards the native click event to onClose on close button (MA-04)', () => {
    let capturedType = '';
    let capturedCurrentTarget: Element | null = null;
    const { view } = renderNoticeBar({
      text: 'closable',
      closable: true,
      onClose: (event: unknown) => {
        const e = event as { type?: string; currentTarget?: Element | null } | undefined;
        capturedType = e?.type ?? '';
        capturedCurrentTarget = e?.currentTarget ?? null;
      },
    });
    const closeBtn = view.container.querySelector(
      '[data-slot="notice-bar-close"]',
    ) as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(capturedType).toBe('click');
    expect(capturedCurrentTarget).toBe(closeBtn);
  });
});
