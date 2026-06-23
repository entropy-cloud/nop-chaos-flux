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
      onClick: onClick as never,
      onClose: onClose as never,
    },
  });
  const view = render(<NoticeBarRenderer {...props} />);
  return { view, onClick, onClose, props };
}

describe('NoticeBarRenderer', () => {
  it('renders text and defaults to info variant with role=alert', () => {
    const { view } = renderNoticeBar({ text: 'Hello world' });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.getAttribute('data-variant')).toBe('info');
    expect(view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent).toContain(
      'Hello world',
    );
  });

  it('applies warning variant styling and data-variant', () => {
    const { view } = renderNoticeBar({ text: 'warn', variant: 'warning' });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    expect(root.getAttribute('data-variant')).toBe('warning');
    expect(root.className).toContain('bg-amber-50');
    expect(root.className).toContain('text-amber-800');
  });

  it('applies success variant styling', () => {
    const { view } = renderNoticeBar({ text: 'ok', variant: 'success' });
    const root = view.container.querySelector('[data-slot="notice-bar"]');
    expect(root?.className).toContain('bg-emerald-50');
  });

  it('applies error variant styling', () => {
    const { view } = renderNoticeBar({ text: 'err', variant: 'error' });
    const root = view.container.querySelector('[data-slot="notice-bar"]');
    expect(root?.className).toContain('bg-red-50');
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
    const { view, onClick } = renderNoticeBar({ text: 'clickable' });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    fireEvent.click(root);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not propagate click on close button to bar onClick', () => {
    const { view, onClick, onClose } = renderNoticeBar({
      text: 'both',
      closable: true,
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
