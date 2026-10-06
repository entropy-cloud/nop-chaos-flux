/**
 * plan 529 行为修正单元测试（红先绿后）：
 * 1. role:'tool' 尾随消息不渲染 AssistantActions（旧实现渲染 → 红）。
 * 2. 用户消息操作含 copy 钮（旧实现仅编辑铅笔 → 红）。
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider } from '../../../adapters/ai-chat-context.js';
import { AiBubbleView } from '../index.js';
import { UserMessageActions } from '../user-edit.js';
import type {
  ChatMessage,
  MessageEngine,
  MessageEngineState,
  MessageStateListener,
  MessageStateSubscribe,
} from '../../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

/** Minimal subscribable engine mock（照 user-edit.test 的形态裁剪）。 */
function makeMockEngine(message: ChatMessage): MessageEngine {
  const state: MessageEngineState = {
    messages: [{ ...message }],
    requestState: 'idle',
    isProcessing: false,
  } as unknown as MessageEngineState;
  const listeners = new Set<MessageStateListener>();
  const subscribe = ((listener: MessageStateListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }) as MessageStateSubscribe;
  return {
    getState: () => ({ ...state, messages: [...state.messages] }),
    subscribe,
    setMessageEditing: () => undefined,
    setMessages: () => undefined,
    sendMessage: vi.fn(async () => undefined),
    regenerate: vi.fn(async () => undefined),
  } as unknown as MessageEngine;
}

function renderWithEngine(ui: React.ReactElement, message: ChatMessage) {
  const engine = makeMockEngine(message);
  return render(
    <AiChatProvider value={{ engine } as never}>{ui}</AiChatProvider>,
  );
}

afterEach(() => {
  cleanup();
});

const toolMessage: ChatMessage = {
  id: 'm-tool',
  role: 'tool',
  content: '{"temp":21}',
};

describe('plan 529 — bubble action-bar corrections', () => {
  it('tool-role trailing message renders no assistant actions bar', () => {
    const { container } = render(<AiBubbleView message={toolMessage} />);
    expect(container.querySelector('[data-slot="ai-bubble"]')?.getAttribute('data-role')).toBe(
      'tool',
    );
    expect(container.querySelector('[data-slot="ai-assistant-actions"]')).toBeNull();
  });

  it('assistant message still renders the actions bar (guard against over-correction)', () => {
    const assistant: ChatMessage = { id: 'm-a', role: 'assistant', content: 'hello' };
    const { container } = render(<AiBubbleView message={assistant} />);
    expect(container.querySelector('[data-slot="ai-assistant-actions"]')).not.toBeNull();
  });

  it('user message actions include a copy button alongside the edit pencil', () => {
    const message: ChatMessage = { id: 'm-u', role: 'user', content: 'hi there' };
    const { container } = renderWithEngine(
      <UserMessageActions message={message} />,
      message,
    );
    expect(container.querySelector('[data-slot="ai-bubble-copy-user"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')).not.toBeNull();
  });
});
