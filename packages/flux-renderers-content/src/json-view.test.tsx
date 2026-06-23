// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonViewRenderer } from './json-view.js';
import { createMockRendererProps } from './test-support.js';
import type { JsonViewSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="json-view"]') as HTMLElement;
}

describe('JsonViewRenderer', () => {
  it('renders the empty state when value is null', () => {
    const props = createMockRendererProps<JsonViewSchema>({
      schema: { type: 'json-view' },
      props: { value: null, empty: 'No data' },
    });
    const { container } = render(<JsonViewRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('data-state')).toBe('empty');
    expect(root.textContent).toBe('No data');
  });

  it('renders the empty state when value is undefined', () => {
    const props = createMockRendererProps<JsonViewSchema>({
      schema: { type: 'json-view' },
      props: { empty: 'nada' },
    });
    const { container } = render(<JsonViewRenderer {...props} />);
    expect(rootOf(container).getAttribute('data-state')).toBe('empty');
  });

  it('renders the JsonViewer tree for an object value', () => {
    const props = createMockRendererProps<JsonViewSchema>({
      schema: { type: 'json-view' },
      props: { value: { id: 1, name: 'Alice', roles: ['admin'] } },
    });
    const { container } = render(<JsonViewRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('data-state')).toBeNull();
    expect(root.querySelector('.json-viewer')).toBeTruthy();
    expect(root.textContent).toContain('Alice');
    expect(root.textContent).toContain('id');
  });

  it('expands the full tree by default and collapses when collapsed is true', () => {
    const expandedProps = createMockRendererProps<JsonViewSchema>({
      schema: { type: 'json-view' },
      props: { value: { a: { b: { c: 1 } } } },
    });
    const { container, unmount } = render(<JsonViewRenderer {...expandedProps} />);
    // fully expanded → deep key visible
    expect(rootOf(container).textContent).toContain('c');

    unmount();
    const collapsedProps = createMockRendererProps<JsonViewSchema>({
      schema: { type: 'json-view' },
      props: { value: { a: { b: { c: 1 } } }, collapsed: true },
    });
    const { container: c2 } = render(<JsonViewRenderer {...collapsedProps} />);
    // collapsed=true → nested keys collapsed away
    expect(c2.querySelector('[data-slot="json-view"]')?.textContent).not.toContain('c');
  });

  it('renders a Copy button when showCopy is true', () => {
    const props = createMockRendererProps<JsonViewSchema>({
      schema: { type: 'json-view' },
      props: { value: { x: 1 }, showCopy: true },
    });
    const { container } = render(<JsonViewRenderer {...props} />);
    const btn = container.querySelector(
      '[data-slot="json-view-toolbar"] button',
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Copy');
  });

  it('copies the JSON payload to the clipboard on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => ({ writeText }),
    });

    const props = createMockRendererProps<JsonViewSchema>({
      schema: { type: 'json-view' },
      props: { value: { x: 1 }, showCopy: true },
    });
    const { container } = render(<JsonViewRenderer {...props} />);
    const btn = container.querySelector(
      '[data-slot="json-view-toolbar"] button',
    ) as HTMLButtonElement;
    fireEvent.click(btn);
    // flush microtasks
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('"x": 1');
  });
});
