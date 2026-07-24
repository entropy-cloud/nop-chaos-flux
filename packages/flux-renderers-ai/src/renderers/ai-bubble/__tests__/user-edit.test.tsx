import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider } from '../../../adapters/ai-chat-context.js';
import { UserMessageActions } from '../user-edit.js';
import type { ChatMessage, MessageEngine, MessageEngineState } from '../../../engine/types.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'u-1',
    role: 'user',
    content: 'original text',
    metadata: {},
    ...overrides,
  } as ChatMessage;
}

function makeMockEngine(overrides: Partial<MessageEngineState> = {}): MessageEngine {
  const state: MessageEngineState = {
    messages: [makeMessage()],
    requestState: 'idle',
    isProcessing: false,
    ...overrides,
  } as MessageEngineState;
  return {
    getState: () => state,
    subscribe: () => () => {},
    sendMessage: vi.fn(async () => undefined),
    send: vi.fn(async () => undefined),
    abort: vi.fn(async () => undefined),
    clear: vi.fn(),
    setConnector: vi.fn(),
    registerPlugin: () => () => {},
    getMessages: () => state.messages,
    setMessages: vi.fn(),
    regenerate: vi.fn(async () => undefined),
  } as unknown as MessageEngine;
}

function Harness({
  engine,
  isProcessing,
  message,
  children,
}: {
  engine: MessageEngine;
  isProcessing: boolean;
  message: ChatMessage;
  children?: ReactNode;
}) {
  return (
    <AiChatProvider
      value={{
        engine,
        messages: [message],
        requestState: isProcessing ? 'processing' : 'idle',
        isProcessing,
        sendMessage: engine.sendMessage,
        abortRequest: engine.abort,
      }}
    >
      {children ?? <UserMessageActions message={message} />}
    </AiChatProvider>
  );
}

describe('UserMessageActions — P1-1 streaming guard (FP-3)', () => {
  it('pencil toggle is disabled while the engine is processing', () => {
    const engine = makeMockEngine({ isProcessing: true });
    const message = makeMessage();
    const { container } = render(
      <Harness engine={engine} isProcessing={true} message={message} />,
    );
    const toggle = container.querySelector('[data-slot="ai-bubble-edit-toggle"]') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.disabled).toBe(true);
  });

  it('pencil toggle is enabled when the engine is idle', () => {
    const engine = makeMockEngine({ isProcessing: false });
    const message = makeMessage();
    const { container } = render(
      <Harness engine={engine} isProcessing={false} message={message} />,
    );
    const toggle = container.querySelector('[data-slot="ai-bubble-edit-toggle"]') as HTMLButtonElement;
    expect(toggle.disabled).toBe(false);
  });

  it('resubmit is guarded by isProcessing: sendMessage NOT called, editor stays open, draft preserved', () => {
    const engine = makeMockEngine({ isProcessing: true });
    const sendMessage = engine.sendMessage as ReturnType<typeof vi.fn>;
    const message = makeMessage();

    // Enter edit mode while idle, then flip to processing (the user opened the
    // editor before the stream started).
    const { container, rerender } = render(
      <Harness engine={engine} isProcessing={false} message={message} />,
    );
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')!);

    // Edit textarea is now visible.
    const input = container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: 'revised text' } });

    // Flip to streaming.
    rerender(
      <Harness engine={engine} isProcessing={true} message={message} />,
    );

    // Click submit while processing → resubmit early-returns.
    const submit = container.querySelector('[data-slot="ai-bubble-edit-submit"]') as HTMLButtonElement;
    fireEvent.click(submit);

    expect(sendMessage).not.toHaveBeenCalled();
    // Editor + draft preserved (not cleared, not closed).
    expect(container.querySelector('[data-slot="ai-bubble-edit-input"]')).not.toBeNull();
    expect((container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement).value).toBe(
      'revised text',
    );
  });

  it('resubmit proceeds when idle (regression guard — guard does not over-block)', async () => {
    const engine = makeMockEngine({ isProcessing: false });
    const sendMessage = engine.sendMessage as ReturnType<typeof vi.fn>;
    // Make getMessages return a list containing the edited message so the
    // resubmit truncation finds it.
    const message = makeMessage();
    engine.getMessages = () => [message];

    const { container } = render(
      <Harness engine={engine} isProcessing={false} message={message} />,
    );
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')!);
    const input = container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'new text' } });
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-submit"]')!);

    // Drain the async resubmit.
    await Promise.resolve();
    await Promise.resolve();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('new text');
  });
});
