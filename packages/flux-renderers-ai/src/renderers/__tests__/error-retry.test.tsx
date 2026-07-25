import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ErrorContentRenderer } from '../ai-bubble/renderers/error.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import type { ChatMessage } from '../../engine/types.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

// ============================================================================
// multi-audit P2-2: the error-state renderer's retry button must wrap its
// `sendMessage` call in `void` so the returned promise is not a floating
// promise (consistent with ai-sender.tsx / ai-attachments.tsx event-dispatch
// convention). Verified both at the source level (the `void` prefix is
// present) and behaviorally (retry invokes sendMessage with the last user
// text, and the click handler is synchronous / non-throwing).
// ============================================================================

describe('ai-bubble ErrorContentRenderer — retry path (P2-2)', () => {
  function harness(opts: { messages: ChatMessage[]; sendMessage: () => Promise<void> }) {
    const ctxValue = {
      engine: {} as never,
      messages: opts.messages,
      requestState: 'error' as const,
      isProcessing: false,
      sendMessage: opts.sendMessage,
      abortRequest: async () => undefined,
    };
    // The error renderer reads its own message (the last one) and scans the
    // preceding user messages for retry text.
    const errorMessage = opts.messages[opts.messages.length - 1];
    return render(
      <AiChatProvider value={ctxValue}>
        <ErrorContentRenderer message={errorMessage} content={''} contentIndex={0} />
      </AiChatProvider>,
    );
  }

  it('source: retry onClick wraps sendMessage in `void` (no floating promise)', () => {
    const src = readFileSync(
      join(__dirname, '..', 'ai-bubble', 'renderers', 'error.tsx'),
      'utf8',
    );
    // The call site must be prefixed with `void` — not a bare promise.
    expect(src).toMatch(/void\s+ctx\?\.\s*sendMessage\(\s*lastUserText\s*\)/);
    // And there must be NO bare (non-void) sendMessage(lastUserText) call left.
    expect(src).not.toMatch(/[^d\s]ctx\?\.\s*sendMessage\(\s*lastUserText\s*\)/);
  });

  it('retry button is present when a preceding user message has text', () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: 'hello' },
      { id: 'a1', role: 'assistant', content: '', metadata: { isError: true } },
    ];
    const { container } = harness({ messages, sendMessage: async () => undefined });
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]');
    expect(retry).not.toBeNull();
  });

  it('clicking retry calls sendMessage with the last user text', () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: 'please retry me' },
      { id: 'a1', role: 'assistant', content: '', metadata: { isError: true } },
    ];
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const { container } = harness({ messages, sendMessage });
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]') as HTMLButtonElement;
    retry.click();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('please retry me');
  });

  it('retry click handler is synchronous and does not throw (void-wrapped, no await in handler)', () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: 'x' },
      { id: 'a1', role: 'assistant', content: '', metadata: { isError: true } },
    ];
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const { container } = harness({ messages, sendMessage });
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]') as HTMLButtonElement;
    expect(() => retry.click()).not.toThrow();
  });

  it('retry button stays hidden when there is no preceding user text', () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: '   ' },
      { id: 'a1', role: 'assistant', content: '', metadata: { isError: true } },
    ];
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const { container } = harness({ messages, sendMessage });
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]');
    expect(retry).toBeNull();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
