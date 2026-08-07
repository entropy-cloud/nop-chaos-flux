import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
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

const MESSAGE = { id: 'm1', role: 'assistant', content: 'hello' };

function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiFeedbackSchema>>>) {
  return createMockRendererProps<AiFeedbackSchema>({
    schema: { type: 'ai-feedback' },
    ...overrides,
  });
}

describe('ai-feedback — local echo (value ownership, dim 3)', () => {
  it('like toggles data-active presence locally and clears on second click', () => {
    const onAction = vi.fn();
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        actions: ['like', 'dislike'],
        message: MESSAGE as never,
      },
      events: { onAction },
    });
    const { container } = render(<Feedback {...props} />);
    const like = container.querySelector('[data-slot="ai-feedback-like"]') as HTMLElement;

    // Not active initially (presence-only attribute, no ="false").
    expect(like.hasAttribute('data-active')).toBe(false);

    fireEvent.click(like);
    expect(like.getAttribute('data-active')).toBe(''); // presence-only
    expect(onAction).toHaveBeenCalledTimes(1);

    // Second click clears the echo (toggle off) and fires again.
    fireEvent.click(like);
    expect(like.hasAttribute('data-active')).toBe(false);
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('dislike and like are mutually exclusive echo states', () => {
    const props = makeProps({
      props: {
        type: 'ai-feedback',
        actions: ['like', 'dislike'],
        message: MESSAGE as never,
      },
      events: { onAction: vi.fn() },
    });
    const { container } = render(<Feedback {...props} />);
    const like = container.querySelector('[data-slot="ai-feedback-like"]') as HTMLElement;
    const dislike = container.querySelector('[data-slot="ai-feedback-dislike"]') as HTMLElement;

    fireEvent.click(like);
    expect(like.hasAttribute('data-active')).toBe(true);
    expect(dislike.hasAttribute('data-active')).toBe(false);

    fireEvent.click(dislike);
    expect(dislike.hasAttribute('data-active')).toBe(true);
    expect(like.hasAttribute('data-active')).toBe(false);
  });
});

describe('ai-feedback — event dispatch payload + ctx (dim 7)', () => {
  it('like fires onAction with the full payload and dispatch ctx (CX-10 family)', () => {
    const onAction = vi.fn();
    const props = makeProps({
      props: { type: 'ai-feedback', actions: ['like'], message: MESSAGE as never },
      events: { onAction },
    });
    const { container } = render(<Feedback {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-feedback-like"]')!);

    expect(onAction).toHaveBeenCalledTimes(1);
    const [payload, ctx] = onAction.mock.calls[0] as unknown[];
    // Full payload shape: type + action + message (message identity preserved).
    expect(payload).toEqual({ type: 'ai:feedback-action', action: 'like', message: MESSAGE });
    // Dispatch ctx: evaluationBindings expose the payload keys so action-args
    // templates can resolve `${action}` / `${message.id}`.
    expect(ctx).toMatchObject({
      event: payload,
      evaluationBindings: expect.objectContaining({ action: 'like', message: MESSAGE }),
    });
  });

  it('sources fires onAction with action: sources', () => {
    const onAction = vi.fn();
    const props = makeProps({
      props: { type: 'ai-feedback', actions: ['sources'], message: MESSAGE as never },
      events: { onAction },
    });
    const { container } = render(<Feedback {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-feedback-sources"]')!);
    const [payload] = onAction.mock.calls[0] as unknown[];
    expect(payload).toMatchObject({ type: 'ai:feedback-action', action: 'sources', message: MESSAGE });
  });

  it('copy fires onAction with action: copy and the message', () => {
    const onAction = vi.fn();
    const props = makeProps({
      props: { type: 'ai-feedback', actions: ['copy'], message: MESSAGE as never },
      events: { onAction },
    });
    const { container } = render(<Feedback {...props} />);
    fireEvent.click(container.querySelector('[data-slot="ai-feedback-copy"]')!);
    const [payload] = onAction.mock.calls[0] as unknown[];
    expect(payload).toMatchObject({ type: 'ai:feedback-action', action: 'copy', message: MESSAGE });
  });
});

describe('ai-feedback — copy reset timer cleanup (2-20)', () => {
  it('clears the copied-reset timer on unmount so no setState fires after unmount', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    try {
      const props = makeProps({
        props: { type: 'ai-feedback', actions: ['copy'], message: MESSAGE as never },
        events: { onAction: vi.fn() },
      });
      const { container, unmount } = render(<Feedback {...props} />);
      const copyBtn = container.querySelector('[data-slot="ai-feedback-copy"]') as HTMLElement;

      fireEvent.click(copyBtn);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(copyBtn.textContent).toBe('Copied');

      // Unmount must clear the pending 1500ms reset timer.
      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Advancing past the reset window after unmount must not throw.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
    } finally {
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
