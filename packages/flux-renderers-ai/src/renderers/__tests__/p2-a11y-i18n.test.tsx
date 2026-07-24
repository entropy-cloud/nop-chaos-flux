import { afterEach, describe, it, expect } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, act } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { AiSenderView } from '../ai-sender.js';
import { AiConversationsRenderer } from '../ai-conversations.js';
import { AiToolCallView } from '../ai-tool-call.js';
import { AiFeedbackRenderer } from '../ai-feedback.js';
import { createMockRendererProps } from '../../test-support.js';
import type { AiConversationsSchema, AiFeedbackSchema } from '../../schemas.js';
import type { ChatToolCall, ChatToolCallUIState } from '../../engine/types.js';
import type { AiConversationInfo } from '../../engine/types.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const Conversations = AiConversationsRenderer as unknown as ComponentType<Record<string, unknown>>;
const Feedback = AiFeedbackRenderer as unknown as ComponentType<Record<string, unknown>>;

// ============================================================================
// P2 a11y / i18n收敛 (FP family from 2151 audit batch):
// - ai-sender Textarea 有非空 aria-label (WCAG 1.3.1 / 4.1.2; placeholder 非 accessible name)
// - ai-conversations rename Input 有非空 aria-label
// - ai-tool-call root aria-label 含 status (StatusIcon 均 aria-hidden)
// - ai-feedback like/dislike/sources 走 t() (非裸 emoji / 硬编码英文)
// ============================================================================

describe('P2 a11y — ai-sender Textarea accessible name', () => {
  it('Textarea exposes a non-empty aria-label (placeholder is not an accessible name)', () => {
    const { container } = render(<AiSenderView placeholder="Type a message" />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    const label = textarea.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });

  it('falls back to a translated messageInput label when no placeholder is provided', () => {
    const { container } = render(<AiSenderView />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const label = textarea.getAttribute('aria-label');
    expect(label).toBeTruthy();
    // The fallback resolves to the en-US translation of `flux.ai.messageInput`.
    expect(label).toBe('Message');
  });
});

describe('P2 a11y — ai-conversations rename Input accessible name', () => {
  function harness(conversations: AiConversationInfo[]) {
    const props = createMockRendererProps<AiConversationsSchema>({
      schema: { type: 'ai-conversations' },
      props: {
        type: 'ai-conversations',
        conversations: conversations as never,
        activeId: conversations[0]?.id,
        showRenameControls: true,
      } as never,
    });
    return render(<Conversations {...(props as unknown as Record<string, unknown>)} />);
  }

  it('rename Input has a non-empty aria-label matching the same key as the rename button', () => {
    const conv: AiConversationInfo = {
      id: 'c1',
      title: 'First',
      createdAt: 0,
      updatedAt: 0,
    };
    const { container } = harness([conv]);
    // Trigger rename mode for the active conversation (state update → wrap in act).
    const renameBtn = container.querySelector('[data-slot="ai-conversations-rename"]') as HTMLButtonElement;
    act(() => {
      renameBtn.click();
    });
    const input = container.querySelector('[data-slot="ai-conversations-rename-input"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const label = input.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
    // Matches the same i18n key the rename button uses.
    const buttonLabel = renameBtn.getAttribute('aria-label');
    expect(label).toBe(buttonLabel);
  });
});

describe('P2 a11y — ai-tool-call root aria-label includes status', () => {
  const toolCall: ChatToolCall = {
    index: 0,
    id: 'call_1',
    type: 'function',
    function: { name: 'get_weather', arguments: '{}' },
  };

  function stateWith(overrides: Partial<ChatToolCallUIState> = {}): ChatToolCallUIState {
    return { status: 'running', ...overrides };
  }

  it('aria-label contains both the tool name and a status word (SR reaches StatusIcon info)', () => {
    const cases: Array<{ status: ChatToolCallUIState['status']; expectText: string }> = [
      { status: 'running', expectText: 'Running' },
      { status: 'success', expectText: 'Succeeded' },
      { status: 'failed', expectText: 'Failed' },
      { status: 'cancelled', expectText: 'Cancelled' },
    ];
    for (const { status, expectText } of cases) {
      const { container } = render(<AiToolCallView toolCall={toolCall} state={stateWith({ status })} />);
      const root = container.querySelector('[data-slot="ai-tool-call"]') as HTMLElement;
      const label = root.getAttribute('aria-label') ?? '';
      expect(label).toContain('get_weather');
      expect(label).toContain(expectText);
    }
  });
});

describe('P2 i18n — ai-feedback like/dislike/sources use translations', () => {
  function harness(actions: unknown) {
    const props = createMockRendererProps<AiFeedbackSchema>({
      schema: { type: 'ai-feedback' },
      props: { type: 'ai-feedback', actions: actions as never } as never,
    });
    return render(<Feedback {...(props as unknown as Record<string, unknown>)} />);
  }

  it('like button aria-label is a translated word, not a raw emoji', () => {
    const { container } = harness(['like']);
    const btn = container.querySelector('[data-slot="ai-feedback-like"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    const label = btn.getAttribute('aria-label');
    expect(label).toBe('Like');
    // Visible label also walks through t() (not the raw 👍 emoji).
    expect(btn.textContent).toBe('Like');
  });

  it('dislike button aria-label is a translated word, not a raw emoji', () => {
    const { container } = harness(['dislike']);
    const btn = container.querySelector('[data-slot="ai-feedback-dislike"]') as HTMLButtonElement;
    const label = btn.getAttribute('aria-label');
    expect(label).toBe('Dislike');
    expect(btn.textContent).toBe('Dislike');
  });

  it('sources button label uses t() instead of the hardcoded "Sources" string', () => {
    const { container } = harness(['sources']);
    const btn = container.querySelector('[data-slot="ai-feedback-sources"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    // Both aria-label and visible text come from the same t('flux.ai.sources') call.
    expect(btn.getAttribute('aria-label')).toBe('Sources');
    expect(btn.textContent).toBe('Sources');
  });
});
