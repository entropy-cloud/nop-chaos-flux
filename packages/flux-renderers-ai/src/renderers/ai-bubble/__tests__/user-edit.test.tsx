import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider } from '../../../adapters/ai-chat-context.js';
import { UserMessageActions } from '../user-edit.js';
import type {
  ChatMessage,
  MessageEngine,
  MessageEngineState,
  MessageStateListener,
  MessageStateSubscribe,
} from '../../../engine/types.js';

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

/**
 * Subscribable mock engine: holds mutable state and notifies listeners on
 * `setMessageEditing` / `setMessages` / explicit `setState`. This mirrors how
 * `ai-message-list` consumes the real engine — renderers read editing state
 * from the `message` prop, which the parent refreshes from engine snapshots.
 */
function makeMockEngine(opts: {
  isProcessing?: boolean;
  messages?: ChatMessage[];
} = {}): {
  engine: MessageEngine;
  sendMessage: ReturnType<typeof vi.fn>;
  setState: (patch: Partial<MessageEngineState>) => void;
} {
  const state: MessageEngineState = {
    messages: (opts.messages ?? [makeMessage()]).map((m) => ({ ...m })),
    requestState: opts.isProcessing ? 'processing' : 'idle',
    isProcessing: opts.isProcessing ?? false,
  } as MessageEngineState;

  const fullListeners = new Set<MessageStateListener>();
  const msgListeners = new Set<MessageStateListener>();
  const fire = (): void => {
    const snap: MessageEngineState = { ...state, messages: [...state.messages] };
    for (const l of fullListeners) l(snap);
    for (const l of msgListeners) l(snap);
  };
  const subscribe: MessageStateSubscribe = ((...args: unknown[]) => {
    if (args.length >= 2) {
      const listener = args[1] as MessageStateListener;
      msgListeners.add(listener);
      return () => {
        msgListeners.delete(listener);
      };
    }
    const listener = args[0] as MessageStateListener;
    fullListeners.add(listener);
    return () => {
      fullListeners.delete(listener);
    };
  }) as MessageStateSubscribe;

  const sendMessage = vi.fn(async () => undefined);
  const engine: MessageEngine = {
    getState: () => state,
    subscribe,
    sendMessage,
    send: vi.fn(async () => undefined),
    abort: vi.fn(async () => undefined),
    clear: vi.fn(),
    setConnector: vi.fn(),
    registerPlugin: () => () => {},
    getMessages: () => state.messages.map((m) => ({ ...m })),
    setMessages: vi.fn((next: ChatMessage[]) => {
      state.messages = next.map((m) => ({ ...m }));
      fire();
    }),
    regenerate: vi.fn(async () => undefined),
    setMessageEditing: vi.fn((messageId: string, editing) => {
      const idx = state.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const cur = state.messages[idx];
      state.messages[idx] = { ...cur, state: { ...cur.state, editing: editing ?? undefined } };
      fire();
    }),
  } as unknown as MessageEngine;

  return {
    engine,
    sendMessage,
    setState: (patch: Partial<MessageEngineState>) => {
      Object.assign(state, patch);
      fire();
    },
  };
}

function Harness({
  engine,
  message,
  children,
}: {
  engine: MessageEngine;
  message: ChatMessage;
  children?: ReactNode;
}) {
  const [msg, setMsg] = useState<ChatMessage>(
    () => engine.getState().messages.find((m) => m.id === message.id) ?? message,
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(engine.getState().isProcessing);

  useEffect(() => {
    const sync = (): void => {
      const found = engine.getState().messages.find((m) => m.id === message.id);
      if (found) setMsg(found);
      setIsProcessing(engine.getState().isProcessing);
    };
    sync();
    return engine.subscribe(sync);
  }, [engine, message.id]);

  return (
    <AiChatProvider
      value={{
        engine,
        messages: [msg],
        requestState: isProcessing ? 'processing' : 'idle',
        isProcessing,
        sendMessage: engine.sendMessage,
        abortRequest: engine.abort,
      }}
    >
      {children ?? <UserMessageActions message={msg} />}
    </AiChatProvider>
  );
}

describe('UserMessageActions — P1-1 streaming guard (FP-3)', () => {
  it('pencil toggle is disabled while the engine is processing', () => {
    const { engine } = makeMockEngine({ isProcessing: true });
    const message = makeMessage();
    const { container } = render(<Harness engine={engine} message={message} />);
    const toggle = container.querySelector('[data-slot="ai-bubble-edit-toggle"]') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.disabled).toBe(true);
  });

  it('pencil toggle is enabled when the engine is idle', () => {
    const { engine } = makeMockEngine({ isProcessing: false });
    const message = makeMessage();
    const { container } = render(<Harness engine={engine} message={message} />);
    const toggle = container.querySelector('[data-slot="ai-bubble-edit-toggle"]') as HTMLButtonElement;
    expect(toggle.disabled).toBe(false);
  });

  it('resubmit is guarded by isProcessing: sendMessage NOT called, editor stays open, draft preserved', () => {
    const { engine, setState } = makeMockEngine({ isProcessing: false });
    const sendMessage = engine.sendMessage as ReturnType<typeof vi.fn>;
    const message = makeMessage();

    const { container } = render(<Harness engine={engine} message={message} />);

    // Enter edit mode — engine writes editing state, harness re-renders.
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')!);
    const input = container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: 'revised text' } });

    // Stream starts → engine flips to processing.
    setState({ isProcessing: true });

    // Click submit while processing → resubmit early-returns.
    const submit = container.querySelector('[data-slot="ai-bubble-edit-submit"]') as HTMLButtonElement;
    fireEvent.click(submit);

    expect(sendMessage).not.toHaveBeenCalled();
    // Editor + draft preserved (engine editing state still active:true).
    expect(container.querySelector('[data-slot="ai-bubble-edit-input"]')).not.toBeNull();
    expect((container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement).value).toBe(
      'revised text',
    );
  });

  it('resubmit proceeds when idle (regression guard — guard does not over-block)', async () => {
    const { engine } = makeMockEngine({ isProcessing: false });
    const sendMessage = engine.sendMessage as ReturnType<typeof vi.fn>;
    const message = makeMessage();

    const { container } = render(<Harness engine={engine} message={message} />);
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
