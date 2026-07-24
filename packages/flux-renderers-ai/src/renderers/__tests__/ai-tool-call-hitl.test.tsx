import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiToolCallView } from '../ai-tool-call.js';
import type { ChatToolCall, ChatToolCallUIState } from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const toolCall: ChatToolCall = {
  index: 0,
  id: 'call_1',
  type: 'function',
  function: { name: 'get_weather', arguments: '{"city":"SF"}' },
};

function stateWith(overrides: Partial<ChatToolCallUIState> = {}): ChatToolCallUIState {
  return { status: 'running', ...overrides };
}

describe('ai-tool-call — HITL approval rendering (A-14)', () => {
  it('approval=pending renders approve/reject buttons + data-requires-approval', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} />,
    );
    const root = container.querySelector('[data-slot="ai-tool-call"]') as HTMLElement;
    expect(root.hasAttribute('data-requires-approval')).toBe(true);
    expect(root.getAttribute('data-approval')).toBe('pending');
    expect(container.querySelector('[data-slot="ai-tool-call-approve"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-tool-call-reject"]')).not.toBeNull();
  });

  it('clicking approve dispatches onApproval("approve")', () => {
    const onApproval = vi.fn();
    const { container } = render(
      <AiToolCallView
        toolCall={toolCall}
        state={stateWith({ approval: 'pending' })}
        onApproval={onApproval}
      />,
    );
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-tool-call-approve"]')!);
    });
    expect(onApproval).toHaveBeenCalledWith('approve');
  });

  it('clicking reject dispatches onApproval("reject")', () => {
    const onApproval = vi.fn();
    const { container } = render(
      <AiToolCallView
        toolCall={toolCall}
        state={stateWith({ approval: 'pending' })}
        onApproval={onApproval}
      />,
    );
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-tool-call-reject"]')!);
    });
    expect(onApproval).toHaveBeenCalledWith('reject');
  });

  it('hitl-no-handler: buttons are disabled and do not dispatch when onApproval is missing', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} />,
    );
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLButtonElement;
    const reject = container.querySelector('[data-slot="ai-tool-call-reject"]') as HTMLButtonElement;
    // P2 fix: dead-click removed — buttons are disabled when no handler is wired.
    expect(approve.disabled).toBe(true);
    expect(reject.disabled).toBe(true);
    // Approval state machine is unchanged (engine still only holds state) and
    // no event is dispatched (no-op without throwing).
    expect(() => {
      act(() => {
        fireEvent.click(approve);
      });
    }).not.toThrow();
  });

  it('approval=approved shows a decided badge and no action buttons', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'approved' })} />,
    );
    const root = container.querySelector('[data-slot="ai-tool-call"]') as HTMLElement;
    expect(root.hasAttribute('data-requires-approval')).toBe(false);
    expect(container.querySelector('[data-slot="ai-tool-call-approve"]')).toBeNull();
    expect(container.querySelector('[data-slot="ai-tool-call-reject"]')).toBeNull();
    const badge = container.querySelector('[data-approval-decision]');
    expect(badge?.getAttribute('data-approval-decision')).toBe('approved');
    expect(badge?.textContent).toContain('Approved');
  });

  it('approval=rejected shows a decided badge', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'rejected' })} />,
    );
    const badge = container.querySelector('[data-approval-decision]');
    expect(badge?.getAttribute('data-approval-decision')).toBe('rejected');
    expect(badge?.textContent).toContain('Rejected');
  });

  it('no approval field renders no approval UI (A3 baseline)', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith()} />,
    );
    expect(container.querySelector('[data-slot="ai-tool-call-approval"]')).toBeNull();
    expect(container.querySelector('[data-slot="ai-tool-call-approve"]')).toBeNull();
  });
});

describe('ai-tool-call — HITL focus trap (a11y §7 P3)', () => {
  // P2 no-handler guard: the focus-trap tests below pass a no-op `onApproval`
  // so the buttons are enabled and focusable. The trap is meaningful only
  // when there is an actionable handler; with no handler the buttons are
  // disabled (covered by the hitl-no-handler test above).
  const noopHandler = (): void => {};

  it('moves focus to the approve action when approval becomes pending', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} onApproval={noopHandler} />,
    );
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLElement;
    expect(approve).not.toBeNull();
    // In happy-dom document.activeElement should be the approve button.
    expect(document.activeElement).toBe(approve);
  });

  it('Tab cycles between approve and reject', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} onApproval={noopHandler} />,
    );
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLElement;
    const reject = container.querySelector('[data-slot="ai-tool-call-reject"]') as HTMLElement;

    // Focus starts on approve; Tab moves to reject.
    expect(document.activeElement).toBe(approve);
    act(() => {
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab' });
    });
    expect(document.activeElement).toBe(reject);
    // Tab again wraps back to approve.
    act(() => {
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab' });
    });
    expect(document.activeElement).toBe(approve);
  });

  it('Shift+Tab wraps backwards', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} onApproval={noopHandler} />,
    );
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLElement;
    const reject = container.querySelector('[data-slot="ai-tool-call-reject"]') as HTMLElement;
    // Focus on approve; Shift+Tab wraps to reject.
    expect(document.activeElement).toBe(approve);
    act(() => {
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', shiftKey: true });
    });
    expect(document.activeElement).toBe(reject);
    // Shift+Tab again wraps back to approve.
    act(() => {
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', shiftKey: true });
    });
    expect(document.activeElement).toBe(approve);
  });

  it('Escape restores focus to the previously focused element', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} onApproval={noopHandler} />,
    );
    // Pending moved focus to approve.
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLElement;
    expect(document.activeElement).toBe(approve);
    act(() => {
      fireEvent.keyDown(approve, { key: 'Escape' });
    });
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });
});

// ============================================================================
// AI-11 (resource lifecycle): focus captured by the approval trap must be
// restored when the approval resolves and when the component unmounts while
// still pending.
// ============================================================================

describe('ai-tool-call — AI-11 focus restore on resolve / unmount', () => {
  const noopHandler = (): void => {};

  it('restores focus to the prior element when approval resolves', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const { container, rerender } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} onApproval={noopHandler} />,
    );
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLElement;
    expect(document.activeElement).toBe(approve);

    // Resolve the approval → focus returns to `outside`.
    rerender(<AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'approved' })} onApproval={noopHandler} />);
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });

  it('restores focus when unmounted while still pending', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const { container, unmount } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith({ approval: 'pending' })} onApproval={noopHandler} />,
    );
    const approve = container.querySelector('[data-slot="ai-tool-call-approve"]') as HTMLElement;
    expect(document.activeElement).toBe(approve);

    unmount();
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });
});
