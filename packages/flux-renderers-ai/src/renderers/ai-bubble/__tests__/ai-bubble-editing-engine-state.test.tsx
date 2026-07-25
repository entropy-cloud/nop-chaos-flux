import { afterEach, describe, it, expect, vi } from 'vitest';
import { useState, useEffect } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider } from '../../../adapters/ai-chat-context.js';
import { AiBubbleView } from '../index.js';
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

function makeSubscribableEngine(opts: {
  isProcessing?: boolean;
  messages?: ChatMessage[];
} = {}): { engine: MessageEngine } {
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

  const engine: MessageEngine = {
    getState: () => state,
    subscribe,
    sendMessage: vi.fn(async () => undefined),
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

  return { engine };
}

function Harness({
  engine,
  message,
}: {
  engine: MessageEngine;
  message: ChatMessage;
}) {
  const [msg, setMsg] = useState<ChatMessage>(
    () => engine.getState().messages.find((m) => m.id === message.id) ?? message,
  );

  useEffect(() => {
    const sync = (): void => {
      const found = engine.getState().messages.find((m) => m.id === message.id);
      if (found) setMsg(found);
    };
    sync();
    return engine.subscribe('messages', sync);
  }, [engine, message.id]);

  return (
    <AiChatProvider
      value={{
        engine,
        messages: [msg],
        requestState: 'idle',
        isProcessing: false,
        sendMessage: engine.sendMessage,
        abortRequest: engine.abort,
      }}
    >
      <AiBubbleView message={msg} />
    </AiChatProvider>
  );
}

describe('ai-bubble editing state — engine-held (FP-D/E/F)', () => {
  it('FP-D: entering edit writes engine state.editing.active=true + draft', () => {
    const message = makeMessage({ id: 'u-1', content: 'hello world' });
    const { engine } = makeSubscribableEngine({ messages: [message] });
    const setMessageEditing = engine.setMessageEditing as ReturnType<typeof vi.fn>;

    const { container } = render(<Harness engine={engine} message={message} />);

    // Click the pencil → UserMessageActions.startEdit fires.
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')!);

    // The engine was asked to enter edit mode carrying the message text as draft.
    expect(setMessageEditing).toHaveBeenCalledWith('u-1', { active: true, draft: 'hello world' });
    // The harness re-rendered with the engine snapshot, so the editor is now
    // visible and the bubble carries data-editing.
    expect(engine.getState().messages[0].state?.editing).toEqual({ active: true, draft: 'hello world' });
    expect(container.querySelector('[data-slot="ai-bubble-edit-input"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-bubble"]')?.getAttribute('data-editing')).toBe('');
  });

  it('FP-D: typing updates the draft via engine.setMessageEditing (active stays true)', () => {
    const message = makeMessage({ id: 'u-1', content: 'orig' });
    const { engine } = makeSubscribableEngine({ messages: [message] });

    const { container } = render(<Harness engine={engine} message={message} />);

    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')!);
    const input = container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'typed draft' } });

    expect(engine.getState().messages[0].state?.editing).toEqual({ active: true, draft: 'typed draft' });
    expect(
      (container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement).value,
    ).toBe('typed draft');
  });

  it('FP-E: cancel edit clears active back to false', () => {
    const message = makeMessage({ id: 'u-1', content: 'orig' });
    const { engine } = makeSubscribableEngine({ messages: [message] });

    const { container } = render(<Harness engine={engine} message={message} />);

    // Enter edit mode.
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')!);
    expect(engine.getState().messages[0].state?.editing?.active).toBe(true);

    // Cancel → engine writes active:false.
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-cancel"]')!);

    expect(engine.getState().messages[0].state?.editing?.active).toBe(false);
    // Bubble no longer in editing mode (attribute absent → null); pencil toggle re-shown.
    expect(container.querySelector('[data-slot="ai-bubble"]')?.getAttribute('data-editing')).toBeNull();
    expect(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')).not.toBeNull();
  });

  it('FP-F: virtual recycle (unmount/remount) preserves editor + draft from engine snapshot', () => {
    // The message already carries engine-written editing state (as it would
    // after the parent re-fetches a fresh snapshot post-recycle).
    const message = makeMessage({
      id: 'u-1',
      content: 'orig',
      state: { editing: { active: true, draft: 'recycled draft' } },
    });
    const { engine } = makeSubscribableEngine({ messages: [message] });

    // First mount.
    const first = render(<Harness engine={engine} message={message} />);
    expect(first.container.querySelector('[data-slot="ai-bubble-edit-input"]')).not.toBeNull();
    expect(
      (first.container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement).value,
    ).toBe('recycled draft');
    expect(first.container.querySelector('[data-slot="ai-bubble"]')?.getAttribute('data-editing')).toBe('');

    // Simulate A-8 virtual recycling: the row unmounts (state was engine-held,
    // so nothing is lost).
    first.unmount();

    // Re-mount with the same engine snapshot — the editor + draft restore.
    const second = render(<Harness engine={engine} message={message} />);
    expect(second.container.querySelector('[data-slot="ai-bubble-edit-input"]')).not.toBeNull();
    expect(
      (second.container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement).value,
    ).toBe('recycled draft');
    expect(second.container.querySelector('[data-slot="ai-bubble"]')?.getAttribute('data-editing')).toBe('');
  });

  it('FP-F: non-editing user message renders content slices (no editor, data-editing absent)', () => {
    const message = makeMessage({ id: 'u-1', content: 'plain' });
    const { engine } = makeSubscribableEngine({ messages: [message] });

    const { container } = render(<Harness engine={engine} message={message} />);

    expect(container.querySelector('[data-slot="ai-bubble"]')?.getAttribute('data-editing')).toBeNull();
    // Pencil toggle is shown (not the editor).
    expect(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-bubble-edit-input"]')).toBeNull();
  });
});
