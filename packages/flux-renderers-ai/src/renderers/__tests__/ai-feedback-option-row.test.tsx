import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createMockRendererProps } from '../../test-support.js';
import { AiFeedbackRenderer } from '../ai-feedback.js';
import type { AiFeedbackSchema } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const Feedback = AiFeedbackRenderer as unknown as ComponentType<Record<string, unknown>>;

function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiFeedbackSchema>>>) {
  return createMockRendererProps<AiFeedbackSchema>({
    schema: { type: 'ai-feedback' },
    ...overrides,
  });
}

describe('ai-feedback vote state through the option-row standard channel (D1 族2 消解)', () => {
  it('emits data-state="selected" on the voted button and clears on unvote', () => {
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        actions: ['like', 'dislike'],
        message: { id: 'm1', role: 'assistant', content: 'hello' } as never,
      },
      events: {},
    });
    const { container } = render(<Feedback {...props} />);
    const like = container.querySelector('[data-slot="ai-feedback-like"]') as HTMLElement;

    expect(like.getAttribute('data-state')).toBeNull();
    fireEvent.click(like);
    expect(like.getAttribute('data-state')).toBe('selected');
    // legacy data-active marker retained for back-compat.
    expect(like.getAttribute('data-active')).toBe('');
    fireEvent.click(like);
    expect(like.getAttribute('data-state')).toBeNull();
  });

  it('keeps vote states mutually exclusive on the standard channel', () => {
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        actions: ['like', 'dislike'],
        message: { id: 'm1', role: 'assistant', content: 'hello' } as never,
      },
      events: {},
    });
    const { container } = render(<Feedback {...props} />);
    const like = container.querySelector('[data-slot="ai-feedback-like"]') as HTMLElement;
    const dislike = container.querySelector('[data-slot="ai-feedback-dislike"]') as HTMLElement;

    fireEvent.click(like);
    expect(like.getAttribute('data-state')).toBe('selected');
    expect(dislike.getAttribute('data-state')).toBeNull();
    fireEvent.click(dislike);
    expect(like.getAttribute('data-state')).toBeNull();
    expect(dislike.getAttribute('data-state')).toBe('selected');
  });

  it('does not emit data-state on non-vote actions', () => {
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        actions: ['copy'],
        message: { id: 'm1', role: 'assistant', content: 'hello' } as never,
      },
      events: {},
    });
    const { container } = render(<Feedback {...props} />);
    const copy = container.querySelector('[data-slot="ai-feedback-copy"]') as HTMLElement;
    expect(copy.hasAttribute('data-state')).toBe(false);
  });
});
