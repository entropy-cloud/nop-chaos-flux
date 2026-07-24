import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { createNormalizedActionEvent } from '@nop-chaos/flux-react';
import { createMockRendererProps } from '../../test-support.js';
import { AiConversationsRenderer } from '../ai-conversations.js';
import { AiWelcomeRenderer } from '../ai-welcome.js';
import { AiPromptsRenderer } from '../ai-prompts.js';
import { AiFeedbackRenderer } from '../ai-feedback.js';
import { AiBubbleView } from '../ai-bubble/index.js';
import type {
  AiConversationsSchema,
  AiWelcomeSchema,
  AiPromptsSchema,
  AiFeedbackSchema,
} from '../../schemas.js';
import type { AiConversationInfo, ChatMessage } from '../../engine/types.js';

// Cast registered renderers (which return `RendererRenderOutput = unknown`)
// to a JSX-compatible component type for direct testing.
const Conversations = AiConversationsRenderer as unknown as ComponentType<Record<string, unknown>>;
const Welcome = AiWelcomeRenderer as unknown as ComponentType<Record<string, unknown>>;
const Prompts = AiPromptsRenderer as unknown as ComponentType<Record<string, unknown>>;
const Feedback = AiFeedbackRenderer as unknown as ComponentType<Record<string, unknown>>;

afterEach(() => {
  cleanup();
});

describe('ai-conversations (Widget)', () => {
  function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiConversationsSchema>>>) {
    return createMockRendererProps<AiConversationsSchema>({
      schema: { type: 'ai-conversations' },
      ...overrides,
    });
  }

  it('renders the nop-ai-conversations marker with a list of conversations', () => {
    const conversations: AiConversationInfo[] = [
      { id: 'c1', title: 'First', createdAt: 1, updatedAt: 1 },
      { id: 'c2', title: 'Second', createdAt: 2, updatedAt: 2 },
    ];
    const props = makeProps({
      props: { type: 'ai-conversations', conversations: conversations as never, activeId: 'c1' },
    });
    const { container } = render(<Conversations {...props} />);
    expect(container.querySelector('.nop-ai-conversations')).not.toBeNull();
    const items = container.querySelectorAll('[data-slot="ai-conversations-item"]');
    expect(items.length).toBe(2);
    expect(items[0]?.getAttribute('data-active')).toBe(''); // presence-only
    expect(items[1]?.getAttribute('data-active')).toBe(null);
  });

  it('clicking an item fires onItemClick with id + conversation', () => {
    const onItemClick = vi.fn();
    const conversations: AiConversationInfo[] = [
      { id: 'c1', title: 'First', createdAt: 1, updatedAt: 1 },
    ];
    const props = makeProps({
      props: { type: 'ai-conversations', conversations: conversations as never, activeId: 'c1' },
      events: { onItemClick },
    });
    const { container } = render(<Conversations {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-conversations-item-button"]')!);
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('onItemClick payload carries through ctx.event end-to-end (type + id preserved by normalizer)', () => {
    const onItemClick = vi.fn();
    const conversations: AiConversationInfo[] = [
      { id: 'c1', title: 'First', createdAt: 1, updatedAt: 1 },
    ];
    const props = makeProps({
      props: { type: 'ai-conversations', conversations: conversations as never, activeId: 'c1' },
      events: { onItemClick },
    });
    const { container } = render(<Conversations {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-conversations-item-button"]')!);

    // Capture the exact payload the renderer hands to the runtime event handler
    // (the same value that flows into `createNormalizedActionEvent` inside
    // node-renderer-resolved.tsx), then run it through the real normalizer to
    // prove `${event.id}` / `${event.conversation}` resolve to real values.
    const emitted = onItemClick.mock.calls[0]?.[0];
    expect(emitted).toMatchObject({ type: 'ai:conversation-click', id: 'c1' });

    const ctxEvent = createNormalizedActionEvent(emitted);
    expect(ctxEvent).not.toBeUndefined();
    expect(ctxEvent?.type).toBe('ai:conversation-click');
    expect(ctxEvent?.id).toBe('c1');
    expect(ctxEvent?.conversation).toMatchObject({ id: 'c1', title: 'First' });
  });

  it('the New button fires onCreate', () => {
    const onCreate = vi.fn();
    const props = makeProps({
      props: { type: 'ai-conversations', conversations: [], activeId: null },
      events: { onCreate },
    });
    const { container } = render(<Conversations {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-conversations-create"]')!);
    expect(onCreate).toHaveBeenCalled();
  });

  it('delete button fires onItemDelete with id', () => {
    const onItemDelete = vi.fn();
    const conversations: AiConversationInfo[] = [
      { id: 'c1', title: 'First', createdAt: 1, updatedAt: 1 },
    ];
    const props = makeProps({
      props: { type: 'ai-conversations', conversations: conversations as never, activeId: 'c1' },
      events: { onItemDelete },
    });
    const { container } = render(<Conversations {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-conversations-delete"]')!);
    expect(onItemDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('rename commits the new title via onItemRename', () => {
    const onItemRename = vi.fn();
    const conversations: AiConversationInfo[] = [
      { id: 'c1', title: 'Old', createdAt: 1, updatedAt: 1 },
    ];
    const props = makeProps({
      props: { type: 'ai-conversations', conversations: conversations as never, activeId: 'c1' },
      events: { onItemRename },
    });
    const { container } = render(<Conversations {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-conversations-rename"]')!);
    const input = container.querySelector('[data-slot="ai-conversations-rename-input"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: 'New title' } });
    fireEvent.blur(input);
    expect(onItemRename).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', title: 'New title' }));
  });
});

describe('ai-welcome (Widget)', () => {
  function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiWelcomeSchema>>>) {
    return createMockRendererProps<AiWelcomeSchema>({
      schema: { type: 'ai-welcome' },
      ...overrides,
    });
  }

  it('renders title / description / icon with the nop-ai-welcome marker', () => {
    const props = makeProps({
      props: {
        type: 'ai-welcome',
        title: 'Welcome',
        description: 'Ask me anything.',
        icon: '✨',
      },
    });
    const { container } = render(<Welcome {...props} />);
    expect(container.querySelector('.nop-ai-welcome')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-welcome-title"]')?.textContent).toBe('Welcome');
    expect(container.querySelector('[data-slot="ai-welcome-description"]')?.textContent).toBe(
      'Ask me anything.',
    );
    expect(container.querySelector('[data-slot="ai-welcome-icon"]')?.textContent).toBe('✨');
  });

  it('align attribute defaults to center', () => {
    const props = makeProps({ props: { type: 'ai-welcome' } });
    const { container } = render(<Welcome {...props} />);
    expect(container.querySelector('.nop-ai-welcome')?.getAttribute('data-align')).toBe('center');
  });
});

describe('ai-prompts (Widget)', () => {
  function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiPromptsSchema>>>) {
    return createMockRendererProps<AiPromptsSchema>({
      schema: { type: 'ai-prompts' },
      ...overrides,
    });
  }

  it('renders prompt items vertically by default', () => {
    const props = makeProps({
      props: {
        type: 'ai-prompts',
        items: [
          { label: 'Summarize', description: 'Get a quick summary' },
          { label: 'Translate' },
        ],
      },
    });
    const { container } = render(<Prompts {...props} />);
    expect(container.querySelector('.nop-ai-prompts')?.getAttribute('data-layout')).toBe('vertical');
    const items = container.querySelectorAll('[data-slot="ai-prompts-item"]');
    expect(items.length).toBe(2);
    expect(items[0]?.querySelector('[data-slot="ai-prompts-item-label"]')?.textContent).toBe('Summarize');
  });

  it('supports horizontal and wrap layouts', () => {
    for (const layout of ['horizontal', 'wrap'] as const) {
      const props = makeProps({ props: { type: 'ai-prompts', items: [{ label: 'x' }], layout } });
      const { container } = render(<Prompts {...props} />);
      expect(container.querySelector('.nop-ai-prompts')?.getAttribute('data-layout')).toBe(layout);
      cleanup();
    }
  });

  it('clicking a prompt fires onSelect with item + index', () => {
    const onSelect = vi.fn();
    const props = makeProps({
      props: {
        type: 'ai-prompts',
        items: [{ label: 'A' }, { label: 'B' }],
      },
      events: { onSelect },
    });
    const { container } = render(<Prompts {...props} />);
    const items = container.querySelectorAll('[data-slot="ai-prompts-item"]');
    fireEvent.click(items[1]!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ index: 1 }));
  });
});

describe('ai-feedback (Widget)', () => {
  function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiFeedbackSchema>>>) {
    return createMockRendererProps<AiFeedbackSchema>({
      schema: { type: 'ai-feedback' },
      ...overrides,
    });
  }

  it('renders the default copy + refresh actions', () => {
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        message: { id: 'm1', role: 'assistant', content: 'hello' } as unknown as never,
      },
    });
    const { container } = render(<Feedback {...props} />);
    expect(container.querySelector('.nop-ai-feedback')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-feedback-copy"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-feedback-refresh"]')).not.toBeNull();
  });

  it('clicking copy fires onAction with action: copy', () => {
    const onAction = vi.fn();
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        message: { id: 'm1', role: 'assistant', content: 'copy me' } as unknown as never,
      },
      events: { onAction },
    });
    const { container } = render(<Feedback {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-feedback-copy"]')!);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'copy' }));
  });

  it('renders a custom action set', () => {
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        actions: ['like', 'dislike', 'sources'],
        message: { id: 'm1', role: 'assistant', content: 'x' } as unknown as never,
      },
    });
    const { container } = render(<Feedback {...props} />);
    expect(container.querySelector('[data-slot="ai-feedback-copy"]')).toBeNull();
    expect(container.querySelector('[data-slot="ai-feedback-like"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-feedback-dislike"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-feedback-sources"]')).not.toBeNull();
  });
});

describe('ai-bubble A-4 timestamp', () => {
  it('renders a <time> element when showTimestamp is true and createdAt exists', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'assistant',
      content: 'hi',
      metadata: { createdAt: new Date('2026-01-01T10:30Z').getTime() },
    };
    const { container } = render(<AiBubbleView message={message} showTimestamp />);
    const time = container.querySelector('[data-slot="ai-bubble-timestamp"]');
    expect(time).not.toBeNull();
    expect(time?.tagName).toBe('TIME');

    // 2151 P2 test hardening: assert the formatted label content, not just the
    // tag name. The renderer formats via `date.toLocaleTimeString(undefined,
    // {hour:'2-digit', minute:'2-digit'})` and writes the ISO timestamp to the
    // `dateTime` attribute. Both carry the date's hour/minute, independent of
    // the runner's local timezone — so assert against the same fixed Date.
    const expected = new Date('2026-01-01T10:30Z');
    const expectedLabel = expected.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(time?.textContent).toBe(expectedLabel);
    // `dateTime` attribute is the ISO string — verifies the value flowed
    // through (not a hardcoded placeholder) and is timezone-stable.
    expect(time?.getAttribute('datetime')).toBe(expected.toISOString());
    // Sanity: the label must look like a time (contain a digit pair), not be
    // empty or a raw millisecond number.
    expect(/\d/.test(time?.textContent ?? '')).toBe(true);
    expect(time?.textContent).not.toContain(String(message.metadata!.createdAt));
  });

  it('omits the timestamp when showTimestamp is false', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'assistant',
      content: 'hi',
      metadata: { createdAt: Date.now() },
    };
    const { container } = render(<AiBubbleView message={message} showTimestamp={false} />);
    expect(container.querySelector('[data-slot="ai-bubble-timestamp"]')).toBeNull();
  });
});
