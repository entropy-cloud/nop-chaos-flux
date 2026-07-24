import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { ChatMessage } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';
import { ErrorContentRenderer, errorMatcher } from '../renderers/error.js';
import { LoadingContentRenderer } from '../renderers/loading.js';
import { TextContentRenderer } from '../renderers/text.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-1',
    role: 'assistant',
    content: '',
    createdAt: 0,
    metadata: {},
    ...overrides,
  } as ChatMessage;
}

function makeProps(overrides: Partial<BubbleContentRendererProps> = {}): BubbleContentRendererProps {
  return {
    message: makeMessage(),
    content: '',
    contentIndex: 0,
    ...overrides,
  };
}

describe('TextContentRenderer', () => {
  it('renders string content with whitespace preserved', () => {
    const { container } = render(<TextContentRenderer {...makeProps({ content: 'hello  world' })} />);
    const el = container.querySelector('[data-slot="ai-bubble-text"]');
    expect(el).not.toBeNull();
    expect(el!.textContent).toBe('hello  world');
  });

  it('renders empty string for non-string content', () => {
    const { container } = render(<TextContentRenderer {...makeProps({ content: 42 })} />);
    const el = container.querySelector('[data-slot="ai-bubble-text"]');
    expect(el!.textContent).toBe('');
  });
});

describe('LoadingContentRenderer', () => {
  it('renders a loading placeholder with data-slot', () => {
    const { container } = render(<LoadingContentRenderer {...makeProps()} />);
    const el = container.querySelector('[data-slot="ai-bubble-loading"]');
    expect(el).not.toBeNull();
  });
});

describe('ErrorContentRenderer', () => {
  it('errorMatcher returns true for messages flagged with metadata.isError', () => {
    expect(errorMatcher(makeMessage({ metadata: { isError: true } }))).toBe(true);
    expect(errorMatcher(makeMessage({ metadata: {} }))).toBe(false);
  });

  it('renders error state with role="alert"', () => {
    const { container } = render(<ErrorContentRenderer {...makeProps({ message: makeMessage({ metadata: { isError: true } }) })} />);
    const el = container.querySelector('[data-slot="ai-bubble-error"]');
    expect(el).not.toBeNull();
    expect(el!.getAttribute('role')).toBe('alert');
  });

  it('does not render retry button when there is no preceding user message (no context)', () => {
    const { container } = render(<ErrorContentRenderer {...makeProps({ message: makeMessage({ metadata: { isError: true } }) })} />);
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]');
    expect(retry).toBeNull();
  });
});
