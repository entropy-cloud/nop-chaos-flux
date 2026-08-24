import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider, createAiSenderDraftStore } from '../../adapters/ai-chat-context.js';
import type { AiChatContextValue } from '../../adapters/ai-chat-context.js';
import { AiSenderView } from '../ai-sender.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

function makeCtx(overrides?: Partial<AiChatContextValue>): AiChatContextValue {
  return {
    engine: {} as AiChatContextValue['engine'],
    messages: [],
    requestState: 'idle',
    isProcessing: false,
    sendMessage: async () => undefined,
    abortRequest: async () => undefined,
    ...overrides,
  };
}

// ============================================================================
// D4 (plan 2026-08-24-2317-1, Decision D-handle): AiSenderView subscribes to
// the per-chat draft channel — an external `apply(text)` merge updates the
// local draft (textarea value); typing goes through `setLocal` write-through
// so an append computes on the typed text (user input preserved).
// ============================================================================

describe('ai-sender — D4 draft channel merge', () => {
  it('an external apply(text) updates the local draft (textarea value)', () => {
    const senderDraft = createAiSenderDraftStore();
    const { container } = render(
      <AiChatProvider value={makeCtx({ senderDraft })}>
        <AiSenderView />
      </AiChatProvider>,
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
    act(() => {
      senderDraft.apply('What is the weather?');
    });
    expect(textarea.value).toBe('What is the weather?');
  });

  it('an external append merges on top of user-typed text (typed text preserved)', () => {
    const senderDraft = createAiSenderDraftStore();
    const { container } = render(
      <AiChatProvider value={makeCtx({ senderDraft })}>
        <AiSenderView />
      </AiChatProvider>,
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'abc' } });
    act(() => {
      senderDraft.apply('voice transcript');
    });
    expect(textarea.value).toBe('abc\nvoice transcript');
  });

  it('submitting clears the store base too (typing write-through keeps get() in sync)', () => {
    const senderDraft = createAiSenderDraftStore();
    const sendMessage = vi.fn(async () => undefined);
    const { container } = render(
      <AiChatProvider value={makeCtx({ senderDraft, sendMessage })}>
        <AiSenderView />
      </AiChatProvider>,
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello' } });
    expect(senderDraft.get()).toBe('hello');
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-sender-submit"]')!);
    });
    expect(sendMessage).toHaveBeenCalledWith('hello');
    expect(textarea.value).toBe('');
    expect(senderDraft.get()).toBe('');
  });
});
