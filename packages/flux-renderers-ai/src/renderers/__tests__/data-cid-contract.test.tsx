import { afterEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { createMockRendererProps } from '../../test-support.js';
import { AiWelcomeRenderer } from '../ai-welcome.js';
import { AiPromptsRenderer } from '../ai-prompts.js';
import { AiFeedbackRenderer } from '../ai-feedback.js';
import { AiConversationsRenderer } from '../ai-conversations.js';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import { AiVoiceInputRenderer } from '../ai-voice-input.js';
import { AiSuggestionsRenderer } from '../ai-suggestions.js';
import { AiTokenUsageRenderer } from '../ai-token-usage.js';
import { AiCitationsRenderer } from '../ai-citations.js';
import { AiToolCallRenderer } from '../ai-tool-call.js';
import { AiBubbleRenderer } from '../ai-bubble/index.js';
import { AiMessageListRenderer } from '../ai-message-list.js';
import { AiSenderRenderer } from '../ai-sender.js';

afterEach(() => {
  cleanup();
});

// Cast registered renderers (which return `RendererRenderOutput = unknown`)
// to a JSX-compatible component type for direct testing.
type AnyRenderer = ComponentType<Record<string, unknown>>;
const R = {
  welcome: AiWelcomeRenderer as unknown as AnyRenderer,
  prompts: AiPromptsRenderer as unknown as AnyRenderer,
  feedback: AiFeedbackRenderer as unknown as AnyRenderer,
  conversations: AiConversationsRenderer as unknown as AnyRenderer,
  attachments: AiAttachmentsRenderer as unknown as AnyRenderer,
  voiceInput: AiVoiceInputRenderer as unknown as AnyRenderer,
  suggestions: AiSuggestionsRenderer as unknown as AnyRenderer,
  tokenUsage: AiTokenUsageRenderer as unknown as AnyRenderer,
  citations: AiCitationsRenderer as unknown as AnyRenderer,
  toolCall: AiToolCallRenderer as unknown as AnyRenderer,
  bubble: AiBubbleRenderer as unknown as AnyRenderer,
  messageList: AiMessageListRenderer as unknown as AnyRenderer,
  sender: AiSenderRenderer as unknown as AnyRenderer,
};

const CID = 42;
const CID_STR = '42';

function mockProps(cid: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return createMockRendererProps({
    schema: { type: 'ai-test' } as never,
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      className: '',
      testid: undefined,
      cid,
    },
    ...overrides,
  }) as unknown as Record<string, unknown>;
}

/**
 * P1-4: the 14 AI renderer root source files each emit `data-cid` on their
 * root element. This is a static contract guard (the `rg -c data-cid ≥ 14`
 * baseline from the plan) — it catches a renderer root that drops the
 * debugger→schema bridge attribute even when its DOM path is hard to render
 * in isolation (e.g. ai-chat's three branch roots).
 */
describe('P1-4 static contract: every AI renderer root emits data-cid', () => {
  const ROOTS: string[] = [
    'ai-chat.tsx',
    'ai-message-list.tsx',
    'ai-bubble/index.tsx',
    'ai-sender.tsx',
    'ai-conversations.tsx',
    'ai-welcome.tsx',
    'ai-prompts.tsx',
    'ai-feedback.tsx',
    'ai-attachments.tsx',
    'ai-tool-call.tsx',
    'ai-citations.tsx',
    'ai-voice-input.tsx',
    'ai-token-usage.tsx',
    'ai-suggestions.tsx',
  ];

  it.each(ROOTS)('%s source contains a data-cid binding on its root', (file) => {
    const src = readFileSync(join(__dirname, '..', file), 'utf8');
    expect(src).toMatch(/data-cid=/);
  });

  it('at least 14 renderer root files carry data-cid (≥14 baseline)', () => {
    expect(ROOTS.length).toBeGreaterThanOrEqual(14);
    for (const file of ROOTS) {
      const src = readFileSync(join(__dirname, '..', file), 'utf8');
      expect(src).toMatch(/data-cid=/);
    }
  });
});

/**
 * P1-4 DOM propagation: `meta.cid` reaches the mounted root element. Covers
 * both the direct renderers and the View-delegated ones (where `cid` must
 * cross the Renderer→View prop boundary). Rendered with minimal props so the
 * contract is verified at the DOM level, not just in source.
 */
describe('P1-4 DOM propagation: meta.cid reaches the mounted root', () => {
  it('ai-welcome (direct) propagates cid to root', () => {
    const { container } = render(<R.welcome {...mockProps(CID, { props: { type: 'ai-welcome', title: 'Hi' } })} />);
    expect(container.querySelector('[data-slot="ai-welcome"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-prompts (direct) propagates cid to root', () => {
    const { container } = render(<R.prompts {...mockProps(CID, { props: { type: 'ai-prompts', items: [{ label: 'A' }] } })} />);
    expect(container.querySelector('[data-slot="ai-prompts"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-feedback (direct) propagates cid to root', () => {
    const { container } = render(<R.feedback {...mockProps(CID, { props: { type: 'ai-feedback', message: { id: 'm', role: 'assistant', content: 'x' } } })} />);
    expect(container.querySelector('[data-slot="ai-feedback"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-conversations (direct) propagates cid to root', () => {
    const { container } = render(<R.conversations {...mockProps(CID, { props: { type: 'ai-conversations', conversations: [], activeId: null } })} />);
    expect(container.querySelector('[data-slot="ai-conversations"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-attachments (direct) propagates cid to root', () => {
    const { container } = render(<R.attachments {...mockProps(CID, { props: { type: 'ai-attachments' } })} />);
    expect(container.querySelector('[data-slot="ai-attachments"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-voice-input (direct) propagates cid to root', () => {
    const { container } = render(<R.voiceInput {...mockProps(CID, { props: { type: 'ai-voice-input' } })} />);
    expect(container.querySelector('[data-slot="ai-voice-input"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-suggestions (View-delegated) propagates cid across the View boundary', () => {
    const { container } = render(<R.suggestions {...mockProps(CID, { props: { type: 'ai-suggestions', items: [{ text: 'hi' }] } })} />);
    expect(container.querySelector('[data-slot="ai-suggestions"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-token-usage (View-delegated, 3 roots) propagates cid', () => {
    const { container } = render(<R.tokenUsage {...mockProps(CID, { props: { type: 'ai-token-usage', usage: { total_tokens: 10 } } })} />);
    expect(container.querySelector('[data-slot="ai-token-usage"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-citations (View-delegated) propagates cid in list mode', () => {
    const { container } = render(<R.citations {...mockProps(CID, { props: { type: 'ai-citations', mode: 'list', sources: [{ index: 1, title: 'S' }] } })} />);
    expect(container.querySelector('[data-slot="ai-citations"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-tool-call (View-delegated) propagates cid when a toolCall is present', () => {
    const { container } = render(<R.toolCall {...mockProps(CID, { props: { type: 'ai-tool-call', toolCall: { id: 't1', type: 'function', function: { name: 'foo', arguments: '{}' } } } })} />);
    expect(container.querySelector('[data-slot="ai-tool-call"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-bubble (View-delegated) propagates cid to the article root', () => {
    const { container } = render(<R.bubble {...mockProps(CID, { props: { type: 'ai-bubble', message: { id: 'm', role: 'assistant', content: 'hi' } } })} />);
    expect(container.querySelector('[data-slot="ai-bubble"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-sender (View-delegated) propagates cid to the sender root', () => {
    const { container } = render(<R.sender {...mockProps(CID, { props: { type: 'ai-sender' } })} />);
    expect(container.querySelector('[data-slot="ai-sender"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  it('ai-message-list (View-delegated) propagates cid to the list root', () => {
    const { container } = render(<R.messageList {...mockProps(CID, { props: { type: 'ai-message-list' } })} />);
    expect(container.querySelector('[data-slot="ai-message-list"]')?.getAttribute('data-cid')).toBe(CID_STR);
  });

  // ai-chat's three branch roots (main / engine-null-switch / connector-missing)
  // require the full renderer runtime to mount, so their data-cid is verified
  // by the static source guard above (each branch carries `data-cid=` in
  // ai-chat.tsx) rather than a standalone DOM render.
});
