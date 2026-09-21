import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, act, fireEvent } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiSenderView } from '../ai-sender.js';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
  mockStreamConnector,
} from '../../ai-test-support.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type { AiConnector, AiConnectorChunk, ChatMessage, MessageEngine } from '../../engine/types.js';
import type { AiChatSchema } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

// ============================================================================
// V12e batch3 族1 (plan 487) — disabled/readOnly gating channels must reach
// every interaction surface.
//
// G5-视角3-01: while a turn is streaming the sender textarea was disabled as a
// whole (half-gating). The fix inverts to text-gating: the textarea stays
// ENABLED (the author can compose the next message), the submit button stays
// disabled and the in-flight turn exposes the stop affordance.
//
// G5-R4-视角3-01: `ai-chat` meta.disabled only gated the embedded sender —
// the user-message edit affordance (UserMessageActions) stayed interactive:
// the pencil opened the editor and resubmit truncated + re-sent the
// conversation while the chat was disabled.
// ============================================================================

const replyChunks: AiConnectorChunk[] = [{ delta: { content: 'Reply' } }, { finishReason: 'stop' }];

function buildExternalEngine(initialMessages?: ChatMessage[]): MessageEngine {
  const connector: AiConnector = mockStreamConnector(replyChunks);
  return createMessageEngine({
    connector,
    initialMessages,
    adapter: createReactMessageAdapter(),
  });
}

describe('V12e 族1 — ai-sender streaming text-gating (G5-视角3-01)', () => {
  it('loading=true keeps the textarea ENABLED and disables the submit button', () => {
    const { container } = render(<AiSenderView loading={true} onSubmit={() => undefined} />);
    const textarea = container.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    // Inverted gating: the author can keep typing while the turn streams.
    expect(textarea.disabled).toBe(false);
    const submit = container.querySelector('[data-slot="ai-sender-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('loading=true does not clear the draft when Enter is pressed (submit is gated)', () => {
    const onSubmit = vi.fn(() => undefined);
    const { container } = render(<AiSenderView loading={true} onSubmit={onSubmit} />);
    const textarea = container.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(textarea, { target: { value: 'next message' } });
    });
    act(() => {
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea.value).toBe('next message');
  });

  it('meta.disabled=true still disables the textarea (full node gating unchanged)', () => {
    const { container } = render(<AiSenderView disabled={true} onSubmit={() => undefined} />);
    const textarea = container.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    const submit = container.querySelector('[data-slot="ai-sender-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});

describe('V12e 族1 — ai-chat disabled reaches user-edit (G5-R4-视角3-01)', () => {
  const userMessage: ChatMessage = { id: 'u1', role: 'user', content: 'hello' };
  const SchemaRenderer = createAiSchemaRenderer([]);

  function ChatHarness({ disabled }: { disabled: boolean }) {
    const engine = buildExternalEngine([userMessage]);
    const schema: AiChatSchema = {
      type: 'ai-chat',
      testid: 'chat-user-edit',
      disabled,
      engine: engine as never,
    };
    return (
      <SchemaRenderer
        schemaUrl="test://ai/v12e-user-edit"
        schema={{ type: 'page', body: [schema] } as never}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />
    );
  }

  it('meta.disabled=true disables the user-message edit toggle', () => {
    const { container } = render(<ChatHarness disabled={true} />);
    const toggle = container.querySelector('[data-slot="ai-bubble-edit-toggle"]') as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();
    expect(toggle!.disabled).toBe(true);
  });

  it('meta.disabled=false leaves the edit toggle interactive (sanity)', () => {
    const { container } = render(<ChatHarness disabled={false} />);
    const toggle = container.querySelector('[data-slot="ai-bubble-edit-toggle"]') as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();
    expect(toggle!.disabled).toBe(false);
  });
});
