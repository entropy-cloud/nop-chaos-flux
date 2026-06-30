import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SeparatorRenderer } from './separator.js';
import { createMockRendererProps } from './test-support.js';
import type { SeparatorSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="separator"]') as HTMLElement;
}

describe('SeparatorRenderer', () => {
  it('renders a horizontal separator by default and passes orientation to ui Separator', () => {
    const props = createMockRendererProps<SeparatorSchema>({ schema: { type: 'separator' } });
    const { container } = render(<SeparatorRenderer {...props} />);
    const root = rootOf(container);
    expect(root).toBeTruthy();
    expect(root.getAttribute('aria-orientation')).toBe('horizontal');
    expect(root.className).toContain('nop-separator');
  });

  it('passes orientation vertical through to ui Separator', () => {
    const props = createMockRendererProps<SeparatorSchema>({
      schema: { type: 'separator' },
      props: { orientation: 'vertical' },
    });
    const { container } = render(<SeparatorRenderer {...props} />);
    expect(rootOf(container).getAttribute('aria-orientation')).toBe('vertical');
  });

  it('maps decorative to aria-hidden + role=none (purely visual divider)', () => {
    const props = createMockRendererProps<SeparatorSchema>({
      schema: { type: 'separator' },
      props: { decorative: true },
    });
    const { container } = render(<SeparatorRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('role')).toBe('none');
  });

  it('renders a label (value-or-region) flanked by separators, forcing horizontal layout', () => {
    const props = createMockRendererProps<SeparatorSchema>({
      schema: { type: 'separator' },
      props: { label: 'Section', orientation: 'vertical' },
    });
    const { container } = render(<SeparatorRenderer {...props} />);
    const root = rootOf(container);
    // label forces horizontal layout even when schema asked for vertical
    expect(root.getAttribute('data-orientation')).toBe('horizontal');
    expect(root.querySelector('[data-slot="separator-label"]')?.textContent).toBe('Section');
  });

  it('forwards meta.testid to the root', () => {
    const props = createMockRendererProps<SeparatorSchema>({
      schema: { type: 'separator' },
      meta: { testid: 'my-sep' },
    });
    const { container } = render(<SeparatorRenderer {...props} />);
    expect(rootOf(container).getAttribute('data-testid')).toBe('my-sep');
  });
});
