import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EmptyRenderer } from './empty.js';
import { createMockRendererProps } from './test-support.js';
import type { EmptySchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="empty"]') as HTMLElement;
}

describe('EmptyRenderer', () => {
  it('renders title and description (value-or-region)', () => {
    const props = createMockRendererProps<EmptySchema>({
      schema: { type: 'empty' },
      props: { title: 'No items yet', description: 'Add one to get started' },
    });
    const { container } = render(<EmptyRenderer {...props} />);
    const root = rootOf(container);
    expect(root.querySelector('[data-slot="empty-title"]')?.textContent).toBe('No items yet');
    expect(root.querySelector('[data-slot="empty-description"]')?.textContent).toBe(
      'Add one to get started',
    );
    expect(root.className).toContain('nop-empty');
  });

  it('falls back to a default title when none is provided', () => {
    const props = createMockRendererProps<EmptySchema>({ schema: { type: 'empty' } });
    const { container } = render(<EmptyRenderer {...props} />);
    // resolveRendererSlotContent falls back to flux.common.noData
    expect(rootOf(container).querySelector('[data-slot="empty-title"]')?.textContent).toBeTruthy();
  });

  it('renders the actions region as a CTA area', () => {
    const props = createMockRendererProps<EmptySchema>({
      schema: { type: 'empty' },
      props: { title: 'Empty' },
      regions: {
        actions: <button type="button">Create</button>,
      },
    });
    const { container } = render(<EmptyRenderer {...props} />);
    const content = rootOf(container).querySelector('[data-slot="empty-content"]');
    expect(content).toBeTruthy();
    expect(content?.querySelector('button')?.textContent).toBe('Create');
  });

  it('omits the content slot when no actions region is provided', () => {
    const props = createMockRendererProps<EmptySchema>({
      schema: { type: 'empty' },
      props: { title: 'Empty' },
    });
    const { container } = render(<EmptyRenderer {...props} />);
    expect(rootOf(container).querySelector('[data-slot="empty-content"]')).toBeNull();
  });
});
