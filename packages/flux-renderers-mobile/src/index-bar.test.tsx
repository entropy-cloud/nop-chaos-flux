import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IndexBarSchema } from './schemas.js';
import { IndexBarRenderer } from './index-bar.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const KEYS = ['A', 'B', 'C'].map((label, i) => ({ label, value: label, key: i }));

// happy-dom's elementFromPoint always returns null (no layout); stub it to
// resolve the key element lazily at invocation time (after render).
function stubElementFromPoint(index: number | null) {
  return vi.spyOn(document, 'elementFromPoint').mockImplementation(() => {
    if (index == null) return null;
    return (document.querySelector(`[data-index-key="${index}"]`) as HTMLElement | null) ?? null;
  });
}

function renderBar(
  options: {
    items?: IndexBarSchema['items'];
    disabled?: boolean;
    targetSelector?: string;
    listContent?: React.ReactNode;
  } = {},
) {
  const onChange = vi.fn();
  const props = createMockRendererProps<IndexBarSchema>({
    schema: { type: 'index-bar' },
    props: {
      items: options.items ?? KEYS,
      disabled: options.disabled,
      targetSelector: options.targetSelector,
    },
    regions: options.listContent ? { body: { render: () => options.listContent } } as never : {},
    events: { onChange: onChange as never },
  });
  const view = render(<IndexBarRenderer {...props} />);
  return { view, onChange };
}

function barOf(view: ReturnType<typeof render>) {
  return view.container.querySelector('[data-slot="index-bar"]') as HTMLElement;
}

function touchLocate(bar: HTMLElement, x: number, y: number) {
  fireEvent.touchStart(bar, { touches: [{ clientX: x, clientY: y }] } as never);
  fireEvent.touchMove(bar, { touches: [{ clientX: x, clientY: y }] } as never);
}

describe('IndexBarRenderer (plan 668 Phase 1)', () => {
  it('locates the key under the touch point and dispatches select payload', () => {
    const spy = stubElementFromPoint(1);
    const { view, onChange } = renderBar();
    touchLocate(barOf(view), 380, 200);
    expect(spy).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
    const payload = onChange.mock.calls[0][0] as { type: string; index: number; value: string; label: string };
    expect(payload).toEqual({ type: 'select', index: 1, value: 'B', label: 'B' });
    expect(view.container.querySelector('[data-index-key="1"]')?.getAttribute('data-active')).toBe(
      'true',
    );
  });

  it('renders nothing for empty items', () => {
    const { view } = renderBar({ items: [] });
    expect(view.container.querySelector('[data-slot="index-bar"]')).toBeNull();
  });

  it('does not respond when disabled', () => {
    const spy = stubElementFromPoint(1);
    const { view, onChange } = renderBar({ disabled: true });
    touchLocate(barOf(view), 380, 200);
    expect(spy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('scrolls the target container anchor into view on key change', async () => {
    stubElementFromPoint(2);
    const scrollSpy = vi.fn();
    // anchor list rendered directly into the document (index-bar targets it
    // via targetSelector, not via its own body region)
    const anchorHost = document.createElement('div');
    anchorHost.id = 'm10-target-list';
    for (const i of [0, 1, 2]) {
      const anchor = document.createElement('div');
      anchor.setAttribute('data-index-anchor', String(i));
      anchor.scrollIntoView = scrollSpy;
      anchorHost.appendChild(anchor);
    }
    document.body.appendChild(anchorHost);

    const { view } = renderBar({ targetSelector: '#m10-target-list' });
    touchLocate(barOf(view), 380, 200);
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    anchorHost.remove();
  });
});
