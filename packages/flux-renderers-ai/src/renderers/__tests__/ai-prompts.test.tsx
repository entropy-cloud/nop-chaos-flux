import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import type { ComponentType } from 'react';
import { createMockRendererProps } from '../../test-support.js';
import { AiPromptsRenderer } from '../ai-prompts.js';
import type { AiPromptsSchema } from '../../schemas.js';

// Cast registered renderers (which return `RendererRenderOutput = unknown`)
// to a JSX-compatible component type for direct testing.
const Prompts = AiPromptsRenderer as unknown as ComponentType<Record<string, unknown>>;

afterEach(() => {
  cleanup();
});

function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiPromptsSchema>>>) {
  return createMockRendererProps<AiPromptsSchema>({
    schema: { type: 'ai-prompts' },
    ...overrides,
  });
}

const ITEMS = [
  { label: 'Summarize', description: 'Get a quick summary', badge: 'P1', icon: '✏️' },
  { label: 'Translate' },
];

describe('ai-prompts — empty state (C8.3)', () => {
  it('renders an empty container with data-empty when items is empty', () => {
    const props = makeProps({ props: { type: 'ai-prompts' } });
    const { container } = render(<Prompts {...props} />);
    const root = container.querySelector('.nop-ai-prompts');
    expect(root?.getAttribute('data-slot')).toBe('ai-prompts');
    expect(root?.getAttribute('data-empty')).toBe('');
    expect(container.querySelectorAll('[data-slot="ai-prompts-item"]').length).toBe(0);
  });

  it('filters out malformed items (non-object / missing label)', () => {
    const props = makeProps({
      props: { type: 'ai-prompts', items: [null, 'bad', { label: 'OK' }] as never },
    });
    const { container } = render(<Prompts {...props} />);
    const items = container.querySelectorAll('[data-slot="ai-prompts-item"]');
    expect(items.length).toBe(1);
    expect(items[0]?.querySelector('[data-slot="ai-prompts-item-label"]')?.textContent).toBe('OK');
  });
});

describe('ai-prompts — item rendering (C8.3)', () => {
  it('renders label / description / badge / icon slots', () => {
    const props = makeProps({ props: { type: 'ai-prompts', items: ITEMS as never } });
    const { container } = render(<Prompts {...props} />);
    const first = container.querySelector('[data-slot="ai-prompts-item"]')!;
    expect(first.querySelector('[data-slot="ai-prompts-item-label"]')?.textContent).toBe('Summarize');
    expect(first.querySelector('[data-slot="ai-prompts-item-description"]')?.textContent).toBe('Get a quick summary');
    expect(first.querySelector('[data-slot="ai-prompts-item-badge"]')?.textContent).toBe('P1');
    expect(first.querySelector('[aria-hidden="true"]')?.textContent).toBe('✏️');
  });

  it('omits description / badge slots when absent', () => {
    const props = makeProps({ props: { type: 'ai-prompts', items: [{ label: 'Only label' }] as never } });
    const { container } = render(<Prompts {...props} />);
    const first = container.querySelector('[data-slot="ai-prompts-item"]')!;
    expect(first.querySelector('[data-slot="ai-prompts-item-description"]')).toBeNull();
    expect(first.querySelector('[data-slot="ai-prompts-item-badge"]')).toBeNull();
  });

  it('applies size and layout variants', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const props = makeProps({ props: { type: 'ai-prompts', items: [{ label: 'x' }] as never, size, layout: 'horizontal' } });
      const { container } = render(<Prompts {...props} />);
      expect(container.querySelector('.nop-ai-prompts')?.getAttribute('data-layout')).toBe('horizontal');
      const item = container.querySelector('[data-slot="ai-prompts-item"]') as HTMLElement;
      if (size === 'sm') expect(item.className).toContain('text-xs');
      if (size === 'lg') expect(item.className).toContain('text-base');
      cleanup();
    }
  });
});

describe('ai-prompts — onSelect dispatch contract (C8.3 P1-1)', () => {
  it('dispatches payload { type, item, index } with { event, evaluationBindings, scope } ctx', () => {
    const onSelect = vi.fn();
    const props = makeProps({ props: { type: 'ai-prompts', items: ITEMS as never }, events: { onSelect } });
    const { container } = render(<Prompts {...props} />);
    const items = container.querySelectorAll('[data-slot="ai-prompts-item"]');
    fireEvent.click(items[1]!);

    const [payload, ctx] = onSelect.mock.calls[0] as unknown[];
    expect(payload).toMatchObject({
      type: 'ai:prompt-select',
      index: 1,
      item: { label: 'Translate' },
    });
    // C8.3 P1-1: the second arg is the dispatch ctx — the payload keys double as
    // evaluationBindings so action-args templates read `${item}` / `${index}`.
    expect(ctx).toMatchObject({
      event: payload,
      evaluationBindings: expect.objectContaining({ index: 1, item: { label: 'Translate' } }),
    });
  });
});

describe('ai-prompts — DOM contract (C8.3)', () => {
  it('propagates data-cid / data-testid / data-layout onto the root', () => {
    const props = makeProps({
      props: { type: 'ai-prompts', items: [{ label: 'x' }] as never },
      meta: { cid: 42, testid: 'pt-1' } as never,
    });
    const { container } = render(<Prompts {...props} />);
    const root = container.querySelector('.nop-ai-prompts')!;
    expect(root.getAttribute('data-cid')).toBe('42');
    expect(root.getAttribute('data-testid')).toBe('pt-1');
    expect(root.getAttribute('data-layout')).toBe('vertical');
  });
});
