import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createMockRendererProps } from '../../test-support.js';
import { aiFormulaCompiler, aiMockEnv, createAiSchemaRenderer, mockStreamConnector } from '../../ai-test-support.js';
import { AiSenderRenderer } from '../ai-sender.js';
import { AiVoiceInputRenderer } from '../ai-voice-input.js';
import { AiFeedbackRenderer } from '../ai-feedback.js';
import { AiToolCallRenderer } from '../ai-tool-call.js';
import { AiSuggestionsRenderer } from '../ai-suggestions.js';
import { AiPromptsRenderer } from '../ai-prompts.js';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import { AiConversationsRenderer } from '../ai-conversations.js';
import type { AiChatSchema } from '../../schemas.js';
import type { ChatToolCall, ChatToolCallUIState, AiConnector, AiConnectorChunk } from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Sender = AiSenderRenderer as unknown as ComponentType<Record<string, unknown>>;
const Voice = AiVoiceInputRenderer as unknown as ComponentType<Record<string, unknown>>;
const Feedback = AiFeedbackRenderer as unknown as ComponentType<Record<string, unknown>>;
const ToolCall = AiToolCallRenderer as unknown as ComponentType<Record<string, unknown>>;
const Suggestions = AiSuggestionsRenderer as unknown as ComponentType<Record<string, unknown>>;
const Prompts = AiPromptsRenderer as unknown as ComponentType<Record<string, unknown>>;
const Attachments = AiAttachmentsRenderer as unknown as ComponentType<Record<string, unknown>>;
const Conversations = AiConversationsRenderer as unknown as ComponentType<Record<string, unknown>>;

function metaDisabled(disabled: boolean) {
  return { disabled, visible: true, className: '', testid: undefined, cid: undefined } as never;
}

// ============================================================================
// multi-audit P2-5 (plan 2026-08-10-1606-3): AI renderers must consume the
// compiler-level `meta.disabled` node control (cross-package contract —
// layout/content/scheduling/industrial all read it). Interactive renderers
// disable their interaction surface; display renderers are adjudicated in the
// plan's decision table (not consumed).
// ============================================================================

describe('P2-5 — ai-sender consumes meta.disabled (input + submit)', () => {
  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-sender' } as never,
      props: { type: 'ai-sender' } as never,
      meta: metaDisabled(disabled),
    });
    return render(<Sender {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables the Textarea and the submit button', () => {
    const { container } = harness(true);
    const textarea = container.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.disabled).toBe(true);
    const submit = container.querySelector('[data-slot="ai-sender-submit"]') as HTMLButtonElement;
    // type a draft so the submit is not already disabled by the empty-draft rule
    act(() => {
      fireEvent.change(textarea, { target: { value: 'hello' } });
    });
    expect(submit.disabled).toBe(true);
  });

  it('meta.disabled=false leaves the Textarea and submit interactive (sanity)', () => {
    const { container } = harness(false);
    const textarea = container.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);
    const submit = container.querySelector('[data-slot="ai-sender-submit"]') as HTMLButtonElement;
    act(() => {
      fireEvent.change(textarea, { target: { value: 'hello' } });
    });
    expect(submit.disabled).toBe(false);
  });
});

describe('P2-5 — ai-voice-input consumes meta.disabled (mic button)', () => {
  interface MockRecognition {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
  }
  function installMockSpeechRecognition() {
    const instances: MockRecognition[] = [];
    function MockCtor(this: MockRecognition) {
      this.start = vi.fn();
      this.stop = vi.fn();
      this.abort = vi.fn();
      instances.push(this);
    }
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    w.SpeechRecognition = MockCtor;
    return instances;
  }

  beforeEach(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });

  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-voice-input' } as never,
      props: { type: 'ai-voice-input' } as never,
      meta: metaDisabled(disabled),
    });
    return render(<Voice {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables the mic button and blocks start', () => {
    const instances = installMockSpeechRecognition();
    const { container } = harness(true);
    const button = container.querySelector('[data-slot="ai-voice-input"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    act(() => {
      fireEvent.click(button);
    });
    expect(instances).toHaveLength(0);
  });

  it('meta.disabled=false leaves the mic button interactive (sanity)', () => {
    installMockSpeechRecognition();
    const { container } = harness(false);
    const button = container.querySelector('[data-slot="ai-voice-input"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});

describe('P2-5 — ai-feedback consumes meta.disabled (action buttons)', () => {
  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-feedback' } as never,
      props: { type: 'ai-feedback', actions: ['copy', 'refresh', 'like'] } as never,
      meta: metaDisabled(disabled),
    });
    return render(<Feedback {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables every action button', () => {
    const { container } = harness(true);
    for (const action of ['copy', 'refresh', 'like']) {
      const btn = container.querySelector(`[data-slot="ai-feedback-${action}"]`) as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.disabled).toBe(true);
    }
  });

  it('meta.disabled=false leaves action buttons interactive (sanity)', () => {
    const { container } = harness(false);
    const btn = container.querySelector('[data-slot="ai-feedback-copy"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

describe('P2-5 — ai-tool-call consumes meta.disabled (pending approval)', () => {
  const toolCall: ChatToolCall = {
    index: 0,
    id: 'call_1',
    type: 'function',
    function: { name: 'get_weather', arguments: '{}' },
  };
  const pendingState: ChatToolCallUIState = { status: 'running', approval: 'pending' };

  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-tool-call' } as never,
      props: { type: 'ai-tool-call', toolCall, state: pendingState } as never,
      meta: metaDisabled(disabled),
      events: {
        onApproval: vi.fn(),
      } as never,
    });
    return render(<ToolCall {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables approve/reject and the expand toggle', () => {
    const { container } = harness(true);
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLButtonElement;
    const reject = container.querySelector('[data-slot="ai-tool-call-reject"]') as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(reject.disabled).toBe(true);
    const toggle = container.querySelector('[data-slot="ai-tool-call-toggle"]') as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
  });

  it('meta.disabled=false keeps pending approval interactive when a handler is wired (sanity)', () => {
    const { container } = harness(false);
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLButtonElement;
    expect(approve.disabled).toBe(false);
  });
});

describe('P2-5 — ai-suggestions consumes meta.disabled (pills + overflow)', () => {
  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-suggestions' } as never,
      props: {
        type: 'ai-suggestions',
        items: [{ text: 'A' }, { text: 'B' }],
        overflowMode: 'expand',
      } as never,
      meta: metaDisabled(disabled),
    });
    return render(<Suggestions {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables every suggestion pill', () => {
    const { container } = harness(true);
    const pills = container.querySelectorAll('[data-slot="ai-suggestions-item"]');
    expect(pills.length).toBeGreaterThan(0);
    pills.forEach((pill) => {
      expect((pill as HTMLButtonElement).disabled).toBe(true);
    });
  });
});

describe('P2-5 — ai-prompts consumes meta.disabled (prompt cards)', () => {
  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-prompts' } as never,
      props: { type: 'ai-prompts', items: [{ label: 'Ask' }] } as never,
      meta: metaDisabled(disabled),
    });
    return render(<Prompts {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables the prompt cards', () => {
    const { container } = harness(true);
    const item = container.querySelector('[data-slot="ai-prompts-item"]') as HTMLButtonElement;
    expect(item.disabled).toBe(true);
  });
});

describe('P2-5 — ai-attachments consumes meta.disabled (pick/upload/remove + drop)', () => {
  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-attachments' } as never,
      props: {
        type: 'ai-attachments',
        value: [{ id: 'a1', url: 'blob:x', name: 'img.png', contentType: 'image/png' }] as never,
      } as never,
      meta: metaDisabled(disabled),
    });
    return render(<Attachments {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables the pick, upload and remove buttons', () => {
    const { container } = harness(true);
    const pick = container.querySelector('[data-slot="ai-attachments-pick"]') as HTMLButtonElement;
    expect(pick.disabled).toBe(true);
    const upload = container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;
    expect(upload.disabled).toBe(true);
    const remove = container.querySelector('[data-slot="ai-attachments-remove"]') as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
  });

  it('meta.disabled=false leaves the pick button interactive (sanity)', () => {
    const { container } = harness(false);
    const pick = container.querySelector('[data-slot="ai-attachments-pick"]') as HTMLButtonElement;
    expect(pick.disabled).toBe(false);
  });
});

describe('P2-5 — ai-conversations consumes meta.disabled (list controls)', () => {
  function harness(disabled: boolean) {
    const props = createMockRendererProps({
      schema: { type: 'ai-conversations' } as never,
      props: {
        type: 'ai-conversations',
        conversations: [{ id: 'c1', title: 'First' }],
        activeId: 'c1',
        showRenameControls: true,
      } as never,
      meta: metaDisabled(disabled),
    });
    return render(<Conversations {...(props as unknown as Record<string, unknown>)} />);
  }

  it('meta.disabled=true disables create/item/rename/delete controls', () => {
    const { container } = harness(true);
    const create = container.querySelector('[data-slot="ai-conversations-create"]') as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    const item = container.querySelector('[data-slot="ai-conversations-item-button"]') as HTMLButtonElement;
    expect(item.disabled).toBe(true);
    const rename = container.querySelector('[data-slot="ai-conversations-rename"]') as HTMLButtonElement;
    expect(rename.disabled).toBe(true);
    const del = container.querySelector('[data-slot="ai-conversations-delete"]') as HTMLButtonElement;
    expect(del.disabled).toBe(true);
  });
});

describe('P2-5 — ai-chat forwards meta.disabled to the embedded sender', () => {
  const replyChunks: AiConnectorChunk[] = [{ delta: { content: 'Reply' } }, { finishReason: 'stop' }];
  const SchemaRenderer = createAiSchemaRenderer([]);

  function ChatHarness({ disabled }: { disabled: boolean }): React.ReactElement {
    const connector: AiConnector = mockStreamConnector(replyChunks);
    const schema: AiChatSchema = {
      type: 'ai-chat',
      testid: 'chat-disabled',
      disabled,
      connector: connector as never,
    };
    return (
      <SchemaRenderer
        schemaUrl="test://ai/disabled"
        schema={{ type: 'page', body: [schema] } as never}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />
    );
  }

  it('meta.disabled=true disables the embedded sender textarea + submit', async () => {
    const { container } = render(<ChatHarness disabled={true} />);
    const textarea = container.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.disabled).toBe(true);
    const submit = container.querySelector('[data-slot="ai-sender-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('meta.disabled=false leaves the embedded sender interactive (sanity)', async () => {
    const { container } = render(<ChatHarness disabled={false} />);
    const textarea = container.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);
  });
});
