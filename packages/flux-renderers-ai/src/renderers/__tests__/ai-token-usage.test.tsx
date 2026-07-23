import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createMockRendererProps } from '../../test-support.js';
import {
  AiTokenUsageRenderer,
  AiTokenUsageView,
  resolveUsage,
} from '../ai-token-usage.js';
import type { AiTokenUsageSchema } from '../../schemas.js';
import type { ChatMessage } from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const TokenUsage = AiTokenUsageRenderer as unknown as ComponentType<Record<string, unknown>>;

function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiTokenUsageSchema>>>) {
  return createMockRendererProps<AiTokenUsageSchema>({
    schema: { type: 'ai-token-usage' },
    ...overrides,
  });
}

describe('resolveUsage — priority + normalization', () => {
  it('explicit usage prop wins over metadata.usage', () => {
    const message: ChatMessage = {
      id: 'm',
      role: 'assistant',
      content: '',
      metadata: { usage: { total_tokens: 5 } },
    };
    expect(resolveUsage(message, { total_tokens: 42 })?.total_tokens).toBe(42);
  });

  it('falls back to message.metadata.usage', () => {
    const message: ChatMessage = {
      id: 'm',
      role: 'assistant',
      content: '',
      metadata: { usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } },
    };
    const usage = resolveUsage(message);
    expect(usage?.total_tokens).toBe(14);
    expect(usage?.completion_tokens).toBe(4);
  });

  it('returns null when no usage is present (token-no-usage)', () => {
    const message: ChatMessage = { id: 'm', role: 'assistant', content: '' };
    expect(resolveUsage(message)).toBeNull();
  });
});

describe('ai-token-usage — rendering', () => {
  it('renders total / prompt / completion counts and the ring when contextLimit is set', () => {
    const { container } = render(
      <AiTokenUsageView usage={{ prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }} contextLimit={1000} />,
    );
    expect(container.querySelector('[data-slot="ai-token-usage-ring"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-token-usage-total"]')?.textContent).toBe('150');
    expect(container.querySelector('[data-slot="ai-token-usage-prompt"]')?.textContent).toContain('100');
    expect(container.querySelector('[data-slot="ai-token-usage-completion"]')?.textContent).toContain('50');
  });

  it('renders the cost when present and showCost is true', () => {
    const { container } = render(
      <AiTokenUsageView usage={{ total_tokens: 10, cost: 0.02 }} />,
    );
    expect(container.querySelector('[data-slot="ai-token-usage-cost"]')?.textContent).toBe('$0.0200');
  });

  it('hides the cost when showCost is false', () => {
    const { container } = render(
      <AiTokenUsageView usage={{ total_tokens: 10, cost: 0.02 }} showCost={false} />,
    );
    expect(container.querySelector('[data-slot="ai-token-usage-cost"]')).toBeNull();
  });

  it('omits the ring when contextLimit is absent (text-only)', () => {
    const { container } = render(<AiTokenUsageView usage={{ total_tokens: 7 }} />);
    expect(container.querySelector('[data-slot="ai-token-usage-ring"]')).toBeNull();
    expect(container.querySelector('[data-slot="ai-token-usage-total"]')?.textContent).toBe('7');
  });

  it('token-no-usage: renders the muted placeholder when usage is missing', () => {
    const { container } = render(<AiTokenUsageView />);
    expect(container.querySelector('[data-slot="ai-token-usage"]')?.getAttribute('data-empty')).toBe('');
    expect(container.querySelector('[data-slot="ai-token-usage"]')?.textContent).toContain('not reported');
  });

  it('clamps the ring ratio above 1.0 (used > limit)', () => {
    // No crash; ring still renders with full circumference.
    const { container } = render(
      <AiTokenUsageView usage={{ total_tokens: 5000 }} contextLimit={1000} />,
    );
    expect(container.querySelector('[data-slot="ai-token-usage-ring"]')).not.toBeNull();
  });
});

describe('ai-token-usage — schema-driven renderer', () => {
  it('reads usage from message.metadata.usage via the schema prop', () => {
    const props = makeProps({
      props: {
        type: 'ai-token-usage',
        message: { id: 'm', role: 'assistant', content: '', metadata: { usage: { total_tokens: 33 } } } as never,
        contextLimit: 100,
      },
    });
    const { container } = render(<TokenUsage {...props} />);
    expect(container.querySelector('[data-slot="ai-token-usage-total"]')?.textContent).toBe('33');
  });

  it('fires onClick event', () => {
    const onClick = vi.fn();
    const props = makeProps({
      props: { type: 'ai-token-usage', usage: { total_tokens: 1 } as never },
      events: { onClick },
    });
    const { container } = render(<TokenUsage {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-token-usage"]')!);
    expect(onClick).toHaveBeenCalled();
  });
});
