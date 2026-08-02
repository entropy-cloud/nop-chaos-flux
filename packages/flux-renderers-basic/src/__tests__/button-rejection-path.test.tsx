import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { ButtonRenderer } from '../button.js';
import type { ButtonSchema } from '../schemas.js';

/**
 * C1.3 button P2-2 regression: the onClick action promise must never become an
 * unhandled rejection. The action runtime rejects on error paths (button
 * design "action 成功分支后触发" semantics), so handleClick must catch the
 * rejection, swallow it, and NOT start the countdown on a failed action.
 */

function renderButtonWithOnClick(onClick: () => Promise<unknown>) {
  const props = {
    id: 'reject-btn',
    path: '/test',
    props: { label: 'Go', countDown: 5 },
    meta: {},
    events: { onClick },
    helpers: {} as unknown,
    regions: {},
    reactions: {},
  } as unknown as RendererComponentProps<ButtonSchema>;
  return render(<ButtonRenderer {...props} />);
}

describe('button onClick rejection path (P2-2)', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not start countdown and produces no unhandled rejection when onClick rejects', async () => {
    const rejecting = vi.fn().mockRejectedValue(new Error('action failed'));
    // A global handler lets the test fail loudly if the renderer drops the
    // rejection without catching it (vitest surfaces unhandled rejections).
    const unhandled = vi.fn();
    const handler = (event: PromiseRejectionEvent) => unhandled(event.reason);
    window.addEventListener('unhandledrejection', handler);

    try {
      renderButtonWithOnClick(rejecting);
      const button = screen.getByRole('button', { name: 'Go' }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.click(button);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(rejecting).toHaveBeenCalledTimes(1);
      // Failed action → countdown must NOT start (design: success branch only).
      expect(button.disabled).toBe(false);
      expect(button.hasAttribute('data-countdown')).toBe(false);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('unhandledrejection', handler);
    }
  });

  it('starts countdown when onClick resolves (success branch preserved)', async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    const resolving = vi.fn().mockResolvedValue({ ok: true });

    renderButtonWithOnClick(resolving);
    const button = screen.getByRole('button', { name: 'Go' }) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('data-countdown')).toBe('5');
  });
});
