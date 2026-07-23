import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createMockRendererProps } from '../../test-support.js';
import { AiSuggestionsRenderer, AiSuggestionsView } from '../ai-suggestions.js';
import type { AiSuggestionsSchema } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const Suggestions = AiSuggestionsRenderer as unknown as ComponentType<Record<string, unknown>>;

function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiSuggestionsSchema>>>) {
  return createMockRendererProps<AiSuggestionsSchema>({
    schema: { type: 'ai-suggestions' },
    ...overrides,
  });
}

const ITEMS = [{ text: 'Summarize' }, { text: 'Translate' }, { text: 'Explain' }, { text: 'Refine' }, { text: 'Expand' }];

describe('ai-suggestions — overflow modes', () => {
  it('expand mode renders all items', () => {
    const { container } = render(<AiSuggestionsView items={ITEMS} overflowMode="expand" />);
    expect(container.querySelector('[data-slot="ai-suggestions"]')?.getAttribute('data-overflow')).toBe('expand');
    expect(container.querySelectorAll('[data-slot="ai-suggestions-item"]').length).toBe(5);
    expect(container.querySelector('[data-slot="ai-suggestions-overflow"]')).toBeNull();
  });

  it('scroll mode renders all items (no overflow collapse)', () => {
    const { container } = render(<AiSuggestionsView items={ITEMS} overflowMode="scroll" />);
    expect(container.querySelectorAll('[data-slot="ai-suggestions-item"]').length).toBe(5);
    expect(container.querySelector('[data-slot="ai-suggestions-overflow"]')).toBeNull();
  });

  it('popover mode collapses items beyond maxVisible into a +N Popover', () => {
    const { container } = render(
      <AiSuggestionsView items={ITEMS} overflowMode="popover" maxVisible={3} />,
    );
    // Only maxVisible pills render inline.
    expect(container.querySelectorAll('[data-slot="ai-suggestions-item"]').length).toBe(3);
    const overflow = container.querySelector('[data-slot="ai-suggestions-overflow"]');
    expect(overflow?.textContent).toBe('+2');
  });

  it('popover mode with few items does not render the overflow trigger', () => {
    const { container } = render(
      <AiSuggestionsView items={ITEMS.slice(0, 2)} overflowMode="popover" maxVisible={3} />,
    );
    expect(container.querySelectorAll('[data-slot="ai-suggestions-item"]').length).toBe(2);
    expect(container.querySelector('[data-slot="ai-suggestions-overflow"]')).toBeNull();
  });

  it('clicking a popover overflow item fires onSelect with the correct global index', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <AiSuggestionsView items={ITEMS} overflowMode="popover" maxVisible={3} onSelect={onSelect} />,
    );
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-suggestions-overflow"]')!);
    });
    const overflowItem = document.querySelector(
      '[data-slot="ai-suggestions-overflow-list"] [data-slot="ai-suggestions-item"]:first-child',
    ) as HTMLElement;
    expect(overflowItem).not.toBeNull();
    act(() => {
      fireEvent.click(overflowItem);
    });
    // The first overflow item is global index 3 (after maxVisible=3).
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ text: 'Refine' }), 3);
  });
});

describe('ai-suggestions — onSelect', () => {
  it('clicking an inline pill fires onSelect with item + index', () => {
    const onSelect = vi.fn();
    const { container } = render(<AiSuggestionsView items={ITEMS} onSelect={onSelect} />);
    const pills = container.querySelectorAll('[data-slot="ai-suggestions-item"]');
    fireEvent.click(pills[1]!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ text: 'Translate' }), 1);
  });
});

describe('ai-suggestions — empty state', () => {
  it('renders an empty container with data-empty when items is empty', () => {
    const { container } = render(<AiSuggestionsView items={[]} />);
    expect(container.querySelector('[data-slot="ai-suggestions"]')?.getAttribute('data-empty')).toBe('');
  });
});

describe('ai-suggestions — schema-driven renderer', () => {
  it('renders items passed via the schema prop and fires onSelect event', () => {
    const onSelect = vi.fn();
    const props = makeProps({
      props: { type: 'ai-suggestions', items: ITEMS as never, overflowMode: 'expand' },
      events: { onSelect },
    });
    const { container } = render(<Suggestions {...props} />);
    expect(container.querySelectorAll('[data-slot="ai-suggestions-item"]').length).toBe(5);
    fireEvent.click(container.querySelector('[data-slot="ai-suggestions-item"]')!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ index: 0 }));
  });
});
