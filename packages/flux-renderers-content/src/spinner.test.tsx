// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SpinnerRenderer } from './spinner.js';
import { createMockRendererProps } from './test-support.js';
import type { SpinnerSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="spinner"]') as HTMLElement;
}

describe('SpinnerRenderer', () => {
  it('does not render when meta.visible is false', () => {
    const props = createMockRendererProps<SpinnerSchema>({
      schema: { type: 'spinner' },
      meta: { visible: false },
    });
    const { container } = render(<SpinnerRenderer {...props} />);
    expect(container.querySelector('[data-slot="spinner"]')).toBeNull();
  });

  it('passes size through to the spinner root and svg', () => {
    const props = createMockRendererProps<SpinnerSchema>({
      schema: { type: 'spinner' },
      props: { size: 'lg' },
    });
    const { container } = render(<SpinnerRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('data-size')).toBe('lg');
    const svg = root.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.className).toContain('size-6');
  });

  it('defaults size to md when size is omitted or invalid', () => {
    const props = createMockRendererProps<SpinnerSchema>({
      schema: { type: 'spinner' },
      props: { size: 'enormous' },
    });
    const { container } = render(<SpinnerRenderer {...props} />);
    expect(rootOf(container).getAttribute('data-size')).toBe('md');
  });

  it('renders a label (value-or-region) next to the spinner', () => {
    const props = createMockRendererProps<SpinnerSchema>({
      schema: { type: 'spinner' },
      props: { label: 'Loading data' },
    });
    const { container } = render(<SpinnerRenderer {...props} />);
    expect(rootOf(container).querySelector('[data-slot="spinner-label"]')?.textContent).toBe(
      'Loading data',
    );
  });

  it('omits the label span when no label is provided', () => {
    const props = createMockRendererProps<SpinnerSchema>({ schema: { type: 'spinner' } });
    const { container } = render(<SpinnerRenderer {...props} />);
    expect(rootOf(container).querySelector('[data-slot="spinner-label"]')).toBeNull();
  });
});
