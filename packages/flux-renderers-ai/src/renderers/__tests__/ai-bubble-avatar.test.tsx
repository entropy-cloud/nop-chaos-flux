import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { AiBubbleView, AiBubbleRenderer } from '../ai-bubble/index.js';
import { createMockRendererProps } from '../../test-support.js';
import type { AiBubbleSchema } from '../../schemas.js';
import type { ChatMessage } from '../../engine/types.js';

// Registered renderer returns `RendererRenderOutput = unknown`; cast to a
// JSX-compatible component type for direct testing (ai-welcome precedent).
const Bubble = AiBubbleRenderer as unknown as ComponentType<Record<string, unknown>>;

afterEach(() => {
  cleanup();
});

const assistantMessage: ChatMessage = { id: 'a1', role: 'assistant', content: 'Hello' };
const userMessage: ChatMessage = { id: 'u1', role: 'user', content: 'Hi there' };

describe('ai-bubble avatar — lucide dispatch by role (D3 / product-spec §3.1)', () => {
  it('showAvatar + assistant message renders an avatar node containing a lucide svg with data-role="assistant"', () => {
    const { container } = render(<AiBubbleView message={assistantMessage} showAvatar />);
    const avatar = container.querySelector('[data-slot="ai-bubble-avatar"]');
    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute('data-role')).toBe('assistant');
    expect(avatar?.getAttribute('aria-hidden')).toBe('true');
    expect(avatar?.querySelector('svg')).not.toBeNull();
  });

  it('user message dispatches the User lucide icon (svg + data-role="user")', () => {
    const { container } = render(<AiBubbleView message={userMessage} showAvatar />);
    const avatar = container.querySelector('[data-slot="ai-bubble-avatar"]');
    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute('data-role')).toBe('user');
    expect(avatar?.querySelector('svg')).not.toBeNull();
  });

  it('a custom avatar ReactNode overrides the lucide default', () => {
    const { container } = render(
      <AiBubbleView message={assistantMessage} showAvatar avatar={<img data-testid="custom-avatar" alt="" src="x.png" />} />,
    );
    const avatar = container.querySelector('[data-slot="ai-bubble-avatar"]');
    expect(avatar).not.toBeNull();
    expect(avatar?.querySelector('[data-testid="custom-avatar"]')).not.toBeNull();
    expect(avatar?.querySelector('svg')).toBeNull();
  });

  it('showAvatar omitted renders no avatar node (zero-regression default)', () => {
    const { container } = render(<AiBubbleView message={assistantMessage} />);
    expect(container.querySelector('[data-slot="ai-bubble-avatar"]')).toBeNull();
  });

  it('AiBubbleRenderer forwards resolved.avatar (schema-driven consumption path)', () => {
    const props = createMockRendererProps<AiBubbleSchema>({
      schema: { type: 'ai-bubble' },
      props: {
        type: 'ai-bubble',
        message: assistantMessage,
        showAvatar: true,
        avatar: <span data-testid="schema-avatar">A</span>,
      } as never,
    });
    const { container } = render(<Bubble {...props} />);
    const avatar = container.querySelector('[data-slot="ai-bubble-avatar"]');
    expect(avatar).not.toBeNull();
    expect(avatar?.querySelector('[data-testid="schema-avatar"]')).not.toBeNull();
  });
});
