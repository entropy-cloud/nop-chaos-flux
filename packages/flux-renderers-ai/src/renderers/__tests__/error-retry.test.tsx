import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ErrorContentRenderer } from '../ai-bubble/renderers/error.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import type { ChatMessage, MessageEngine } from '../../engine/types.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

// ============================================================================
// multi-audit P2-2 + V12b G5-R4-视角10-01 (plan 485 Phase 2, proof-first):
// the error-state renderer's retry button must re-send the failed turn via
// the engine's `regenerate()` (truncate back to the last user message and
// re-run) so the user message is NOT appended a second time. The previous
// implementation called `sendMessage(lastUserText)`, duplicating the user
// message in the transcript.
// ============================================================================

function makeEngine(overrides: Partial<MessageEngine> = {}): MessageEngine {
  return {
    regenerate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MessageEngine;
}

describe('ai-bubble ErrorContentRenderer — retry path (P2-2 / G5-R4-视角10-01)', () => {
  function harness(opts: {
    messages: ChatMessage[];
    engine?: MessageEngine;
    sendMessage?: () => Promise<void>;
  }) {
    const ctxValue = {
      engine: opts.engine ?? ({} as never),
      messages: opts.messages,
      requestState: 'error' as const,
      isProcessing: false,
      sendMessage: opts.sendMessage ?? vi.fn().mockResolvedValue(undefined),
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

  const failureMessages: ChatMessage[] = [
    { id: 'u1', role: 'user', content: 'please retry me' },
    { id: 'a1', role: 'assistant', content: '', metadata: { isError: true } },
  ];

  it('source: retry onClick wraps the engine regenerate call in `void` (no floating promise)', () => {
    const src = readFileSync(
      join(__dirname, '..', 'ai-bubble', 'renderers', 'error.tsx'),
      'utf8',
    );
    // The retry path must go through engine.regenerate (dedup resend).
    expect(src).toMatch(/void\s+ctx\?\.(engine\.)?regenerate\(\)/);
    // And there must be NO leftover sendMessage(lastUserText) duplicate append.
    expect(src).not.toMatch(/sendMessage\(lastUserText\)/);
  });

  it('retry button is present when a preceding user message has text', () => {
    const { container } = harness({ messages: failureMessages, engine: makeEngine() });
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]');
    expect(retry).not.toBeNull();
  });

  it('clicking retry re-runs the turn via engine.regenerate (no duplicate user message)', () => {
    const engine = makeEngine();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const { container } = harness({ messages: failureMessages, engine, sendMessage });
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]') as HTMLButtonElement;
    retry.click();
    expect(engine.regenerate).toHaveBeenCalledTimes(1);
    // The defective duplicate-append channel must NOT be used.
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('retry button stays hidden when there is no preceding user text', () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: '   ' },
      { id: 'a1', role: 'assistant', content: '', metadata: { isError: true } },
    ];
    const engine = makeEngine();
    const { container } = harness({ messages, engine });
    const retry = container.querySelector('[data-slot="ai-bubble-error-retry"]');
    expect(retry).toBeNull();
    expect(engine.regenerate).not.toHaveBeenCalled();
  });
});
